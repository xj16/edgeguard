export type LogLevel = "debug" | "info" | "warn" | "error";

type Logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => void;
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, fields?: Record<string, unknown>) => void;
};

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createLogger(level: LogLevel): Logger {
  const threshold = LEVELS[level] ?? LEVELS.info;

  const emit = (lvl: LogLevel, msg: string, fields: Record<string, unknown> = {}) => {
    if (LEVELS[lvl] < threshold) return;

    const line = {
      ts: new Date().toISOString(),
      level: lvl,
      msg,
      ...fields,
    };
    // Structured JSON log
    // deno-lint-ignore no-console
    console.log(JSON.stringify(line));
  };

  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
  };
}
