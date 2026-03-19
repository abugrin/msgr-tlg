"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type LogLevel = "info" | "warning" | "error" | "progress" | "done";

interface LogEntry {
  type: LogLevel;
  message?: string;
  current?: number;
  total?: number;
  timestamp: number;
}

const MAX_LOG_LINES = 50;

export default function ImportPage() {
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const addLog = useCallback((entry: Omit<LogEntry, "timestamp">) => {
    setLogs((prev) => {
      const next = [...prev, { ...entry, timestamp: Date.now() }];
      return next.slice(-MAX_LOG_LINES);
    });
  }, []);

  useEffect(() => {
    if (logs.length > 0) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !token || !chatId) return;

    setRunning(true);
    setDone(false);
    setLogs([]);
    setProgress(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("token", token);
    formData.append("chatId", chatId);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        addLog({ type: "error", message: `Ошибка сервера: ${res.status}` });
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "progress" && event.current != null && event.total != null) {
              setProgress({ current: event.current, total: event.total });
            }
            if (event.type !== "progress") {
              addLog(event);
            }
            if (event.type === "done") {
              setDone(true);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        addLog({ type: "error", message: `Ошибка сети: ${(err as Error).message}` });
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  const logLevelStyles: Record<LogLevel, string> = {
    error: "text-red-500 dark:text-red-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-gray-700 dark:text-gray-300",
    progress: "text-blue-600 dark:text-blue-400",
    done: "text-green-600 dark:text-green-400 font-semibold",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Импорт чата</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="file" className="block text-sm font-medium mb-1">
            ZIP-архив экспорта Telegram
          </label>
          <input
            id="file"
            type="file"
            accept=".zip"
            disabled={running}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md
                       file:border-0 file:text-sm file:font-medium
                       file:bg-blue-600 file:text-white hover:file:bg-blue-700
                       file:cursor-pointer file:disabled:opacity-50
                       cursor-pointer disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="token" className="block text-sm font-medium mb-1">
            OAuth-токен бота
          </label>
          <input
            id="token"
            type="password"
            value={token}
            disabled={running}
            onChange={(e) => setToken(e.target.value)}
            placeholder="y0_AgAAAA..."
            autoComplete="new-password"
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="chatId" className="block text-sm font-medium mb-1">
            ID чата
          </label>
          <input
            id="chatId"
            type="text"
            value={chatId}
            disabled={running}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="0/0/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       disabled:opacity-50"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={running || !file || !token || !chatId}
            className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? "Импорт..." : "Начать импорт"}
          </button>
          {running && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium
                         hover:bg-red-700"
            >
              Отменить
            </button>
          )}
        </div>
      </form>

      {progress && (
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-1">
            <span>
              {progress.current} / {progress.total} сообщений
            </span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {done && (
        <div className="mt-4 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          Импорт завершён.
        </div>
      )}

      {/* Log window - same page, below form */}
      <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400">
          Журнал
        </div>
        <div
          className="p-4 overflow-y-auto font-mono text-sm leading-relaxed bg-gray-50 dark:bg-gray-900/50"
          style={{ maxHeight: "320px" }}
        >
          {logs.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 py-4 text-center">
              {running ? "Ожидание событий..." : "Запустите импорт, чтобы увидеть журнал."}
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((entry, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${logLevelStyles[entry.type] ?? logLevelStyles.info}`}
                >
                  <span className="text-gray-500 shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span className="break-all">{entry.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
