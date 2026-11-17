import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchCaseStudyBySlug,
  fetchCaseStudies,
  mediaUrl,
  posterImageUrl,
} from "../lib/caseStudies";
import { rememberCaseStudyVisit } from "../lib/caseStudyMemory";

const CaseStudy = () => {
  const { slug } = useParams();
  const [study, setStudy] = useState(null);
  const [next, setNext] = useState(null);
  const [isLast, setIsLast] = useState(false);
  const [nextIndex, setNextIndex] = useState({ pos: 1, total: 1 });
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const data = await fetchCaseStudyBySlug(slug);
        if (cancelled) return;
        if (!data) {
          setStatus("notfound");
          return;
        }
        setStudy(data);
        rememberCaseStudyVisit({ slug: data.slug, category: data.category });
        const siblings = await fetchCaseStudies({ category: data.category });
        if (cancelled) return;
        if (siblings.length > 0) {
          const idx = Math.max(
            0,
            siblings.findIndex((s) => s.slug === data.slug),
          );
          const last = idx === siblings.length - 1;
          setIsLast(last);
          setNext(last ? null : siblings[idx + 1]);
          setNextIndex({ pos: idx + 1, total: siblings.length });
        } else {
          setIsLast(false);
          setNext(null);
        }
        setStatus("ok");
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load case study:", err);
        setErrorMsg(err.message || String(err));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="py-25 px-4 bg-white min-h-screen w-full text-black grid place-items-center">
        <p className="font-[helve] text-sm tracking-[0.3em] uppercase text-black/55">
          Loading…
        </p>
      </div>
    );
  }
  if (status === "notfound") {
    return (
      <div className="py-25 px-4 bg-white min-h-screen w-full text-black grid place-items-center text-center">
        <div>
          <p className="font-[helve] text-sm tracking-[0.3em] uppercase text-black/55 mb-3">
            Not found
          </p>
          <h1 className="text-3xl md:text-5xl font-[helve]">
            That case study isn't available.
          </h1>
          <Link
            to="/case-studies"
            className="mt-6 inline-block underline font-[helve] text-sm tracking-[0.2em] uppercase"
          >
            Back to works
          </Link>
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="py-25 px-4 bg-white min-h-screen w-full text-black grid place-items-center text-center">
        <div>
          <p className="font-[helve] text-sm tracking-[0.3em] uppercase text-black/55 mb-3">
            Couldn't load
          </p>
          <p className="max-w-md text-sm text-black/70">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const blocks = Array.isArray(study.blocks) ? study.blocks : [];
  const heroBlock = blocks.find((b) => b.type === "hero");
  // Prefer a dedicated sidebar block; fall back to the hero block for legacy
  // case studies that carried sidebar data on the hero itself.
  const sidebarBlock =
    blocks.find((b) => b.type === "sidebar") || heroBlock || null;
  const restBlocks = blocks.filter(
    (b) => b !== heroBlock && b !== sidebarBlock,
  );

  return (
    <div className="py-16 sm:py-20 md:py-25 px-4 sm:px-6 md:px-10 bg-white min-h-screen w-full text-black">
      {/* Mobile / tablet — stacked rendering */}
      <div className="xl:hidden border-[1px] border-black">
        {blocks.map((b, i) => (
          <BlockRenderer key={b.id || i} block={b} study={study} />
        ))}

        {next ? <NextCaseStudyBlock next={next} index={nextIndex} /> : null}
        {isLast ? <BackToHomeBlock index={nextIndex} /> : null}
      </div>

      {/* Desktop XL+ — sidebar and main are visually separate boxes with
          their own borders and a gap between them. The sidebar is a fixed
          80vh sticky panel that stays pinned regardless of scroll. */}
      <div className="hidden xl:grid grid-cols-[360px_1fr] gap-6 items-start">
        <aside className="sticky top-25 h-[90vh] overflow-hidden border border-black bg-white">
          {sidebarBlock ? (
            <HeroSidebarDesktop block={sidebarBlock} study={study} />
          ) : null}
        </aside>
        <div className="min-w-0 overflow-hidden border border-black">
          {heroBlock ? (
            <HeroMainDesktop block={heroBlock} study={study} />
          ) : null}
          {restBlocks.map((b, i) => (
            <BlockRenderer key={b.id || i} block={b} study={study} />
          ))}
          {next ? <NextCaseStudyBlock next={next} index={nextIndex} /> : null}
          {isLast ? <BackToHomeBlock index={nextIndex} /> : null}
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   Block router
   ────────────────────────────────────────────────────────── */
function BlockRenderer({ block, study }) {
  switch (block.type) {
    case "hero":
      return <HeroBlock block={block} study={study} />;
    case "sidebar":
      return <SidebarBlockMobile block={block} study={study} />;
    case "metrics":
      return <MetricsBlock block={block} />;
    case "editorial":
      return <EditorialBlock block={block} />;
    case "richText":
      return <RichTextBlock block={block} />;
    case "twoColText":
      return <TwoColTextBlock block={block} />;
    case "gallery":
      return <GalleryBlock block={block} />;
    case "caption":
      return <CaptionBlock block={block} />;
    case "pullQuote":
      return <PullQuoteBlock block={block} />;
    case "credits":
      return <CreditsBlock block={block} />;
    default:
      return null;
  }
}

/* Minimal markdown-like inline formatter: **bold** and *italic*, escaped so
   author input can't inject HTML. Paragraph breaks come from blank lines. */
function renderInline(text) {
  if (!text) return [];
  const escape = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text.split(/\n{2,}/).map((para, pi) => {
    const html = escape(para)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");
    return { key: pi, html };
  });
}

function RichText({ text }) {
  const paras = renderInline(text);
  if (paras.length === 0) return null;
  return (
    <>
      {paras.map((p) => (
        <p
          key={p.key}
          className="text-base md:text-[17px] leading-[1.7] font-[helve] text-black/85 mb-5 last:mb-0"
          dangerouslySetInnerHTML={{ __html: p.html }}
        />
      ))}
    </>
  );
}

function RichTextBlock({ block }) {
  if (!block.heading && !block.body) return null;
  return (
    <div className="border-t border-black px-4 sm:px-6 md:px-10 py-12 md:py-20 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
        {block.heading ? (
          <h3 className="md:col-span-4 text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black">
            {block.heading}
          </h3>
        ) : (
          <div className="md:col-span-4" />
        )}
        <div className="md:col-span-8">
          <RichText text={block.body} />
        </div>
      </div>
    </div>
  );
}

function TwoColTextBlock({ block }) {
  const hasLeft = block.leftHeading || block.leftBody;
  const hasRight = block.rightHeading || block.rightBody;
  if (!hasLeft && !hasRight) return null;
  return (
    <div className="border-t border-black px-4 sm:px-6 md:px-10 py-12 md:py-20 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
        <div>
          {block.leftHeading ? (
            <h3 className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black mb-6">
              {block.leftHeading}
            </h3>
          ) : null}
          <RichText text={block.leftBody} />
        </div>
        <div>
          {block.rightHeading ? (
            <h3 className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black mb-6">
              {block.rightHeading}
            </h3>
          ) : null}
          <RichText text={block.rightBody} />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Hero — mobile/tablet stacked render
   (Desktop XL+ is rendered at the page level so the sidebar
   can be sticky across the entire case study.)
   ────────────────────────────────────────────────────────── */
function HeroBlock({ block, study }) {
  const media = block.media;
  const isVideo = media?.kind === "video";
  const coverMedia = study?.cover || study?.poster || media;

  return (
    <div className="xl:hidden">
      <CoverMedia media={coverMedia} alt={block.title || ""} />

      {block.title ? (
        <h1 className="text-6xl px-4 sm:px-6 md:px-10 py-2 text-black font-[sectra] italic">
          {block.title}
        </h1>
      ) : null}
      {block.client ? (
        <>
          <hr className="text-black" />
          <h1 className="py-4 text-4xl px-4 sm:px-6 md:px-10 font-[sectra] italic">
            {block.client}
          </h1>
        </>
      ) : null}
      <SidebarGroups groups={block.services} variant="mobile" />
      {block.creditsByline ? (
        <>
          <hr className="text-black mt-6" />
          <div className="flex items-center gap-4 px-4 sm:px-6 md:px-10 py-3 bg-white">
            <p className="text-xs tracking-[0.22em] uppercase font-[helve]">
              {block.creditsByline}
            </p>
            <div className="h-px flex-1 bg-black/30" />
          </div>
        </>
      ) : null}

      <HeroMedia
        media={media}
        isVideo={isVideo}
        title={block.title}
        heightClass="h-[260px] md:h-[520px]"
      />

      {(block.headline || block.intro) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 px-4 sm:px-6 md:px-10 py-12 md:py-20">
          {block.headline ? (
            <h2 className="text-4xl md:text-5xl leading-[1.05] text-black font-[sectra] italic tracking-tight">
              {block.headline}
            </h2>
          ) : null}
          {block.intro ? (
            <p className="text-base leading-[1.7] text-black font-[helve] whitespace-pre-line">
              {block.intro}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* Mobile / tablet — dedicated sidebar block rendered inline in the stacked
   layout. Backward compat: the legacy hero block still renders these fields
   itself, so this only fires when the author has explicitly added a new
   `sidebar` block. */
function SidebarBlockMobile({ block, study }) {
  // Cover/poster is the primary sidebar image now — the per-block thumbnail
  // field was removed from the CRM, so it's only a fallback for older
  // records that still carry one.
  const media = study?.cover || study?.poster || block.media || null;
  return (
    <div>
      {media ? <CoverMedia media={media} alt={block.title || ""} /> : null}
      {block.title ? (
        <h1 className="text-6xl px-4 sm:px-6 md:px-10 py-2 text-black font-[sectra] italic">
          {block.title}
        </h1>
      ) : null}
      {block.subtitle ? (
        <p className="px-4 sm:px-6 md:px-10 pb-3 text-sm font-[helve] text-black/65">
          {block.subtitle}
        </p>
      ) : null}
      {block.client ? (
        <>
          <hr className="text-black" />
          <h2 className="py-4 text-4xl px-4 sm:px-6 md:px-10 font-[sectra] italic">
            {block.client}
          </h2>
        </>
      ) : null}
      <SidebarGroups groups={block.services} variant="mobile" />
      {block.creditsByline ? (
        <>
          <hr className="text-black mt-6" />
          <div className="flex items-center gap-4 px-4 sm:px-6 md:px-10 py-3 bg-white">
            <p className="text-xs tracking-[0.22em] uppercase font-[helve]">
              {block.creditsByline}
            </p>
            <div className="h-px flex-1 bg-black/30" />
          </div>
        </>
      ) : null}
    </div>
  );
}

/* Desktop sidebar — rendered inside the sticky <aside> at page level.
   Everything is sized to fit inside the viewport-bound aside (no inner
   scroll), with "Back to WORKS" anchored to the bottom via mt-auto. */
function HeroSidebarDesktop({ block, study }) {
  // Cover/poster is the primary sidebar image now — the per-block thumbnail
  // field was removed from the CRM, so it's only a fallback for older
  // records that still carry one.
  const coverMedia = study?.cover || study?.poster || block.media;
  return (
    <div className="flex flex-col  min-h-full">
      <CoverMedia
        media={coverMedia}
        alt=""
        className="block w-full h-[200px] object-cover shrink-0"
      />

      {block.title ? (
        <>
          <div className="px-5 py-5">
            <h1 className="text-4xl font-[sectra] italic tracking-tight leading-none">
              {block.title}
            </h1>
          </div>
          <hr className="text-black" />
        </>
      ) : null}
      {block.client ? (
        <>
          <div className="px-5 py-3">
            <h2 className="text-xl font-[sectra] italic">{block.client}</h2>
          </div>
          <hr className="text-black" />
        </>
      ) : null}
      <SidebarGroups groups={block.services} variant="desktop" />
      <div className="mt-auto px-5 pt-6 pb-6">
        <p className="text-[10px] tracking-[0.25em] uppercase font-[helve] text-black/40 mb-1">
          Back to
        </p>
        <Link
          to="/case-studies"
          className="block text-5xl font-[sectra] italic leading-none tracking-tight hover:opacity-70"
        >
          WORKS
        </Link>
      </div>
    </div>
  );
}

/* Desktop main column for the hero — media on top, then the case study title
   as a small label and the client name as a large display row. Mirrors the
   sidebar's title/client pair so the right column reads as the page's hero
   identity, not just a thumbnail. */
function HeroMainDesktop({ block, study }) {
  const media = block.media;
  const isVideo = media?.kind === "video";

  const title = study?.title || block.title || "";
  const client = study?.client || block.client || "";

  return (
    <section className="flex flex-col">
      <div className="relative bg-white">
        <HeroMedia
          media={media}
          isVideo={isVideo}
          title={block.title}
          heightClass="h-[520px]"
        />
      </div>
      {title ? (
        <div className="border-t border-black px-4 sm:px-6 md:px-10 py-4">
          <p className="text-base font-[helve] tracking-tight text-black">
            {title}
          </p>
        </div>
      ) : null}
      {client ? (
        <div className="border-t border-black px-4 sm:px-6 md:px-10 py-8">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-[helve] tracking-tight text-black uppercase leading-none">
            {client}
          </h2>
        </div>
      ) : null}
      {(block.headline || block.intro) && (
        <div className="border-t border-black px-4 sm:px-6 md:px-10 py-12 md:py-20 grid grid-cols-2 gap-8 md:gap-20 items-start">
          {block.headline ? (
            <h3 className="text-2xl lg:text-3xl leading-[1.15] text-black font-[sectra] italic tracking-tight">
              {block.headline}
            </h3>
          ) : (
            <div />
          )}
          {block.intro ? (
            <p className="text-base leading-[1.7] text-black font-[helve] whitespace-pre-line">
              {block.intro}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function SidebarGroups({ groups, variant }) {
  if (!Array.isArray(groups) || groups.length === 0) return null;
  if (variant === "desktop") {
    return (
      <div>
        {groups.map((g, i) => (
          <div key={g.id || i}>
            <p className="px-5 pt-3 pb-2 text-[10px] tracking-[0.25em] uppercase font-[helve] text-black/40">
              {g.label}
            </p>
            <hr className="text-black/20" />
            <p className="px-5 py-2 text-[13px] font-semibold font-[helve] uppercase tracking-wide">
              {g.value}
            </p>
            {i < groups.length - 1 && <hr className="text-black/20" />}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="px-4 sm:px-6 md:px-10">
      {groups.map((g, i) => (
        <div key={g.id || i}>
          <p className="text-sm text-black font-[helve]">{g.label}</p>
          <hr className="text-gray-400 py-1" />
          <p className="text-sm font-bold text-black font-[helve]">{g.value}</p>
          {i < groups.length - 1 && <hr className="text-gray-400 py-1" />}
        </div>
      ))}
    </div>
  );
}

function CoverMedia({ media, alt, className }) {
  if (!media) return null;
  const isVideo = media?.kind === "video";
  if (isVideo) {
    const url = mediaUrl(media, { w: 1200 });
    return (
      <video
        src={url}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={className}
      />
    );
  }
  const url = mediaUrl(media, { w: 1200 });
  return <img src={url} alt={alt || ""} className={className} loading="lazy" />;
}

function HeroMedia({ media, isVideo, title, heightClass }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  if (!media) return null;
  const url = mediaUrl(media, { w: 1600 });

  if (isVideo) {
    const startPlayback = () => {
      const v = videoRef.current;
      setPlaying(true);
      if (v) {
        v.muted = false;
        v.controls = true;
        v.loop = false;
        v.currentTime = 0;
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    };

    return (
      <div className="relative border-y border-black bg-white">
        {/* One element across both states — no remount-on-click race that could
            leave the play-button overlay visible while React swaps videos. */}
        <video
          ref={videoRef}
          src={url}
          muted={!playing}
          loop={!playing}
          autoPlay={!playing}
          controls={playing}
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          className={`block w-full ${heightClass} ${playing ? "object-contain bg-black" : "object-cover bg-white"}`}
        />
        {!playing && (
          <button
            type="button"
            aria-label="Play video"
            onClick={startPlayback}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/95 border border-black/20 grid place-items-center shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.99]"
          >
            <span className="block w-0 h-0 ml-0.5 border-y-8 border-y-transparent border-l-12 border-l-black md:border-y-[9px] md:border-l-14" />
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="relative border-y border-black bg-white">
      <img
        src={url}
        alt={title || ""}
        className={`block w-full ${heightClass} object-cover bg-white`}
        loading="lazy"
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Metrics
   ────────────────────────────────────────────────────────── */
function MetricsBlock({ block }) {
  const items = (block.items || []).slice(0, 4);
  if (items.length === 0) return null;
  const n = items.length;
  // Desktop column count tracks the item count so each cell takes an even
  // 1/n share — 2 → 50%, 3 → 33%, 4 → 25%. Mobile keeps a 2-col wrap unless
  // there's only one item.
  const desktopCols = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  }[n];
  const mobileCols = n === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div className={`border-t border-black grid ${mobileCols} ${desktopCols}`}>
      {items.map((m, i) => (
        <Metric
          key={m.id || i}
          label={m.label}
          value={m.value}
          index={i}
          count={n}
        />
      ))}
    </div>
  );
}

function Metric({ label, value, index, count }) {
  // Mobile (2-col): left divider on the right column (odd index); top divider
  // on the second row (index >= 2). Desktop (n-col): left divider on every
  // item except the first, regardless of mobile wrap position.
  const mobileBorderL = index % 2 === 1;
  const desktopOnlyBorderL = !mobileBorderL && index > 0;
  /* An odd item count leaves the last cell alone on the mobile row, so its top
     divider would stop halfway across and read as a stray line hanging off the
     cell above it. Let that cell span both columns instead. */
  const spansMobileRow = count > 1 && count % 2 === 1 && index === count - 1;
  return (
    <div
      className={[
        "px-4 sm:px-6 md:px-8 py-6 md:py-8 bg-white",
        spansMobileRow ? "col-span-2 md:col-span-1" : "",
        mobileBorderL ? "border-l border-black/30" : "",
        desktopOnlyBorderL ? "md:border-l md:border-black/30" : "",
        index >= 2 ? "border-t border-black/30 md:border-t-0" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55">
        {label}
      </p>
      <p className="mt-2 text-2xl sm:text-3xl md:text-4xl font-[sectra] italic tracking-tight text-black">
        {value}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Editorial — eyebrow + headline + body
   ────────────────────────────────────────────────────────── */
function EditorialBlock({ block }) {
  return (
    <div className="border-t border-black px-4 sm:px-6 md:px-10 py-12 md:py-20 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20">
        <div>
          {block.eyebrow ? (
            <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55">
              {block.eyebrow}
            </p>
          ) : null}
          {block.headline ? (
            <h3 className="mt-3 text-3xl sm:text-4xl md:text-5xl leading-[1.05] tracking-tight font-[sectra] italic text-black">
              {block.headline}
            </h3>
          ) : null}
        </div>
        <div className="space-y-5 text-base md:text-[17px] leading-[1.7] font-[helve] text-black/85">
          {(block.body || []).map((p, i) => (p ? <p key={i}>{p}</p> : null))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Gallery — horizontal scroll with 1/2/3-up layouts
   ────────────────────────────────────────────────────────── */
function GalleryBlock({ block }) {
  const items = (block.items || []).filter((it) => it?.media);
  const scrollerRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [items.length]);

  if (items.length === 0) return null;

  const widthClass =
    block.layout === "3col"
      ? "w-[80%] sm:w-1/2 md:w-1/3"
      : block.layout === "1col"
        ? "w-[92%] sm:w-[85%] md:w-[75%]"
        : "w-[85%] sm:w-1/2";

  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div className="relative border-t border-black overflow-hidden group">
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
      >
        {items.map((it, i) => {
          const isVideo = it.media?.kind === "video";
          const url = mediaUrl(it.media, { w: 1200 });
          const className =
            "block w-full h-56 sm:h-64 md:h-80 lg:h-[420px] object-cover";
          return (
            <figure
              key={it.id || i}
              className={[
                "shrink-0 snap-start bg-white",
                widthClass,
                i < items.length - 1 ? "border-r border-black" : "",
              ].join(" ")}
            >
              {isVideo ? (
                <video
                  src={url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className={className}
                />
              ) : (
                <img
                  src={url}
                  alt={it.alt || ""}
                  className={className}
                  loading="lazy"
                />
              )}
            </figure>
          );
        })}
      </div>

      {/* Paired arrows below the gallery. Shown on every viewport when there
          are more than 3 items — matches the mobile arrow style so the same
          left/right control exists at all sizes. */}
      {items.length > 3 && (
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-black/10 bg-white">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            disabled={!canLeft}
            className={[
              "w-11 h-11 rounded-full bg-white text-black grid place-items-center border border-black/15",
              "transition-opacity duration-200",
              canLeft
                ? "opacity-100 hover:bg-black hover:text-white active:bg-black active:text-white"
                : "opacity-30 pointer-events-none",
            ].join(" ")}
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ‹
            </span>
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            disabled={!canRight}
            className={[
              "w-11 h-11 rounded-full bg-white text-black grid place-items-center border border-black/15",
              "transition-opacity duration-200",
              canRight
                ? "opacity-100 hover:bg-black hover:text-white active:bg-black active:text-white"
                : "opacity-30 pointer-events-none",
            ].join(" ")}
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ›
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Caption
   ────────────────────────────────────────────────────────── */
function CaptionBlock({ block }) {
  if (!block.text) return null;
  return (
    <div className="border-t border-black px-4 sm:px-6 md:px-10 py-6 md:py-8 bg-white">
      <p className="text-sm md:text-base font-[helve] text-black max-w-3xl whitespace-pre-line leading-[1.7]">
        {block.text}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Pull quote
   ────────────────────────────────────────────────────────── */
function PullQuoteBlock({ block }) {
  if (!block.quote) return null;
  const inverted = block.inverted !== false;
  return (
    <div
      className={[
        "border-t border-black px-4 sm:px-6 md:px-10 py-14 md:py-24",
        inverted ? "bg-black text-white" : "bg-white text-black",
      ].join(" ")}
    >
      <blockquote className="max-w-4xl">
        <span
          aria-hidden="true"
          className={[
            "block text-5xl md:text-7xl font-[sectra] italic leading-none mb-4",
            inverted ? "text-white/30" : "text-black/30",
          ].join(" ")}
        >
          “
        </span>
        <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.15] font-[sectra] italic tracking-tight whitespace-pre-line">
          {block.quote}
        </p>
        {block.attribution ? (
          <footer className="mt-8 flex items-center gap-3">
            <span
              className={[
                "h-px w-10",
                inverted ? "bg-white/40" : "bg-black/40",
              ].join(" ")}
            />
            <p
              className={[
                "text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve]",
                inverted ? "text-white/65" : "text-black/65",
              ].join(" ")}
            >
              {block.attribution}
            </p>
          </footer>
        ) : null}
      </blockquote>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Credits
   ────────────────────────────────────────────────────────── */
function CreditsBlock({ block }) {
  const items = block.items || [];
  if (items.length === 0) return null;
  return (
    <div className="border-t border-black px-4 sm:px-6 md:px-10 py-12 md:py-16 bg-white">
      <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55 mb-6 md:mb-8">
        Credits
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 md:gap-x-14 gap-y-3 max-w-5xl">
        {items.map((c, i) => (
          <div
            key={c.id || `${c.label}-${i}`}
            className="flex items-baseline justify-between gap-6 border-b border-black/15 py-2.5"
          >
            <dt className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase font-[helve] text-black/60">
              {c.label}
            </dt>
            <dd className="text-sm md:text-[15px] font-[helve] font-semibold text-black text-right">
              {c.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Next case study
   ────────────────────────────────────────────────────────── */
function NextCaseStudyBlock({ next, index }) {
  const img =
    posterImageUrl(next.poster, { w: 1200 }) ||
    posterImageUrl(next.cover, { w: 1200 });
  return (
    <Link
      to={`/case-study/${next.slug}`}
      className="block border-t border-black bg-white text-black group"
    >
      <div className="grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-7 px-4 sm:px-6 md:px-10 py-12 md:py-16 lg:py-20 border-b md:border-b-0 md:border-r border-black flex flex-col gap-10 md:gap-12">
          <div className="flex items-center gap-4">
            <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55">
              Next case study
            </p>
            <span className="h-px flex-1 bg-black/25" />
            <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55">
              {String(index.pos).padStart(2, "0")} /{" "}
              {String(index.total).padStart(2, "0")}
            </p>
          </div>
          <div>
            <h3 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[sectra] italic leading-[1.02] tracking-tight">
              {next.title}
            </h3>
            {next.client ? (
              <p className="mt-5 max-w-xl text-sm sm:text-base font-[helve] text-black/70 leading-[1.7]">
                {next.client}
              </p>
            ) : null}
          </div>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <ul className="flex flex-wrap gap-x-6 gap-y-1.5 text-[10px] sm:text-[11px] tracking-[0.22em] uppercase font-[helve] text-black/55">
              {next.role ? <li>{next.role}</li> : null}
              {next.year ? <li>{next.year}</li> : null}
            </ul>
            <span className="inline-flex items-center gap-3 text-xs tracking-[0.3em] uppercase font-[helve] text-black">
              <span className="border-b border-black pb-1 transition-opacity group-hover:opacity-60">
                View case
              </span>
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </span>
          </div>
        </div>
        <div className="md:col-span-5 relative overflow-hidden bg-white">
          {img ? (
            <img
              src={img}
              alt={next.title}
              className="block w-full h-64 sm:h-80 md:absolute md:inset-0 md:h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────
   Back to home — replaces "next case study" on the final entry
   ────────────────────────────────────────────────────────── */
function BackToHomeBlock({ index }) {
  return (
    <div className="border-t border-black bg-white text-black">
      <div className="px-4 sm:px-6 md:px-10 py-14 md:py-20 lg:py-24 flex flex-col gap-10 md:gap-14">
        <div className="flex items-center gap-4">
          <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55">
            End of the reel
          </p>
          <span className="h-px flex-1 bg-black/25" />
          <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55">
            {String(index.pos).padStart(2, "0")} /{" "}
            {String(index.total).padStart(2, "0")}
          </p>
        </div>
        <div>
          <h3 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[sectra] italic leading-[1.02] tracking-tight">
            You've reached the last case study.
          </h3>
          <p className="mt-5 max-w-xl text-sm sm:text-base font-[helve] text-black/70 leading-[1.7]">
            Head back to the homepage to explore the rest of the studio.
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <Link
            to="/case-studies"
            className="inline-flex items-center gap-3 text-xs tracking-[0.3em] uppercase font-[helve] text-black/70 group"
          >
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:-translate-x-1"
            >
              ←
            </span>
            <span className="border-b border-black/40 pb-1 transition-opacity group-hover:opacity-60">
              All case studies
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-3 text-xs tracking-[0.3em] uppercase font-[helve] text-black group"
          >
            <span className="border-b border-black pb-1 transition-opacity group-hover:opacity-60">
              Back to home
            </span>
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CaseStudy;
