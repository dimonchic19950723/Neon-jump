import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Coins,
  Gamepad2,
  KeyRound,
  Lock,
  LogOut,
  Megaphone,
  Percent,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wallet,
  Zap,
} from "lucide-react";
import {
  changeAdminPassword,
  DEFAULT_SETTINGS,
  getFailsLeft,
  getLockRemaining,
  getSettings,
  getStats,
  getWallet,
  hasAdminSession,
  isDefaultAdminPassword,
  registerAdminFail,
  resetAdminFails,
  resetAll,
  saveSettings,
  setAdminSession,
  verifyAdminPassword,
} from "./game/store";

const FIELD =
  "w-full rounded-xl border border-slate-600/50 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70";

export default function Admin() {
  const [authed, setAuthed] = useState(hasAdminSession());
  const [pass, setPass] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [lockLeft, setLockLeft] = useState(getLockRemaining());
  const [form, setForm] = useState({ ...DEFAULT_SETTINGS });
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isDefaultPw, setIsDefaultPw] = useState(isDefaultAdminPassword());
  const [toast, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  void tick;

  // тикающий обратный отсчёт блокировки
  useEffect(() => {
    if (lockLeft <= 0) return;
    const iv = window.setInterval(() => {
      const left = getLockRemaining();
      setLockLeft(left);
      if (left <= 0) {
        setErrorMsg(null);
        window.clearInterval(iv);
      }
    }, 1000);
    return () => window.clearInterval(iv);
  }, [lockLeft]);

  // авто-выход по истечении сессии (30 минут)
  useEffect(() => {
    if (!authed) return;
    const iv = window.setInterval(() => {
      if (!hasAdminSession()) {
        setAuthed(false);
        setToast("Сессия истекла — войди заново");
      }
    }, 30_000);
    return () => window.clearInterval(iv);
  }, [authed]);

  useEffect(() => {
    setForm({ ...getSettings() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (getLockRemaining() > 0) return;
    setChecking(true);
    const ok = await verifyAdminPassword(pass);
    setChecking(false);
    if (ok) {
      resetAdminFails();
      setAdminSession(true);
      setAuthed(true);
      setErrorMsg(null);
      setPass("");
    } else {
      const lock = registerAdminFail();
      setLockLeft(lock);
      setErrorMsg(
        lock > 0
          ? `Слишком много попыток. Блокировка ${lock} сек`
          : `Неверный пароль. Осталось попыток: ${getFailsLeft()}`
      );
      setPass("");
    }
  };

  const stats = getStats();
  const wallet = getWallet();
  const paidOut = wallet.payouts.reduce((sum, p) => sum + p.amount, 0);

  const num = (v: string | number, fallback: number) => {
    const n = typeof v === "number" ? v : parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const save = () => {
    saveSettings({
      provider: form.provider,
      adLink: form.adLink,
      adCode: form.adCode,
      cpm: Math.max(1, num(form.cpm, 120)),
      share: Math.max(0, Math.min(100, num(form.share, 50))),
      coinRate: Math.max(1, num(form.coinRate, 1000)),
      minWithdraw: Math.max(1, num(form.minWithdraw, 100)),
      milestoneBonus: Math.max(10, num(form.milestoneBonus, 50)),
    });
    setToast("Настройки сохранены");
    setTick((t) => t + 1);
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== newPass2) {
      setPwMsg({ ok: false, text: "Пароли не совпадают" });
      return;
    }
    const res = await changeAdminPassword(curPass, newPass);
    if (res.ok) {
      setCurPass("");
      setNewPass("");
      setNewPass2("");
      setIsDefaultPw(false);
      setPwMsg({ ok: true, text: "Пароль изменён. Он хранится только в виде SHA-256 хеша" });
    } else {
      setPwMsg({ ok: false, text: res.error ?? "Не удалось сменить пароль" });
    }
  };

  const pwStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-ZА-Я]/.test(p) && /[a-zа-я]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^\w\s]/.test(p)) s++;
    return Math.min(s, 4);
  };
  const strength = pwStrength(newPass);
  const STRENGTH = [
    { label: "Слабый", color: "#f43f5e" },
    { label: "Так себе", color: "#fb923c" },
    { label: "Нормальный", color: "#fbbf24" },
    { label: "Хороший", color: "#a3e635" },
    { label: "Отличный", color: "#22d3ee" },
  ];

  const wipe = () => {
    if (window.confirm("Сбросить профили, кошельки, магазин, статистику и лидеров?")) {
      resetAll();
      setForm({ ...DEFAULT_SETTINGS });
      setToast("Все данные сброшены");
      setTick((t) => t + 1);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#030014] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[130px]" />
      </div>
      <div className="scanlines pointer-events-none fixed inset-0 z-10" />

      <header className="sticky top-0 z-40 border-b border-cyan-300/10 bg-[#030014]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <a href="#/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/10">
              <Zap className="h-5 w-5 text-cyan-300" />
            </span>
            <span className="font-display text-lg font-black text-white">
              Neon<span className="neon-magenta text-fuchsia-400">Jump</span>
              <span className="ml-2 rounded-md bg-fuchsia-400/15 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">ADMIN</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            {authed && (
              <button
                onClick={() => {
                  setAdminSession(false);
                  setAuthed(false);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-300/80 transition hover:border-rose-400/60 hover:text-rose-200"
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </button>
            )}
            <a
              href="#/"
              className="flex items-center gap-1.5 rounded-xl border border-slate-600/40 px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
            >
              <ChevronLeft className="h-4 w-4" />К игре
            </a>
          </div>
        </div>
      </header>

      <main className="safe-page relative z-20 mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {!authed ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <form
              onSubmit={login}
              className={`panel w-full max-w-sm rounded-3xl p-8 text-center ${errorMsg ? "border-rose-400/50" : ""}`}
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-300/40 bg-fuchsia-400/10 shadow-[0_0_30px_rgba(232,121,249,0.25)]">
                <Lock className="h-7 w-7 text-fuchsia-300" />
              </span>
              <h2 className="font-display mt-5 text-2xl font-black text-white">Вход владельца</h2>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Доступ только для владельца игры.
                {isDefaultPw && (
                  <span className="mt-1 block text-amber-300/90">
                    Пароль по умолчанию: admin123 — смени его сразу после входа!
                  </span>
                )}
              </p>
              <input
                type="password"
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Пароль"
                autoFocus
                disabled={lockLeft > 0 || checking}
                className={`${FIELD} mt-6 text-center tracking-widest disabled:opacity-50 ${errorMsg ? "border-rose-400/60" : ""}`}
              />
              {errorMsg && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-bold text-rose-300">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {errorMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={lockLeft > 0 || checking || !pass}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-300/60 bg-fuchsia-400/10 py-3 text-xs font-black tracking-[0.2em] text-fuchsia-100 transition hover:bg-fuchsia-300/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <KeyRound className="h-4 w-4" />
                {lockLeft > 0 ? `ЗАБЛОКИРОВАНО ${lockLeft}С` : checking ? "ПРОВЕРКА…" : "ВОЙТИ"}
              </button>
              <p className="mt-4 text-[10px] leading-relaxed text-slate-600">
                Пароль хранится как SHA-256 хеш с солью. После 5 неудачных
                попыток вход блокируется на минуту, сессия истекает через 30 мин.
              </p>
            </form>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-black text-white sm:text-3xl">Панель владельца</h1>
            <p className="mt-2 text-xs text-slate-500">
              Управляй рекламной сетью, курсом монет и долей игрока. Демо:
              данные хранятся локально — подключи сервер для продакшена.
            </p>

            {/* быстрая навигация по секциям */}
            <nav className="mt-5 flex flex-wrap gap-2">
              <a
                href="#money"
                className="rounded-xl border border-slate-600/40 bg-slate-950/40 px-4 py-2 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200"
              >
                Монетизация
              </a>
              <a
                href="#security"
                className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[11px] font-bold transition ${
                  isDefaultPw
                    ? "animate-record border-amber-300/60 bg-amber-400/10 text-amber-200"
                    : "border-slate-600/40 bg-slate-950/40 text-slate-300 hover:border-lime-300/50 hover:text-lime-200"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Безопасность{isDefaultPw ? " · смени пароль!" : ""}
              </a>
            </nav>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { Icon: Gamepad2, color: "#22d3ee", label: "Забегов сыграно", value: String(stats.runs) },
                { Icon: Megaphone, color: "#e879f9", label: "Показов рекламы", value: String(stats.ads) },
                { Icon: Percent, color: "#a78bfa", label: "Доход (CPM)", value: `${stats.revenue.toFixed(2)} ₽` },
                { Icon: Coins, color: "#fbbf24", label: "Начислено игрокам", value: `${stats.paidToPlayers.toFixed(2)} ₽` },
                { Icon: Wallet, color: "#a3e635", label: "Выплачено", value: `${paidOut.toFixed(2)} ₽` },
              ].map((c) => (
                <div key={c.label} className="panel rounded-2xl p-4">
                  <c.Icon className="h-5 w-5" style={{ color: c.color }} />
                  <p className="font-display mt-3 text-lg font-black text-white tabular-nums">{c.value}</p>
                  <p className="mt-1 text-[10px] leading-tight text-slate-500">{c.label}</p>
                </div>
              ))}
            </div>

            <div id="money" className="panel mt-8 rounded-3xl p-5 sm:p-8">
              <h2 className="font-display text-lg font-bold text-white">Монетизация</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">CPM — ₽ за 1000 показов</span>
                  <input
                    type="number"
                    min={1}
                    value={form.cpm}
                    onChange={(e) => setForm({ ...form, cpm: num(e.target.value, form.cpm) })}
                    className={FIELD}
                  />
                  <span className="mt-1.5 block text-[10px] text-slate-600">1 показ = {(form.cpm / 1000).toFixed(3)} ₽</span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">Доля игрока, %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.share}
                    onChange={(e) => setForm({ ...form, share: num(e.target.value, form.share) })}
                    className={FIELD}
                  />
                  <span className="mt-1.5 block text-[10px] text-slate-600">
                    игрок получает {((form.cpm / 1000) * (form.share / 100)).toFixed(4)} ₽ с показа
                  </span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">Курс: монет за 1 ₽</span>
                  <input
                    type="number"
                    min={1}
                    value={form.coinRate}
                    onChange={(e) => setForm({ ...form, coinRate: num(e.target.value, form.coinRate) })}
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">Минимум вывода, ₽</span>
                  <input
                    type="number"
                    min={1}
                    value={form.minWithdraw}
                    onChange={(e) => setForm({ ...form, minWithdraw: num(e.target.value, form.minWithdraw) })}
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">Бонус каждые 250 м, монет</span>
                  <input
                    type="number"
                    min={10}
                    value={form.milestoneBonus}
                    onChange={(e) => setForm({ ...form, milestoneBonus: num(e.target.value, form.milestoneBonus) })}
                    className={FIELD}
                  />
                </label>
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">
                  Рекламный провайдер
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      { id: "demo", name: "Демо-заглушка", desc: "таймер 5 сек, тест потока" },
                      { id: "yandex", name: "Яндекс.Игры SDK", desc: "rewarded + fullscreen, ₽ выплаты" },
                      { id: "custom", name: "Свой код / ссылка", desc: "любая сеть через iframe" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setForm({ ...form, provider: p.id })}
                      className={`rounded-xl border p-3.5 text-left transition ${
                        form.provider === p.id
                          ? "border-cyan-300/70 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                          : "border-slate-700/50 bg-slate-950/40 hover:border-slate-500/60"
                      }`}
                    >
                      <p className={`text-xs font-bold ${form.provider === p.id ? "text-cyan-200" : "text-slate-300"}`}>
                        {p.name}
                      </p>
                      <p className="mt-1 text-[10px] leading-tight text-slate-500">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </label>

              {form.provider === "yandex" && (
                <div className="mt-4 rounded-xl border border-red-300/25 bg-red-400/5 p-4 text-[11px] leading-relaxed text-slate-400">
                  <p className="font-bold text-red-200">Подключение Яндекс.Игр (коротко):</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>Регистрация в консоли: developers.yandex.ru/games</li>
                    <li>Добавь игру как черновик и загрузи билд (SDK подключается автоматически из кода)</li>
                    <li>Проверь показ в draft-режиме, отправь на модерацию</li>
                    <li>После одобрения включи «Монетизацию» в консоли</li>
                  </ol>
                  <p className="mt-2 text-slate-500">
                    Код уже встроен: ysdk.adv.showRewardedVideo для возрождения/удвоения,
                    showFullscreenAdv после проигрыша. Если SDK недоступен (например, игра
                    не на Яндексе) — автоматически сработает демо-заглушка.
                  </p>
                </div>
              )}

              {form.provider === "custom" && (
                <>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">
                      Ссылка на рекламу (iframe-рендер в оверлее)
                    </span>
                    <input
                      value={form.adLink}
                      onChange={(e) => setForm({ ...form, adLink: e.target.value })}
                      placeholder="https://example.com/ad.html"
                      className={FIELD}
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">
                      HTML/JS-код рекламной сети (рендерится в изолированном iframe)
                    </span>
                    <textarea
                      value={form.adCode}
                      onChange={(e) => setForm({ ...form, adCode: e.target.value })}
                      rows={4}
                      placeholder="<!-- вставь сюда код рекламного блока -->"
                      className={`${FIELD} resize-none font-mono text-xs`}
                    />
                  </label>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                    Подойдут блоки РСЯ, PropellerAds, HilltopAds и др. Для rewarded-видео с
                    колбэком взамен — смотри провайдера «Яндекс.Игры SDK» или интеграцию AppLixir.
                  </p>
                </>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={save}
                  className="inline-flex items-center gap-2 rounded-xl border border-lime-300/50 bg-lime-400/10 px-6 py-3 text-xs font-bold text-lime-200 transition hover:bg-lime-300/20 active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  Сохранить настройки
                </button>
                <button
                  onClick={wipe}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-950/20 px-6 py-3 text-xs font-bold text-rose-300 transition hover:bg-rose-900/30 active:scale-95"
                >
                  <Trash2 className="h-4 w-4" />
                  Сбросить все данные
                </button>
              </div>
            </div>

            {/* ── безопасность ── */}
            <div id="security" className="panel mt-8 rounded-3xl p-5 sm:p-8">
              <h2 className="font-display flex items-center gap-2.5 text-lg font-bold text-white">
                <ShieldCheck className="h-5 w-5 text-lime-300" />
                Безопасность
              </h2>

              {isDefaultPw && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300/40 bg-amber-400/10 p-4">
                  <ShieldAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-300" />
                  <p className="text-[11px] leading-relaxed text-amber-100/90">
                    Сейчас используется <b>пароль по умолчанию</b> (admin123) — его знают все.
                    Смени его прямо сейчас, чтобы никто не получил доступ к панели.
                  </p>
                </div>
              )}

              <form onSubmit={submitPassword} className="mt-5 grid max-w-md gap-4">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">
                    Текущий пароль
                  </span>
                  <input
                    type="password"
                    value={curPass}
                    onChange={(e) => {
                      setCurPass(e.target.value);
                      setPwMsg(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">
                    Новый пароль (минимум 8 символов)
                  </span>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => {
                      setNewPass(e.target.value);
                      setPwMsg(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={FIELD}
                  />
                  {newPass && (
                    <span className="mt-2 flex items-center gap-2">
                      <span className="flex h-1.5 flex-1 gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className="h-full flex-1 rounded-full transition-colors"
                            style={{
                              background: i < strength ? STRENGTH[strength].color : "rgba(100,116,139,0.3)",
                            }}
                          />
                        ))}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: STRENGTH[strength].color }}>
                        {STRENGTH[strength].label}
                      </span>
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">
                    Повтори новый пароль
                  </span>
                  <input
                    type="password"
                    value={newPass2}
                    onChange={(e) => {
                      setNewPass2(e.target.value);
                      setPwMsg(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={FIELD}
                  />
                </label>

                {pwMsg && (
                  <p
                    className={`flex items-center gap-1.5 text-[11px] font-bold ${
                      pwMsg.ok ? "text-lime-300" : "text-rose-300"
                    }`}
                  >
                    {pwMsg.ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                    {pwMsg.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!curPass || !newPass || !newPass2}
                  className="inline-flex w-fit items-center gap-2 rounded-xl border border-lime-300/50 bg-lime-400/10 px-6 py-3 text-xs font-bold text-lime-200 transition hover:bg-lime-300/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <KeyRound className="h-4 w-4" />
                  Сменить пароль
                </button>
              </form>

              <div className="mt-6 grid gap-2 border-t border-slate-700/40 pt-5 text-[11px] text-slate-500 sm:grid-cols-2">
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-400/70" />
                  Пароль хранится только как SHA-256 хеш со случайной солью — в открытом виде его нет нигде
                </p>
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-400/70" />
                  5 неудачных попыток → блокировка входа на 60 секунд
                </p>
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-400/70" />
                  Сессия админа автоматически истекает через 30 минут
                </p>
                <p className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/70" />
                  Для полной защиты проверку пароля нужно перенести на сервер (ADMIN_PASSWORD в env)
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {toast && (
        <div className="animate-toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-cyan-300/30 bg-slate-950/90 px-5 py-3 text-xs font-bold text-cyan-100 shadow-[0_0_40px_rgba(34,211,238,0.25)] backdrop-blur-md">
          {toast}
        </div>
      )}
    </div>
  );
}
