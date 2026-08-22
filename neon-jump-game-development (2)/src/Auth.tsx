import { useState } from "react";
import {
  ArrowRight,
  Check,
  Coins,
  Eye,
  EyeOff,
  Gamepad2,
  Loader2,
  LogIn,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Wallet,
  Zap,
} from "lucide-react";
import {
  getCurrentId,
  hasAnyAccount,
  login,
  register,
  startGuest,
  validatePassword,
  validateUsername,
} from "./game/auth";
import { copyUserData, hasProgress } from "./game/store";

type Mode = "register" | "login";

const FIELD =
  "w-full rounded-xl border border-slate-600/50 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 placeholder:text-slate-600";

export default function Auth({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<Mode>(hasAnyAccount() ? "login" : "register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        if (password !== password2) {
          setError("Пароли не совпадают");
          return;
        }
        const res = await register(username, password);
        if (!res.ok) {
          setError(res.error ?? "Не удалось зарегистрироваться");
          return;
        }
        // переносим прогресс гостя в новый аккаунт
        if (res.previousId && res.account && hasProgress(res.previousId)) {
          copyUserData(res.previousId, res.account.id);
        }
        onDone();
      } else {
        const res = await login(username, password);
        if (!res.ok) {
          setError(res.error ?? "Не удалось войти");
          return;
        }
        onDone();
      }
    } finally {
      setBusy(false);
    }
  };

  const playAsGuest = () => {
    startGuest();
    onDone();
  };

  const nameErr = mode === "register" && username ? validateUsername(username) : null;
  const passErr = mode === "register" && password ? validatePassword(password) : null;
  const guestId = getCurrentId();
  const guestHasProgress = !!guestId && guestId.startsWith("guest") && hasProgress(guestId);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#030014] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>
      <div className="scanlines pointer-events-none fixed inset-0 z-10" />

      <div className="safe-page relative z-20 mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
        {/* логотип */}
        <div className="animate-rise text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
            <Zap className="h-7 w-7 text-cyan-300" />
          </span>
          <h1 className="font-display mt-4 text-3xl font-black">
            <span className="neon-cyan text-cyan-300">NEON</span>{" "}
            <span className="neon-magenta text-fuchsia-400">JUMP</span>
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Аккаунт нужен, чтобы монеты и рубли не потерялись
          </p>
        </div>

        {/* переключатель */}
        <div className="animate-rise delay-1 mt-8 flex rounded-2xl border border-slate-700/50 bg-slate-950/50 p-1">
          {(
            [
              ["register", "Регистрация", UserPlus],
              ["login", "Вход", LogIn],
            ] as [Mode, string, typeof LogIn][]
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                mode === m
                  ? "bg-cyan-400/15 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* форма */}
        <form onSubmit={submit} className="panel animate-rise delay-2 mt-4 rounded-3xl p-6">
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">
              ЛОГИН
            </span>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="например, berserk61"
              autoComplete="username"
              autoFocus
              className={FIELD}
            />
            {nameErr && <span className="mt-1.5 block text-[10px] text-amber-300">{nameErr}</span>}
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">
              ПАРОЛЬ
            </span>
            <span className="relative block">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="минимум 6 символов"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                className={`${FIELD} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 transition hover:text-cyan-300"
                aria-label="Показать пароль"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
            {passErr && <span className="mt-1.5 block text-[10px] text-amber-300">{passErr}</span>}
          </label>

          {mode === "register" && (
            <label className="mt-4 block">
              <span className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-slate-500">
                ПОВТОРИ ПАРОЛЬ
              </span>
              <input
                type={showPass ? "text" : "password"}
                value={password2}
                onChange={(e) => {
                  setPassword2(e.target.value);
                  setError(null);
                }}
                placeholder="••••••"
                autoComplete="new-password"
                className={FIELD}
              />
            </label>
          )}

          {error && (
            <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-950/30 px-3 py-2.5 text-[11px] font-bold text-rose-300">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {mode === "register" && guestHasProgress && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-lime-300/30 bg-lime-400/10 px-3 py-2.5 text-[11px] leading-relaxed text-lime-200">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Твой гостевой прогресс — монеты, скины и рекорд — перенесётся в новый аккаунт
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !username || !password || (mode === "register" && !password2)}
            className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-cyan-300/70 bg-cyan-400/10 py-3.5 font-display text-xs font-bold tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-300/25 hover:shadow-[0_0_35px_rgba(34,211,238,0.4)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "register" ? (
              <UserPlus className="h-4 w-4" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {mode === "register" ? "СОЗДАТЬ АККАУНТ" : "ВОЙТИ"}
          </button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
            <ShieldCheck className="h-3 w-3" />
            Пароль хранится только как SHA-256 хеш с солью
          </p>
        </form>

        {/* гостевой режим */}
        <div className="animate-rise delay-3 mt-4">
          <button
            onClick={playAsGuest}
            className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-700/50 bg-slate-950/40 px-5 py-4 text-left transition hover:border-fuchsia-300/50 hover:bg-fuchsia-400/5 active:scale-[0.98]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-300/30 bg-fuchsia-400/10">
                <Gamepad2 className="h-5 w-5 text-fuchsia-300" />
              </span>
              <span>
                <span className="block text-sm font-bold text-white">Играть как гость</span>
                <span className="block text-[10px] text-slate-500">
                  Без регистрации — все функции доступны
                </span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-fuchsia-300" />
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <p className="flex items-start gap-1.5 rounded-xl border border-slate-700/40 bg-slate-950/40 px-3 py-2.5 text-slate-400">
              <Coins className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />
              Монеты, скины и рекорды сохраняются
            </p>
            <p className="flex items-start gap-1.5 rounded-xl border border-slate-700/40 bg-slate-950/40 px-3 py-2.5 text-slate-400">
              <Wallet className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
              Вывод рублей — только для аккаунта
            </p>
          </div>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-600">
            Гостевой прогресс живёт только на этом устройстве. Зарегистрируйся
            в любой момент — всё перенесётся.
          </p>
        </div>
      </div>
    </div>
  );
}
