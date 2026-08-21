import { db } from "@/db";
import { players } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getPlayerFromRequest, publicPlayer } from "@/lib/auth";
import { BACKGROUNDS, SKINS, findItem } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// GET — каталог + что куплено у текущего игрока
export async function GET(req: Request) {
  const player = await getPlayerFromRequest(req);
  return Response.json({
    skins: SKINS,
    backgrounds: BACKGROUNDS,
    player: player ? publicPlayer(player) : null,
  });
}

// POST { action: 'buy' | 'equip', itemId }
export async function POST(req: Request) {
  try {
    const player = await getPlayerFromRequest(req);
    if (!player) return Response.json({ error: "Не авторизован" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const itemId = String(body.itemId ?? "");
    const item = findItem(itemId);
    if (!item) return Response.json({ error: "Предмет не найден" }, { status: 400 });

    const owned = player.ownedItems ? player.ownedItems.split(",").filter(Boolean) : [];
    const isFree = item.price === 0;
    const hasItem = isFree || owned.includes(itemId);

    if (action === "buy") {
      if (hasItem) return Response.json({ error: "Уже куплено" }, { status: 400 });
      // Атомарное списание: только если монет достаточно
      const nextOwned = [...owned, itemId].join(",");
      const updated = await db
        .update(players)
        .set({
          coins: sql`${players.coins} - ${item.price}`,
          ownedItems: nextOwned,
          // сразу надеваем купленное
          ...(item.kind === "skin" ? { skin: itemId } : { background: itemId }),
        })
        .where(sql`${players.id} = ${player.id} AND ${players.coins} >= ${item.price}`)
        .returning();
      if (!updated[0]) {
        return Response.json({ error: "Недостаточно монет" }, { status: 400 });
      }
      return Response.json({ ok: true, player: publicPlayer(updated[0]) });
    }

    if (action === "equip") {
      if (!hasItem) return Response.json({ error: "Предмет не куплен" }, { status: 400 });
      const updated = await db
        .update(players)
        .set(item.kind === "skin" ? { skin: itemId } : { background: itemId })
        .where(sql`${players.id} = ${player.id}`)
        .returning();
      return Response.json({ ok: true, player: publicPlayer(updated[0]) });
    }

    return Response.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}


