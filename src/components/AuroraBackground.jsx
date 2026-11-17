const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const BLOBS = [
  { key: "a", width: 620, height: 620, top: "-12%", left: "-10%", color: "#b8439b" },
  { key: "b", width: 560, height: 560, top: "2%", right: "-12%", color: "#ec2323" },
  { key: "c", width: 520, height: 520, bottom: "6%", left: "6%", color: "#e23a52" },
  { key: "d", width: 480, height: 480, bottom: "-8%", right: "2%", color: "#7c3aed" },
];

// Fixed ambient backdrop shared by Home4 and Services — stays put as the
// page scrolls over it, matching the fixed-background trick used elsewhere.
const AuroraBackground = ({ className = "" }) => (
  <div
    className={`aurora-bg pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
    aria-hidden="true"
  >
    {BLOBS.map((b) => (
      <div
        key={b.key}
        className={`aurora-blob aurora-blob-${b.key}`}
        style={{
          width: b.width,
          height: b.height,
          top: b.top,
          left: b.left,
          right: b.right,
          bottom: b.bottom,
          // Colour travels as a custom property (not `background`) so the
          // mobile stylesheet rule can swap the solid fill for a gradient —
          // an inline `background` would always win over the stylesheet.
          "--aurora-color": b.color,
        }}
      />
    ))}
    <div
      className="aurora-grain absolute inset-0"
      style={{ backgroundImage: GRAIN }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/70" />
  </div>
);

export default AuroraBackground;
