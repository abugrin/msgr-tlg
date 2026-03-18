import JSZip from "jszip";

export interface TelegramTextEntity {
  type: string;
  text: string;
  user_id?: number;
}

export interface TelegramMessage {
  id: number;
  type: "service" | "message";
  date: string;
  date_unixtime: string;
  from?: string;
  from_id?: string;
  text: string | (string | TelegramTextEntity)[];
  text_entities: TelegramTextEntity[];
  // Media
  photo?: string;
  file?: string;
  file_name?: string;
  mime_type?: string;
  // Reply
  reply_to_message_id?: number;
  // Edited
  edited?: string;
  // Service
  actor?: string;
  action?: string;
}

export interface TelegramExport {
  name: string;
  type: string;
  id: number;
  messages: TelegramMessage[];
}

export interface ParsedMessage {
  id: number;
  date: string;
  sender: string;
  text: string;
  mediaPath: string | null;
  mediaType: "image" | "file" | null;
  mediaFileName: string | null;
  mediaMimeType: string | null;
}

export interface ParsedExport {
  chatName: string;
  messages: ParsedMessage[];
  zip: JSZip;
}

/**
 * Flatten the Telegram `text` field (which can be a plain string or
 * an array of strings / entity objects) into a single string.
 */
function flattenText(text: TelegramMessage["text"]): string {
  if (typeof text === "string") return text;

  return text
    .map((part) => (typeof part === "string" ? part : part.text))
    .join("");
}

function formatDate(iso: string): string {
  // "2025-10-28T17:19:47" -> "28.10.2025 17:19"
  const [datePart, timePart] = iso.split("T");
  const [y, m, d] = datePart.split("-");
  const hhmm = timePart.slice(0, 5);
  return `${d}.${m}.${y} ${hhmm}`;
}

/**
 * Try to find a file in the ZIP by raw path, then with basePath prefix.
 */
function findInZip(zip: JSZip, rawPath: string, basePath: string): string | null {
  if (zip.file(rawPath)) return rawPath;
  if (basePath) {
    const full = basePath + rawPath;
    if (zip.file(full)) return full;
  }
  return null;
}

/**
 * Determine media info from a raw Telegram message.
 * Photos use the sendImage endpoint; everything else uses sendFile.
 */
function resolveMedia(
  msg: TelegramMessage,
  zip: JSZip,
  basePath: string
): Pick<ParsedMessage, "mediaPath" | "mediaType" | "mediaFileName" | "mediaMimeType"> {
  if (msg.photo) {
    const resolved = findInZip(zip, msg.photo, basePath);
    if (resolved) {
      const ext = msg.photo.split(".").pop()?.toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      return {
        mediaPath: resolved,
        mediaType: "image",
        mediaFileName: msg.photo.split("/").pop() ?? null,
        mediaMimeType: mime,
      };
    }
  }

  if (msg.file) {
    const resolved = findInZip(zip, msg.file, basePath);
    if (resolved) {
      const isImage = msg.mime_type?.startsWith("image/");
      return {
        mediaPath: resolved,
        mediaType: isImage ? "image" : "file",
        mediaFileName: msg.file_name ?? msg.file.split("/").pop() ?? null,
        mediaMimeType: msg.mime_type ?? "application/octet-stream",
      };
    }
  }

  return { mediaPath: null, mediaType: null, mediaFileName: null, mediaMimeType: null };
}

/**
 * Extract a Telegram export ZIP and return parsed messages
 * ready for sending to Yandex Messenger.
 */
export async function parseTelegramExport(
  zipBuffer: ArrayBuffer
): Promise<ParsedExport> {
  const zip = await JSZip.loadAsync(zipBuffer);

  // Locate result.json — it may be at the root or inside a subfolder
  let resultFile: JSZip.JSZipObject | null = null;
  zip.forEach((relativePath, file) => {
    if (relativePath.endsWith("result.json") && !resultFile) {
      resultFile = file;
    }
  });

  if (!resultFile) {
    throw new Error("result.json не найден в ZIP-архиве");
  }

  const jsonText = await (resultFile as JSZip.JSZipObject).async("text");
  const data: TelegramExport = JSON.parse(jsonText);

  // Resolve the base path for media (result.json may be in a subfolder)
  const resultPath = (resultFile as JSZip.JSZipObject).name;
  const basePath = resultPath.includes("/")
    ? resultPath.substring(0, resultPath.lastIndexOf("/") + 1)
    : "";

  const messages: ParsedMessage[] = [];

  for (const msg of data.messages) {
    if (msg.type === "service") continue;

    const text = flattenText(msg.text);
    const sender = msg.from ?? "Unknown";
    const date = formatDate(msg.date);

    const media = resolveMedia(msg, zip, basePath);

    messages.push({
      id: msg.id,
      date,
      sender,
      text,
      ...media,
    });
  }

  return {
    chatName: data.name,
    messages,
    zip,
  };
}

/**
 * Read a media file from the ZIP as an ArrayBuffer.
 */
export async function readMediaFromZip(
  zip: JSZip,
  path: string
): Promise<ArrayBuffer> {
  const file = zip.file(path);
  if (!file) {
    throw new Error(`Медиафайл не найден в архиве: ${path}`);
  }
  return file.async("arraybuffer");
}
