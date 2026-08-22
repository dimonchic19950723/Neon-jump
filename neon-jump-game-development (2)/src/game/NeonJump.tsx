import { useCallback, useEffect, useRef, useState } from "react";
import {
  Coins,
  Crosshair,
  Eye,
  Megaphone,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Trophy,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from "lucide-react";
import {
  createGame,
  render,
  revive,
  tryShoot,
  update,
  type GameState,
} from "./engine";
import { getMuted, setMuted, sfx } from "./audio";
import { playAd, type AdKind } from "./ads";
import {
  getBestScore,
  getEquippedBackground,
  getEquippedSkin,
  getMutedPref,
  getSettings,
  recordAd,
  recordRun,
  setMutedPref,
} from "./store";

type Phase = "playing" | "dying" | "over";

const ICON_BTN =
  "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/25 bg-slate-950/60 text-cyan-200 backdrop-blur-md transition-all duration-200 hover:border-cyan-300/60 hover:bg-cyan-400/10 hover:shadow-[0_0_18px_rgba(34,211,238,0.35)] active:scale-95";

const FAKE_ADS = [
  { title: "NEON ENERGY", text: "Зарядись неоном — прыгай выше всех.", accent: "#22d3ee" },
  { title: "ROCKET DELIVERY", text: "Доставим пиццу на орбиту за 88 секунд.", accent: "#e879f9" },
  { title: "PIXEL ARCADE", text: "1000 ретро-игр в одном картридже.", accent: "#a78bfa" },
  { title: "CYBER PIZZA", text: "Синтетический сыр. Настоящий вкус.", accent: "#fbbf24" },
];

function AdOverlay({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [ad] = useState(() => FAKE_ADS[(Math.random() * FAKE_ADS.length) | 0]);
  const doneRef = useRef(false);
  const { adLink, adCode } = getSettings();

  useEffect(() => {
    const started = performance.now();
    const iv = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - started) / 5000);
      setPct(p);
      if (p >= 1 && !doneRef.current) {
        doneRef.current = true;
        window.clearInterval(iv);
        window.setTimeout(onDone, 300);
      }
    }, 100);
    return () => window.clearInterval(iv);
  }, [onDone]);

  const left = Math.ceil(5 - pct * 5);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#030014]/85 px-6 backdrop-blur-sm">
      <div className="panel animate-rise w-full max-w-sm overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-700/40 px-5 py-3">
          <span className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-slate-400">
            <Megaphone className="h-3.5 w-3.5" />
            РЕКЛАМА{!adLink && !adCode ? " · ДЕМО" : ""}
          </span>
          <span className="font-display text-sm font-bold text-cyan-300 tabular-nums">
            {left > 0 ? left : "✓"}
          </span>
        </div>
        {adCode ? (
          <iframe title="ad" className="h-44 w-full border-0" sandbox="allow-scripts allow-same-origin allow-popups" srcDoc={adCode} />
        ) : adLink ? (
          <iframe src={adLink} title="ad" className="h-44 w-full border-0" sandbox="allow-scripts allow-same-origin" />
        ) : (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div
              className="animate-floaty flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: `${ad.accent}1a`,
                border: `1px solid ${ad.accent}55`,
                boxShadow: `0 0 30px ${ad.accent}44`,
              }}
            >
              <Zap className="h-8 w-8" style={{ color: ad.accent }} />
            </div>
            <p className="font-display mt-5 text-xl font-black tracking-wider" style={{ color: ad.accent }}>
              {ad.title}
            </p>
            <p className="mt-2 text-xs text-slate-400">{ad.text}</p>
            <p className="mt-4 text-[10px] tracking-[0.2em] text-slate-600">МЕСТО ДЛЯ РЕКЛАМНОЙ СЕТИ</p>
          </div>
        )}
        <div className="h-1.5 w-full bg-slate-800/60">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-[width] duration-100"
            style={{ width: `${pct * 100}%`, boxShadow: "0 0 12px rgba(34,211,238,0.7)" }}
          />
        </div>
      </div>
    </div>
  );
}

export default function NeonJump({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const phaseRef = useRef<Phase>("playing");
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [mutedUi, setMutedUi] = useState(getMuted());
  const [adMode, setAdMode] = useState<AdKind | null>(null);
  const [result, setResult] = useState<{ score: number; coins: number } | null>(null);
  const [best, setBest] = useState(getBestScore());
  const [hud, setHud] = useState({ m: 0, coins: 0, wind: 0, shield: false, x2: false, magnet: false });
  const [toasts, setToasts] = useState<{ id: number; text: string; sub?: string }[]>([]);
  const [reviveUsed, setReviveUsed] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [isTouch] = useState(() => typeof window !== "undefined" && "ontouchstart" in window);

  const aliveRef = useRef(true);
  const savedRef = useRef(false);
  const reviveUsedRef = useRef(false);
  const doubledRef = useRef(false);
  const gameRef = useRef<GameState | null>(null);
  if (!gameRef.current) {
    setMuted(getMutedPref());
    gameRef.current = createGame(
      (Math.random() * 1e9) | 0,
      getEquippedSkin(),
      getEquippedBackground(),
      { milestoneBonus: getSettings().milestoneBonus }
    );
  }

  const keysRef = useRef({ left: false, right: false });
  const touchRef = useRef(new Map<number, "left" | "right">());

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const toast = useCallback((text: string, sub?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, sub }]);
    window.setTimeout(() => {
      if (aliveRef.current) setToasts((t) => t.filter((x) => x.id !== id));
    }, 2600);
  }, []);

  const saveRun = useCallback(() => {
    if (savedRef.current || !result) return;
    savedRef.current = true;
    recordRun(result.score, result.coins);
  }, [result]);

  const newGame = useCallback(() => {
    sfx.click();
    savedRef.current = false;
    reviveUsedRef.current = false;
    doubledRef.current = false;
    gameRef.current = createGame(
      (Math.random() * 1e9) | 0,
      getEquippedSkin(),
      getEquippedBackground(),
      { milestoneBonus: getSettings().milestoneBonus }
    );
    setReviveUsed(false);
    setDoubled(false);
    setResult(null);
    setAdMode(null);
    setBest(getBestScore());
    setPhaseBoth("playing");
  }, [setPhaseBoth]);

  const exitToMenu = useCallback(() => {
    saveRun();
    onExit();
  }, [saveRun, onExit]);

  // ── main loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let hudLast = 0;

    const handleGameOver = (g: GameState) => {
      sfx.gameOver();
      setPhaseBoth("dying");
      window.setTimeout(() => {
        if (!aliveRef.current) return;
        const score = Math.floor(g.maxM);
        const coins = Math.floor(g.coinsRun);
        setResult({ score, coins });
        setPhaseBoth("over");
        window.setTimeout(() => {
          if (aliveRef.current) void requestAd("interstitial", creditShare);
        }, 650);
      }, 1150);
    };

    const step = (now: number) => {
      if (!aliveRef.current) return;
      const g = gameRef.current!;
      const dt = Math.min((now - last) / 1000, 0.06);
      last = now;

      if (!pausedRef.current && phaseRef.current !== "over") {
        update(g, keysRef.current, dt, getSettings().milestoneBonus);
        for (const e of g.events) {
          if (e === "jump") sfx.jump();
          else if (e === "spring") sfx.spring();
          else if (e === "break") sfx.hit();
          else if (e === "coin") sfx.coin();
          else if (e === "shoot") sfx.shoot();
          else if (e === "enemy") sfx.enemyDie();
          else if (e === "gameover") handleGameOver(g);
          else if (e.startsWith("milestone:")) {
            sfx.milestone();
            const [, m, b] = e.split(":");
            toast(`${m} м!`, `+${b} монет бонус`);
          } else if (e.startsWith("power:")) {
            sfx.power();
            const kind = e.split(":")[1];
            if (kind === "jetpack") toast("Джетпак!");
            else if (kind === "shield") toast("Щит активен", "выдержит один удар");
            else if (kind === "magnet") toast("Магнит монет");
            else if (kind === "x2") toast("Монеты ×2", "8 секунд");
          }
        }
        g.events.length = 0;
      }

      // HUD ~10 fps
      if (now - hudLast > 120) {
        hudLast = now;
        const mVal = Math.floor(g.maxM);
        const windNow = g.t < g.windUntil ? Math.sign(g.windForce) : 0;
        const shield = g.t < g.shieldUntil;
        const x2 = g.t < g.x2Until;
        const magnet = g.t < g.magnetUntil;
        const coinsVal = Math.floor(g.coinsRun);
        setHud((h) =>
          h.m === mVal && h.coins === coinsVal && h.wind === windNow && h.shield === shield && h.x2 === x2 && h.magnet === magnet
            ? h
            : { m: mVal, coins: coinsVal, wind: windNow, shield, x2, magnet }
        );
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const W = Math.max(1, Math.round(w * dpr));
      const H = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      render(ctx, g, w, h, dpr);
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── keyboard ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const c = e.code;
      if (c === "ArrowLeft" || c === "KeyA") keysRef.current.left = true;
      else if (c === "ArrowRight" || c === "KeyD") keysRef.current.right = true;
      else if (c === "Space" || c === "ArrowUp") {
        e.preventDefault();
        if (phaseRef.current === "playing" && !pausedRef.current) {
          sfx.ensure();
          tryShoot(gameRef.current!);
        }
      } else if (c === "KeyP" || c === "Escape") togglePause();
      else if (c === "KeyM") toggleMute();
    };
    const up = (e: KeyboardEvent) => {
      const c = e.code;
      if (c === "ArrowLeft" || c === "KeyA") keysRef.current.left = false;
      else if (c === "ArrowRight" || c === "KeyD") keysRef.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── auto-pause when tab hidden ──
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phaseRef.current === "playing") {
        pausedRef.current = true;
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      aliveRef.current = false;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const togglePause = () => {
    setPaused((p) => {
      pausedRef.current = !p;
      return !p;
    });
    sfx.click();
  };

  const toggleMute = () => {
    const next = !getMuted();
    setMuted(next);
    setMutedPref(next);
    setMutedUi(next);
  };

  // ── touch controls: edges = move, center = shoot; mouse click = shoot ──
  const onPointerDown = (e: React.PointerEvent) => {
    if (phaseRef.current !== "playing" || pausedRef.current) return;
    sfx.ensure();
    const W = window.innerWidth;
    const x = e.clientX;
    if (e.pointerType === "mouse") {
      tryShoot(gameRef.current!);
      return;
    }
    if (x < W * 0.42) touchRef.current.set(e.pointerId, "left");
    else if (x > W * 0.58) touchRef.current.set(e.pointerId, "right");
    else tryShoot(gameRef.current!);
    syncTouch();
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    touchRef.current.delete(e.pointerId);
    syncTouch();
  };
  const syncTouch = () => {
    const vals = Array.from(touchRef.current.values());
    keysRef.current.left = keysRef.current.left || vals.includes("left");
    keysRef.current.right = keysRef.current.right || vals.includes("right");
    // reset then re-apply from touches only (keyboard handled separately)
    const kb = kbState.current;
    keysRef.current.left = kb.left || vals.includes("left");
    keysRef.current.right = kb.right || vals.includes("right");
  };
  const kbState = useRef({ left: false, right: false });
  // mirror keyboard into kbState for syncTouch
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") kbState.current.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") kbState.current.right = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") kbState.current.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") kbState.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ── ad flow: настоящая сеть (Яндекс.Игры) или встроенный оверлей ──
  const creditShare = () => {
    const cut = recordAd();
    toast(`+${cut.toFixed(2)} ₽`, "твоя доля с рекламы");
  };

  const doRevive = () => {
    creditShare();
    reviveUsedRef.current = true;
    setReviveUsed(true);
    revive(gameRef.current!);
    setResult(null);
    setPhaseBoth("playing");
    toast("Ты возрождён!", "продолжай подъём");
  };

  const doDouble = () => {
    creditShare();
    doubledRef.current = true;
    setDoubled(true);
    setResult((r) => (r ? { ...r, coins: r.coins * 2 } : r));
  };

  const completeRef = useRef<(() => void) | null>(null);

  const requestAd = async (kind: AdKind, onComplete: () => void) => {
    sfx.click();
    // сначала пробуем настоящую сеть (Яндекс.Игры SDK)
    const handled = await playAd(kind, (completed) => {
      if (completed) onComplete();
      else if (kind === "rewarded")
        toast("Награда не засчитана", "реклама не была досмотрена");
    });
    if (!handled) {
      // демо или свой код: встроенный оверлей с таймером
      completeRef.current = onComplete;
      setAdMode(kind);
    }
  };

  const handleAdDone = () => {
    setAdMode(null);
    const fn = completeRef.current;
    completeRef.current = null;
    fn?.();
  };

  const isRecord = result !== null && result.score >= best && result.score > 0;
  const diffLabel = hud.m < 300 ? "Разгон" : hud.m < 800 ? "Сложно" : hud.m < 1500 ? "Хардкор" : "Безумие";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#030014] select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
      />

      <div className="scanlines pointer-events-none absolute inset-0 z-10" />
      <div className="vignette pointer-events-none absolute inset-0 z-10" />

      {/* ── HUD ── */}
      {phase === "playing" && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-32 bg-gradient-to-b from-[#030014]/80 to-transparent" />
          <div className="safe-hud pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-extrabold text-white tabular-nums [text-shadow:0_0_20px_rgba(103,232,249,0.5)]">
                  {hud.m}
                </span>
                <span className="text-sm font-bold text-slate-400">м</span>
              </div>
              <p className="mt-0.5 text-[10px] font-bold tracking-[0.3em] text-cyan-300/60">
                {diffLabel}
              </p>
              {hud.wind !== 0 && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-fuchsia-300/40 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] font-bold text-fuchsia-200">
                  <Wind className={`h-3 w-3 ${hud.wind < 0 ? "-scale-x-100" : ""}`} />
                  Ветер
                </span>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="pointer-events-auto flex gap-2">
                <button className={ICON_BTN} onClick={toggleMute} aria-label="Звук (M)">
                  {mutedUi ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
                </button>
                <button className={ICON_BTN} onClick={togglePause} aria-label="Пауза (P)">
                  {paused ? <Play className="h-4.5 w-4.5" /> : <Pause className="h-4.5 w-4.5" />}
                </button>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-300/30 bg-slate-950/60 px-3 py-1.5 backdrop-blur-md">
                <Coins className="h-4 w-4 text-amber-300" />
                <span className="font-display text-lg font-extrabold text-amber-300 tabular-nums">
                  {hud.coins}
                </span>
              </div>
              <div className="flex gap-1">
                {hud.shield && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-cyan-300/50 bg-cyan-400/15 text-cyan-300">
                    <Shield className="h-3.5 w-3.5" />
                  </span>
                )}
                {hud.x2 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-violet-300/50 bg-violet-400/15 text-[10px] font-black text-violet-300">
                    ×2
                  </span>
                )}
                {hud.magnet && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-rose-300/50 bg-rose-400/15 text-[10px] font-black text-rose-300">
                    M
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* тосты */}
          <div className="pointer-events-none absolute inset-x-0 top-24 z-40 flex flex-col items-center gap-1.5 px-4">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="animate-toast rounded-full border border-amber-300/30 bg-slate-950/80 px-4 py-1.5 text-center backdrop-blur-md"
              >
                <span className="text-[11px] font-black text-amber-300">{t.text}</span>
                {t.sub && <span className="ml-2 text-[10px] text-slate-400">{t.sub}</span>}
              </div>
            ))}
          </div>

          {/* подсказка в начале */}
          {hud.m < 15 && !paused && (
            <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center px-4">
              <p className="animate-floaty rounded-full border border-cyan-300/25 bg-slate-950/70 px-5 py-2.5 text-center text-[11px] font-semibold tracking-wide text-cyan-100/90 backdrop-blur-md">
                ← → или A/D — движение · Пробел / клик — выстрел · P — пауза
              </p>
            </div>
          )}

          {/* кнопка выстрела на тач-устройствах */}
          {isTouch && !paused && (
            <button
              className="safe-bottom pointer-events-auto absolute right-5 z-30 flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-300/60 bg-rose-500/20 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.35)] backdrop-blur-md active:scale-90"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (phaseRef.current === "playing" && !pausedRef.current) {
                  sfx.ensure();
                  tryShoot(gameRef.current!);
                }
              }}
              aria-label="Выстрел"
            >
              <Crosshair className="h-7 w-7" />
            </button>
          )}
        </>
      )}

      {/* ── пауза ── */}
      {paused && phase === "playing" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#030014]/70 px-6 backdrop-blur-sm">
          <div className="panel animate-rise w-full max-w-xs rounded-3xl p-8 text-center">
            <p className="font-display neon-soft text-2xl font-bold tracking-[0.3em] text-cyan-200">ПАУЗА</p>
            <p className="mt-3 text-xs text-slate-400">
              {hud.m} м · <span className="text-amber-300">{hud.coins} монет</span>
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <button
                className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-cyan-300/80 bg-cyan-400/10 px-8 py-3.5 font-display text-sm font-bold tracking-[0.25em] text-cyan-100 transition-all hover:bg-cyan-300/25 active:scale-95"
                onClick={togglePause}
              >
                <Play className="h-4 w-4 fill-current" />
                ДАЛЬШЕ
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-950/20 px-6 py-3 text-xs font-bold tracking-[0.2em] text-rose-300/80 transition-all hover:border-rose-400/60 hover:text-rose-200 active:scale-95"
                onClick={exitToMenu}
              >
                <X className="h-4 w-4" />
                СДАТЬСЯ И ВЫЙТИ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── экран проигрыша ── */}
      {phase === "over" && result && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#030014]/60 px-4 backdrop-blur-[3px]">
          <div className="panel animate-rise w-full max-w-sm rounded-3xl p-6 text-center sm:p-8">
            <p className="text-[10px] font-bold tracking-[0.5em] text-fuchsia-300/70">ЗАБЕГ ОКОНЧЕН</p>
            <h2 className="font-display neon-cyan mt-2 text-5xl font-black text-white tabular-nums">
              {result.score} <span className="text-2xl text-cyan-300">м</span>
            </h2>
            {isRecord && (
              <div className="animate-record mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-400/10 px-4 py-1.5 text-[11px] font-black tracking-[0.25em] text-amber-300">
                <Trophy className="h-4 w-4" />
                НОВЫЙ РЕКОРД!
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-600/30 bg-slate-950/50 py-3">
                <p className="text-[9px] font-bold tracking-[0.25em] text-slate-500">МОНЕТЫ</p>
                <p className="mt-1 flex items-center justify-center gap-1.5 font-display text-xl font-black text-amber-300 tabular-nums">
                  <Coins className="h-4 w-4" />
                  {result.coins}
                </p>
              </div>
              <div className="rounded-xl border border-slate-600/30 bg-slate-950/50 py-3">
                <p className="text-[9px] font-bold tracking-[0.25em] text-slate-500">РЕКОРД</p>
                <p className="mt-1 font-display text-xl font-black text-slate-200 tabular-nums">
                  {Math.max(best, result.score)} м
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              {!reviveUsed && (
                <button
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl border-2 border-lime-300/70 bg-lime-400/10 px-6 py-3 text-xs font-black tracking-[0.18em] text-lime-200 transition-all hover:bg-lime-300/20 hover:shadow-[0_0_35px_rgba(163,230,53,0.4)] active:scale-95"
                  onClick={() => void requestAd("rewarded", doRevive)}
                >
                  <Zap className="h-4 w-4" />
                  ВОЗРОДИТЬСЯ · реклама
                </button>
              )}
              {reviveUsed && !doubled && (
                <button
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl border-2 border-amber-300/70 bg-amber-400/10 px-6 py-3 text-xs font-black tracking-[0.18em] text-amber-200 transition-all hover:bg-amber-300/20 hover:shadow-[0_0_35px_rgba(253,224,71,0.4)] active:scale-95"
                  onClick={() => void requestAd("rewarded", doDouble)}
                >
                  <Coins className="h-4 w-4" />
                  МОНЕТЫ ×2 · реклама
                </button>
              )}
              <button
                className="inline-flex items-center justify-center gap-2.5 rounded-2xl border-2 border-cyan-300/60 bg-cyan-400/10 px-6 py-3 text-xs font-black tracking-[0.18em] text-cyan-100 transition-all hover:bg-cyan-300/20 active:scale-95"
                onClick={exitToMenu}
              >
                <Trophy className="h-4 w-4" />
                ЗАБРАТЬ {result.coins} МОНЕТ
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-500/40 bg-slate-950/40 px-6 py-2.5 text-[11px] font-bold tracking-[0.2em] text-slate-300 transition-all hover:border-fuchsia-300/50 hover:text-fuchsia-200 active:scale-95"
                onClick={() => {
                  saveRun();
                  newGame();
                }}
              >
                <RotateCcw className="h-4 w-4" />
                ЗАНОВО
              </button>
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
              <Eye className="h-3 w-3" />
              Рекорд и монеты сохраняются автоматически
            </p>
          </div>
        </div>
      )}

      {/* ── рекламный оверлей ── */}
      {adMode && <AdOverlay onDone={handleAdDone} />}
    </div>
  );
}
