import { Link } from "react-router-dom";

const Privacy = () => {
  return (
    <div className="relative min-h-screen w-full bg-black text-white">
      <div className="landscape-tight relative z-10 mx-auto max-w-3xl px-6 sm:px-10 pt-28 sm:pt-32 pb-24 font-[helve]">
        <div className="text-[11px] tracking-[0.3em] text-white/55">
          LEGAL — PRIVACY
        </div>
        <h1 className="mt-4 font-[sectra] italic text-[40px] sm:text-[56px] leading-[1.05] tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-[12px] text-white/45">
          Last updated: {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>

        <div className="mt-10 space-y-8 text-[14px] leading-relaxed text-white/75">
          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              1. Who we are
            </h2>
            <p>
              Humans of Ambition ("we", "us", "our") is a brand consultancy. This
              policy explains what information we collect when you visit our
              website or share details with us, and how we use it.
            </p>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              2. What we collect
            </h2>
            <ul className="space-y-2 list-disc pl-5 text-white/75">
              <li>
                <span className="text-white">Contact details</span> you submit
                through forms — name, email, phone, company, and message.
              </li>
              <li>
                <span className="text-white">Technical data</span> your browser
                shares automatically — IP address, device type, browser, pages
                visited, and timestamps.
              </li>
              <li>
                <span className="text-white">Cookies and similar storage</span>{" "}
                used to keep the site running smoothly. See our{" "}
                <Link to="/cookies" className="text-red-400 hover:text-red-300">
                  Cookie Policy
                </Link>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              3. How we use it
            </h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>To respond to enquiries and deliver work you've engaged us for.</li>
              <li>To improve the website and our services.</li>
              <li>To send relevant updates — only if you've opted in.</li>
              <li>To meet legal and accounting obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              4. Who sees it
            </h2>
            <p>
              We don't sell your data. We share it only with service providers
              who help us operate — hosting, analytics, communications — and only
              to the extent they need. We may disclose information when required
              by law.
            </p>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              5. How long we keep it
            </h2>
            <p>
              We retain personal data only as long as it's useful for the purpose
              it was collected, or as long as the law requires. You can ask us to
              delete it at any time.
            </p>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              6. Your rights
            </h2>
            <p>
              You may request access to, correction of, or deletion of your
              personal data. You may also withdraw consent for marketing
              communications. Email us at{" "}
              <a
                href="mailto:hello@humansofambition.com"
                className="text-red-400 hover:text-red-300"
              >
                hello@humansofambition.com
              </a>{" "}
              to exercise any of these rights.
            </p>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              7. Security
            </h2>
            <p>
              We use reasonable technical and organisational measures to protect
              the data we hold. No system is perfectly secure, but we treat your
              information with care.
            </p>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              8. Changes
            </h2>
            <p>
              We may update this policy from time to time. The "Last updated"
              date at the top will reflect the most recent revision.
            </p>
          </section>

          <section>
            <h2 className="font-[sectra] italic text-[22px] text-white mb-3">
              9. Contact
            </h2>
            <p>
              Questions about this policy? Reach us at{" "}
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

export default Privacy;
