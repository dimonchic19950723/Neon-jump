import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const DEFAULT_SETTINGS = {
  // Встроенная ссылка на рекламу (iframe в оверлее). Пусто = демо-реклама.
  adLink: "",
  // Готовый HTML/JS-код рекламной сети (баннер/скрипт). Приоритет выше ссылки.
  adCode: "",
  // Доход за 1000 показов, ₽
  cpm: "120",
  // Процент дохода, который получает игрок
  playerShare: "50",
  // Сколько монет стоит 1 ₽ (обменный курс)
  coinRate: "1000",
  // Минимальная сумма вывода, ₽
  minWithdraw: "100",
  // Бонус монет за каждые 250 метров высоты
  milestoneBonus: "50",
} as const;

export type SettingsMap = Record<keyof typeof DEFAULT_SETTINGS, string>;

export async function getSettings(): Promise<SettingsMap> {
  const rows = await db.select().from(settings);
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) map[r.key] = r.value;
  return map as unknown as SettingsMap;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export function num(v: string | number, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}
