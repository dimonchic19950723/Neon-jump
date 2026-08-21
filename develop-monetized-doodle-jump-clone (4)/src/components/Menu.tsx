"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Trophy,
  Wallet,
  Coins,
  TrendingUp,
  MousePointer2,
  Keyboard,
  Target,
  Crown,
  Sparkles,
  MonitorPlay,
  BadgePercent,
  LogIn,
  Loader2,
  Shield,
  Wind,
  Rocket,
  ShoppingBag,
  UserPlus,
  LogOut,
  Lock,
  User,
} from "lucide-react";
import type { PublicPlayer } from "@/components/game/GameCanvas";
import type { SettingsMap } from "@/lib/economy";
import { sfx } from "@/components/game/sound";

interface Props {
  player: PublicPlayer | null;
  settings: SettingsMap | null;
  sessionChecking: boolean;
  authBusy: boolean;
  authError: string;
  onAuth: (username: string, password: string, mode: "login" | "register") => void;
  onLogout: () => void;
  onPlay: () => void;
  onShop: () => void;
  onWallet: () => void;
}

interface LeaderRow {
  id: string;
  username: string;
  bestScore: number;
  totalEarned: number;
}

export default function Menu({
  player, settings, sessionChecking, authBusy, authError, onAuth, onLogout, onPlay,
  onShop, onWallet,
}: Props) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [localError, setLocalError] = useState("");
  const [leaders, setLeaders] = useState<{ byScore: LeaderRow[]; byEarn: LeaderRow[] } | null>(null);
  const [tab, setTab] = useState<"score" | "earn">("score");

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setLeaders(d))
      .catch(() => {});
  }, [player]);

  const share = settings ? parseFloat(settings.playerShare) : 50;
  const cpm = settings ? parseFloat(settings.cpm) : 120;
  const rate = settings ? parseFloat(settings.coinRate) : 100;
  const rows = leaders ? (tab === "score" ? leaders.byScore : leaders.byEarn) : [];
  const error = localError || authError;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (name.trim().length < 2) return setLocalError("Логин — минимум 2 символа");
    if (password.length < 5) return setLocalError("Пароль — минимум 5 символов");
    if (mode === "register" && password !== password2) {
      return setLocalError("Пароли не совпадают");
    }
    onAuth(name.trim(), password, mode);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0620] text-white">
      {/* Фоновые декорации */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[500px] rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="stars-bg absolute inset-0" />
      </div>

      {/* Шапка */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 shadow-[0_0_24px_rgba(217,70,239,0.45)]">
            <Rocket className="h-5 w-5 text-white" />
          </span>
          <span className="font-display text-sm font-black uppercase tracking-[0.22em]">
            Neon<span className="text-fuchsia-400">Jump</span>
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <button onClick={onShop} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white/80 transition hover:text-white">
            <ShoppingBag className="h-3.5 w-3.5" /> Магазин
          </button>
          <button onClick={onWallet} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white/80 transition hover:text-white">
            <Wallet className="h-3.5 w-3.5" /> Кошелёк
          </button>
          <Link href="/admin" className="glass hidden rounded-full px-4 py-2 text-xs font-bold text-white/50 transition hover:text-white sm:block">
            Админ
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20">
        {/* Герой */}
        <section className="grid items-center gap-10 pt-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">
              <BadgePercent className="h-3.5 w-3.5" /> Играй и получай {share}% дохода с рекламы
            </div>
            <h1 className="font-display mt-5 text-5xl font-black leading-[0.95] sm:text-7xl">
              Прыгай <br />
              <span className="text-glow bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                выше всех
              </span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">
              Хардкорный аркадный прыгун: движущиеся и исчезающие платформы,
              враги, ветер и гравитационные аномалии. Каждый метр и каждый
              просмотр рекламы превращаются в реальные деньги — прогресс
              надёжно хранится в твоём аккаунте.
            </p>

            {/* Аккаунт / форма входа */}
            <div className="mt-8 max-w-md">
              {player ? (
                <div className="flex flex-col gap-3">
                  <div className="glass flex items-center justify-between rounded-2xl px-4 py-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Аккаунт</p>
                      <p className="font-display text-lg font-black">{player.username}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs text-white/50">
                        <p>Рекорд: <b className="text-white">{player.bestScore} м</b></p>
                        <p>Заработано: <b className="text-emerald-300">{player.totalEarned.toFixed(2)} ₽</b></p>
                      </div>
                      <button
                        onClick={onLogout}
                        title="Выйти из аккаунта"
                        className="glass rounded-xl p-2.5 text-white/50 transition hover:text-rose-300"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => { sfx.click(); onPlay(); }}
                    className="btn-neon group w-full justify-center px-8 py-4 text-base"
                  >
                    <Play className="h-5 w-5 transition-transform group-hover:scale-125" />
                    Играть
                  </button>
                  <button onClick={onShop} className="btn-ghost w-full justify-center px-6 py-3 text-sm">
                    <ShoppingBag className="h-4 w-4" />
                    Магазин · {player.coins.toLocaleString("ru-RU")} монет
                  </button>
                </div>
              ) : sessionChecking ? (
                <div className="glass-strong flex items-center gap-3 rounded-3xl p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/10">
                    <Loader2 className="h-5 w-5 animate-spin text-fuchsia-400" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">Восстанавливаем аккаунт…</p>
                    <p className="mt-0.5 text-xs text-white/40">Меню уже готово — это займёт секунду</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="glass-strong flex flex-col gap-3 rounded-3xl p-5">
                  {/* Переключатель режима */}
                  <div className="flex rounded-xl bg-white/5 p-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => { setMode("register"); setLocalError(""); }}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition ${mode === "register" ? "bg-fuchsia-500 text-white" : "text-white/50 hover:text-white"}`}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Регистрация
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode("login"); setLocalError(""); }}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition ${mode === "login" ? "bg-fuchsia-500 text-white" : "text-white/50 hover:text-white"}`}
                    >
                      <LogIn className="h-3.5 w-3.5" /> Вход
                    </button>
                  </div>

                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Логин"
                      maxLength={24}
                      autoComplete="username"
                      className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-white/30 focus:border-fuchsia-400/60"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "register" ? "Придумай пароль (от 5 символов)" : "Пароль"}
                      maxLength={64}
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-white/30 focus:border-fuchsia-400/60"
                    />
                  </div>
                  {mode === "register" && (
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <input
                        type="password"
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                        placeholder="Повтори пароль"
                        maxLength={64}
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-white/30 focus:border-fuchsia-400/60"
                      />
                    </div>
                  )}

                  {error && (
                    <p className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-2.5 text-xs font-bold text-rose-300">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={authBusy}
                    className="btn-neon justify-center px-6 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {authBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : mode === "register" ? (
                      <UserPlus className="h-4 w-4" />
                    ) : (
                      <LogIn className="h-4 w-4" />
                    )}
                    {mode === "register" ? "Создать аккаунт и играть" : "Войти и играть"}
                  </button>
                  <p className="text-center text-[11px] text-white/35">
                    {mode === "register"
                      ? "Рекорды, монеты и рубли сохранятся за логином"
                      : "Весь прогресс подтянется с твоего аккаунта"}
                  </p>
                </form>
              )}
            </div>

            {/* Модель заработка */}
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-2.5">
              {[
                { icon: Coins, t: "Монеты за высоту", d: `${rate} монет = 1 ₽` },
                { icon: MonitorPlay, t: `${share}% с рекламы`, d: `CPM ${cpm} ₽` },
                { icon: Wallet, t: "Вывод рублей", d: "из кошелька" },
              ].map((c) => (
                <div key={c.t} className="glass rounded-2xl p-3.5">
                  <c.icon className="h-5 w-5 text-cyan-300" />
                  <p className="mt-2 text-xs font-bold leading-tight">{c.t}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-white/45">{c.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Арт + табло */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="animate-floaty relative overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_30px_80px_rgba(124,58,237,0.35)]">
              <Image
                src="/images/menu-art.webp"
                alt="Неоновый прыгун"
                width={720}
                height={960}
                sizes="(max-width: 1024px) 384px, 360px"
                className="h-auto w-full object-cover"
                priority
                unoptimized
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
                <p className="flex items-center gap-2 text-xs font-bold text-white/85">
                  <Wind className="h-3.5 w-3.5 text-sky-300" /> Ветер выше 600 м
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs font-bold text-white/85">
                  <Shield className="h-3.5 w-3.5 text-cyan-300" /> Щиты, магниты и джетпаки
                </p>
              </div>
            </div>
            <div className="glass-strong absolute -left-6 top-6 hidden -rotate-6 rounded-2xl px-4 py-2.5 sm:block">
              <p className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                <Sparkles className="h-3.5 w-3.5" /> Бонус каждые 250 м
              </p>
            </div>
          </div>
        </section>

        {/* Лидерборд + как играть */}
        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="glass-strong rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2.5 text-lg font-black">
                <Trophy className="h-5 w-5 text-amber-400" /> Лидерборд
              </h2>
              <div className="flex rounded-full bg-white/5 p-1 text-[11px] font-bold">
                <button
                  onClick={() => setTab("score")}
                  className={`rounded-full px-3.5 py-1.5 transition ${tab === "score" ? "bg-fuchsia-500 text-white" : "text-white/50 hover:text-white"}`}
                >
                  По высоте
                </button>
                <button
                  onClick={() => setTab("earn")}
                  className={`rounded-full px-3.5 py-1.5 transition ${tab === "earn" ? "bg-fuchsia-500 text-white" : "text-white/50 hover:text-white"}`}
                >
                  По доходу
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              {rows.length === 0 && (
                <p className="py-8 text-center text-sm text-white/40">
                  Пока пусто — стань первым!
                </p>
              )}
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ${
                    i === 0 ? "bg-gradient-to-r from-amber-400/15 to-transparent" : "bg-white/[0.03]"
                  }`}
                >
                  <span className="flex w-6 items-center justify-center">
                    {i === 0 ? (
                      <Crown className="h-4 w-4 text-amber-400" />
                    ) : (
                      <span className="font-display text-sm font-black text-white/40">{i + 1}</span>
                    )}
                  </span>
                  <span className={`flex-1 truncate text-sm font-bold ${player?.id === r.id ? "text-fuchsia-300" : ""}`}>
                    {r.username}
                  </span>
                  <span className="font-display text-sm font-black text-white tabular-nums">
                    {tab === "score" ? `${r.bestScore} м` : `${r.totalEarned.toFixed(2)} ₽`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6">
            <h2 className="font-display flex items-center gap-2.5 text-lg font-black">
              <Keyboard className="h-5 w-5 text-cyan-300" /> Как играть
            </h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-white/70">
              {[
                { icon: MousePointer2, t: "← → или A/D — движение. На мобильном — касания по краям экрана." },
                { icon: Target, t: "Пробел или клик — выстрел. Сбивай дронов и НЛО: +6 монет за цель." },
                { icon: TrendingUp, t: "Чем выше, тем сложнее: платформы ломаются, исчезают и ускоряются." },
                { icon: MonitorPlay, t: "После проигрыша — короткая реклама. Доля дохода с показа капает тебе." },
                { icon: Sparkles, t: "Можно возродиться за просмотр рекламы или удвоить монеты забега." },
              ].map((r, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8">
                    <r.icon className="h-3.5 w-3.5 text-fuchsia-300" />
                  </span>
                  <span className="leading-relaxed">{r.t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs leading-relaxed text-emerald-200/80">
              Честная экономика: вся статистика показов и выплат хранится на
              сервере. Владелец игры подключает рекламную сеть, CPM и долю
              игрока в админ-панели.
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-[11px] text-white/30">
        NEON JUMP — прыгай, зарабатывай, выводи
      </footer>
    </div>
  );
}
