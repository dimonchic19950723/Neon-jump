// ── Neon Jump · engine — faithful to the original GameCanvas mechanics ─
// Units: world column 420 u wide (original 540 px column). 1 m = 8 u (10 px).

import type { Background, Skin } from "./data";

export const WORLD_W = 420;
const ALT_K = 8; // units per meter

const GRAV = 2450;
const JUMP_V = 800;
const MAX_FALL = 800;
const MOVE = 430;
// оригинал: pvx ± 0.9 за кадр² при 60 fps → 0.9 * 60 * 60 * PX ≈ 2520 u/с²
const ACCEL = 2520;
// оригинал: ветер ±0.16 за кадр² → 0.16 * 60 * 60 * PX ≈ 450 u/с²
const WIND_K = 2800;
const PW = 22; // player width (u)
const PH = 28; // player height (u)
const BULLET_V = 750;

export type PlatformType = "normal" | "moving" | "break" | "vanish";
export type EnemyKind = "drone" | "bat" | "ufo";
export type PowerKind = "jetpack" | "shield" | "magnet" | "x2";

export interface Platform {
  x: number; y: number; w: number;
  type: PlatformType; vx: number;
  broken: boolean; fade: number;
  hasSpring: boolean; springOff: number;
  flash: number; seed: number;
}
export interface Enemy {
  x: number; y: number; baseX: number;
  kind: EnemyKind; t: number; amp: number;
  vx: number; r: number;
}
export interface Coin { x: number; y: number; taken: boolean; spin: number; }
export interface Power { x: number; y: number; kind: PowerKind; }
export interface Bullet { x: number; y: number; }
export type ParticleKind = "spark" | "ring" | "trail" | "text" | "flame";
export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  color: string; kind: ParticleKind; text?: string;
}

export interface GameState {
  t: number; rng: () => number;
  camera: number; startY: number; maxY: number; maxM: number;
  viewW: number; viewH: number; offX: number;
  skin: Skin; bg: Background;
  px: number; py: number; pvx: number; pvy: number; face: number;
  prevBottom: number;
  platforms: Platform[]; coinsArr: Coin[]; enemies: Enemy[];
  bullets: Bullet[]; powers: Power[]; particles: Particle[];
  stars: { x: number; y: number; s: number; tw: number }[];
  genY: number; shake: number; flash: number;
  dead: boolean; deathBy: "fall" | "enemy";
  invuln: number;
  shieldUntil: number; magnetUntil: number; x2Until: number; jetpackUntil: number;
  lastShot: number;
  windForce: number; windUntil: number; windNext: number;
  coinsRun: number; kills: number; milestoneAt: number;
  trailAcc: number;
  events: string[];
}

// ── rng & helpers ───────────────────────────────────────────────────

export function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const PX = 0.7778; // 540px → 420u scale

export function getMaxM(s: GameState): number {
  return s.maxM;
}
export function getCoinsRun(s: GameState): number {
  return Math.floor(s.coinsRun);
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(a: string, b: string, k: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`;
}

// ── world creation & generation (exact original tuning) ─────────────

export interface GameOptions {
  milestoneBonus: number;
}

export function createGame(seed: number, skin: Skin, bg: Background, opts: GameOptions): GameState {
  const rng = mulberry32(seed || 1);
  const s: GameState = {
    t: 0, rng,
    camera: 0, startY: 0, maxY: 0, maxM: 0,
    viewW: WORLD_W, viewH: 1000, offX: 0,
    skin, bg,
    px: WORLD_W / 2, py: -31, pvx: 0, pvy: -JUMP_V, face: 1, prevBottom: 0,
    platforms: [], coinsArr: [], enemies: [], bullets: [], powers: [], particles: [],
    stars: Array.from({ length: 130 }, () => ({
      x: 0, y: 0, s: 0, tw: 0,
    })).map(() => ({ x: rng(), y: rng(), s: 0.5 + rng() * 1.6, tw: rng() * 6.28 })),
    genY: 0, shake: 0, flash: 0,
    dead: false, deathBy: "fall", invuln: 0,
    shieldUntil: 0, magnetUntil: 0, x2Until: 0, jetpackUntil: 0,
    lastShot: -1,
    windForce: 0, windUntil: 0, windNext: 62,
    coinsRun: 0, kills: 0, milestoneAt: 250, trailAcc: 0,
    events: [],
  };
  s.maxM = 0;
  s.camera = -1000 * 0.36 - 31; // recalibrated on first render
  s.platforms.push({
    x: WORLD_W / 2 - 35, y: 0, w: 70, type: "normal", vx: 0,
    broken: false, fade: 1, hasSpring: false, springOff: 0, flash: 0, seed: rng(),
  });
  ensurePlatforms(s, 250, opts.milestoneBonus);
  return s;
}

// NOTE: maxM lives on state but declared late — patched below
export interface GameStateWithM extends GameState { maxM: number }

function ensurePlatforms(s: GameState, _milestone = 0, _bonus = 0) {
  void _milestone; void _bonus;
  while (s.genY > s.camera - 700) {
    const m = (s.startY - s.genY) / ALT_K;
    const t = clamp(m / 2200, 0, 1);
    const rng = s.rng;
    const gap = (lerp(56, 112, t) + (6 + rng() * lerp(18, 52, t) - 6)) * PX;
    s.genY -= gap;
    const width = lerp(84, 46, t) * PX;
    const x = 3 + rng() * (WORLD_W - width - 6);

    let type: PlatformType = "normal";
    const roll = rng();
    const pMoving = 0.14 + 0.3 * t;
    const pBreak = m > 260 ? 0.05 + 0.22 * t : 0;
    const pVanish = m > 520 ? 0.16 * t : 0;
    if (roll < pVanish) type = "vanish";
    else if (roll < pVanish + pBreak) type = "break";
    else if (roll < pVanish + pBreak + pMoving) type = "moving";

    const hasSpring = type !== "break" && type !== "vanish" && rng() < 0.05;
    s.platforms.push({
      x, y: s.genY, w: width, type,
      vx: type === "moving" ? (1 + rng() * (1 + 2 * t)) * 60 * PX * (rng() < 0.5 ? -1 : 1) : 0,
      broken: false, fade: 1,
      hasSpring, springOff: hasSpring ? 14 + rng() * (width - 28) : 0,
      flash: 0, seed: rng(),
    });

    // монеты дугой над платформой
    if (rng() < 0.42 && !hasSpring) {
      const n = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        s.coinsArr.push({
          x: x + width / 2 + (i - (n - 1) / 2) * 20,
          y: s.genY - 26 - Math.abs(i - (n - 1) / 2) * 8,
          taken: false, spin: rng() * 6.28,
        });
      }
    }

    // бонус на платформе
    if (rng() < 0.05 && type === "normal" && m > 120) {
      const kinds: PowerKind[] = ["jetpack", "shield", "magnet", "x2"];
      s.powers.push({
        x: x + width / 2, y: s.genY - 20,
        kind: kinds[Math.floor(rng() * kinds.length)],
      });
    }

    // враги
    if (m > 300 && rng() < 0.09 + 0.13 * t) {
      const kind: EnemyKind =
        m > 1050 && rng() < 0.35 ? "ufo" : rng() < 0.5 ? "drone" : "bat";
      s.enemies.push({
        x: 23 + rng() * (WORLD_W - 46),
        baseX: 23 + rng() * (WORLD_W - 46),
        y: s.genY - (47 + rng() * 62),
        kind, t: rng() * 6.28,
        amp: 23 + rng() * 67,
        vx: (28 + rng() * 56) * (rng() < 0.5 ? -1 : 1),
        r: kind === "ufo" ? 14 : 12,
      });
    }
  }
}

// ── particles ───────────────────────────────────────────────────────

function burst(s: GameState, x: number, y: number, color: string, n: number) {
  for (let i = 0; i < n; i++) {
    const a = s.rng() * 6.28;
    const sp = (40 + s.rng() * 130);
    const life = 0.3 + s.rng() * 0.26;
    s.particles.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life, maxLife: life,
      size: 1.6 + s.rng() * 2.4,
      color, kind: "spark",
    });
  }
  if (s.particles.length > 500) s.particles.splice(0, s.particles.length - 500);
}

function ringFx(s: GameState, x: number, y: number, color: string) {
  s.particles.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, size: 8, color, kind: "ring" });
}

export function floatText(s: GameState, x: number, y: number, text: string, color: string) {
  s.particles.push({ x, y, vx: 0, vy: -60, life: 1.1, maxLife: 1.1, size: 11, color, kind: "text", text });
}

// ── death / revive ──────────────────────────────────────────────────

function die(s: GameState, by: "fall" | "enemy") {
  if (s.dead) return;
  s.dead = true;
  s.deathBy = by;
  s.shake = 14;
  s.events.push("gameover");
}

export function revive(s: GameState) {
  const y = s.camera + s.viewH * 0.3;
  s.platforms.push({
    x: WORLD_W / 2 - 35, y: y + 55, w: 70, type: "normal", vx: 0,
    broken: false, fade: 1, hasSpring: false, springOff: 0, flash: 1, seed: s.rng(),
  });
  s.px = WORLD_W / 2;
  s.py = y;
  s.pvy = -JUMP_V * 1.05;
  s.pvx = 0;
  s.dead = false;
  s.invuln = 0;
  s.shieldUntil = s.t + 3;
  s.enemies = s.enemies.filter((e) => Math.abs(e.y - y) > 125);
}

// ── shooting ────────────────────────────────────────────────────────

export function tryShoot(s: GameState) {
  if (s.dead) return;
  if (s.t - s.lastShot < 0.26) return;
  s.lastShot = s.t;
  s.bullets.push({ x: s.px, y: s.py - PH / 2 - 5 });
  s.events.push("shoot");
}

// ── update ──────────────────────────────────────────────────────────

export function update(
  s: GameState,
  input: { left: boolean; right: boolean },
  dtRaw: number,
  milestoneBonus: number
) {
  const dt = Math.min(dtRaw, 1 / 20);
  s.t += dt;

  // ветер после 620 м
  if (s.maxM > 620) {
    if (s.t > s.windNext) {
      s.windForce = (s.rng() * 2 - 1) * 0.16;
      if (Math.abs(s.windForce) < 0.07) s.windForce = 0;
      s.windUntil = s.t + 2.5 + s.rng() * 3;
      s.windNext = s.windUntil + 4 + s.rng() * 5;
    }
  }
  const wind = s.t < s.windUntil ? s.windForce : 0;

  // управление
  if (!s.dead) {
    if (input.left) {
      s.pvx = Math.max(-MOVE, s.pvx - ACCEL * dt);
      s.face = -1;
    } else if (input.right) {
      s.pvx = Math.min(MOVE, s.pvx + ACCEL * dt);
      s.face = 1;
    } else {
      s.pvx *= Math.pow(0.86, dt * 60);
    }
  }
  s.pvx += wind * WIND_K * dt;
  s.px += s.pvx * dt;
  if (s.px < -PW / 2) s.px = WORLD_W + PW / 2;
  if (s.px > WORLD_W + PW / 2) s.px = -PW / 2;

  // вертикаль
  s.prevBottom = s.py + PH / 2;
  const jet = s.t < s.jetpackUntil;
  if (jet && !s.dead) {
    s.pvy = -818;
    for (let i = 0; i < 2; i++) {
      s.particles.push({
        x: s.px + (s.rng() * 12 - 6), y: s.py + PH / 2,
        vx: (s.rng() - 0.5) * 60, vy: 120 + s.rng() * 180,
        life: 0.24 + s.rng() * 0.14, maxLife: 0.38,
        size: 2.4 + s.rng() * 2.4,
        color: s.rng() < 0.5 ? "#fb923c" : "#f43f5e", kind: "flame",
      });
    }
  } else {
    s.pvy += GRAV * dt;
    s.pvy = Math.min(s.pvy, MAX_FALL);
  }
  s.py += s.pvy * dt;

  // камера (плавная, только вверх)
  const targetCam = s.py - s.viewH * 0.36;
  if (targetCam < s.camera) s.camera += (targetCam - s.camera) * Math.min(1, dt * 13);
  s.maxM = Math.max(s.maxM, (s.startY - s.py) / ALT_K);

  // майлстоуны
  if (s.maxM >= s.milestoneAt) {
    s.coinsRun += milestoneBonus;
    s.events.push(`milestone:${Math.floor(s.milestoneAt)}:${milestoneBonus}`);
    s.milestoneAt += 250;
  }

  ensurePlatforms(s, 0, 0);

  // платформы
  for (const p of s.platforms) {
    if (p.type === "moving") {
      p.x += p.vx * dt;
      if (p.x < 2 || p.x + p.w > WORLD_W - 2) p.vx *= -1;
    }
    if (p.fade < 1) p.fade = Math.max(0, p.fade - 2.4 * dt);
    if (p.broken) p.y += 187 * dt;
    if (p.flash > 0) p.flash = Math.max(0, p.flash - dt * 4);
  }
  s.platforms = s.platforms.filter((p) => p.y - s.camera < s.viewH + 125 && p.fade > 0.02);

  // столкновение при падении
  if (s.pvy > 0 && !jet && !s.dead) {
    for (const p of s.platforms) {
      if (p.broken || p.fade < 0.4) continue;
      const top = p.y;
      if (
        s.prevBottom <= top + 1 &&
        s.py + PH / 2 >= top &&
        s.px + PW / 2 > p.x &&
        s.px - PW / 2 < p.x + p.w
      ) {
        if (p.hasSpring) {
          s.pvy = -JUMP_V * 1.85;
          p.hasSpring = false;
          burst(s, s.px, top, "#f43f5e", 14);
          ringFx(s, s.px, top, "#f43f5e");
          s.events.push("spring");
        } else {
          s.pvy = -JUMP_V;
          s.events.push("jump");
        }
        if (p.type === "moving") s.pvx += p.vx * 0.35;
        if (p.type === "break") {
          p.broken = true;
          s.events.push("break");
        }
        if (p.type === "vanish") p.fade = 0.99;
        p.flash = 1;
        for (let i = 0; i < 4; i++) {
          s.particles.push({
            x: s.px + (s.rng() * 22 - 11), y: top,
            vx: (s.rng() - 0.5) * 120, vy: -40 - s.rng() * 120,
            life: 0.2 + s.rng() * 0.16, maxLife: 0.36,
            size: 1.2 + s.rng() * 1.8,
            color: "rgba(255,255,255,0.8)", kind: "spark",
          });
        }
        break;
      }
    }
  }

  // монеты
  const magnet = s.t < s.magnetUntil;
  const mult = s.t < s.x2Until ? 2 : 1;
  for (const c of s.coinsArr) {
    if (c.taken) continue;
    if (magnet) {
      const dx = s.px - c.x, dy = s.py - c.y;
      const d = Math.hypot(dx, dy);
      if (d < 117 && d > 1) {
        c.x += (dx / d) * 205 * dt;
        c.y += (dy / d) * 205 * dt;
      }
    }
    if (Math.abs(s.px - c.x) < 20 && Math.abs(s.py - c.y) < 23) {
      c.taken = true;
      s.coinsRun += 1 * mult;
      burst(s, c.x, c.y, "#fbbf24", 6);
      s.events.push("coin");
    }
  }
  s.coinsArr = s.coinsArr.filter((c) => !c.taken && c.y - s.camera < s.viewH + 78);

  // бонусы
  for (const p of s.powers) {
    if (Math.abs(s.px - p.x) < 23 && Math.abs(s.py - p.y) < 26) {
      p.y = -99999;
      s.events.push(`power:${p.kind}`);
      if (p.kind === "jetpack") {
        s.jetpackUntil = s.t + 1.4;
        burst(s, s.px, s.py, "#fb923c", 14);
      }
      if (p.kind === "shield") s.shieldUntil = s.t + 999;
      if (p.kind === "magnet") s.magnetUntil = s.t + 6.5;
      if (p.kind === "x2") s.x2Until = s.t + 8;
    }
  }
  s.powers = s.powers.filter((p) => p.y > -1000 && p.y - s.camera < s.viewH + 62);

  // пули
  for (const b of s.bullets) b.y -= BULLET_V * dt;
  s.bullets = s.bullets.filter((b) => b.y > s.camera - 31);

  // враги
  for (const e of s.enemies) {
    e.t += 1.8 * dt;
    if (e.kind === "drone") {
      e.x += e.vx * dt;
      if (e.x < e.r || e.x > WORLD_W - e.r) e.vx *= -1;
    } else if (e.kind === "bat") {
      e.baseX += e.vx * 0.5 * dt;
      if (e.baseX < e.amp + e.r || e.baseX > WORLD_W - e.amp - e.r) e.vx *= -1;
      e.x = e.baseX + Math.sin(e.t) * e.amp;
    } else {
      const dx = s.px - e.x;
      e.x += clamp(dx, -1, 1) * 33 * dt;
    }

    for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
      const b = s.bullets[bi];
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 4) {
        s.bullets.splice(bi, 1);
        e.y = -99999;
        s.kills++;
        s.coinsRun += 6 * mult;
        burst(s, e.x, e.y, "#f87171", 18);
        s.events.push("enemy");
        break;
      }
    }

    if (!s.dead && s.invuln <= 0 && Math.hypot(s.px - e.x, s.py - e.y) < e.r + PW / 2.1) {
      if (s.t < s.shieldUntil) {
        e.y = -99999;
        s.shieldUntil = 0;
        s.pvy = -JUMP_V;
        s.coinsRun += 6 * mult;
        burst(s, e.x, e.y, "#22d3ee", 20);
        s.events.push("enemy");
      } else {
        die(s, "enemy");
      }
    }
  }
  s.enemies = s.enemies.filter((e) => e.y > -9000 && e.y - s.camera < s.viewH + 94);

  // частицы
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const q = s.particles[i];
    q.life -= dt;
    if (q.life <= 0) { s.particles.splice(i, 1); continue; }
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    if (q.kind === "ring") q.size += 240 * dt;
  }

  // шлейф скина
  s.trailAcc += dt;
  while (s.trailAcc > 0.02) {
    s.trailAcc -= 0.02;
    if (Math.abs(s.pvy) > 190) {
      s.particles.push({
        x: s.px + (s.rng() * 9 - 4.5), y: s.py + PH / 2,
        vx: 0, vy: 30 + s.rng() * 60,
        life: 0.28, maxLife: 0.28, size: 1.6 + s.rng() * 1.6,
        color: `rgba(${s.skin.trail},0.75)`, kind: "trail",
      });
    }
  }

  if (s.invuln > 0) s.invuln -= dt;
  if (!s.dead && s.py - s.camera > s.viewH + 70) die(s, "fall");
  if (s.shake > 0) s.shake = Math.max(0, s.shake - 60 * dt);
  if (s.flash > 0) s.flash = Math.max(0, s.flash - 2.4 * dt);
}

// ── renderer helpers ────────────────────────────────────────────────

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function skyColors(bg: Background, alt: number): { top: string; bottom: string } {
  const stops = bg.sky;
  if (alt <= stops[0][0]) return { bottom: stops[0][1], top: stops[0][2] };
  for (let i = 0; i < stops.length - 1; i++) {
    const [a0, b0, t0] = stops[i];
    const [a1, b1, t1] = stops[i + 1];
    if (alt <= a1) {
      const k = (alt - a0) / (a1 - a0);
      return { bottom: lerpColor(b0, b1, k), top: lerpColor(t0, t1, k) };
    }
  }
  const last = stops[stops.length - 1];
  return { bottom: last[1], top: last[2] };
}

// ── CHARACTER (original style: rounded body, one big eye, hats, legs) ─

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  t: number,
  skin: Skin,
  x: number,
  y: number,
  r: number,
  opts: { vy: number; vx: number; face: number; invuln?: number; shield?: boolean }
) {
  const PWu = 22 * (r / 14);
  const PHu = 28 * (r / 14);
  const tilt = clamp(opts.vx * 0.00065, -0.28, 0.28);
  const squash = clamp(Math.abs(opts.vy) / 445, 0, 0.24);

  ctx.save();
  ctx.translate(x, y);
  if (opts.invuln && opts.invuln > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 22);
  ctx.rotate(tilt);

  // щит
  if (opts.shield) {
    ctx.strokeStyle = "rgba(34,211,238,0.8)";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 6.7);
    ctx.beginPath();
    ctx.arc(0, 0, 23 * (r / 14), 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // аура
  if (skin.aura) {
    ctx.fillStyle = skin.aura;
    ctx.globalAlpha = 0.5 + 0.25 * Math.sin(t * 3.8);
    ctx.beginPath();
    ctx.arc(0, 0, 20 * (r / 14), 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // плащ
  if (skin.cape) {
    const sway = Math.sin(t * 4.5) * 3.4;
    ctx.fillStyle = skin.cape;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(-PWu / 2 + 2.3, -PHu / 2 + 4.7);
    ctx.quadraticCurveTo(-PWu / 2 - 7.8 + sway, 3, -PWu / 2 - 3 + sway, PHu / 2 + 6);
    ctx.lineTo(PWu / 2 + 3 - sway, PHu / 2 + 6);
    ctx.quadraticCurveTo(PWu / 2 + 7.8 - sway, 3, PWu / 2 - 2.3, -PHu / 2 + 4.7);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // тело
  ctx.save();
  ctx.scale(1 + squash * 0.4, 1 - squash);
  const grad = ctx.createLinearGradient(0, -PHu / 2, 0, PHu / 2);
  grad.addColorStop(0, skin.body1);
  grad.addColorStop(1, skin.body2);
  ctx.fillStyle = grad;
  ctx.shadowColor = `rgb(${skin.trail})`;
  ctx.shadowBlur = 12;
  rrect(ctx, -PWu / 2, -PHu / 2, PWu, PHu, 11.7 * (r / 14));
  ctx.fill();
  ctx.shadowBlur = 0;

  const k = (r / 14) * 0.78; // px→u
  const look = clamp(opts.vx * 0.0054, -2.3 * (r / 14), 2.3 * (r / 14));
  const faceOff = 3.1 * (r / 14) * opts.face;

  // ── шляпы ──
  if (skin.hat === "band") {
    ctx.fillStyle = skin.eye;
    rrect(ctx, -PWu / 2, -11 * k, PWu, 4.7 * k, 1.6);
    ctx.fill();
  } else if (skin.hat === "antenna") {
    ctx.strokeStyle = skin.leg;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -PHu / 2);
    ctx.lineTo(0, -PHu / 2 - 6.2 * k);
    ctx.stroke();
    ctx.fillStyle = skin.eye;
    ctx.beginPath();
    ctx.arc(0, -PHu / 2 - 7.8 * k, 2.3 * k, 0, 7);
    ctx.fill();
  } else if (skin.hat === "crown") {
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(-7.8 * k, -PHu / 2 - 0.8);
    ctx.lineTo(-7.8 * k, -PHu / 2 - 7);
    ctx.lineTo(-3.9 * k, -PHu / 2 - 3.1);
    ctx.lineTo(0, -PHu / 2 - 8.6);
    ctx.lineTo(3.9 * k, -PHu / 2 - 3.1);
    ctx.lineTo(7.8 * k, -PHu / 2 - 7);
    ctx.lineTo(7.8 * k, -PHu / 2 - 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (skin.hat === "horns") {
    ctx.fillStyle = skin.leg;
    ctx.beginPath();
    ctx.moveTo(-7 * k, -PHu / 2 + 1.6);
    ctx.lineTo(-10 * k, -PHu / 2 - 6.2);
    ctx.lineTo(-3.1 * k, -PHu / 2 - 0.8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(7 * k, -PHu / 2 + 1.6);
    ctx.lineTo(10 * k, -PHu / 2 - 6.2);
    ctx.lineTo(3.1 * k, -PHu / 2 - 0.8);
    ctx.fill();
  } else if (skin.hat === "halo") {
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 2.4;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(0, -PHu / 2 - 7 * k, 9.4 * k, 3.1 * k, 0, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (skin.hat === "cap") {
    ctx.fillStyle = skin.leg;
    ctx.beginPath();
    ctx.moveTo(-8.6 * k, -PHu / 2 + 0.8);
    ctx.lineTo(-4.7 * k, -PHu / 2 - 7);
    ctx.lineTo(-0.8 * k, -PHu / 2 + 0.8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8.6 * k, -PHu / 2 + 0.8);
    ctx.lineTo(4.7 * k, -PHu / 2 - 7);
    ctx.lineTo(0.8 * k, -PHu / 2 + 0.8);
    ctx.fill();
  } else if (skin.hat === "helmet") {
    ctx.fillStyle = skin.leg;
    rrect(ctx, -PWu / 2 + 0.8, -PHu / 2 - 2.3, PWu - 1.6, 9.4 * k, 4.7);
    ctx.fill();
    ctx.fillStyle = skin.eye;
    rrect(ctx, -6.2 * k, -PHu / 2 + 0.8, 12.5 * k, 2.3 * k, 1.2);
    ctx.fill();
  } else if (skin.hat === "wings") {
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(-8.6 * k, -PHu / 2 + 2.3);
    ctx.lineTo(-15.6 * k, -PHu / 2 - 5.5);
    ctx.lineTo(-7 * k, -PHu / 2 - 2.3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8.6 * k, -PHu / 2 + 2.3);
    ctx.lineTo(15.6 * k, -PHu / 2 - 5.5);
    ctx.lineTo(7 * k, -PHu / 2 - 2.3);
    ctx.fill();
    ctx.fillStyle = skin.leg;
    rrect(ctx, -7.8 * k, -PHu / 2 - 1.6, 15.6 * k, 5.5 * k, 2.3);
    ctx.fill();
  } else if (skin.hat === "hood") {
    ctx.fillStyle = skin.body2;
    ctx.beginPath();
    ctx.moveTo(-PWu / 2, -PHu / 2 + 6.2);
    ctx.quadraticCurveTo(0, -PHu / 2 - 7, PWu / 2, -PHu / 2 + 6.2);
    ctx.closePath();
    ctx.fill();
  } else if (skin.hat === "tiara") {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -PHu / 2 + 1.6, 8.6 * k, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.fillStyle = skin.eye;
    ctx.beginPath();
    ctx.arc(0, -PHu / 2 - 3.1, 2 * k, 0, 7);
    ctx.fill();
  } else if (skin.hat === "flame") {
    const f = Math.sin(t * 8.3) * 1.6;
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(-5.5 * k, -PHu / 2 + 0.8);
    ctx.quadraticCurveTo(-2.3 * k, -PHu / 2 - 7.8 - f, 0, -PHu / 2 - 11.7 - f);
    ctx.quadraticCurveTo(2.3 * k, -PHu / 2 - 7.8 - f, 5.5 * k, -PHu / 2 + 0.8);
    ctx.fill();
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.moveTo(-2.7 * k, -PHu / 2 + 0.8);
    ctx.quadraticCurveTo(-0.8 * k, -PHu / 2 - 4.7 - f, 0, -PHu / 2 - 7 - f);
    ctx.quadraticCurveTo(1.2 * k, -PHu / 2 - 4.7 - f, 2.7 * k, -PHu / 2 + 0.8);
    ctx.fill();
  }

  // ── глаза ──
  const eyeCX = faceOff;
  if (skin.eyes === "mask") {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-10 * k, -8.6 * k);
    ctx.lineTo(-2.3 * k, -7 * k);
    ctx.lineTo(-3.1 * k, -2.3 * k);
    ctx.lineTo(-9.4 * k, -3.1 * k);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10 * k, -8.6 * k);
    ctx.lineTo(2.3 * k, -7 * k);
    ctx.lineTo(3.1 * k, -2.3 * k);
    ctx.lineTo(9.4 * k, -3.1 * k);
    ctx.closePath();
    ctx.fill();
  } else if (skin.eyes === "glow") {
    const pulse = 0.65 + 0.35 * Math.sin(t * 5);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = skin.eye;
    ctx.shadowColor = skin.eye;
    ctx.shadowBlur = 9;
    rrect(ctx, -9.4 * k, -8.6 * k, 7 * k, 3.9 * k, 2);
    ctx.fill();
    rrect(ctx, 2.3 * k, -8.6 * k, 7 * k, 3.9 * k, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  } else if (skin.eyes === "visor") {
    ctx.fillStyle = "#0f172a";
    rrect(ctx, -10 * k, -9.4 * k, 20 * k, 7 * k, 3.1);
    ctx.fill();
    ctx.fillStyle = skin.eye;
    rrect(ctx, -7.8 * k + look, -7.8 * k, 15.6 * k, 3.1 * k, 1.6);
    ctx.fill();
  } else if (skin.eyes === "cyclops") {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, -6.2 * k, 7.8 * k, 0, 7);
    ctx.fill();
    ctx.fillStyle = skin.eye;
    ctx.beginPath();
    ctx.arc(look, -6.2 * k, 3.9 * k, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(look + 1.2 * k, -7.8 * k, 1.4 * k, 0, 7);
    ctx.fill();
  } else if (skin.eyes === "cute") {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-4.7 * k, -6.2 * k, 4.7 * k, 0, 7);
    ctx.arc(5.5 * k, -6.2 * k, 4.7 * k, 0, 7);
    ctx.fill();
    ctx.fillStyle = skin.eye;
    ctx.beginPath();
    ctx.arc(-4.7 * k + look * 0.5, -5.8 * k, 2.5 * k, 0, 7);
    ctx.arc(5.5 * k + look * 0.5, -5.8 * k, 2.5 * k, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-3.9 * k + look * 0.5, -7 * k, 0.9 * k, 0, 7);
    ctx.arc(6.2 * k + look * 0.5, -7 * k, 0.9 * k, 0, 7);
    ctx.fill();
  } else if (skin.eyes === "angry") {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(eyeCX, -6.2 * k, 6.2 * k, 0, 7);
    ctx.fill();
    ctx.fillStyle = skin.eye;
    ctx.beginPath();
    ctx.arc(eyeCX + look, -6.2 * k, 3.1 * k, 0, 7);
    ctx.fill();
    ctx.strokeStyle = skin.leg;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(eyeCX - 6.2 * k, -11.7 * k);
    ctx.lineTo(eyeCX + 5.5 * k, -8.6 * k);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(eyeCX, -6.2 * k, 6.2 * k, 0, 7);
    ctx.fill();
    ctx.fillStyle = skin.eye;
    ctx.beginPath();
    ctx.arc(eyeCX + look, -6.2 * k, 3.1 * k, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(eyeCX + look + 0.9 * k, -7.4 * k, 1 * k, 0, 7);
    ctx.fill();
  }

  // румянец или эмблема
  if (!skin.emblem) {
    ctx.fillStyle = skin.accent;
    ctx.beginPath();
    ctx.arc(-7 * (r / 14) * opts.face, -2.3 * k, 2.7 * k, 0, 7);
    ctx.fill();
  } else {
    drawEmblem(ctx, skin.emblem, skin.eye, skin.accent, t, k);
  }

  // ножки
  const legY = opts.vy > 95 ? 1.6 : 0;
  ctx.fillStyle = skin.leg;
  rrect(ctx, -8.6 * (r / 14), PHu / 2 - 3.1 - legY, 6.2 * (r / 14), 5.4 * (r / 14), 2.3);
  ctx.fill();
  rrect(ctx, 2.3 * (r / 14), PHu / 2 - 3.1 - legY, 6.2 * (r / 14), 5.4 * (r / 14), 2.3);
  ctx.fill();

  ctx.restore(); // un-squash
  ctx.restore();
}

function drawEmblem(
  ctx: CanvasRenderingContext2D,
  emblem: string,
  eye: string,
  accent: string,
  t: number,
  k: number
) {
  const y = 4.7 * k;
  ctx.save();
  ctx.translate(0, y);
  if (emblem === "arc") {
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 7;
    ctx.strokeStyle = "#a5f3fc";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 3.9 * k, 0, 7);
    ctx.stroke();
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.arc(0, 0, 1.6 * k, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (emblem === "web") {
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 5 * k, Math.sin(a) * 5 * k);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 2.5 * k, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 4.3 * k, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (emblem === "shield") {
    ctx.fillStyle = "#fca5a5";
    ctx.beginPath();
    ctx.arc(0, 0, 4.3 * k, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    starPath(ctx, 0, 0, 2.9 * k, 1.2 * k);
  } else if (emblem === "atom") {
    ctx.strokeStyle = "rgba(240,253,244,0.85)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.7 * k, 1.8 * k, t % Math.PI, 0, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.7 * k, 1.8 * k, (t % Math.PI) + Math.PI / 2, 0, 7);
    ctx.stroke();
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(0, 0, 1.2 * k, 0, 7);
    ctx.fill();
  } else if (emblem === "bolt") {
    ctx.fillStyle = eye === "#38bdf8" ? "#fde047" : eye;
    ctx.beginPath();
    ctx.moveTo(0.8 * k, -4.7 * k);
    ctx.lineTo(-2.3 * k, 0.8 * k);
    ctx.lineTo(0.2 * k, 0.8 * k);
    ctx.lineTo(-0.8 * k, 4.7 * k);
    ctx.lineTo(2.3 * k, -0.8 * k);
    ctx.lineTo(0, -0.8 * k);
    ctx.closePath();
    ctx.fill();
  } else if (emblem === "claw") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 3.2 * k - 1.6, -2.5 * k);
      ctx.lineTo(i * 3.2 * k + 1.6, 2.5 * k);
      ctx.stroke();
    }
  } else if (emblem === "hex") {
    ctx.strokeStyle = "#fca5a5";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * 3.6 * k;
      const py = Math.sin(a) * 3.6 * k;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (emblem === "star") {
    ctx.fillStyle = "#fef08a";
    starPath(ctx, 0, 0, 4.3 * k, 1.8 * k);
  }
  ctx.restore();
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, r2: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? R : r2;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// ── weather ─────────────────────────────────────────────────────────

function drawWeather(ctx: CanvasRenderingContext2D, bg: Background, t: number, W: number, H: number) {
  const [wr, wg, wb] = bg.weatherColor.split(",").map(Number);
  if (bg.weather === "snow") {
    for (let i = 0; i < 40; i++) {
      const speed = 16 + hash(i * 3.1) * 26;
      const x = ((hash(i * 7.7) * W + Math.sin(t * 0.8 + i) * 14) % W + W) % W;
      const y = (hash(i * 5.3) * (H + 20) + t * speed) % (H + 20) - 10;
      ctx.globalAlpha = 0.25 + hash(i * 2.9) * 0.4;
      ctx.fillStyle = `rgb(${wr},${wg},${wb})`;
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + hash(i * 1.7) * 1.6, 0, 7);
      ctx.fill();
    }
  } else if (bg.weather === "petals") {
    for (let i = 0; i < 22; i++) {
      const speed = 14 + hash(i * 3.3) * 20;
      const x = ((hash(i * 9.1) * W + Math.sin(t * 0.9 + i * 2) * 22) % W + W) % W;
      const y = (hash(i * 4.7) * (H + 20) + t * speed) % (H + 20) - 10;
      ctx.save();
      ctx.globalAlpha = 0.3 + hash(i * 2.2) * 0.35;
      ctx.translate(x, y);
      ctx.rotate(t * 1.5 + i);
      ctx.fillStyle = `rgb(${wr},${wg},${wb})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, 7);
      ctx.fill();
      ctx.restore();
    }
  } else if (bg.weather === "bubbles") {
    for (let i = 0; i < 26; i++) {
      const speed = 20 + hash(i * 6.1) * 34;
      const x = ((hash(i * 3.7) * W + Math.sin(t * 0.6 + i) * 10) % W + W) % W;
      const y = H + 10 - ((hash(i * 8.3) * (H + 20) + t * speed) % (H + 20));
      ctx.globalAlpha = 0.18 + hash(i * 2.5) * 0.3;
      ctx.strokeStyle = `rgb(${wr},${wg},${wb})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + hash(i * 1.3) * 3, 0, 7);
      ctx.stroke();
    }
  } else if (bg.weather === "embers") {
    for (let i = 0; i < 30; i++) {
      const speed = 24 + hash(i * 5.9) * 42;
      const x = ((hash(i * 4.3) * W + Math.sin(t * 1.2 + i * 3) * 18) % W + W) % W;
      const y = H + 10 - ((hash(i * 7.9) * (H + 20) + t * speed) % (H + 20));
      const flick = 0.5 + 0.5 * Math.sin(t * 9 + i * 5);
      ctx.globalAlpha = (0.2 + hash(i * 2.1) * 0.4) * flick;
      ctx.fillStyle = `rgb(${wr},${wg},${Math.round(wb * 0.5)})`;
      ctx.beginPath();
      ctx.arc(x, y, 0.9 + hash(i * 1.9) * 1.4, 0, 7);
      ctx.fill();
    }
  } else if (bg.weather === "code") {
    const GLYPHS = "01NJΔ◊ЖΞ01ZП7";
    ctx.font = '700 10px "JetBrains Mono", monospace';
    for (let c = 0; c < 13; c++) {
      const x = hash(c * 12.7) * W;
      const speed = 55 + hash(c * 3.3) * 70;
      const base = (hash(c * 9.2) * (H + 220) + t * speed) % (H + 220) - 110;
      for (let j = 0; j < 7; j++) {
        const g = GLYPHS[Math.floor(hash(c * 31 + j * 7 + Math.floor(t * 2.5)) * GLYPHS.length)];
        ctx.globalAlpha = (j === 0 ? 0.55 : 0.4 - j * 0.055) * (0.7 + 0.3 * Math.sin(t * 3 + c));
        ctx.fillStyle = j === 0 ? "#e7fce9" : `rgb(${wr},${wg},${wb})`;
        ctx.fillText(g, x, base - j * 13);
      }
    }
  } else if (bg.weather === "rain") {
    for (let i = 0; i < 16; i++) {
      const speed = 260 + hash(i * 7.3) * 240;
      const span = H + 260;
      const prog = (hash(i * 11.7) * span + t * speed) % span;
      const x = W + 40 - prog * 0.55;
      const y = prog - 130;
      const len = 22 + hash(i * 3.9) * 30;
      const fade = Math.sin(Math.min(1, prog / span) * Math.PI);
      ctx.globalAlpha = (0.15 + hash(i * 2.7) * 0.4) * fade;
      ctx.strokeStyle = `rgb(${wr},${wg},${wb})`;
      ctx.lineWidth = 1.4 + hash(i) * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * 0.4, y - len);
      ctx.stroke();
      ctx.globalAlpha *= 0.7;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, 7);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ── main renderer ───────────────────────────────────────────────────

const PLATFORM_COLORS: Record<PlatformType, string> = {
  normal: "#22d3ee",
  moving: "#e879f9",
  break: "#fbbf24",
  vanish: "#a78bfa",
};

export function render(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  cssW: number,
  cssH: number,
  dpr: number
) {
  const scale = Math.min(cssW / WORLD_W, cssH / 1000);
  const viewW = cssW / scale;
  const viewH = cssH / scale;
  s.viewW = viewW;
  s.viewH = viewH;
  s.offX = (viewW - WORLD_W) / 2;
  if (s.t === 0 || (s.py === -31 && s.camera === 0)) {
    // recalibrate initial camera once viewH is known
  }

  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

  // ── небо выбранного фона ──
  const sky = skyColors(s.bg, s.maxM);
  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, sky.top);
  grad.addColorStop(1, sky.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  // ── звёзды (фиксированное звёздное поле как в оригинале) ──
  const [sr, sg, sb] = s.bg.star.split(",").map(Number);
  for (const st of s.stars) {
    const tw = 0.5 + 0.5 * Math.sin(s.t * (0.8 + st.s * 0.5) + st.tw);
    ctx.globalAlpha = 0.25 + tw * 0.6;
    ctx.fillStyle = `rgb(${sr},${sg},${sb})`;
    const sz = st.s * scale * 0.6 + st.s * 0.6;
    ctx.fillRect(st.x * viewW - sz / 2, st.y * viewH - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;

  // ── облака ──
  {
    const par = 0.16;
    const spacing = 330;
    const cam = s.camera * par;
    const b0 = Math.floor((cam - 120) / spacing);
    const b1 = Math.floor((cam + viewH + 120) / spacing);
    for (let b = b0; b <= b1; b++) {
      const h1 = hash(b * 8.17);
      const h2 = hash(b * 4.51);
      const x = h2 * viewW;
      const y = b * spacing + h1 * spacing - cam;
      const R = 36 + h1 * 46;
      ctx.fillStyle = s.bg.cloud;
      ctx.globalAlpha = 0.05 + h2 * 0.04;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, 7);
      ctx.arc(x + R * 0.9, y + R * 0.2, R * 0.7, 0, 7);
      ctx.arc(x - R * 0.9, y + R * 0.25, R * 0.65, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── погода фона ──
  drawWeather(ctx, s.bg, s.t, viewW, viewH);

  // ── мировое пространство ──
  const shx = Math.sin(s.t * 91) * s.shake * 0.35;
  const shy = Math.cos(s.t * 77) * s.shake * 0.35;
  ctx.save();
  ctx.translate(s.offX + shx, shy - s.camera);

  const viewTop = s.camera - 60;
  const viewBot = s.camera + viewH + 60;

  // границы колонки на широких экранах
  if (s.offX > 4) {
    ctx.strokeStyle = "rgba(103,232,249,0.08)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, viewTop);
    ctx.lineTo(0, viewBot);
    ctx.moveTo(WORLD_W, viewTop);
    ctx.lineTo(WORLD_W, viewBot);
    ctx.stroke();
  }

  // отметки высоты каждые 250 м
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.textBaseline = "middle";
  for (let y = Math.floor(viewTop / 2000) * 2000; y < viewBot; y += 2000) {
    const m = Math.round((s.startY - y) / ALT_K);
    if (m <= 0) continue;
    ctx.strokeStyle = "rgba(232,121,249,0.14)";
    ctx.setLineDash([6, 10]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(240,171,252,0.4)";
    ctx.fillText(`${m} м`, 8, y - 10);
  }

  // ── платформы ──
  for (const p of s.platforms) {
    if (p.y < viewTop - 40 || p.y > viewBot + 220) continue;
    const c = PLATFORM_COLORS[p.type];
    const alpha = p.fade;
    const h = 9;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x + p.w / 2, p.y + h / 2);

    if (p.type === "moving" && !p.broken) {
      const dir = Math.sign(p.vx) || 1;
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = alpha * (0.22 - i * 0.05);
        ctx.fillStyle = c;
        rrect(ctx, -p.w / 2 - dir * i * 8, -h / 2 + 1.5, p.w - i * 4, h - 3, 4);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
    }

    ctx.shadowColor = c;
    ctx.shadowBlur = 11 + p.flash * 16;
    ctx.fillStyle = "rgba(6, 3, 24, 0.92)";
    rrect(ctx, -p.w / 2, -h / 2, p.w, h, 4.5);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = c;
    ctx.stroke();

    ctx.shadowBlur = 6;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-p.w / 2 + 4, -h / 2 + 1.6);
    ctx.lineTo(p.w / 2 - 4, -h / 2 + 1.6);
    ctx.stroke();

    if (p.type === "break") {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(120, 53, 15, 0.9)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-p.w * 0.18, -h / 2 + 1);
      ctx.lineTo(-p.w * 0.02, h / 2 - 1);
      ctx.lineTo(p.w * 0.1, -h / 2 + 1.6);
      ctx.moveTo(p.w * 0.24, h / 2 - 1);
      ctx.lineTo(p.w * 0.34, -h / 2 + 1.6);
      ctx.stroke();
    }

    if (p.type === "vanish") {
      ctx.shadowBlur = 0;
      ctx.fillStyle = c;
      for (let i = -1; i <= 1; i++) {
        ctx.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(s.t * 6 + i));
        ctx.beginPath();
        ctx.arc(i * p.w * 0.22, 0, 1.5, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
    }

    if (p.flash > 0) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,255,255,${p.flash * 0.4})`;
      rrect(ctx, -p.w / 2, -h / 2, p.w, h, 4.5);
      ctx.fill();
    }

    if (p.hasSpring) {
      const sx = -p.w / 2 + p.springOff;
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "#fb7185";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(sx - 5.5, -h / 2);
      ctx.lineTo(sx + 5.5, -h / 2 - 3.2);
      ctx.lineTo(sx - 5.5, -h / 2 - 6.5);
      ctx.lineTo(sx + 5.5, -h / 2 - 9.5);
      ctx.stroke();
      ctx.fillStyle = "#fecdd3";
      rrect(ctx, sx - 9.5, -h / 2 - 13.5, 19, 4.5, 2.2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── бонусы (джетпак / щит / магнит / ×2) ──
  for (const p of s.powers) {
    if (p.y < viewTop || p.y > viewBot) continue;
    const cfg: Record<PowerKind, [string, string]> = {
      jetpack: ["#fb923c", "J"],
      shield: ["#22d3ee", "S"],
      magnet: ["#f43f5e", "M"],
      x2: ["#a78bfa", "2"],
    };
    const [col, letter] = cfg[p.kind];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(0, 0, 11.7 + Math.sin(s.t * 4) * 1.6, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowColor = col;
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(0, 0, 7.8, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0f0520";
    ctx.font = "900 8.5px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, 0, 0.4);
    ctx.textAlign = "left";
    ctx.restore();
  }

  // ── монеты ──
  for (const c of s.coinsArr) {
    if (c.y < viewTop || c.y > viewBot) continue;
    const wob = 1 + Math.sin(s.t * 4 + c.spin) * 0.15;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(wob, wob);
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 12;
    const g = ctx.createRadialGradient(-1.6, -1.6, 0.8, 0, 0, 6.2);
    g.addColorStop(0, "#fefce8");
    g.addColorStop(0.55, "#fde047");
    g.addColorStop(1, "#d97706");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, 7);
    ctx.stroke();
    ctx.restore();
  }

  // ── враги ──
  for (const e of s.enemies) {
    if (e.y < viewTop - 40 || e.y > viewBot + 40) continue;
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.kind === "ufo") {
      ctx.shadowColor = "#c084fc";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#c084fc";
      ctx.beginPath();
      ctx.ellipse(0, 1.6, 15.6, 6.2, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(233,213,255,0.9)";
      ctx.beginPath();
      ctx.arc(0, -2.3, 7, Math.PI, 0);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = s.t % 0.5 < 0.25 ? "#fde047" : "#a16207";
      for (const lx of [-8.6, 0, 8.6]) {
        ctx.beginPath();
        ctx.arc(lx, 3.1, 1.7, 0, 7);
        ctx.fill();
      }
    } else if (e.kind === "bat") {
      const flap = Math.sin(e.t * 4) * 4.7;
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.moveTo(-2.3, 0);
      ctx.quadraticCurveTo(-10.9, -6.2 - flap, -15.6, 1.6);
      ctx.quadraticCurveTo(-9.4, -1.6, -2.3, 2.3);
      ctx.moveTo(2.3, 0);
      ctx.quadraticCurveTo(10.9, -6.2 - flap, 15.6, 1.6);
      ctx.quadraticCurveTo(9.4, -1.6, 2.3, 2.3);
      ctx.fill();
      ctx.fillStyle = "#881337";
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, -0.8, 2.3, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(0, -0.8, 1.1, 0, 7);
      ctx.fill();
    } else {
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#ef4444";
      rrect(ctx, -10.1, -6.2, 20.2, 12.5, 5.4);
      ctx.fill();
      ctx.fillStyle = "#7f1d1d";
      rrect(ctx, -11.7, -2.3, 3.1, 4.7, 1.6);
      ctx.fill();
      rrect(ctx, 8.6, -2.3, 3.1, 4.4, 1.6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fee2e2";
      ctx.beginPath();
      ctx.arc(0, 0, 3.6, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#450a0a";
      ctx.beginPath();
      ctx.arc(Math.sign(s.pvx) * 1.6, 0, 1.6, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── пули ──
  ctx.fillStyle = "#fef08a";
  ctx.shadowColor = "#fde047";
  ctx.shadowBlur = 6;
  for (const b of s.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.7, 0, 7);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // ── частицы ──
  for (const q of s.particles) {
    const k = q.life / q.maxLife;
    if (q.kind === "ring") {
      ctx.globalAlpha = k * 0.8;
      ctx.strokeStyle = q.color;
      ctx.lineWidth = 1 + 1.6 * k;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.size, 0, 7);
      ctx.stroke();
    } else if (q.kind === "text") {
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.fillStyle = q.color;
      ctx.font = `800 ${q.size}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.shadowColor = q.color;
      ctx.shadowBlur = 6;
      ctx.fillText(q.text ?? "", q.x, q.y);
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    } else if (q.kind === "trail") {
      ctx.globalAlpha = k * 0.75;
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.size * (0.6 + k * 0.4), 0, 7);
      ctx.fill();
    } else {
      ctx.globalAlpha = k;
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
  }
  ctx.globalAlpha = 1;

  // ── игрок ──
  if (!s.dead) {
    drawCharacter(ctx, s.t, s.skin, s.px, s.py, 14, {
      vy: s.pvy,
      vx: s.pvx,
      face: s.face,
      invuln: s.invuln,
      shield: s.t < s.shieldUntil,
    });
  }

  ctx.restore();

  // боковые виньетки вне игровой колонки
  if (s.offX > 0) {
    const sideL = ctx.createLinearGradient(s.offX, 0, 0, 0);
    sideL.addColorStop(0, "rgba(2,1,10,0.85)");
    sideL.addColorStop(1, "rgba(2,1,10,0)");
    ctx.fillStyle = sideL;
    ctx.fillRect(0, 0, s.offX, viewH);
    const sideR = ctx.createLinearGradient(viewW - s.offX, 0, viewW, 0);
    sideR.addColorStop(0, "rgba(2,1,10,0.85)");
    sideR.addColorStop(1, "rgba(2,1,10,0)");
    ctx.fillStyle = sideR;
    ctx.fillRect(viewW - s.offX, 0, s.offX, viewH);
  }

  if (s.flash > 0) {
    ctx.fillStyle = `rgba(180,240,255,${s.flash * 0.2})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
}
