import {
  extractToken,
  getPlayerFromRequest,
  publicPlayer,
  sessionCookie,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — текущий игрок по Bearer-токену или cookie.
// Заодно продлевает cookie (скользящая сессия) и возвращает токен,
// чтобы клиент мог восстановить его в своих хранилищах.
export async function GET(req: Request) {
  const player = await getPlayerFromRequest(req);
  if (!player) return Response.json({ error: "Не авторизован" }, { status: 401 });

  const token = extractToken(req);
  return new Response(
    JSON.stringify({ player: publicPlayer(player), token }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Set-Cookie": sessionCookie(token) } : {}),
      },
    },
  );
}
