import { getSettings } from "@/lib/economy";

export const dynamic = "force-dynamic";

// Публичные настройки (рекламная ссылка нужна клиенту для показа)
export async function GET() {
  const cfg = await getSettings();
  return Response.json({ settings: cfg });
}
