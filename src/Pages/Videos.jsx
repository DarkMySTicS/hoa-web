import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Only the video source URL is fetched from Vercel Blob at runtime. If the
// /api/videos call fails or hasn't been populated yet, we fall back to the
// local /public/videos/* paths so dev still works without an upload step.
import { CHAPTERS } from "../lib/chapters";

const N = CHAPTERS.length;

const FALLBACK_VIDEOS = CHAPTERS.map((c, i) => ({
  ...c,
  src: `/videos/HOA web C${i + 1}.mp4`,
}));

// Combine fetched URLs (sorted by chapter number) with local chapter metadata.
const mergeBlobs = (blobs) => {
  if (!Array.isArray(blobs) || blobs.length === 0) return null;
  const merged = CHAPTERS.map((c, i) => {
    const blob = blobs[i];
    return {
      ...c,
      src: blob?.url || FALLBACK_VIDEOS[i].src,
    };
  });
  return merged;
};
const wrap = (i) => ((i % N) + N) % N;
const fmt = (s) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const Icon = {
  Play: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  Pause: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  ),
  Prev: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M6 6h2v12H6zM20 6 9 12l11 6z" />
    </svg>
  ),
  Next: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M16 6h2v12h-2zM4 6l11 6-11 6z" />
    </svg>
  ),
  VolHigh: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z" />
    </svg>
  ),
  VolLow: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M5 10v4h4l5 4V6L9 10H5zm11.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
    </svg>
  ),
  Mute: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M3 10v4h4l5 4V6L7 10H3zm13 2 3-3-1.4-1.4L14 10.6l-3.6-3.6L9 8.4l3.6 3.6L9 15.6 10.4 17 14 13.4 17.6 17 19 15.6z" />
    </svg>
  ),
  Full: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M5 5h6v2H7v4H5V5zm14 0v6h-2V7h-4V5h6zM5 19v-6h2v4h4v2H5zm14 0h-6v-2h4v-4h2v6z" />
    </svg>
  ),
  FullExit: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M9 5H7v4H3v2h6V5zm6 0v4h6V7h-4V5h-2zM3 13v2h4v4h2v-6H3zm12 0v6h2v-4h4v-2h-6z" />
    </svg>
  ),
};

const STORAGE_KEY = "hoa:videoState";
const SAVE_THROTTLE_MS = 1500;

const readSaved = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (
      typeof data?.chapter === "number" &&
      Number.isFinite(data.chapter) &&
      data.chapter >= 0 &&
      data.chapter < N &&
      typeof data.time === "number" &&
      Number.isFinite(data.time) &&
      data.time >= 0
    ) {
      return data;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const Videos = () => {
  const { chapter } = useParams();
  const navigate = useNavigate();
  // Resolve the starting chapter: explicit URL chapter wins. If no URL chapter,
  // resume from the last saved chapter; otherwise start at the first.
  const initial = useMemo(() => {
    const n = parseInt(chapter, 10);
    const saved = readSaved();
    if (Number.isFinite(n)) {
      const idx = wrap(n - 1);
      // Same chapter as last time → resume from saved second.
      const time = saved && saved.chapter === idx ? saved.time : 0;
      return { idx, time };
    }
    if (saved) return { idx: saved.chapter, time: saved.time };
    return { idx: 0, time: 0 };
  }, [chapter]);

  const startIdx = initial.idx;

  // Two-slot preload state: front is what plays, back preloads `next`.
  // Slot A's src = videos[a], Slot B's src = videos[b]. Whichever equals
  // `current` is in front. Updating only the back slot's index avoids
  // resetting the preloaded buffer of the slot that's about to play.
  const [front, setFront] = useState("a");
  const [aIdx, setAIdx] = useState(startIdx);
  const [bIdx, setBIdx] = useState(wrap(startIdx + 1));

  const aRef = useRef(null);
  const bRef = useRef(null);
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const idleRef = useRef(null);
  // Pending seek to apply once metadata is available on the front element.
  const resumeRef = useRef(initial.time);
  const lastSaveRef = useRef(0);

  // Audio gate — block playback until the user clicks "Play with audio" so the
  // first sound is intentional. The choice persists for the session.
  const [gated, setGated] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("audioEnabled") !== "1";
  });

  const [playing, setPlaying] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem("audioEnabled") === "1";
  });
  // Tracks the real <video>.paused state from element events. The play button
  // overlay is driven off this rather than `playing` to avoid sticky icons when
  // autoplay-after-swap or a brief stall lies about the actual play state.
  const [videoPaused, setVideoPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 1;
    const saved = readSaved();
    return saved && typeof saved.volume === "number"
      ? Math.max(0, Math.min(1, saved.volume))
      : 1;
  });
  const [time, setTime] = useState(initial.time);
  const [duration, setDuration] = useState(0);
  const [isFull, setIsFull] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);
  const [hoverPct, setHoverPct] = useState(null);
  const [buffered, setBuffered] = useState(0); // 0..1 of front video
  const [volSliderOpen, setVolSliderOpen] = useState(false);
  // 1s black gap between chapters; freezes interaction while true.
  const [transitioning, setTransitioning] = useState(false);
  const transTimerRef = useRef(null);
  // Shown once the final chapter finishes — replaces the auto-advance loop.
  const [showEndCTA, setShowEndCTA] = useState(false);

  // Source list — defaults to local fallbacks, swapped in once /api/videos
  // resolves. Putting this in state means the <video> elements re-render with
  // the Blob URLs and the browser only fetches the network-backed file once.
  const [videos, setVideos] = useState(FALLBACK_VIDEOS);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), 5000);
    fetch("/api/videos", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const merged = mergeBlobs(data?.videos);
        if (merged) setVideos(merged);
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => window.clearTimeout(t));
    return () => {
      cancelled = true;
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, []);

  const currentIdx = front === "a" ? aIdx : bIdx;
  const current = videos[currentIdx];

  const frontEl = () => (front === "a" ? aRef.current : bRef.current);
  const backEl = () => (front === "a" ? bRef.current : aRef.current);

  // Keep URL in sync (replace, no history spam) without re-triggering startIdx.
  useEffect(() => {
    const want = `/videos/${currentIdx + 1}`;
    if (window.location.pathname !== want) {
      navigate(want, { replace: true });
    }
  }, [currentIdx, navigate]);

  // Try to play; if the browser blocks audible autoplay, fall back to muted —
  // but only when the user hasn't explicitly opted into audio yet. After
  // openGate, any play() rejection is a transient race (e.g. another play()
  // call interrupting this one), not an audio-permission denial, so retry
  // without touching mute state.
  const tryPlay = (el) => {
    if (!el) return;
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        const userOptedIn =
          typeof window !== "undefined" &&
          window.sessionStorage?.getItem("audioEnabled") === "1";
        if (userOptedIn) {
          el.play().catch(() => {});
          return;
        }
        el.muted = true;
        setMuted(true);
        el.play().catch(() => setPlaying(false));
      });
    }
  };

  // Hard sync of front/back: front plays from 0 (after a swap) or stays running;
  // back is paused at 0 to preload cleanly.
  useEffect(() => {
    const f = frontEl();
    const b = backEl();
    if (b) {
      b.pause();
      b.muted = true;
      try {
        b.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    if (f) {
      f.muted = muted;
      f.volume = volume;
      if (playing) tryPlay(f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front, currentIdx]);

  // Play / pause toggling on the front element only.
  useEffect(() => {
    const f = frontEl();
    if (!f) return;
    if (playing) tryPlay(f);
    else f.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    const f = frontEl();
    if (f) f.muted = muted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  useEffect(() => {
    const f = frontEl();
    if (f) f.volume = volume;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  // Update volume; raising above 0 also unmutes.
  const applyVolume = useCallback((next) => {
    const v = Math.max(0, Math.min(1, +next.toFixed(2)));
    setVolume(v);
    if (v > 0) setMuted(false);
  }, []);

  // Wraps any chapter-changing action with a 1-second black gap so the cut
  // between videos has a deliberate pause rather than a hard splice.
  const startTransition = useCallback(
    (action) => {
      if (transTimerRef.current) return; // ignore while already transitioning
      setTransitioning(true);
      const f = front === "a" ? aRef.current : bRef.current;
      if (f) f.pause();
      transTimerRef.current = window.setTimeout(() => {
        action();
        setTransitioning(false);
        transTimerRef.current = null;
      }, 1000);
    },
    [front],
  );

  useEffect(() => {
    return () => {
      if (transTimerRef.current) window.clearTimeout(transTimerRef.current);
    };
  }, []);

  const advanceRaw = useCallback(() => {
    setBuffered(0);
    if (front === "a") {
      setBIdx((bi) => bi);
      setAIdx(wrap((bIdx + 1) % N));
      setFront("b");
    } else {
      setBIdx(wrap((aIdx + 1) % N));
      setFront("a");
    }
  }, [front, aIdx, bIdx]);

  const goPrevRaw = useCallback(() => {
    const prevIdx = wrap(currentIdx - 1);
    setBuffered(0);
    if (front === "a") {
      setBIdx(prevIdx);
      setAIdx(currentIdx);
      setFront("b");
    } else {
      setAIdx(prevIdx);
      setBIdx(currentIdx);
      setFront("a");
    }
  }, [currentIdx, front]);

  const jumpToRaw = useCallback(
    (idx) => {
      const target = wrap(idx);
      if (target === currentIdx) {
        const f = frontEl();
        if (f) f.currentTime = 0;
        return;
      }
      const nextPreload = wrap(target + 1);
      setBuffered(0);
      if (front === "a") {
        setBIdx(target);
        setAIdx(nextPreload);
        setFront("b");
      } else {
        setAIdx(target);
        setBIdx(nextPreload);
        setFront("a");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIdx, front],
  );

  const advance = useCallback(
    () => startTransition(advanceRaw),
    [startTransition, advanceRaw],
  );
  const goPrev = useCallback(
    () => startTransition(goPrevRaw),
    [startTransition, goPrevRaw],
  );
  const goNext = advance;
  const jumpTo = useCallback(
    (idx) =>
      idx === currentIdx
        ? jumpToRaw(idx)
        : startTransition(() => jumpToRaw(idx)),
    [startTransition, jumpToRaw, currentIdx],
  );

  // Persist progress to localStorage. Throttled while playing; flushed on
  // chapter change and unmount.
  const persist = useCallback(
    (chapter, t, force = false) => {
      const now = Date.now();
      if (!force && now - lastSaveRef.current < SAVE_THROTTLE_MS) return;
      lastSaveRef.current = now;
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ chapter, time: Math.max(0, t || 0), volume }),
        );
      } catch {
        /* localStorage unavailable */
      }
    },
    [volume],
  );

  // Frame-tick time updates from the front video.
  useEffect(() => {
    const f = frontEl();
    if (!f) return;

    const applyResume = () => {
      if (resumeRef.current != null && resumeRef.current > 0) {
        const target = resumeRef.current;
        // Don't resume right at the end — start over instead.
        if (Number.isFinite(f.duration) && target < f.duration - 1) {
          try {
            f.currentTime = target;
            setTime(target);
          } catch {
            /* ignore */
          }
        }
        resumeRef.current = null;
      }
    };

    // Final chapter has a soft cap — the source clip has dead air after 1:22,
    // so treat that point as the natural end.
    const LAST_CHAPTER_END = 82; // 1:22 in seconds

    const triggerEnd = () => {
      if (currentIdx === N - 1) {
        try {
          f.pause();
        } catch {
          /* ignore */
        }
        setPlaying(false);
        setShowEndCTA(true);
        return true;
      }
      return false;
    };

    const onTime = () => {
      if (!scrubbing) setTime(f.currentTime || 0);
      persist(currentIdx, f.currentTime || 0);
      if (
        currentIdx === N - 1 &&
        Number.isFinite(f.currentTime) &&
        f.currentTime >= LAST_CHAPTER_END &&
        !showEndCTA
      ) {
        triggerEnd();
      }
    };
    const onMeta = () => {
      setDuration(f.duration || 0);
      applyResume();
    };
    const onProgress = () => {
      try {
        const ranges = f.buffered;
        if (ranges && ranges.length && f.duration) {
          const end = ranges.end(ranges.length - 1);
          setBuffered(Math.min(1, end / f.duration));
        }
      } catch {
        /* ignore */
      }
    };
    const onEnded = () => {
      if (triggerEnd()) return;
      advance();
    };
    const onPlay = () => setVideoPaused(false);
    const onPause = () => setVideoPaused(true);
    const onPlaying = () => setVideoPaused(false);
    f.addEventListener("timeupdate", onTime);
    f.addEventListener("loadedmetadata", onMeta);
    f.addEventListener("progress", onProgress);
    f.addEventListener("ended", onEnded);
    f.addEventListener("play", onPlay);
    f.addEventListener("pause", onPause);
    f.addEventListener("playing", onPlaying);
    // Sync initial state — the events may have already fired before we attached.
    setVideoPaused(!!f.paused);
    if (f.duration) {
      setDuration(f.duration);
      applyResume();
    }
    return () => {
      f.removeEventListener("timeupdate", onTime);
      f.removeEventListener("loadedmetadata", onMeta);
      f.removeEventListener("progress", onProgress);
      f.removeEventListener("ended", onEnded);
      f.removeEventListener("play", onPlay);
      f.removeEventListener("pause", onPause);
      f.removeEventListener("playing", onPlaying);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front, currentIdx, scrubbing, advance, persist]);

  // Save with time=0 immediately on chapter change (so the saved state
  // reflects the new chapter even before any timeupdate fires).
  useEffect(() => {
    persist(currentIdx, 0, true);
    if (showEndCTA && currentIdx !== N - 1) setShowEndCTA(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  // Flush on unload + on unmount.
  useEffect(() => {
    const flush = () => {
      const f = frontEl();
      if (f) persist(currentIdx, f.currentTime || 0, true);
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, persist]);

  // Idle UI auto-hide
  const bumpUI = useCallback(() => {
    setShowUI(true);
    if (idleRef.current) window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => setShowUI(false), 2600);
  }, []);

  useEffect(() => {
    // Schedule the first hide without forcing a synchronous setState here.
    idleRef.current = window.setTimeout(() => setShowUI(false), 2600);
    const onMove = () => bumpUI();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchstart", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onMove);
      if (idleRef.current) window.clearTimeout(idleRef.current);
    };
  }, [bumpUI]);

  const toggleFull = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Keyboard — modeled on YouTube.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      const k = e.key.toLowerCase();
      const f = frontEl();
      if (e.key === " " || k === "k") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") {
        if (f) f.currentTime = Math.min(f.duration || 0, f.currentTime + 5);
      } else if (e.key === "ArrowLeft") {
        if (f) f.currentTime = Math.max(0, f.currentTime - 5);
      } else if (k === "j") {
        if (f) f.currentTime = Math.max(0, f.currentTime - 10);
      } else if (k === "l") {
        if (f) f.currentTime = Math.min(f.duration || 0, f.currentTime + 10);
      } else if (k === "n" || (e.shiftKey && e.key === "ArrowRight")) {
        goNext();
      } else if (k === "p" || (e.shiftKey && e.key === "ArrowLeft")) {
        goPrev();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        applyVolume(volume + 0.05);
        setVolSliderOpen(true);
        bumpUI();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        applyVolume(volume - 0.05);
        setVolSliderOpen(true);
        bumpUI();
      } else if (k === "m") setMuted((m) => !m);
      else if (k === "f") toggleFull();
      else if (e.key >= "0" && e.key <= "9") {
        const pct = parseInt(e.key, 10) / 10;
        if (f && f.duration) f.currentTime = pct * f.duration;
      } else if (e.key === "Home") {
        if (f) f.currentTime = 0;
      } else if (e.key === "End") {
        if (f && f.duration) f.currentTime = f.duration - 0.5;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goNext, goPrev, toggleFull, bumpUI, applyVolume, volume]);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Lock body scroll while on this page
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Scrub interactions
  const seekFromClientX = (clientX, rect) => {
    const f = frontEl();
    if (!f || !f.duration) return;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    f.currentTime = pct * f.duration;
    setTime(f.currentTime);
  };

  const onScrubDown = (e) => {
    setScrubbing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    seekFromClientX(e.clientX, rect);
    const onMove = (ev) => seekFromClientX(ev.clientX, rect);
    const onUp = () => {
      setScrubbing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onScrubMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPct(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  // Volume slider drag (horizontal, YouTube-style).
  const setVolFromClientX = (clientX, rect) => {
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    applyVolume(pct);
  };

  const onVolDown = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setVolFromClientX(e.clientX, rect);
    const onMove = (ev) => setVolFromClientX(ev.clientX, rect);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const effectiveVolume = muted ? 0 : volume;
  const VolIcon =
    effectiveVolume === 0
      ? Icon.Mute
      : effectiveVolume < 0.5
        ? Icon.VolLow
        : Icon.VolHigh;

  // Intro reveal
  useGSAP(
    () => {
      gsap.from(".vp-fade", {
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.05,
      });
    },
    { scope: overlayRef },
  );

  const progress = duration > 0 ? time / duration : 0;
  const aSrc = videos[aIdx].src;
  const bSrc = videos[bIdx].src;

  const openGate = () => {
    sessionStorage.setItem("audioEnabled", "1");
    // Fire play() inside the user gesture before any state updates so the
    // browser links the playback request to the click. If the first attempt
    // races the autoPlay attribute flip (gated → false), retry next frame.
    const f = frontEl();
    if (f) {
      f.muted = false;
      f.volume = 1;
      const p = f.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          requestAnimationFrame(() => {
            f.play().catch(() => {});
          });
        });
      }
    }
    setGated(false);
    setMuted(false);
    setVolume(1);
    setPlaying(true);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-30 bg-black text-white select-none"
      style={{ cursor: showUI ? "default" : "none" }}
    >
      {gated && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Play with audio"
          className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm grid place-items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-5">
            <button
              type="button"
              onClick={openGate}
              aria-label="Play with audio"
              className="grid place-items-center w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-white text-white bg-transparent hover:bg-white hover:text-black active:scale-[0.97] transition-colors"
            >
              <span
                aria-hidden="true"
                className="inline-block w-0 h-0 ml-1 border-y-[10px] border-y-transparent border-l-[16px] border-l-current"
              />
            </button>
            <span className="text-[11px] tracking-[0.3em] uppercase font-[helve] text-white/85">
              Play with audio
            </span>
          </div>
        </div>
      )}

      {/* Stacked video slots — only the front is opacity:1 + audible. Both
          go opacity:0 during the inter-chapter gap (=> black screen). */}
      <video
        ref={aRef}
        src={aSrc}
        playsInline
        autoPlay={!gated && front === "a"}
        preload="auto"
        className={`absolute inset-0 w-full h-full object-contain bg-black transition-opacity duration-200 ${
          transitioning
            ? "opacity-0 z-0"
            : front === "a"
              ? "opacity-100 z-10"
              : "opacity-0 z-0"
        }`}
      />
      <video
        ref={bRef}
        src={bSrc}
        playsInline
        autoPlay={!gated && front === "b"}
        preload="auto"
        className={`absolute inset-0 w-full h-full object-contain bg-black transition-opacity duration-200 ${
          transitioning
            ? "opacity-0 z-0"
            : front === "b"
              ? "opacity-100 z-10"
              : "opacity-0 z-0"
        }`}
      />

      <div
        ref={overlayRef}
        className={`absolute inset-0 z-20 transition-opacity duration-300 ${
          showUI || showEndCTA ? "opacity-100" : "opacity-0"
        } ${transitioning ? "pointer-events-none" : ""}`}
        onClick={() => {
          if (transitioning || showEndCTA) return;
          // Clicking the empty video area toggles play/pause (YouTube-style).
          // Controls below stop propagation so their clicks don't toggle.
          setPlaying((p) => !p);
          bumpUI();
        }}
      >
        {/* Top bar */}
        <div className="vp-fade pointer-events-none absolute inset-x-0 top-0 px-6 sm:px-10 pt-6 sm:pt-8 pb-12 bg-gradient-to-b from-black/75 via-black/30 to-transparent">
          <div
            className="flex items-start justify-between gap-6 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] tracking-[0.3em] text-white/60 font-[helve]">
                CHAPTER {String(currentIdx + 1).padStart(2, "0")} /{" "}
                {String(N).padStart(2, "0")}
              </div>
              <p className="mt-2 font-[sectra] italic text-[22px] sm:text-[30px] leading-tight text-white truncate">
                {current.title}
              </p>
              <p className="font-[sectra] italic text-[13px] sm:text-[15px] text-white/65 mt-0.5">
                {current.subtitle}
              </p>
            </div>
            <Link
              to="/"
              className="pointer-events-auto shrink-0 flex items-center gap-2 text-[10px] sm:text-[11px] tracking-[0.3em] text-white/70 hover:text-white transition-colors font-[helve]"
              aria-label="Back to home"
            >
              <span className="text-lg leading-none">×</span>
              <span>CLOSE</span>
            </Link>
          </div>
        </div>

        {/* Center play hint when paused — driven off the real video paused state
            so it doesn't get stuck if React state and element state desync. */}
        {videoPaused && !showEndCTA && !transitioning && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPlaying(true);
              const f = frontEl();
              if (f) tryPlay(f);
            }}
            className="vp-fade pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Play"
          >
            <Icon.Play className="h-9 w-9 sm:h-11 sm:w-11 ml-1" />
          </button>
        )}

        {/* End-of-reel CTA — appears after the final chapter finishes */}
        {showEndCTA && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="vp-end-cta pointer-events-auto absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
            <div className="relative z-10 max-w-md">
              <div className="text-[10px] sm:text-[11px] tracking-[0.3em] text-white/55 font-[helve]">
                THE END
              </div>
              <h2 className="mt-4 font-[sectra] italic text-[34px] sm:text-[48px] leading-[1.05] tracking-tight text-white">
                Ready to build?
              </h2>
              <p className="mt-3 font-[helve] text-[13px] sm:text-[14px] leading-relaxed text-white/65">
                If something here landed, the next move is a conversation.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                <button
                  type="button"
                  onClick={() => navigate("/apply")}
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-6 py-2 font-[sectra] italic text-[13px] font-bold tracking-wide transition-colors duration-300 bg-white text-red-600 hover:text-white shadow-[0_0_22px_rgba(239,68,68,0.25)] hover:shadow-[0_0_28px_rgba(239,68,68,0.55)] hover:bg-gradient-to-b hover:from-red-500 hover:via-red-600 hover:to-red-800 cursor-pointer cta-pulse"
                >
                  <span className="cta-normal-text block transition-opacity duration-200 group-hover:opacity-0">
                    START A PROJECT
                  </span>
                  <span className="cta-hover-text absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    LET'S TALK
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowEndCTA(false);
                    jumpTo(0);
                    setPlaying(true);
                  }}
                  className="text-[11px] py-5 tracking-[0.3em] text-white/70 hover:text-white font-[helve] transition-colors"
                >
                  REPLAY ↻
                </button>
              </div>
              <Link
                to="/"
                className="text-[11px] tracking-[0.3em] text-white/70 p-4 hover:text-white font-[helve] transition-colors"
              >
                ← BACK TO HOME
              </Link>
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div
          className="vp-fade pointer-events-auto absolute inset-x-0 bottom-0 px-6 sm:px-10 pt-16 pb-4 sm:pb-5 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Scrub bar — thin by default, thickens on hover (YouTube-style) */}
          <div
            onMouseDown={onScrubDown}
            onMouseMove={onScrubMove}
            onMouseLeave={() => setHoverPct(null)}
            className="vp-scrub group relative h-3 w-full cursor-pointer flex items-center"
          >
            <div className="vp-track relative w-full h-[3px] bg-white/20 rounded-full overflow-hidden transition-[height] duration-150 group-hover:h-[5px]">
              {/* Buffered */}
              <div
                className="absolute left-0 top-0 h-full bg-white/35 rounded-full"
                style={{ width: `${buffered * 100}%` }}
              />
              {/* Hover preview */}
              {hoverPct !== null && (
                <div
                  className="absolute left-0 top-0 h-full bg-white/30 rounded-full pointer-events-none"
                  style={{ width: `${hoverPct * 100}%` }}
                />
              )}
              {/* Progress */}
              <div
                className="absolute left-0 top-0 h-full bg-red-600 rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {/* Drag handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.55)] scale-0 group-hover:scale-100 transition-transform"
              style={{ left: `${progress * 100}%` }}
            />
            {/* Time tooltip on hover */}
            {hoverPct !== null && duration > 0 && (
              <div
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-black/85 text-[10px] sm:text-[11px] tabular-nums font-[helve] text-white pointer-events-none"
                style={{ left: `${hoverPct * 100}%` }}
              >
                {fmt(hoverPct * duration)}
              </div>
            )}
          </div>

          {/* Buttons row */}
          <div className="mt-2 sm:mt-3 flex items-center gap-3 sm:gap-4 text-white/90">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="vp-btn"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Icon.Pause className="h-7 w-7" />
              ) : (
                <Icon.Play className="h-7 w-7" />
              )}
            </button>
            <button
              type="button"
              onClick={goPrev}
              className="vp-btn"
              aria-label="Previous chapter"
            >
              <Icon.Prev className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="vp-btn"
              aria-label="Next chapter"
            >
              <Icon.Next className="h-5 w-5" />
            </button>

            {/* Volume — hover the icon to expand a draggable slider */}
            <div
              className="group/vol flex items-center"
              onMouseEnter={() => setVolSliderOpen(true)}
              onMouseLeave={() => setVolSliderOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  if (effectiveVolume === 0) {
                    setMuted(false);
                    if (volume === 0) setVolume(0.5);
                  } else {
                    setMuted((m) => !m);
                  }
                }}
                className={`vp-btn ${effectiveVolume === 0 ? "vp-btn-muted" : ""}`}
                aria-label={effectiveVolume === 0 ? "Unmute" : "Mute"}
              >
                <VolIcon className="h-6 w-6" />
              </button>
              <div
                className={`overflow-hidden transition-[width,opacity] duration-200 ease-out ${
                  volSliderOpen ? "w-24 opacity-100 ml-2" : "w-0 opacity-0"
                }`}
              >
                <div
                  onMouseDown={onVolDown}
                  className="relative h-3 w-24 cursor-pointer flex items-center"
                  role="slider"
                  aria-label="Volume"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(effectiveVolume * 100)}
                  tabIndex={0}
                >
                  <div className="relative w-full h-[3px] bg-white/25 rounded-full">
                    <div
                      className="absolute left-0 top-0 h-full bg-white rounded-full"
                      style={{ width: `${effectiveVolume * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white"
                      style={{ left: `${effectiveVolume * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <span className="ml-1 text-[11px] sm:text-[12px] font-[helve] tabular-nums tracking-wider text-white/75">
              {fmt(time)} <span className="text-white/30 mx-1">/</span>{" "}
              {fmt(duration)}
            </span>

            <div className="hidden md:block ml-3 font-[sectra] italic text-[14px] text-white/55 truncate max-w-[28vw]">
              {current.title}
            </div>

            <div className="ml-auto flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={toggleFull}
                className="vp-btn"
                aria-label={isFull ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFull ? (
                  <Icon.FullExit className="h-6 w-6" />
                ) : (
                  <Icon.Full className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Chapter dots */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {videos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => jumpTo(i)}
                aria-label={`Chapter ${i + 1}`}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentIdx
                    ? "w-8 bg-red-600"
                    : "w-2 bg-white/30 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .vp-btn {
          color: rgba(255,255,255,0.85);
          transition: color 150ms ease, transform 150ms ease, filter 200ms ease;
        }
        .vp-btn:hover { color: #fff; transform: scale(1.06); }
        .vp-btn:active { transform: scale(0.94); }
        /* Muted-state glow — pulses gently to flag that audio is off. */
        .vp-btn-muted {
          color: #ef4444;
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.75));
          animation: vpMuteGlow 1.8s ease-in-out infinite;
        }
        .vp-btn-muted:hover { color: #f87171; }
        @keyframes vpMuteGlow {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.55));
          }
          50% {
            filter: drop-shadow(0 0 14px rgba(239, 68, 68, 0.95));
          }
        }
      `}</style>
    </div>
  );
};

export default Videos;
