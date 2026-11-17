import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Public-side reader for the CRM-managed `caseStudies` Firestore collection.
 * Mirrors the legacy Strapi cms.js shape so swapping the import in
 * Pages/CaseStudies.jsx and Pages/CaseStudy.jsx is the only change required
 * on the page components themselves.
 */

const COL = "caseStudies";

export { CASE_STUDY_CATEGORIES } from "./caseStudyCategories";

/* Build the URL the page renders for a given media field. The CRM stores
   Cloudinary uploads as { url, secureUrl, publicId, w, h, kind }. We also
   accept a plain string for forward-compatibility. */
export function mediaUrl(media, opts = {}) {
  if (!media) return null;
  if (typeof media === "string") return media;
  const base = media.secureUrl || media.url || "";
  if (!base) return null;
  const { w } = opts;
  if (!w || !/\/upload\//.test(base)) return base;
  return base.replace(
    "/upload/",
    `/upload/c_limit,w_${Math.round(w)},q_auto,f_auto/`,
  );
}

/* For places that need a still frame even when the asset is a video (grid
   thumbnails, color sampling, etc). Falls back to mediaUrl for images. */
export function posterImageUrl(media, opts = {}) {
  if (!media) return null;
  if (typeof media === "string") return media;
  const url = mediaUrl(media, opts);
  if (!url) return null;
  if (media.kind !== "video") return url;
  /* Cloudinary: replace the upload segment so the video is rendered as a JPG
     still (first frame). Falls through unchanged for non-Cloudinary URLs. */
  if (!/\/upload\//.test(url)) return url;
  return url
    .replace("/video/upload/", "/video/upload/so_0/")
    .replace("/upload/", "/upload/so_0/")
    .replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, ".jpg$2");
}

/* List — published only. Sorted by displayOrder ascending. */
export async function fetchCaseStudies({ category } = {}) {
  const constraints = [where("status", "==", "published")];
  if (category) constraints.push(where("category", "==", category));
  const q = query(collection(db, COL), ...constraints);
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Sort client-side so we can keep the where() without compound indexes.
  rows.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  return rows;
}

/* Single, by slug. */
export async function fetchCaseStudyBySlug(slug) {
  const q = query(
    collection(db, COL),
    where("slug", "==", slug),
    where("status", "==", "published"),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/* Realtime subscription — used if a page wants live updates. */
export function subscribePublishedCaseStudies(cb) {
  const q = query(
    collection(db, COL),
    where("status", "==", "published"),
    orderBy("displayOrder", "asc"),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
