"use client";
import { useState } from "react";

export type Source = {
  id: number;
  domain: string;
  lastPostId: number | null;
  lastSyncAt: string | null;
  active: boolean;
};

export default function SourceList({ initial }: { initial: Source[] }) {
  const [sources, setSources] = useState(initial);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const syncOne = async (id: number) => {
    setSyncingId(id);
    setMessage(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка синхронизации");
      setMessage(`Источник #${id}: отправлено ${data.result?.sent ?? 0}`);
      // refresh lastSyncAt optimistically
      setSources((prev) => prev.map((s) => (s.id === id ? { ...s, lastSyncAt: new Date().toISOString() } : s)));
    } catch (err: any) {
      setMessage(String(err?.message || err));
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {message && <p className="text-sm text-slate-700">{message}</p>}
      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
        {sources.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 p-3">
            <div>
              <p className="font-medium">vk.com/{s.domain}</p>
              <p className="text-xs text-slate-500">Последняя синхронизация: {s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString() : "никогда"}</p>
            </div>
            <button
              onClick={() => syncOne(s.id)}
              disabled={syncingId === s.id}
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {syncingId === s.id ? "Синхронизация..." : "Синхронизировать"}
            </button>
          </li>
        ))}
        {sources.length === 0 && <li className="p-3 text-sm text-slate-500">Источников пока нет</li>}
      </ul>
    </div>
  );
}
