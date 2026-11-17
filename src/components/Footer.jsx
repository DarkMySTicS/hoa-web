import { Link } from "react-router-dom";
import logo from "../assets/HOA-LOGO.png";
import CtaButton from "./CtaButton";
import { CASE_STUDY_CATEGORIES } from "../lib/caseStudyCategories";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/85 backdrop-blur-md text-white font-[helve]">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="block h-9 w-24.25 overflow-hidden">
              <img
                src={logo}
                alt="Humans of Ambition"
                className="h-9 max-w-none -ml-12.25"
                draggable="false"
              />
            </Link>
            <p className="text-[12px] leading-relaxed text-white/55 max-w-xs">
              Built by people who understand that great brands aren’t built in
              parts — but through everything moving together.
            </p>
          </div>

          {/* Explore */}
          <div>
            <div className="text-[10px] tracking-[0.3em] text-white/45 mb-4">
              EXPLORE
            </div>
            <ul className="space-y-2.5 text-[13px]">
              <li>
                <Link
                  to="/"
                  className="text-white/75 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <span className="text-white/75">Case Studies</span>
                {/* Nested under "Case Studies" — a hairline rail plus a small
                    indent reads as a child group without pushing them far in. */}
                <ul className="mt-2.5 ml-0.5 flex flex-col items-start gap-2 border-l border-white/15 pl-3 text-left">
                  {CASE_STUDY_CATEGORIES.map((c) => (
                    <li key={c.key}>
                      <Link
                        to={`/case-studies?category=${c.key}`}
                        className="text-white/55 hover:text-white transition-colors text-[12px]"
                      >
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li>
                <Link
                  to="/services"
                  className="text-white/75 hover:text-white transition-colors"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  to="/videos"
                  className="text-white/75 hover:text-white transition-colors"
                >
                  Videos
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <div className="text-[10px] tracking-[0.3em] text-white/45 mb-4">
              LEGAL
            </div>
            <ul className="space-y-2.5 text-[13px]">
              <li>
                <Link
                  to="/privacy"
                  className="text-white/75 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/cookies"
                  className="text-white/75 hover:text-white transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div>
            <div className="text-[10px] tracking-[0.3em] text-white/45 mb-4">
              GET IN TOUCH
            </div>
            <CtaButton />
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] tracking-wide text-white/45">
          <div>© {year} Humans of Ambition. All rights reserved.</div>
          <div className="font-[sectra] italic">Built loud. Built to last.</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
