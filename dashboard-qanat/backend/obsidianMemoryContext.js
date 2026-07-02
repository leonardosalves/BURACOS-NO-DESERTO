/**
 * Lê notas do vault Obsidian (.agents/) e injeta contexto nos prompts de IA.
 * Inclui MEMORY.md, seções manuais e arquivos de referência por nicho.
 */

import fs from "fs";
import path from "path";
import { slugifyNiche, getAgentPaths, ensureAgentDirs } from "./agentMemory.js";
import { VIDEO_FORMAT } from "./formatResolver.js";
function collapseWhitespace(text = "") {
  return collapse(text);
}

const STUDIO_SECTION_NAMES = [
  "notas do estúdio",
  "notas do estudio",
  "regras do nicho",
  "aprendizados manuais",
  "contexto para ia",
  "contexto",
  "regra de ouro",
  "mecânicas que funcionam",
  "mecanicas que funcionam",
  "preferências do canal",
  "preferencias do canal",
];

const SKIP_SECTION_NAMES = new Set([
  "meta",
  "padrões promovidos",
  "padroes promovidos",
  "candidatos (em observação)",
  "candidatos (em observacao)",
  "obsidian",
  "índice memória por nicho",
  "indice memoria por nicho",
  "quem monitorar (lista viva)",
]);

const TASK_SECTION_HINTS = {
  ideas: ["regra de ouro", "mecânica", "outlier", "concorrent", "hook", "packaging", "ideia"],
  script: ["roteiro", "narração", "narracao", "tom", "gancho", "retenção", "retencao", "notas"],
  overlay: ["overlay", "timing", "visual", "hyperframe", "cena"],
  metadata: ["seo", "título", "titulo", "thumb", "cta", "hashtag"],
};

const MAX_OBSIDIAN_ADDENDUM = 3800;
const MAX_FILE_SNIPPET = 1400;

function collapse(text = "") {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripObsidianNoise(text = "") {
  return collapse(text)
    .replace(/^> 🔗.*$/gm, "")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^atualizado:.*$/gim, "")
    .trim();
}

function parseSections(content = "") {
  const sections = [];
  const lines = content.split("\n");
  let current = { title: "", lines: [] };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      if (current.title || current.lines.length) sections.push(current);
      current = { title: h2[1].trim(), lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  if (current.title || current.lines.length) sections.push(current);
  return sections;
}

function sectionKey(title = "") {
  return String(title).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function extractSectionBody(content = "", matcher) {
  const sections = parseSections(content);
  const out = [];
  for (const sec of sections) {
    const key = sectionKey(sec.title);
    if (SKIP_SECTION_NAMES.has(key)) continue;
    const match = typeof matcher === "function"
      ? matcher(key, sec.title)
      : key.includes(String(matcher).toLowerCase());
    if (!match) continue;
    const body = stripObsidianNoise(sec.lines.join("\n"));
    if (body.length >= 12) out.push({ title: sec.title, body });
  }
  return out;
}

function extractBullets(text = "", max = 24) {
  const bullets = [];
  for (const line of text.split("\n")) {
    const m = line.trim().match(/^[-*]\s+(.+)$/);
    if (!m) continue;
    const item = m[1].replace(/\*\*/g, "").trim();
    if (item.length < 4 || item.startsWith("[[") || item.startsWith("(nenhum")) continue;
    bullets.push(item);
    if (bullets.length >= max) break;
  }
  return bullets;
}

/** MEMORY.md — regras globais + seção do formato ativo. */
export function extractGlobalMemoryBullets(content = "", format = VIDEO_FORMAT.SHORT) {
  const sections = parseSections(content);
  const bullets = [];
  const wantShort = format === VIDEO_FORMAT.SHORT;
  const formatKeys = wantShort
    ? ["regras globais", "shorts"]
    : ["regras globais", "longos"];

  for (const sec of sections) {
    const key = sectionKey(sec.title);
    if (!formatKeys.some((k) => key.includes(k))) continue;
    bullets.push(...extractBullets(sec.lines.join("\n"), 16));
  }

  return [...new Set(bullets)].slice(0, 20);
}

function nicheTokens(niche = "") {
  return slugifyNiche(niche).split("-").filter((t) => t.length >= 3);
}

function readMetaNiche(content = "") {
  const m = content.match(/^niche:\s*(.+)$/m);
  return m?.[1]?.trim() || "";
}

export function scoreMemoryFileRelevance(niche = "", fileSlug = "", metaNiche = "") {
  const nicheSlug = slugifyNiche(niche);
  if (!nicheSlug || nicheSlug === "geral") return fileSlug === "geral" ? 50 : 10;

  if (fileSlug === nicheSlug) return 100;
  if (fileSlug.startsWith(`${nicheSlug}-`) || nicheSlug.startsWith(`${fileSlug}-`)) return 85;

  const metaSlug = slugifyNiche(metaNiche);
  if (metaSlug && metaSlug === nicheSlug) return 92;
  if (metaSlug && (metaSlug.includes(nicheSlug) || nicheSlug.includes(metaSlug))) return 75;

  const nt = new Set(nicheTokens(niche));
  const ft = new Set(fileSlug.split("-").filter((t) => t.length >= 3));
  let overlap = 0;
  for (const t of nt) if (ft.has(t)) overlap += 1;
  return overlap * 22;
}

function listMemoryMarkdownFiles(workspaceDir) {
  ensureAgentDirs(workspaceDir);
  const { memoryDir } = getAgentPaths(workspaceDir);
  if (!fs.existsSync(memoryDir)) return [];
  return fs.readdirSync(memoryDir)
    .filter((f) => f.endsWith(".md") && f !== ".gitkeep")
    .map((f) => {
      const filePath = path.join(memoryDir, f);
      const raw = fs.readFileSync(filePath, "utf8");
      return {
        file: f,
        slug: f.replace(/\.md$/, ""),
        path: filePath,
        raw,
        metaNiche: readMetaNiche(raw),
      };
    });
}

function extractStudioSections(content = "") {
  return extractSectionBody(content, (key) => (
    STUDIO_SECTION_NAMES.some((name) => key.includes(sectionKey(name)))
  ));
}

function extractOutlierSummaries(content = "", max = 4) {
  const summaries = [];
  const chunks = content.split(/^###\s+/m).slice(1);
  for (const chunk of chunks.slice(-max)) {
    const lines = chunk.split("\n");
    const title = lines[0]?.trim();
    if (!title) continue;
    const facts = lines
      .filter((l) => /^\*\*[^*]+\*\*:/.test(l.trim()))
      .slice(0, 5)
      .map((l) => l.trim().replace(/\*\*/g, ""));
    if (facts.length) summaries.push(`- ${title}: ${facts.join("; ")}`);
  }
  return summaries;
}

function buildFileSnippet(entry, task = "overlay") {
  const { slug, raw } = entry;
  const parts = [];

  for (const sec of extractStudioSections(raw)) {
    const bullets = extractBullets(sec.body, 12);
    if (bullets.length) {
      parts.push(`### ${sec.title} (${slug})`, ...bullets.map((b) => `- ${b}`));
    } else if (sec.body.length >= 20) {
      parts.push(`### ${sec.title} (${slug})`, sec.body.slice(0, 600));
    }
  }

  if (task === "ideas" && slug === "competitor-intelligence") {
    const gold = extractSectionBody(raw, (key) => key.includes("regra de ouro"));
    for (const sec of gold) {
      const bullets = extractBullets(sec.body, 8);
      if (bullets.length) parts.push("### Regra de ouro (concorrentes)", ...bullets.map((b) => `- ${b}`));
    }
    const outliers = extractOutlierSummaries(raw, 4);
    if (outliers.length) parts.push("### Outliers recentes (concorrentes)", ...outliers);
  }

  if (!parts.length) {
    const hints = TASK_SECTION_HINTS[task] || [];
    const generic = extractSectionBody(raw, (key, title) => {
      const hay = `${key} ${title}`.toLowerCase();
      return hints.some((h) => hay.includes(h));
    });
    for (const sec of generic.slice(0, 2)) {
      const bullets = extractBullets(sec.body, 8);
      if (bullets.length) {
        parts.push(`### ${sec.title} (${slug})`, ...bullets.map((b) => `- ${b}`));
      }
    }
  }

  let text = stripObsidianNoise(parts.join("\n"));
  if (text.length > MAX_FILE_SNIPPET) {
    text = `${text.slice(0, MAX_FILE_SNIPPET - 80).trimEnd()}\n[… nota truncada …]`;
  }
  return text;
}

function taskRelevanceBoost(slug, task) {
  if (task === "ideas" && slug === "competitor-intelligence") return 40;
  if (task === "script" && /curiosidades|engenharia|historia/.test(slug)) return 10;
  return 0;
}

/**
 * Resolve notas Obsidian relevantes ao nicho/tarefa.
 */
export function resolveObsidianNotesForNiche(
  workspaceDir,
  niche = "Geral",
  { task = "overlay", format = VIDEO_FORMAT.SHORT, maxFiles = 5 } = {},
) {
  const files = listMemoryMarkdownFiles(workspaceDir);
  const scored = files
    .map((entry) => ({
      ...entry,
      score: scoreMemoryFileRelevance(niche, entry.slug, entry.metaNiche)
        + taskRelevanceBoost(entry.slug, task),
    }))
    .filter((e) => e.score >= 40 || (task === "ideas" && e.slug === "competitor-intelligence"))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles);

  const snippets = [];
  for (const entry of scored) {
    const snippet = buildFileSnippet(entry, task);
    if (snippet.length >= 24) snippets.push(snippet);
  }

  const { globalMemory } = getAgentPaths(workspaceDir);
  let globalBullets = [];
  if (fs.existsSync(globalMemory)) {
    globalBullets = extractGlobalMemoryBullets(fs.readFileSync(globalMemory, "utf8"), format);
  }

  return { globalBullets, snippets, filesUsed: scored.map((s) => s.slug) };
}

export function buildObsidianNotesPromptAddendum(
  workspaceDir,
  { niche = "Geral", task = "overlay", format = null } = {},
) {
  const fmt = format || VIDEO_FORMAT.SHORT;
  const { globalBullets, snippets, filesUsed } = resolveObsidianNotesForNiche(
    workspaceDir,
    niche,
    { task, format: fmt },
  );

  if (!globalBullets.length && !snippets.length) return "";

  const lines = [
    "",
    `## NOTAS DO OBSIDIAN — vault .agents/ (nicho: ${niche})`,
    "Priorize estas notas editadas pelo estúdio ao gerar a resposta.",
  ];

  if (globalBullets.length) {
    lines.push("", "### Regras globais (MEMORY.md)", ...globalBullets.map((b) => `- ${b}`));
  }

  if (snippets.length) {
    lines.push("", "### Notas por nicho / referência", ...snippets);
  }

  if (filesUsed.length) {
    lines.push("", `_(fontes: ${filesUsed.join(", ")})_`);
  }

  let out = collapseWhitespace(lines.join("\n"));
  if (out.length > MAX_OBSIDIAN_ADDENDUM) {
    out = `${out.slice(0, MAX_OBSIDIAN_ADDENDUM - 100).trimEnd()}\n[… notas Obsidian truncadas …]`;
  }
  return `${out}\n`;
}