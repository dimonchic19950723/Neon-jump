import { db } from "@/db";
import { sql } from "drizzle-orm";
import SourceForm from "./components/SourceForm";
import SourceList from "./components/SourceList";
import { vkSources } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await db.execute(sql`select 1`);
  const sources = await db.select().from(vkSources).orderBy(vkSources.id);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto grid max-w-3xl gap-8">
        <header>
          <h1 className="text-3xl font-semibold">VK → Telegram парсер</h1>
          <p className="mt-1 text-slate-600">Добавляйте группы ВК и отправляйте новые посты в канал/чат Telegram.</p>
        </header>
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Добавить источник</h2>
          <SourceForm onCreated={() => { window.location.reload(); }} />
        </section>
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Источники</h2>
          <SourceList initial={sources as any} />
          <div className="mt-4">
            <form action="/api/sync" method="post" onSubmit={(e) => {}}>
              <button className="rounded-md bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800">Синхронизировать все</button>
            </form>
            <p className="mt-2 text-xs text-slate-500">Требуются переменные окружения: VK_ACCESS_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID</p>
          </div>
        </section>
      </div>
    </main>
  );
}
