"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Coins,
  Heart,
  Home,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Wind,
  Zap,
  Crosshair,
  Rocket,
  Shield,
  Sparkles,
} from "lucide-react";
import AdOverlay, { type AdKind } from "@/components/AdOverlay";
import { sfx, setMuted, getMuted } from "./sound";
import type { SettingsMap } from "@/lib/economy";
import { api, addPending, clearPending, getPending } from "@/lib/client-api";
import { getBackground, getSkin, type SkinDef } from "@/lib/catalog";

export interface PublicPlayer {
  id: string;
  username: string;
  bestScore: number;
  gamesPlayed: number;
  coins: number;
  rub: number;
  totalEarned: number;
  adViews: number;
  skin: string;
  background: string;
  owned: string[];
}

interface Props {
  player: PublicPlayer;
  settings: SettingsMap;
  onPlayerUpdate: (p: PublicPlayer) => void;
  onAuthLost: () => void;
  onExit: () => void;
}

// ---------- Типы мира ----------
type PlatType = "normal" | "moving" | "break" | "vanish";
interface Plat {
  x: number; y: number; w: number; type: PlatType;
  vx: number; broken: boolean; fade: number; hasSpring: boolean;
}
interface Coin { x: number; y: number; taken: boolean; spin: number }
interface Enemy {
  x: number; y: number; baseX: number; kind: "drone" | "bat" | "ufo";
  t: number; amp: number; vx: number; r: number; dead: boolean;
}
interface Bullet { x: number; y: number }
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface Power { x: number; y: number; kind: "jetpack" | "shield" | "magnet" | "x2" }
interface Star { x: number; y: number; s: number; tw: number }

interface World {
  px: number; py: number; pvx: number; pvy: number; prevBottom: number; face: number;
  plats: Plat[]; coins: Coin[]; enemies: Enemy[]; bullets: Bullet[]; parts: Part[]; powers: Power[];
  stars: Star[];
  camY: number; nextY: number; startY: number; maxM: number;
  coinsRun: number; kills: number;
  shieldUntil: number; magnetUntil: number; x2Until: number; jetpackUntil: number;
  lastShot: number; shake: number; milestoneAt: number;
  windForce: number; windUntil: number; windNext: number;
  dead: boolean; deadAt: number;
}

const GRAV = 0.34;
const JUMP_V = 13.4;
const MOVE = 6.4;
const PW = 34;
const PH = 38;


// Эмблема на груди героя
function drawEmblem(
  g: CanvasRenderingContext2D,
  kind: string,
  color: string,
  accent: string,
  now: number,
) {
  const cy = 7;
  g.save();
  g.translate(0, cy);
  if (kind === "star") {
    g.fillStyle = "#fff7ed";
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const a2 = a + Math.PI / 5;
      g.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
      g.lineTo(Math.cos(a2) * 3, Math.sin(a2) * 3);
    }
    g.closePath(); g.fill();
  } else if (kind === "shield") {
    g.fillStyle = "#f8fafc";
    g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill();
    g.fillStyle = "#dc2626";
    g.beginPath(); g.arc(0, 0, 4.6, 0, 7); g.fill();
    g.fillStyle = "#f8fafc";
    g.beginPath(); g.arc(0, 0, 2.2, 0, 7); g.fill();
  } else if (kind === "arc") {
    const pulse = 0.7 + 0.3 * Math.sin(now / 180);
    g.globalAlpha = pulse;
    g.fillStyle = "#a5f3fc";
    g.shadowColor = "#22d3ee"; g.shadowBlur = 10;
    g.beginPath(); g.arc(0, 0, 5.5, 0, 7); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = "#67e8f9"; g.lineWidth = 1.4;
    g.beginPath(); g.arc(0, 0, 7.6, 0, 7); g.stroke();
    g.globalAlpha = 1;
  } else if (kind === "bolt") {
    g.fillStyle = "#fde047";
    g.beginPath();
    g.moveTo(2.5, -8); g.lineTo(-4.5, 1); g.lineTo(-0.5, 1);
    g.lineTo(-2.5, 8); g.lineTo(4.5, -1); g.lineTo(0.5, -1);
    g.closePath(); g.fill();
  } else if (kind === "web") {
    g.strokeStyle = "rgba(15,23,42,0.75)"; g.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      g.beginPath(); g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); g.stroke();
    }
    for (let r = 3; r <= 9; r += 3) {
      g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    }
  } else if (kind === "claw") {
    g.strokeStyle = accent; g.lineWidth = 1.8;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(i * 4 - 1, -6);
      g.quadraticCurveTo(i * 4 + 2, 0, i * 4, 6);
      g.stroke();
    }
  } else if (kind === "hex") {
    g.strokeStyle = color; g.lineWidth = 1.8;
    g.globalAlpha = 0.7 + 0.3 * Math.sin(now / 240);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
      g.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
    }
    g.closePath(); g.stroke();
    g.globalAlpha = 1;
  } else if (kind === "atom") {
    g.strokeStyle = accent; g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      g.save(); g.rotate((i * Math.PI) / 3);
      g.beginPath(); g.ellipse(0, 0, 8, 3.4, 0, 0, 7); g.stroke();
      g.restore();
    }
  }
  g.restore();
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Палитра неба берётся из выбранного игроком фона
function skyFor(m: number, sky: [number, string, string][]): [string, string] {
  let i = 0;
  while (i < sky.length - 1 && m > sky[i + 1][0]) i++;
  const [m0, c0, b0] = sky[i];
  const next = sky[Math.min(i + 1, sky.length - 1)];
  const t = next[0] === m0 ? 0 : clamp((m - m0) / (next[0] - m0), 0, 1);
  return [mixHex(c0, next[1], t), mixHex(b0, next[2], t)];
}
function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(lerp(v, pb[i], t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export default function GameCanvas({ player, settings, onPlayerUpdate, onAuthLost, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const sizeRef = useRef({ W: 0, H: 0, gw: 0, gx: 0 });
  const keysRef = useRef({ left: false, right: false });
  const touchRef = useRef(new Map<number, "left" | "right">());
  const rafRef = useRef(0);
  const aliveRef = useRef(true);
  const savedRef = useRef(false);
  const reviveUsedRef = useRef(false);
  const doubledRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const skinRef = useRef(getSkin(player.skin));
  skinRef.current = getSkin(player.skin);
  const bgRef = useRef(getBackground(player.background));
  bgRef.current = getBackground(player.background);
  const onAuthLostRef = useRef(onAuthLost);
  onAuthLostRef.current = onAuthLost;
  const authFailsRef = useRef(0);
  // Сколько монет уже отправлено на сервер в текущем забеге
  const syncedCoinsRef = useRef(0);
  const onPlayerUpdateRef = useRef(onPlayerUpdate);
  onPlayerUpdateRef.current = onPlayerUpdate;

  const [phase, setPhase] = useState<"playing" | "dying" | "over">("playing");
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [mutedUi, setMutedUi] = useState(getMuted());
  const [adMode, setAdMode] = useState<AdKind | null>(null);
  const [result, setResult] = useState<{ score: number; coins: number } | null>(null);
  const [hud, setHud] = useState({ m: 0, coins: 0, wind: 0, shield: false, x2: false, magnet: false });
  const [toasts, setToasts] = useState<{ id: number; text: string; sub?: string }[]>([]);
  const [reviveUsed, setReviveUsed] = useState(false);
  const [doubled, setDoubled] = useState(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const toast = useCallback((text: string, sub?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, sub }]);
    setTimeout(() => {
      if (aliveRef.current) setToasts((t) => t.filter((x) => x.id !== id));
    }, 2600);
  }, []);

  // ---------- Инициализация мира ----------
  const initWorld = useCallback((): World => {
    const { gw, H } = sizeRef.current;
    const startY = H - 90;
    const w: World = {
      px: gw / 2, py: startY - 40, pvx: 0, pvy: -JUMP_V, prevBottom: 0, face: 1,
      plats: [], coins: [], enemies: [], bullets: [], parts: [],
      powers: [],
      stars: Array.from({ length: 130 }, () => ({
        x: Math.random(), y: Math.random(), s: rnd(0.5, 2), tw: rnd(0, 6.28),
      })),
      camY: startY - H * 0.36 - 40, nextY: startY, startY,
      maxM: 0, coinsRun: 0, kills: 0,
      shieldUntil: 0, magnetUntil: 0, x2Until: 0, jetpackUntil: 0,
      lastShot: 0, shake: 0, milestoneAt: 250,
      windForce: 0, windUntil: 0, windNext: 8000,
      dead: false, deadAt: 0,
    };
    w.plats.push({ x: gw / 2 - 45, y: startY, w: 90, type: "normal", vx: 0, broken: false, fade: 1, hasSpring: false });
    return w;
  }, []);

  // ---------- Генерация платформ ----------
  const spawnUp = useCallback((w: World, gw: number) => {
    const bonusMilestone = Math.max(10, parseInt(settingsRef.current.milestoneBonus, 10) || 50);
    while (w.nextY > w.camY - 900) {
      const m = (w.startY - w.nextY) / 10;
      const t = clamp(m / 2200, 0, 1);
      const gap = lerp(56, 112, t) + rnd(6, lerp(18, 52, t));
      w.nextY -= gap;
      const width = lerp(84, 46, t);
      const x = rnd(4, gw - width - 4);
      let type: PlatType = "normal";
      const roll = Math.random();
      const pMoving = 0.14 + 0.3 * t;
      const pBreak = m > 260 ? 0.05 + 0.22 * t : 0;
      const pVanish = m > 520 ? 0.16 * t : 0;
      if (roll < pVanish) type = "vanish";
      else if (roll < pVanish + pBreak) type = "break";
      else if (roll < pVanish + pBreak + pMoving) type = "moving";
      const plat: Plat = {
        x, y: w.nextY, w: width, type,
        vx: type === "moving" ? rnd(1, 2 + 2 * t) * (Math.random() < 0.5 ? -1 : 1) : 0,
        broken: false, fade: 1,
        hasSpring: type !== "break" && type !== "vanish" && Math.random() < 0.05,
      };
      w.plats.push(plat);

      // Монеты дугой над платформой
      if (Math.random() < 0.42 && !plat.hasSpring) {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          w.coins.push({
            x: x + width / 2 + (i - (n - 1) / 2) * 26,
            y: w.nextY - 34 - Math.abs(i - (n - 1) / 2) * 10,
            taken: false, spin: rnd(0, 6.28),
          });
        }
      }

      // Бонус на платформе
      if (Math.random() < 0.05 && type === "normal" && m > 120) {
        const kinds: Power["kind"][] = ["jetpack", "shield", "magnet", "x2"];
        w.powers.push({
          x: x + width / 2, y: w.nextY - 26,
          kind: kinds[Math.floor(Math.random() * kinds.length)],
        });
      }

      // Враги
      if (m > 300 && Math.random() < 0.09 + 0.13 * t) {
        const kind: Enemy["kind"] = m > 1050 && Math.random() < 0.35 ? "ufo" : Math.random() < 0.5 ? "drone" : "bat";
        w.enemies.push({
          x: rnd(30, gw - 30), baseX: rnd(30, gw - 30),
          y: w.nextY - rnd(60, 140),
          kind, t: rnd(0, 6.28), amp: rnd(30, Math.min(90, gw / 4)),
          vx: rnd(0.6, 1.8) * (Math.random() < 0.5 ? -1 : 1),
          r: kind === "ufo" ? 18 : 15, dead: false,
        });
      }
    }
    void bonusMilestone;
  }, []);

  // ---------- Смерть ----------
  const die = useCallback((w: World) => {
    if (w.dead) return;
    w.dead = true;
    w.deadAt = performance.now();
    w.shake = 14;
    sfx.gameOver();
    setPhase("dying");
    setTimeout(() => {
      if (!aliveRef.current) return;
      const score = Math.floor(w.maxM);
      const coins = w.coinsRun;
      setResult({ score, coins });
      setPhase("over");
      // Интерстишел после каждого проигрыша
      setTimeout(() => {
        if (aliveRef.current) setAdMode((m) => m ?? "interstitial");
      }, 650);
    }, 1150);
  }, []);

  // ---------- Сохранение забега ----------
  const saveRun = useCallback(async () => {
    if (savedRef.current || !result) return;
    savedRef.current = true;

    // Отправляем только то, что ещё не ушло чекпоинтами
    const deltaCoins = Math.max(0, result.coins - syncedCoinsRef.current);
    const pending = getPending();
    const payload = {
      score: Math.max(result.score, pending?.score ?? 0),
      coins: deltaCoins + (pending?.coins ?? 0),
    };

    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await api<{ player: PublicPlayer }>("/api/session", {
        method: "POST",
        body: payload,
      });
      if (!aliveRef.current) return;
      if (res.ok && res.data?.player) {
        syncedCoinsRef.current = result.coins;
        clearPending();
        onPlayerUpdateRef.current(res.data.player);
        return;
      }
      if (res.unauthorized) {
        // Сессия могла моргнуть — пробуем поднять её и повторить
        const me = await api<{ player: PublicPlayer }>("/api/me", { retries: 1 });
        if (me.ok && me.data?.player) continue;
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, 900 * attempt));
    }

    // Не удалось — кладём в очередь, досылаем позже. Прогресс не теряется.
    addPending(payload.coins, payload.score);
    syncedCoinsRef.current = result.coins;
    savedRef.current = false;
    if (aliveRef.current) {
      toast("Сохраним чуть позже", "монеты не потеряются");
    }
  }, [result, toast]);

  // Промежуточное сохранение монет прямо во время забега
  const checkpoint = useCallback(async () => {
    const w = worldRef.current;
    if (!w || w.dead) return;
    const delta = Math.floor(w.coinsRun) - syncedCoinsRef.current;
    if (delta <= 0) return;
    const score = Math.floor(w.maxM);
    // Считаем отправленным сразу: при ошибке уйдёт в очередь
    syncedCoinsRef.current += delta;
    const res = await api<{ player: PublicPlayer }>("/api/progress", {
      method: "POST",
      body: { coins: delta, score },
      retries: 1,
    });
    if (res.ok && res.data?.player) {
      if (aliveRef.current) onPlayerUpdateRef.current(res.data.player);
    } else if (!res.unauthorized) {
      addPending(delta, score);
    } else {
      addPending(delta, score);
    }
  }, []);

  // ---------- Засчитать показ рекламы ----------
  const logAd = useCallback(async (kind: AdKind) => {
    const res = await api<{ player: PublicPlayer | null; playerShare: number }>(
      "/api/ads",
      { method: "POST", body: { kind } },
    );
    if (res.ok && res.data) {
      if (res.data.player && aliveRef.current) onPlayerUpdateRef.current(res.data.player);
      if (res.data.playerShare && aliveRef.current) {
        toast(`+${res.data.playerShare.toFixed(2)} ₽`, "твоя доля с рекламы");
      }
    } else if (res.unauthorized && aliveRef.current) {
      // Сессия могла моргнуть — проверяем и молча восстанавливаем
      const me = await api<{ player: PublicPlayer }>("/api/me", { retries: 1 });
      if (me.ok && me.data?.player) {
        onPlayerUpdateRef.current(me.data.player);
      } else {
        toast("Награда за рекламу не начислена", "проверь соединение");
      }
    }
  }, [toast]);

  // ---------- Рестарт ----------
  const restart = useCallback(() => {
    savedRef.current = false;
    reviveUsedRef.current = false;
    doubledRef.current = false;
    syncedCoinsRef.current = 0;
    setReviveUsed(false);
    setDoubled(false);
    setResult(null);
    setAdMode(null);
    worldRef.current = initWorld();
    setPhase("playing");
  }, [initWorld]);

  // ---------- Выстрел ----------
  const shoot = useCallback(() => {
    const w = worldRef.current;
    if (!w || w.dead) return;
    const now = performance.now();
    if (now - w.lastShot < 260) return;
    w.lastShot = now;
    w.bullets.push({ x: w.px, y: w.py - PH / 2 - 6 });
    sfx.shoot();
  }, []);

  // ---------- Основной игровой цикл ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gw = Math.min(W, 540);
      sizeRef.current = { W, H, gw, gx: (W - gw) / 2 };
    };
    resize();
    window.addEventListener("resize", resize);

    worldRef.current = initWorld();
    let last = performance.now();
    let hudLast = 0;

    const frame = (now: number) => {
      if (!aliveRef.current) return;
      const w = worldRef.current;
      if (!w) return;
      const { W, H, gw, gx } = sizeRef.current;
      const dt = clamp((now - last) / 16.667, 0.1, 3);
      last = now;

      if (!pausedRef.current && phaseRef.current !== "over") {
        update(w, dt, gw, H, now);
      }
      render(g, w, W, H, gw, gx, now);

      // HUD ~10 fps
      if (now - hudLast > 120) {
        hudLast = now;
        const mVal = Math.floor(w.maxM);
        const windNow = now < w.windUntil ? Math.sign(w.windForce) : 0;
        setHud((h) =>
          h.m === mVal && h.coins === w.coinsRun && h.wind === windNow &&
          h.shield === now < w.shieldUntil && h.x2 === now < w.x2Until && h.magnet === now < w.magnetUntil
            ? h
            : { m: mVal, coins: w.coinsRun, wind: windNow, shield: now < w.shieldUntil, x2: now < w.x2Until, magnet: now < w.magnetUntil },
        );
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    const update = (w: World, dt: number, gw: number, H: number, now: number) => {
      // --- Ветер на высоте ---
      if (w.maxM > 620) {
        if (now > w.windNext) {
          w.windForce = rnd(-0.16, 0.16);
          if (Math.abs(w.windForce) < 0.07) w.windForce = 0;
          w.windUntil = now + rnd(2500, 5500);
          w.windNext = w.windUntil + rnd(4000, 9000);
        }
      }
      const wind = now < w.windUntil ? w.windForce : 0;

      // --- Управление ---
      const touches = Array.from(touchRef.current.values());
      const left = !w.dead && (keysRef.current.left || touches.includes("left"));
      const right = !w.dead && (keysRef.current.right || touches.includes("right"));
      if (left) { w.pvx = Math.max(-MOVE, w.pvx - 0.9 * dt); w.face = -1; }
      else if (right) { w.pvx = Math.min(MOVE, w.pvx + 0.9 * dt); w.face = 1; }
      else w.pvx *= Math.pow(0.86, dt);

      w.pvx += wind * dt;
      w.px += w.pvx * dt;
      if (w.px < -PW / 2) w.px = gw + PW / 2;
      if (w.px > gw + PW / 2) w.px = -PW / 2;

      // --- Вертикаль ---
      const prevBottom = w.py + PH / 2;
      const jet = now < w.jetpackUntil;
      if (jet) {
        w.pvy = -17.5;
        for (let i = 0; i < 3; i++) {
          w.parts.push({
            x: w.px + rnd(-8, 8), y: w.py + PH / 2,
            vx: rnd(-1, 1), vy: rnd(2, 5), life: 0, max: 26,
            color: Math.random() < 0.5 ? "#fb923c" : "#f43f5e", size: rnd(3, 6),
          });
        }
      } else {
        w.pvy += GRAV * dt;
        w.pvy = Math.min(w.pvy, 17);
      }
      w.py += w.pvy * dt;
      w.prevBottom = prevBottom;

      // --- Камера ---
      const targetCam = w.py - H * 0.36;
      if (targetCam < w.camY) w.camY = lerp(w.camY, targetCam, 0.22 * dt);
      w.maxM = Math.max(w.maxM, (w.startY - w.py) / 10);

      // --- Майлстоуны ---
      const bonusMs = Math.max(10, parseInt(settingsRef.current.milestoneBonus, 10) || 50);
      if (w.maxM >= w.milestoneAt) {
        w.coinsRun += bonusMs;
        toast(`${Math.floor(w.milestoneAt)} м!`, `+${bonusMs} монет бонус`);
        sfx.milestone();
        w.milestoneAt += 250;
      }

      spawnUp(w, gw);

      // --- Платформы ---
      for (const p of w.plats) {
        if (p.type === "moving") {
          p.x += p.vx * dt;
          if (p.x < 2 || p.x + p.w > gw - 2) p.vx *= -1;
        }
        if (p.fade < 1) p.fade = Math.max(0, p.fade - 0.04 * dt);
        if (p.broken) p.y += 4 * dt;
      }
      w.plats = w.plats.filter((p) => p.y - w.camY < H + 160 && p.fade > 0.02);

      // --- Столкновение с платформами (падение) ---
      if (w.pvy > 0 && !jet) {
        for (const p of w.plats) {
          if (p.broken || p.fade < 0.4) continue;
          const top = p.y;
          if (
            prevBottom <= top + 1 &&
            w.py + PH / 2 >= top &&
            w.px + PW / 2 > p.x &&
            w.px - PW / 2 < p.x + p.w
          ) {
            if (p.hasSpring) {
              w.pvy = -JUMP_V * 1.85;
              p.hasSpring = false;
              sfx.spring();
              burst(w, w.px, top, "#f43f5e", 14);
            } else {
              w.pvy = -JUMP_V;
              sfx.jump();
            }
            if (p.type === "moving") w.pvx += p.vx * 0.35;
            if (p.type === "break") { p.broken = true; sfx.hit(); }
            if (p.type === "vanish") p.fade = 0.99;
            for (let i = 0; i < 4; i++) {
              w.parts.push({
                x: w.px + rnd(-14, 14), y: top,
                vx: rnd(-1.5, 1.5), vy: rnd(-2, -0.5), life: 0, max: 22,
                color: "rgba(255,255,255,0.8)", size: rnd(1.5, 3),
              });
            }
            break;
          }
        }
      }

      // --- Монеты ---
      const magnet = now < w.magnetUntil;
      const mult = now < w.x2Until ? 2 : 1;
      for (const c of w.coins) {
        if (c.taken) continue;
        if (magnet) {
          const dx = w.px - c.x, dy = w.py - c.y;
          const d = Math.hypot(dx, dy);
          if (d < 150 && d > 1) { c.x += (dx / d) * 4.4 * dt; c.y += (dy / d) * 4.4 * dt; }
        }
        if (Math.abs(w.px - c.x) < 26 && Math.abs(w.py - c.y) < 30) {
          c.taken = true;
          w.coinsRun += mult;
          sfx.coin();
          burst(w, c.x, c.y, "#fbbf24", 6);
        }
      }
      w.coins = w.coins.filter((c) => !c.taken && c.y - w.camY < H + 100);

      // --- Бонусы ---
      for (const p of w.powers) {
        if (Math.abs(w.px - p.x) < 30 && Math.abs(w.py - p.y) < 34) {
          p.y = -99999;
          sfx.power();
          if (p.kind === "jetpack") { w.jetpackUntil = now + 1400; toast("Джетпак!"); burst(w, w.px, w.py, "#fb923c", 14); }
          if (p.kind === "shield") { w.shieldUntil = now + 999000; toast("Щит активен", "выдержит один удар"); }
          if (p.kind === "magnet") { w.magnetUntil = now + 6500; toast("Магнит монет"); }
          if (p.kind === "x2") { w.x2Until = now + 8000; toast("Монеты ×2", "8 секунд"); }
        }
      }
      w.powers = w.powers.filter((p) => p.y > -1000 && p.y - w.camY < H + 80);

      // --- Пули ---
      for (const b of w.bullets) b.y -= 15 * dt;
      w.bullets = w.bullets.filter((b) => b.y > w.camY - 40);

      // --- Враги ---
      for (const e of w.enemies) {
        if (e.dead) continue;
        e.t += 0.03 * dt;
        if (e.kind === "drone") {
          e.x += e.vx * dt;
          if (e.x < e.r || e.x > gw - e.r) e.vx *= -1;
        } else if (e.kind === "bat") {
          e.baseX += e.vx * 0.5 * dt;
          if (e.baseX < e.amp + e.r || e.baseX > gw - e.amp - e.r) e.vx *= -1;
          e.x = e.baseX + Math.sin(e.t) * e.amp;
        } else {
          const dx = w.px - e.x;
          e.x += clamp(dx, -1, 1) * 0.7 * dt;
        }
        // пули
        for (const b of w.bullets) {
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 5) {
            e.dead = true; b.y = -99999; w.kills++;
            w.coinsRun += 6 * mult;
            sfx.enemyDie();
            burst(w, e.x, e.y, "#f87171", 18);
            break;
          }
        }
        // игрок
        if (!e.dead && Math.hypot(w.px - e.x, w.py - e.y) < e.r + PW / 2.1) {
          if (now < w.shieldUntil) {
            e.dead = true;
            w.shieldUntil = 0;
            w.pvy = -JUMP_V;
            sfx.enemyDie();
            burst(w, e.x, e.y, "#22d3ee", 20);
          } else {
            die(w);
          }
        }
      }
      w.enemies = w.enemies.filter((e) => !e.dead && e.y - w.camY < H + 120);

      // --- Частицы ---
      for (const p of w.parts) {
        p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      }
      w.parts = w.parts.filter((p) => p.life < p.max);

      // --- Трейл ---
      if (Math.abs(w.pvy) > 4 && Math.random() < 0.4) {
        w.parts.push({
          x: w.px + rnd(-6, 6), y: w.py + PH / 2,
          vx: 0, vy: rnd(0.5, 1.5), life: 0, max: 20,
          color: `rgba(${skinRef.current.trail},0.75)`, size: rnd(2, 4),
        });
      }

      // --- Падение вниз ---
      if (w.py - w.camY > H + 90) die(w);
      if (w.shake > 0) w.shake = Math.max(0, w.shake - dt);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Отрисовка ----------
  const render = (
    g: CanvasRenderingContext2D, w: World, W: number, H: number,
    gw: number, gx: number, now: number,
  ) => {
    const m = w.maxM;
    const theme = bgRef.current;
    const [top, bottom] = skyFor(m, theme.sky);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, bottom);
    grad.addColorStop(1, top);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    g.save();
    const shakeX = w.shake > 0 ? rnd(-1, 1) * w.shake * 0.5 : 0;
    g.translate(gx + shakeX, 0);

    // Звёзды (появляются с высотой)
    const starA = clamp(m / 220, 0.06, 1);
    for (const s of w.stars) {
      const sy = ((s.y * H * 4 - w.camY * 0.12) % (H + 20) + H + 20) % (H + 20) - 10;
      const tw = 0.5 + 0.5 * Math.sin(now / 400 + s.tw);
      g.globalAlpha = starA * tw;
      g.fillStyle = `rgb(${theme.star})`;
      g.fillRect(s.x * gw, sy, s.s, s.s);
    }
    g.globalAlpha = 1;

    // Погодный эффект выбранного фона
    if (theme.weather !== "none") {
      const wc = theme.weatherColor;
      const t = now / 1000;
      const count = 34;
      for (let i = 0; i < count; i++) {
        const seed = i * 97.13;
        const x = ((seed * 7.31) % gw + Math.sin(t * 0.6 + i) * 18 + gw) % gw;
        let speed = 40;
        if (theme.weather === "snow") speed = 26;
        if (theme.weather === "embers" || theme.weather === "bubbles") speed = -34;
        if (theme.weather === "rain" || theme.weather === "code") speed = 150;
        if (theme.weather === "petals") speed = 34;
        const y = (((t * speed + seed * 3.7 - w.camY * 0.25) % (H + 60)) + H + 60) % (H + 60) - 30;
        if (theme.weather === "code") {
          g.globalAlpha = 0.16 + 0.3 * ((i % 5) / 5);
          g.fillStyle = `rgb(${wc})`;
          g.font = "12px monospace";
          g.fillText(i % 2 ? "1" : "0", x, y);
        } else if (theme.weather === "rain") {
          g.globalAlpha = 0.4;
          g.strokeStyle = `rgb(${wc})`;
          g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 14); g.stroke();
        } else if (theme.weather === "bubbles") {
          g.globalAlpha = 0.3;
          g.strokeStyle = `rgb(${wc})`;
          g.lineWidth = 1.4;
          g.beginPath(); g.arc(x, y, 2 + (i % 4), 0, 7); g.stroke();
        } else if (theme.weather === "petals") {
          g.globalAlpha = 0.5;
          g.fillStyle = `rgb(${wc})`;
          g.save(); g.translate(x, y); g.rotate(t + i);
          g.beginPath(); g.ellipse(0, 0, 4, 2, 0, 0, 7); g.fill();
          g.restore();
        } else {
          // snow / embers
          g.globalAlpha = theme.weather === "embers" ? 0.55 : 0.7;
          g.fillStyle = `rgb(${wc})`;
          g.beginPath(); g.arc(x, y, theme.weather === "embers" ? 1.8 : 2.2, 0, 7); g.fill();
        }
      }
      g.globalAlpha = 1;
    }

    // Облака на малой высоте
    if (m < 500) {
      g.globalAlpha = clamp(1 - m / 500, 0, 0.5);
      g.fillStyle = theme.cloud;
      for (let i = 0; i < 5; i++) {
        const cy = ((i * 260 - w.camY * 0.3) % (H + 200) + H + 200) % (H + 200) - 100;
        const cx = ((i * 173) % gw + Math.sin(now / 3000 + i) * 30);
        blob(g, cx, cy, 46 + (i % 3) * 14, 14);
      }
      g.globalAlpha = 1;
    }

    // Планета на большой высоте
    if (m > 500) {
      const py = 140 - (m - 500) * 0.02;
      const px = gw * 0.78;
      g.globalAlpha = clamp((m - 500) / 400, 0, 0.9);
      const pg = g.createRadialGradient(px - 12, py - 12, 4, px, py, 46);
      pg.addColorStop(0, "#f0abfc");
      pg.addColorStop(1, "rgba(112,26,117,0.15)");
      g.fillStyle = pg;
      g.beginPath(); g.arc(px, py, 44, 0, 7); g.fill();
      g.strokeStyle = "rgba(240,171,252,0.4)";
      g.lineWidth = 3;
      g.beginPath(); g.ellipse(px, py, 64, 14, -0.4, 0, 7); g.stroke();
      g.globalAlpha = 1;
    }

    // Монеты
    for (const c of w.coins) {
      const y = c.y - w.camY;
      if (y < -30 || y > H + 30) continue;
      const sc = Math.abs(Math.sin(now / 300 + c.spin)) * 0.6 + 0.4;
      g.save();
      g.translate(c.x, y);
      g.scale(sc, 1);
      g.fillStyle = "#fbbf24";
      g.strokeStyle = "#f59e0b";
      g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill(); g.stroke();
      g.fillStyle = "#fde68a";
      g.beginPath(); g.arc(-2, -2, 3, 0, 7); g.fill();
      g.restore();
    }

    // Платформы
    for (const p of w.plats) {
      const y = p.y - w.camY;
      if (y < -30 || y > H + 40) continue;
      g.save();
      g.globalAlpha = p.fade;
      const colors: Record<PlatType, [string, string]> = {
        normal: ["#34d399", "#059669"],
        moving: ["#22d3ee", "#0284c7"],
        break: ["#fb923c", "#b45309"],
        vanish: ["#e2e8f0", "#94a3b8"],
      };
      const [c1, c2] = colors[p.type];
      roundRect(g, p.x, y, p.w, 13, 7);
      g.fillStyle = c2; g.fill();
      roundRect(g, p.x, y - 3, p.w, 12, 7);
      g.fillStyle = c1; g.fill();
      if (p.type === "moving") {
        g.fillStyle = "rgba(255,255,255,0.85)";
        const dir = Math.sign(p.vx);
        g.beginPath();
        g.moveTo(p.x + p.w / 2 + 6 * dir, y + 2);
        g.lineTo(p.x + p.w / 2 + 1 * dir, y - 2);
        g.lineTo(p.x + p.w / 2 + 1 * dir, y + 6);
        g.fill();
      }
      if (p.type === "break") {
        g.strokeStyle = "rgba(0,0,0,0.35)";
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(p.x + p.w * 0.3, y - 3); g.lineTo(p.x + p.w * 0.45, y + 9);
        g.moveTo(p.x + p.w * 0.6, y - 3); g.lineTo(p.x + p.w * 0.5, y + 9);
        g.stroke();
      }
      if (p.hasSpring) {
        g.fillStyle = "#f43f5e";
        roundRect(g, p.x + p.w / 2 - 7, y - 13, 14, 5, 2); g.fill();
        g.strokeStyle = "#fecdd3"; g.lineWidth = 2;
        g.beginPath();
        g.moveTo(p.x + p.w / 2 - 5, y - 5);
        g.lineTo(p.x + p.w / 2 + 5, y - 8);
        g.lineTo(p.x + p.w / 2 - 5, y - 11);
        g.stroke();
      }
      g.restore();
    }

    // Бонусы
    for (const p of w.powers) {
      const y = p.y - w.camY + Math.sin(now / 350 + p.x) * 3;
      if (y < -30 || y > H + 30) continue;
      g.save();
      g.translate(p.x, y);
      const cfg: Record<Power["kind"], [string, string]> = {
        jetpack: ["#fb923c", "J"], shield: ["#22d3ee", "S"],
        magnet: ["#f43f5e", "M"], x2: ["#a78bfa", "2"],
      };
      const [col, letter] = cfg[p.kind];
      g.fillStyle = col;
      g.globalAlpha = 0.25;
      g.beginPath(); g.arc(0, 0, 15 + Math.sin(now / 250) * 2, 0, 7); g.fill();
      g.globalAlpha = 1;
      g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fill();
      g.fillStyle = "#0f0520";
      g.font = "900 11px system-ui";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(letter, 0, 0.5);
      g.restore();
    }

    // Враги
    for (const e of w.enemies) {
      const y = e.y - w.camY;
      if (y < -40 || y > H + 40) continue;
      g.save();
      g.translate(e.x, y);
      if (e.kind === "ufo") {
        g.fillStyle = "#c084fc";
        g.beginPath(); g.ellipse(0, 2, 20, 8, 0, 0, 7); g.fill();
        g.fillStyle = "rgba(233,213,255,0.9)";
        g.beginPath(); g.arc(0, -3, 9, Math.PI, 0); g.fill();
        g.fillStyle = now % 500 < 250 ? "#fde047" : "#a16207";
        for (const lx of [-11, 0, 11]) { g.beginPath(); g.arc(lx, 4, 2.2, 0, 7); g.fill(); }
      } else if (e.kind === "bat") {
        const flap = Math.sin(e.t * 4) * 6;
        g.fillStyle = "#f43f5e";
        g.beginPath();
        g.moveTo(-3, 0); g.quadraticCurveTo(-14, -8 - flap, -20, 2);
        g.quadraticCurveTo(-12, -2, -3, 3);
        g.moveTo(3, 0); g.quadraticCurveTo(14, -8 - flap, 20, 2);
        g.quadraticCurveTo(12, -2, 3, 3);
        g.fill();
        g.fillStyle = "#881337";
        g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill();
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(0, -1, 3, 0, 7); g.fill();
        g.fillStyle = "#000";
        g.beginPath(); g.arc(0, -1, 1.4, 0, 7); g.fill();
      } else {
        g.fillStyle = "#ef4444";
        roundRect(g, -13, -8, 26, 16, 7); g.fill();
        g.fillStyle = "#7f1d1d";
        roundRect(g, -15, -3, 4, 6, 2); g.fill();
        roundRect(g, 11, -3, 4, 6, 2); g.fill();
        g.fillStyle = "#fee2e2";
        g.beginPath(); g.arc(0, 0, 4.6, 0, 7); g.fill();
        g.fillStyle = "#450a0a";
        g.beginPath(); g.arc(Math.sign(w.pvx) * 2, 0, 2, 0, 7); g.fill();
      }
      g.restore();
    }

    // Пули
    g.fillStyle = "#fef08a";
    for (const b of w.bullets) {
      const y = b.y - w.camY;
      g.beginPath(); g.arc(b.x, y, 3.4, 0, 7); g.fill();
    }

    // Частицы
    for (const p of w.parts) {
      g.globalAlpha = 1 - p.life / p.max;
      g.fillStyle = p.color;
      g.fillRect(p.x - p.size / 2, p.y - w.camY - p.size / 2, p.size, p.size);
    }
    g.globalAlpha = 1;

    // Игрок
    if (!w.dead || now - w.deadAt < 800) {
      drawPlayer(g, w, now);
    }

    g.restore();

    // Боковые виньетки вне игровой колонки
    if (gx > 0) {
      const side = g.createLinearGradient(0, 0, gx, 0);
      side.addColorStop(0, "rgba(2,1,10,0.9)");
      side.addColorStop(1, "rgba(2,1,10,0)");
      g.fillStyle = side;
      g.fillRect(0, 0, gx, H);
      const side2 = g.createLinearGradient(W, 0, W - gx, 0);
      side2.addColorStop(0, "rgba(2,1,10,0.9)");
      side2.addColorStop(1, "rgba(2,1,10,0)");
      g.fillStyle = side2;
      g.fillRect(W - gx, 0, gx, H);
    }
  };

  const drawPlayer = (g: CanvasRenderingContext2D, w: World, now: number) => {
    const skin: SkinDef = skinRef.current;
    const y = w.py - w.camY;
    const tilt = clamp(w.pvx * 0.04, -0.28, 0.28);
    const squash = clamp(Math.abs(w.pvy) / 40, 0, 0.24);
    g.save();
    g.translate(w.px, y);
    g.rotate(tilt);
    // Щит
    if (now < w.shieldUntil) {
      g.strokeStyle = "rgba(34,211,238,0.8)";
      g.lineWidth = 2.5;
      g.globalAlpha = 0.6 + 0.3 * Math.sin(now / 150);
      g.beginPath(); g.arc(0, 0, 30, 0, 7); g.stroke();
      g.globalAlpha = 1;
    }
    // Аура скина
    if (skin.aura) {
      g.fillStyle = skin.aura;
      g.globalAlpha = 0.5 + 0.25 * Math.sin(now / 260);
      g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fill();
      g.globalAlpha = 1;
    }
    // Плащ за спиной (развевается)
    if (skin.cape) {
      const sway = Math.sin(now / 220) * 5;
      g.fillStyle = skin.cape;
      g.globalAlpha = 0.95;
      g.beginPath();
      g.moveTo(-PW / 2 + 3, -PH / 2 + 6);
      g.quadraticCurveTo(-PW / 2 - 10 + sway, 4, -PW / 2 - 4 + sway, PH / 2 + 8);
      g.lineTo(PW / 2 + 4 - sway, PH / 2 + 8);
      g.quadraticCurveTo(PW / 2 + 10 - sway, 4, PW / 2 - 3, -PH / 2 + 6);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
    }

    // Тело
    g.scale(1 + squash * 0.4, 1 - squash);
    const bg = g.createLinearGradient(0, -PH / 2, 0, PH / 2);
    bg.addColorStop(0, skin.body1);
    bg.addColorStop(1, skin.body2);
    g.fillStyle = bg;
    roundRect(g, -PW / 2, -PH / 2, PW, PH, 15);
    g.fill();
    // Головной убор / деталь скина
    if (skin.hat === "band") {
      g.fillStyle = skin.eye;
      roundRect(g, -PW / 2, -14, PW, 6, 2); g.fill();
    } else if (skin.hat === "antenna") {
      g.strokeStyle = skin.leg; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -PH / 2); g.lineTo(0, -PH / 2 - 8); g.stroke();
      g.fillStyle = skin.eye;
      g.beginPath(); g.arc(0, -PH / 2 - 10, 3, 0, 7); g.fill();
    } else if (skin.hat === "crown") {
      g.fillStyle = "#fbbf24";
      g.beginPath();
      g.moveTo(-10, -PH / 2 - 1); g.lineTo(-10, -PH / 2 - 9);
      g.lineTo(-5, -PH / 2 - 4); g.lineTo(0, -PH / 2 - 11);
      g.lineTo(5, -PH / 2 - 4); g.lineTo(10, -PH / 2 - 9);
      g.lineTo(10, -PH / 2 - 1);
      g.closePath(); g.fill();
    } else if (skin.hat === "horns") {
      g.fillStyle = skin.leg;
      g.beginPath(); g.moveTo(-9, -PH / 2 + 2); g.lineTo(-13, -PH / 2 - 8); g.lineTo(-4, -PH / 2 - 1); g.fill();
      g.beginPath(); g.moveTo(9, -PH / 2 + 2); g.lineTo(13, -PH / 2 - 8); g.lineTo(4, -PH / 2 - 1); g.fill();
    } else if (skin.hat === "halo") {
      g.strokeStyle = "#fde68a";
      g.lineWidth = 3;
      g.globalAlpha = 0.85;
      g.beginPath(); g.ellipse(0, -PH / 2 - 9, 12, 4, 0, 0, 7); g.stroke();
      g.globalAlpha = 1;
    } else if (skin.hat === "cap") {
      g.fillStyle = skin.leg;
      g.beginPath(); g.moveTo(-11, -PH / 2 + 1); g.lineTo(-6, -PH / 2 - 9); g.lineTo(-1, -PH / 2 + 1); g.fill();
      g.beginPath(); g.moveTo(11, -PH / 2 + 1); g.lineTo(6, -PH / 2 - 9); g.lineTo(1, -PH / 2 + 1); g.fill();
    } else if (skin.hat === "helmet") {
      g.fillStyle = skin.leg;
      roundRect(g, -PW / 2 + 1, -PH / 2 - 3, PW - 2, 12, 6); g.fill();
      g.fillStyle = skin.eye;
      roundRect(g, -8, -PH / 2 + 1, 16, 3, 1.5); g.fill();
    } else if (skin.hat === "wings") {
      g.fillStyle = "#e2e8f0";
      g.beginPath(); g.moveTo(-11, -PH / 2 + 3); g.lineTo(-20, -PH / 2 - 7); g.lineTo(-9, -PH / 2 - 3); g.fill();
      g.beginPath(); g.moveTo(11, -PH / 2 + 3); g.lineTo(20, -PH / 2 - 7); g.lineTo(9, -PH / 2 - 3); g.fill();
      g.fillStyle = skin.leg;
      roundRect(g, -10, -PH / 2 - 2, 20, 7, 3); g.fill();
    } else if (skin.hat === "hood") {
      g.fillStyle = skin.body2;
      g.beginPath();
      g.moveTo(-PW / 2, -PH / 2 + 8);
      g.quadraticCurveTo(0, -PH / 2 - 9, PW / 2, -PH / 2 + 8);
      g.closePath(); g.fill();
    } else if (skin.hat === "tiara") {
      g.strokeStyle = "#fbbf24"; g.lineWidth = 2.6;
      g.beginPath(); g.arc(0, -PH / 2 + 2, 11, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      g.fillStyle = skin.eye;
      g.beginPath(); g.arc(0, -PH / 2 - 4, 2.6, 0, 7); g.fill();
    } else if (skin.hat === "flame") {
      const f = Math.sin(now / 120) * 2;
      g.fillStyle = "#f97316";
      g.beginPath();
      g.moveTo(-7, -PH / 2 + 1);
      g.quadraticCurveTo(-3, -PH / 2 - 10 - f, 0, -PH / 2 - 15 - f);
      g.quadraticCurveTo(3, -PH / 2 - 10 - f, 7, -PH / 2 + 1);
      g.fill();
      g.fillStyle = "#fde047";
      g.beginPath();
      g.moveTo(-3.5, -PH / 2 + 1);
      g.quadraticCurveTo(-1, -PH / 2 - 6 - f, 0, -PH / 2 - 9 - f);
      g.quadraticCurveTo(1.5, -PH / 2 - 6 - f, 3.5, -PH / 2 + 1);
      g.fill();
    }
    // Глаза (стиль зависит от скина)
    const look = clamp(w.pvx * 0.5, -3, 3);
    if (skin.eyes === "mask") {
      // Угловые линзы супергеройской маски
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.moveTo(-13, -11); g.lineTo(-3, -9); g.lineTo(-4, -3); g.lineTo(-12, -4);
      g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(13, -11); g.lineTo(3, -9); g.lineTo(4, -3); g.lineTo(12, -4);
      g.closePath(); g.fill();
      g.strokeStyle = skin.eye; g.lineWidth = 1.4;
      g.stroke();
    } else if (skin.eyes === "glow") {
      const pulse = 0.65 + 0.35 * Math.sin(now / 200);
      g.globalAlpha = pulse;
      g.fillStyle = skin.eye;
      g.shadowColor = skin.eye; g.shadowBlur = 12;
      roundRect(g, -12, -11, 9, 5, 2.5); g.fill();
      roundRect(g, 3, -11, 9, 5, 2.5); g.fill();
      g.shadowBlur = 0;
      g.globalAlpha = 1;
    } else if (skin.eyes === "visor") {
      g.fillStyle = "#0f172a";
      roundRect(g, -13, -12, 26, 9, 4); g.fill();
      g.fillStyle = skin.eye;
      roundRect(g, -10 + look, -10, 20, 4, 2); g.fill();
    } else if (skin.eyes === "cyclops") {
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(0, -8, 10, 0, 7); g.fill();
      g.fillStyle = skin.eye;
      g.beginPath(); g.arc(look, -8, 5, 0, 7); g.fill();
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(look + 1.6, -10, 1.8, 0, 7); g.fill();
    } else if (skin.eyes === "cute") {
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(-6, -8, 6, 0, 7); g.fill();
      g.beginPath(); g.arc(7, -8, 6, 0, 7); g.fill();
      g.fillStyle = skin.eye;
      g.beginPath(); g.arc(-6 + look * 0.5, -7.5, 3.2, 0, 7); g.fill();
      g.beginPath(); g.arc(7 + look * 0.5, -7.5, 3.2, 0, 7); g.fill();
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(-5 + look * 0.5, -9, 1.2, 0, 7); g.fill();
      g.beginPath(); g.arc(8 + look * 0.5, -9, 1.2, 0, 7); g.fill();
    } else if (skin.eyes === "angry") {
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(4 * w.face, -8, 8, 0, 7); g.fill();
      g.fillStyle = skin.eye;
      g.beginPath(); g.arc(4 * w.face + look, -8, 4, 0, 7); g.fill();
      g.strokeStyle = skin.leg; g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(4 * w.face - 8, -15); g.lineTo(4 * w.face + 7, -11);
      g.stroke();
    } else {
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(4 * w.face, -8, 8, 0, 7); g.fill();
      g.fillStyle = skin.eye;
      g.beginPath(); g.arc(4 * w.face + look, -8, 4, 0, 7); g.fill();
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(4 * w.face + look + 1.2, -9.5, 1.3, 0, 7); g.fill();
    }
    // Румянец (у геройских скинов не рисуем)
    if (!skin.emblem || skin.emblem === "none") {
      g.fillStyle = skin.accent;
      g.beginPath(); g.arc(-9 * w.face, -3, 3.4, 0, 7); g.fill();
    } else {
      drawEmblem(g, skin.emblem, skin.eye, skin.accent, now);
    }
    // Ножки
    g.fillStyle = skin.leg;
    const legY = w.pvy > 2 ? 2 : 0;
    roundRect(g, -11, PH / 2 - 4 - legY, 8, 7, 3); g.fill();
    roundRect(g, 3, PH / 2 - 4 - legY, 8, 7, 3); g.fill();
    g.restore();
  };

  const burst = (w: World, x: number, y: number, color: string, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.28);
      const sp = rnd(1, 4);
      w.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rnd(18, 34), color, size: rnd(2, 4) });
    }
  };

  const roundRect = (g: CanvasRenderingContext2D, x: number, y: number, wd: number, hd: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + wd, y, x + wd, y + hd, r);
    g.arcTo(x + wd, y + hd, x, y + hd, r);
    g.arcTo(x, y + hd, x, y, r);
    g.arcTo(x, y, x + wd, y, r);
    g.closePath();
  };

  const blob = (g: CanvasRenderingContext2D, x: number, y: number, wd: number, hd: number) => {
    g.beginPath();
    g.ellipse(x, y, wd, hd, 0, 0, 7);
    g.ellipse(x + wd * 0.4, y + 3, wd * 0.6, hd * 0.8, 0, 0, 7);
    g.fill();
  };

  // Периодические чекпоинты: монеты уходят на сервер каждые 12 секунд,
  // при сворачивании вкладки и перед закрытием страницы.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!pausedRef.current && phaseRef.current === "playing") void checkpoint();
    }, 12000);

    const onHidden = () => {
      if (document.visibilityState === "hidden") void checkpoint();
    };
    const onLeave = () => {
      const w = worldRef.current;
      if (!w) return;
      const delta = Math.floor(w.coinsRun) - syncedCoinsRef.current;
      if (delta > 0) {
        // Синхронно кладём в очередь — досошлём при следующем запуске
        addPending(delta, Math.floor(w.maxM));
        syncedCoinsRef.current += delta;
      }
    };

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onLeave);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onLeave);
      onLeave();
    };
  }, [checkpoint]);

  // Досылаем прогресс, зависший с прошлого раза
  useEffect(() => {
    const pending = getPending();
    if (!pending || pending.coins <= 0) return;
    void (async () => {
      const res = await api<{ player: PublicPlayer }>("/api/progress", {
        method: "POST",
        body: { coins: pending.coins, score: pending.score },
        retries: 1,
      });
      if (res.ok && res.data?.player) {
        clearPending();
        if (aliveRef.current) {
          onPlayerUpdateRef.current(res.data.player);
          toast(`+${pending.coins} монет`, "сохранено с прошлой игры");
        }
      }
    })();
  }, [toast]);

  // ---------- Ввод ----------
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.right = true;
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); shoot(); }
      if (e.code === "KeyP") togglePause();
      if (e.code === "KeyM") toggleMute();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "playing") return;
    const { W } = sizeRef.current;
    const x = e.clientX;
    if (e.pointerType === "mouse") { shoot(); return; }
    if (x < W * 0.42) touchRef.current.set(e.pointerId, "left");
    else if (x > W * 0.58) touchRef.current.set(e.pointerId, "right");
    else shoot();
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    touchRef.current.delete(e.pointerId);
  };

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const togglePause = () => {
    setPaused((p) => { pausedRef.current = !p; return !p; });
    sfx.click();
  };
  const toggleMute = () => {
    const next = !getMuted();
    setMuted(next);
    setMutedUi(next);
  };

  // ---------- Обработчики рекламы ----------
  const handleAdDone = async () => {
    const mode = adMode;
    setAdMode(null);
    if (!mode) return;
    await logAd(mode);
    const w = worldRef.current;
    if (mode === "rewarded_revive" && w && result) {
      reviveUsedRef.current = true;
      setReviveUsed(true);
      // Сохраняем уже сыгранное, ревайв начинает новый накопительный забег
      await saveRun();
      savedRef.current = false;
      revive(w);
      setResult(null);
      setPhase("playing");
      toast("Ты возрождён!", "продолжай подъём");
    }
    if (mode === "rewarded_double") {
      doubledRef.current = true;
      setDoubled(true);
      setResult((r) => {
        if (!r) return r;
        const nr = { ...r, coins: r.coins * 2 };
        return nr;
      });
    }
  };

  // После удвоения: сохраняем обновлённый результат
  useEffect(() => {
    if (doubled && result && !savedRef.current) void saveRun();
  }, [doubled, result, saveRun]);

  const revive = (w: World) => {
    const { gw, H } = sizeRef.current;
    const now = performance.now();
    const y = w.camY + H * 0.3;
    w.plats.push({ x: gw / 2 - 45, y: y + 70, w: 90, type: "normal", vx: 0, broken: false, fade: 1, hasSpring: false });
    w.px = gw / 2; w.py = y; w.pvy = -JUMP_V * 1.05; w.pvx = 0;
    w.dead = false;
    w.shieldUntil = now + 3000;
    w.enemies = w.enemies.filter((e) => Math.abs(e.y - y) > 160);
  };

  const exitToMenu = async () => {
    await saveRun();
    void onAuthLostRef; // сессию не рвём — выход только по кнопке в меню
    onExit();
  };

  const restartClick = async () => {
    await saveRun();
    sfx.click();
    restart();
  };

  const diffLabel = hud.m < 300 ? "Разгон" : hud.m < 800 ? "Сложно" : hud.m < 1500 ? "Хардкор" : "Безумие";

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0b0620]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
      />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4 sm:p-5">
        <div className="flex flex-col gap-1.5">
          <div className="glass rounded-2xl px-4 py-2.5">
            <p className="font-display text-2xl font-black leading-none text-white tabular-nums">
              {hud.m}
              <span className="ml-1 text-sm font-bold text-violet-300">м</span>
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{diffLabel}</p>
          </div>
          {hud.wind !== 0 && (
            <div className="glass flex animate-pulse items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-sky-300">
              <Wind className={`h-3.5 w-3.5 ${hud.wind < 0 ? "-scale-x-100" : ""}`} />
              Ветер
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {hud.shield && <span className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-cyan-300"><Shield className="h-3 w-3" />Щит</span>}
            {hud.x2 && <span className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-violet-300"><Sparkles className="h-3 w-3" />×2</span>}
            {hud.magnet && <span className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-rose-300"><Zap className="h-3 w-3" />Магнит</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="glass flex items-center gap-2 rounded-2xl px-4 py-2.5">
            <Coins className="h-4 w-4 text-amber-400" />
            <span className="font-display text-xl font-black text-amber-300 tabular-nums">{hud.coins}</span>
          </div>
          <div className="pointer-events-auto flex gap-1.5">
            <button onClick={togglePause} className="glass rounded-full p-2.5 text-white/70 transition hover:text-white" aria-label="Пауза">
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button onClick={toggleMute} className="glass rounded-full p-2.5 text-white/70 transition hover:text-white" aria-label="Звук">
              {mutedUi ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Тосты */}
      <div className="pointer-events-none absolute inset-x-0 top-24 z-10 flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="glass-strong animate-[toastIn_.3s_ease] rounded-2xl px-5 py-2.5 text-center">
            <p className="font-display text-sm font-black text-white">{t.text}</p>
            {t.sub && <p className="text-[11px] font-semibold text-amber-300">{t.sub}</p>}
          </div>
        ))}
      </div>

      {/* Подсказка управления в начале */}
      {hud.m < 15 && phase === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center">
          <p className="glass rounded-full px-5 py-2.5 text-center text-xs font-semibold text-white/80">
            ← → или A/D — движение · Пробел / клик — выстрел · P — пауза
          </p>
        </div>
      )}

      {/* Кнопка выстрела на тач-устройствах */}
      <button
        onPointerDown={(e) => { e.stopPropagation(); shoot(); }}
        className="absolute bottom-6 right-5 z-10 hidden rounded-full border border-white/20 bg-white/10 p-5 text-white backdrop-blur-md active:bg-white/25 [@media(pointer:coarse)]:block"
        aria-label="Выстрел"
      >
        <Crosshair className="h-7 w-7" />
      </button>

      {/* Пауза */}
      {paused && phase === "playing" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong flex flex-col items-center gap-4 rounded-3xl p-8">
            <p className="font-display text-2xl font-black text-white">Пауза</p>
            <div className="flex gap-3">
              <button onClick={togglePause} className="btn-neon px-6 py-3 text-sm">
                <Play className="h-4 w-4" /> Продолжить
              </button>
              <button onClick={exitToMenu} className="btn-ghost px-6 py-3 text-sm">
                <Home className="h-4 w-4" /> В меню
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Экран проигрыша */}
      {phase === "over" && result && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[3px] animate-[fadeIn_.3s_ease]">
          <div className="glass-strong w-full max-w-sm rounded-3xl p-6 text-center sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-400">Забег окончен</p>
            <h2 className="font-display mt-2 text-5xl font-black text-white">
              {result.score}<span className="text-2xl text-violet-300"> м</span>
            </h2>
            {result.score >= player.bestScore && result.score > 0 && (
              <p className="mt-1 text-sm font-bold text-amber-300">Новый рекорд!</p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Монеты</p>
                <p className="mt-1 flex items-center justify-center gap-1.5 font-display text-xl font-black text-amber-300 tabular-nums">
                  <Coins className="h-4 w-4" />{result.coins}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Рекорд</p>
                <p className="mt-1 font-display text-xl font-black text-white tabular-nums">{Math.max(player.bestScore, result.score)} м</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              {!reviveUsed && (
                <button onClick={() => setAdMode("rewarded_revive")} className="btn-neon w-full px-6 py-3.5 text-sm">
                  <Heart className="h-4 w-4" /> Возродиться за рекламу
                </button>
              )}
              {reviveUsed && !doubled && (
                <button onClick={() => setAdMode("rewarded_double")} className="btn-neon w-full px-6 py-3.5 text-sm">
                  <Rocket className="h-4 w-4" /> ×2 монеты за рекламу
                </button>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={restartClick} className="btn-ghost px-4 py-3 text-sm">
                  <RotateCcw className="h-4 w-4" /> Ещё раз
                </button>
                <button onClick={exitToMenu} className="btn-ghost px-4 py-3 text-sm">
                  <Home className="h-4 w-4" /> В меню
                </button>
              </div>
              <p className="text-[11px] text-white/40">
                Рекорд и монеты сохраняются автоматически
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Рекламный оверлей */}
      {adMode && (
        <AdOverlay
          kind={adMode}
          adLink={settings.adLink}
          adCode={settings.adCode}
          seconds={5}
          onDone={handleAdDone}
        />
      )}
    </div>
  );
}
