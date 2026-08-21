import { db } from "@/db";
import { players } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getPlayerFromRequest, publicPlayer } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST { coins, score } — промежуточное сохранение прогресса во время забега.
// Начисляет только прирост монет и подтягивает рекорд, НЕ увеличивая счётчик игр.
// Благодаря этому монеты не теряются, даже если вкладку закрыли посреди игры.
export async function POST(req: Request) {
  try {
    const player = await getPlayerFromRequest(req);
    if (!player) return Response.json({ error: "Не авторизован" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const score = Math.max(0, Math.min(100000, Math.floor(Number(body.score) || 0)));
    const coins = Math.max(
      0,
      Math.min(5000 + score * 2, Math.floor(Number(body.coins) || 0)),
    );

    if (coins <= 0 && score <= 0) {
      return Response.json({ ok: true, player: publicPlayer(player) });
    }

    const updated = await db
      .update(players)
      .set({
        coins: sql`${players.coins} + ${coins}`,
        bestScore: sql`GREATEST(${players.bestScore}, ${score})`,
      })
      .where(eq(players.id, player.id))
      .returning();

    return Response.json({ ok: true, player: publicPlayer(updated[0]) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
