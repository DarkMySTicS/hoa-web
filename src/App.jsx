import { Suspense, lazy, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
// Home4 is the "/" route — the only page that needs to be in the initial
// bundle. Every other route (plus ContactForm, which pulls in Firebase) is
// code-split so the homepage isn't paying to download and parse JS it
// doesn't use.
import Home4 from "./Pages/Home4";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { captureUtmParams } from "./lib/utm";

const Home = lazy(() => import("./Pages/Home"));
const Home2 = lazy(() => import("./Pages/Home2"));
const Home3 = lazy(() => import("./Pages/Home3"));
const CaseStudies = lazy(() => import("./Pages/CaseStudies"));
const CaseStudiesLocal = lazy(() => import("./Pages/CaseStudiesLocal"));
const CaseStudy = lazy(() => import("./Pages/CaseStudy"));
const CaseStudyStatic = lazy(() => import("./Pages/CaseStudyStatic"));
const PublicForm = lazy(() => import("./Pages/PublicForm"));
const ThankYou = lazy(() => import("./Pages/ThankYou"));
const Videos = lazy(() => import("./Pages/Videos"));
const Services = lazy(() => import("./Pages/Services"));
const Privacy = lazy(() => import("./Pages/Privacy"));
const Cookies = lazy(() => import("./Pages/Cookies"));
const NotFound = lazy(() => import("./Pages/NotFound"));

/* The lead form and the videos page each own the whole screen — hide the
   global Navbar there so nothing overlaps their own chrome. */
const ChromeAndModal = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/forms/")) return null;
  if (pathname === "/apply") return null;
  if (pathname === "/thank-you") return null;
  if (pathname.startsWith("/videos")) return null;
  return <Navbar />;
};

/* gtag.js / the Meta Pixel only see the very first load — client-side route
   changes never trigger a browser navigation, so without this a visit to
   /apply (or any other route) would be invisible to both. Re-fires a
   PageView on every route change after the first (index.html's inline tags
   already cover that one). */
const Analytics = () => {
  const location = useLocation();
  const firedInitial = useRef(false);
  useEffect(() => {
    captureUtmParams();
    if (!firedInitial.current) {
      firedInitial.current = true;
      return;
    }
    if (typeof window === "undefined") return;
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
    if (typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  }, [location]);
  return null;
};

// Known route prefixes — used to hide the global footer on the 404 page so
// the dead-end screen owns its own composition.
const KNOWN_ROUTES = [
  "/",
  "/home",
  "/home2",
  "/home3",
  "/home4",
  "/case-studies",
  "/case-studies-local",
  "/case-study/",
  "/case-study-static",
  "/services",
  "/videos",
  "/forms/",
  "/apply",
  "/thank-you",
  "/privacy",
  "/cookies",
];

const isKnownRoute = (pathname) =>
  KNOWN_ROUTES.some((r) =>
    r.endsWith("/") ? pathname.startsWith(r) : pathname === r,
  );

const SiteFooter = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/forms/")) return null;
  if (pathname === "/apply") return null;
  if (pathname === "/thank-you") return null;
  if (pathname.startsWith("/videos")) return null;
  if (pathname.startsWith("/case-studies")) return null;
  if (!isKnownRoute(pathname)) return null;
  return <Footer />;
};

const App = () => {
  return (
    <Router>
      <Analytics />
      <ChromeAndModal />
      <main>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home4 />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route
              path="/case-studies-local"
              element={<CaseStudiesLocal />}
            />
            <Route path="/case-study/:slug" element={<CaseStudy />} />
            <Route path="/case-study-static" element={<CaseStudyStatic />} />
            <Route path="/home" element={<Home />} />
            <Route path="/home2" element={<Home2 />} />
            <Route path="/home3" element={<Home3 />} />
            <Route path="/home4" element={<Home4 />} />
            <Route path="/services" element={<Services />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/videos/:chapter" element={<Videos />} />
            {/* Canonical lead-form link every on-site CTA points to — its
                own route (rather than a modal) so Meta Pixel / GA and any
                URL-based conversion rule actually see the visit. */}
            <Route
              path="/apply"
              element={<PublicForm slug="hoa-lead-form-v1" />}
            />
            <Route path="/forms/:slug" element={<PublicForm />} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <SiteFooter />
    </Router>
  );
};

export default App;
