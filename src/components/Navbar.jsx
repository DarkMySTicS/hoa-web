import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import CtaButton from "./CtaButton";
import { CASE_STUDY_CATEGORIES } from "../lib/caseStudyCategories";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [csOpen, setCsOpen] = useState(false);
  // Desktop dropdown is state-driven rather than :hover/:focus-within — the
  // CSS version latched open after a click because the trigger kept focus.
  const [csMenu, setCsMenu] = useState(false);
  const headerRef = useRef(null);
  const drawerRef = useRef(null);
  const backdropRef = useRef(null);

  // Case-study detail pages render on a white canvas, so the global nav
  // switches to a "line" style — white bar, hairline border, dark text —
  // to read against the page instead of floating over it.
  const isLineStyle = location.pathname.startsWith("/case-study/");

  const linkClass = (to) => {
    const active = location.pathname === to;
    if (isLineStyle) {
      return `tracking-widest font-[helve] transition-colors ${
        active ? "text-black font-bold" : "text-black/70 hover:text-black"
      }`;
    }
    return `tracking-widest font-[helve] transition-colors ${
      active
        ? "text-white font-bold"
        : "text-white md:text-white/80 md:hover:text-white"
    }`;
  };

  useEffect(() => {
    setMenuOpen(false);
    setCsOpen(false);
    setCsMenu(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Entrance animation + initial drawer state
  useGSAP(
    () => {
      gsap.set(drawerRef.current, { xPercent: 100 });
      gsap.set(backdropRef.current, { autoAlpha: 0 });

      gsap.from(headerRef.current.querySelectorAll(".nav-anim"), {
        y: -16,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
        delay: 0.1,
      });
    },
    { scope: headerRef },
  );

  // Drawer toggle
  useGSAP(
    () => {
      if (menuOpen) {
        gsap.to(backdropRef.current, {
          autoAlpha: 1,
          x: 0,
          duration: 0.25,
          pointerEvents: "auto",
        });

        gsap.to(drawerRef.current, {
          xPercent: 0,
          duration: 0.45,
          x: 0,
          ease: "power3.out",
        });

        gsap.fromTo(
          drawerRef.current.querySelectorAll(".mobile-item"),
          { x: 0, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.08,
            delay: 0.15,
            ease: "power2.out",
          },
        );
      } else {
        gsap.to(drawerRef.current, {
          xPercent: 100,
          x: 0,
          duration: 0.35,
          ease: "power3.in",
        });

        gsap.to(backdropRef.current, {
          autoAlpha: 0,
          duration: 0.25,
          delay: 0.1,
          pointerEvents: "none",
        });
      }
    },
    { dependencies: [menuOpen] },
  );

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-[60] ${
        isLineStyle ? "text-black" : "text-white"
      }`}
    >
      {isLineStyle && (
        <div className="absolute inset-0 bg-white border-b border-black pointer-events-none" />
      )}

      <div className="relative z-10 w-full flex items-center justify-between px-6 sm:px-10 py-4 sm:py-6">
        <div className="flex items-center gap-6 sm:gap-10 lg:gap-12">
          <Link
            to="/"
            className="nav-anim shrink-0 flex items-center h-9 sm:h-10"
          >
            <img
              src="/logonew.png"
              alt="Humans of Ambition Logo"
              className={`h-full w-auto ${isLineStyle ? "invert" : ""}`}
              draggable="false"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10 lg:gap-20 nav-anim">
            <Link to="/" className={`${linkClass("/")} text-xs py-2`}>
              HOME
            </Link>
            <div
              className="relative flex items-center py-2"
              onMouseEnter={() => setCsMenu(true)}
              onMouseLeave={() => setCsMenu(false)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setCsMenu(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setCsMenu(false);
              }}
            >
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={csMenu}
                onClick={() => setCsMenu((o) => !o)}
                onFocus={() => setCsMenu(true)}
                className={`${linkClass("/case-studies")} inline-flex items-center gap-1.5 text-xs`}
              >
                CASE STUDIES
                <span
                  aria-hidden="true"
                  className={`text-[8px] transition-transform duration-200 ${
                    csMenu ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </button>

              <div
                className={`absolute left-0 top-full z-20 w-56 pt-4 transition-all duration-200 ${
                  csMenu
                    ? "visible translate-y-0 opacity-100"
                    : "pointer-events-none invisible -translate-y-1 opacity-0"
                }`}
              >
                <div
                  className={`overflow-hidden rounded-lg border shadow-[0_20px_45px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl ${
                    isLineStyle
                      ? "border-black/15 bg-white/95"
                      : "border-white/12 bg-[#0b0b0d]/85"
                  }`}
                >
                  {CASE_STUDY_CATEGORIES.map((c, i) => (
                    <Link
                      key={c.key}
                      to={`/case-studies?category=${c.key}`}
                      onClick={() => setCsMenu(false)}
                      className={`group/item flex items-center gap-2 px-4 py-3 font-[helve] text-[10px] uppercase tracking-[0.18em] transition-colors duration-150 ${
                        i > 0
                          ? isLineStyle
                            ? "border-t border-black/8"
                            : "border-t border-white/6"
                          : ""
                      } ${
                        isLineStyle
                          ? "text-black/60 hover:bg-black/5 hover:text-black"
                          : "text-white/60 hover:bg-white/6 hover:text-white"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-px w-0 shrink-0 transition-all duration-200 group-hover/item:w-3 ${
                          isLineStyle ? "bg-black/70" : "bg-white/70"
                        }`}
                      />
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link
              to="/services"
              className={`${linkClass("/services")} text-xs`}
            >
              SERVICES
            </Link>
          </nav>
        </div>

        {/* Desktop CTA — line style on case study pages, filled CTA elsewhere */}
        <div className="hidden md:block nav-anim">
          {isLineStyle ? (
            <button
              type="button"
              onClick={() => navigate("/apply")}
              className="inline-flex items-center justify-center border border-black px-6 py-2 text-[11px] tracking-[0.3em] font-[helve] font-semibold text-black hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer"
            >
              READY TO BUILD? <span className="ml-2 text-lg">→</span>
            </button>
          ) : (
            <CtaButton to="/" />
          )}
        </div>

        {/* Mobile Hamburger — bars sit centered in the button box. */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden nav-anim relative w-8 h-8 flex items-center justify-center"
        >
          <span
            className={`absolute h-px w-5 rounded-full transition-all duration-300 ${
              isLineStyle ? "bg-black" : "bg-white"
            } ${menuOpen ? "rotate-45 translate-y-0" : "-translate-y-1.5"}`}
          />
          <span
            className={`absolute h-px w-5 rounded-full transition-opacity duration-200 ${
              isLineStyle ? "bg-black" : "bg-white"
            } ${menuOpen ? "opacity-0" : "opacity-100"}`}
          />
          <span
            className={`absolute h-px w-5 rounded-full transition-all duration-300 ${
              isLineStyle ? "bg-black" : "bg-white"
            } ${menuOpen ? "-rotate-45 translate-y-0" : "translate-y-1.5"}`}
          />
        </button>
      </div>

      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={() => setMenuOpen(false)}
        className="md:hidden fixed inset-0 bg-black/60 z-40 opacity-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Mobile Drawer — always dark so the line-style nav doesn't render
          black-on-black links inside it. */}
      <div
        ref={drawerRef}
        className="md:hidden fixed top-0 right-0 h-full w-72 max-w-[80vw] bg-black backdrop-blur-md border-l border-white/10 z-[100] overflow-hidden"
      >
        <div className="pt-24 px-8 flex flex-col gap-8">
          <Link
            to="/"
            className={`mobile-item tracking-widest font-[helve] text-base transition-colors ${
              location.pathname === "/"
                ? "text-white font-bold"
                : "text-white/80 hover:text-white"
            }`}
          >
            HOME
          </Link>

          <div className="mobile-item">
            <button
              type="button"
              aria-label={
                csOpen ? "Collapse case studies menu" : "Expand case studies menu"
              }
              aria-expanded={csOpen}
              onClick={() => setCsOpen((o) => !o)}
              className={`flex w-full items-center justify-between gap-3 tracking-widest font-[helve] text-base transition-colors ${
                location.pathname === "/case-studies"
                  ? "text-white font-bold"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <span>CASE STUDIES</span>
              <span
                className={`inline-block text-sm transition-transform duration-200 ${
                  csOpen ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                csOpen ? "mt-3 max-h-32 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="flex flex-col items-start gap-3 text-left pl-1">
                {CASE_STUDY_CATEGORIES.map((c) => (
                  <Link
                    key={c.key}
                    to={`/case-studies?category=${c.key}`}
                    className="text-sm tracking-wide text-white/65 transition-colors hover:text-white"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link
            to="/services"
            className={`mobile-item tracking-widest font-[helve] text-base transition-colors ${
              location.pathname === "/services"
                ? "text-white font-bold"
                : "text-white/80 hover:text-white"
            }`}
          >
            SERVICES
          </Link>

          <div className="mobile-item mt-4">
            <CtaButton to="/" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
