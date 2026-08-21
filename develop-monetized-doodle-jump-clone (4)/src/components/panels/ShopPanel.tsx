"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Coins,
  Loader2,
  Check,
  Lock,
  ShoppingBag,
  Sparkles,
  Palette,
  UserRound,
  Star,
  Play,
} from "lucide-react";
import type { PublicPlayer } from "@/components/game/GameCanvas";
import { RARITY, type SkinDef, type BackgroundDef, type Rarity } from "@/lib/catalog";
import { api } from "@/lib/client-api";
import { sfx } from "@/components/game/sound";
import { SkinPreviewCanvas, BackgroundPreviewCanvas } from "@/components/shop/Preview";

interface PanelProps {
  onBack: () => void;
  onPlay?: () => void;
  onPlayerSync?: (p: PublicPlayer) => void;
  initialPlayer?: PublicPlayer | null;
}

export default function ShopPanel({
  onBack,
  onPlay,
  onPlayerSync,
  initialPlayer = null,
}: PanelProps) {
  const [player, setPlayer] = useState<PublicPlayer | null>(initialPlayer);
  const [skins, setSkins] = useState<SkinDef[]>([]);
  const [backgrounds, setBackgrounds] = useState<BackgroundDef[]>([]);
  const [tab, setTab] = useState<"skins" | "bg">("skins");
  const [skinFilter, setSkinFilter] = useState<"all" | "heroes">("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const load = useCallback(async () => {
    const r = await api<{
      skins: SkinDef[];
      backgrounds: BackgroundDef[];
      player: PublicPlayer | null;
    }>("/api/shop");
    if (r.ok && r.data) {
      setSkins(r.data.skins);
      setBackgrounds(r.data.backgrounds);
      // Каталог публичный. Если авторизация API моргнула, не стираем
      // аккаунт, уже переданный из главной страницы.
      if (r.data.player) setPlayer(r.data.player);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (initialPlayer) setPlayer(initialPlayer);
  }, [initialPlayer]);

  useEffect(() => {
    if (player && onPlayerSync) onPlayerSync(player);
  }, [player, onPlayerSync]);

  const act = async (itemId: string, action: "buy" | "equip") => {
    setBusyId(itemId); setMsg(null);
    const r = await api<{ player: PublicPlayer }>("/api/shop", {
      method: "POST",
      body: { action, itemId },
    });
    if (r.ok && r.data) {
      setPlayer(r.data.player);
      action === "buy" ? sfx.power() : sfx.click();
      setMsg({ text: action === "buy" ? "Куплено и надето!" : "Надето!" });
    } else if (r.unauthorized) {
      setMsg({ text: "Войди в аккаунт на главной, чтобы покупать", bad: true });
      setPlayer(null);
    } else {
      setMsg({ text: r.error ?? "Ошибка", bad: true });
    }
    setBusyId("");
  };

  const owns = (id: string, price: number) =>
    price === 0 || (player?.owned ?? []).includes(id);
  const equipped = (id: string) => player?.skin === id || player?.background === id;

  const items: (SkinDef | BackgroundDef)[] =
    tab === "skins"
      ? skinFilter === "heroes"
        ? skins.filter((s) => s.hero)
        : skins
      : backgrounds;
  const allItems = useMemo(() => [...skins, ...backgrounds], [skins, backgrounds]);
  const ownedCount = allItems.filter((i) => owns(i.id, i.price)).length;
  const progress = allItems.length ? (ownedCount / allItems.length) * 100 : 0;

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
        <div className="absolute -top-32 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-fuchsia-600/15 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[420px] rounded-full bg-cyan-500/10 blur-[110px]" />
        <div className="stars-bg absolute inset-0" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5">
        <button onClick={onBack} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white/70 transition hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> К игре
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em]">
            <ShoppingBag className="h-4 w-4 text-fuchsia-400" /> Магазин
          </span>
          {player && (
            <span className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black text-amber-300 tabular-nums">
              <Coins className="h-4 w-4" /> {player.coins.toLocaleString("ru-RU")}
            </span>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16">
        {/* Витрина текущего образа */}
        {player && (
          <section className="glass-strong mb-5 flex flex-col items-center gap-5 overflow-hidden rounded-3xl p-5 sm:flex-row">
            <div className="relative shrink-0 overflow-hidden rounded-2xl">
              <div className="absolute inset-0">
                <BackgroundPreviewCanvas
                  bg={backgrounds.find((b) => b.id === player.background) ?? backgrounds[0]}
                  width={168}
                  height={168}
                />
              </div>
              <div className="relative flex h-[168px] w-[168px] items-center justify-center">
                <SkinPreviewCanvas
                  skin={skins.find((s) => s.id === player.skin) ?? skins[0]}
                  size={132}
                />
              </div>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Твой образ</p>
              <p className="font-display mt-1 text-2xl font-black">
                {skins.find((s) => s.id === player.skin)?.name ?? "—"}
              </p>
              <p className="text-sm text-white/50">
                Фон: {backgrounds.find((b) => b.id === player.background)?.name ?? "—"}
              </p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-white/45">
                  <span>Коллекция</span>
                  <span>{ownedCount} / {allItems.length}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => (onPlay ? onPlay() : onBack())}
                className="btn-neon mt-4 inline-flex px-5 py-2.5 text-xs"
              >
                <Play className="h-3.5 w-3.5" /> Опробовать в игре
              </button>
            </div>
          </section>
        )}

        {!player && (
          <p className="glass-strong mb-4 rounded-2xl px-5 py-4 text-center text-sm font-bold text-amber-300">
            Войди в аккаунт на главной — и сможешь покупать косметику за монеты
          </p>
        )}

        {/* Табы */}
        <div className="glass-strong flex gap-1 rounded-2xl p-1.5 text-sm font-bold">
          <button
            onClick={() => setTab("skins")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 transition ${tab === "skins" ? "bg-fuchsia-500 text-white" : "text-white/50 hover:text-white"}`}
          >
            <UserRound className="h-4 w-4" /> Персонажи · {skins.length}
          </button>
          <button
            onClick={() => setTab("bg")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 transition ${tab === "bg" ? "bg-fuchsia-500 text-white" : "text-white/50 hover:text-white"}`}
          >
            <Palette className="h-4 w-4" /> Миры · {backgrounds.length}
          </button>
        </div>

        {tab === "skins" && (
          <div className="mt-3 flex justify-center gap-2">
            <button
              onClick={() => setSkinFilter("all")}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                skinFilter === "all"
                  ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                  : "border-white/10 bg-white/5 text-white/45 hover:text-white"
              }`}
            >
              Все персонажи
            </button>
            <button
              onClick={() => setSkinFilter("heroes")}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition ${
                skinFilter === "heroes"
                  ? "border-amber-400/50 bg-gradient-to-r from-rose-500/20 to-amber-400/20 text-amber-200"
                  : "border-white/10 bg-white/5 text-white/45 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Супергерои · {skins.filter((s) => s.hero).length}
            </button>
          </div>
        )}

        {msg && (
          <p className={`mt-3 rounded-xl border px-4 py-2.5 text-center text-xs font-bold ${
            msg.bad
              ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
              : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
          }`}>
            {msg.text}
          </p>
        )}

        {/* Витрина */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const owned = owns(item.id, item.price);
            const on = equipped(item.id);
            const canAfford = (player?.coins ?? 0) >= item.price;
            const isSkin = tab === "skins";
            const rar = RARITY[item.rarity as Rarity];
            return (
              <div
                key={item.id}
                className={`glass-strong group relative overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1 ${on ? "ring-2 ring-fuchsia-400" : ""}`}
                style={{ boxShadow: on ? `0 12px 40px ${rar.glow}` : undefined }}
              >
                {/* Превью */}
                <div className="relative h-40 overflow-hidden">
                  {isSkin ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b] to-[#0b0620]" />
                      <div
                        className="absolute inset-0 opacity-60"
                        style={{ background: `radial-gradient(circle at 50% 55%, ${rar.glow}, transparent 62%)` }}
                      />
                      <div className="relative flex h-full items-center justify-center">
                        <SkinPreviewCanvas skin={item as SkinDef} size={126} />
                      </div>
                    </>
                  ) : (
                    <BackgroundPreviewCanvas bg={item as BackgroundDef} width={340} height={160} />
                  )}

                  <span
                    className="absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md"
                    style={{ background: `${rar.glow}`, color: "#fff" }}
                  >
                    <Star className="h-3 w-3" /> {rar.label}
                  </span>

                  {on && (
                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-fuchsia-500 px-2.5 py-1 text-[10px] font-black uppercase">
                      <Check className="h-3 w-3" /> Надето
                    </span>
                  )}
                  {!owned && (
                    <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black text-white/80 backdrop-blur-md">
                      <Lock className="h-3 w-3" /> Закрыто
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-display truncate text-base font-black">{item.name}</p>
                    {!owned && (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-black text-amber-300 tabular-nums">
                        <Coins className="h-3.5 w-3.5" />
                        {item.price.toLocaleString("ru-RU")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/45">{item.desc}</p>

                  {on ? (
                    <button disabled className="btn-ghost mt-3 w-full cursor-default justify-center px-4 py-2.5 text-xs opacity-60">
                      <Check className="h-3.5 w-3.5" /> Используется
                    </button>
                  ) : owned ? (
                    <button
                      onClick={() => act(item.id, "equip")}
                      disabled={busyId === item.id || !player}
                      className="btn-neon mt-3 w-full justify-center px-4 py-2.5 text-xs disabled:opacity-40"
                    >
                      {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Надеть
                    </button>
                  ) : (
                    <button
                      onClick={() => act(item.id, "buy")}
                      disabled={busyId === item.id || !player || !canAfford}
                      className="btn-neon mt-3 w-full justify-center px-4 py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : canAfford ? (
                        <Coins className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                      {canAfford ? "Купить" : `Не хватает ${(item.price - (player?.coins ?? 0)).toLocaleString("ru-RU")}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-white/35">
          Монеты зарабатываются в забегах: за высоту, бонусы каждые 250 м и сбитых врагов.
          У каждого мира свой погодный эффект, у персонажа — свой цвет следа.
        </p>
      </main>
    </div>
  );
}
