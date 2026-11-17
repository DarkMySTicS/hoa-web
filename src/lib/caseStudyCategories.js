// Shared by the navbar/footer "Case Studies" dropdown — links into
// /case-studies with the category pre-selected. Split out of caseStudies.js
// (which pulls in firebase/firestore) so the globally-mounted Navbar/Footer
// don't drag Firestore into every page's initial bundle just for this list.
export const CASE_STUDY_CATEGORIES = [
  { key: "hoa", label: "HOA Case Studies" },
  { key: "founders", label: "Founder's Projects" },
];
