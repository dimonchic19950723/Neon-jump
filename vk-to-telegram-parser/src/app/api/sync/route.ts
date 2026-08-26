import { db } from "@/db";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { vkPosts, vkSources } from "@/db/schema";
import { buildPostLink, extractPhotoUrls, getWall } from "@/lib/vk";
import { sendMediaGroup, sendMessage, sendPhoto } from "@/lib/telegram";

export const dynamic = "force-dynamic";

async function syncOne(sourceId: number) {
  const sources = await db.select().from(vkSources).where(and(eq(vkSources.id, sourceId), eq(vkSources.active, true))).limit(1);
  if (!sources.length) return { sourceId, skipped: true, reason: "not found or inactive" };
  const source = sources[0];
  const wall = await getWall(source.domain, { count: 10, filter: "owner" });

  // Determine new posts compared to lastPostId
  const items = wall.items.sort((a, b) => a.id - b.id);
  const newItems = source.lastPostId ? items.filter((p) => p.id > (source.lastPostId as number)) : items;

  let sent = 0;
  for (const post of newItems) {
    const [existing] = await db.select().from(vkPosts).where(eq(vkPosts.vkPostId, post.id)).limit(1);
    if (existing) continue;

    const link = buildPostLink(post.owner_id, post.id);
    const caption = [post.text?.trim() || "", `\n\n<a href="${link}">Источник ВК</a>`].join("").trim();
    const photos = extractPhotoUrls(post);

    try {
      if (photos.length > 1) {
        await sendMediaGroup(photos, caption);
      } else if (photos.length === 1) {
        await sendPhoto(photos[0], caption);
      } else if (caption) {
        await sendMessage(caption);
      }
      sent++;
      await db.insert(vkPosts).values({
        sourceId: source.id,
        vkPostId: post.id,
        ownerId: post.owner_id,
        dateTs: post.date,
        text: post.text ?? null,
        attachments: photos.length ? (photos as any) : null,
        sentToTelegram: true,
        sentAt: new Date(),
      });
      await db.update(vkSources).set({ lastPostId: post.id, lastSyncAt: new Date(), updatedAt: new Date() }).where(eq(vkSources.id, source.id));
    } catch (err) {
      // Log failed post to avoid blocking the rest
      await db.insert(vkPosts).values({
        sourceId: source.id,
        vkPostId: post.id,
        ownerId: post.owner_id,
        dateTs: post.date,
        text: post.text ?? null,
        attachments: photos.length ? (photos as any) : null,
        sentToTelegram: false,
      });
      await db.update(vkSources).set({ lastSyncAt: new Date(), updatedAt: new Date() }).where(eq(vkSources.id, source.id));
      throw err;
    }
  }

  return { sourceId: source.id, new: newItems.length, sent };
}

export async function POST(req: Request) {
  try {
    // Ensure env vars present
    if (!process.env.VK_ACCESS_TOKEN) throw new Error("VK_ACCESS_TOKEN is missing");
    if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is missing");
    if (!process.env.TELEGRAM_CHAT_ID) throw new Error("TELEGRAM_CHAT_ID is missing");

    const body = await req.json().catch(() => ({}));
    const sourceId: number | undefined = body.sourceId;

    if (sourceId) {
      const result = await syncOne(Number(sourceId));
      return Response.json({ ok: true, result });
    }

    const sources = await db.select().from(vkSources).where(eq(vkSources.active, true));
    const results = [] as any[];
    for (const s of sources) {
      const r = await syncOne(s.id);
      results.push(r);
    }
    return Response.json({ ok: true, results });
  } catch (err: any) {
    return Response.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
