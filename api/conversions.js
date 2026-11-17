// Meta Conversions API (CAPI) relay.
//
// The browser Pixel in index.html fires client-side events; ad blockers, iOS
// tracking prevention, and Safari's cookie caps drop a meaningful share of
// them. This endpoint re-sends the same events server-to-server, so Meta sees
// a conversion even when the Pixel call never leaves the browser.
//
// Deduplication: the client sends the *same* `eventId` to both fbq (as
// `eventID`) and this endpoint (as `event_id`). Meta collapses the pair into
// one conversion — never disable one side to "avoid doubles", the pairing is
// what makes the coverage better rather than inflated.
//
// Env (Vercel project settings, and .env locally):
//   META_CAPI_ACCESS_TOKEN  — required. System-user token with ads_management
//                             on the pixel's business (Events Manager →
//                             Settings → Conversions API → Generate token).
//   META_PIXEL_ID           — optional, defaults to the site's pixel.
//   META_TEST_EVENT_CODE    — optional. Set while validating in Events
//                             Manager → Test Events; remove for production.
//
// Runs on Vercel as api/conversions.js and, in `npm run dev`, through the
// hoa-dev-api middleware in vite.config.js — same module either way.
import { createHash } from "node:crypto";

const GRAPH_VERSION = "v21.0";
const DEFAULT_PIXEL_ID = "1248181134033054";

/* Events we accept. Anything else is rejected rather than forwarded, so a
   stray/spoofed call can't pollute the ad account with junk event names. */
const ALLOWED_EVENTS = new Set([
  "Lead",
  "CompleteRegistration",
  "Contact",
  "SubmitApplication",
  "Schedule",
  "ViewContent",
  "PageView",
]);

/* Meta wants PII normalized (trimmed, lowercased, punctuation-free where
   applicable) *before* hashing — otherwise "  Ada@Example.COM " and
   "ada@example.com" hash differently and the match is lost. */
const sha256 = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const hashPlain = (value) => {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return null;
  return sha256(v);
};

const hashEmail = (value) => {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v || !v.includes("@")) return null;
  return sha256(v);
};

/* Phones hash as digits only, country code included, no "+" or separators. */
const hashPhone = (value) => {
  const digits = String(value ?? "").replace(/\D+/g, "");
  if (digits.length < 7) return null;
  return sha256(digits);
};

/* Already-hashed values (64-char hex) pass through untouched, so a caller can
   hash in the browser if it ever prefers not to send raw PII over the wire. */
const isHashed = (value) => /^[a-f0-9]{64}$/i.test(String(value ?? ""));

const hashWith = (fn, value) => {
  if (!value) return null;
  return isHashed(value) ? String(value).toLowerCase() : fn(value);
};

/* Meta's user_data keys are arrays of hashes — one entry per known value. */
const buildUserData = (input = {}, req) => {
  const out = {};
  const put = (key, hashed) => {
    if (hashed) out[key] = [hashed];
  };

  put("em", hashWith(hashEmail, input.email));
  put("ph", hashWith(hashPhone, input.phone));
  put("fn", hashWith(hashPlain, input.firstName));
  put("ln", hashWith(hashPlain, input.lastName));
  put("ct", hashWith(hashPlain, input.city));
  put("st", hashWith(hashPlain, input.state));
  put("country", hashWith(hashPlain, input.country));
  put("zp", hashWith(hashPlain, input.zip));

  // Not hashed — Meta matches these as-is.
  if (input.fbp) out.fbp = String(input.fbp);
  if (input.fbc) out.fbc = String(input.fbc);
  if (input.externalId) {
    out.external_id = [hashWith(hashPlain, input.externalId)].filter(Boolean);
    if (out.external_id.length === 0) delete out.external_id;
  }

  const ip = clientIp(req);
  if (ip) out.client_ip_address = ip;
  const ua = input.userAgent || req.headers["user-agent"];
  if (ua) out.client_user_agent = String(ua);

  return out;
};

/* Vercel puts the real client IP in x-forwarded-for (comma-separated, client
   first). Meta rejects the whole event on a malformed address, so anything
   that doesn't look like an IP is dropped instead of forwarded. */
const clientIp = (req) => {
  const raw =
    req.headers["x-real-ip"] ||
    String(req.headers["x-forwarded-for"] || "").split(",")[0];
  const ip = String(raw || "").trim();
  if (!ip) return null;
  const isV4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);
  const isV6 = ip.includes(":");
  return isV4 || isV6 ? ip : null;
};

const readJsonBody = async (req) => {
  // Vercel parses JSON bodies for us; the Vite dev middleware does not.
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
};

const send = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    send(res, 405, { error: "Method not allowed" });
    return;
  }

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID;

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    send(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const eventName = String(body.eventName || "Lead");
  if (!ALLOWED_EVENTS.has(eventName)) {
    send(res, 400, { error: `Unsupported eventName: ${eventName}` });
    return;
  }

  if (!accessToken) {
    /* A missing token is a deployment gap, not a visitor problem — the lead is
       already saved by the time we get here, so we log loudly and return 200
       to keep the client's fire-and-forget call quiet. */
    console.error("[conversions] META_CAPI_ACCESS_TOKEN is not set");
    send(res, 200, { ok: false, skipped: "missing-access-token" });
    return;
  }

  const event = {
    event_name: eventName,
    // Seconds, not ms. Meta accepts events up to 7 days old.
    event_time: Math.floor(Date.now() / 1000),
    event_id: body.eventId ? String(body.eventId) : undefined,
    event_source_url: body.eventSourceUrl
      ? String(body.eventSourceUrl)
      : undefined,
    action_source: "website",
    user_data: buildUserData(body.userData, req),
    custom_data:
      body.customData && typeof body.customData === "object"
        ? body.customData
        : undefined,
  };

  const payload = { data: [event] };
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(
    accessToken,
  )}`;

  try {
    const fbRes = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await fbRes.json().catch(() => ({}));
    if (!fbRes.ok) {
      console.error("[conversions] Meta rejected event", fbRes.status, result);
      send(res, 502, { ok: false, status: fbRes.status, error: result });
      return;
    }
    send(res, 200, {
      ok: true,
      eventName,
      eventId: event.event_id || null,
      eventsReceived: result.events_received ?? null,
      fbTraceId: result.fbtrace_id ?? null,
    });
  } catch (err) {
    console.error("[conversions] request failed", err);
    send(res, 502, { ok: false, error: err?.message || "Request failed" });
  }
}
