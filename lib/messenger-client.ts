const BASE_URL = "https://botapi.messenger.yandex.net/bot/v1/messages";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;

export interface MessengerResponse {
  ok: boolean;
  message_id?: number;
  description?: string;
  statusCode?: number;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `OAuth ${token}` };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function parseResponse(res: Response): Promise<MessengerResponse> {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return { ...json, statusCode: res.status };
  } catch {
    return {
      ok: false,
      statusCode: res.status,
      description: `HTTP ${res.status}: ${text.slice(0, 200)}`,
    };
  }
}

async function requestWithRetry(
  url: string,
  init: RequestInit
): Promise<MessengerResponse> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: timeout });

      if (res.ok) {
        return parseResponse(res);
      }

      // Retry on 429 / 5xx
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * 2 ** attempt;
        await sleep(delay);
        continue;
      }

      return parseResponse(res);
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * 2 ** attempt;
        await sleep(delay);
        continue;
      }
      return {
        ok: false,
        statusCode: 0,
        description: `Сетевая ошибка после ${MAX_RETRIES + 1} попыток: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return { ok: false, statusCode: 0, description: "Превышено число попыток" };
}

export async function sendText(
  token: string,
  chatId: string,
  text: string,
  threadId?: number
): Promise<MessengerResponse> {
  const payload: Record<string, unknown> = { chat_id: chatId, text };
  if (threadId != null) payload.thread_id = threadId;

  return requestWithRetry(`${BASE_URL}/sendText`, {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function sendImage(
  token: string,
  chatId: string,
  data: ArrayBuffer,
  fileName: string,
  mimeType: string = "image/jpeg",
  threadId?: number
): Promise<MessengerResponse> {
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("image", new Blob([data], { type: mimeType }), fileName);
  if (threadId != null) form.append("thread_id", String(threadId));

  return requestWithRetry(`${BASE_URL}/sendImage`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
}

export async function sendFile(
  token: string,
  chatId: string,
  data: ArrayBuffer,
  fileName: string,
  mimeType: string,
  threadId?: number
): Promise<MessengerResponse> {
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("document", new Blob([data], { type: mimeType }), fileName);
  if (threadId != null) form.append("thread_id", String(threadId));

  return requestWithRetry(`${BASE_URL}/sendFile`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
}
