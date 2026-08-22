import { useEffect, useRef } from "react";
import { drawCharacter } from "./engine";
import type { Skin } from "./data";

/** Renders a static skin preview as it looks in-game. */
export default function SkinAvatar({ skin, size = 88 }: { skin: Skin; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = size;
    const h = size;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // subtle stage glow
    const glow = ctx.createRadialGradient(w / 2, h * 0.55, 4, w / 2, h * 0.55, w * 0.5);
    glow.addColorStop(0, `rgba(${skin.trail},0.22)`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // character
    const r = size * 0.16;
    drawCharacter(ctx, 1.2, skin, w / 2, h * 0.52, r, { vy: 0, vx: 0, face: 1 });
    // ground shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.52 + r * 2.1, r * 1.2, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }, [skin, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      className="mx-auto block"
      aria-label={skin.name}
    />
  );
}
