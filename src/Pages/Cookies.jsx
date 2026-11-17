import { Link } from "react-router-dom";

const Cookies = () => {
  return (
    <div className="relative min-h-screen w-full bg-black text-white">
      <div className="landscape-tight relative z-10 mx-auto max-w-3xl px-6 sm:px-10 pt-28 sm:pt-32 pb-24 font-[helve]">
        <div className="text-[11px] tracking-[0.3em] text-white/55">
          LEGAL — COOKIES
        </div>
        <h1 className="mt-4 font-[sectra] italic text-[40px] sm:text-[56px] leading-[1.05] tracking-tight">
          Cookie Policy
        </h1>
        <p className="mt-3 text-[12px] text-white/45">
          Last updated: {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>

        <div className="mt-10 space-y-8 text-[14px] leading-relaxed text-white/75">
          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              1. What cookies are
            </h2>
            <p>
              Cookies are small text files stored on your device when you visit a
              website. We also use similar technologies — like localStorage — to
              remember things between visits. Throughout this policy, "cookies"
              covers all of these.
            </p>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              2. Why we use them
            </h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <span className="text-white">Essential.</span> To make core
                features work — like remembering where you left off in a video
                or holding a half-finished contact form.
              </li>
              <li>
                <span className="text-white">Performance.</span> To understand
                which pages people visit so we can improve them.
              </li>
              <li>
                <span className="text-white">Functional.</span> To remember
                preferences like volume settings.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              3. What we set
            </h2>
            <p className="mb-4">
              The site itself doesn't set tracking cookies. We use{" "}
              <span className="text-white">browser localStorage</span> to keep:
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <code className="text-white/85">hoa:videoState</code> — the
                chapter, playback time and volume so you can resume.
              </li>
              <li>
                Draft contact form data, so you don't lose progress if you close
                the modal accidentally.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              4. Third-party services
            </h2>
            <p>
              We rely on third-party services (for example for hosting and
              analytics) that may set their own cookies when you visit. These
              providers operate under their own privacy and cookie policies.
            </p>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              5. Your controls
            </h2>
            <p>
              You can clear cookies and localStorage at any time through your
              browser settings. Doing so will reset video progress and any saved
              form drafts. Most browsers also let you block cookies entirely,
              though some features may stop working.
            </p>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              6. Related
            </h2>
            <p>
              For more on how we handle the data we collect, see our{" "}
              <Link to="/privacy" className="text-red-400 hover:text-red-300">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              7. Contact
            </h2>
            <p>
              Questions about cookies? Reach us at{" "}
              <a
                href="mailto:hello@humansofambition.com"
                className="text-red-400 hover:text-red-300"
              >
                hello@humansofambition.com
              </a>{" "}
              or{" "}
              <a href="tel:+910000000000" className="text-red-400 hover:text-red-300">
                +91 00000 00000
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10">
          <Link
            to="/"
            className="text-[11px] tracking-[0.3em] text-white/55 hover:text-white transition-colors"
          >
            ← BACK HOME
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cookies;
