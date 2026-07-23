/**
 * Crawl4AI adapter for enriching discovered web sources with page content.
 * URL discovery remains the responsibility of Agent Reach/Exa.
 */

import { SAFETY_LIMITS } from "./researchConfig.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DEFAULT_BASE_URL = "http://127.0.0.1:11235";
const availabilityCache = new Map();
const LOCAL_CONFIG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
  ".lumiera-crawl4ai.json"
);

function readLocalConfig() {
  try {
    const raw = fs
      .readFileSync(LOCAL_CONFIG_PATH, "utf8")
      .replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function envInt(name, fallback) {
  const parsed = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isEnabled() {
  return !/^(0|false|no|off)$/i.test(
    String(process.env.CRAWL4AI_ENABLED ?? "true").trim()
  );
}

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, "");
}

function authHeaders() {
  const token = String(
    process.env.CRAWL4AI_API_TOKEN || readLocalConfig().apiToken || ""
  ).trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function markdownText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return String(
    value.fit_markdown ||
      value.fitMarkdown ||
      value.raw_markdown ||
      value.rawMarkdown ||
      ""
  );
}

function unwrapResults(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (payload?.result && typeof payload.result === "object") {
    return [payload.result];
  }
  return [];
}

async function fetchJson(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error(`Crawl4AI HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function probeAvailability(fetchImpl, baseUrl) {
  const cacheTtlMs = envInt("CRAWL4AI_HEALTH_CACHE_MS", 60_000);
  const cached = availabilityCache.get(baseUrl);
  if (cached && Date.now() - cached.checkedAt < cacheTtlMs) {
    return cached.available;
  }

  try {
    await fetchJson(
      fetchImpl,
      `${baseUrl}/health`,
      { method: "GET", headers: authHeaders() },
      envInt("CRAWL4AI_HEALTH_TIMEOUT_MS", 1_200)
    );
    availabilityCache.set(baseUrl, { available: true, checkedAt: Date.now() });
    return true;
  } catch {
    availabilityCache.set(baseUrl, { available: false, checkedAt: Date.now() });
    return false;
  }
}

async function pollTask(fetchImpl, baseUrl, taskId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const pollMs = Math.max(100, envInt("CRAWL4AI_POLL_MS", 500));

  while (Date.now() < deadline) {
    const payload = await fetchJson(
      fetchImpl,
      `${baseUrl}/task/${encodeURIComponent(taskId)}`,
      { method: "GET", headers: authHeaders() },
      Math.min(5_000, Math.max(500, deadline - Date.now()))
    );
    const status = String(payload?.status || "").toLowerCase();
    if (["completed", "complete", "success", "succeeded"].includes(status)) {
      return payload;
    }
    if (["failed", "error", "cancelled", "canceled"].includes(status)) {
      throw new Error(payload?.error || `Crawl4AI task ${status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error("Crawl4AI task timeout");
}

function normalizeCrawlResults(payload, requestedUrls) {
  const maxExcerptChars = envInt("CRAWL4AI_MAX_EXCERPT_CHARS", 3_000);
  const results = unwrapResults(payload);

  return results
    .map((result, index) => {
      if (result?.success === false) return null;
      const url = safeHttpUrl(
        result?.url || result?.redirected_url || requestedUrls[index]
      );
      const markdown = markdownText(result?.markdown).trim();
      if (!url || !markdown) return null;
      const metadata = result?.metadata || {};
      return {
        title: String(metadata.title || result?.title || url)
          .trim()
          .slice(0, SAFETY_LIMITS.maxTitleLength),
        url: url.slice(0, SAFETY_LIMITS.maxUrlLength),
        excerpt: markdown.slice(0, maxExcerptChars),
        provider: "crawl4ai",
        crawled: true,
      };
    })
    .filter(Boolean);
}

/**
 * Crawls URLs already discovered by a search provider.
 * Returns an unavailable result on any operational failure so callers can fall back.
 */
export async function crawlDiscoveredSources(
  sources = [],
  { fetchImpl = globalThis.fetch, skipHealthCheck = false } = {}
) {
  if (!isEnabled()) {
    return { available: false, sources: [], summary: "", message: "disabled" };
  }
  if (typeof fetchImpl !== "function") {
    return {
      available: false,
      sources: [],
      summary: "",
      message: "fetch unavailable",
    };
  }

  const localConfig = readLocalConfig();
  const baseUrl = normalizeBaseUrl(
    process.env.CRAWL4AI_BASE_URL || localConfig.baseUrl
  );
  const maxPages = Math.max(1, Math.min(envInt("CRAWL4AI_MAX_PAGES", 6), 12));
  const urls = [
    ...new Set(
      sources.map((source) => safeHttpUrl(source?.url)).filter(Boolean)
    ),
  ].slice(0, maxPages);
  if (!urls.length) {
    return { available: false, sources: [], summary: "", message: "no urls" };
  }

  try {
    if (!skipHealthCheck && !(await probeAvailability(fetchImpl, baseUrl))) {
      return {
        available: false,
        sources: [],
        summary: "",
        message: "service unavailable",
      };
    }

    const timeoutMs = envInt("CRAWL4AI_TIMEOUT_MS", 35_000);
    let payload = await fetchJson(
      fetchImpl,
      `${baseUrl}/crawl`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ urls, priority: 10 }),
      },
      timeoutMs
    );

    if (!unwrapResults(payload).length && payload?.task_id) {
      payload = await pollTask(fetchImpl, baseUrl, payload.task_id, timeoutMs);
    }

    const crawledSources = normalizeCrawlResults(payload, urls);
    const summary = crawledSources
      .map(
        (source) =>
          `Fonte: ${source.title}\nURL: ${source.url}\n${source.excerpt}`
      )
      .join("\n\n")
      .slice(0, envInt("CRAWL4AI_MAX_SUMMARY_CHARS", 8_000));

    return {
      available: crawledSources.length > 0,
      summary,
      sources: crawledSources,
      facts: [],
      angles: [],
      via: "crawl4ai",
      fallback: false,
    };
  } catch (error) {
    return {
      available: false,
      sources: [],
      summary: "",
      message:
        error?.name === "AbortError"
          ? "timeout"
          : error?.message || "crawl failed",
      via: "crawl4ai",
      fallback: true,
    };
  }
}

/** Enriches discovery sources while keeping their original ranking. */
export function mergeCrawlWithDiscovery(discovery = {}, crawl = {}) {
  if (!crawl?.available) return discovery;
  const crawledByUrl = new Map(
    (crawl.sources || []).map((source) => [source.url, source])
  );
  const sources = (discovery.sources || []).map((source) => ({
    ...source,
    ...(crawledByUrl.get(safeHttpUrl(source.url)) || {}),
  }));
  for (const source of crawl.sources || []) {
    if (
      !sources.some((item) => safeHttpUrl(item.url) === safeHttpUrl(source.url))
    ) {
      sources.push(source);
    }
  }

  return {
    ...discovery,
    available: Boolean(discovery.available || crawl.available),
    summary: [discovery.summary, crawl.summary]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 12_000),
    sources: sources.slice(0, 12),
    via: [discovery.via, crawl.via].filter(Boolean).join("+") || "crawl4ai",
  };
}

export function clearCrawl4aiAvailabilityCache() {
  availabilityCache.clear();
}
