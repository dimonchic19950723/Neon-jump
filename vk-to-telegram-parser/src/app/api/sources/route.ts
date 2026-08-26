import { db } from "@/db";
import { eq } from "drizzle-orm";
import { vkSources } from "@/db/schema";
import { parseVkDomain } from "@/lib/vk";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await db.select().from(vkSources).orderBy(vkSources.id);
  return Response.json({ sources: data });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const input: string = body.domain ?? body.input ?? "";
    const active: boolean = body.active ?? true;
    if (!input || typeof input !== "string") return Response.json({ error: "domain is required" }, { status: 400 });
    const domain = parseVkDomain(input);

    const existing = await db.select().from(vkSources).where(eq(vkSources.domain, domain)).limit(1);
    if (existing.length) {
      const updated = await db
        .update(vkSources)
        .set({ active, updatedAt: new Date() })
        .where(eq(vkSources.id, existing[0].id))
        .returning();
      return Response.json({ source: updated[0], updated: true });
    }

    const inserted = await db.insert(vkSources).values({ domain, active }).returning();
    return Response.json({ source: inserted[0] }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
