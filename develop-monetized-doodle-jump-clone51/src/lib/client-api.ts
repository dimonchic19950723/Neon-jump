"use client";

// Единая точка сетевых запросов с максимально устойчивой сессией.
//
// Игра часто открыта во встроенном контексте (iframe превью, встраивание
// на сторонний сайт). Там браузер может блокировать и сторонние cookie,
// и localStorage. Поэтому токен хранится сразу в трёх местах:
//   1) в памяти модуля — работает всегда в пределах вкладки (включая
//      SPA-переходы между страницами), даже если хранилища запрещены;
//   2) в localStorage — переживает перезагрузку страницы;
//   3) в sessionStorage — запасной вариант, если localStorage закрыт.
// Плюс httpOnly-cookie как четвёртый канал на стороне сервера.

export const LS_TOKEN = "neonjump_token";
const LS_PENDING = "neonjump_pending";

// Основной канал: переживает блокировку хранилищ
let memoryToken: string | null = null;

function safeGet(store: "local" | "session", key: string): string | null {
  try {
    const s = store === "local" ? window.localStorage : window.sessionStorage;
    return s.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(store: "local" | "session", key: string, value: string) {
  try {
    const s = store === "local" ? window.localStorage : window.sessionStorage;
    s.setItem(key, value);
  } catch {
    /* хранилище заблокировано — не критично, есть память и cookie */
  }
}

function safeRemove(store: "local" | "session", key: string) {
  try {
    const s = store === "local" ? window.localStorage : window.sessionStorage;
    s.removeItem(key);
  } catch {
    /* noop */
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  if (memoryToken) return memoryToken;
  const fromLocal = safeGet("local", LS_TOKEN);
  if (fromLocal) {
    memoryToken = fromLocal;
    return fromLocal;
  }
  const fromSession = safeGet("session", LS_TOKEN);
  if (fromSession) {
    memoryToken = fromSession;
    return fromSession;
  }
  return null;
}

export function setToken(token: string) {
  memoryToken = token;
  safeSet("local", LS_TOKEN, token);
  safeSet("session", LS_TOKEN, token);
}

export function clearToken() {
  memoryToken = null;
  safeRemove("local", LS_TOKEN);
  safeRemove("session", LS_TOKEN);
}

// ---- Очередь несохранённого прогресса ----
// Если сервер был недоступен, прогресс не теряется: он копится здесь
// и досылается при первой успешной возможности.

export interface PendingProgress {
  coins: number;
  score: number;
}

let memoryPending: PendingProgress | null = null;

export function getPending(): PendingProgress | null {
  if (memoryPending) return memoryPending;
  const raw = safeGet("local", LS_PENDING) ?? safeGet("session", LS_PENDING);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as PendingProgress;
    if (typeof p.coins === "number" && typeof p.score === "number") {
      memoryPending = p;
      return p;
    }
  } catch {
    /* битые данные — игнорируем */
  }
  return null;
}

export function addPending(coins: number, score: number) {
  const cur = getPending();
  const next: PendingProgress = {
    coins: (cur?.coins ?? 0) + Math.max(0, coins),
    score: Math.max(cur?.score ?? 0, score),
  };
  memoryPending = next;
  const raw = JSON.stringify(next);
  safeSet("local", LS_PENDING, raw);
  safeSet("session", LS_PENDING, raw);
}

export function clearPending() {
  memoryPending = null;
  safeRemove("local", LS_PENDING);
  safeRemove("session", LS_PENDING);
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  /** true — сервер подтвердил, что сессии нет ни по токену, ни по cookie */
  unauthorized?: boolean;
  /** true — не удалось достучаться до сервера (сеть/перезапуск) */
  networkError?: boolean;
}

interface Options {
  method?: string;
  body?: unknown;
  /** число повторов при сетевом сбое */
  retries?: number;
}

export async function api<T = unknown>(
  path: string,
  { method = "GET", body, retries = 2 }: Options = {},
): Promise<ApiResult<T>> {
  const send = async (useToken: boolean): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const t = useToken ? getToken() : null;
    if (t) headers.Authorization = `Bearer ${t}`;
    return fetch(path, {
      method,
      headers,
      // cookie-канал сессии
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      let res = await send(true);

      // Токен мог устареть — пробуем чистую cookie-сессию
      if (res.status === 401 && getToken()) {
        const cookieRes = await send(false);
        if (cookieRes.ok) {
          clearToken();
          res = cookieRes;
        } else if (cookieRes.status === 401) {
          clearToken();
          return {
            ok: false,
            status: 401,
            data: null,
            unauthorized: true,
            error: "Не авторизован",
          };
        }
      }

      const text = await res.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        parsed = {};
      }

      // Сервер вернул свежий токен — сохраняем во все каналы
      if (typeof parsed.token === "string" && parsed.token) {
        setToken(parsed.token);
      }

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          data: null,
          unauthorized: res.status === 401,
          error: (parsed.error as string) || "Ошибка запроса",
        };
      }
      return { ok: true, status: res.status, data: parsed as T };
    } catch {
      // сеть моргнула / сервер перезапускается — повторяем
      if (attempt > retries) {
        return {
          ok: false,
          status: 0,
          data: null,
          networkError: true,
          error: "Нет связи с сервером",
        };
      }
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
}
