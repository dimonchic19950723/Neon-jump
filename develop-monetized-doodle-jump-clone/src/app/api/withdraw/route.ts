import { db } from "@/db";
import { players, withdrawals } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getSettings, num } from "@/lib/economy";
import { getPlayerFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST { amount, details } — заявка на вывод (Bearer-токен)
export async function POST(req: Request) {
  try {
    const player = await getPlayerFromRequest(req);
    if (!player) return Response.json({ error: "Не авторизован" }, { status: 401 });

    const body = await req.json();
    const details = String(body.details ?? "").trim().slice(0, 200);
    const amount = Math.floor((Number(body.amount) || 0) * 100) / 100;

    const cfg = await getSettings();
    const min = num(cfg.minWithdraw, 100);
    if (amount < min) {
      return Response.json(
        { error: `Минимальная сумма вывода — ${min} ₽` },
        { status: 400 },
      );
    }
    if (!details) {
      return Response.json({ error: "Укажите реквизиты" }, { status: 400 });
    }

    const updated = await db
      .update(players)
      .set({ rub: sql`${players.rub} - ${amount.toFixed(2)}` })
      .where(sql`${players.id} = ${player.id} AND ${players.rub} >= ${amount.toFixed(2)}`)
      .returning({ id: players.id, rub: players.rub });
    if (!updated[0]) {
      return Response.json(
        { error: "Недостаточно средств на балансе" },
        { status: 400 },
      );
    }

    const w = await db
      .insert(withdrawals)
      .values({ playerId: player.id, amount: amount.toFixed(2), details })
      .returning();

    return Response.json({
      ok: true,
      withdrawal: { ...w[0], amount: parseFloat(w[0].amount) },
      rub: parseFloat(updated[0].rub),
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// GET — история заявок текущего игрока (Bearer-токен)
export async function GET(req: Request) {
  const player = await getPlayerFromRequest(req);
  if (!player) return Response.json({ error: "Не авторизован" }, { status: 401 });
  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.playerId, player.id))
    .orderBy(desc(withdrawals.createdAt))
    .limit(30);
  return Response.json({
    withdrawals: rows.map((w) => ({ ...w, amount: parseFloat(w.amount) })),
  });
}
