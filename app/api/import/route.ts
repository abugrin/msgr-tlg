import { NextRequest } from "next/server";
import {
  parseTelegramExport,
  readMediaFromZip,
  type ParsedMessage,
} from "@/lib/telegram-parser";
import { sendText, sendImage, sendFile } from "@/lib/messenger-client";
import { RateLimiter } from "@/lib/rate-limiter";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ProgressEvent {
  type: "info" | "progress" | "error" | "done";
  message?: string;
  current?: number;
  total?: number;
  messageId?: number;
}

function formatMessageText(msg: ParsedMessage): string {
  const safeSender = msg.sender.replace(/\*/g, "\\*");
  return `**${safeSender}** - ${msg.date}\n\n${msg.text}`;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const token = formData.get("token") as string | null;
  const rawChatId = formData.get("chatId") as string | null;

  if (!file || !token || !rawChatId) {
    return Response.json(
      { error: "Необходимо указать файл, токен и ID чата" },
      { status: 400 }
    );
  }

  // Decode URL-encoded chat IDs (e.g. "0%2F0%2Fxxx" -> "0/0/xxx")
  const chatId = decodeURIComponent(rawChatId);

  const encoder = new TextEncoder();
  const limiter = new RateLimiter(50);
  const FALLBACK_RPS = 20;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        send({ type: "info", message: "Распаковка ZIP-архива..." });

        const zipBuffer = await file.arrayBuffer();
        const { chatName, messages, zip } =
          await parseTelegramExport(zipBuffer);

        send({
          type: "info",
          message: `Чат: «${chatName}» — ${messages.length} сообщений для импорта`,
        });

        let sent = 0;
        let errors = 0;
        let fallbackLogged = false;
        const total = messages.length;
        const FATAL_CODES = new Set([401, 403, 404]);

        outer: for (const msg of messages) {
          const hasText = msg.text.trim().length > 0;
          const hasMedia = msg.mediaPath !== null;

          if (hasText) {
            try {
              await limiter.wait();
              const textPayload = formatMessageText(msg);
              const res = await sendText(token, chatId, textPayload);
              if (!res.ok) {
                errors++;
                if (res.statusCode && FATAL_CODES.has(res.statusCode)) {
                  send({
                    type: "error",
                    message: `Остановка: ${res.statusCode} — ${res.description}`,
                  });
                  break outer;
                }
                if (res.statusCode === 429 && !fallbackLogged) {
                  limiter.setMaxRps(FALLBACK_RPS);
                  fallbackLogged = true;
                  send({ type: "info", message: `Лимит запросов: снижение до ${FALLBACK_RPS} RPS` });
                }
                send({
                  type: "error",
                  message: `[${msg.id}] Текст: ${res.statusCode ?? "?"} — ${res.description}`,
                  messageId: msg.id,
                });
              }
            } catch (err) {
              errors++;
              send({
                type: "error",
                message: `[${msg.id}] Текст: ${err instanceof Error ? err.message : String(err)}`,
                messageId: msg.id,
              });
            }
          }

          if (hasMedia && msg.mediaPath) {
            try {
              await limiter.wait();
              const mediaBuffer = await readMediaFromZip(zip, msg.mediaPath);

              const res =
                msg.mediaType === "image"
                  ? await sendImage(
                      token,
                      chatId,
                      mediaBuffer,
                      msg.mediaFileName ?? "image.jpg",
                      msg.mediaMimeType ?? "image/jpeg"
                    )
                  : await sendFile(
                      token,
                      chatId,
                      mediaBuffer,
                      msg.mediaFileName ?? "file",
                      msg.mediaMimeType ?? "application/octet-stream"
                    );

              if (!res.ok) {
                errors++;
                if (res.statusCode && FATAL_CODES.has(res.statusCode)) {
                  send({
                    type: "error",
                    message: `Остановка: ${res.statusCode} — ${res.description}`,
                  });
                  break outer;
                }
                if (res.statusCode === 429 && !fallbackLogged) {
                  limiter.setMaxRps(FALLBACK_RPS);
                  fallbackLogged = true;
                  send({ type: "info", message: `Лимит запросов: снижение до ${FALLBACK_RPS} RPS` });
                }
                const kind = msg.mediaType === "image" ? "Изображение" : "Файл";
                send({
                  type: "error",
                  message: `[${msg.id}] ${kind}: ${res.statusCode ?? "?"} — ${res.description}`,
                  messageId: msg.id,
                });
              }
            } catch (mediaErr) {
              errors++;
              send({
                type: "error",
                message: `[${msg.id}] Медиа: ${mediaErr instanceof Error ? mediaErr.message : String(mediaErr)}`,
                messageId: msg.id,
              });
            }
          }

          sent++;
          send({ type: "progress", current: sent, total });
        }

        const summary =
          errors > 0
            ? `Импорт завершён: ${sent} сообщений, ошибок: ${errors}`
            : `Импорт завершён: отправлено ${sent} сообщений`;
        send({ type: "done", message: summary });
      } catch (err) {
        send({
          type: "error",
          message: `Критическая ошибка: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
