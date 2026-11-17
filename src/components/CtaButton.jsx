import { useNavigate } from "react-router-dom";

const CtaButton = ({ className = "", hoverText = "START A PROJECT", diffuse = false }) => {
  const navigate = useNavigate();
  const open = () => navigate("/apply");

  // Diffuse variant trades the tight neon shadow for a softer, wider-spread
  // glow — used where a punchier ring would fight the surrounding design.
  const shadowClasses = diffuse
    ? "shadow-[0_12px_55px_-8px_rgba(239,68,68,0.4)] hover:shadow-[0_16px_70px_-8px_rgba(239,68,68,0.55)]"
    : "shadow-[0_0_22px_rgba(239,68,68,0.25)] hover:shadow-[0_0_28px_rgba(239,68,68,0.55)]";

  return (
    <button
      type="button"
      onClick={open}
      className={`cta-pulse group relative inline-flex items-center justify-center overflow-hidden rounded-full px-6 py-2 font-[sectra] italic text-[13px] font-bold tracking-wide bg-white text-red-600 ${shadowClasses} cursor-pointer ${className}`}
    >
      {/* Gradient swap is done as an opacity crossfade rather than an
          animated `background-image`, since gradients don't reliably
          transition across browsers — this keeps the hover fade smooth
          everywhere. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-gradient-to-b from-red-500 via-red-600 to-red-800 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="cta-normal-text relative z-10 block text-red-600 transition-colors duration-200 group-hover:text-white group-hover:opacity-0">
        READY TO BUILD?
      </span>
      <span className="cta-hover-text absolute inset-0 z-10 flex items-center justify-center text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {hoverText}
      </span>
    </button>
  );
};

export default CtaButton;
