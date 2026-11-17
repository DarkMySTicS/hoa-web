# Meta Conversions API — setup

The lead form now reports each submission to Meta **twice**: once from the
browser Pixel and once server-to-server through the Conversions API (CAPI).
Both calls carry the same `event_id`, so Meta merges them into a single
conversion. This is the intended setup — it recovers the conversions that ad
blockers, iOS tracking prevention, and Safari's cookie limits would otherwise
drop, without double-counting.

## Moving parts

| File | Role |
| --- | --- |
| `index.html` | Loads the Pixel (`1248181134033054`) and fires `PageView`. |
| `src/lib/conversions.js` | `trackConversion()` — fires the Pixel event and POSTs the same event to our endpoint with a shared id. |
| `api/conversions.js` | Serverless relay. Hashes PII, forwards to the Graph API. |
| `src/components/ContactForm.jsx` | Calls `trackConversion({ eventName: "Lead" })` after the lead is written to Firestore. |
| `vite.config.js` | Serves `api/*` locally so `npm run dev` behaves like Vercel. |

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (and in a
local `.env` for development):

| Variable | Required | Notes |
| --- | --- | --- |
| `META_CAPI_ACCESS_TOKEN` | yes | Events Manager → your pixel → Settings → Conversions API → **Generate access token**. Treat it like a password; it is never exposed to the browser. |
| `META_PIXEL_ID` | no | Defaults to `1248181134033054`. Set it if the pixel ever changes. |
| `META_TEST_EVENT_CODE` | no | Set **only** while validating (see below), then delete it. Events sent with a test code do not count as real conversions. |

Without `META_CAPI_ACCESS_TOKEN` the endpoint logs an error and returns
`{ ok: false, skipped: "missing-access-token" }`. The lead is still saved and
the browser Pixel still fires — only the server-side copy is skipped.

## Verifying it works

1. In Events Manager, open **Test Events** and copy the test code.
2. Set `META_TEST_EVENT_CODE` to that value and redeploy (or restart `npm run dev`).
3. Submit the form at `/apply`.
4. Test Events should show one `Lead` with **Browser** and **Server** both
   listed, and a "Deduplicated" note — not two separate events.
5. Remove `META_TEST_EVENT_CODE` and redeploy.

Event Match Quality lives on the same screen. We send hashed email, phone,
first/last name, country, and the lead id as `external_id`, plus `fbp`/`fbc`
and the visitor's IP and user agent — that's most of what Meta scores on.

## Privacy

Raw email/phone/name never reach Meta. `api/conversions.js` normalizes each
value (trim, lowercase, digits-only for phones) and SHA-256 hashes it before
the request goes out, which is what Meta's matching expects. Values that
arrive already hashed are passed through untouched.

## Adding another event

```js
import { trackConversion } from "../lib/conversions";

trackConversion({
  eventName: "Schedule",           // must be in ALLOWED_EVENTS in api/conversions.js
  user: { email, phone, name },
  customData: { content_name: "call-booking" },
});
```

The endpoint rejects event names outside that allowlist, so a stray or spoofed
call can't push junk events into the ad account.
