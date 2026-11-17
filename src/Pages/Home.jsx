import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import HomeBackground from "../assets/HomeBackground2.png";
import headerlogo from "../assets/hoalogo-heading.png";
import playIcon from "../assets/playIcon.svg";
import CtaButton from "../components/CtaButton";

const Home = () => {
  const containerRef = useRef(null);
  const scrollerRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false,
  );
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 769px) and (max-width: 1279px)").matches
      : false,
  );

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
      setIsCompact(
        window.matchMedia("(min-width: 769px) and (max-width: 1279px)").matches,
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => {
      const overflowing = el.scrollHeight > el.clientHeight + 1;
      setOverflows(overflowing);
      setAtBottom(
        !overflowing || el.scrollTop + el.clientHeight >= el.scrollHeight - 4,
      );
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      ro.disconnect();
    };
  }, []);

  const sections = [
    { title: "Welcome", subtitle: "The Calm Beginning", videoId: "1189088027" },
    {
      title: "Let's Settle the Chaos",
      subtitle: "The Overwhelm",
      videoId: "1189087529",
    },
    {
      title: "The Philosophy",
      subtitle: "Our Way of Seeing",
      videoId: "1189087673",
    },
    {
      title: "A Simple Hint",
      subtitle: "What We Actually Do",
      videoId: "1189087878",
    },
    {
      title: "Who We're For",
      subtitle: "Clarifying the Fit",
      videoId: "1189087607",
    },
    {
      title: "Our Way of Working",
      subtitle: "Setting Boundaries Gently",
      videoId: "1189087914",
    },
    {
      title: "The Offer",
      subtitle: "The Quiet Invitation",
      videoId: "1189087975",
    },
    {
      title: "The End",
      subtitle: "Founder's Final Words",
      videoId: "1189087783",
    },
  ];

  const navigate = useNavigate();
  const openChapter = (i) => navigate(`/videos/${i + 1}`);
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        ".bg-image",
        { scale: 1.08, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.2, ease: "power2.out" },
      )
        .fromTo(
          ".home-logo",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9 },
          "-=0.7",
        )
        .fromTo(
          ".home-desc",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          "-=0.5",
        )
        .fromTo(
          ".home-cta",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.4",
        )
        .fromTo(
          ".home-list-item",
          { x: 40, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.6, stagger: 0.08 },
          "-=0.7",
        );
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full overflow-x-hidden bg-black text-white"
    >
      <div
        className="bg-image fixed top-0 left-0 bg-cover pointer-events-none"
        style={{
          backgroundImage: `url(${HomeBackground})`,
          backgroundPosition: isMobile
            ? "center"
            : isCompact
              ? "30% center"
              : "50% center",
          filter: `${isMobile ? "brightness(0.60 )" : "brightness(0.75)"}`,
          width: "100vw",
          height: "100lvh",
          minHeight: "100vh",
        }}
      />
      <div
        className="fixed top-0 left-0 bg-gradient-to-b from-black/55 via-black/20 to-black/65 pointer-events-none"
        style={{ width: "100vw", height: "100lvh", minHeight: "100vh" }}
      />

      <div className="landscape-tight relative z-10 min-h-screen pt-20 sm:pt-24 flex flex-col">
        <div className="w-full px-6 sm:px-10 flex-1 pb-10 sm:pb-12 flex flex-col">
          <div className="home-grid px-0 md:px-12 lg:px-20 xl:px-30 flex flex-col gap-10 md:gap-16 sm:gap-12 md:grid md:grid-cols-12">
            {/* Left intro */}
            <section className="md:col-span-5 md:pt-16">
              <div className="home-logo overflow-hidden w-54 sm:w-68 md:w-72">
                <img
                  src={headerlogo}
                  alt="Humans of Ambition Logo"
                  className="w-60 sm:w-76 md:w-90 max-w-none h-auto -ml-6 sm:-ml-8 md:-ml-8"
                  draggable="false"
                />
              </div>

              <p className="home-desc mt-7 sm:mt-12 max-w-100 font-[helve] text-[14px] sm:text-[20px] leading-relaxed text-white/70">
                We don’t believe great brands are built through noise, trends,
                or fragmented execution. We build brands the way they should’ve
                always been built. Not louder, but clearer. Not random, but
                intentional. Brands built with direction, depth, and systems
                that actually work together — making them impossible to
                misunderstand.
              </p>

              <div className="home-cta mt-7">
                <CtaButton to="/home" />
              </div>
            </section>

            {/* Right section list */}
            <section className="md:col-span-5 md:pt-2 pt-6">
              <ul className="space-y-6 sm:space-y-7 md:max-w-130 md:ml-auto">
                {sections.map((s, i) => (
                  <li
                    key={s.title}
                    onClick={() => openChapter(i)}
                    className="cursor-pointer home-list-item flex items-center flex-row-reverse md:flex-row justify-end gap-4 sm:gap-5"
                  >
                    <div className="min-w-0 text-left md:text-right">
                      <div className="font-[sectra] italic text-[20px] sm:text-[24px] leading-tight text-white">
                        <span className="text-white/70 mr-2">Ch {i + 1}.</span>
                        <span>{s.title}</span>
                      </div>
                      <div className="font-[sectra] italic text-[14px] sm:text-[20px] text-white/70 mt-1.5">
                        {s.subtitle}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Play ${s.title}`}
                      onClick={() => openChapter(i)}
                      className="shrink-0 transition-transform hover:scale-110 active:scale-95"
                    >
                      <img
                        src={playIcon}
                        alt=""
                        className="h-10 w-10 sm:h-11 sm:w-11"
                        draggable="false"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <div className="home-cta w-full mt-4 block sm:hidden">
              <CtaButton className="w-full" to="/home" />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-white/70 text-[10px] tracking-[0.3em] transition-opacity duration-500 ${
          overflows && !atBottom ? "opacity-00" : "opacity-0"
        }`}
      >
        <span>SCROLL</span>
        <span className="home-scroll-arrow text-base leading-none">↓</span>
      </div>

      <style>{`
        @keyframes homeScrollBob {
          0%, 100% { transform: translateY(0); opacity: 0.7; }
          50%      { transform: translateY(4px); opacity: 1; }
        }
        .home-scroll-arrow { animation: homeScrollBob 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default Home;
