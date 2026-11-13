import { useEffect, useRef } from 'react';

export default function SpaceBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let isVisible = !document.hidden;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Number of stars scaled to viewport size
    const starCount = Math.min(180, Math.max(90, Math.floor((window.innerWidth * window.innerHeight) / 9000)));

    // Create stars with 3 depth planes for realistic space parallax drift
    const stars = Array.from({ length: starCount }, () => {
      const layer = Math.random(); // 0 to 1
      let speed, radius, baseAlpha;

      if (layer < 0.6) {
        // Distant background stars (60% of total) - very slow drift
        speed = 0.08 + Math.random() * 0.06;
        radius = 0.4 + Math.random() * 0.6;
        baseAlpha = 0.25 + Math.random() * 0.35;
      } else if (layer < 0.9) {
        // Mid-distance stars (30% of total) - medium drift
        speed = 0.18 + Math.random() * 0.12;
        radius = 0.8 + Math.random() * 0.8;
        baseAlpha = 0.45 + Math.random() * 0.4;
      } else {
        // Foreground bright stars (10% of total) - noticeable gentle drift
        speed = 0.32 + Math.random() * 0.18;
        radius = 1.4 + Math.random() * 1.0;
        baseAlpha = 0.7 + Math.random() * 0.3;
      }

      // Drift direction: drifting gently towards bottom-left (-x, +y) like in forward transit
      const angle = Math.PI * 0.78 + (Math.random() - 0.5) * 0.2; // approx 140 degrees
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx,
        vy,
        radius,
        baseAlpha,
        alpha: baseAlpha,
        twinkleSpeed: (0.005 + Math.random() * 0.012) * (Math.random() > 0.5 ? 1 : -1),
        isCyanTint: Math.random() > 0.75, // some stars have faint cyan tint
      };
    });

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        if (!prefersReducedMotion) {
          // Move stars
          star.x += star.vx;
          star.y += star.vy;

          // Wrap around screen edges
          if (star.x < -10) star.x = width + 10;
          else if (star.x > width + 10) star.x = -10;

          if (star.y < -10) star.y = height + 10;
          else if (star.y > height + 10) star.y = -10;

          // Twinkle effect
          star.alpha += star.twinkleSpeed;
          if (star.alpha > Math.min(1, star.baseAlpha + 0.3) || star.alpha < Math.max(0.12, star.baseAlpha - 0.25)) {
            star.twinkleSpeed = -star.twinkleSpeed;
          }
        }

        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);

        const currentAlpha = Math.max(0.1, Math.min(1, star.alpha));
        if (star.isCyanTint) {
          ctx.fillStyle = `rgba(180, 240, 250, ${currentAlpha})`;
        } else {
          ctx.fillStyle = `rgba(235, 245, 255, ${currentAlpha})`;
        }
        ctx.fill();

        // Optional subtle glow for the largest foreground stars
        if (star.radius > 1.6) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(85, 198, 213, ${currentAlpha * 0.18})`;
          ctx.fill();
        }
      }

      if (isVisible && !prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible && !prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    render();

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="space-background" aria-hidden="true">
      {/* Layer 1: Dark Space Radial Atmosphere */}
      <div className="space-radial-base" />

      {/* Layer 2: Moving Starfield Canvas */}
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
