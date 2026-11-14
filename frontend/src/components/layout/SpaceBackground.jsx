import { useEffect, useRef } from 'react';

/**
 * A static starfield: drawn once per mount/resize, no per-frame animation.
 * Kept as a canvas (not plain CSS dots) so the varied star sizes/alphas/tint
 * from the original design still render, just without any drift or twinkle.
 */
export default function SpaceBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const draw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const starCount = Math.min(180, Math.max(90, Math.floor((window.innerWidth * window.innerHeight) / 9000)));
      const stars = Array.from({ length: starCount }, () => {
        const layer = Math.random();
        let radius, baseAlpha;
        if (layer < 0.6) {
          radius = 0.4 + Math.random() * 0.6;
          baseAlpha = 0.25 + Math.random() * 0.35;
        } else if (layer < 0.9) {
          radius = 0.8 + Math.random() * 0.8;
          baseAlpha = 0.45 + Math.random() * 0.4;
        } else {
          radius = 1.4 + Math.random() * 1.0;
          baseAlpha = 0.7 + Math.random() * 0.3;
        }
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius,
          baseAlpha,
          isCyanTint: Math.random() > 0.75,
        };
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.isCyanTint
          ? `rgba(180, 240, 250, ${star.baseAlpha})`
          : `rgba(235, 245, 255, ${star.baseAlpha})`;
        ctx.fill();

        if (star.radius > 1.6) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(85, 198, 213, ${star.baseAlpha * 0.18})`;
          ctx.fill();
        }
      }
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

  return (
    <div className="space-background" aria-hidden="true">
      {/* Layer 1: Dark Space Radial Atmosphere */}
      <div className="space-radial-base" />

      {/* Layer 2: Static Starfield Canvas */}
      <canvas ref={canvasRef} className="space-stars-canvas" />

      {/* Layer 3: Earth Limb & Orbital Horizons */}
      <div className="earth-limb-top-right">
        <div className="earth-limb-arc" />
        <div className="earth-limb-glow" />
      </div>

      <div className="earth-limb-sidebar-bottom">
        <div className="earth-sidebar-arc" />
      </div>
    </div>
  );
}
