"use client";

import { useEffect, useRef } from "react";
import type { BackgroundDef, SkinDef } from "@/lib/catalog";

// Живое анимированное превью персонажа на canvas (та же отрисовка, что в игре)
export function SkinPreviewCanvas({ skin, size = 132 }: { skin: SkinDef; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const PW = 40, PH = 44;
    const parts: { x: number; y: number; vy: number; life: number }[] = [];

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    };

    const draw = (t: number) => {
      g.clearRect(0, 0, size, size);
      const bob = Math.sin(t / 420) * 8;
      const cx = size / 2;
      const cy = size / 2 + bob;

      // Трейл
      if (Math.random() < 0.35) {
        parts.push({ x: cx + (Math.random() - 0.5) * 14, y: cy + PH / 2, vy: 0.6 + Math.random(), life: 0 });
      }
      for (const p of parts) { p.life++; p.y += p.vy; }
      while (parts.length && parts[0].life > 26) parts.shift();
      for (const p of parts) {
        g.globalAlpha = Math.max(0, 1 - p.life / 26) * 0.7;
        g.fillStyle = `rgb(${skin.trail})`;
        g.fillRect(p.x - 1.5, p.y - 1.5, 3.5, 3.5);
      }
      g.globalAlpha = 1;

      g.save();
      g.translate(cx, cy);
      g.rotate(Math.sin(t / 700) * 0.09);

      // Аура
      if (skin.aura) {
        g.fillStyle = skin.aura;
        g.globalAlpha = 0.5 + 0.25 * Math.sin(t / 260);
        g.beginPath(); g.arc(0, 0, 31, 0, 7); g.fill();
        g.globalAlpha = 1;
      }

      // Плащ
      if (skin.cape) {
        const sway = Math.sin(t / 220) * 5;
        g.fillStyle = skin.cape;
        g.beginPath();
        g.moveTo(-PW / 2 + 3, -PH / 2 + 7);
        g.quadraticCurveTo(-PW / 2 - 12 + sway, 4, -PW / 2 - 5 + sway, PH / 2 + 9);
        g.lineTo(PW / 2 + 5 - sway, PH / 2 + 9);
        g.quadraticCurveTo(PW / 2 + 12 - sway, 4, PW / 2 - 3, -PH / 2 + 7);
        g.closePath(); g.fill();
      }

      // Тело
      const grad = g.createLinearGradient(0, -PH / 2, 0, PH / 2);
      grad.addColorStop(0, skin.body1);
      grad.addColorStop(1, skin.body2);
      g.fillStyle = grad;
      roundRect(-PW / 2, -PH / 2, PW, PH, 17);
      g.fill();

      // Головные уборы
      if (skin.hat === "band") {
        g.fillStyle = skin.eye;
        roundRect(-PW / 2, -16, PW, 7, 2); g.fill();
      } else if (skin.hat === "antenna") {
        g.strokeStyle = skin.leg; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(0, -PH / 2); g.lineTo(0, -PH / 2 - 9); g.stroke();
        g.fillStyle = skin.eye;
        g.beginPath(); g.arc(0, -PH / 2 - 12, 3.4, 0, 7); g.fill();
      } else if (skin.hat === "crown") {
        g.fillStyle = "#fbbf24";
        g.beginPath();
        g.moveTo(-12, -PH / 2 - 1); g.lineTo(-12, -PH / 2 - 11);
        g.lineTo(-6, -PH / 2 - 5); g.lineTo(0, -PH / 2 - 13);
        g.lineTo(6, -PH / 2 - 5); g.lineTo(12, -PH / 2 - 11);
        g.lineTo(12, -PH / 2 - 1);
        g.closePath(); g.fill();
      } else if (skin.hat === "horns") {
        g.fillStyle = skin.leg;
        g.beginPath(); g.moveTo(-10, -PH / 2 + 2); g.lineTo(-15, -PH / 2 - 9); g.lineTo(-5, -PH / 2 - 1); g.fill();
        g.beginPath(); g.moveTo(10, -PH / 2 + 2); g.lineTo(15, -PH / 2 - 9); g.lineTo(5, -PH / 2 - 1); g.fill();
      } else if (skin.hat === "halo") {
        g.strokeStyle = "#fde68a"; g.lineWidth = 3.4;
        g.globalAlpha = 0.9;
        g.beginPath(); g.ellipse(0, -PH / 2 - 10, 14, 4.5, 0, 0, 7); g.stroke();
        g.globalAlpha = 1;
      } else if (skin.hat === "cap") {
        g.fillStyle = skin.leg;
        g.beginPath(); g.moveTo(-12, -PH / 2 + 1); g.lineTo(-7, -PH / 2 - 10); g.lineTo(-1, -PH / 2 + 1); g.fill();
        g.beginPath(); g.moveTo(12, -PH / 2 + 1); g.lineTo(7, -PH / 2 - 10); g.lineTo(1, -PH / 2 + 1); g.fill();
      } else if (skin.hat === "helmet") {
        g.fillStyle = skin.leg;
        roundRect(-PW / 2 + 1, -PH / 2 - 4, PW - 2, 13, 6); g.fill();
        g.fillStyle = skin.eye;
        roundRect(-9, -PH / 2 + 1, 18, 3.4, 1.6); g.fill();
      } else if (skin.hat === "wings") {
        g.fillStyle = "#e2e8f0";
        g.beginPath(); g.moveTo(-12, -PH / 2 + 3); g.lineTo(-22, -PH / 2 - 8); g.lineTo(-10, -PH / 2 - 3); g.fill();
        g.beginPath(); g.moveTo(12, -PH / 2 + 3); g.lineTo(22, -PH / 2 - 8); g.lineTo(10, -PH / 2 - 3); g.fill();
        g.fillStyle = skin.leg;
        roundRect(-11, -PH / 2 - 3, 22, 8, 3); g.fill();
      } else if (skin.hat === "hood") {
        g.fillStyle = skin.body2;
        g.beginPath();
        g.moveTo(-PW / 2, -PH / 2 + 9);
        g.quadraticCurveTo(0, -PH / 2 - 10, PW / 2, -PH / 2 + 9);
        g.closePath(); g.fill();
      } else if (skin.hat === "tiara") {
        g.strokeStyle = "#fbbf24"; g.lineWidth = 3;
        g.beginPath(); g.arc(0, -PH / 2 + 2, 12, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
        g.fillStyle = skin.eye;
        g.beginPath(); g.arc(0, -PH / 2 - 5, 3, 0, 7); g.fill();
      } else if (skin.hat === "flame") {
        const f = Math.sin(t / 120) * 2.5;
        g.fillStyle = "#f97316";
        g.beginPath();
        g.moveTo(-8, -PH / 2 + 1);
        g.quadraticCurveTo(-3, -PH / 2 - 11 - f, 0, -PH / 2 - 17 - f);
        g.quadraticCurveTo(3, -PH / 2 - 11 - f, 8, -PH / 2 + 1);
        g.fill();
        g.fillStyle = "#fde047";
        g.beginPath();
        g.moveTo(-4, -PH / 2 + 1);
        g.quadraticCurveTo(-1, -PH / 2 - 7 - f, 0, -PH / 2 - 10 - f);
        g.quadraticCurveTo(1.5, -PH / 2 - 7 - f, 4, -PH / 2 + 1);
        g.fill();
      }

      // Глаза
      const look = Math.sin(t / 900) * 2.5;
      if (skin.eyes === "mask") {
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.moveTo(-14, -12); g.lineTo(-3, -10); g.lineTo(-4.5, -3); g.lineTo(-13, -4.5);
        g.closePath(); g.fill();
        g.beginPath();
        g.moveTo(14, -12); g.lineTo(3, -10); g.lineTo(4.5, -3); g.lineTo(13, -4.5);
        g.closePath(); g.fill();
        g.strokeStyle = skin.eye; g.lineWidth = 1.5; g.stroke();
      } else if (skin.eyes === "glow") {
        g.globalAlpha = 0.65 + 0.35 * Math.sin(t / 200);
        g.fillStyle = skin.eye;
        g.shadowColor = skin.eye; g.shadowBlur = 14;
        roundRect(-13, -12, 10, 5.5, 2.5); g.fill();
        roundRect(3, -12, 10, 5.5, 2.5); g.fill();
        g.shadowBlur = 0; g.globalAlpha = 1;
      } else if (skin.eyes === "visor") {
        g.fillStyle = "#0f172a";
        roundRect(-15, -13, 30, 10, 4); g.fill();
        g.fillStyle = skin.eye;
        roundRect(-11 + look, -11, 22, 5, 2); g.fill();
      } else if (skin.eyes === "cyclops") {
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(0, -8, 11, 0, 7); g.fill();
        g.fillStyle = skin.eye;
        g.beginPath(); g.arc(look, -8, 5.5, 0, 7); g.fill();
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(look + 1.8, -10.5, 2, 0, 7); g.fill();
      } else if (skin.eyes === "cute") {
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(-7, -8, 6.6, 0, 7); g.fill();
        g.beginPath(); g.arc(8, -8, 6.6, 0, 7); g.fill();
        g.fillStyle = skin.eye;
        g.beginPath(); g.arc(-7 + look * 0.5, -7.5, 3.4, 0, 7); g.fill();
        g.beginPath(); g.arc(8 + look * 0.5, -7.5, 3.4, 0, 7); g.fill();
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(-6 + look * 0.5, -9.2, 1.3, 0, 7); g.fill();
        g.beginPath(); g.arc(9 + look * 0.5, -9.2, 1.3, 0, 7); g.fill();
      } else if (skin.eyes === "angry") {
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(4, -8, 8.5, 0, 7); g.fill();
        g.fillStyle = skin.eye;
        g.beginPath(); g.arc(4 + look, -8, 4.4, 0, 7); g.fill();
        g.strokeStyle = skin.leg; g.lineWidth = 2.6;
        g.beginPath(); g.moveTo(-5, -16); g.lineTo(11, -11.5); g.stroke();
      } else {
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(4, -8, 8.5, 0, 7); g.fill();
        g.fillStyle = skin.eye;
        g.beginPath(); g.arc(4 + look, -8, 4.4, 0, 7); g.fill();
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(5.4 + look, -10, 1.4, 0, 7); g.fill();
      }

      // Эмблема или румянец
      if (skin.emblem && skin.emblem !== "none") {
        g.save(); g.translate(0, 8);
        const k = skin.emblem;
        if (k === "star") {
          g.fillStyle = "#fff7ed"; g.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
            const a2 = a + Math.PI / 5;
            g.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
            g.lineTo(Math.cos(a2) * 3.4, Math.sin(a2) * 3.4);
          }
          g.closePath(); g.fill();
        } else if (k === "shield") {
          g.fillStyle = "#f8fafc"; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill();
          g.fillStyle = "#dc2626"; g.beginPath(); g.arc(0, 0, 5.2, 0, 7); g.fill();
          g.fillStyle = "#f8fafc"; g.beginPath(); g.arc(0, 0, 2.4, 0, 7); g.fill();
        } else if (k === "arc") {
          g.globalAlpha = 0.7 + 0.3 * Math.sin(t / 180);
          g.fillStyle = "#a5f3fc"; g.shadowColor = "#22d3ee"; g.shadowBlur = 12;
          g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); g.shadowBlur = 0;
          g.strokeStyle = "#67e8f9"; g.lineWidth = 1.5;
          g.beginPath(); g.arc(0, 0, 8.4, 0, 7); g.stroke(); g.globalAlpha = 1;
        } else if (k === "bolt") {
          g.fillStyle = "#fde047"; g.beginPath();
          g.moveTo(3, -9); g.lineTo(-5, 1); g.lineTo(-0.5, 1);
          g.lineTo(-3, 9); g.lineTo(5, -1); g.lineTo(0.5, -1);
          g.closePath(); g.fill();
        } else if (k === "web") {
          g.strokeStyle = "rgba(15,23,42,0.75)"; g.lineWidth = 1;
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI * 2) / 6;
            g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); g.stroke();
          }
          for (let r = 3.4; r <= 10; r += 3.3) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
        } else if (k === "claw") {
          g.strokeStyle = skin.accent; g.lineWidth = 2;
          for (let i = -1; i <= 1; i++) {
            g.beginPath(); g.moveTo(i * 4.5 - 1, -7);
            g.quadraticCurveTo(i * 4.5 + 2, 0, i * 4.5, 7); g.stroke();
          }
        } else if (k === "hex") {
          g.strokeStyle = skin.eye; g.lineWidth = 2;
          g.globalAlpha = 0.7 + 0.3 * Math.sin(t / 240);
          g.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
            g.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
          }
          g.closePath(); g.stroke(); g.globalAlpha = 1;
        } else if (k === "atom") {
          g.strokeStyle = skin.accent; g.lineWidth = 1.6;
          for (let i = 0; i < 3; i++) {
            g.save(); g.rotate((i * Math.PI) / 3);
            g.beginPath(); g.ellipse(0, 0, 9, 3.8, 0, 0, 7); g.stroke(); g.restore();
          }
        }
        g.restore();
      } else {
        g.fillStyle = skin.accent;
        g.beginPath(); g.arc(-11, -2, 3.6, 0, 7); g.fill();
      }

      // Ножки
      g.fillStyle = skin.leg;
      roundRect(-12, PH / 2 - 4, 9, 8, 3); g.fill();
      roundRect(3, PH / 2 - 4, 9, 8, 3); g.fill();
      g.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [skin, size]);

  return <canvas ref={ref} style={{ width: size, height: size }} />;
}

// Анимированное превью фона с погодным эффектом
export function BackgroundPreviewCanvas({ bg, width = 260, height = 144 }: {
  bg: BackgroundDef; width?: number; height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const stars = Array.from({ length: 26 }, () => ({
      x: Math.random() * width, y: Math.random() * height, s: 0.6 + Math.random() * 1.6,
    }));

    const draw = (t: number) => {
      const grad = g.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, bg.sky[1][2]);
      grad.addColorStop(0.55, bg.sky[1][1]);
      grad.addColorStop(1, bg.sky[3][1]);
      g.fillStyle = grad;
      g.fillRect(0, 0, width, height);

      // Звёзды
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        g.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(t / 700 + i));
        g.fillStyle = `rgb(${bg.star})`;
        g.fillRect(s.x, s.y, s.s, s.s);
      }
      g.globalAlpha = 1;

      // Погода
      const wc = bg.weatherColor;
      if (bg.weather !== "none") {
        for (let i = 0; i < 20; i++) {
          const seed = i * 53.7;
          const x = ((seed * 3.1) % width + Math.sin(t / 900 + i) * 10 + width) % width;
          let speed = 0.03;
          if (bg.weather === "embers" || bg.weather === "bubbles") speed = -0.028;
          if (bg.weather === "rain" || bg.weather === "code") speed = 0.13;
          const y = (((t * speed + seed * 2.3) % (height + 20)) + height + 20) % (height + 20) - 10;
          if (bg.weather === "code") {
            g.globalAlpha = 0.35; g.fillStyle = `rgb(${wc})`;
            g.font = "10px monospace"; g.fillText(i % 2 ? "1" : "0", x, y);
          } else if (bg.weather === "rain") {
            g.globalAlpha = 0.45; g.strokeStyle = `rgb(${wc})`; g.lineWidth = 1.3;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y + 10); g.stroke();
          } else if (bg.weather === "bubbles") {
            g.globalAlpha = 0.4; g.strokeStyle = `rgb(${wc})`; g.lineWidth = 1.2;
            g.beginPath(); g.arc(x, y, 2 + (i % 3), 0, 7); g.stroke();
          } else if (bg.weather === "petals") {
            g.globalAlpha = 0.6; g.fillStyle = `rgb(${wc})`;
            g.save(); g.translate(x, y); g.rotate(t / 600 + i);
            g.beginPath(); g.ellipse(0, 0, 3.4, 1.8, 0, 0, 7); g.fill(); g.restore();
          } else {
            g.globalAlpha = bg.weather === "embers" ? 0.65 : 0.8;
            g.fillStyle = `rgb(${wc})`;
            g.beginPath(); g.arc(x, y, bg.weather === "embers" ? 1.5 : 1.9, 0, 7); g.fill();
          }
        }
        g.globalAlpha = 1;
      }

      // Силуэты платформ
      g.fillStyle = "rgba(255,255,255,0.22)";
      g.fillRect(width * 0.14, height * 0.66, 46, 7);
      g.fillRect(width * 0.58, height * 0.44, 40, 7);
      g.fillRect(width * 0.36, height * 0.24, 34, 7);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bg, width, height]);

  return <canvas ref={ref} style={{ width, height }} className="h-full w-full object-cover" />;
}
