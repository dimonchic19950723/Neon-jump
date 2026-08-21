import { db } from "@/db";
import { players } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const byScore = await db
    .select({
      id: players.id,
      username: players.username,
      bestScore: players.bestScore,
      totalEarned: players.totalEarned,
    })
    .from(players)
    .orderBy(desc(players.bestScore))
    .limit(10);

  const byEarn = await db
    .select({
      id: players.id,
      username: players.username,
      bestScore: players.bestScore,
      totalEarned: players.totalEarned,
    })
    .from(players)
    .orderBy(desc(players.totalEarned))
    .limit(10);

  return Response.json({
    byScore: byScore.map((p) => ({ ...p, totalEarned: parseFloat(p.totalEarned) })),
    byEarn: byEarn.map((p) => ({ ...p, totalEarned: parseFloat(p.totalEarned) })),
  });
}
