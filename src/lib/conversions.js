/* Client half of the Meta Conversions API setup (server half: api/conversions.js).
 *
 * Every conversion is fired twice on purpose:
 *   1. through the browser Pixel — fast, carries the full browser context
 *   2. through our own endpoint  — survives ad blockers and ITP
 * Both carry the same `eventId`, which is how Meta collapses the pair into a
 * single conversion instead of counting it twice. Dropping either side loses
 * signal; dropping the shared id is what would double-count.
 */

/* Meta's own first-party cookies. `_fbp` is set by the Pixel; `_fbc` only
   exists after a click-through with an fbclid, and Safari can drop it — so we
   rebuild it from the URL when it's missing (Meta's documented format:
   fb.1.<timestamp-ms>.<fbclid>). */
const readCookie = (name) => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
};

const readFbc = () => {
  const cookie = readCookie("_fbc");
  if (cookie) return cookie;
  if (typeof window === "undefined") return null;
  try {
    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (!fbclid) return null;
    return `fb.1.${Date.now()}.${fbclid}`;
  } catch {
    return null;
  }
};

export const newEventId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

/* Split a single "name" field into the first/last pair Meta matches on. */
const splitName = (fullName) => {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

/**
 * Fire one conversion on both channels.
 *
 * @param {object}  opts
 * @param {string}  opts.eventName   Meta standard event, e.g. "Lead".
 * @param {string} [opts.eventId]    Shared dedup id; generated when omitted.
 * @param {object} [opts.user]       { name|firstName/lastName, email, phone, ... }.
 *                                   Raw PII stays in this browser and in our
 *                                   own function — it is SHA-256 hashed
 *                                   server-side before it reaches Meta.
 * @param {object} [opts.customData] Meta custom_data (content_name, value, …).
 * @returns {Promise<{ok: boolean}>} Resolves even on failure — tracking must
 *                                   never break the submission flow.
 */
export async function trackConversion({
  eventName = "Lead",
  eventId,
  user = {},
  customData = {},
} = {}) {
  if (typeof window === "undefined") return { ok: false };
  const id = eventId || newEventId();

  // 1 — browser Pixel. `eventID` (capital ID) is the dedup key fbq expects.
  try {
    if (typeof window.fbq === "function") {
      window.fbq("track", eventName, customData, { eventID: id });
    }
  } catch {
    /* Pixel blocked — the server call below is exactly why we have it. */
  }

  // 2 — server relay.
  const { firstName, lastName } = user.firstName
    ? { firstName: user.firstName, lastName: user.lastName || "" }
    : splitName(user.name);

  const body = {
    eventName,
    eventId: id,
    eventSourceUrl: window.location.href,
    userData: {
      email: user.email || "",
      phone: user.phone || "",
      firstName,
      lastName,
      city: user.city || "",
      state: user.state || "",
      country: user.country || "",
      zip: user.zip || "",
      externalId: user.externalId || "",
      fbp: readCookie("_fbp") || "",
      fbc: readFbc() || "",
      userAgent: navigator.userAgent,
    },
    customData,
  };

  try {
    const res = await fetch("/api/conversions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // keepalive lets the request finish if the visitor navigates away
      // immediately after submitting.
      keepalive: true,
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      console.warn("[conversions] server event not accepted", json);
      return { ok: false, eventId: id };
    }
    return { ok: true, eventId: id };
  } catch (err) {
    console.warn("[conversions] server event failed", err);
    return { ok: false, eventId: id };
  }
}
