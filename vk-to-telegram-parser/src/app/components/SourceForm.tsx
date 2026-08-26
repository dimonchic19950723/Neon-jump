"use client";
import { useState, FormEvent } from "react";

export default function SourceForm({ onCreated }: { onCreated?: () => void }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: input }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Ошибка сохранения");
      setInput("");
      onCreated?.();
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-sm text-slate-600">Ссылка или короткое имя группы ВК</label>
      <input
        type="text"
        required
        placeholder="например: https://vk.com/durov или durov"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
        {loading ? "Сохранение..." : "Добавить источник"}
      </button>
    </form>
  );
}
