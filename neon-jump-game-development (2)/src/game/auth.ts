// ── Neon Jump · аккаунты игроков ─────────────────────────────────────
// Локальная реализация (демо): пароли хранятся как SHA-256 + соль.
// Для продакшена эти функции заменяются вызовами к серверу — структура
// данных та же (id / username / created), поэтому миграция безболезненна.

export interface Account {
  id: string;
  username: string;
  salt: string;
  hash: string;
  created: number;
  guest: boolean;
}

export interface PublicAccount {
  id: string;
  username: string;
  created: number;
  guest: boolean;
}

const K_USERS = "neonjump:accounts";
const K_SESSION = "neonjump:session";

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

function newId(prefix: string): string {
  return prefix + "-" + Math.random().toString(36).slice(2, 9).toUpperCase();
}

function all(): Account[] {
  return read<Account[]>(K_USERS, []);
}

function saveAll(list: Account[]) {
  write(K_USERS, list);
}

function toPublic(a: Account): PublicAccount {
  return { id: a.id, username: a.username, created: a.created, guest: a.guest };
}

// ── сессия ──────────────────────────────────────────────────────────

export function getCurrentId(): string | null {
  try {
    return localStorage.getItem(K_SESSION);
  } catch {
    return null;
  }
}

function setSession(id: string | null) {
  try {
    if (id) localStorage.setItem(K_SESSION, id);
    else localStorage.removeItem(K_SESSION);
  } catch {
    /* noop */
  }
}

export function getCurrentAccount(): PublicAccount | null {
  const id = getCurrentId();
  if (!id) return null;
  const acc = all().find((a) => a.id === id);
  return acc ? toPublic(acc) : null;
}

export function isGuest(): boolean {
  return getCurrentAccount()?.guest ?? false;
}

export function isLoggedIn(): boolean {
  const a = getCurrentAccount();
  return !!a && !a.guest;
}

/** Создаёт и активирует гостевой аккаунт (играть без регистрации). */
export function startGuest(): PublicAccount {
  const existing = all().find((a) => a.guest);
  if (existing) {
    setSession(existing.id);
    return toPublic(existing);
  }
  const acc: Account = {
    id: newId("guest"),
    username: "Гость-" + Math.floor(1000 + Math.random() * 9000),
    salt: "",
    hash: "",
    created: Date.now(),
    guest: true,
  };
  saveAll([...all(), acc]);
  setSession(acc.id);
  return toPublic(acc);
}

// ── регистрация / вход ──────────────────────────────────────────────

export function validateUsername(name: string): string | null {
  const n = name.trim();
  if (n.length < 3) return "Логин: минимум 3 символа";
  if (n.length > 18) return "Логин: максимум 18 символов";
  if (!/^[a-zA-Zа-яА-Я0-9_.-]+$/.test(n))
    return "Только буквы, цифры, точка, дефис и _";
  if (all().some((a) => !a.guest && a.username.toLowerCase() === n.toLowerCase()))
    return "Такой логин уже занят";
  return null;
}

export function validatePassword(pass: string): string | null {
  if (pass.length < 6) return "Пароль: минимум 6 символов";
  if (pass.length > 64) return "Пароль слишком длинный";
  return null;
}

export async function register(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string; account?: PublicAccount; previousId?: string }> {
  const nameErr = validateUsername(username);
  if (nameErr) return { ok: false, error: nameErr };
  const passErr = validatePassword(password);
  if (passErr) return { ok: false, error: passErr };

  const previousId = getCurrentId() ?? undefined;
  const salt = randomSalt();
  const acc: Account = {
    id: newId("NJ"),
    username: username.trim(),
    salt,
    hash: await sha256(salt + password),
    created: Date.now(),
    guest: false,
  };
  saveAll([...all(), acc]);
  setSession(acc.id);
  return { ok: true, account: toPublic(acc), previousId };
}

export async function login(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string; account?: PublicAccount }> {
  const acc = all().find(
    (a) => !a.guest && a.username.toLowerCase() === username.trim().toLowerCase()
  );
  if (!acc) return { ok: false, error: "Аккаунт не найден" };
  if ((await sha256(acc.salt + password)) !== acc.hash)
    return { ok: false, error: "Неверный пароль" };
  setSession(acc.id);
  return { ok: true, account: toPublic(acc) };
}

export function logout() {
  setSession(null);
}

export async function changePassword(
  current: string,
  next: string
): Promise<{ ok: boolean; error?: string }> {
  const id = getCurrentId();
  const list = all();
  const acc = list.find((a) => a.id === id);
  if (!acc || acc.guest) return { ok: false, error: "Недоступно для гостя" };
  if ((await sha256(acc.salt + current)) !== acc.hash)
    return { ok: false, error: "Текущий пароль неверный" };
  const passErr = validatePassword(next);
  if (passErr) return { ok: false, error: passErr };
  acc.salt = randomSalt();
  acc.hash = await sha256(acc.salt + next);
  saveAll(list);
  return { ok: true };
}

export function renameCurrent(name: string): { ok: boolean; error?: string } {
  const id = getCurrentId();
  const list = all();
  const acc = list.find((a) => a.id === id);
  if (!acc) return { ok: false, error: "Нет активного аккаунта" };
  const n = name.trim();
  if (n.length < 3) return { ok: false, error: "Минимум 3 символа" };
  if (
    list.some((a) => a.id !== acc.id && !a.guest && a.username.toLowerCase() === n.toLowerCase())
  )
    return { ok: false, error: "Имя занято" };
  acc.username = n.slice(0, 18);
  saveAll(list);
  return { ok: true };
}

/** Удаляет гостевой аккаунт после переноса прогресса в постоянный. */
export function dropGuest(id: string) {
  saveAll(all().filter((a) => !(a.id === id && a.guest)));
}

export function hasAnyAccount(): boolean {
  return all().some((a) => !a.guest);
}
