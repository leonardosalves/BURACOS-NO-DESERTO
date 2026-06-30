/**
 * Memória do Studio Agents — aprendizado incremental por nicho (estilo OpenClaw/implement).
 * Persiste em .agents/MEMORY.md, .agents/memory/<nicho>.md e logs em .agents/agent_runs/.
 */

import fs from "fs";
import path from "path";
import {
  formatScopedCategory,
  getFormatSuccessRules,
  patternMatchesFormat,
  VIDEO_FORMAT,
} from "./formatResolver.js";

export const PROMOTE_THRESHOLD = 3;
const MAX_PROMOTED = 30;
const MAX_CANDIDATES = 40;
const MAX_DAILY_RUN_LINES = 200;

export function getAgentPaths(workspaceDir) {
  const backendDir = path.join(workspaceDir, "dashboard-qanat", "backend");
  return {
    globalMemory: path.join(workspaceDir, ".agents", "MEMORY.md"),
    memoryDir: path.join(workspaceDir, ".agents", "memory"),
    runsDir: path.join(workspaceDir, ".agents", "agent_runs"),
    configPath: path.join(backendDir, "studio_agents_config.json"),
  };
}

export function slugifyNiche(niche = "") {
  return String(niche || "geral")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "geral";
}

export function ensureAgentDirs(workspaceDir) {
  const paths = getAgentPaths(workspaceDir);
  fs.mkdirSync(paths.memoryDir, { recursive: true });
  fs.mkdirSync(paths.runsDir, { recursive: true });
  if (!fs.existsSync(paths.globalMemory)) {
    fs.writeFileSync(
      paths.globalMemory,
      "# Memória global do Lumiera Studio Agents\n\nPreferências e decisões duráveis do estúdio.\n",
      "utf8",
    );
  }
  return paths;
}

export function loadStudioAgentsConfig(workspaceDir) {
  const { configPath } = getAgentPaths(workspaceDir);
  const defaults = {
    autoCaptureOnQualityCheck: false,
    applyLearningsInAgentMode: true,
    promoteThreshold: PROMOTE_THRESHOLD,
  };
  if (!fs.existsSync(configPath)) return { ...defaults };
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(configPath, "utf8")) };
  } catch {
    return { ...defaults };
  }
}

export function saveStudioAgentsConfig(workspaceDir, patch = {}) {
  const { configPath } = getAgentPaths(workspaceDir);
  const merged = { ...loadStudioAgentsConfig(workspaceDir), ...patch };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

function normalizePatternKey(category, description) {
  return `${String(category || "general").toLowerCase()}::${String(description || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim()}`;
}

function parsePatternLines(sectionText = "") {
  const patterns = [];
  const lineRe = /^- \[(.+?)\] (.+?) \(count: (\d+)\)\s*$/;
  for (const line of sectionText.split("\n")) {
    const m = line.trim().match(lineRe);
    if (!m) continue;
    patterns.push({
      category: m[1],
      description: m[2],
      count: Number(m[3]) || 1,
      key: normalizePatternKey(m[1], m[2]),
    });
  }
  return patterns;
}

function formatPatternLine(pattern) {
  const cat = pattern.category || "general";
  const desc = String(pattern.description || "").trim();
  const count = Math.max(1, Number(pattern.count) || 1);
  return `- [${cat}] ${desc} (count: ${count})`;
}

export function parseNicheMemoryFile(content = "") {
  const promotedMatch = content.match(/## Padrões promovidos\s*\n([\s\S]*?)(?=\n## |\n*$)/);
  const candidatesMatch = content.match(/## Candidatos[^\n]*\s*\n([\s\S]*?)(?=\n## |\n*$)/);
  return {
    promoted: parsePatternLines(promotedMatch?.[1] || ""),
    candidates: parsePatternLines(candidatesMatch?.[1] || ""),
  };
}

function buildNicheMemoryContent(niche, { promoted = [], candidates = [], runs = 0 } = {}) {
  const slug = slugifyNiche(niche);
  const promotedLines = promoted.map(formatPatternLine).join("\n") || "- (nenhum ainda)";
  const candidateLines = candidates.map(formatPatternLine).join("\n") || "- (nenhum ainda)";
  return [
    `# ${slug}`,
    "",
    "## Meta",
    `niche: ${niche}`,
    `updated: ${new Date().toISOString()}`,
    `runs: ${runs}`,
    "",
    "## Padrões promovidos",
    promotedLines,
    "",
    "## Candidatos (em observação)",
    candidateLines,
    "",
  ].join("\n");
}

function mergePatterns(existing = [], incoming = []) {
  const map = new Map();
  for (const p of existing) {
    const key = p.key || normalizePatternKey(p.category, p.description);
    map.set(key, { ...p, key });
  }
  for (const raw of incoming) {
    const key = normalizePatternKey(raw.category, raw.description);
    const prev = map.get(key);
    if (prev) {
      prev.count = (prev.count || 1) + (raw.increment || 1);
    } else {
      map.set(key, {
        category: raw.category || "general",
        description: raw.description,
        count: raw.increment || 1,
        key,
      });
    }
  }
  return [...map.values()].sort((a, b) => (b.count || 0) - (a.count || 0));
}

export function readNicheMemory(workspaceDir, niche) {
  ensureAgentDirs(workspaceDir);
  const file = path.join(getAgentPaths(workspaceDir).memoryDir, `${slugifyNiche(niche)}.md`);
  if (!fs.existsSync(file)) {
    return { niche, file, promoted: [], candidates: [], runs: 0, raw: "" };
  }
  const raw = fs.readFileSync(file, "utf8");
  const parsed = parseNicheMemoryFile(raw);
  const runsMatch = raw.match(/runs: (\d+)/);
  return {
    niche,
    file,
    ...parsed,
    runs: Number(runsMatch?.[1]) || 0,
    raw,
  };
}

export function writeNicheMemory(workspaceDir, niche, { promoted, candidates, runs }) {
  ensureAgentDirs(workspaceDir);
  const file = path.join(getAgentPaths(workspaceDir).memoryDir, `${slugifyNiche(niche)}.md`);
  const content = buildNicheMemoryContent(niche, { promoted, candidates, runs });
  fs.writeFileSync(file, content, "utf8");
  return file;
}

const GENERALIZED_ISSUE_RULES = {
  hook_polluted: {
    SHORT: "Evitar overlays informativos no gancho Short (<1.5s) — manter hook limpo",
    LONG: "Evitar overlays informativos no gancho Long (<5s)",
  },
  gap_short: "Respeitar gap mínimo entre overlays consecutivos do orçamento do formato",
  lt_repeat: "Alternar tipos entre overlays — evitar dois lower-thirds seguidos",
  overlay_budget: "Respeitar orçamento máximo de overlays do formato",
  pattern_interrupt: "Inserir pattern interrupt visual em cenas longas (>12s) em Shorts",
  weak_hook_visual: "Primeira cena do Short deve ser o visual mais forte — evitar logo/placeholder",
  listicle_no_rank: "Listicle exige HUD rank-progress persistente no topo",
};

function generalizeTimingEntry(entry, format = VIDEO_FORMAT.SHORT) {
  const msg = String(entry.message || entry.status || "").toLowerCase();
  const start = Number(entry.startSec);
  if (msg.includes("gancho") || (Number.isFinite(start) && start < (format === VIDEO_FORMAT.SHORT ? 1.5 : 5))) {
    return GENERALIZED_ISSUE_RULES.hook_polluted[format] || GENERALIZED_ISSUE_RULES.hook_polluted.SHORT;
  }
  if (msg.includes("fora da cena") || msg.includes("scene")) {
    return "Ancorar overlay ao scene_ref da narração — não usar segundos fora da cena ativa";
  }
  if (msg.includes("palavra-chave") || msg.includes("desvio")) {
    return "Sincronizar overlay com palavra-chave da narração (desvio < 3s)";
  }
  return "Revisar timing do overlay em relação à narração e às cenas";
}

export function extractPatternsFromQuality(quality = {}, format = VIDEO_FORMAT.SHORT) {
  const patterns = [];
  const seen = new Set();

  const addPattern = (category, description, increment = 1) => {
    const scoped = formatScopedCategory(format, category);
    const key = `${scoped}::${description.toLowerCase().trim()}`;
    if (seen.has(key)) return;
    seen.add(key);
    patterns.push({ category: scoped, description, increment });
  };

  for (const issue of quality.issues || []) {
    const code = issue.code || "quality";
    const generalized = GENERALIZED_ISSUE_RULES[code];
    const description = typeof generalized === "object"
      ? (generalized[format] || generalized.SHORT)
      : (generalized || issue.message);
    addPattern(
      code,
      description,
      issue.severity === "error" ? 2 : 1,
    );
  }

  for (const entry of quality.overlay_timing?.entries || []) {
    if (entry.status === "ok") continue;
    addPattern("overlay_timing", generalizeTimingEntry(entry, format), 1);
  }

  if (Number(quality.score) < 80) {
    addPattern(
      "quality_score",
      `Score de qualidade baixo (${quality.score}/100) — revisar overlays e roteiro`,
      1,
    );
  }

  return patterns;
}

const CAPTURE_DEBOUNCE_MS = 15 * 60 * 1000;

export function shouldSkipAutoCapture(workspaceDir, projectDir, quality = {}) {
  const cachePath = path.join(getAgentPaths(workspaceDir).runsDir, ".capture_cache.json");
  const project = path.basename(projectDir);
  const fingerprint = [
    project,
    quality.score ?? "na",
    (quality.issues || []).length,
    (quality.overlay_timing?.entries || []).filter((e) => e.status !== "ok").length,
  ].join(":");

  let cache = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    } catch {
      cache = {};
    }
  }

  const prev = cache[project];
  const now = Date.now();
  if (prev?.fingerprint === fingerprint && now - (prev.at || 0) < CAPTURE_DEBOUNCE_MS) {
    return true;
  }

  cache[project] = { fingerprint, at: now };
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf8");
  return false;
}

export function appendDailyRunLog(workspaceDir, line) {
  ensureAgentDirs(workspaceDir);
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(getAgentPaths(workspaceDir).runsDir, `${day}.md`);
  const header = fs.existsSync(file) ? "" : `# Agent runs ${day}\n\n`;
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const lineCount = existing.split("\n").filter((l) => l.trim().startsWith("- ")).length;
  if (lineCount >= MAX_DAILY_RUN_LINES) return;
  fs.appendFileSync(file, `${header}${line}\n`, "utf8");
}

export function recordProjectRun(workspaceDir, projectDir, payload = {}) {
  ensureAgentDirs(workspaceDir);
  const run = {
    id: String(Date.now()),
    at: new Date().toISOString(),
    project: path.basename(projectDir),
    niche: payload.niche || "Geral",
    format: payload.format || null,
    score: payload.score ?? null,
    source: payload.source || "manual",
    patterns: payload.patterns || [],
    issueCount: payload.issueCount ?? (payload.patterns?.length || 0),
  };

  const projectLog = path.join(projectDir, "agent_runs.json");
  let history = [];
  if (fs.existsSync(projectLog)) {
    try {
      history = JSON.parse(fs.readFileSync(projectLog, "utf8"));
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }
  }
  history.push(run);
  if (history.length > 50) history = history.slice(-50);
  fs.writeFileSync(projectLog, JSON.stringify(history, null, 2), "utf8");

  appendDailyRunLog(
    workspaceDir,
    `- ${run.at} **${run.project}** (${run.niche}${run.format ? `/${run.format}` : ""}) score=${run.score ?? "—"} patterns=${run.patterns.length} source=${run.source}`,
  );

  return run;
}

export function ingestPatternsToNiche(workspaceDir, niche, patterns = []) {
  if (!patterns.length) return readNicheMemory(workspaceDir, niche);

  const mem = readNicheMemory(workspaceDir, niche);
  const candidates = mergePatterns(mem.candidates, patterns);
  const capped = candidates.slice(0, MAX_CANDIDATES);
  writeNicheMemory(workspaceDir, niche, {
    promoted: mem.promoted,
    candidates: capped,
    runs: (mem.runs || 0) + 1,
  });
  return readNicheMemory(workspaceDir, niche);
}

export function consolidateNicheMemory(workspaceDir, niche, threshold = PROMOTE_THRESHOLD) {
  const mem = readNicheMemory(workspaceDir, niche);
  const stillCandidates = [];
  const newlyPromoted = [...mem.promoted];

  for (const c of mem.candidates) {
    if ((c.count || 0) >= threshold) {
      newlyPromoted.push(c);
    } else {
      stillCandidates.push(c);
    }
  }

  const promoted = mergePatterns([], newlyPromoted).slice(0, MAX_PROMOTED);
  const candidates = stillCandidates.slice(0, MAX_CANDIDATES);
  writeNicheMemory(workspaceDir, niche, {
    promoted,
    candidates,
    runs: mem.runs,
  });

  return {
    niche,
    promoted: promoted.length,
    candidates: candidates.length,
    newlyPromoted: promoted.filter(
      (p) => !mem.promoted.some((old) => old.key === p.key),
    ).length,
  };
}

export function consolidateAllNiches(workspaceDir, threshold = PROMOTE_THRESHOLD) {
  ensureAgentDirs(workspaceDir);
  const { memoryDir } = getAgentPaths(workspaceDir);
  const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(memoryDir, f), "utf8");
    const nicheMatch = raw.match(/niche: (.+)/);
    const niche = nicheMatch?.[1]?.trim() || f.replace(/\.md$/, "");
    return consolidateNicheMemory(workspaceDir, niche, threshold);
  });
}

/** Pré-visualização read-only — candidatos que seriam promovidos na consolidação. */
export function previewConsolidationNiche(workspaceDir, niche, threshold = PROMOTE_THRESHOLD) {
  const mem = readNicheMemory(workspaceDir, niche);
  const toPromote = mem.candidates.filter((c) => (c.count || 0) >= threshold);
  const remaining = mem.candidates.filter((c) => (c.count || 0) < threshold);
  return {
    niche,
    slug: slugifyNiche(niche),
    threshold,
    toPromote: toPromote.map((c) => ({
      category: c.category,
      description: c.description,
      count: c.count || 1,
    })),
    remainingCount: remaining.length,
    alreadyPromoted: mem.promoted.length,
  };
}

export function previewConsolidationAllNiches(workspaceDir, threshold = PROMOTE_THRESHOLD) {
  ensureAgentDirs(workspaceDir);
  const { memoryDir } = getAgentPaths(workspaceDir);
  const files = fs.existsSync(memoryDir)
    ? fs.readdirSync(memoryDir).filter((f) => f.endsWith(".md"))
    : [];

  const niches = files.map((f) => {
    const raw = fs.readFileSync(path.join(memoryDir, f), "utf8");
    const nicheMatch = raw.match(/niche: (.+)/);
    const niche = nicheMatch?.[1]?.trim() || f.replace(/\.md$/, "");
    return previewConsolidationNiche(workspaceDir, niche, threshold);
  });

  const withPromotions = niches.filter((n) => n.toPromote.length > 0);
  const totalToPromote = withPromotions.reduce((sum, n) => sum + n.toPromote.length, 0);

  return {
    threshold,
    totalToPromote,
    niches: withPromotions,
  };
}

const TASK_CATEGORY_HINTS = {
  overlay: ["overlay", "orchestration", "lower-third", "bar-chart", "timeline", "kinetic"],
  script: ["script", "checklist", "roteiro", "hook", "retention"],
  render: ["render", "quality", "timing"],
};

export function getLearnings(
  workspaceDir,
  { niche = "Geral", task = "overlay", format = null, limit = 8 } = {},
) {
  ensureAgentDirs(workspaceDir);
  const paths = getAgentPaths(workspaceDir);
  const items = [];
  const hints = TASK_CATEGORY_HINTS[task] || [];
  const targetFormat = format || VIDEO_FORMAT.SHORT;

  for (const rule of getFormatSuccessRules(targetFormat)) {
    items.push({
      text: `[${formatScopedCategory(targetFormat, rule.category)}] ${rule.description} (regra de sucesso ${targetFormat})`,
      count: 99,
      promoted: true,
      baseline: true,
    });
  }

  const mem = readNicheMemory(workspaceDir, niche);
  for (const p of [...mem.promoted, ...mem.candidates.filter((c) => (c.count || 0) >= 2)]) {
    if (!patternMatchesFormat(p.category, targetFormat)) continue;
    const hay = `${p.category} ${p.description}`.toLowerCase();
    const relevant = hints.length === 0 || hints.some((h) => hay.includes(h));
    if (!relevant) continue;
    const tag = mem.promoted.some((x) => x.key === p.key) ? "promovido" : "observação";
    items.push({
      text: `[${p.category}] ${p.description} (count: ${p.count}, ${tag})`,
      count: p.count || 1,
      promoted: tag === "promovido",
    });
  }

  if (fs.existsSync(paths.globalMemory)) {
    const global = fs.readFileSync(paths.globalMemory, "utf8");
    let globalCount = 0;
    for (const line of global.split("\n")) {
      if (globalCount >= 4) break;
      const trimmed = line.trim();
      if (!trimmed.startsWith("- ")) continue;
      items.push({ text: trimmed.slice(2), count: 1, promoted: true, global: true });
      globalCount++;
    }
  }

  items.sort((a, b) => {
    if (a.baseline !== b.baseline) return a.baseline ? -1 : 1;
    if (a.promoted !== b.promoted) return a.promoted ? -1 : 1;
    return (b.count || 0) - (a.count || 0);
  });

  return items.slice(0, limit);
}

export function buildLearningsPromptAddendum(
  workspaceDir,
  { niche = "Geral", task = "overlay", format = null } = {},
) {
  const config = loadStudioAgentsConfig(workspaceDir);
  if (!config.applyLearningsInAgentMode) return "";

  const learnings = getLearnings(workspaceDir, { niche, task, format, limit: 12 });
  if (!learnings.length) return "";

  const formatLabel = format || "SHORT";
  return [
    "",
    `## APRENDIZADOS DO ESTÚDIO — formato ${formatLabel} (Studio Agents)`,
    ...learnings.map((l) => `- ${l.text}`),
    "",
  ].join("\n");
}

export function listRecentRunLogs(workspaceDir, days = 7) {
  ensureAgentDirs(workspaceDir);
  const { runsDir } = getAgentPaths(workspaceDir);
  const files = fs.readdirSync(runsDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse()
    .slice(0, days);

  return files.map((file) => ({
    date: file.replace(".md", ""),
    content: fs.readFileSync(path.join(runsDir, file), "utf8"),
  }));
}

export function getStudioAgentStatus(workspaceDir) {
  ensureAgentDirs(workspaceDir);
  const { memoryDir } = getAgentPaths(workspaceDir);
  const config = loadStudioAgentsConfig(workspaceDir);
  const nicheFiles = fs.existsSync(memoryDir)
    ? fs.readdirSync(memoryDir).filter((f) => f.endsWith(".md"))
    : [];

  let totalPromoted = 0;
  let totalCandidates = 0;
  const niches = nicheFiles.map((file) => {
    const raw = fs.readFileSync(path.join(memoryDir, file), "utf8");
    const parsed = parseNicheMemoryFile(raw);
    totalPromoted += parsed.promoted.length;
    totalCandidates += parsed.candidates.length;
    const nicheMatch = raw.match(/niche: (.+)/);
    return {
      slug: file.replace(".md", ""),
      niche: nicheMatch?.[1] || file.replace(".md", ""),
      promoted: parsed.promoted.length,
      candidates: parsed.candidates.length,
      runs: Number(raw.match(/runs: (\d+)/)?.[1]) || 0,
    };
  });

  return {
    config,
    niches,
    totals: {
      nicheFiles: nicheFiles.length,
      promoted: totalPromoted,
      candidates: totalCandidates,
    },
    recentLogs: listRecentRunLogs(workspaceDir, 5),
  };
}