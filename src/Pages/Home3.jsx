import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/*
 * Home page scroll animation.
 *
 * Three source videos (public/Home Page Animation*.mp4) were extracted to JPEG
 * frame sequences at 12fps / native resolution so scroll-scrubbing stays sharp
 * on retina without decoding video. Regenerate with:
 *   ffmpeg -i "public/Home Page Animation1 r3 dstp.mp4" -vf fps=12 -q:v 2 public/frames/home/desktop/frame-%04d.jpg
 *   ffmpeg -i "public/Home Page Animation Tab size r1.mp4"  -vf fps=12 -q:v 2 public/frames/home/tablet/frame-%04d.jpg
 *   ffmpeg -i "public/Home Page Animation Phone r1.mp4"     -vf fps=12 -q:v 2 public/frames/home/phone/frame-%04d.jpg
 *
 * The breakpoint-matched sequence is the only one preloaded, so phones never
 * pay for the 1920px desktop frames.
 */
const FRAME_COUNT = 155;
// Skip the first frames so the hero opens a little further into the animation.
const START_INDEX = 10;
const frameUrl = (variant, n) =>
  `/frames/home/${variant}/frame-${String(n).padStart(4, "0")}.jpg`;

// Pick a frame variant from viewport width. Matches the site's existing
// mobile (<=768) / compact-tablet (769–1279) / desktop breakpoints.
const variantForWidth = (w) =>
  w <= 768 ? "phone" : w <= 1279 ? "tablet" : "desktop";

const getVariant = () =>
  typeof window === "undefined" ? "desktop" : variantForWidth(window.innerWidth);

// How many viewport-heights of scroll the sequence plays out over. Higher =
// slower / more deliberate scrub. Kept modest so the closing scene arrives
// soon after the animation ends instead of leaving a long "dead" scroll.
const SCROLL_LENGTH_VH = 4;

// How quickly the displayed frame catches up to the scroll target each rAF
// (0–1). Lower = smoother/laggier, higher = snappier/twitchier.
const SMOOTHING = 0.08;

// The chapter list overlaid on the closing scene. Kept in sync with Home.jsx.
const sections = [
  { title: "Welcome", subtitle: "The Calm Beginning" },
  { title: "Let's Settle the Chaos", subtitle: "The Overwhelm" },
  { title: "The Philosophy", subtitle: "Our Way of Seeing" },
  { title: "A Simple Hint", subtitle: "What We Actually Do" },
  { title: "Who We're For", subtitle: "Clarifying the Fit" },
  { title: "Our Way of Working", subtitle: "Setting Boundaries Gently" },
  { title: "The Offer", subtitle: "The Quiet Invitation" },
  { title: "The End", subtitle: "Founder's Final Words" },
];

const Home3 = () => {
  const navigate = useNavigate();
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const imagesRef = useRef([]);
  const currentFrameRef = useRef(0);

  const lenisRef = useRef(null);
  const [variant, setVariant] = useState(getVariant);
  const variantRef = useRef(variant);
  const [loadedPct, setLoadedPct] = useState(0);
  const [ready, setReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const openChapter = (i) => navigate(`/videos/${i + 1}`);

  // Swap the frame variant only when the viewport crosses a breakpoint bucket,
  // not on every resize pixel — avoids needless re-preloading. Resetting the
  // load state here (an event handler) keeps setState out of the effect body.
  useEffect(() => {
    const onResize = () => {
      const next = getVariant();
      if (next === variantRef.current) return;
      variantRef.current = next;
      setVariant(next);
      setReady(false);
      setLoadedPct(0);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Preload every frame of the active variant up front so scrubbing never
  // shows a blank canvas. Re-runs when the variant changes.
  useEffect(() => {
    let cancelled = false;
    let loaded = 0;

    const images = new Array(FRAME_COUNT);
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.onload = img.onerror = () => {
        if (cancelled) return;
        loaded += 1;
        setLoadedPct(Math.round((loaded / FRAME_COUNT) * 100));
        if (loaded === FRAME_COUNT) setReady(true);
      };
      img.src = frameUrl(variant, i + 1);
      images[i] = img;
    }
    imagesRef.current = images;

    return () => {
      cancelled = true;
    };
  }, [variant]);

  // Lenis smooth scroll, wired into GSAP's ticker and ScrollTrigger. Created
  // once for the whole page so the pinned sequence and the closing scene share
  // the same eased scroll.
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const drawFrame = (index) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img || !img.naturalWidth) return;
    currentFrameRef.current = index;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (
      canvas.width !== Math.round(w * dpr) ||
      canvas.height !== Math.round(h * dpr)
    ) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // object-fit: cover math
    const canvasRatio = w / h;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let dw, dh, dx, dy;
    if (imgRatio > canvasRatio) {
      dh = h;
      dw = h * imgRatio;
      dx = (w - dw) / 2;
      dy = 0;
    } else {
      dw = w;
      dh = w / imgRatio;
      dx = 0;
      dy = (h - dh) / 2;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  // Drive the sequence from scroll position once frames are ready. Scroll
  // progress is tracked as a target and eased toward with a rAF loop, so the
  // frame advance stays smooth regardless of raw scroll cadence.
  useEffect(() => {
    if (!ready) return;
    drawFrame(START_INDEX);

    const targetProgress = { current: 0 };
    const shownProgress = { current: 0 };
    let rafId;

    const trigger = ScrollTrigger.create({
      trigger: stageRef.current,
      start: "top top",
      end: () => `+=${window.innerHeight * SCROLL_LENGTH_VH}`,
      scrub: true,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        targetProgress.current = self.progress;
        if (self.progress > 0.02) setScrolled(true);
      },
    });

    const tick = () => {
      const diff = targetProgress.current - shownProgress.current;
      shownProgress.current =
        Math.abs(diff) < 0.0006
          ? targetProgress.current
          : shownProgress.current + diff * SMOOTHING;

      const idx = Math.min(
        FRAME_COUNT - 1,
        START_INDEX +
          Math.round(shownProgress.current * (FRAME_COUNT - 1 - START_INDEX)),
      );
      drawFrame(idx);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const onResize = () => drawFrame(currentFrameRef.current);
    window.addEventListener("resize", onResize);

    // Re-measure once the pin spacer and the tall closing image are laid out,
    // and nudge Lenis so its scroll limit matches the grown document height
    // (guards against Lenis caching a stale, too-short limit).
    const remeasure = () => {
      ScrollTrigger.refresh();
      lenisRef.current?.resize();
    };
    remeasure();
    const settleTimer = setTimeout(remeasure, 400);
    if (document.readyState !== "complete")
      window.addEventListener("load", remeasure);

    return () => {
      trigger.kill();
      cancelAnimationFrame(rafId);
      clearTimeout(settleTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", remeasure);
    };
  }, [ready]);

  return (
    <div className="relative w-full bg-black text-white">
      {/* Pinned scroll-scrub animation */}
      <div ref={stageRef} className="relative h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {!ready && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black">
            <span className="font-[sectra] text-[15px] italic tracking-wide text-white/70">
              Loading
            </span>
            <div className="h-px w-40 overflow-hidden bg-white/15">
              <div
                className="h-full bg-white/70 transition-[width] duration-150"
                style={{ width: `${loadedPct}%` }}
              />
            </div>
          </div>
        )}

        {ready && (
          <div
            className={`pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-xs uppercase tracking-[0.4em] text-white/60 transition-opacity duration-500 ${
              scrolled ? "opacity-0" : "opacity-100"
            }`}
          >
            Scroll
          </div>
        )}
      </div>

      {/* Closing scene: the full dream illustration stretched to the viewport
          width and left scrollable at its natural height. The chapters are
          spread evenly down the whole image so no screenful scrolls past
          without content. */}
      <section className="relative w-full">
        <img
          src="/newtest.png"
          alt=""
          className="block w-full select-none"
          draggable="false"
        />

        {/* Chapters distributed top-to-bottom as full-width rows: glossy
            numeral · title · right-aligned subtitle, with a fading divider
            under each. Spread so no screenful scrolls past without content. */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between py-[10vh]">
          {sections.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => openChapter(i)}
              aria-label={`Play ${s.title}`}
              className="group block w-full cursor-pointer px-5 text-left [text-shadow:0_2px_16px_rgba(0,0,0,0.5)] sm:px-10 lg:px-20"
            >
              <div className="flex items-center justify-between gap-4 sm:gap-8">
                <div className="flex min-w-0 items-baseline gap-5 sm:gap-10 lg:gap-16">
                  <span
                    className="shrink-0 font-[sectra] text-[38px] font-bold italic leading-none sm:text-[54px] lg:text-[68px]"
                    style={{
                      backgroundImage:
                        "linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.45) 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate font-[sectra] text-[24px] italic leading-tight text-white transition-opacity group-hover:opacity-80 sm:text-[36px] lg:text-[44px]">
                    {s.title}
                  </span>
                </div>
                <span className="hidden shrink-0 font-[helve] text-[14px] text-white/55 sm:block lg:text-[17px]">
                  {s.subtitle}
                </span>
              </div>
              <div className="mt-3 h-px w-full bg-gradient-to-r from-white/35 via-white/12 to-transparent sm:mt-5" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home3;
