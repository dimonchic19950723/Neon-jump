import crypto from "crypto";
import { db } from "@/db";
import { authTokens, players } from "@/db/schema";
import { eq } from "drizzle-orm";

export type PlayerRow = typeof players.$inferSelect;

export const SESSION_COOKIE = "nj_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

export function publicPlayer(p: PlayerRow) {
  return {
    id: p.id,
    username: p.username,
    bestScore: p.bestScore,
    gamesPlayed: p.gamesPlayed,
    coins: p.coins,
    rub: parseFloat(p.rub),
    totalEarned: parseFloat(p.totalEarned),
    adViews: p.adViews,
    skin: p.skin,
    background: p.background,
    owned: p.ownedItems ? p.ownedItems.split(",").filter(Boolean) : [],
  };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const test = crypto.scryptSync(password, salt, 64);
    const ref = Buffer.from(hash, "hex");
    return test.length === ref.length && crypto.timingSafeEqual(test, ref);
  } catch {
    return false;
  }
}

export async function issueToken(playerId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(authTokens).values({ playerId, token });
  return token;
}

export async function revokeToken(token: string): Promise<void> {
  if (!token) return;
  await db.delete(authTokens).where(eq(authTokens.token, token));
}

// Достаёт токен из Bearer-заголовка ИЛИ httpOnly-cookie (резервный канал)
export function extractToken(req: Request): string {
  const h = req.headers.get("authorization") ?? "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  const cookieHeader = req.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const k = part.slice(0, eqIdx).trim();
    if (k === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(eqIdx + 1).trim());
    }
  }
  return "";
}

// ВАЖНО: игра часто открыта во встроенном контексте (iframe превью,
// встраивание на сторонний сайт). Там браузер отправляет cookie ТОЛЬКО
// при SameSite=None; Secure. Реальный протокол за прокси не виден
// (Next всегда получает http), поэтому ставим эти атрибуты всегда:
// http://localhost браузеры считают доверенным источником, а прод
// работает по https. Если cookie всё же не дойдёт — остаётся
// резервный канал Bearer-токена.
const COOKIE_ATTRS = "Path=/; HttpOnly; SameSite=None; Secure";

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; ${COOKIE_ATTRS}; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${COOKIE_ATTRS}; Max-Age=0`;
}

// Достаёт игрока по токену (Bearer или cookie)
export async function getPlayerFromRequest(req: Request): Promise<PlayerRow | null> {
  const token = extractToken(req);
  if (!token) return null;
  const rows = await db
    .select({ player: players })
    .from(authTokens)
    .innerJoin(players, eq(players.id, authTokens.playerId))
    .where(eq(authTokens.token, token))
    .limit(1);
  return rows[0]?.player ?? null;
}
