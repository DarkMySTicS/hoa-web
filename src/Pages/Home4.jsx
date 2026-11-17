import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CHAPTERS } from "../lib/chapters";
import CtaButton from "../components/CtaButton";
import AuroraBackground from "../components/AuroraBackground";
import { useSpotlight } from "../lib/useSpotlight";
import playIcon from "../assets/playIcon.svg";

gsap.registerPlugin(ScrollTrigger);

const Home4 = () => {
  const containerRef = useRef(null);
  const { containerRef: heroRef, glowRef: heroGlowRef } = useSpotlight();
  const { containerRef: outroRef, glowRef: outroGlowRef } = useSpotlight();

  const navigate = useNavigate();
  const openChapter = (i) => navigate(`/videos/${i + 1}`);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        ".h4-headline",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1 },
      )
        .fromTo(
          ".h4-sub",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          "-=0.65",
        )
        .fromTo(
          ".h4-eyebrow-tag",
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          "-=0.6",
        )
        .fromTo(
          ".h4-chapter-item",
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.06 },
          "-=0.25",
        );
    },
    { scope: containerRef },
  );

  useGSAP(
    () => {
      gsap.set(".h4-outro-item", { y: 30, opacity: 0 });
      gsap.to(".h4-outro-item", {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: { trigger: ".h4-outro", start: "top 75%" },
      });
    },
    { scope: containerRef },
  );

  // Scroll parallax — hero copy eases up slightly slower than the scroll
  // itself, so the page keeps moving even when nothing is actively fading
  // in. The aurora backdrop stays put (it's position:fixed already, and
  // translating it on scroll used to drag its edge past the viewport,
  // exposing a black gap behind the navbar).
  useGSAP(
    () => {
      gsap.to(".h4-hero-copy", {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-x-hidden bg-black text-white"
    >
      <AuroraBackground className="h4-aurora" />

      {/* Hero — headline, tag, chapter index */}
      <section
        ref={heroRef}
        className="relative z-10 flex min-h-dvh flex-col justify-center px-6 pt-28 pb-16 sm:px-10 sm:pt-32 md:px-16 lg:px-24"
      >
        <div ref={heroGlowRef} className="pointer-events-none absolute inset-0" />

        <span className="h4-dot" style={{ top: "16%", left: "5%", background: "#ec2323", color: "#ec2323", animation: "h4Drift 6s ease-in-out infinite" }} />
        <span className="h4-dot" style={{ top: "72%", right: "8%", background: "#b8439b", color: "#b8439b", animation: "h4Drift 7.5s ease-in-out infinite 1s" }} />
        <span className="h4-dot" style={{ top: "40%", right: "22%", background: "#e23a52", color: "#e23a52", animation: "h4Drift 5s ease-in-out infinite 0.4s" }} />

        <div className="h4-hero-copy relative flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-10">
          <div className="max-w-xl">
            <h1 className="h4-headline font-[sectra] italic text-[42px] leading-[0.95] tracking-tight sm:text-[60px] md:text-[76px]">
              Clarity.{" "}
              <span className="h4-gradient-text bg-gradient-to-r from-[#b8439b] via-[#e23a52] to-[#ec2323] bg-clip-text text-transparent">
                Not Chaos.
              </span>
            </h1>
            <div className="h4-sub mt-5 max-w-md font-[helve] text-[15px] leading-relaxed text-white/70 sm:text-[18px]">
              <p>Build with clarity.</p>
              <p>We strip away the noise.</p>
              <p>Then build only what matters.</p>
            </div>
          </div>

          <div className="h4-eyebrow-tag shrink-0 font-[sectra] text-[15px] leading-relaxed text-white/55 sm:text-[17px] md:pt-2 md:text-right">
            <p>For founders</p>
            <p>building brands</p>
            <p>
              with <span className="font-bold text-white">intention.</span>
            </p>
          </div>
        </div>

        <div className="h4-hero-copy mt-14 md:mt-16">
          <ul>
            {CHAPTERS.map((c, i) => (
              <li
                key={c.title}
                onClick={() => openChapter(i)}
                className="h4-chapter-item group flex cursor-pointer items-center justify-between gap-4 border-b border-white/10 py-3.5 sm:py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-[sectra] italic text-[19px] leading-tight text-white transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-[#b8439b] group-hover:via-[#e23a52] group-hover:to-[#ec2323] group-hover:bg-clip-text group-hover:text-transparent sm:text-[22px]">
                      <span className="text-white/50 mr-2">Ch {i + 1}.</span>
                      {c.title}
                    </span>
                    <span className="hidden font-[helve] text-[13px] text-white/40 sm:inline">
                      — {c.subtitle}
                    </span>
                  </div>
                  <span className="mt-1 block font-[helve] text-[12px] text-white/40 sm:hidden">
                    {c.subtitle}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Play ${c.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openChapter(i);
                  }}
                  className="shrink-0 transition-transform hover:scale-110 active:scale-95"
                >
                  <img
                    src={playIcon}
                    alt=""
                    className="h-8 w-8 sm:h-9 sm:w-9"
                    draggable="false"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>

        
      </section>

      {/* Outro */}
      <section
        ref={outroRef}
        className="h4-outro relative z-10 flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-24 text-center"
      >
        <div ref={outroGlowRef} className="pointer-events-none absolute inset-0" />
        <span className="h4-dot" style={{ top: "20%", left: "12%", background: "#b8439b", color: "#b8439b", animation: "h4Drift 6.5s ease-in-out infinite 0.3s" }} />
        <span className="h4-dot" style={{ bottom: "22%", right: "14%", background: "#ec2323", color: "#ec2323", animation: "h4Drift 5.5s ease-in-out infinite" }} />
        <span className="h4-dot" style={{ top: "35%", right: "24%", background: "#e23a52", color: "#e23a52", animation: "h4Drift 7s ease-in-out infinite 1.2s" }} />

        <h2 className="h4-outro-item font-[sectra] italic text-[48px] leading-[0.95] tracking-tight sm:text-[58px] md:text-[76px]">
          <span className="block sm:inline">Build What&rsquo;s</span>{" "}
          <span className="h4-gradient-text block whitespace-nowrap bg-gradient-to-r from-[#b8439b] via-[#e23a52] to-[#ec2323] bg-clip-text text-transparent sm:inline">
            Worth Building
          </span>
        </h2>
        <p className="h4-outro-item mt-7 font-[helve] text-[19px] text-white/60 italic sm:mt-5 sm:text-[20px]">
          Step out of Ordinary
        </p>
        <div className="h4-outro-item relative mt-12 sm:mt-10">
          <CtaButton
            className="px-10 py-3.5 text-[16px] sm:px-9 sm:py-3 sm:text-[15px]"
            hoverText="HIT THE BRIEF"
            diffuse
          />
        </div>
      </section>

      <style>{`
        .h4-dot {
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          pointer-events: none;
          box-shadow: 0 0 16px 3px currentColor;
        }
        @keyframes h4Drift {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          50% { transform: translate(18px, -22px) scale(1.7); opacity: 1; }
        }

        .h4-gradient-text {
          background-size: 220% auto;
          animation: h4Shimmer 4.5s ease-in-out infinite alternate;
        }
        @keyframes h4Shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        @keyframes h4ScrollBob {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(4px); opacity: 1; }
        }
        .h4-scroll-arrow { animation: h4ScrollBob 1.6s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .h4-dot, .h4-gradient-text, .h4-scroll-arrow {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Home4;
