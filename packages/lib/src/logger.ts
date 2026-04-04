type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  tenant?: string;
  userId?: string;
  [key: string]: unknown;
}

function log(entry: LogEntry) {
  const output = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  switch (entry.level) {
    case "error":
      console.error(JSON.stringify(output));
      break;
    case "warn":
      console.warn(JSON.stringify(output));
      break;
    case "debug":
      console.debug(JSON.stringify(output));
      break;
    default:
      console.log(JSON.stringify(output));
  }
}

export const logger = {
  debug: (message: string, meta?: Omit<LogEntry, "level" | "message">) =>
    log({ level: "debug", message, ...meta }),
  info: (message: string, meta?: Omit<LogEntry, "level" | "message">) =>
    log({ level: "info", message, ...meta }),
  warn: (message: string, meta?: Omit<LogEntry, "level" | "message">) =>
    log({ level: "warn", message, ...meta }),
  error: (message: string, meta?: Omit<LogEntry, "level" | "message">) =>
    log({ level: "error", message, ...meta }),
};
