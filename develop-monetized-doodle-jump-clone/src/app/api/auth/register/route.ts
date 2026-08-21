import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, issueToken, publicPlayer, sessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST { username, password } — создать аккаунт
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim().slice(0, 24);
    const password = String(body.password ?? "");

    if (username.length < 2) {
      return Response.json({ error: "Логин — от 2 до 24 символов" }, { status: 400 });
    }
    if (!/^[\wа-яА-ЯёЁ\s.-]+$/u.test(username)) {
      return Response.json(
        { error: "Логин: только буквы, цифры, пробел, точка и дефис" },
        { status: 400 },
      );
    }
    if (password.length < 5 || password.length > 64) {
      return Response.json({ error: "Пароль — от 5 до 64 символов" }, { status: 400 });
    }

    const existing = await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.username, username))
      .limit(1);
    if (existing[0]) {
      return Response.json({ error: "Такой логин уже занят" }, { status: 409 });
    }

    const created = await db
      .insert(players)
      .values({ username, passwordHash: hashPassword(password) })
      .returning();
    const token = await issueToken(created[0].id);
    return new Response(JSON.stringify({ player: publicPlayer(created[0]), token }), {
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
