"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Wallet,
  Coins,
  ArrowRightLeft,
  Banknote,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  BadgePercent,
  Rocket,
  LogIn,
  UserPlus,
  Lock,
  User,
  ShieldAlert,
} from "lucide-react";
import type { PublicPlayer } from "@/components/game/GameCanvas";
import type { SettingsMap } from "@/lib/economy";
import { api, clearToken } from "@/lib/client-api";

interface WithdrawalRow {
  id: string;
  amount: number;
  details: string;
  status: "pending" | "paid" | "rejected";
  createdAt: string;
}

interface PanelProps {
  onBack: () => void;
  onPlayerSync?: (p: PublicPlayer) => void;
  /** Уже авторизованный игрок из главной страницы — повторный вход не нужен */
  initialPlayer?: PublicPlayer | null;
  initialSettings?: SettingsMap | null;
}

export default function WalletPanel({
  onBack,
  onPlayerSync,
  initialPlayer = null,
  initialSettings = null,
}: PanelProps) {
  // Важно: не начинаем с null, если аккаунт уже загружен на главной.
  // Поэтому форма входа даже на один кадр не появится.
  const [player, setPlayer] = useState<PublicPlayer | null>(initialPlayer);
  const [settings, setSettings] = useState<SettingsMap | null>(initialSettings);
  const [history, setHistory] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(!initialPlayer);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [sessionNote, setSessionNote] = useState("");

  // Если главная обновила баланс — сразу отражаем его в кошельке.
  useEffect(() => {
    if (initialPlayer) {
      setPlayer(initialPlayer);
      setLoading(false);
      setSessionNote("");
    }
  }, [initialPlayer]);

  // Встроенная авторизация нужна только при прямом открытии /wallet,
  // а не при входе из уже авторизованной игры.
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  const dropSession = useCallback((note: string) => {
    clearToken();
    setPlayer(null);
    setHistory([]);
    setSessionNote(note);
  }, []);

  // Загружаем актуальный профиль только если панель открыли напрямую.
  // При переходе из игры initialPlayer уже есть — повторной проверки входа нет.
  const refresh = useCallback(async (verifyProfile = !initialPlayer) => {
    let current = initialPlayer;
    if (verifyProfile) {
      const me = await api<{ player: PublicPlayer }>("/api/me", { retries: 1 });
      if (me.ok && me.data?.player) {
        current = me.data.player;
        setPlayer(me.data.player);
        setSessionNote("");
      } else if (me.networkError) {
        setSessionNote("Не удалось обновить данные — показан последний сохранённый баланс");
      }
      // При 401 не стираем уже переданный аккаунт: в iframe канал
      // авторизации может кратковременно быть недоступен.
    }

    if (current) {
      const w = await api<{ withdrawals: WithdrawalRow[] }>("/api/withdraw", {
        retries: 1,
      });
      if (w.ok && w.data) setHistory(w.data.withdrawals ?? []);
    }
  }, [initialPlayer]);

  useEffect(() => {
    (async () => {
      if (!initialSettings) {
        const s = await api<{ settings: SettingsMap }>("/api/settings", { retries: 1 });
        if (s.ok && s.data) setSettings(s.data.settings);
      }
      await refresh(!initialPlayer);
      setLoading(false);
    })();
  }, [initialPlayer, initialSettings, refresh]);

  const logout = useCallback(() => {
    void api("/api/auth/logout", { method: "POST", retries: 0 });
    dropSession("");
  }, [dropSession]);

  const doAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (authName.trim().length < 2) return setAuthError("Логин — минимум 2 символа");
    if (authPass.length < 5) return setAuthError("Пароль — минимум 5 символов");
    setAuthBusy(true);
    const r = await api<{ player: PublicPlayer; token: string }>(
      `/api/auth/${authMode}`,
      { method: "POST", body: { username: authName.trim(), password: authPass } },
    );
    if (r.ok && r.data) {
      setPlayer(r.data.player);
      setSessionNote("");
      setAuthPass("");
      await refresh();
    } else {
      setAuthError(
        r.networkError ? "Нет связи с сервером — попробуй ещё раз" : r.error ?? "Ошибка",
      );
    }
    setAuthBusy(false);
  };

  useEffect(() => {
    if (player && onPlayerSync) onPlayerSync(player);
  }, [player, onPlayerSync]);

  const rate = settings ? parseFloat(settings.coinRate) : 1000;
  const minW = settings ? parseFloat(settings.minWithdraw) : 100;
  const potential = player ? player.coins / rate : 0;

  const convertAll = async () => {
    if (!player || player.coins < rate) return;
    setBusy(true); setMsg("");
    const r = await api<{ rubGain: number; player: PublicPlayer }>("/api/convert", {
      method: "POST",
      body: { coins: player.coins },
    });
    if (r.ok && r.data) {
      setMsg(`Обменяно: +${r.data.rubGain.toFixed(2)} ₽`);
      setPlayer(r.data.player);
    } else if (r.unauthorized) {
      setMsg("Не удалось подтвердить операцию. Вернись в меню и повтори — аккаунт не вышел.");
    } else {
      setMsg(r.error ?? "Ошибка обмена");
    }
    setBusy(false);
  };

  const withdraw = async () => {
    setBusy(true); setMsg("");
    const r = await api("/api/withdraw", {
      method: "POST",
      body: { amount: Number(amount), details },
    });
    if (r.ok) {
      setMsg("Заявка на вывод создана. Статус — «в обработке».");
      setAmount(""); setDetails("");
      await refresh(false);
    } else if (r.unauthorized) {
      setMsg("Не удалось подтвердить операцию. Аккаунт остаётся открытым.");
    } else {
      setMsg(r.error ?? "Ошибка вывода");
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0620]">
        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0620] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-fuchsia-600/15 blur-[120px]" />
        <div className="stars-bg absolute inset-0" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <button onClick={onBack} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white/70 transition hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> К игре
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em]">
            <Rocket className="h-4 w-4 text-fuchsia-400" /> Кошелёк
          </span>
          {player && (
            <span className="glass rounded-full px-3 py-2 text-[11px] font-bold text-emerald-300">
              {player.username}
            </span>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-16">
        {!player ? (
          <>
            {sessionNote && (
              <p className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-2.5 text-center text-xs font-bold text-amber-300">
                <ShieldAlert className="h-4 w-4 shrink-0" /> {sessionNote}
              </p>
            )}
            <form
              onSubmit={doAuth}
              className="glass-strong mx-auto mt-8 flex max-w-sm flex-col gap-3 rounded-3xl p-8"
            >
              <Wallet className="mx-auto h-9 w-9 text-fuchsia-400" />
              <h1 className="font-display text-center text-xl font-black">Вход в кошелёк</h1>
              <p className="text-center text-xs text-white/45">
                Баланс привязан к аккаунту — войди по логину и паролю
              </p>

              <div className="mt-1 flex rounded-xl bg-white/5 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition ${authMode === "login" ? "bg-fuchsia-500 text-white" : "text-white/50 hover:text-white"}`}
                >
                  <LogIn className="h-3.5 w-3.5" /> Вход
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition ${authMode === "register" ? "bg-fuchsia-500 text-white" : "text-white/50 hover:text-white"}`}
                >
                  <UserPlus className="h-3.5 w-3.5" /> Регистрация
                </button>
              </div>

              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Логин"
                  maxLength={24}
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm font-semibold outline-none placeholder:text-white/30 focus:border-fuchsia-400/60"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type="password"
                  value={authPass}
                  onChange={(e) => setAuthPass(e.target.value)}
                  placeholder="Пароль"
                  maxLength={64}
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm font-semibold outline-none placeholder:text-white/30 focus:border-fuchsia-400/60"
                />
              </div>

              {authError && (
                <p className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-2.5 text-xs font-bold text-rose-300">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authBusy}
                className="btn-neon justify-center px-6 py-3.5 text-sm disabled:opacity-40"
              >
                {authBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : authMode === "login" ? (
                  <LogIn className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {authMode === "login" ? "Войти" : "Создать аккаунт"}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Балансы */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="glass-strong rounded-3xl p-6">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
                  <Banknote className="h-4 w-4 text-emerald-300" /> Рублёвый баланс
                </p>
                <p className="font-display mt-3 text-4xl font-black text-emerald-300 tabular-nums">
                  {player.rub.toFixed(2)} <span className="text-xl">₽</span>
                </p>
                <p className="mt-2 text-xs text-white/45">
                  Всего заработано: <b className="text-white/80">{player.totalEarned.toFixed(2)} ₽</b>
                  {" · "}Рекламы: <b className="text-white/80">{player.adViews}</b>
                </p>
              </div>
              <div className="glass-strong rounded-3xl p-6">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
                  <Coins className="h-4 w-4 text-amber-400" /> Монеты
                </p>
                <p className="font-display mt-3 text-4xl font-black text-amber-300 tabular-nums">{player.coins}</p>
                <p className="mt-2 text-xs text-white/45">
                  По курсу {rate} монет = 1 ₽ — это ≈ <b className="text-white/80">{potential.toFixed(2)} ₽</b>
                </p>
                <button
                  onClick={convertAll}
                  disabled={busy || player.coins < rate}
                  className="btn-ghost mt-4 w-full justify-center px-4 py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
                  Обменять все монеты
                </button>
              </div>
            </div>

            {/* Вывод */}
            <div className="glass-strong mt-4 rounded-3xl p-6">
              <h2 className="font-display flex items-center gap-2 text-lg font-black">
                <Banknote className="h-5 w-5 text-emerald-300" /> Вывод средств
              </h2>
              <p className="mt-1 text-xs text-white/45">
                Минимальная сумма — {minW} ₽. Заявки обрабатываются владельцем игры.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto]">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder={`${minW}`}
                  inputMode="decimal"
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold outline-none placeholder:text-white/25 focus:border-emerald-400/60"
                />
                <input
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Реквизиты: карта / телефон / кошелёк"
                  maxLength={200}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold outline-none placeholder:text-white/25 focus:border-emerald-400/60"
                />
                <button
                  onClick={withdraw}
                  disabled={busy || !amount || !details}
                  className="btn-neon justify-center px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                  Вывести
                </button>
              </div>
              {msg && (
                <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/75">
                  {msg}
                </p>
              )}
            </div>

            {/* История */}
            <div className="glass-strong mt-4 rounded-3xl p-6">
              <h2 className="font-display text-lg font-black">История заявок</h2>
              <div className="mt-3 flex flex-col gap-2">
                {history.length === 0 && (
                  <p className="py-6 text-center text-sm text-white/35">Заявок пока не было</p>
                )}
                {history.map((w) => (
                  <div key={w.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
                      {w.status === "paid" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : w.status === "rejected" ? (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-400" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold tabular-nums">{w.amount.toFixed(2)} ₽</p>
                      <p className="truncate text-[11px] text-white/40">{w.details}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                      w.status === "paid" ? "bg-emerald-400/15 text-emerald-300"
                      : w.status === "rejected" ? "bg-rose-400/15 text-rose-300"
                      : "bg-amber-400/15 text-amber-300"
                    }`}>
                      {w.status === "paid" ? "Выплачено" : w.status === "rejected" ? "Отклонено" : "В обработке"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4 text-xs leading-relaxed text-fuchsia-200/70">
              <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" />
              Откуда деньги: владелец игры подключает код рекламной сети в
              админ-панели. За показы сеть платит по CPM-ставке владельцу, а
              настроенный процент автоматически начисляется игрокам.
            </div>
          </>
        )}
      </main>
    </div>
  );
}
