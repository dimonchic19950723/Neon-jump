import { db } from "@/db";
import { adEvents, players } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSettings, num } from "@/lib/economy";
import { getPlayerFromRequest, publicPlayer } from "@/lib/auth";

export const dynamic = "force-dynamic";

const KINDS = new Set(["interstitial", "rewarded_revive", "rewarded_double"]);

// POST { kind } — зафиксировать показ рекламы и разделить доход (Bearer-токен)
export async function POST(req: Request) {
  try {
    const player = await getPlayerFromRequest(req);
    if (!player) return Response.json({ error: "Не авторизован" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const kind = String(body.kind ?? "interstitial");
    if (!KINDS.has(kind)) {
      return Response.json({ error: "Неверный тип показа" }, { status: 400 });
    }

    const cfg = await getSettings();
    const revenue = num(cfg.cpm, 120) / 1000; // доход за 1 показ
    const sharePct = Math.max(0, Math.min(95, num(cfg.playerShare, 50)));
    const playerShare = (revenue * sharePct) / 100;

    // Ограничение частоты: не более 3 показов в секунду на игрока
    const recent = await db.execute(sql`
      SELECT COUNT(*)::int AS c FROM ad_events
      WHERE player_id = ${player.id} AND created_at > now() - interval '1 second'
    `);
    const c = Number((recent.rows[0] as { c: number } | undefined)?.c ?? 0);
    if (c >= 3) {
      return Response.json({ error: "Слишком частые показы" }, { status: 429 });
    }

    await db.insert(adEvents).values({
      playerId: player.id,
      kind,
      revenue: revenue.toFixed(6),
      playerShare: playerShare.toFixed(6),
    });

    const updated = await db
      .update(players)
      .set({
        rub: sql`${players.rub} + ${playerShare.toFixed(6)}`,
        totalEarned: sql`${players.totalEarned} + ${playerShare.toFixed(6)}`,
        adViews: sql`${players.adViews} + 1`,
      })
      .where(eq(players.id, player.id))
      .returning();

    return Response.json({
      ok: true,
      revenue,
      playerShare,
      player: updated[0] ? publicPlayer(updated[0]) : null,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
