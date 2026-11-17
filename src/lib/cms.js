// Strapi REST helpers. Keep tiny and dependency-free — only what the case-study
// pages need: a base-URL resolver, a media-URL resolver, and a populate string
// that fetches every relation/component the case-study schema declares.

const RAW_BASE = (import.meta.env.VITE_STRAPI_URL || "http://localhost:1337").replace(/\/+$/, "");

export const STRAPI_URL = RAW_BASE;

// Strapi returns either an absolute URL (cloud / S3) or a relative `/uploads/…`
// path (local). Normalize both into something <img> can render.
export const mediaUrl = (media) => {
  if (!media) return null;
  // Strapi v5 keeps media flat — `media.url`, no `.attributes`.
  const url = media.url || media?.attributes?.url || null;
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${STRAPI_URL}${url}`;
};

// Components (and components inside components) need explicit population in v5.
// Listing this once here keeps the two pages in sync.
export const CASE_STUDY_POPULATE = [
  "populate[posterImage]=true",
  "populate[coverImage]=true",
  "populate[videoPosterImage]=true",
  "populate[sidebarTags]=true",
  "populate[metrics]=true",
  "populate[approach]=true",
  "populate[outcome]=true",
  "populate[pullQuote]=true",
  "populate[creditsList]=true",
  // Galleries hold media — populate the component AND its nested images.
  "populate[midGallery][populate]=*",
  "populate[bottomGallery][populate]=*",
].join("&");

export async function fetchCaseStudies({ category } = {}) {
  const params = new URLSearchParams();
  // Only need fields used by the listing — avoid pulling rich text.
  ["id", "title", "slug", "client", "shortLabel", "year", "role", "category", "displayOrder"].forEach(
    (f, i) => params.append(`fields[${i}]`, f),
  );
  params.append("populate[posterImage]", "true");
  params.append("sort[0]", "displayOrder:asc");
  params.append("sort[1]", "createdAt:asc");
  params.append("pagination[pageSize]", "100");
  if (category) params.append("filters[category][$eq]", category);

  const res = await fetch(`${STRAPI_URL}/api/case-studies?${params.toString()}`);
  if (!res.ok) throw new Error(`Strapi ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchCaseStudyBySlug(slug) {
  const params = `filters[slug][$eq]=${encodeURIComponent(slug)}&${CASE_STUDY_POPULATE}`;
  const res = await fetch(`${STRAPI_URL}/api/case-studies?${params}`);
  if (!res.ok) throw new Error(`Strapi ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.data && json.data[0]) || null;
}
