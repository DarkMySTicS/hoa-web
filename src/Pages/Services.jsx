import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import CtaButton from "../components/CtaButton";
import AuroraBackground from "../components/AuroraBackground";
import { useSpotlight } from "../lib/useSpotlight";

const SERVICES = [
  {
    label: "01",
    title: "Brand Strategy & Research",
    body: "The thinking before everything else.",
    points: [
      "Positioning & Market Direction",
      "Consumer & Competitor Insights",
      "Naming, Messaging & Brand Architecture",
    ],
  },
  {
    label: "02",
    title: "Visual Identity & Design",
    body: "Brands people recognize before they read.",
    points: [
      "Logo & Identity Systems",
      "Packaging & Print Design",
      "Art Direction & Brand Guidelines",
    ],
  },
  {
    label: "03",
    title: "Websites & Digital Experiences",
    body: "Built to feel as good as they function.",
    points: [
      "Websites & eCommerce Stores",
      "UI/UX & Product Design",
      "Custom Development & Integrations",
    ],
  },
  {
    label: "04",
    title: "Applications & Technology",
    body: "Technology with brand thinking built in.",
    points: [
      "Mobile & Web Applications",
      "SaaS & Dashboard Systems",
      "Backend & Platform Development",
    ],
  },
  {
    label: "05",
    title: "Content & Social Media",
    body: "Content people actually stay for.",
    points: [
      "Content Strategy & Campaigns",
      "Reels, Carousels & YouTube",
      "Social Media & Community Systems",
    ],
  },
  {
    label: "06",
    title: "Production, Shoots & Films",
    body: "Stories built like cinema.",
    points: [
      "Brand Films & Commercials",
      "Photography & Production",
      "Editing, Motion & CGI",
    ],
  },
  {
    label: "07",
    title: "Performance Marketing & Growth",
    body: "Attention is easy. Conversion isn't.",
    points: [
      "Paid Media & Advertising",
      "Funnels & Conversion Systems",
      "Analytics & Growth Optimization",
    ],
  },
  {
    label: "08",
    title: "Campaigns & Brand Launches",
    body: "Big ideas deserve proper execution.",
    points: [
      "Product & Brand Launches",
      "Omnichannel Campaigns",
      "Influencer & Activation Strategy",
    ],
  },
  {
    label: "09",
    title: "PR & Brand Presence",
    body: "Visibility with intention.",
    points: [
      "Media & PR Strategy",
      "Influencer & Brand Collaborations",
      "Reputation & Cultural Positioning",
    ],
  },
  {
    label: "10",
    title: "Copywriting & Communication",
    body: "Because words shape perception.",
    points: [
      "Brand Messaging & Voice",
      "Website, Ads & Scriptwriting",
      "Email & Communication Systems",
    ],
  },
  {
    label: "11",
    title: "eCommerce & Marketplace Growth",
    body: "Built for modern commerce.",
    points: [
      "Shopify & Marketplace Systems",
      "CRM, Retention & Automation",
      "Product & Conversion Optimization",
    ],
  },
  {
    label: "12",
    title: "Consulting & Advisory",
    body: "Sometimes brands need clarity more than noise.",
    points: [
      "Brand & Marketing Consultation",
      "Creative & Growth Direction",
      "Founder & Expansion Advisory",
    ],
  },
];

const Services = () => {
  const rootRef = useRef(null);
  const { containerRef: glowContainerRef, glowRef } = useSpotlight();

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".sv-bg", { opacity: 0, duration: 1.1, ease: "power2.out" })
        .from(".sv-eyebrow", { y: 12, opacity: 0, duration: 0.6 }, "-=0.7")
        .from(".sv-headline", { y: 28, opacity: 0, duration: 0.9 }, "-=0.5")
        .from(".sv-lede", { y: 16, opacity: 0, duration: 0.7 }, "-=0.55")
        .from(
          ".sv-card",
          { y: 24, opacity: 0, duration: 0.6, stagger: 0.05 },
          "-=0.55",
        )
        .from(".sv-closer", { y: 24, opacity: 0, duration: 0.8 }, "-=0.3")
        .from(".sv-cta", { y: 12, opacity: 0, duration: 0.6 }, "-=0.5");
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={(el) => {
        rootRef.current = el;
        glowContainerRef.current = el;
      }}
      className="relative min-h-screen w-full overflow-x-hidden bg-black text-white"
    >
      <AuroraBackground className="sv-bg" />
      <div ref={glowRef} className="pointer-events-none absolute inset-0 z-[1]" />

      <div className="landscape-tight relative z-10 min-h-screen pt-28 sm:pt-32 pb-20 sm:pb-28">
        <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24">
          {/* Header */}
          <div className="max-w-5xl">
            <div className="sv-eyebrow inline-flex items-center gap-3 text-[11px] tracking-[0.3em] text-white/60 font-[helve]">
              <span className="w-8 h-px bg-white/40" />
              SERVICES — {String(SERVICES.length).padStart(2, "0")}
            </div>
            <h1 className="sv-headline mt-5 font-[sectra] italic text-[44px] sm:text-[68px] md:text-[88px] leading-[0.95] tracking-tight">
              Everything <br />
              a brand needs. <br />
              <span className="text-white/70">Minus the chaos.</span>
            </h1>
            <p className="sv-lede mt-7 max-w-160 font-[helve] text-[14px] sm:text-[16px] leading-relaxed text-white/70">
              More than deliverables. A complete brand ecosystem. We're a 360°
              brand consultancy built for businesses that want clarity,
              consistency, and scale — without juggling freelancers, agencies,
              interns, and "that one guy who does reels."
            </p>
          </div>

          {/* Services grid */}
          <ul className="mt-16 sm:mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-14">
            {SERVICES.map((s) => (
              <li
                key={s.label}
                className="sv-card group relative pt-7 border-t border-white/15 transition-colors duration-300 hover:border-red-500/70"
              >
                <span className="absolute -top-px left-0 h-px w-0 bg-red-500 transition-[width] duration-500 group-hover:w-full" />
                <div className="flex items-start justify-between gap-4">
                  <span className="font-[helve] text-[11px] tracking-[0.3em] text-white/50">
                    {s.label}
                  </span>
                </div>
                <h3 className="mt-3 font-[sectra] italic text-[24px] sm:text-[28px] leading-tight">
                  {s.title}
                </h3>
                <p className="mt-3 font-[helve] text-[13px] sm:text-[14px] leading-relaxed text-white/70">
                  {s.body}
                </p>
                <ul className="mt-5 space-y-1.5 font-[helve] text-[12px] tracking-wide text-white/55">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <span className="h-px w-3 bg-white/30 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {/* Closer — CTA sits right of the "Nothing fragmented" line on
              desktop and drops below both headlines on mobile. */}
          <div className="sv-closer mt-24 sm:mt-32 max-w-full">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-8">
              <h2 className="order-1 font-[sectra] italic text-[40px] sm:text-[60px] md:text-[76px] leading-[0.95] tracking-tight">
                Nothing fragmented.
              </h2>
              <h2 className="order-2 sm:order-3 sm:basis-full font-[sectra] italic text-[40px] sm:text-[60px] md:text-[76px] leading-[0.95] tracking-tight mt-2 sm:mt-4 text-white/70">
                Nothing random.
              </h2>
            </div>
            <CtaButton className="sv-cta-inline shrink-0 order-3 sm:order-2 self-start sm:self-center mt-6 sm:mt-5" />
          </div>

          {/* CTA */}
          <div className="sv-cta mt-16 sm:mt-20 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
            <div className="max-w-150">
              <p className="font-[sectra] italic text-[28px] sm:text-[36px] leading-tight">
                Don't see what you're looking for?
              </p>
              <p className="mt-3 font-[helve] text-[13px] sm:text-[14px] leading-relaxed text-white/65">
                That usually means it sits somewhere between branding,
                marketing, technology, strategy, growth, production, or
                controlled chaos. Good thing we handle all of them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Services;
