import { useEffect, useRef } from "react";
import { Download, Zap } from "lucide-react";
import { drawCharacter, mulberry32 } from "./game/engine";
import { DEFAULT_SKIN } from "./game/data";

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawPlat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, h = 12) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillStyle = "rgba(6,3,24,0.95)";
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.shadowBlur = 8;
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 2.5);
  ctx.lineTo(x + w - 8, y + 2.5);
  ctx.stroke();
  ctx.restore();
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.shadowColor = "#fde047";
  ctx.shadowBlur = 16;
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.15, x, y, r);
  g.addColorStop(0, "#fefce8");
  g.addColorStop(0.55, "#fde047");
  g.addColorStop(1, "#d97706");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#92400e";
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, 7);
  ctx.stroke();
  ctx.restore();
}

function nightSky(ctx: CanvasRenderingContext2D, W: number, H: number, seed: number) {
  const rng = mulberry32(seed);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#5b2a86");
  g.addColorStop(0.5, "#241047");
  g.addColorStop(1, "#0a0620");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) {
    ctx.globalAlpha = 0.12 + rng() * 0.75;
    ctx.fillStyle = rng() < 0.2 ? "#a5f3fc" : "#ffffff";
    const r = 0.5 + rng() * 1.8;
    ctx.fillRect(rng() * W, rng() * H, r, r);
  }
  ctx.globalAlpha = 1;
}

function drawIcon(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d")!;
  const S = 512;
  nightSky(ctx, S, S, 7);

  // свечение за героем
  const glow = ctx.createRadialGradient(S / 2, 268, 30, S / 2, 268, 260);
  glow.addColorStop(0, "rgba(103,232,249,0.3)");
  glow.addColorStop(1, "rgba(103,232,249,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // платформы по диагонали
  drawPlat(ctx, 52, 432, 196, "#22d3ee", 15);
  drawPlat(ctx, 268, 386, 176, "#e879f9", 15);
  drawPlat(ctx, 330, 300, 140, "#a78bfa", 13);

  // монеты дугой
  drawCoin(ctx, 296, 344, 14);
  drawCoin(ctx, 336, 332, 14);
  drawCoin(ctx, 376, 344, 14);

  // тень под героем
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(S / 2, 428, 105, 18, 0, 0, 7);
  ctx.fill();

  // герой
  drawCharacter(ctx, 1.2, DEFAULT_SKIN, S / 2, 250, 100, { vy: 0, vx: 0, face: 1 });

  // неоновая рамка
  ctx.strokeStyle = "rgba(103,232,249,0.4)";
  ctx.lineWidth = 6;
  rr(ctx, 8, 8, S - 16, S - 16, 36);
  ctx.stroke();
}

function drawCover(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d")!;
  const W = 800;
  const H = 470;
  nightSky(ctx, W, H, 21);

  // облака
  ctx.fillStyle = "#c4b5fd";
  for (const [bx, by, br] of [
    [140, 90, 60],
    [560, 60, 80],
    [700, 200, 55],
  ]) {
    ctx.globalAlpha = 0.06;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, 7);
    ctx.arc(bx + br * 0.8, by + 10, br * 0.6, 0, 7);
    ctx.arc(bx - br * 0.8, by + 12, br * 0.55, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── левая колонка: заголовок ──
  ctx.textBaseline = "alphabetic";
  const pill = "АРКАДА · НЕОН · ВЫСОТА";
  ctx.font = '700 11px "JetBrains Mono", monospace';
  const pw = ctx.measureText(pill).width + 26;
  ctx.fillStyle = "rgba(232,121,249,0.12)";
  ctx.strokeStyle = "rgba(240,171,252,0.5)";
  ctx.lineWidth = 1;
  rr(ctx, 46, 66, pw, 24, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f0abfc";
  ctx.fillText(pill, 59, 82);

  ctx.font = '900 64px "Unbounded", sans-serif';
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 28;
  ctx.fillStyle = "#a5f3fc";
  ctx.fillText("NEON", 44, 172);
  ctx.shadowColor = "#e879f9";
  ctx.fillStyle = "#f0abfc";
  ctx.fillText("JUMP", 44, 240);
  ctx.shadowBlur = 0;

  ctx.font = '800 16px "JetBrains Mono", monospace';
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("ПРЫГАЙ ВЫШЕ ВСЕХ", 46, 278);
  ctx.font = '400 12px "JetBrains Mono", monospace';
  ctx.fillStyle = "rgba(148,163,184,0.85)";
  ctx.fillText("платформы · враги · джетпаки · монеты", 46, 302);

  // бейджи
  const badges: [string, string][] = [
    ["18 ГЕРОЕВ · 8 ФОНОВ", "#f0abfc"],
    ["БОНУС КАЖДЫЕ 250 М", "#fde047"],
  ];
  ctx.font = '700 11px "JetBrains Mono", monospace';
  badges.forEach(([txt, col], i) => {
    const bw = ctx.measureText(txt).width + 24;
    const by = 326 + i * 34;
    ctx.fillStyle = "rgba(2,0,16,0.55)";
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.2;
    rr(ctx, 46, by, bw, 24, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.fillText(txt, 58, by + 16.5);
  });

  // ── правая сцена ──
  const sx = 0; // сдвиг не нужен
  drawPlat(ctx, 470 - sx, 360, 200, "#22d3ee", 16);
  drawPlat(ctx, 608 - sx, 292, 150, "#e879f9", 14);
  drawPlat(ctx, 430 - sx, 240, 130, "#a78bfa", 13);
  drawCoin(ctx, 610, 256, 13);
  drawCoin(ctx, 648, 244, 13);
  drawCoin(ctx, 686, 256, 13);

  // дрон
  ctx.save();
  ctx.translate(680, 150);
  ctx.shadowColor = "#fb7185";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ef4444";
  rr(ctx, -16, -10, 32, 20, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fee2e2";
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#450a0a";
  ctx.beginPath();
  ctx.arc(1.5, 0, 2.5, 0, 7);
  ctx.fill();
  ctx.restore();

  // частицы-искры под героем
  for (let i = 0; i < 8; i++) {
    ctx.globalAlpha = 0.5 - i * 0.055;
    ctx.fillStyle = i % 2 ? "#fb923c" : "#67e8f9";
    ctx.beginPath();
    ctx.arc(552 + (i % 3 - 1) * 8, 348 + i * 9, 3 - i * 0.2, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // герой
  drawCharacter(ctx, 1.2, DEFAULT_SKIN, 552, 288, 72, { vy: -300, vx: 120, face: 1 });

  // виньетка
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, "rgba(2,0,16,0)");
  v.addColorStop(1, "rgba(2,0,16,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

export default function Brand() {
  const iconRef = useRef<HTMLCanvasElement>(null);
  const coverRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      if (iconRef.current) drawIcon(iconRef.current);
      if (coverRef.current) drawCover(coverRef.current);
    };
    draw();
    void document.fonts?.ready.then(draw);
    return () => {
      cancelled = true;
    };
  }, []);

  const download = (canvas: HTMLCanvasElement | null, name: string) => {
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = name;
    a.click();
  };

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#030014] px-4 py-12 text-slate-100">
      <div className="scanlines pointer-events-none fixed inset-0" />
      <div className="safe-page relative z-10 mx-auto max-w-3xl">
        <a href="#/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/10">
            <Zap className="h-5 w-5 text-cyan-300" />
          </span>
          <span className="font-display text-lg font-black text-white">
            Neon<span className="neon-magenta text-fuchsia-400">Jump</span>
            <span className="ml-2 rounded-md bg-cyan-400/15 px-2 py-0.5 text-[10px] font-bold text-cyan-300">BRAND</span>
          </span>
        </a>
        <p className="mt-3 text-xs text-slate-400">
          Генератор графики для Яндекс.Игр — рисуется движком игры в точных размерах.
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-[auto_1fr]">
          <div>
            <p className="font-display text-sm font-bold text-white">
              Иконка <span className="text-cyan-300">512×512 PNG</span>
            </p>
            <canvas
              ref={iconRef}
              width={512}
              height={512}
              className="mt-3 block h-56 w-56 rounded-2xl border border-cyan-300/25 shadow-[0_0_50px_rgba(34,211,238,0.15)]"
            />
            <button
              onClick={() => download(iconRef.current, "neon-jump-icon-512.png")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-400/10 px-5 py-2.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/20 active:scale-95"
            >
              <Download className="h-4 w-4" />
              Скачать иконку
            </button>
          </div>

          <div>
            <p className="font-display text-sm font-bold text-white">
              Обложка <span className="text-fuchsia-300">800×470 PNG</span>
            </p>
            <canvas
              ref={coverRef}
              width={800}
              height={470}
              className="mt-3 block w-full max-w-[560px] rounded-2xl border border-fuchsia-300/25 shadow-[0_0_50px_rgba(232,121,249,0.15)]"
            />
            <button
              onClick={() => download(coverRef.current, "neon-jump-cover-800x470.png")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-fuchsia-300/50 bg-fuchsia-400/10 px-5 py-2.5 text-xs font-bold text-fuchsia-100 transition hover:bg-fuchsia-300/20 active:scale-95"
            >
              <Download className="h-4 w-4" />
              Скачать обложку
            </button>
          </div>
        </div>

        <p className="mt-10 rounded-2xl border border-slate-700/50 bg-slate-950/50 p-4 text-[11px] leading-relaxed text-slate-500">
          Canvas имеет фиксированные размеры 512×512 и 800×470 — файлы скачаются
          именно в этих размерах (без масштабирования на стороне браузера).
          Загрузи их в черновик игры в консоли developers.yandex.ru/games.
        </p>
      </div>
    </div>
  );
}
