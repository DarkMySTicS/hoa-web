import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const { pathname } = useLocation();

  return (
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
          ERROR — 404
        </div>

        <h1 className="mt-6 font-[sectra] italic leading-[0.92] tracking-tight text-[18vw] sm:text-[14vw] md:text-[12rem] xl:text-[16rem]">
          404
        </h1>

        <p className="mt-4 font-[sectra] italic text-2xl sm:text-3xl md:text-4xl max-w-2xl">
          Lost in the cut.
        </p>

        <p className="mt-5 max-w-md text-[13px] leading-relaxed text-white/65">
          The page you were looking for isn't here — it may have moved, been
          renamed, or never existed in the first place.
        </p>

        {pathname ? (
          <p className="mt-3 text-[11px] tracking-[0.18em] text-white/35 break-all">
            {pathname}
          </p>
        ) : null}

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-[12px] tracking-[0.25em] uppercase hover:bg-white/90 transition-colors"
          >
            <span>Back to home</span>
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
          <Link
            to="/case-studies"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/25 text-white/85 text-[12px] tracking-[0.25em] uppercase hover:border-white/60 hover:text-white transition-colors"
          >
            View case studies
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
