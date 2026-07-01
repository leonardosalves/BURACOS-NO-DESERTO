/**
 * Agent Reach — busca na internet integrada ao Lumiera (sem terminal).
 * https://github.com/Panniantong/Agent-Reach
 */

import fs from "fs";
import path from "path";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { buildPythonSpawnEnv } from "./pythonEnv.js";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const AGENT_REACH_VENV = path.join(process.env.USERPROFILE || process.env.HOME || "", ".agent-reach-venv");
const AR_EXE = path.join(AGENT_REACH_VENV, "Scripts", "agent-reach.exe");
const AR_EXE_UNIX = path.join(AGENT_REACH_VENV, "bin", "agent-reach");

export const AGENT_REACH_PLATFORMS = [
  { id: "exa", label: "Web (Exa)", description: "Busca semântica — melhor para temas e pesquisa" },
  { id: "url", label: "Ler URL", description: "Extrai texto de qualquer página (Jina Reader)" },
  { id: "github", label: "GitHub", description: "Repositórios e código" },
  { id: "bilibili", label: "Bilibili", description: "Vídeos chineses (busca pública)" },
  { id: "rss", label: "RSS", description: "Feed Atom/RSS" },
];

function resolveAgentReachExe() {
  if (process.platform === "win32" && fs.existsSync(AR_EXE)) return AR_EXE;
  if (fs.existsSync(AR_EXE_UNIX)) return AR_EXE_UNIX;
  return process.platform === "win32" ? "agent-reach.exe" : "agent-reach";
}

function resolveMcporterConfig(workspaceDir) {
  const candidates = [
    workspaceDir ? path.join(workspaceDir, "config", "mcporter.json") : null,
    path.join(process.cwd(), "config", "mcporter.json"),
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveMcporterCmd() {
  const npmGlobal = path.join(process.env.APPDATA || "", "npm");
  const winCmd = path.join(npmGlobal, "mcporter.cmd");
  if (process.platform === "win32" && fs.existsSync(winCmd)) return winCmd;
  return process.platform === "win32" ? "mcporter.cmd" : "mcporter";
}

function quoteSpawnArg(value) {
  const text = String(value);
  if (!/[\s"]/g.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function buildAgentReachSpawnEnv() {
  const env = buildPythonSpawnEnv();
  const sep = process.platform === "win32" ? ";" : ":";
  const extraPaths = [
    path.join(process.env.APPDATA || "", "npm"),
    path.join(process.env.USERPROFILE || "", ".agent-reach-venv", "Scripts"),
    "C:\\Program Files\\nodejs",
    path.join(process.env.ProgramFiles || "", "nodejs"),
  ].filter((p) => p && fs.existsSync(p));
  for (const dir of extraPaths) {
    if (!env.PATH?.toLowerCase().includes(dir.toLowerCase())) {
      env.PATH = `${dir}${sep}${env.PATH || ""}`;
    }
  }
  return env;
}

async function runShellCommand(command, { timeout = 90000, maxBuffer = 4 * 1024 * 1024 } = {}) {
  const { stdout } = await execAsync(command, {
    timeout,
    maxBuffer,
    windowsHide: true,
    env: buildAgentReachSpawnEnv(),
    shell: true,
  });
  return String(stdout || "");
}

async function runCli(binary, args, { timeout = 90000, maxBuffer = 4 * 1024 * 1024 } = {}) {
  if (process.platform === "win32") {
    const command = [quoteSpawnArg(binary), ...args.map(quoteSpawnArg)].join(" ");
    return runShellCommand(command, { timeout, maxBuffer });
  }
  const { stdout } = await execFileAsync(binary, args, {
    timeout,
    maxBuffer,
    windowsHide: true,
    env: buildAgentReachSpawnEnv(),
  });
  return String(stdout || "");
}

function parseExaMcporterOutput(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return { summary: "", sources: [], items: [] };

  const blocks = raw.split(/\n(?=Title: )/);
  const items = [];
  const sources = [];

  for (const block of blocks) {
    const titleMatch = block.match(/^Title:\s*(.+)/m);
    const urlMatch = block.match(/^URL:\s*(.+)/m);
    const publishedMatch = block.match(/^Published:\s*(.+)/m);
    const highlightsIdx = block.indexOf("Highlights:");
    const highlights = highlightsIdx >= 0
      ? block.slice(highlightsIdx + "Highlights:".length).trim()
      : block.replace(/^Title:[\s\S]*?Author:[^\n]*\n?/m, "").trim();

    const title = titleMatch?.[1]?.trim() || "";
    const url = urlMatch?.[1]?.trim() || "";
    if (!title && !url && !highlights) continue;

    const item = {
      title: title || url,
      url,
      published: publishedMatch?.[1]?.trim() || "",
      snippet: highlights.slice(0, 1200),
    };
    items.push(item);
    if (url) sources.push({ title: item.title, url });
  }

  const summary = items.length
    ? items.map((it, i) => `${i + 1}. ${it.title}${it.snippet ? `\n${it.snippet.slice(0, 400)}` : ""}`).join("\n\n")
    : raw.slice(0, 10000);

  return { summary, sources, items };
}

export async function probeAgentReachStatus() {
  const exe = resolveAgentReachExe();
  const venvReady = fs.existsSync(path.join(AGENT_REACH_VENV, "Scripts", "python.exe"))
    || fs.existsSync(path.join(AGENT_REACH_VENV, "bin", "python"));

  let doctor = null;
  let doctorError = null;

  try {
    const stdout = await runCli(exe, ["doctor", "--json"], { timeout: 45000 });
    doctor = JSON.parse(stdout || "{}");
  } catch (err) {
    doctorError = err.message;
  }

  const platforms = doctor
    ? Object.entries(doctor).map(([id, row]) => ({
      id,
      name: row.name || id,
      status: row.status || "unknown",
      message: row.message || "",
      activeBackend: row.active_backend || null,
    }))
    : [];

  const readyCount = platforms.filter((p) => p.status === "ok").length;

  return {
    ok: true,
    venvReady,
    exe,
    doctor,
    platforms,
    readyCount,
    totalPlatforms: platforms.length,
    exaReady: doctor?.exa_search?.status === "ok",
    webReady: doctor?.web?.status === "ok",
    githubReady: doctor?.github?.status === "ok",
    doctorError,
    setupScript: "scripts/setup-agent-reach.ps1",
    repo: "https://github.com/Panniantong/Agent-Reach",
    fetchedAt: new Date().toISOString(),
  };
}

export async function exaWebSearch(query, workspaceDir, { numResults = 6 } = {}) {
  const q = String(query || "").trim();
  if (!q) return { available: false, summary: "", sources: [], message: "Query vazia", source: "exa" };

  const configPath = resolveMcporterConfig(workspaceDir);
  if (!configPath) {
    return {
      available: false,
      summary: "",
      sources: [],
      message: "config/mcporter.json ausente — rode scripts/setup-agent-reach.ps1",
      source: "exa",
    };
  }

  try {
    const stdout = await runCli(resolveMcporterCmd(), [
      "call", "exa.web_search_exa",
      `query=${q.slice(0, 500)}`,
      `numResults=${Math.min(Math.max(Number(numResults) || 6, 1), 12)}`,
      "--config", configPath,
    ]);
    const parsed = parseExaMcporterOutput(stdout);
    if (!parsed.summary) {
      return { available: false, summary: "", sources: [], message: "Exa sem resultados", source: "exa", query: q };
    }
    return {
      available: true,
      summary: parsed.summary.slice(0, 12000),
      sources: parsed.sources,
      items: parsed.items,
      source: "exa",
      query: q,
      via: "agent-reach",
    };
  } catch (err) {
    return { available: false, summary: "", sources: [], message: err.message, source: "exa", query: q };
  }
}

export async function fetchUrlViaJina(url) {
  const target = String(url || "").trim();
  if (!target) return { available: false, summary: "", sources: [], message: "URL vazia", source: "jina" };

  const readerUrl = target.startsWith("http") ? `https://r.jina.ai/${target}` : `https://r.jina.ai/https://${target}`;

  try {
    const res = await fetch(readerUrl, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      return { available: false, summary: "", sources: [], message: `Jina HTTP ${res.status}`, source: "jina", url: target };
    }
    const text = await res.text();
    return {
      available: true,
      summary: text.slice(0, 20000),
      sources: [{ title: target, url: target }],
      source: "jina",
      url: target,
      via: "agent-reach",
    };
  } catch (err) {
    return { available: false, summary: "", sources: [], message: err.message, source: "jina", url: target };
  }
}

export async function githubSearch(query, { limit = 8 } = {}) {
  const q = String(query || "").trim();
  if (!q) return { available: false, summary: "", sources: [], message: "Query vazia", source: "github" };

  try {
    const stdout = await runCli("gh", [
      "search", "repos", q, "--sort", "stars", "--limit", String(Math.min(limit, 15)),
      "--json", "name,description,url,stargazerCount,primaryLanguage",
    ], { timeout: 45000, maxBuffer: 2 * 1024 * 1024 });
    const rows = JSON.parse(stdout || "[]");
    const items = (Array.isArray(rows) ? rows : []).map((r) => ({
      title: r.name,
      url: r.url,
      snippet: `${r.description || ""} · ⭐ ${r.stargazerCount || 0}${r.primaryLanguage?.name ? ` · ${r.primaryLanguage.name}` : ""}`.trim(),
    }));
    const summary = items.map((it, i) => `${i + 1}. ${it.title} — ${it.snippet}\n${it.url}`).join("\n\n");
    return {
      available: items.length > 0,
      summary: summary.slice(0, 12000),
      sources: items.map((it) => ({ title: it.title, url: it.url })),
      items,
      source: "github",
      query: q,
      via: "agent-reach",
    };
  } catch (err) {
    return { available: false, summary: "", sources: [], message: err.message, source: "github", query: q };
  }
}

export async function bilibiliSearch(query, { limit = 5 } = {}) {
  const q = String(query || "").trim();
  if (!q) return { available: false, summary: "", sources: [], message: "Query vazia", source: "bilibili" };

  const api = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(q)}&page=1&page_size=${Math.min(limit, 10)}`;

  try {
    const res = await fetch(api, {
      headers: { "User-Agent": "agent-reach/1.0 lumiera" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Bilibili HTTP ${res.status}`);
    const data = await res.json();
    const results = data?.data?.result || [];
    const items = results.slice(0, limit).map((v) => ({
      title: String(v.title || "").replace(/<[^>]+>/g, ""),
      url: v.bvid ? `https://www.bilibili.com/video/${v.bvid}` : "",
      snippet: `${v.author || ""} · ▶ ${v.play || 0}`.trim(),
    }));
    const summary = items.map((it, i) => `${i + 1}. ${it.title} — ${it.snippet}\n${it.url}`).join("\n\n");
    return {
      available: items.length > 0,
      summary: summary.slice(0, 12000),
      sources: items.filter((it) => it.url).map((it) => ({ title: it.title, url: it.url })),
      items,
      source: "bilibili",
      query: q,
      via: "agent-reach",
    };
  } catch (err) {
    return { available: false, summary: "", sources: [], message: err.message, source: "bilibili", query: q };
  }
}

export async function fetchRssFeed(feedUrl) {
  const url = String(feedUrl || "").trim();
  if (!url) return { available: false, summary: "", sources: [], message: "URL do feed vazia", source: "rss" };

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
    const xml = await res.text();
    const entries = [...xml.matchAll(/<item[\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?(?:<link[^>]*>([\s\S]*?)<\/link>|<link[^>]*href="([^"]+)")/gi)]
      .slice(0, 12)
      .map((m) => ({
        title: String(m[1] || "").replace(/<[^>]+>/g, "").trim(),
        url: String(m[2] || m[3] || "").trim(),
      }))
      .filter((e) => e.title);

    const summary = entries.map((e, i) => `${i + 1}. ${e.title}${e.url ? `\n${e.url}` : ""}`).join("\n\n");
    return {
      available: entries.length > 0,
      summary: summary.slice(0, 12000),
      sources: entries.filter((e) => e.url).map((e) => ({ title: e.title, url: e.url })),
      items: entries,
      source: "rss",
      url,
      via: "agent-reach",
    };
  } catch (err) {
    return { available: false, summary: "", sources: [], message: err.message, source: "rss", url };
  }
}

export async function runAgentReachSearch({
  platform = "exa",
  query = "",
  url = "",
  workspaceDir = null,
  numResults = 6,
} = {}) {
  const p = String(platform || "exa").toLowerCase();

  if (p === "url" || p === "web-page" || p === "page") {
    return fetchUrlViaJina(url || query);
  }
  if (p === "github" || p === "gh") {
    return githubSearch(query, { limit: numResults });
  }
  if (p === "bilibili" || p === "bili") {
    return bilibiliSearch(query, { limit: numResults });
  }
  if (p === "rss" || p === "feed") {
    return fetchRssFeed(url || query);
  }

  return exaWebSearch(query, workspaceDir, { numResults });
}

/** Pesquisa internet unificada para roteiros — Agent Reach primeiro, Gemini opcional depois. */
export async function fetchAgentReachResearchForTopic({
  topic = "",
  niche = "",
  workspaceDir = null,
  numResults = 6,
} = {}) {
  const query = String(topic || niche).trim();
  if (!query) {
    return { available: false, summary: "", sources: [], facts: [], message: "Tema vazio" };
  }

  const exa = await exaWebSearch(`${query} ${niche ? `— ${niche}` : ""} fatos verificáveis`, workspaceDir, { numResults });

  if (!exa.available) {
    return {
      available: false,
      summary: "",
      sources: [],
      facts: [],
      message: exa.message || "Agent Reach indisponível",
      fallback: true,
      via: "agent-reach",
    };
  }

  const facts = (exa.items || [])
    .map((it) => it.snippet)
    .filter(Boolean)
    .flatMap((s) => s.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 40))
    .slice(0, 8);

  return {
    available: true,
    summary: exa.summary.slice(0, 8000),
    sources: exa.sources || [],
    facts,
    angles: [],
    via: "agent-reach-exa",
    fallback: false,
  };
}

export function mergeWebResearch(primary = {}, secondary = {}) {
  const sources = [...(primary.sources || []), ...(secondary.sources || [])];
  const seen = new Set();
  const dedupedSources = sources.filter((s) => {
    const key = s.url || s.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const facts = [...new Set([...(primary.facts || []), ...(secondary.facts || [])])].slice(0, 12);
  const summary = [primary.summary, secondary.summary].filter(Boolean).join("\n\n").slice(0, 12000);

  return {
    available: Boolean(summary || facts.length),
    summary,
    sources: dedupedSources.slice(0, 12),
    facts,
    angles: [...(primary.angles || []), ...(secondary.angles || [])].slice(0, 6),
    via: [primary.via, secondary.via].filter(Boolean).join("+") || "merged",
    fallback: primary.fallback && secondary.fallback,
  };
}