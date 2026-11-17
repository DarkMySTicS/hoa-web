/* Ad-click params (utm_*, Meta's campaign/adset/ad/creative) only live on the
   landing URL's query string. The lead form now lives on its own route
   (/apply), so a visitor who lands on "/" from an ad and then navigates to
   "/apply" would otherwise lose that query string before the lead is ever
   written. We snapshot it into sessionStorage on load so it survives the
   route change and still ends up on the lead record for CRM attribution. */

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "campaign",
  "adset",
  "ad",
  "creative",
];

const STORAGE_KEY = "hoa_utm_params";

export const captureUtmParams = () => {
  if (typeof window === "undefined") return;
  try {
    const p = new URLSearchParams(window.location.search);
    const found = {};
    UTM_KEYS.forEach((k) => {
      const v = p.get(k);
      if (v) found[k] = v;
    });
    if (Object.keys(found).length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    }
  } catch {
    /* sessionStorage unavailable */
  }
};

export const readStoredUtmParams = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
