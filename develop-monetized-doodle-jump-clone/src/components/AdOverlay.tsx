"use client";

import { useEffect, useRef, useState } from "react";
import { X, BadgePercent, MonitorPlay, Gift } from "lucide-react";

export type AdKind = "interstitial" | "rewarded_revive" | "rewarded_double";

interface Props {
  kind: AdKind;
  adLink: string;
  adCode?: string;
  seconds?: number;
  onDone: () => void; // показ засчитан (досмотрели / закрыли после таймера)
}

const TITLES: Record<AdKind, { title: string; sub: string }> = {
  interstitial: {
    title: "Рекламная пауза",
    sub: "Просмотр приносит доход тебе и платформе",
  },
  rewarded_revive: {
    title: "Реклама за возрождение",
    sub: "Досмотри до конца — и продолжишь забег",
  },
  rewarded_double: {
    title: "Реклама за ×2 монет",
    sub: "Досмотри до конца — удвоим добычу забега",
  },
};

export default function AdOverlay({ kind, adLink, adCode = "", seconds = 5, onDone }: Props) {
  const [left, setLeft] = useState(seconds);
  const doneRef = useRef(false);
  const rewarded = kind !== "interstitial";

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const close = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  const t = TITLES[kind];
  const progress = ((seconds - left) / seconds) * 100;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-[fadeIn_.25s_ease]">
      <div className="ad-shell relative w-full max-w-3xl overflow-hidden rounded-3xl border border-fuchsia-400/25 bg-[#0b0620] shadow-[0_0_80px_rgba(217,70,239,0.25)]">
        {/* Шапка рекламного блока */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300/90">
            <MonitorPlay className="h-4 w-4" />
            Реклама
          </div>
          <div className="flex items-center gap-3">
            {rewarded && (
              <span className="hidden items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-bold text-amber-300 sm:flex">
                <Gift className="h-3.5 w-3.5" /> награда за полный просмотр
              </span>
            )}
            {left > 0 ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80 tabular-nums">
                {rewarded ? "До награды" : "Пропуск через"} {left}…
              </span>
            ) : (
              <button
                onClick={close}
                className="flex items-center gap-1.5 rounded-full bg-fuchsia-500 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-fuchsia-400"
              >
                {rewarded ? "Забрать награду" : "Закрыть"} <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="h-1 w-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Тело: код сети / встроенная ссылка / демо-креатив */}
        <div className="relative aspect-[16/9] w-full bg-black">
          {adCode.trim() ? (
            <iframe
              title="advertisement"
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh}</style></head><body>${adCode}</body></html>`}
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : adLink ? (
            <iframe
              src={adLink}
              title="advertisement"
              sandbox="allow-scripts allow-same-origin allow-popups"
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <DemoCreative />
          )}
          {left > 0 && <div className="pointer-events-none absolute inset-0" />}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div>
            <p className="text-sm font-bold text-white">{t.title}</p>
            <p className="text-xs text-white/50">{t.sub}</p>
          </div>
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-cyan-400/10 px-3 py-1.5 text-[11px] font-bold text-cyan-300">
            <BadgePercent className="h-3.5 w-3.5" /> 50% дохода — игроку
          </span>
        </div>
      </div>
    </div>
  );
}

// Встроенный демо-креатив, если ссылка не настроена
function DemoCreative() {
  return (
    <div className="demo-ad absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className="demo-ad__bg" />
      <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
        <span className="animate-bounce rounded-2xl bg-white/95 px-5 py-2 text-2xl font-black uppercase tracking-tight text-fuchsia-600 shadow-2xl">
          Ваша реклама здесь
        </span>
        <p className="max-w-sm text-sm font-medium text-white/85">
          Владелец игры подключает рекламную ссылку в админ-панели — доход
          делится между платформой и игроками
        </p>
        <span className="animate-pulse rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-2.5 text-sm font-black uppercase tracking-widest text-white shadow-[0_0_30px_rgba(34,211,238,0.5)]">
          Узнать больше
        </span>
      </div>
    </div>
  );
}
