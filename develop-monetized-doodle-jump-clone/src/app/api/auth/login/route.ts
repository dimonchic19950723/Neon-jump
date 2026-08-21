import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { issueToken, publicPlayer, sessionCookie, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST { username, password } — войти в аккаунт
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim().slice(0, 24);
    const password = String(body.password ?? "");

    const rows = await db
      .select()
      .from(players)
      .where(eq(players.username, username))
      .limit(1);
    const p = rows[0];
    if (!p || !p.passwordHash || !verifyPassword(password, p.passwordHash)) {
      return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    const token = await issueToken(p.id);
    return new Response(JSON.stringify({ player: publicPlayer(p), token }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": sessionCookie(token),
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
