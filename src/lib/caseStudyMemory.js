/**
 * Remembers which case study category (hoa / founders) the user last opened,
 * so navigating back to /case-studies restores the correct reel instead of
 * always defaulting to "hoa".
 *
 * Stored in localStorage so it survives full reloads, not just SPA back
 * navigation. Read is defensive — SSR / storage-disabled browsers get null.
 */

const KEY = "hoa:last-case-study";

export function rememberCaseStudyVisit({ slug, category }) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const cat = category === "founders" ? "founders" : "hoa";
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ slug: slug || "", category: cat, at: Date.now() }),
    );
  } catch {
    // storage full / disabled — silently ignore
  }
}

/**
 * Persist only the reel category (hoa / founders) without disturbing the
 * previously-remembered slug. Used when the user toggles the reel category
 * on /case-studies without drilling into an individual study.
 */
export function rememberCaseStudyCategory(category) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const cat = category === "founders" ? "founders" : "hoa";
  const prev = readLastCaseStudyVisit();
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        slug: prev?.slug || "",
        category: cat,
        at: Date.now(),
      }),
    );
  } catch {
    // storage full / disabled — silently ignore
  }
}

export function readLastCaseStudyVisit() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const category = parsed.category === "founders" ? "founders" : "hoa";
    return {
      slug: typeof parsed.slug === "string" ? parsed.slug : "",
      category,
      at: typeof parsed.at === "number" ? parsed.at : 0,
    };
  } catch {
    return null;
  }
}
