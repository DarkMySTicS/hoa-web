import {
  Fragment,
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { fetchCaseStudies, mediaUrl, posterImageUrl } from "../lib/caseStudies";
import {
  readLastCaseStudyVisit,
  rememberCaseStudyCategory,
} from "../lib/caseStudyMemory";

// Local working copy of CaseStudies.jsx — always shows the full reel so
// changes can be developed here without touching the live /case-studies
// "Coming Soon" placeholder.
const COMING_SOON = false;

const CaseStudiesComingSoon = () => (
  <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundSize: "240px 240px",
      }}
    />
    <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/0 via-transparent to-black/50" />

    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center font-[helve]">
      <div className="text-[11px] tracking-[0.3em] text-white/55">
        CASE STUDIES
      </div>

      <h1 className="mt-6 font-[sectra] italic leading-[0.95] tracking-tight text-[14vw] sm:text-[9vw] md:text-[7rem]">
        Coming Soon
      </h1>

      <p className="mt-5 max-w-md text-[13px] leading-relaxed text-white/65">
        We're putting the finishing touches on this page. Check back soon to
        see the work.
      </p>

      <div className="mt-10">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-[12px] tracking-[0.25em] uppercase hover:bg-white/90 transition-colors"
        >
          <span>Back to home</span>
          <span className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  </div>
);

// Firestore rows arrive as { id, slug, title, client, shortLabel, year, role,
// category, poster, ... }. Map them to the shape this component speaks.
const adaptStudy = (row) => {
  const media = row.poster || row.cover || null;
  const isVideo = media?.kind === "video";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    label: row.shortLabel || row.client?.toUpperCase() || "",
    client: row.client || "",
    year: row.year || "",
    role: row.role || "",
    industry: row.industry || "",
    isVideo,
    image: mediaUrl(media, { w: 900 }) || "",
    /* A still-frame URL: lets the blurred background and color sampler keep
       working when the poster is a video. */
    still: posterImageUrl(media, { w: 900 }) || "",
  };
};

const POSTER_W = 430;
const POSTER_H = 600;
const POSTER_GAP = 80; // visual gap between adjacent posters
const STEP_DESKTOP = POSTER_H + POSTER_GAP; // distance between adjacent slot centers
const TITLE_STEP = 64;
// Per-second exponential decay rates (framerate independent).
// Higher = snappier. Scroll ~9 lands in ~330ms with a soft trailing glide.
const SCROLL_DECAY = 9;
const MOUSE_DECAY = 6;
const CURSOR_DECAY = 22;
const MAX_DT = 0.05; // clamp dt after tab-switch / long pauses
const SETTLE_PX = 0.08; // when to stop the rAF
const FALLBACK_COLOR = "120, 120, 120";
const MOBILE_BREAKPOINT = 768;

// Wrap value v into [-total/2, total/2). Used for infinite-loop positioning.
const wrapCentered = (v, total) => {
  const m = ((v % total) + total) % total;
  return m > total / 2 ? m - total : m;
};

// Sample a saturated, mid-luminance average from an image to use as accent.
const extractColor = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const W = 40;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = W;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, W, W);
        const { data } = ctx.getImageData(0, 0, W, W);
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const ri = data[i],
            gi = data[i + 1],
            bi = data[i + 2];
          const max = Math.max(ri, gi, bi);
          const min = Math.min(ri, gi, bi);
          if (max - min < 25) continue;
          if (max < 60 || max > 240) continue;
          r += ri;
          g += gi;
          b += bi;
          n++;
        }
        if (n < 5) {
          r = g = b = n = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n++;
          }
        }
        resolve(
          `${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)}`,
        );
      } catch {
        resolve(FALLBACK_COLOR);
      }
    };
    img.onerror = () => resolve(FALLBACK_COLOR);
    img.src = url;
  });

const CaseStudiesFull = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [colors, setColors] = useState({});
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined"
      ? window.innerWidth <= MOBILE_BREAKPOINT
      : false,
  );
  const [posterDims, setPosterDims] = useState({ w: POSTER_W, h: POSTER_H });
  const [hoveringPoster, setHoveringPoster] = useState(false);
  const [caseStudyCheck, setCaseStudyCheck] = useState(() => {
    const last = readLastCaseStudyVisit();
    return last?.category === "founders" ? "founders" : "hoa";
  });
  const [studiesByCategory, setStudiesByCategory] = useState({
    hoa: [],
    founders: [],
  });
  const [loadError, setLoadError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Pull both lists once. We keep them split client-side instead of refetching
  // on tab change so toggling HOA / Founders is instant.
  useEffect(() => {
    let cancelled = false;
    fetchCaseStudies()
      .then((rows) => {
        if (cancelled) return;
        const grouped = { hoa: [], founders: [] };
        rows.forEach((r) => {
          const bucket = r.category === "founders" ? "founders" : "hoa";
          grouped[bucket].push(adaptStudy(r));
        });
        setStudiesByCategory(grouped);
        // eslint-disable-next-line no-console
        console.info(
          `[case-studies] loaded ${rows.length} published — hoa: ${grouped.hoa.length}, founders: ${grouped.founders.length}`,
        );
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load case studies:", err);
        setLoadError(err.message || String(err));
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const studies = studiesByCategory[caseStudyCheck] || [];
  const N = studies.length;
  const studiesRef = useRef(studies);
  studiesRef.current = studies;

  const rootRef = useRef(null);
  const bgWrapRef = useRef(null);
  const spotlightRef = useRef(null);
  const posterRefs = useRef([]);
  const posterScalerRefs = useRef([]);
  const titleRefs = useRef([]);
  const taglineRef = useRef(null);
  const cursorRef = useRef(null);
  const cursorLabelRef = useRef(null);

  // Scroll state — pure pixels along the wrapped track.
  const scrollYRef = useRef(0);
  const targetYRef = useRef(0);

  // Cursor / spotlight tracking
  const mouseRef = useRef({ x: 50, y: 50 });
  const targetMouseRef = useRef({ x: 50, y: 50 });
  const cursorPosRef = useRef({ x: 0, y: 0 });
  const cursorTargetRef = useRef({ x: 0, y: 0 });

  const activeIndexRef = useRef(0);
  const isMobileRef = useRef(isMobile);
  // Tracks the latest poster dimensions for stable closures (wheel, key, touch
  // handlers are registered once and read this via ref).
  const posterDimsRef = useRef({ w: POSTER_W, h: POSTER_H });

  const scrollEndTimeoutRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Reel-intro state. introScaleRef multiplies every poster's bell-curve scale
  // so the whole stack reads small while the reel is spinning, then grows to
  // full size as it lands. introActiveRef gates user input so a wheel event
  // mid-spin doesn't fight the GSAP tween.
  const introScaleRef = useRef(1);
  const introActiveRef = useRef(false);
  const introTweenRef = useRef(null);

  // Dynamic step — step tracks the active poster height so tablet / small
  // laptop sizes don't try to scroll a desktop-sized distance per slot.
  const getStep = () => {
    if (isMobileRef.current) {
      return Math.min(window.innerWidth * 0.86, 420);
    }
    return posterDimsRef.current.h + POSTER_GAP;
  };

  // Detect mobile + responsive poster sizing. Tablet (≤1023) and small laptop
  // (1024–1279) need smaller posters so the left tagline and right title
  // list don't overlap the poster column.
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const m = w <= MOBILE_BREAKPOINT;
      isMobileRef.current = m;
      setIsMobile(m);
      const h = window.innerHeight;
      let next;
      if (m) {
        // Leave generous top/bottom margin on phones — height capped to ~34vh
        // so the client-name strip and switch row both have room to breathe.
        const pw = Math.min(w * 0.54, 240);
        const ph = Math.min(pw * 1.4, h * 0.34);
        next = { w: pw, h: ph };
      } else if (w < 1024) {
        // Tablet — clamp height to viewport so very short windows still get margin.
        const ph = Math.min(380, h * 0.6);
        next = { w: Math.round(ph / 1.4), h: ph };
      } else if (w < 1280) {
        const ph = Math.min(460, h * 0.66);
        next = { w: Math.round(ph / 1.4), h: ph };
      } else if (w < 1440) {
        const ph = Math.min(540, h * 0.72);
        next = { w: Math.round(ph / 1.4), h: ph };
      } else if (w < 1920) {
        // Laptop screens (13"–16" MacBooks etc. commonly report 1440–1728
        // logical px) — keep the poster noticeably smaller than it renders
        // on a true desktop monitor.
        const ph = Math.min(480, h * 0.62);
        next = { w: Math.round(ph / 1.4), h: ph };
      } else {
        const ph = Math.min(POSTER_H, h * 0.78);
        next = { w: Math.round((ph / POSTER_H) * POSTER_W), h: ph };
      }
      posterDimsRef.current = next;
      setPosterDims(next);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Pull dominant colors from each poster image (both lists, once they load).
  // Re-runs when CMS data arrives — keys by id so it's idempotent if a list grows.
  useEffect(() => {
    let cancelled = false;
    const all = [
      ...(studiesByCategory.hoa || []),
      ...(studiesByCategory.founders || []),
    ].filter((s) => s.still);
    if (all.length === 0) return;
    Promise.all(
      all.map((s) => extractColor(s.still).then((c) => [s.id, c])),
    ).then((entries) => {
      if (cancelled) return;
      setColors((prev) => {
        const map = { ...prev };
        entries.forEach(([id, c]) => {
          map[id] = c;
        });
        return map;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [studiesByCategory]);

  // When the user switches between HOA / Founders lists, reset scroll & active.
  // Seed scrollY many loops below 0 so the reel intro animates the posters
  // up from the bottom into their landing position at scrollY = 0. The loop
  // count matches REEL_LOOPS in the useGSAP below.
  useLayoutEffect(() => {
    const step = getStep();
    const reelDistance = N > 0 ? N * step * 12 : 0;
    scrollYRef.current = -reelDistance;
    targetYRef.current = 0;
    introScaleRef.current = N > 0 ? 0.28 : 1;
    introActiveRef.current = N > 0;
    activeIndexRef.current = 0;
    setActiveIndex(0);
    posterRefs.current.length = N;
    posterScalerRefs.current.length = N;
    titleRefs.current.length = N;
  }, [caseStudyCheck, N]);

  const apply = () => {
    const step = getStep();
    const len = studiesRef.current.length;
    const total = len * step;
    const titleTotal = len * TITLE_STEP;
    const scrollY = scrollYRef.current;
    const mobile = isMobileRef.current;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    const introScale = introScaleRef.current;

    for (let i = 0; i < len; i++) {
      const root = posterRefs.current[i];
      const scaler = posterScalerRefs.current[i];
      if (!root || !scaler) continue;

      const y = wrapCentered(i * step - scrollY, total);
      const distNorm = Math.abs(y) / step;
      const proximity = Math.exp(-distNorm * distNorm * 1.2);
      const scale = (0.78 + 0.22 * proximity) * introScale;
      const opacity = Math.max(0, Math.min(1, 1.4 - distNorm * 0.4));

      if (mobile) {
        root.style.transform = `translate3d(${y.toFixed(2)}px, 0, 0)`;
      } else {
        root.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      }
      root.style.zIndex = String(100 - Math.round(distNorm * 5));
      scaler.style.transform = `scale(${scale.toFixed(4)}) translateZ(0)`;
      scaler.style.opacity = opacity.toFixed(3);
    }

    // Right-side title list — same wrap, smaller pitch.
    const titleScroll = scrollY * (TITLE_STEP / step);
    for (let i = 0; i < len; i++) {
      const el = titleRefs.current[i];
      if (!el) continue;

      const y = wrapCentered(i * TITLE_STEP - titleScroll, titleTotal);
      const distNorm = Math.abs(y) / TITLE_STEP;
      const tx = Math.min(14, distNorm * 5);
      const alpha = Math.max(0.18, 1 - distNorm * 0.42);

      el.style.color = `rgba(255,255,255,${alpha.toFixed(3)})`;
      el.style.transform = `translate3d(${tx.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateY(-50%)`;
      el.style.opacity = distNorm > 5 ? "0" : "1";
    }

    if (spotlightRef.current) {
      spotlightRef.current.style.setProperty("--mx", `${mx.toFixed(2)}%`);
      spotlightRef.current.style.setProperty("--my", `${my.toFixed(2)}%`);
    }

    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate3d(${cursorPosRef.current.x.toFixed(1)}px, ${cursorPosRef.current.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }

    // Commit active index only when we're near a slot — prevents background
    // crossfade and metadata letter-reveals from chattering mid-scroll, and
    // skips during the reel intro (slot count goes by far too fast).
    if (!introActiveRef.current) {
      const slot = scrollY / step;
      const nearestSlot = Math.round(slot);
      if (Math.abs(slot - nearestSlot) < 0.35) {
        const activeIdx = ((nearestSlot % len) + len) % len;
        if (activeIdx !== activeIndexRef.current) {
          activeIndexRef.current = activeIdx;
          setActiveIndex(activeIdx);
        }
      }
    }
  };

  const tick = (now) => {
    // dt-based exponential decay — same feel at 60Hz, 120Hz or 144Hz.
    const last = lastTimeRef.current || now;
    const dt = Math.min(MAX_DT, (now - last) / 1000);
    lastTimeRef.current = now;

    const sAlpha = 1 - Math.exp(-SCROLL_DECAY * dt);
    const mAlpha = 1 - Math.exp(-MOUSE_DECAY * dt);
    const cAlpha = 1 - Math.exp(-CURSOR_DECAY * dt);

    const offsetDiff = targetYRef.current - scrollYRef.current;
    scrollYRef.current += offsetDiff * sAlpha;

    const mxDiff = targetMouseRef.current.x - mouseRef.current.x;
    const myDiff = targetMouseRef.current.y - mouseRef.current.y;
    const cxDiff = cursorTargetRef.current.x - cursorPosRef.current.x;
    const cyDiff = cursorTargetRef.current.y - cursorPosRef.current.y;

    mouseRef.current.x += mxDiff * mAlpha;
    mouseRef.current.y += myDiff * mAlpha;
    cursorPosRef.current.x += cxDiff * cAlpha;
    cursorPosRef.current.y += cyDiff * cAlpha;

    apply();

    const settled =
      Math.abs(offsetDiff) < SETTLE_PX &&
      Math.abs(mxDiff) < 0.05 &&
      Math.abs(myDiff) < 0.05 &&
      Math.abs(cxDiff) < 0.1 &&
      Math.abs(cyDiff) < 0.1;

    if (settled) {
      scrollYRef.current = targetYRef.current;
      mouseRef.current.x = targetMouseRef.current.x;
      mouseRef.current.y = targetMouseRef.current.y;
      cursorPosRef.current.x = cursorTargetRef.current.x;
      cursorPosRef.current.y = cursorTargetRef.current.y;
      apply();
      rafRef.current = null;
      lastTimeRef.current = 0;
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  const ensureAnimating = () => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  useLayoutEffect(() => {
    apply();
  }, [isMobile, posterDims]);

  useEffect(() => {
    const snapToNearest = () => {
      const step = getStep();
      targetYRef.current = Math.round(targetYRef.current / step) * step;
      ensureAnimating();
    };

    const handleWheel = (e) => {
      e.preventDefault();
      if (introActiveRef.current) return;
      const step = getStep();
      const raw = isMobileRef.current ? e.deltaX || e.deltaY : e.deltaY;
      // Pixel mode is per-px (mouse + trackpad); line/page mode multiplies up.
      const sens = e.deltaMode === 0 ? step * 0.0042 : step * 0.18;
      targetYRef.current += raw * sens;
      ensureAnimating();

      if (scrollEndTimeoutRef.current)
        clearTimeout(scrollEndTimeoutRef.current);
      scrollEndTimeoutRef.current = setTimeout(snapToNearest, 220);
    };

    const handleKey = (e) => {
      if (introActiveRef.current) return;
      const step = getStep();
      const base = Math.round(targetYRef.current / step) * step;
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowRight" ||
        e.key === "PageDown"
      ) {
        targetYRef.current = base + step;
        ensureAnimating();
      } else if (
        e.key === "ArrowUp" ||
        e.key === "ArrowLeft" ||
        e.key === "PageUp"
      ) {
        targetYRef.current = base - step;
        ensureAnimating();
      }
    };

    const handleMouse = (e) => {
      targetMouseRef.current.x = (e.clientX / window.innerWidth) * 100;
      targetMouseRef.current.y = (e.clientY / window.innerHeight) * 100;
      cursorTargetRef.current.x = e.clientX;
      cursorTargetRef.current.y = e.clientY;
      ensureAnimating();
    };

    const handleLeave = () => {
      targetMouseRef.current.x = 50;
      targetMouseRef.current.y = 50;
      ensureAnimating();
    };

    let touchActive = false;
    let lastTX = 0,
      lastTY = 0;
    let touchStartTX = 0,
      touchStartTY = 0;
    let lockedAxis = null;

    const handleTouchStart = (e) => {
      if (introActiveRef.current) return;
      if (e.touches.length !== 1) return;
      touchActive = true;
      lockedAxis = null;
      const t = e.touches[0];
      lastTX = touchStartTX = t.clientX;
      lastTY = touchStartTY = t.clientY;
      if (scrollEndTimeoutRef.current)
        clearTimeout(scrollEndTimeoutRef.current);
      ensureAnimating();
    };

    const handleTouchMove = (e) => {
      if (!touchActive) return;
      const t = e.touches[0];
      const dx = t.clientX - lastTX;
      const dy = t.clientY - lastTY;
      lastTX = t.clientX;
      lastTY = t.clientY;
      const mobile = isMobileRef.current;
      const wantedAxis = mobile ? "x" : "y";
      if (lockedAxis == null) {
        const totalDx = Math.abs(t.clientX - touchStartTX);
        const totalDy = Math.abs(t.clientY - touchStartTY);
        if (totalDx > 8 || totalDy > 8) {
          lockedAxis = totalDx > totalDy ? "x" : "y";
        } else {
          return;
        }
      }
      if (lockedAxis !== wantedAxis) return;
      e.preventDefault();
      // 1px of finger travel = 1px of scroll. Direction matches natural touch scroll.
      targetYRef.current += mobile ? -dx : -dy;
      // On mobile, drive the visible scroll directly off the finger so the
      // poster tracks 1:1 with the swipe — no easing lag, no spring-back.
      if (mobile) scrollYRef.current = targetYRef.current;
      ensureAnimating();
    };

    const handleTouchEnd = () => {
      if (!touchActive) return;
      touchActive = false;
      lockedAxis = null;
      // Desktop retains its snap-to-nearest after a flick on the trackpad;
      // mobile stays wherever the finger leaves it for a native-feeling stop.
      if (!isMobileRef.current) snapToNearest();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("mouseleave", handleLeave);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      if (scrollEndTimeoutRef.current)
        clearTimeout(scrollEndTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Cursor grow + label fade on poster hover
  useEffect(() => {
    if (!cursorRef.current || !cursorLabelRef.current) return;
    gsap.to(cursorRef.current, {
      width: hoveringPoster ? 92 : 14,
      height: hoveringPoster ? 92 : 14,
      backgroundColor: hoveringPoster
        ? "rgba(255,255,255,0.1)"
        : "rgba(255,255,255,0)",
      borderColor: hoveringPoster
        ? "rgba(255,255,255,0.65)"
        : "rgba(255,255,255,0.85)",
      duration: 0.45,
      ease: "power3.out",
    });
    gsap.to(cursorLabelRef.current, {
      opacity: hoveringPoster ? 1 : 0,
      duration: 0.3,
      ease: "power2.out",
    });
  }, [hoveringPoster]);

  // Intro reveal — also drives the reel-spin: posters loop bottom-to-top very
  // fast, then decelerate (expo.out) into a smaller→larger grow as they land.
  useGSAP(
    () => {
      if (introTweenRef.current) {
        introTweenRef.current.kill();
        introTweenRef.current = null;
      }
      if (N === 0) return;

      // REEL_LOOPS: 12 full loops over 4s → very high peak velocity at t≈0,
      // expo.out gives the smoothest possible deceleration tail so the
      // posters glide into place without a perceptible "stop".
      const REEL_LOOPS = 12;
      const REEL_DURATION = 4;
      const step = getStep();
      const reelDistance = N * step * REEL_LOOPS;
      scrollYRef.current = -reelDistance;
      introScaleRef.current = 0.28;
      introActiveRef.current = true;
      apply();

      const reelState = { s: -reelDistance, k: 0.28 };

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      introTweenRef.current = tl;

      tl.fromTo(".cs-bg", { opacity: 0 }, { opacity: 1, duration: 1.2 }, 0)
        .to(
          reelState,
          {
            s: 0,
            k: 1,
            duration: REEL_DURATION,
            ease: "expo.out",
            onUpdate: () => {
              scrollYRef.current = reelState.s;
              introScaleRef.current = reelState.k;
              apply();
            },
            onComplete: () => {
              scrollYRef.current = 0;
              targetYRef.current = 0;
              introScaleRef.current = 1;
              introActiveRef.current = false;
              activeIndexRef.current = 0;
              setActiveIndex(0);
              apply();
            },
          },
          0,
        )
        .fromTo(
          ".cs-tagline-line",
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1.0, stagger: 0.06 },
          0.4,
        )
        .fromTo(
          ".cs-meta",
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          REEL_DURATION - 1.05,
        )
        .fromTo(
          ".cs-side",
          { opacity: 0 },
          { opacity: 1, duration: 0.7, stagger: 0.05 },
          REEL_DURATION - 0.95,
        )
        .fromTo(
          ".cs-corner",
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.05 },
          REEL_DURATION - 0.85,
        );
    },
    // Re-fires when the dataset arrives and on HOA/Founders tab switch so
    // each list gets its own reel-in.
    { scope: rootRef, dependencies: [N > 0, caseStudyCheck] },
  );

  // Pick the shortest path around the loop to reach `idx`.
  const goTo = (idx) => {
    if (introActiveRef.current) return;
    const step = getStep();
    const len = studiesRef.current.length;
    const currentSlotMod =
      ((Math.round(scrollYRef.current / step) % len) + len) % len;
    let delta = idx - currentSlotMod;
    if (delta > len / 2) delta -= len;
    if (delta < -len / 2) delta += len;
    targetYRef.current =
      Math.round(scrollYRef.current / step) * step + delta * step;
    ensureAnimating();
  };

  const safeIndex = Math.min(activeIndex, N - 1);
  const activeColor = colors[studies[safeIndex]?.id] || FALLBACK_COLOR;
  const activeStudy = studies[safeIndex];

  // Section title, derived from the active category.
  const isHoa = caseStudyCheck === "hoa";
  const sectionTitle = isHoa ? "HOA CASE STUDIES" : "FOUNDER'S PROJECTS";
  const toggleCategory = () => setCaseStudyCheck(isHoa ? "founders" : "hoa");

  // Persist the active reel category so a return visit to /case-studies restores
  // it, even if the user never drilled into an individual case study.
  useEffect(() => {
    rememberCaseStudyCategory(caseStudyCheck);
  }, [caseStudyCheck]);
  /* Metadata strip reads NAME · INDUSTRY · ROLE, straight from the CRM record.
     Industry and role are optional there, so build the list from whatever is
     filled in and let the separators follow — no category label stand-in. */
  const activeIndustry = activeStudy?.industry || "";
  const activeRole = activeStudy?.role || "";
  const metaSegments = [activeStudy?.client, activeIndustry, activeRole]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .map((x) => x.toUpperCase());

  // Empty / pre-fetch state. Avoids crashes from `activeStudy?.title.split(...)`
  // chains when the CMS hasn't returned anything yet (or this category is empty).
  if (N === 0) {
    const totalPublished =
      (studiesByCategory.hoa?.length || 0) +
      (studiesByCategory.founders?.length || 0);
    const otherBucket = caseStudyCheck === "hoa" ? "founders" : "hoa";
    const otherCount = studiesByCategory[otherBucket]?.length || 0;

    let headline = "Loading…";
    let helper = null;
    if (loadError) {
      headline = "Couldn’t load case studies.";
      helper = loadError;
    } else if (loaded && totalPublished === 0) {
      headline = "No case studies published yet.";
      helper = "";
    } else if (loaded && otherCount > 0) {
      headline = `Nothing in ${caseStudyCheck === "hoa" ? "HOA" : "Founders"} yet.`;
      helper = `There are ${otherCount} published in the other category — switch the tab to view them.`;
    }

    return (
      <div className="relative w-full h-screen overflow-hidden bg-black text-white grid place-items-center">
        <div className="text-center px-6">
          <div className="text-[10px] tracking-[0.3em] text-white/55 mb-4">
            CASE STUDIES
          </div>
          <p className="font-[sectra] italic text-3xl md:text-5xl">
            {headline}
          </p>
          {helper ? (
            <p className="mt-4 text-xs text-white/50 max-w-md mx-auto">
              {helper}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative w-full h-screen overflow-hidden bg-black text-white select-none cs-cursor-host"
      style={{ cursor: "none" }}
    >
      {/* Blurred-photo ambient background */}
      <div
        ref={bgWrapRef}
        className="cs-bg absolute inset-0 pointer-events-none will-change-transform"
        style={{ transform: "scale(1.2)" }}
      >
        {studies.map((study, idx) => (
          <div
            key={study.id}
            className="absolute inset-0 transition-opacity duration-[1100ms] ease-out"
            style={{
              opacity: idx === activeIndex ? 1 : 0,
              backgroundImage: `url(${study.still || study.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(110px) saturate(1.25) brightness(0.55)",
            }}
          />
        ))}
      </div>

      {/* Soft color tint */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-soft-light"
        style={{
          backgroundColor: `rgba(${activeColor}, 0.4)`,
          transition: "background-color 900ms ease-out",
        }}
      />

      {/* Cursor-following spotlight */}
      <div
        ref={spotlightRef}
        className="absolute inset-0 pointer-events-none mix-blend-screen"
        style={{
          "--mx": "50%",
          "--my": "50%",
          background: `radial-gradient(ellipse 55% 70% at var(--mx) var(--my), rgba(${activeColor}, 0.5) 0%, transparent 65%)`,
          transition: "background 900ms ease-out",
        }}
      />

      {/* Vignette + readability */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/65" />
      <div className="absolute inset-0 pointer-events-none bg-black/15" />

      {/* Grain */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay cs-grain" />

      {/* Top-right filter (under global Navbar) */}
      <div className="cs-corner hidden md:flex absolute top-6 right-8 z-30 items-center gap-3 text-[11px] tracking-[0.25em] text-white/70">
        <span className="opacity-60">FILTER</span>
        <button
          type="button"
          className="text-white/95 hover:text-white transition-colors"
        >
          ALL WORK <span className="ml-1 text-[9px]">▾</span>
        </button>
      </div>

      {/* Mobile header — active study's client name above the poster, with a
          small Industry · Role meta line. Replaces the old eyebrow + tab pair;
          the section title and category switcher now live below the poster. */}
      <div
        className="cs-corner md:hidden absolute left-0 right-0 z-30 px-6 text-center pointer-events-none"
        style={{ top: `calc(50% - ${posterDims.h / 2}px - 96px)` }}
      >
        <p
          key={`m-client-${activeStudy?.id}`}
          className="font-[helve] text-3xl leading-tight tracking-tight"
        >
          <span className="cs-letter-reveal-wrap">
            {(activeStudy?.client || "").split("").map((c, i) => (
              <span
                key={i}
                className="cs-letter-reveal"
                style={{ animationDelay: `${i * 22}ms` }}
              >
                {c === " " ? "\u00A0" : c}
              </span>
            ))}
          </span>
        </p>
        <p className="mt-2 text-[10px] tracking-[0.3em] text-white/65">
          {[activeIndustry, activeRole]
            .filter(Boolean)
            .map((x) => x.toUpperCase())
            .join(" · ")}
        </p>
      </div>

      {/* LEFT: category switcher — a single clickable label showing the
          active category; click toggles to the other one. */}
      <div className="hidden md:block absolute left-4 md:left-6 lg:left-12 top-1/2 -translate-y-1/2 z-30 max-w-[16rem] lg:max-w-md">
        <button
          type="button"
          onClick={toggleCategory}
          className="cs-tagline-eyebrow text-left group"
        >
          <h1
            ref={taglineRef}
            key={`d-title-${caseStudyCheck}`}
            className="font-[helve] text-xl lg:text-2xl tracking-[0.3em] text-white/75 group-hover:text-white transition-colors"
          >
            <span className="block overflow-hidden">
              <span className="cs-tagline-line block">{sectionTitle}</span>
            </span>
          </h1>
        </button>
      </div>

      {/* LEFT-BOTTOM: studio note */}
      <div className="cs-corner hidden md:block absolute left-8 lg:left-12 bottom-10 z-30 max-w-[18rem] text-[11px] leading-relaxed text-white/70">
        Built by people who understand that great brands aren’t built in parts —
        but through everything moving together.
      </div>

      {/* CENTER: poster column */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div
          className="relative"
          style={{ width: posterDims.w, height: posterDims.h }}
        >
          {studies.map((study, index) => {
            const posterInner = (
              <>
                {study.isVideo ? (
                  <video
                    src={study.image}
                    poster={study.still || undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable="false"
                  />
                ) : (
                  <img
                    src={study.image}
                    alt={study.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable="false"
                    loading="eager"
                    crossOrigin="anonymous"
                  />
                )}
              </>
            );

            const wrapClass =
              "relative block w-full h-full rounded-lg overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.7)] pointer-events-auto";

            return (
              <div
                key={study.id}
                ref={(el) => (posterRefs.current[index] = el)}
                className="absolute inset-0 will-change-transform"
              >
                <div
                  ref={(el) => (posterScalerRefs.current[index] = el)}
                  className="cs-poster-scaler absolute inset-0 will-change-transform origin-center"
                >
                  {/* Active poster navigates to /case-study/:slug; inactive
                      posters rotate the carousel to themselves on click. */}
                  {index === activeIndex && study.slug ? (
                    <Link
                      to={`/case-study/${study.slug}`}
                      onMouseEnter={() => setHoveringPoster(true)}
                      onMouseLeave={() => setHoveringPoster(false)}
                      className={wrapClass}
                      aria-label={`View ${study.title}`}
                    >
                      {posterInner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => goTo(index)}
                      onMouseEnter={() =>
                        index === activeIndexRef.current &&
                        setHoveringPoster(true)
                      }
                      onMouseLeave={() => setHoveringPoster(false)}
                      className={wrapClass}
                      aria-label={`View ${study.title}`}
                    >
                      {posterInner}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DESKTOP: animated metadata strip — sits flush below the active poster
          so it reads as a caption attached to the banner, not a floating line. */}
      <div
        key={`d-${activeStudy?.id}`}
        className="cs-meta hidden md:flex absolute left-1/2 -translate-x-1/2 z-30 items-center gap-6 lg:gap-8 text-[11px] tracking-[0.3em] text-white/75 pointer-events-none"
        style={{ top: `calc(50% + ${posterDims.h / 2}px + 16px)` }}
      >
        {metaSegments.map((segment, si) => (
          <Fragment key={`${segment}-${si}`}>
            {si > 0 ? <span className="w-6 h-px bg-white/30" /> : null}
            <div className="cs-letter-reveal-wrap inline-flex">
              {segment.split("").map((c, i) => (
                <span
                  key={`${si}-${i}`}
                  className="cs-letter-reveal"
                  style={{ animationDelay: `${i * 14}ms` }}
                >
                  {/* Each letter is its own inline-flex child, so a plain space
                      collapses to nothing — NBSP keeps the word gaps. */}
                  {c === " " ? "\u00A0" : c}
                </span>
              ))}
            </div>
          </Fragment>
        ))}
      </div>

      {/* Mobile arrows + dots removed — swipe + the reel-in animation are
          the only navigation cues now (per design direction). */}

      {/* RIGHT: title list (desktop) — vertical stack of every title in the
          reel; the active one is bold/white, the rest sit muted until
          clicked. */}
      <div className="cs-side hidden md:block absolute right-10 md:right-8 lg:right-16 top-1/2 -translate-y-1/2 z-30 pointer-events-none max-w-[14rem] lg:max-w-[18rem] xl:max-w-[22rem]">
        <div className="flex flex-col items-end gap-2 lg:gap-2.5 text-right">
          {studies.map((study, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={study.id}
                type="button"
                onClick={() => goTo(index)}
                className={`pointer-events-auto font-[helve] tracking-tight transition-colors duration-300 text-2xl lg:text-3xl xl:text-4xl ${
                  isActive
                    ? "font-bold text-white"
                    : "font-medium text-white/35 hover:text-white/60"
                }`}
              >
                {study.client}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scroll hint — sits just under the metadata strip, below the active poster */}

      {/* CUSTOM CURSOR */}
      <div
        ref={cursorRef}
        className="hidden md:flex pointer-events-none fixed top-0 left-0 z-[60] items-center justify-center rounded-full border border-white/85 mix-blend-difference will-change-transform"
        style={{ width: 14, height: 14 }}
      >
        <span
          ref={cursorLabelRef}
          className="text-[10px] tracking-[0.3em] font-medium opacity-0"
        >
          VIEW
        </span>
      </div>

      <style>{`
        @keyframes csLetterReveal {
          from { transform: translateY(110%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .cs-letter-reveal-wrap { display: inline-flex; overflow: hidden; line-height: 1.05; padding-bottom: 0.05em; }
        .cs-letter-reveal {
          display: inline-block;
          transform: translateY(110%);
          opacity: 0;
          animation: csLetterReveal 700ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
        }
        .cs-grain {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          background-size: 240px 240px;
        }
      `}</style>
    </div>
  );
};

const CaseStudiesLocal = () =>
  COMING_SOON ? <CaseStudiesComingSoon /> : <CaseStudiesFull />;

export default CaseStudiesLocal;
