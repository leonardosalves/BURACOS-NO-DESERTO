export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "ai" | "render";
  source: string;
  message: string;
  details?: any;
}

const MAX_LOGS = 300;
const logBuffer: LogEntry[] = [
  {
    id: "init-1",
    timestamp: new Date().toISOString(),
    level: "info",
    source: "System",
    message: "Central de Logs e Monitor de Processos inicializado.",
  },
];

export function pushLog(
  level: LogEntry["level"],
  source: string,
  message: string,
  details?: any
) {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    details,
  };
  logBuffer.unshift(entry);
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.pop();
  }
  return entry;
}

export function getLogs(limit = 100, levelFilter?: string) {
  if (levelFilter) {
    return logBuffer.filter((l) => l.level === levelFilter).slice(0, limit);
  }
  return logBuffer.slice(0, limit);
}

export function clearLogs() {
  logBuffer.length = 0;
}
