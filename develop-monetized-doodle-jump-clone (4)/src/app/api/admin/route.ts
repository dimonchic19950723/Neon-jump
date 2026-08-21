import { db } from "@/db";
import { adEvents, players, sessions, withdrawals } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { getSettings, setSetting } from "@/lib/economy";

export const dynamic = "force-dynamic";

function isAdmin(req: Request) {
  const key = req.headers.get("x-admin-key") ?? "";
  const expected = process.env.ADMIN_PASSWORD ?? "admin123";
  return key.length > 0 && key === expected;
}

// GET — сводная статистика для админ-панели
export async function GET(req: Request) {
  if (!isAdmin(req)) return Response.json({ error: "Нет доступа" }, { status: 401 });

  const [ads] = await db
    .select({
      views: sql<number>`COUNT(*)::int`,
      revenue: sql<string>`COALESCE(SUM(${adEvents.revenue}), 0)`,
      playerShare: sql<string>`COALESCE(SUM(${adEvents.playerShare}), 0)`,
    })
    .from(adEvents);

  const [pl] = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
      paidToPlayers: sql<string>`COALESCE(SUM(${players.totalEarned}), 0)`,
    })
    .from(players);

  const [ss] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(sessions);

  const pending = await db
    .select({
      id: withdrawals.id,
      amount: withdrawals.amount,
      details: withdrawals.details,
      status: withdrawals.status,
      createdAt: withdrawals.createdAt,
      username: players.username,
    })
    .from(withdrawals)
    .leftJoin(players, sql`${players.id} = ${withdrawals.playerId}`)
    .orderBy(desc(withdrawals.createdAt))
    .limit(50);

  const top = await db
    .select({
      username: players.username,
      bestScore: players.bestScore,
      totalEarned: players.totalEarned,
      adViews: players.adViews,
    })
    .from(players)
    .orderBy(desc(players.totalEarned))
    .limit(10);

  const settingsMap = await getSettings();
  const revenue = parseFloat(ads?.revenue ?? "0");
  const shares = parseFloat(ads?.playerShare ?? "0");

  return Response.json({
    stats: {
      players: pl?.count ?? 0,
      games: ss?.count ?? 0,
      adViews: ads?.views ?? 0,
      revenue,
      paidToPlayers: shares,
      ownerRevenue: revenue - shares,
    },
    withdrawals: pending.map((w) => ({ ...w, amount: parseFloat(w.amount) })),
    top: top.map((t) => ({ ...t, totalEarned: parseFloat(t.totalEarned) })),
    settings: settingsMap,
  });
}

// POST { action: 'settings' | 'payout', ... } — действия администратора
export async function POST(req: Request) {
  if (!isAdmin(req)) return Response.json({ error: "Нет доступа" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "settings") {
    const allowed = ["adLink", "adCode", "cpm", "playerShare", "coinRate", "minWithdraw", "milestoneBonus"];
    const entries = Object.entries(body.settings ?? {}) as [string, string][];
    for (const [k, v] of entries) {
      const limit = k === "adCode" ? 8000 : 500;
      if (allowed.includes(k)) await setSetting(k, String(v).slice(0, limit));
    }
    return Response.json({ ok: true, settings: await getSettings() });
  }

  if (action === "payout") {
    const id = String(body.id ?? "");
    const status = body.status === "rejected" ? "rejected" : "paid";
    // При отклонении возвращаем средства игроку
    if (status === "rejected") {
      const rows = await db
        .select()
        .from(withdrawals)
        .where(desc(withdrawals.id))
        .limit(200);
      const w = rows.find((r) => r.id === id);
      if (w && w.status === "pending") {
        await db.execute(sql`
          UPDATE players SET rub = rub + ${w.amount} WHERE id = ${w.playerId}
        `);
      }
    }
    await db.execute(sql`UPDATE withdrawals SET status = ${status} WHERE id = ${id}`);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Неизвестное действие" }, { status: 400 });
}
