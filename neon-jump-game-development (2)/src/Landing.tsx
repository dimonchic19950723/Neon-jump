import { useEffect, useState } from "react";
import {
  Check,
  Coins,
  Crosshair,
  Loader2,
  Lock,
  LogOut,
  UserPlus,
  MonitorPlay,
  PenLine,
  Percent,
  Play,
  Settings,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  RotateCcw,
  Wallet,
  Wind,
  Zap,
  MousePointer2,
} from "lucide-react";
import {
  buyBackground,
  buySkin,
  equipBackground,
  equipSkin,
  exchangeCoins,
  getBestScore,
  getInventory,
  getLeaderboard,
  getProfile,
  getSettings,
  getUserStats,
  getWallet,
  setProfileName,
  withdrawRubles,
} from "./game/store";
import { BACKGROUNDS, RARITY_META, SKINS, type Background, type Skin } from "./game/data";
import { isGuest, logout } from "./game/auth";
import SkinAvatar from "./game/SkinAvatar";

type ShopTab = "skins" | "bgs";
type LBTab = "score" | "earn";

export default function Landing({
  onPlay,
  onAccountChange,
}: {
  onPlay: () => void;
  onAccountChange: () => void;
}) {
  const [tick, setTick] = useState(0);
  const [restoring, setRestoring] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [shopTab, setShopTab] = useState<ShopTab>("skins");
  const [lbTab, setLbTab] = useState<LBTab>("score");
  void tick;

  const profile = getProfile();
  const guest = isGuest();
  const wallet = getWallet();
  const inv = getInventory();
  const lb = getLeaderboard();
  const settings = getSettings();
  const stats = getUserStats();
  const best = getBestScore();
  const totalEarned = Math.round((stats.lifetimeCoins / settings.coinRate) * 100) / 100;
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    const t = window.setTimeout(() => setRestoring(false), 1100);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const doExchange = () => {
    const got = exchangeCoins();
    setToast(got > 0 ? `Обменяно: +${got.toFixed(2)} ₽` : "Пока нечего менять — лети вверх!");
    refresh();
  };
  const doWithdraw = () => {
    const res = withdrawRubles();
    setToast(
      res.ok
        ? `Заявка на вывод ${res.amount.toFixed(2)} ₽ создана (демо)`
        : res.guest
          ? "Вывод доступен только зарегистрированным — создай аккаунт"
          : `Минимальная сумма вывода — ${res.need} ₽`
    );
    refresh();
  };
  const saveName = () => {
    setProfileName(name || profile.username);
    setEditing(false);
    setToast("Имя сохранено");
    refresh();
  };

  const onBuySkin = (s: Skin) => {
    const res = buySkin(s.id);
    setToast(res === "ok" ? `${s.name} — твой! Уже экипирован` : res === "poor" ? `Не хватает монет: нужно ${s.price}` : "Уже куплен");
    refresh();
  };
  const onEquipSkin = (s: Skin) => {
    equipSkin(s.id);
    setToast(`${s.name} экипирован`);
    refresh();
  };
  const onBuyBg = (b: Background) => {
    const res = buyBackground(b.id);
    setToast(res === "ok" ? `Фон «${b.name}» куплен и применён` : res === "poor" ? `Не хватает монет: нужно ${b.price}` : "Уже куплен");
    refresh();
  };
  const onEquipBg = (b: Background) => {
    equipBackground(b.id);
    setToast(`Фон «${b.name}» применён`);
    refresh();
  };

  const lbRows = lbTab === "score" ? lb.byScore : lb.byEarn;

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#030014] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute top-1/3 -left-40 h-[400px] w-[400px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-[400px] w-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>
      <div className="scanlines pointer-events-none fixed inset-0 z-10" />

      {/* ── header ── */}
      <header className="sticky top-0 z-40 border-b border-cyan-300/10 bg-[#030014]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/10 shadow-[0_0_18px_rgba(34,211,238,0.35)]">
              <Zap className="h-5 w-5 text-cyan-300" />
            </span>
            <span className="font-display text-lg font-black tracking-wide text-white">
              Neon<span className="neon-magenta text-fuchsia-400">Jump</span>
            </span>
          </a>
          <nav className="hidden items-center gap-5 text-[11px] font-bold tracking-[0.15em] text-slate-400 md:flex">
            <a href="#shop" className="transition hover:text-cyan-300">МАГАЗИН</a>
            <a href="#top" className="transition hover:text-cyan-300">ЛИДЕРЫ</a>
            <a href="#wallet" className="transition hover:text-cyan-300">КОШЕЛЁК</a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#wallet"
              className="flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-400/5 px-3 py-2 text-xs font-bold text-amber-300 transition hover:border-amber-300/50 hover:bg-amber-400/10"
            >
              <Coins className="h-4 w-4" />
              <span className="tabular-nums">{wallet.coins}</span>
              <span className="hidden text-slate-500 sm:inline">·</span>
              <span className="hidden tabular-nums sm:inline">{wallet.rubles.toFixed(2)} ₽</span>
            </a>
            {guest ? (
              <button
                onClick={() => {
                  logout();
                  onAccountChange();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-lime-300/40 bg-lime-400/10 px-3 py-2 text-xs font-bold text-lime-200 transition hover:bg-lime-300/20"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Создать аккаунт</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  logout();
                  onAccountChange();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-600/40 px-3 py-2 text-xs font-bold text-slate-400 transition hover:border-rose-300/40 hover:text-rose-200"
                title={`Выйти из ${profile.username}`}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            )}
            <a
              href="#/admin"
              className="flex items-center gap-1.5 rounded-xl border border-slate-600/40 px-3 py-2 text-xs font-bold text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-200"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden lg:inline">Админ</span>
            </a>
          </div>
        </div>
      </header>

      <main className="safe-page relative z-20 mx-auto max-w-6xl px-4 sm:px-6">
        {/* ── hero ── */}
        <section className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-4 py-1.5 text-[11px] font-bold tracking-wider text-fuchsia-200">
              <Percent className="h-3.5 w-3.5" />
              Играй и получай {settings.share}% дохода с рекламы
            </div>
            <h1 className="font-display mt-6 text-[clamp(2.6rem,7vw,4.6rem)] leading-[1.02] font-black text-white">
              Прыгай
              <br />
              <span className="neon-cyan text-cyan-300">выше всех</span>
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
              Хардкорный аркадный прыгун: движущиеся и исчезающие платформы,
              враги, ветер и гравитационные аномалии. Каждый метр и каждый
              просмотр рекламы превращаются в реальные деньги — прогресс
              надёжно хранится в твоём аккаунте.
            </p>

            {/* аккаунт */}
            <div className="mt-6">
              {restoring ? (
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Loader2 className="animate-spin-slow h-3.5 w-3.5 text-cyan-300" />
                  <span>
                    Восстанавливаем аккаунт…
                    <span className="block text-slate-600">Меню уже готово — это займёт секунду</span>
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-950/50 px-4 py-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.25em] text-slate-500">
                        {guest ? "ГОСТЕВОЙ РЕЖИМ" : "АККАУНТ"}
                        {guest && (
                          <span className="rounded bg-fuchsia-400/15 px-1.5 py-0.5 text-[8px] text-fuchsia-300">
                            БЕЗ РЕГИСТРАЦИИ
                          </span>
                        )}
                      </p>
                      <p className="text-sm font-bold text-white">{profile.username}</p>
                    </div>
                    <div className="hidden h-8 w-px bg-slate-700/60 sm:block" />
                    <div className="text-[10px] text-slate-400">
                      <p>Рекорд: <span className="font-bold text-cyan-300 tabular-nums">{best} м</span></p>
                      <p>Заработано: <span className="font-bold text-lime-300 tabular-nums">{totalEarned.toFixed(2)} ₽</span></p>
                    </div>
                  </div>

                  {guest && (
                    <button
                      onClick={() => {
                        logout();
                        onAccountChange();
                      }}
                      className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-lime-300/35 bg-lime-400/10 px-4 py-3 text-left transition hover:border-lime-300/60 hover:bg-lime-400/15 active:scale-[0.99] sm:w-auto"
                    >
                      <UserPlus className="h-4.5 w-4.5 shrink-0 text-lime-300" />
                      <span className="text-[11px] leading-relaxed text-lime-100">
                        <b>Сохрани прогресс навсегда</b> — создай аккаунт, и монеты,
                        скины и рекорд перенесутся. Вывод рублей только с аккаунтом.
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={onPlay}
                className="group inline-flex items-center gap-3 rounded-2xl border-2 border-cyan-300/80 bg-cyan-400/10 px-9 py-4 font-display text-sm font-bold tracking-[0.25em] text-cyan-100 transition-all hover:bg-cyan-300/25 hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] active:scale-95"
              >
                <Play className="h-5 w-5 fill-current transition-transform group-hover:scale-125" />
                ИГРАТЬ
              </button>
              <a
                href="#shop"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-600/40 px-6 py-4 text-xs font-bold tracking-[0.2em] text-slate-300 transition hover:border-fuchsia-300/50 hover:text-fuchsia-200"
              >
                <ShoppingBag className="h-4 w-4" />
                МАГАЗИН
              </a>
            </div>

            {/* модель заработка */}
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-2.5">
              {[
                { Icon: Coins, t: "Монеты за высоту", d: `${settings.coinRate} монет = 1 ₽`, c: "#fbbf24" },
                { Icon: MonitorPlay, t: `${settings.share}% с рекламы`, d: `CPM ${settings.cpm} ₽`, c: "#e879f9" },
                { Icon: Wallet, t: "Вывод рублей", d: `от ${settings.minWithdraw} ₽`, c: "#22d3ee" },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl border border-slate-700/40 bg-slate-950/50 p-3.5">
                  <c.Icon className="h-4 w-4" style={{ color: c.c }} />
                  <p className="mt-2 text-[11px] font-bold text-slate-200">{c.t}</p>
                  <p className="text-[10px]" style={{ color: c.c }}>{c.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* phone mock */}
          <div className="mx-auto w-full max-w-[300px]">
            <div className="relative rounded-[2.6rem] border border-cyan-300/25 bg-gradient-to-b from-slate-900 to-slate-950 p-2.5 shadow-[0_0_90px_rgba(34,211,238,0.14),0_40px_80px_rgba(0,0,0,0.5)]">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#0a0524] via-[#130738] to-[#20094a]">
                {[...Array(14)].map((_, i) => (
                  <span
                    key={i}
                    className="mock-star absolute h-1 w-1 rounded-full bg-cyan-100"
                    style={{ left: `${(i * 37 + 13) % 90}%`, top: `${(i * 23 + 7) % 92}%`, animationDelay: `${(i % 5) * 0.4}s` }}
                  />
                ))}
                <div className="absolute bottom-[16%] left-[8%] h-2 w-[30%] rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.9)]" />
                <div className="mock-plat absolute bottom-[33%] right-[6%] h-2 w-[26%] rounded-full bg-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,0.9)]" />
                <div className="mock-blink absolute bottom-[49%] left-[28%] h-2 w-[24%] rounded-full bg-violet-400 shadow-[0_0_14px_rgba(167,139,250,0.9)]" />
                <div className="absolute bottom-[65%] right-[14%] h-2 w-[28%] rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.9)]" />
                <div className="absolute bottom-[81%] left-[10%] h-2 w-[20%] rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.9)]" />
                <div className="mock-plat absolute bottom-[41%] left-[12%] h-3 w-6 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.9)]" style={{ animationDelay: "-1.4s" }} />
                <span className="mock-star absolute bottom-[58%] right-[30%] inline-block h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(253,224,71,0.9)]" />
                <div className="absolute bottom-[19%] left-[14%]">
                  <SkinAvatar skin={SKINS.find((sk) => sk.id === inv.skin) ?? SKINS[0]} size={56} />
                </div>
                <div className="absolute top-3 left-4">
                  <p className="text-[8px] font-bold tracking-[0.3em] text-amber-300/70">МОНЕТЫ</p>
                  <p className="font-display text-xl font-black text-amber-300 tabular-nums">128</p>
                </div>
                <div className="absolute right-3 bottom-3 flex flex-col items-end gap-1.5">
                  <span className="animate-floaty rounded-full border border-amber-300/40 bg-slate-950/70 px-2.5 py-1 text-[8px] font-bold text-amber-300">
                    Бонус каждые 250 м
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-2 text-[10px] font-semibold">
              <span className="flex items-center gap-1.5 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/5 px-3 py-1.5 text-fuchsia-300">
                <Wind className="h-3 w-3" />
                Ветер выше 600 м
              </span>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/5 px-3 py-1.5 text-cyan-300">
                Щиты, магниты и джетпаки
              </span>
            </div>
          </div>
        </section>

        {/* ── SHOP ── */}
        <section id="shop" className="pb-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.5em] text-fuchsia-300/60">МАГАЗИН</p>
              <h2 className="font-display mt-2 text-3xl font-black text-white">Герои и фоны</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-400/5 px-4 py-2.5 text-sm font-bold text-amber-300">
                <Coins className="h-4 w-4" />
                <span className="tabular-nums">{wallet.coins}</span>
              </span>
              <div className="flex rounded-xl border border-slate-600/40 p-1">
                {([["skins", "Персонажи"], ["bgs", "Фоны"]] as [ShopTab, string][]).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setShopTab(k)}
                    className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                      shopTab === k ? "bg-cyan-400/20 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.25)]" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {shopTab === "skins" ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {SKINS.map((s) => {
                const owned = inv.skins.includes(s.id);
                const equipped = inv.skin === s.id;
                const afford = wallet.coins >= s.price;
                const meta = RARITY_META[s.rarity];
                return (
                  <div
                    key={s.id}
                    className={`panel group relative overflow-hidden rounded-2xl p-4 transition-transform duration-300 hover:-translate-y-1 ${equipped ? "border-lime-300/50" : ""}`}
                    style={equipped ? { boxShadow: "0 0 30px rgba(163,230,53,0.15)" } : undefined}
                  >
                    {s.hero && (
                      <span className="absolute top-3 right-3 rounded-md bg-rose-400/15 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-rose-300">HERO</span>
                    )}
                    <SkinAvatar skin={s} size={96} />
                    <p className="font-display mt-1 text-sm font-bold text-white">{s.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{s.desc}</p>
                    <span
                      className="mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider"
                      style={{ color: meta.color, background: `${meta.color}14`, border: `1px solid ${meta.color}33` }}
                    >
                      {meta.label}
                    </span>
                    <div className="mt-3">
                      {equipped ? (
                        <span className="flex items-center justify-center gap-1.5 rounded-xl border border-lime-300/50 bg-lime-400/10 py-2.5 text-[11px] font-black tracking-wider text-lime-300">
                          <Check className="h-4 w-4" />В ИГРЕ
                        </span>
                      ) : owned ? (
                        <button
                          onClick={() => onEquipSkin(s)}
                          className="w-full rounded-xl border border-cyan-300/50 bg-cyan-400/10 py-2.5 text-[11px] font-black tracking-wider text-cyan-200 transition hover:bg-cyan-300/20 active:scale-95"
                        >
                          ВЫБРАТЬ
                        </button>
                      ) : (
                        <button
                          onClick={() => onBuySkin(s)}
                          className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[11px] font-black tracking-wider transition active:scale-95 ${
                            afford ? "border-amber-300/60 bg-amber-400/10 text-amber-200 hover:bg-amber-300/20" : "border-slate-600/40 bg-slate-900/40 text-slate-500"
                          }`}
                        >
                          {afford ? <Coins className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                          {s.price === 0 ? "БЕСПЛАТНО" : `${s.price}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {BACKGROUNDS.map((b) => {
                const owned = inv.bgs.includes(b.id);
                const equipped = inv.bg === b.id;
                const afford = wallet.coins >= b.price;
                const meta = RARITY_META[b.rarity];
                return (
                  <div
                    key={b.id}
                    className={`panel group relative overflow-hidden rounded-2xl p-4 transition-transform duration-300 hover:-translate-y-1`}
                    style={equipped ? { boxShadow: "0 0 30px rgba(163,230,53,0.15)", borderColor: "rgba(163,230,53,0.5)" } : undefined}
                  >
                    <div className="relative h-24 w-full overflow-hidden rounded-xl border border-white/10" style={{ background: b.preview }}>
                      {[...Array(8)].map((_, i) => (
                        <span
                          key={i}
                          className="absolute h-0.5 w-0.5 rounded-full"
                          style={{ background: `rgb(${b.star})`, left: `${(i * 29 + 11) % 92}%`, top: `${(i * 17 + 9) % 84}%` }}
                        />
                      ))}
                      {b.weather !== "none" && (
                        <span className="absolute right-2 bottom-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white/90 backdrop-blur-sm">
                          {b.weather === "snow" ? "СНЕГ" : b.weather === "petals" ? "ЛЕПЕСТКИ" : b.weather === "bubbles" ? "ПУЗЫРИ" : b.weather === "embers" ? "ИСКРЫ" : b.weather === "code" ? "КОД-ДОЖДЬ" : "МЕТЕОРЫ"}
                        </span>
                      )}
                    </div>
                    <p className="font-display mt-3 text-sm font-bold text-white">{b.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{b.desc}</p>
                    <span
                      className="mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider"
                      style={{ color: meta.color, background: `${meta.color}14`, border: `1px solid ${meta.color}33` }}
                    >
                      {meta.label}
                    </span>
                    <div className="mt-3">
                      {equipped ? (
                        <span className="flex items-center justify-center gap-1.5 rounded-xl border border-lime-300/50 bg-lime-400/10 py-2.5 text-[11px] font-black tracking-wider text-lime-300">
                          <Check className="h-4 w-4" />АКТИВЕН
                        </span>
                      ) : owned ? (
                        <button
                          onClick={() => onEquipBg(b)}
                          className="w-full rounded-xl border border-cyan-300/50 bg-cyan-400/10 py-2.5 text-[11px] font-black tracking-wider text-cyan-200 transition hover:bg-cyan-300/20 active:scale-95"
                        >
                          ПРИМЕНИТЬ
                        </button>
                      ) : (
                        <button
                          onClick={() => onBuyBg(b)}
                          className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[11px] font-black tracking-wider transition active:scale-95 ${
                            afford ? "border-amber-300/60 bg-amber-400/10 text-amber-200 hover:bg-amber-300/20" : "border-slate-600/40 bg-slate-900/40 text-slate-500"
                          }`}
                        >
                          {afford ? <Coins className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                          {b.price === 0 ? "БЕСПЛАТНО" : `${b.price}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── leaderboard ── */}
        <section id="top" className="pb-16">
          <div className="panel overflow-hidden rounded-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/40 px-6 py-4">
              <h2 className="font-display flex items-center gap-2.5 text-lg font-bold text-white">
                <Trophy className="h-5 w-5 text-amber-300" />
                Лидеры
              </h2>
              <div className="flex rounded-xl border border-slate-600/40 p-1">
                {([["score", "По очкам"], ["earn", "По заработку"]] as [LBTab, string][]).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setLbTab(k)}
                    className={`rounded-lg px-3.5 py-1.5 text-[11px] font-bold transition ${
                      lbTab === k ? "bg-amber-400/20 text-amber-200" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {lbRows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <Sparkles className="h-8 w-8 text-cyan-300/50" />
                <p className="text-sm text-slate-400">Пока пусто — стань первым!</p>
                <button
                  onClick={onPlay}
                  className="mt-1 inline-flex items-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-400/10 px-5 py-2.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-300/20"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Занять первое место
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/60">
                {lbRows.map((r, i) => (
                  <li key={r.id} className={`flex items-center gap-4 px-6 py-3.5 ${r.id === profile.id ? "bg-cyan-400/5" : ""}`}>
                    <span className="w-7 text-center">
                      {i === 0 ? (
                        <Trophy className="mx-auto h-4.5 w-4.5 text-amber-300" />
                      ) : (
                        <span className={`font-display text-sm font-black tabular-nums ${i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-600"}`}>
                          {i + 1}
                        </span>
                      )}
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold text-slate-200">
                      {r.username}
                      {r.id === profile.id && (
                        <span className="ml-2 rounded-full bg-cyan-400/15 px-2 py-0.5 text-[9px] font-bold text-cyan-300">ТЫ</span>
                      )}
                    </span>
                    <span className="text-sm font-bold tabular-nums">
                      {lbTab === "score" ? (
                        <span className="text-cyan-200">{r.bestScore} м</span>
                      ) : (
                        <span className="text-lime-300">{r.totalEarned.toFixed(2)} ₽</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── how to play ── */}
        <section id="howto" className="grid gap-10 pb-16 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="font-display mt-2 text-3xl font-black text-white">Как играть</h2>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Честная экономика: вся статистика показов и выплат хранится на
              сервере. Владелец игры подключает рекламную сеть, CPM и долю
              игрока в админ-панели.
            </p>
            <button
              onClick={onPlay}
              className="group mt-6 inline-flex items-center gap-3 rounded-2xl border-2 border-cyan-300/80 bg-cyan-400/10 px-8 py-3.5 font-display text-xs font-bold tracking-[0.25em] text-cyan-100 transition-all hover:bg-cyan-300/25 hover:shadow-[0_0_40px_rgba(34,211,238,0.45)] active:scale-95"
            >
              <Target className="h-4 w-4 transition-transform group-hover:rotate-45" />
              В ИГРУ
            </button>
          </div>
          <ul className="space-y-3">
            {[
              { Icon: MousePointer2, t: "← → или A/D — движение. На мобильном — касания по краям экрана." },
              { Icon: Target, t: "Пробел или клик — выстрел. Сбивай дронов и НЛО: +6 монет за цель." },
              { Icon: TrendingUp, t: "Чем выше, тем сложнее: платформы ломаются, исчезают и ускоряются." },
              { Icon: MonitorPlay, t: "После проигрыша — короткая реклама. Доля дохода с показа капает тебе." },
              { Icon: RotateCcw, t: "Можно возродиться за просмотр рекламы или удвоить монеты забега." },
            ].map((r, i) => (
              <li key={i} className="panel flex items-start gap-4 rounded-2xl px-5 py-4 transition-transform duration-300 hover:translate-x-1">
                <span className="font-display text-xs font-black text-cyan-300/50 tabular-nums">0{i + 1}</span>
                <r.Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-fuchsia-300" />
                <p className="text-xs leading-relaxed text-slate-300">{r.t}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── wallet ── */}
        <section id="wallet" className="pb-20">
          <div className="panel grid gap-8 rounded-3xl p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="font-display flex items-center gap-2.5 text-xl font-bold text-white">
                <Wallet className="h-5 w-5 text-cyan-300" />
                Кошелёк
              </h2>

              <div className="mt-5 flex items-center gap-3">
                {editing ? (
                  <>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={profile.username}
                      maxLength={18}
                      className="w-44 rounded-xl border border-cyan-300/30 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/70"
                    />
                    <button
                      onClick={saveName}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-lime-300/40 bg-lime-400/10 text-lime-300 transition hover:bg-lime-400/20"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-300">
                      <span className="font-bold text-white">{profile.username}</span>
                      <span className="ml-2 text-[11px] text-slate-500">{profile.id}</span>
                    </p>
                    <button
                      onClick={() => {
                        setName(profile.username);
                        setEditing(true);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-600/40 text-slate-400 transition hover:border-cyan-300/50 hover:text-cyan-300"
                    >
                      <PenLine className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-amber-300/25 bg-amber-400/5 p-5">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.25em] text-amber-300/70">
                    <Coins className="h-3.5 w-3.5" />
                    МОНЕТЫ
                  </p>
                  <p className="font-display neon-gold mt-2 text-3xl font-black text-amber-300 tabular-nums">{wallet.coins}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{settings.coinRate} монет = 1 ₽</p>
                </div>
                <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/5 p-5">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.25em] text-cyan-300/70">
                    <Wallet className="h-3.5 w-3.5" />
                    БАЛАНС
                  </p>
                  <p className="font-display neon-cyan mt-2 text-3xl font-black text-cyan-200 tabular-nums">{wallet.rubles.toFixed(2)} ₽</p>
                  <p className="mt-1 text-[10px] text-slate-500">с монет и рекламы</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={doExchange}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-400/10 px-5 py-3 text-xs font-bold text-amber-200 transition hover:bg-amber-300/20 active:scale-95"
                >
                  <Coins className="h-4 w-4" />
                  Обменять монеты → ₽
                </button>
                <button
                  onClick={doWithdraw}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-400/10 px-5 py-3 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/20 active:scale-95"
                >
                  <Wallet className="h-4 w-4" />
                  Вывести от {settings.minWithdraw} ₽
                </button>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
                Демо-режим: баланс хранится локально в браузере. Подключи
                сервер и рекламную сеть в админ-панели для реальных выплат.
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] text-slate-500">ИСТОРИЯ ВЫПЛАТ</p>
              {wallet.payouts.length === 0 ? (
                <div className="mt-4 flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700/60 text-slate-600">
                  <Wallet className="h-6 w-6" />
                  <p className="text-xs">Выплат пока не было</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {wallet.payouts.slice(0, 5).map((p, i) => (
                    <li key={i} className="flex items-center justify-between rounded-xl border border-slate-700/40 bg-slate-950/50 px-4 py-3 text-xs">
                      <span className="text-slate-400">
                        {new Date(p.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="font-bold text-lime-300 tabular-nums">−{p.amount.toFixed(2)} ₽</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-20 border-t border-slate-800/60 py-6 text-center text-[10px] tracking-[0.3em] text-slate-600">
        NEON JUMP · ИГРАЙ И ЗАРАБАТЫВАЙ · {settings.coinRate} МОНЕТ = 1 ₽
      </footer>

      {toast && (
        <div className="animate-toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-cyan-300/30 bg-slate-950/90 px-5 py-3 text-xs font-bold text-cyan-100 shadow-[0_0_40px_rgba(34,211,238,0.25)] backdrop-blur-md">
          {toast}
        </div>
      )}

      {/* hidden icons for tree-shaking sanity: Crosshair used in game */}
      <span className="hidden"><Crosshair className="h-0 w-0" /></span>
    </div>
  );
}
