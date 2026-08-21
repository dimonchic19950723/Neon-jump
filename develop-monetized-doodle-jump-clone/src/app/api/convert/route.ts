import { db } from "@/db";
import { players } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getSettings, num } from "@/lib/economy";
import { getPlayerFromRequest, publicPlayer } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST { coins } — обменять монеты на рубли по курсу (Bearer-токен)
export async function POST(req: Request) {
  try {
    const player = await getPlayerFromRequest(req);
    if (!player) return Response.json({ error: "Не авторизован" }, { status: 401 });

    const body = await req.json();
    const amount = Math.max(0, Math.floor(Number(body.coins) || 0));
    if (amount <= 0) return Response.json({ error: "Неверные данные" }, { status: 400 });

    const cfg = await getSettings();
    const rate = Math.max(1, num(cfg.coinRate, 100)); // монет за 1 ₽
    const rubGain = amount / rate;

    // Атомарно: списываем только если монет хватает
    const updated = await db
      .update(players)
      .set({
        coins: sql`${players.coins} - ${amount}`,
        rub: sql`${players.rub} + ${rubGain.toFixed(6)}`,
        totalEarned: sql`${players.totalEarned} + ${rubGain.toFixed(6)}`,
      })
      .where(sql`${players.id} = ${player.id} AND ${players.coins} >= ${amount}`)
      .returning();

    if (!updated[0]) {
      return Response.json({ error: "Недостаточно монет" }, { status: 400 });
    }
    return Response.json({ ok: true, rubGain, player: publicPlayer(updated[0]) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
