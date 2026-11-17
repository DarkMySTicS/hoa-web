import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CHAPTERS } from "../lib/chapters";

gsap.registerPlugin(ScrollTrigger);

// Pinned intro slides — each has a desktop (16:9) and a phone (9:16) cut of the
// same scene. The numbering differs between the two exports: phone C3 is the
// same sky scene as desktop C4. `focus` biases the crop toward each scene's
// subject so the extra zoom (see FRAME_ZOOM) doesn't just enlarge dead space.
const frames = [
  {
    desktop: "/C1 r1 nt.png",
    phone: "/C1 phn r1 nt.png",
    desktopFocus: "58% 74%",
    phoneFocus: "57% 57%",
  },
  {
    desktop: "/C2 r1 nt.png",
    phone: "/C2 phn r1 nt.png",
    desktopFocus: "76% 58%",
    phoneFocus: "55% 50%",
  },
  {
    desktop: "/C4 r1 nt.png",
    phone: "/C3 phn r1 nt.png",
    desktopFocus: "70% 46%",
    phoneFocus: "58% 36%",
  },
];

const FRAME_ZOOM = 1.14;

// Closing artwork — one tall piece covering sky → night → sunrise. The pinned
// intro already ends on the sky scene, so the chapter list and outro each
// crop straight into their own scene (night, sunrise) instead of re-showing
// the sky, and each sits in exactly one screen rather than scrolling through
// the full image.
const finale = { desktop: "/C5 r1 nt.png", phone: "/C4 phn r1 nt.png" };
const CHAPTER_BG_FOCUS = "50% 60%";
const OUTRO_BG_FOCUS = "50% 88%";

const Home2 = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const stageRef = useRef(null);

  useGSAP(
    () => {
      const frameEls = gsap.utils.toArray(".story-frame");
      gsap.set(frameEls, { autoAlpha: 0, scale: 1.04, y: 30 });
      gsap.set(frameEls[0], { autoAlpha: 1, scale: 1, y: 0 });
      gsap.set(".slide2-copy", { autoAlpha: 0, y: 26 });
      gsap.set(".slide3-line", { autoAlpha: 0, y: 26, filter: "blur(6px)" });

      // Hero title — neon-style flicker on load, then settles.
      gsap
        .timeline({ delay: 0.35 })
        .fromTo(
          ".hero-flash",
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.05 },
        )
        .to(".hero-flash", { autoAlpha: 0.15, duration: 0.07 })
        .to(".hero-flash", { autoAlpha: 1, duration: 0.05 })
        .to(".hero-flash", { autoAlpha: 0.3, duration: 0.06 })
        .to(".hero-flash", { autoAlpha: 1, duration: 0.05 })
        .to(".hero-flash", { autoAlpha: 0.55, duration: 0.08 })
        .to(".hero-flash", { autoAlpha: 1, duration: 0.2, ease: "power2.out" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: stageRef.current,
          start: "top top",
          end: () => `+=${window.innerHeight * (frames.length - 1) * 1.4}`,
          scrub: 0.6,
          pin: stageRef.current,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      for (let i = 0; i < frameEls.length - 1; i++) {
        const label = `step-${i}`;
        tl.addLabel(label)
          .to(
            frameEls[i],
            { autoAlpha: 0, scale: 0.97, y: -30, ease: "power2.in" },
            label,
          )
          .to(
            frameEls[i + 1],
            { autoAlpha: 1, scale: 1, y: 0, ease: "power2.out" },
            label,
          );
        // Slide copy enters once its artwork has settled: slide 2 is a plain
        // fade-up, slide 3 rises line by line out of a blur.
        if (i === 0) {
          tl.to(
            ".slide2-copy",
            { autoAlpha: 1, y: 0, ease: "power2.out" },
            `${label}+=0.25`,
          );
        }
        if (i === 1) {
          tl.to(
            ".slide3-line",
            {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              stagger: 0.15,
              ease: "power2.out",
            },
            `${label}+=0.25`,
          );
        }
        tl.to({}, { duration: 0.4 });
      }
    },
    { scope: containerRef },
  );

  // Chapter list and outro — each is a single, non-scrolling screen. Both the
  // cropped background and the text animate in once as the section scrolls
  // into view (no pinning, no scrubbing).
  useGSAP(
    () => {
      gsap.set(".chapter-bg", { scale: 1.1, autoAlpha: 0 });
      gsap.set(".chapter-row", { autoAlpha: 0, y: 36 });
      gsap.set(".outro-bg", { scale: 1.1, autoAlpha: 0 });
      gsap.set(".outro-item", { autoAlpha: 0, y: 34 });

      gsap.to(".chapter-bg", {
        scale: 1,
        autoAlpha: 1,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: ".chapter-section", start: "top 85%" },
      });
      gsap.to(".chapter-row", {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.09,
        ease: "power2.out",
        scrollTrigger: { trigger: ".chapter-list", start: "top 75%" },
      });

      gsap.to(".outro-bg", {
        scale: 1,
        autoAlpha: 1,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: ".outro-section", start: "top 85%" },
      });
      gsap.to(".outro-item", {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.16,
        ease: "power2.out",
        scrollTrigger: { trigger: ".outro-copy", start: "top 80%" },
      });
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className="relative w-full bg-black text-white">
      <style>{`
        .frame-img { object-position: var(--phone-focus); }
        @media (orientation: landscape) {
          .frame-img { object-position: var(--desktop-focus); }
        }
      `}</style>
      {/* Pinned slide sequence */}
      <div ref={stageRef} className="relative h-screen w-full overflow-hidden">
        {frames.map((f, i) => (
          <figure
            key={f.desktop}
            className="story-frame absolute inset-0"
            style={{ zIndex: i + 1 }}
          >
            <picture>
              <source
                media="(orientation: landscape)"
                srcSet={encodeURI(f.desktop)}
              />
              <img
                src={f.phone}
                alt=""
                className="frame-img absolute inset-0 h-full w-full object-cover"
                style={{
                  transform: `scale(${FRAME_ZOOM})`,
                  "--phone-focus": f.phoneFocus,
                  "--desktop-focus": f.desktopFocus,
                }}
                draggable="false"
              />
            </picture>

            {i === 0 && (
              <div className="hero-flash absolute inset-x-0 top-[32%] px-6 text-center landscape:top-[42%]">
                <h1 className="bg-gradient-to-r from-[#b8439b] via-[#e23a52] to-[#ec2323] bg-clip-text font-[sectra] text-[42px] font-bold italic tracking-wide text-transparent md:text-[76px]">
                  YOU MADE IT.
                </h1>
              </div>
            )}

            {i === 1 && (
              <div className="slide2-copy absolute left-[8%] top-[24%] max-w-xl pr-6 landscape:left-[12%] landscape:top-[40%]">
                <h2 className="font-[sectra] text-[38px] font-bold italic text-[#d8cfdc] md:text-[62px]">
                  Take a breath.
                </h2>
                <p className="mt-3 max-w-md font-[helve] text-[13px] font-bold uppercase leading-relaxed tracking-wide text-[#d8cfdc] md:text-[16px]">
                  Nobody here is trying to sell you anything in the next thirty
                  seconds.
                </p>
              </div>
            )}

            {/* Desktop only — the phone finale artwork has this copy baked in */}
            {i === 2 && (
              <div className="absolute left-[10%] top-[26%] hidden max-w-2xl landscape:block">
                <p className="slide3-line font-[helve] text-3xl leading-snug text-white lg:text-4xl">
                  If our way of thinking
                </p>
                <p className="slide3-line font-[helve] text-4xl font-bold leading-snug tracking-wide lg:text-5xl">
                  FEELS LIKE YOURS,
                </p>
                <p className="slide3-line mt-8 font-[helve] text-xl text-white/95 lg:text-2xl">
                  we&rsquo;ll build something{" "}
                  <span className="font-[sectra] text-2xl font-bold italic lg:text-3xl">
                    remarkable together.
                  </span>
                </p>
              </div>
            )}
          </figure>
        ))}
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-xs uppercase tracking-[0.4em] opacity-60">
          Scroll
        </div>
      </div>

      {/* Chapter list — one screen, cropped straight into the night scene
          (skips the sky the pinned intro already showed). No pin, no
          scroll-through — background and rows just animate in once. */}
      <section className="chapter-section relative h-screen w-full overflow-hidden">
        <picture>
          <source
            media="(orientation: landscape)"
            srcSet={encodeURI(finale.desktop)}
          />
          <img
            src={finale.phone}
            alt=""
            className="chapter-bg absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: CHAPTER_BG_FOCUS }}
            draggable="false"
          />
        </picture>

        <nav
          aria-label="Film chapters"
          className="relative z-10 flex h-full items-center justify-center"
        >
          <div className="chapter-list mx-auto w-full max-w-[400px] divide-y divide-white/10 border-y border-white/10 px-8 md:max-w-3xl md:px-0">
            {CHAPTERS.map((c, i) => (
              <Link
                key={c.title}
                to={`/videos/${i + 1}`}
                className="chapter-row group flex items-center gap-8 py-2.5 md:gap-14 md:py-3.5"
              >
                <span className="font-[sectra] text-[20px] italic tabular-nums text-white/70 transition-colors duration-300 group-hover:text-white md:text-[30px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block font-[sectra] text-[17px] font-bold italic leading-tight text-white md:text-[24px]">
                    {c.title}
                  </span>
                  <span className="mt-0.5 block font-[helve] text-[10px] tracking-[0.15em] text-white/55 transition-colors duration-300 group-hover:text-white/80 md:text-[11px]">
                    {c.subtitle}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </nav>
      </section>

      {/* Sunrise outro — one screen, cropped into the horizon */}
      <section className="outro-section relative h-screen w-full overflow-hidden">
        <picture>
          <source
            media="(orientation: landscape)"
            srcSet={encodeURI(finale.desktop)}
          />
          <img
            src={finale.phone}
            alt=""
            className="outro-bg absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: OUTRO_BG_FOCUS }}
            draggable="false"
          />
        </picture>

        <div className="outro-copy relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <h2 className="outro-item font-[helve] text-[28px] font-bold leading-tight text-white md:text-[46px]">
            Take your time.
          </h2>
          <p className="outro-item mt-1 font-[sectra] text-[32px] font-bold italic leading-tight text-[#ffe3dd] md:text-[52px]">
            We&rsquo;ll be here.
          </p>
          <button
            type="button"
            onClick={() => navigate("/apply")}
            className="outro-item mt-6 rounded-full border border-[#f3b3ba]/70 px-7 py-2 font-[sectra] text-[15px] font-bold italic text-[#ffd9de] transition-colors duration-300 hover:bg-[#ffd9de] hover:text-[#5c2333] md:mt-8 md:px-9 md:py-2.5 md:text-[18px]"
          >
            Ready to Build
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home2;
