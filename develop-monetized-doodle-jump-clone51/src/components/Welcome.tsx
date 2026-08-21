"use client";

import {
  Play,
  Wallet,
  Home,
  CheckCircle2,
  ShieldCheck,
  Coins,
  MonitorPlay,
  Rocket,
  ShoppingBag,
} from "lucide-react";
import type { PublicPlayer } from "@/components/game/GameCanvas";
import { sfx } from "@/components/game/sound";

interface Props {
  player: PublicPlayer;
  mode: "login" | "register";
  onPlay: () => void;
  onMenu: () => void;
  onShop: () => void;
  onWallet: () => void;
}

export default function Welcome({ player, mode, onPlay, onMenu, onShop, onWallet }: Props) {
  const isNew = mode === "register";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0620] p-5 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[350px] w-[450px] rounded-full bg-cyan-500/15 blur-[110px]" />
        <div className="stars-bg absolute inset-0" />
      </div>

      <div className="glass-strong relative z-10 w-full max-w-md rounded-[2rem] p-8 text-center animate-[fadeIn_.35s_ease]">
        {/* Анимированная галочка */}
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
          <span className="absolute inset-2 rounded-full bg-emerald-400/15" />
          {isNew ? (
            <CheckCircle2 className="relative h-10 w-10 text-emerald-400" />
          ) : (
            <Rocket className="relative h-10 w-10 text-fuchsia-400" />
          )}
        </div>

        <h1 className="font-display mt-5 text-2xl font-black sm:text-3xl">
          {isNew ? "Аккаунт создан!" : "С возвращением!"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          {isNew ? (
            <>
              Твой прогресс — рекорды, монеты и рубли — теперь надёжно
              сохраняется за логином{" "}
              <b className="text-white">{player.username}</b>. Войти можно с
              любого устройства по логину и паролю.
            </>
          ) : (
            <>
              <b className="text-white">{player.username}</b>, весь твой
              прогресс подтянут: рекорд{" "}
              <b className="text-white">{player.bestScore} м</b>, заработано{" "}
              <b className="text-emerald-300">
                {player.totalEarned.toFixed(2)} ₽
              </b>
              .
            </>
          )}
        </p>

        {/* Мини-карточки */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { icon: ShieldCheck, t: "Данные", d: "защищены" },
            { icon: Coins, t: `${player.coins}`, d: "монет" },
            { icon: MonitorPlay, t: `${player.adViews}`, d: "показов" },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl bg-white/[0.05] p-3">
              <c.icon className="mx-auto h-4 w-4 text-cyan-300" />
              <p className="font-display mt-1.5 truncate text-sm font-black">{c.t}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{c.d}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => { sfx.click(); onPlay(); }}
          className="btn-neon group mt-7 w-full justify-center px-8 py-4 text-base"
        >
          <Play className="h-5 w-5 transition-transform group-hover:scale-125" />
          Начать игру
        </button>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <button onClick={onShop} className="btn-ghost justify-center px-3 py-3 text-xs">
            <ShoppingBag className="h-4 w-4" /> Магазин
          </button>
          <button onClick={onWallet} className="btn-ghost justify-center px-3 py-3 text-xs">
            <Wallet className="h-4 w-4" /> Кошелёк
          </button>
          <button onClick={onMenu} className="btn-ghost justify-center px-3 py-3 text-xs">
            <Home className="h-4 w-4" /> Меню
          </button>
        </div>
      </div>
    </div>
  );
}
