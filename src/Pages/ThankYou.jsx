import { Link, useLocation } from "react-router-dom";

/**
 * Post-submission destination for the lead form (/apply, /forms/:slug).
 * ContactForm navigates here once the lead is actually saved, passing
 * { name, leadId, whatsappUrl } via router state so the WhatsApp CTA keeps
 * the same prefilled message the form already built.
 *
 * A dedicated route (rather than an in-place "thank you" screen) is what
 * lets Meta/Google Ads conversion actions and analytics goals key off the
 * page view — same reasoning documented on ContactForm for why the form
 * itself is a route and not a modal.
 *
 * Visiting directly (no state) still works — falls back to a generic
 * WhatsApp message instead of a personalized one.
 */
const GENERIC_WHATSAPP_URL =
  "https://wa.me/?phone=919266823269&text=" +
  encodeURIComponent("Hi HOA — I'd like to chat.");

const ThankYou = () => {
  const location = useLocation();
  const state = location.state || {};
  const name = state.name || "";
  const leadId = state.leadId || null;
  const whatsappUrl = state.whatsappUrl || GENERIC_WHATSAPP_URL;

  return (
    <div className="min-h-screen w-full bg-[#fafafa] text-black flex items-center justify-center px-6 py-20">
      <div className="max-w-xl w-full text-center flex flex-col items-center">
        <div className="inline-flex w-14 h-14 sm:w-16 sm:h-16 rounded-full items-center justify-center text-2xl sm:text-3xl mb-8 bg-red-600 text-white shadow-[0_0_28px_rgba(239,68,68,0.45)]">
          ✓
        </div>

        <div className="text-[10px] tracking-[0.4em] uppercase font-[helve] text-red-600 mb-4">
          Application received
        </div>

        <h1 className="font-[sectra] italic text-4xl sm:text-6xl md:text-7xl leading-[1.05] tracking-tight text-black">
          {name ? `Thank you, ${name.split(" ")[0]}.` : "Thank you."}
        </h1>
        <div className="mt-6 max-w-lg font-[helve] text-base sm:text-lg text-black/65 leading-relaxed">
          <p>We don't move forward with every application.</p>
          <p>But when there's alignment, we move fast.</p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 rounded-full px-7 py-3 bg-[#25D366] text-white font-[sectra] italic text-sm font-bold tracking-wide hover:brightness-110 transition shadow-[0_0_25px_rgba(37,211,102,0.35)]"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 fill-current"
              aria-hidden="true"
            >
              <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.86 11.86 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.555-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.598-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.881.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.881a9.86 9.86 0 0 0 1.514 5.273l-.999 3.648 3.974-1.621z" />
            </svg>
            Chat on WhatsApp
          </a>

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 border border-black/20 hover:border-black/60 font-[helve] text-sm transition-colors"
          >
            Back to home
          </Link>
        </div>

        <p className="mt-8 text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/45">
          {leadId
            ? `Ref: ${leadId.slice(0, 8)} · we typically respond within 24 hours.`
            : "We typically respond within 24 hours."}
        </p>
      </div>
    </div>
  );
};

export default ThankYou;
