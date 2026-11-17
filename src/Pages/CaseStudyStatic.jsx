import React, { useState } from "react";

const CaseStudyStatic = () => {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="py-16 sm:py-20 md:py-25 px-4 sm:px-6 md:px-10 bg-white min-h-screen w-full text-black">
      <div className="border-[1px] border-black ">
        {/* Laptop / tabs (keep current stacked layout) */}
        <div className="xl:hidden">
          <img
            src="https://mooders.net/wp-content/uploads/2024/02/Capture-decran-2024-05-02-a-16.15-scaled-e1714660268550-1200x659.jpg"
            alt="alt"
            className=""
          />
          <h1 className="text-6xl p-2 text-black font-[helve]">UR 220</h1>
          <div className="">
            <hr className="text-black" />

            <h1 className=" py-4 text-4xl px-2 font-[helve]">URWERK</h1>
            <div className="px-2">
              <p className="text-sm text-black font-[helve]">SERVICES</p>
              <hr className="text-gray-400 py-1" />
              <p className="text-sm font-bold text-black font-[helve]">
                SOUND DESIGN / MUSIC
              </p>
              <hr className="text-gray-400 py-1" />
              <p className="text-sm text-black font-[helve]">BUSINESS</p>
              <hr className="text-gray-400 py-1" />
              <p className="text-sm font-bold text-black font-[helve]">
                WATCHMAKING / LUXURY
              </p>
              <hr className="text-gray-400 py-1" />
              <p className="text-sm text-black font-[helve]">TECHNOLOGY</p>
              <hr className="text-gray-400 py-1" />
              <p className="text-sm font-bold text-black font-[helve]">
                INNOVATION / DESIGN
              </p>
            </div>
          </div>

          {/* CONTINUE (matches screenshot layout) */}
          <hr className="text-black mt-6" />
          <div className="flex items-center gap-4 px-2 py-3 bg-white">
            <p className="text-xs tracking-[0.22em] uppercase font-[helve]">
              Ad &amp; Production : I-RÉEL
            </p>
            <div className="h-px flex-1 bg-black/30" />
          </div>

          {/* Hero media with play button */}
          <div className="relative border-y border-black bg-white">
            {showVideo ? (
              <iframe
                src="https://player.vimeo.com/video/468071656?autoplay=1&title=0&byline=0&portrait=0&controls=1"
                title="URWERK UR 220 video"
                className="block w-full h-[260px] md:h-[520px] bg-white"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <img
                  src="https://mooders.net/wp-content/uploads/2024/02/urwerk-ur220-sound-design.jpg"
                  alt="URWERK UR 220 video poster"
                  className="block w-full h-[260px] md:h-[520px] object-cover bg-white"
                  loading="lazy"
                />

                <button
                  type="button"
                  aria-label="Play video"
                  onClick={() => setShowVideo(true)}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/95 border border-black/20 grid place-items-center shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.99]"
                >
                  <span className="block w-0 h-0 ml-0.5 border-y-8 border-y-transparent border-l-12 border-l-black md:border-y-[9px] md:border-l-14" />
                </button>
              </>
            )}
          </div>

          {/* Two-column title + paragraph (like screenshot) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2 py-10">
            <h2 className="text-4xl md:text-5xl leading-[1.05] text-black font-[helve] uppercase tracking-tight">
              A powerful, organic and futuristic sound design for the release of
              the new creation by prestigious watchmaker Urwerk.
            </h2>

            <p className="text-base leading-relaxed text-black font-[helve]">
              Urwerk is celebrating the launch of its new watch with a digital
              campaign featuring a series of films depicting the transition from
              the UR210, the old model, to the UR220, the new model. This
              succession is symbolized by a{" "}
              <span className="font-bold">
                fight between two falcons, half-animal, half-machine
              </span>
              , whose sharp lines are directly{" "}
              <span className="font-bold">inspired by the design</span> of the
              Swiss brand’s two watches. The I-Réel agency designed and produced
              the campaign.
            </p>
          </div>
        </div>

        {/* Large devices (desktop XL+): match screenshot (left info + right media/content) */}
        <div className="hidden xl:grid grid-cols-[360px_1fr] min-h-[720px]">
          {/* Left sidebar */}
          <aside className="border-r border-black">
            <img
              src="https://mooders.net/wp-content/uploads/2024/02/Capture-decran-2024-05-02-a-16.15-scaled-e1714660268550-1200x659.jpg"
              alt="UR 220 cover"
              className="block w-full h-[170px] object-cover"
              loading="eager"
            />

            <div className="px-4 pt-4 pb-6">
              <h1 className="text-3xl font-[helve]">UR 220</h1>
            </div>

            <hr className="text-black" />

            <div className="px-4 py-4">
              <h2 className="text-2xl font-[helve]">URWERK</h2>
            </div>

            <div className="px-4 pb-6">
              <p className="text-[11px] tracking-[0.22em] uppercase font-[helve] text-black/70">
                Services
              </p>
              <hr className="text-gray-400 my-2" />
              <p className="text-xs font-semibold font-[helve]">
                SOUND DESIGN / MUSIC
              </p>

              <hr className="text-gray-400 my-3" />
              <p className="text-[11px] tracking-[0.22em] uppercase font-[helve] text-black/70">
                Business
              </p>
              <hr className="text-gray-400 my-2" />
              <p className="text-xs font-semibold font-[helve]">
                WATCHMAKING / LUXURY
              </p>

              <hr className="text-gray-400 my-3" />
              <p className="text-[11px] tracking-[0.22em] uppercase font-[helve] text-black/70">
                Credits
              </p>
              <hr className="text-gray-400 my-2" />
              <p className="text-xs font-semibold font-[helve]">
                AD &amp; PRODUCTION : I-RÉEL
              </p>
            </div>

            <div className="mt-auto border-t border-black px-4 py-4">
              <p className="text-[10px] tracking-[0.22em] uppercase font-[helve] text-black/60">
                Back to
              </p>
              <p className="text-4xl font-[helve] font-bold leading-none">
                WORKS
              </p>
            </div>
          </aside>

          {/* Right content */}
          <section className="flex flex-col">
            <div className="relative border-b border-black bg-white">
              {showVideo ? (
                <iframe
                  src="https://player.vimeo.com/video/468071656?autoplay=1&title=0&byline=0&portrait=0&controls=1"
                  title="URWERK UR 220 video"
                  className="block w-full h-[520px] bg-white"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  <img
                    src="https://mooders.net/wp-content/uploads/2024/02/urwerk-ur220-sound-design.jpg"
                    alt="URWERK UR 220 video poster"
                    className="block w-full h-[520px] object-cover bg-white"
                    loading="eager"
                  />

                  <button
                    type="button"
                    aria-label="Play video"
                    onClick={() => setShowVideo(true)}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/95 border border-black/20 grid place-items-center shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.99]"
                  >
                    <span className="block w-0 h-0 ml-0.5 border-y-[9px] border-y-transparent border-l-14 border-l-black" />
                  </button>
                </>
              )}
            </div>

            <div className="px-6 py-4">
              <p className="text-xs tracking-[0.22em] uppercase font-[helve]">
                UR 220
              </p>
            </div>

            <div className="border-t border-black">
              <div className="px-6 py-6">
                <h2 className="text-5xl font-[helve] tracking-tight">URWERK</h2>
              </div>
              <div className="px-6 py-8 grid grid-cols-2 gap-8 items-start">
                <h1 className="text-2xl font-bold text-black font-[helve] leading-snug">
                  A powerful, organic and futuristic sound design for the
                  release of the new creation by prestigious watchmaker Urwerk.
                </h1>
                <p className="text-base leading-relaxed text-black font-[helve]">
                  Urwerk is celebrating the launch of its new watch with a
                  digital campaign featuring a series of films depicting the
                  transition from the UR210, the old model, to the UR220, the
                  new model. This succession is symbolized by a{" "}
                  <span className="font-bold">
                    fight between two falcons, half-animal, half-machine
                  </span>
                  , whose sharp lines are directly{" "}
                  <span className="font-bold">inspired by the design</span> of
                  the Swiss brand’s two watches.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ============================================================
           Sections below render at every breakpoint (siblings of both
           the mobile and the XL hero blocks above).
           ============================================================ */}

        {/* OVERVIEW METRICS — at-a-glance facts about the engagement */}
        <div className="border-t border-black grid grid-cols-2 md:grid-cols-4">
          <Metric label="Year" value="2020" />
          <Metric label="Format" value="4 films" bordered />
          <Metric label="Sound layers" value="42" topBordered bordered />
          <Metric label="Region" value="Worldwide" topBordered bordered />
        </div>

        {/* THE APPROACH — editorial 12-col layout */}
        <div className="border-t border-black px-4 sm:px-6 md:px-10 py-12 md:py-20 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
            <div className="md:col-span-4">
              <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55">
                The approach
              </p>
              <h3 className="mt-3 text-3xl sm:text-4xl md:text-5xl leading-[1.05] tracking-tight font-[helve] text-black">
                A soundscape, not a soundtrack.
              </h3>
            </div>
            <div className="md:col-span-8 space-y-5 text-base md:text-[17px] leading-relaxed font-[helve] text-black/85">
              <p>
                The brief from I-Réel was unusually generous: forget tempo,
                forget melody, build the world the falcons live in. We started
                by sampling the watches themselves — the spring-loaded clicks
                of the satellite hours, the brushed metal scrape of the
                case-back, the breath of the rotor as it spins down.
              </p>
              <p>
                Those mechanical fragments became the DNA of the score. Layered
                against bone-deep sub-bass and a choir of processed falcon
                calls, the result is a sonic palette that sits between living
                and machine — the same hybrid logic that drives the watch
                design.
              </p>
              <p>
                Each of the four films pivots on a single transformation cue:
                a half-second of silence followed by the dominant tone of the
                new model. Watched together, they trace the arc from{" "}
                <span className="font-semibold">UR210</span> to{" "}
                <span className="font-semibold">UR220</span> — folded
                stillness, then unfurled flight.
              </p>
            </div>
          </div>
        </div>

        {/* Two-image gallery — falcon comparison */}
        <div className="border-t border-black grid grid-cols-1 sm:grid-cols-2">
          <figure className="border-b sm:border-b-0 sm:border-r border-black bg-white">
            <img
              src="https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=900&h=600&fit=crop"
              alt="UR210 falcon — folded form resting on rocky outcrop"
              className="block w-full h-56 sm:h-64 md:h-80 lg:h-[420px] object-cover"
              loading="lazy"
            />
          </figure>
          <figure className="bg-white">
            <img
              src="https://images.unsplash.com/photo-1620625515032-6ed0c1790c75?w=900&h=600&fit=crop"
              alt="UR220 falcon — wings unfurled, mid-transformation"
              className="block w-full h-56 sm:h-64 md:h-80 lg:h-[420px] object-cover"
              loading="lazy"
            />
          </figure>
        </div>

        {/* Short caption strip */}
        <div className="border-t border-black px-4 sm:px-6 md:px-10 py-6 md:py-8 bg-white">
          <p className="text-sm md:text-base font-[helve] text-black max-w-3xl">
            From the dense, folded silhouette of the UR210 to the unfurled
            geometry of the UR220 — a transformation captured frame by frame.
          </p>
        </div>

        {/* PULL QUOTE — full-bleed inverted block, breaks the visual rhythm */}
        <div className="border-t border-black bg-black text-white px-4 sm:px-6 md:px-10 py-14 md:py-24">
          <blockquote className="max-w-4xl">
            <span
              aria-hidden="true"
              className="block text-5xl md:text-7xl font-[helve] leading-none text-white/30 mb-4"
            >
              “
            </span>
            <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.15] font-[helve] tracking-tight">
              We wanted you to feel the watch before you saw it — wing-beats,
              gear-bearings, the friction of two species colliding.
            </p>
            <footer className="mt-8 flex items-center gap-3">
              <span className="h-px w-10 bg-white/40" />
              <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-white/65">
                Direction · I-Réel
              </p>
            </footer>
          </blockquote>
        </div>

        {/* Second two-image gallery */}
        <div className="border-t border-black grid grid-cols-1 sm:grid-cols-2">
          <figure className="border-b sm:border-b-0 sm:border-r border-black bg-white">
            <img
              src="https://images.unsplash.com/photo-1495856458515-0637185db551?w=900&h=600&fit=crop"
              alt="UR220 falcon — wing detail"
              className="block w-full h-56 sm:h-64 md:h-80 lg:h-[420px] object-cover"
              loading="lazy"
            />
          </figure>
          <figure className="bg-white">
            <img
              src="https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=900&h=600&fit=crop"
              alt="UR220 falcon — head detail"
              className="block w-full h-56 sm:h-64 md:h-80 lg:h-[420px] object-cover"
              loading="lazy"
            />
          </figure>
        </div>

        {/* Closing reflection */}
        <div className="border-t border-black px-4 sm:px-6 md:px-10 py-12 md:py-20 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
            <div className="md:col-span-4">
              <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55">
                Outcome
              </p>
              <h3 className="mt-3 text-3xl sm:text-4xl md:text-5xl leading-[1.05] tracking-tight font-[helve] text-black">
                A signature, not just a sound.
              </h3>
            </div>
            <div className="md:col-span-8 space-y-5 text-base md:text-[17px] leading-relaxed font-[helve] text-black/85">
              <p>
                The campaign launched across Urwerk’s digital channels and
                trade press in Q3 2020, accompanying the global reveal of the
                UR220. Engagement on the brand’s film posts grew{" "}
                <span className="font-semibold">3.4×</span> versus prior
                releases, with average watch-time on the long-form film
                clearing 71 seconds — unusual for a 90-second cut in the
                horology category.
              </p>
              <p>
                More importantly, the sonic identity carried forward.
                Fragments of the UR220 score now anchor Urwerk’s product
                reveals and showroom installations — the kind of legacy that
                makes a one-off campaign worth the work.
              </p>
            </div>
          </div>
        </div>

        {/* CREDITS — clean two-column k/v list */}
        <div className="border-t border-black px-4 sm:px-6 md:px-10 py-12 md:py-16 bg-white">
          <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55 mb-6 md:mb-8">
            Credits
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 md:gap-x-14 gap-y-3 max-w-5xl">
            {[
              ["Client", "Urwerk"],
              ["Agency / Production", "I-Réel"],
              ["Direction", "Pierre Mavrias"],
              ["Sound Design", "Mooders"],
              ["Original Score", "Mooders"],
              ["3D / Animation", "I-Réel Studio"],
              ["Mix & Master", "Mooders Atelier"],
              ["Year", "2020"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-6 border-b border-black/15 py-2.5"
              >
                <dt className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase font-[helve] text-black/60">
                  {k}
                </dt>
                <dd className="text-sm md:text-[15px] font-[helve] font-semibold text-black text-right">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* NEXT CASE STUDY — editorial split, matches the page's grammar */}
        <a
          href="#"
          className="block border-t border-black bg-white text-black group"
        >
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Text column */}
            <div className="md:col-span-7 px-4 sm:px-6 md:px-10 py-12 md:py-16 lg:py-20 border-b md:border-b-0 md:border-r border-black flex flex-col gap-10 md:gap-12">
              {/* Eyebrow row mirrors the section eyebrows used above */}
              <div className="flex items-center gap-4">
                <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55">
                  Next case study
                </p>
                <span className="h-px flex-1 bg-black/25" />
                <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55">
                  02 / 12
                </p>
              </div>

              <div>
                <h3 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[helve] leading-[1.02] tracking-tight">
                  Hermès <span className="text-black/30">—</span> Carré.
                </h3>
                <p className="mt-5 max-w-xl text-sm sm:text-base font-[helve] text-black/70 leading-relaxed">
                  Ninety years of the silk square — between archive, gesture
                  and craft. Six short films, one continuous score.
                </p>
              </div>

              {/* Footer: service tags + understated underlined CTA */}
              <div className="mt-auto flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
                <ul className="flex flex-wrap gap-x-6 gap-y-1.5 text-[10px] sm:text-[11px] tracking-[0.22em] uppercase font-[helve] text-black/55">
                  <li>Sound design / Music</li>
                  <li>Fashion / Heritage</li>
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

            {/* Image column */}
            <div className="md:col-span-5 relative overflow-hidden bg-white">
              <img
                src="https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1200&h=1400&fit=crop"
                alt="Hermès Carré — next case study"
                className="block w-full h-64 sm:h-80 md:absolute md:inset-0 md:h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                loading="lazy"
              />
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

/**
 * Top-of-page facts strip cell. Two-up on mobile, four-up from md.
 * `bordered` adds a left divider; `topBordered` adds a top divider for the
 * second row on mobile so the 2×2 grid reads cleanly.
 */
function Metric({ label, value, bordered, topBordered }) {
  return (
    <div
      className={[
        "px-4 sm:px-6 md:px-8 py-6 md:py-8 bg-white",
        bordered ? "border-l border-black/30" : "",
        topBordered ? "border-t border-black/30 md:border-t-0" : "",
      ].join(" ")}
    >
      <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/55">
        {label}
      </p>
      <p className="mt-2 text-2xl sm:text-3xl md:text-4xl font-[helve] tracking-tight text-black">
        {value}
      </p>
    </div>
  );
}

export default CaseStudyStatic;
