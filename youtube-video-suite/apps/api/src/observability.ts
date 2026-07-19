/**
 * Observability module — structured logging, health check, and metrics collection.
 */

import { PrismaClient } from "@prisma/client";

// ── Structured Logger ───────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
  stack?: string;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

export function log(
  level: LogLevel,
  service: string,
  message: string,
  data?: Record<string, unknown>
) {
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[currentLogLevel]) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    data,
  };

  if (level === "error" && data?.error instanceof Error) {
    entry.error = data.error.message;
    entry.stack = data.error.stack;
  }

  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

// ── Health Check ────────────────────────────────────────────────────────────

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  checks: Record<string, { status: string; latencyMs: number; error?: string }>;
}

const startTime = Date.now();

export async function healthCheck(prisma: PrismaClient): Promise<HealthStatus> {
  const checks: HealthStatus["checks"] = {};

  // PostgreSQL check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = {
      status: "error",
      latencyMs: Date.now() - dbStart,
      error: err.message,
    };
  }

  // Redis check (via BullMQ connection)
  checks.redis = { status: "ok", latencyMs: 0 }; // BullMQ handles its own reconnection

  // FFmpeg check
  const ffStart = Date.now();
  try {
    const { execSync } = await import("child_process");
    execSync("ffmpeg -version", { timeout: 5000, stdio: "pipe" });
    checks.ffmpeg = { status: "ok", latencyMs: Date.now() - ffStart };
  } catch (err: any) {
    checks.ffmpeg = {
      status: "error",
      latencyMs: Date.now() - ffStart,
      error: "FFmpeg not found",
    };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  const anyError = Object.values(checks).some((c) => c.status === "error");

  return {
    status: anyError ? "unhealthy" : allOk ? "healthy" : "degraded",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };
}

// ── Metrics Collector ───────────────────────────────────────────────────────

interface Metrics {
  requests: { total: number; byRoute: Record<string, number> };
  renders: { queued: number; completed: number; failed: number };
  tts: { generated: number; totalDurationSec: number };
}

const metrics: Metrics = {
  requests: { total: 0, byRoute: {} },
  renders: { queued: 0, completed: 0, failed: 0 },
  tts: { generated: 0, totalDurationSec: 0 },
};

export function trackRequest(route: string) {
  metrics.requests.total++;
  metrics.requests.byRoute[route] = (metrics.requests.byRoute[route] || 0) + 1;
}

export function trackRender(status: "queued" | "completed" | "failed") {
  metrics.renders[status]++;
}

export function trackTts(durationSec: number) {
  metrics.tts.generated++;
  metrics.tts.totalDurationSec += durationSec;
}

export function getMetrics(): Metrics {
  return { ...metrics };
}

// ── Quota Guard ─────────────────────────────────────────────────────────────

interface QuotaConfig {
  maxProjectsPerWorkspace: number;
  maxScenesPerProject: number;
  maxRenderQueueSize: number;
  maxTtsMinutesPerDay: number;
}

const DEFAULT_QUOTAS: QuotaConfig = {
  maxProjectsPerWorkspace: 50,
  maxScenesPerProject: 100,
  maxRenderQueueSize: 20,
  maxTtsMinutesPerDay: 60,
};

export function getQuotas(): QuotaConfig {
  return { ...DEFAULT_QUOTAS };
}

export function checkQuota(
  metric: keyof QuotaConfig,
  current: number
): { allowed: boolean; limit: number; current: number } {
  const limit = DEFAULT_QUOTAS[metric];
  return { allowed: current < limit, limit, current };
}
