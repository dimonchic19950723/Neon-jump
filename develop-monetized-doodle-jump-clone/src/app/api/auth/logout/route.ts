import { clearSessionCookie, extractToken, revokeToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST — завершить сессию (удалить токен и cookie)
export async function POST(req: Request) {
  const token = extractToken(req);
  await revokeToken(token).catch(() => {});
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearSessionCookie(),
    },
  });
}
