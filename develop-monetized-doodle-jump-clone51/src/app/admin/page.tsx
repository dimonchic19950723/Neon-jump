"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Users,
  Gamepad2,
  MonitorPlay,
  Banknote,
  BadgePercent,
  TrendingUp,
  Save,
  CheckCircle2,
  XCircle,
  Link2,
  ShieldCheck,
} from "lucide-react";
import type { SettingsMap } from "@/lib/economy";

interface AdminData {
  stats: {
    players: number;
    games: number;
    adViews: number;
    revenue: number;
    paidToPlayers: number;
    ownerRevenue: number;
  };
  withdrawals: {
    id: string; amount: number; details: string; status: string;
    createdAt: string; username: string | null;
  }[];
  top: { username: string; bestScore: number; totalEarned: number; adViews: number }[];
  settings: SettingsMap;
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [form, setForm] = useState<SettingsMap | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async (k: string) => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin", { headers: { "x-admin-key": k } });
      if (!r.ok) throw new Error("Неверный пароль");
      const d: AdminData = await r.json();
      setData(d);
      setForm(d.settings);
      setAuthed(true);
      localStorage.setItem("neonjump_admin", k);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка");
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("neonjump_admin");
    if (saved) void load(saved);
  }, [load]);

  const saveSettings = async () => {
    if (!form) return;
    setLoading(true); setMsg("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ action: "settings", settings: form }),
      });
      if (!r.ok) throw new Error("Ошибка сохранения");
      setMsg("Настройки сохранены");
      await load(key);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка");
      setLoading(false);
    }
  };

  const payout = async (id: string, status: "paid" | "rejected") => {
    setLoading(true);
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ action: "payout", id, status }),
      });
      await load(key);
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string, k: keyof SettingsMap, hint: string, type: "text" | "number" = "text",
  ) => (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-widest text-white/45">{label}</span>
      <input
        type={type}
        value={form?.[k] ?? ""}
        onChange={(e) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))}
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-semibold outline-none focus:border-cyan-400/60"
      />
      <span className="mt-1 block text-[11px] text-white/35">{hint}</span>
    </label>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0620] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Link href="/" className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white/70 transition hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> К игре
        </Link>
        <span className="font-display flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em]">
          <ShieldCheck className="h-4 w-4 text-cyan-300" /> Админ-панель
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-5 pb-16">
        {!authed ? (
          <form
            onSubmit={(e) => { e.preventDefault(); setMsg(""); void load(key); }}
            className="glass-strong mx-auto mt-14 flex max-w-sm flex-col gap-3 rounded-3xl p-8"
          >
            <KeyRound className="mx-auto h-8 w-8 text-cyan-300" />
            <h1 className="font-display text-center text-xl font-black">Вход владельца</h1>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Пароль администратора"
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center text-sm font-bold outline-none focus:border-cyan-400/60"
            />
            {msg && <p className="text-center text-xs font-bold text-rose-400">{msg}</p>}
            <button type="submit" disabled={loading || !key} className="btn-neon justify-center px-5 py-3 text-sm disabled:opacity-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Войти
            </button>
            <p className="text-center text-[11px] text-white/30">
              Пароль задаётся переменной окружения ADMIN_PASSWORD (по умолчанию admin123)
            </p>
          </form>
        ) : data && form ? (
          <>
            {/* Статистика */}
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { icon: Users, l: "Игроков", v: String(data.stats.players), c: "text-cyan-300" },
                { icon: Gamepad2, l: "Забегов", v: String(data.stats.games), c: "text-violet-300" },
                { icon: MonitorPlay, l: "Показов рекламы", v: String(data.stats.adViews), c: "text-fuchsia-300" },
                { icon: TrendingUp, l: "Доход всего", v: `${data.stats.revenue.toFixed(2)} ₽`, c: "text-white" },
                { icon: BadgePercent, l: "Игрокам", v: `${data.stats.paidToPlayers.toFixed(2)} ₽`, c: "text-emerald-300" },
                { icon: Banknote, l: "Владельцу", v: `${data.stats.ownerRevenue.toFixed(2)} ₽`, c: "text-amber-300" },
              ].map((s) => (
                <div key={s.l} className="glass-strong rounded-2xl p-4">
                  <s.icon className={`h-4 w-4 ${s.c}`} />
                  <p className="font-display mt-2 text-lg font-black tabular-nums">{s.v}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Настройки монетизации */}
            <div className="glass-strong mt-4 rounded-3xl p-6">
              <h2 className="font-display flex items-center gap-2 text-lg font-black">
                <Link2 className="h-5 w-5 text-cyan-300" /> Монетизация
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  {field(
                    "Встроенная рекламная ссылка (URL)",
                    "adLink",
                    "Direct Link рекламной сети — открывается в iframe после проигрыша и в rewarded-форматах. Пусто = демо-креатив.",
                  )}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/45">
                    HTML/JS-код рекламной сети (приоритет выше ссылки)
                  </span>
                  <textarea
                    value={form?.adCode ?? ""}
                    onChange={(e) => setForm((f) => (f ? { ...f, adCode: e.target.value } : f))}
                    rows={4}
                    spellCheck={false}
                    placeholder='<script src="https://...banner.js"></script> или <iframe src="..."></iframe>'
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-xs outline-none placeholder:text-white/20 focus:border-cyan-400/60"
                  />
                  <span className="mt-1 block text-[11px] text-white/35">
                    Сюда вставляется баннерный код Adsterra / Monetag / PropellerAds / HilltopAds / A-ADS.
                    Выполняется в изолированном окне рекламного оверлея.
                  </span>
                </div>
                {field("CPM, ₽ за 1000 показов", "cpm", "Сколько рекламная сеть платит за 1000 показов.", "number")}
                {field("Доля игрока, %", "playerShare", "Процент дохода с показа, который получает игрок (0–95).", "number")}
                {field("Курс: монет за 1 ₽", "coinRate", "Обменный курс игровой валюты.", "number")}
                {field("Минимальный вывод, ₽", "minWithdraw", "Порог заявки на вывод.", "number")}
                {field("Бонус монет за 250 м", "milestoneBonus", "Награда за каждые 250 метров высоты.", "number")}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button onClick={saveSettings} disabled={loading} className="btn-neon px-6 py-3 text-sm disabled:opacity-40">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Сохранить
                </button>
                {msg && <p className="text-xs font-bold text-emerald-300">{msg}</p>}
              </div>
            </div>

            {/* Выплаты */}
            <div className="glass-strong mt-4 rounded-3xl p-6">
              <h2 className="font-display text-lg font-black">Заявки на вывод</h2>
              <div className="mt-3 flex flex-col gap-2">
                {data.withdrawals.length === 0 && (
                  <p className="py-5 text-center text-sm text-white/35">Заявок нет</p>
                )}
                {data.withdrawals.map((w) => (
                  <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        {w.amount.toFixed(2)} ₽ <span className="text-white/40">· {w.username ?? "—"}</span>
                      </p>
                      <p className="truncate text-[11px] text-white/40">{w.details} · {new Date(w.createdAt).toLocaleString("ru-RU")}</p>
                    </div>
                    {w.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => payout(w.id, "paid")}
                          className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-400/25"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Выплачено
                        </button>
                        <button
                          onClick={() => payout(w.id, "rejected")}
                          className="flex items-center gap-1 rounded-full bg-rose-400/15 px-3 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-400/25"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Отклонить
                        </button>
                      </div>
                    ) : (
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                        w.status === "paid" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
                      }`}>
                        {w.status === "paid" ? "Выплачено" : "Отклонено"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Топ по заработку */}
            <div className="glass-strong mt-4 rounded-3xl p-6">
              <h2 className="font-display text-lg font-black">Топ игроков по заработку</h2>
              <div className="mt-3 flex flex-col gap-1.5">
                {data.top.map((t, i) => (
                  <div key={t.username} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-2.5 text-sm">
                    <span className="font-display w-6 text-sm font-black text-white/40">{i + 1}</span>
                    <span className="flex-1 truncate font-bold">{t.username}</span>
                    <span className="text-xs text-white/40">{t.adViews} показов</span>
                    <span className="font-display font-black text-emerald-300 tabular-nums">{t.totalEarned.toFixed(2)} ₽</span>
                  </div>
                ))}
                {data.top.length === 0 && (
                  <p className="py-5 text-center text-sm text-white/35">Игроков пока нет</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
