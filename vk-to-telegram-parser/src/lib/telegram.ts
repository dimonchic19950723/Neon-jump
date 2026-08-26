const TELEGRAM_API_BASE = "https://api.telegram.org";

function getTelegramToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return token;
}

function getChatId() {
  const id = process.env.TELEGRAM_CHAT_ID;
  if (!id) throw new Error("TELEGRAM_CHAT_ID is not set");
  return id;
}

export async function sendMessage(text: string) {
  const token = getTelegramToken();
  const chat_id = getChatId();
  const payload = { chat_id, text: text.slice(0, 4096), parse_mode: "HTML", disable_web_page_preview: false };
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Telegram sendMessage failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function sendPhoto(url: string, caption?: string) {
  const token = getTelegramToken();
  const chat_id = getChatId();
  const payload = { chat_id, photo: url, caption: caption?.slice(0, 1024), parse_mode: "HTML" };
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Telegram sendPhoto failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function sendMediaGroup(photoUrls: string[], caption?: string) {
  const token = getTelegramToken();
  const chat_id = getChatId();
  const media = photoUrls.map((url, idx) => ({ type: "photo", media: url, caption: idx === 0 ? caption?.slice(0, 1024) : undefined, parse_mode: idx === 0 ? "HTML" : undefined }));
  const payload = { chat_id, media } as any;
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMediaGroup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Telegram sendMediaGroup failed: ${res.status} ${await res.text()}`);
  return res.json();
}
