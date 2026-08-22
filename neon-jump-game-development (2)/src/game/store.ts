// ── Neon Jump · economy store (profile, wallet, inventory, leaderboard) ─
// Mirrors the original server models; persisted locally as a demo.
// Swap these functions for real API calls when connecting a backend.

import { findBackground, findSkin, type Background, type Skin } from "./data";
import { getCurrentAccount, getCurrentId, isGuest, renameCurrent } from "./auth";

export interface Profile {
  id: string;
  username: string;
  created: number;
}

export interface Payout {
  amount: number;
  date: number;
}

export interface Wallet {
  coins: number;
  rubles: number;
  payouts: Payout[];
}

export interface Inventory {
  skins: string[];
  bgs: string[];
  skin: string;
  bg: string;
}

export interface LBRow {
  id: string;
  username: string;
  bestScore: number; // метры
  totalEarned: number; // ₽
}

export interface Stats {
  runs: number;
  ads: number;
  revenue: number;
  paidToPlayers: number;
  lifetimeCoins: number;
}

/** mirrors DEFAULT_SETTINGS from the original economy.ts */
export interface Settings {
  provider: "demo" | "yandex" | "custom"; // рекламный провайдер
  adLink: string; // iframe-ссылка рекламы (пусто = демо)
  adCode: string; // HTML/JS код рекламной сети (приоритет над ссылкой)
  cpm: number; // доход за 1000 показов, ₽
  share: number; // % дохода игроку
  coinRate: number; // сколько монет стоит 1 ₽
  minWithdraw: number; // минимальная сумма вывода, ₽
  milestoneBonus: number; // бонус монет каждые 250 м
}

export const DEFAULT_SETTINGS: Settings = {
  provider: "demo",
  adLink: "",
  adCode: "",
  cpm: 120,
  share: 50,
  coinRate: 1000,
  minWithdraw: 100,
  milestoneBonus: 50,
};

/** Глобальные ключи (общие для всех игроков) */
const K = {
  lb: "neonjump:lb3",
  gstats: "neonjump:gstats",
  settings: "neonjump:settings3",
  adminpass: "neonjump:adminpass",
  adminsession: "neonjump:admin-ok",
  adminlock: "neonjump:admin-lock",
};

/** Ключи данных конкретного аккаунта */
function uk(kind: "wallet" | "inventory" | "stats" | "best", id?: string): string {
  const uid = id ?? getCurrentId() ?? "anon";
  return `neonjump:u:${uid}:${kind}`;
}

/** Копирует прогресс между аккаунтами (гость → зарегистрированный). */
export function copyUserData(fromId: string, toId: string) {
  (["wallet", "inventory", "stats", "best"] as const).forEach((kind) => {
    try {
      const raw = localStorage.getItem(uk(kind, fromId));
      if (raw !== null) localStorage.setItem(uk(kind, toId), raw);
      localStorage.removeItem(uk(kind, fromId));
    } catch {
      /* noop */
    }
  });
  // переносим строку лидерборда
  const lb = read<LBRow[]>(K.lb, []);
  const row = lb.find((r) => r.id === fromId);
  if (row) {
    row.id = toId;
    row.username = getProfile().username;
    write(K.lb, lb);
  }
}

/** Есть ли у гостя что переносить */
export function hasProgress(id: string): boolean {
  try {
    const w = localStorage.getItem(uk("wallet", id));
    if (w && (JSON.parse(w) as Wallet).coins > 0) return true;
    return localStorage.getItem(uk("best", id)) !== null;
  } catch {
    return false;
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

// ── profile (данные берутся из активного аккаунта) ──

export function getProfile(): Profile {
  const acc = getCurrentAccount();
  if (acc) return { id: acc.id, username: acc.username, created: acc.created };
  return { id: "anon", username: "Гость", created: Date.now() };
}

export function setProfileName(name: string): Profile {
  renameCurrent(name);
  const p = getProfile();
  const lb = read<LBRow[]>(K.lb, []);
  const row = lb.find((r) => r.id === p.id);
  if (row) {
    row.username = p.username;
    write(K.lb, lb);
  }
  return p;
}

// ── wallet ──

export function getWallet(): Wallet {
  return read<Wallet>(uk("wallet"), { coins: 0, rubles: 0, payouts: [] });
}

export function addCoins(n: number) {
  const w = getWallet();
  w.coins += n;
  write(uk("wallet"), w);
}

export function addRubles(n: number) {
  const w = getWallet();
  w.rubles = Math.round((w.rubles + n) * 100) / 100;
  write(uk("wallet"), w);
}

/** exchange ALL coins → rubles at coinRate : 1 */
export function exchangeCoins(): number {
  const w = getWallet();
  if (w.coins <= 0) return 0;
  const { coinRate } = getSettings();
  const gained = w.coins / coinRate;
  w.rubles = Math.round((w.rubles + gained) * 100) / 100;
  w.coins = 0;
  write(uk("wallet"), w);
  return gained;
}

export function withdrawRubles(): { ok: boolean; amount: number; need?: number; guest?: boolean } {
  if (isGuest()) return { ok: false, amount: 0, guest: true };
  const w = getWallet();
  const { minWithdraw } = getSettings();
  if (w.rubles < minWithdraw) return { ok: false, amount: 0, need: minWithdraw };
  const amount = w.rubles;
  w.payouts.unshift({ amount, date: Date.now() });
  w.rubles = 0;
  write(uk("wallet"), w);
  return { ok: true, amount };
}

// ── inventory / shop ──

export function getInventory(): Inventory {
  return read<Inventory>(uk("inventory"), {
    skins: ["slime"],
    bgs: ["night"],
    skin: "slime",
    bg: "night",
  });
}

export function getEquippedSkin(): Skin {
  return findSkin(getInventory().skin);
}

export function getEquippedBackground(): Background {
  return findBackground(getInventory().bg);
}

export function buySkin(id: string): "ok" | "owned" | "poor" {
  const inv = getInventory();
  if (inv.skins.includes(id)) return "owned";
  const w = getWallet();
  if (w.coins < findSkin(id).price) return "poor";
  w.coins -= findSkin(id).price;
  write(uk("wallet"), w);
  inv.skins.push(id);
  inv.skin = id;
  write(uk("inventory"), inv);
  return "ok";
}

export function buyBackground(id: string): "ok" | "owned" | "poor" {
  const inv = getInventory();
  if (inv.bgs.includes(id)) return "owned";
  const w = getWallet();
  if (w.coins < findBackground(id).price) return "poor";
  w.coins -= findBackground(id).price;
  write(uk("wallet"), w);
  inv.bgs.push(id);
  inv.bg = id;
  write(uk("inventory"), inv);
  return "ok";
}

export function equipSkin(id: string) {
  const inv = getInventory();
  if (!inv.skins.includes(id)) return;
  inv.skin = id;
  write(uk("inventory"), inv);
}

export function equipBackground(id: string) {
  const inv = getInventory();
  if (!inv.bgs.includes(id)) return;
  inv.bg = id;
  write(uk("inventory"), inv);
}

// ── settings (admin) ──

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(K.settings, {}) };
}

export function saveSettings(s: Settings) {
  write(K.settings, s);
}

// ── admin auth ───────────────────────────────────────────────────────
// Пароль НЕ хранится в открытом виде: сохраняется только SHA-256(соль + пароль).
// Есть защита от перебора: блокировка после 5 неудачных попыток.
// ВАЖНО: клиентская защита ограничена. Для продакшена проверку пароля
// нужно делать на сервере (ADMIN_PASSWORD в переменных окружения).

export const DEFAULT_ADMIN_PASSWORD = "admin123";
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

interface AdminAuth {
  salt: string;
  hash: string;
}

function randomSalt(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** true, если владелец ещё не менял пароль по умолчанию */
export function isDefaultAdminPassword(): boolean {
  return read<AdminAuth | null>(K.adminpass, null) === null;
}

export async function verifyAdminPassword(pass: string): Promise<boolean> {
  const stored = read<AdminAuth | null>(K.adminpass, null);
  if (!stored) return pass === DEFAULT_ADMIN_PASSWORD;
  return (await sha256(stored.salt + pass)) === stored.hash;
}

/** Сменить пароль. Требуется текущий пароль. */
export async function changeAdminPassword(
  current: string,
  next: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await verifyAdminPassword(current)))
    return { ok: false, error: "Текущий пароль неверный" };
  if (next.trim().length < 8)
    return { ok: false, error: "Минимум 8 символов" };
  if (next.trim() === DEFAULT_ADMIN_PASSWORD)
    return { ok: false, error: "Нельзя оставлять пароль по умолчанию" };
  const salt = randomSalt();
  write(K.adminpass, { salt, hash: await sha256(salt + next.trim()) });
  return { ok: true };
}

// ── защита от перебора ──

interface Lockout {
  fails: number;
  until: number;
}

function getLockout(): Lockout {
  return read<Lockout>(K.adminlock, { fails: 0, until: 0 });
}

/** Сколько секунд осталось до разблокировки (0 = можно пробовать) */
export function getLockRemaining(): number {
  const l = getLockout();
  return Math.max(0, Math.ceil((l.until - Date.now()) / 1000));
}

export function getFailsLeft(): number {
  return Math.max(0, MAX_ATTEMPTS - getLockout().fails);
}

export function registerAdminFail(): number {
  const l = getLockout();
  l.fails += 1;
  if (l.fails >= MAX_ATTEMPTS) {
    l.until = Date.now() + LOCK_MS;
    l.fails = 0;
  }
  write(K.adminlock, l);
  return getLockRemaining();
}

export function resetAdminFails() {
  write(K.adminlock, { fails: 0, until: 0 });
}

// ── сессия админа (истекает через 30 минут) ──

const SESSION_TTL = 30 * 60_000;

export function setAdminSession(ok: boolean) {
  try {
    if (ok) sessionStorage.setItem(K.adminsession, String(Date.now() + SESSION_TTL));
    else sessionStorage.removeItem(K.adminsession);
  } catch {
    /* noop */
  }
}

export function hasAdminSession(): boolean {
  try {
    const until = Number(sessionStorage.getItem(K.adminsession) || 0);
    if (!until) return false;
    if (Date.now() > until) {
      sessionStorage.removeItem(K.adminsession);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ── stats & ad accounting ──

/** Глобальная статистика проекта (для админ-панели) */
export function getStats(): Stats {
  return read<Stats>(K.gstats, {
    runs: 0,
    ads: 0,
    revenue: 0,
    paidToPlayers: 0,
    lifetimeCoins: 0,
  });
}

/** Личная статистика игрока */
export function getUserStats(): { runs: number; lifetimeCoins: number } {
  return read<{ runs: number; lifetimeCoins: number }>(uk("stats"), {
    runs: 0,
    lifetimeCoins: 0,
  });
}

/** an ad view happened → revenue + player share credit (returns the share) */
export function recordAd(): number {
  const { cpm, share } = getSettings();
  const st = getStats();
  const gross = cpm / 1000;
  const playerCut = Math.round(((gross * share) / 100) * 100) / 100;
  st.ads += 1;
  st.revenue = Math.round((st.revenue + gross) * 100) / 100;
  st.paidToPlayers = Math.round((st.paidToPlayers + playerCut) * 100) / 100;
  write(K.gstats, st);
  addRubles(playerCut);
  return playerCut;
}

// ── runs & leaderboard ──

/** snapshot of the original server leaderboard (demo seed) */
const SEED_LB: LBRow[] = [
  { id: "seed-berserk61", username: "berserk61", bestScore: 1379, totalEarned: 1.38 },
  { id: "seed-dmitriev", username: "dmitriev23071995", bestScore: 1124, totalEarned: 0.06 },
  { id: "seed-dimon", username: "dimon23071995", bestScore: 481, totalEarned: 0.06 },
  { id: "seed-dimon2", username: "dimon19950723", bestScore: 0, totalEarned: 0 },
];

export function getBestScore(): number {
  return read<number>(uk("best"), 0);
}

export function recordRun(scoreM: number, coins: number) {
  // личная статистика
  const us = getUserStats();
  us.runs += 1;
  us.lifetimeCoins += coins;
  write(uk("stats"), us);
  if (coins > 0) addCoins(coins);
  if (scoreM > getBestScore()) write(uk("best"), scoreM);

  // глобальный счётчик забегов
  const gs = getStats();
  gs.runs += 1;
  gs.lifetimeCoins += coins;
  write(K.gstats, gs);

  // лидерборд
  const p = getProfile();
  const lb = read<LBRow[]>(K.lb, []);
  let row = lb.find((r) => r.id === p.id);
  if (!row) {
    row = { id: p.id, username: p.username, bestScore: 0, totalEarned: 0 };
    lb.push(row);
  }
  if (scoreM > row.bestScore) row.bestScore = scoreM;
  row.totalEarned = Math.round((us.lifetimeCoins / getSettings().coinRate) * 100) / 100;
  row.username = p.username;
  write(K.lb, lb);
}

export function getLeaderboard(): { byScore: LBRow[]; byEarn: LBRow[] } {
  const merged = [...read<LBRow[]>(K.lb, []), ...SEED_LB];
  const byScore = [...merged].sort((a, b) => b.bestScore - a.bestScore).slice(0, 20);
  const byEarn = [...merged].sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 20);
  return { byScore, byEarn };
}

export function resetAll() {
  try {
    // все данные проекта, включая аккаунты и их прогресс
    Object.keys(localStorage)
      .filter((k) => k.startsWith("neonjump:") || k.startsWith("neon-jump:"))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem(K.adminsession);
  } catch {
    /* noop */
  }
}

// ── mute (session-wide, persisted) ──

export function getMutedPref(): boolean {
  try {
    return localStorage.getItem("neon-jump:muted") === "1";
  } catch {
    return false;
  }
}

export function setMutedPref(m: boolean) {
  try {
    localStorage.setItem("neon-jump:muted", m ? "1" : "0");
  } catch {
    /* noop */
  }
}
