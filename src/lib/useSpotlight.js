import { useEffect, useRef } from "react";

// Cursor-tracked radial glow — cheap, direct style writes instead of state,
// so it never triggers a React re-render on mousemove. Attach `containerRef`
// to the positioned section that should track the cursor, and render a
// `pointer-events-none absolute inset-0` div with `glowRef` as its first
// child.
export function useSpotlight({
  radius = 520,
  color = "226,58,82",
  opacity = 0.18,
} = {}) {
  const containerRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const glow = glowRef.current;
    if (!container || !glow) return;
    const onMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      glow.style.background = `radial-gradient(${radius}px circle at ${x}px ${y}px, rgba(${color},${opacity}), transparent 70%)`;
    };
    container.addEventListener("mousemove", onMove);
    return () => container.removeEventListener("mousemove", onMove);
  }, [radius, color, opacity]);

  return { containerRef, glowRef };
}
