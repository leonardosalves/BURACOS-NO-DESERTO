/**
 * Registro de skills do Studio Agents — padrões Hermes (progressive disclosure) + OpenClaw (bundles, gating).
 * Skills em <workspace>/.agents/skills/ (equivalente OpenClaw project-agent skills).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  buildLearningsPromptAddendum,
  loadStudioAgentsConfig,
  saveStudioAgentsConfig,
} from "./agentMemory.js";
import { compressPromptAddendum } from "./lumieraContextCompress.js";

const SKILLS_ROOT = "skills";
const BUNDLES_DIR = "skill-bundles";
const PENDING_DIR = path.join("pending", "skills");
const MAX_BODY_EXCERPT = 2200;
const MAX_REF_CHARS = 8000;

function getAgentsDir(workspaceDir) {
  return path.join(workspaceDir, ".agents");
}

function getSkillsRoot(workspaceDir) {
  return path.join(getAgentsDir(workspaceDir), SKILLS_ROOT);
}

function getBundlesDir(workspaceDir) {
  return path.join(getAgentsDir(workspaceDir), BUNDLES_DIR);
}

function getPendingDir(workspaceDir) {
  return path.join(getAgentsDir(workspaceDir), PENDING_DIR);
}

function parseFrontmatter(content = "") {
  const fmIndex = content.search(/---\r?\n/);
  const match =
    fmIndex >= 0
      ? content.slice(fmIndex).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
      : null;
  if (!match) {
    return { meta: {}, body: content, rawFrontmatter: "" };
  }
  const preamble = fmIndex > 0 ? content.slice(0, fmIndex) : "";
  const raw = match[1];
  const body = `${preamble}${match[2]}`;
  const meta = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([a-zA-Z0-9_.-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (val.startsWith("[") && val.endsWith("]")) {
      val = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else {
      val = val.replace(/^['"]|['"]$/g, "");
    }
    meta[key] = val;
  }
  return { meta, body, rawFrontmatter: raw };
}

function parseMetadataBlock(block = "") {
  const out = {};
  if (!block) return out;
  if (/lumiera:\s*true/.test(block)) out.lumiera = true;
  const fmt = block.match(/formats:\s*\[([^\]]+)\]/);
  if (fmt) {
    out.formats = fmt[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  const tasks = block.match(/tasks:\s*\[([^\]]+)\]/);
  if (tasks) {
    out.tasks = tasks[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  const cat = block.match(/category:\s*(.+)$/m);
  if (cat) out.category = cat[1].trim().replace(/^['"]|['"]$/g, "");
  return out;
}

function parseNestedLumieraMeta(rawFrontmatter = "") {
  const out = {};
  if (/^\s*lumiera:\s*true/m.test(rawFrontmatter)) out.lumiera = true;

  const metaBlock = rawFrontmatter.match(/^metadata:\s*\r?\n((?:[ \t]+[^\n]+\r?\n?)+)/m);
  if (metaBlock) {
    Object.assign(out, parseMetadataBlock(metaBlock[1]));
  }

  const fmt = rawFrontmatter.match(/^\s*formats:\s*\[([^\]]+)\]/m);
  if (fmt && !out.formats) {
    out.formats = fmt[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  const tasks = rawFrontmatter.match(/^\s*tasks:\s*\[([^\]]+)\]/m);
  if (tasks && !out.tasks) {
    out.tasks = tasks[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  const cat = rawFrontmatter.match(/^\s*category:\s*(.+)$/m);
  if (cat && !out.category) out.category = cat[1].trim().replace(/^['"]|['"]$/g, "");
  return out;
}

function readLumieraMeta(meta = {}, rawFrontmatter = "") {
  const nested = parseNestedLumieraMeta(rawFrontmatter);
  const fromMeta =
    typeof meta.metadata === "object" && meta.metadata !== null ? meta.metadata : {};
  const merged = { ...fromMeta, ...nested };
  if (meta.lumiera === true || meta.lumiera === "true") merged.lumiera = true;
  if (merged.lumiera || merged.formats?.length || merged.tasks?.length || merged.category) {
    return merged;
  }
  return {};
}

function normalizeFormatList(values = []) {
  const arr = Array.isArray(values) ? values : [values];
  return arr
    .map((v) => String(v || "").toUpperCase())
    .map((v) => (v === "SHORTS" ? "SHORT" : v === "LONGO" ? "LONG" : v))
    .filter(Boolean);
}

function skillPassesGates(skill, { format = null, task = null, os = process.platform } = {}) {
  const meta = skill.meta || {};
  const lum = readLumieraMeta(meta);
  const formats = normalizeFormatList(lum.formats || meta.formats || []);
  const tasks = (lum.tasks || meta.tasks || []).map((t) => String(t).toLowerCase());
  const platforms = (lum.platforms || meta.platforms || []).map((p) => String(p).toLowerCase());

  if (platforms.length) {
    const osMap = { win32: "windows", darwin: "macos", linux: "linux" };
    if (!platforms.includes(osMap[os] || os)) return false;
  }
  if (format && formats.length && !formats.includes(normalizeFormatList([format])[0])) {
    return false;
  }
  if (task && tasks.length && !tasks.includes(String(task).toLowerCase())) {
    return false;
  }
  return true;
}

function discoverSkillSlugs(workspaceDir) {
  const root = getSkillsRoot(workspaceDir);
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((slug) => fs.existsSync(path.join(root, slug, "SKILL.md")))
    .sort();
}

function loadSkillRecord(workspaceDir, slug) {
  const skillPath = path.join(getSkillsRoot(workspaceDir), slug, "SKILL.md");
  if (!fs.existsSync(skillPath)) return null;
  const raw = fs.readFileSync(skillPath, "utf8");
  const { meta, body, rawFrontmatter } = parseFrontmatter(raw);
  const lum = readLumieraMeta(meta, rawFrontmatter);
  return {
    name: String(meta.name || slug),
    slug,
    description: String(meta.description || "").replace(/\s+/g, " ").trim(),
    category: lum.category || meta.category || "general",
    path: skillPath,
    meta,
    lumiera: Boolean(lum.lumiera || meta.lumiera),
    formats: normalizeFormatList(lum.formats || meta.formats || []),
    tasks: (lum.tasks || meta.tasks || []).map((t) => String(t).toLowerCase()),
    body,
  };
}

export function listSkills(workspaceDir, filters = {}) {
  const config = loadStudioAgentsConfig(workspaceDir);
  const allowlist = config.skillAllowlist;
  const slugs = discoverSkillSlugs(workspaceDir);
  const items = [];
  for (const slug of slugs) {
    if (Array.isArray(allowlist) && allowlist.length && !allowlist.includes(slug)) continue;
    const skill = loadSkillRecord(workspaceDir, slug);
    if (!skill) continue;
    if (!skillPassesGates(skill, filters)) continue;
    items.push({
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      category: skill.category,
      lumiera: skill.lumiera,
      formats: skill.formats,
      tasks: skill.tasks,
    });
  }
  return items;
}

export function viewSkill(workspaceDir, nameOrSlug, refPath = null) {
  const slugs = discoverSkillSlugs(workspaceDir);
  const slug = slugs.find((s) => s === nameOrSlug) || slugs.find((s) => {
    const rec = loadSkillRecord(workspaceDir, s);
    return rec?.name === nameOrSlug;
  });
  if (!slug) throw new Error(`Skill não encontrada: ${nameOrSlug}`);

  const skill = loadSkillRecord(workspaceDir, slug);
  const skillDir = path.join(getSkillsRoot(workspaceDir), slug);

  if (refPath) {
    const safe = String(refPath).replace(/\\/g, "/").replace(/^\/+/, "");
    const target = path.resolve(skillDir, safe);
    if (!target.startsWith(path.resolve(skillDir))) {
      throw new Error("Referência fora da skill.");
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      throw new Error(`Referência não encontrada: ${safe}`);
    }
    const content = fs.readFileSync(target, "utf8");
    return {
      level: 2,
      slug,
      ref: safe,
      content: content.slice(0, MAX_REF_CHARS),
    };
  }

  return {
    level: 1,
    slug,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    formats: skill.formats,
    tasks: skill.tasks,
    content: skill.body.slice(0, MAX_BODY_EXCERPT),
    truncated: skill.body.length > MAX_BODY_EXCERPT,
    references: listSkillReferences(skillDir),
  };
}

function listSkillReferences(skillDir) {
  const refs = [];
  for (const sub of ["references", "assets"]) {
    const dir = path.join(skillDir, sub);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith(".md")) refs.push(`${sub}/${file}`);
    }
  }
  return refs.sort();
}

function loadBundleFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

export function listSkillBundles(workspaceDir) {
  const dir = getBundlesDir(workspaceDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const data = loadBundleFile(path.join(dir, file));
      return {
        slug: data.name || file.replace(/\.json$/, ""),
        name: data.name || file.replace(/\.json$/, ""),
        description: data.description || "",
        skills: data.skills || [],
        tasks: (data.tasks || []).map((t) => String(t).toLowerCase()),
        formats: normalizeFormatList(data.formats || []),
        instruction: data.instruction || "",
      };
    });
}

export function resolveBundleForTask(workspaceDir, { task = "overlay", format = "SHORT" } = {}) {
  const config = loadStudioAgentsConfig(workspaceDir);
  const map = config.skillBundleByTask || {};
  const fmt = normalizeFormatList([format])[0] || "SHORT";
  const formatKey = `${task}:${fmt}`;
  const preferred = map[formatKey] || map[task] || map.default;
  const bundles = listSkillBundles(workspaceDir);
  if (!bundles.length) return null;

  let bundle = preferred ? bundles.find((b) => b.slug === preferred) : null;
  if (!bundle) {
    bundle = bundles.find((b) => {
      const taskOk = !b.tasks.length || b.tasks.includes(String(task).toLowerCase());
      const fmt = normalizeFormatList([format])[0];
      const fmtOk = !b.formats.length || b.formats.includes(fmt);
      return taskOk && fmtOk;
    });
  }
  return bundle || bundles[0];
}

export function resolveBundleSkills(workspaceDir, bundle) {
  if (!bundle) return { loaded: [], skipped: [] };
  const loaded = [];
  const skipped = [];
  for (const name of bundle.skills || []) {
    try {
      loaded.push(viewSkill(workspaceDir, name));
    } catch {
      skipped.push(name);
    }
  }
  return { loaded, skipped, bundle };
}

export function buildSkillsPromptAddendum(
  workspaceDir,
  { task = "overlay", format = "SHORT", maxSkills = 4 } = {},
) {
  const config = loadStudioAgentsConfig(workspaceDir);
  if (config.skillsInAgentMode === false) return "";

  const bundle = resolveBundleForTask(workspaceDir, { task, format });
  if (!bundle) return "";

  const { loaded, skipped } = resolveBundleSkills(workspaceDir, bundle);
  const slice = loaded.slice(0, maxSkills);
  if (!slice.length) return "";

  const lines = [
    "",
    `## SKILLS DO ESTÚDIO — bundle "${bundle.slug}" (Hermes/OpenClaw — disclosure progressiva)`,
  ];
  if (bundle.instruction) {
    lines.push(bundle.instruction.trim());
  }
  for (const skill of slice) {
    lines.push(`### Skill: ${skill.name} (${skill.slug})`);
    lines.push(skill.description || "(sem descrição)");
    if (skill.content) {
      lines.push(skill.content.trim().slice(0, 1200));
    }
  }
  if (skipped.length) {
    lines.push(`Skills ausentes no vault (ignoradas): ${skipped.join(", ")}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function normalizeStudioFormat(format) {
  const f = String(format || "").toUpperCase();
  if (f === "SHORTS" || f === "SHORT") return "SHORT";
  if (f === "LONGO" || f === "LONG") return "LONG";
  return f || null;
}

export function resolveMaxSkillsForTask(task, format = "SHORT") {
  const fmt = normalizeFormatList([format])[0] || "SHORT";
  if (task === "ideas") return 7;
  if (task === "script") return fmt === "LONG" ? 7 : 6;
  if (task === "metadata" || task === "upload") return 5;
  return 4;
}

export function resolveBundlePreview(workspaceDir, { task = "ideas", format = "SHORT" } = {}) {
  const fmt = normalizeStudioFormat(format) || normalizeFormatList([format])[0] || "SHORT";
  const bundle = resolveBundleForTask(workspaceDir, { task, format: fmt });
  const maxSkills = resolveMaxSkillsForTask(task, fmt);
  const skillSlugs = bundle?.skills || [];
  return {
    task,
    format: fmt,
    bundleSlug: bundle?.slug || null,
    bundleName: bundle?.name || null,
    skillSlugs,
    maxSkills,
    injectedCount: Math.min(skillSlugs.length, maxSkills),
  };
}

export function buildStudioAgentsPromptAddendum(workspaceDir, opts = {}) {
  const task = opts.task || "overlay";
  const format = normalizeStudioFormat(opts.format) || opts.format || "SHORT";
  const parts = [
    buildLearningsPromptAddendum(workspaceDir, {
      ...opts,
      format,
    }),
    buildSkillsPromptAddendum(workspaceDir, {
      ...opts,
      format,
      maxSkills: opts.maxSkills ?? resolveMaxSkillsForTask(task, format),
    }),
  ];
  return compressPromptAddendum(parts.filter(Boolean).join("\n"));
}

/** Anexa memória + skills bundle ao prompt do Creator / metadados / overlays. */
export function injectStudioAgentsContext(prompt, workspaceDir, { niche = "Geral", task = "overlay", format = null } = {}) {
  const addendum = buildStudioAgentsPromptAddendum(workspaceDir, {
    niche,
    task,
    format: normalizeStudioFormat(format),
  });
  if (!addendum) return prompt;
  return `${prompt}${addendum}`;
}

export function getSkillsRegistryStatus(workspaceDir) {
  const skills = listSkills(workspaceDir);
  const bundles = listSkillBundles(workspaceDir);
  const pending = listSkillWorkshopProposals(workspaceDir);
  const config = loadStudioAgentsConfig(workspaceDir);
  return {
    skillsCount: skills.length,
    bundlesCount: bundles.length,
    pendingProposals: pending.length,
    skillsInAgentMode: config.skillsInAgentMode !== false,
    skillsWriteApproval: config.skillsWriteApproval !== false,
    skillBundleByTask: config.skillBundleByTask || {},
    skills: skills.slice(0, 24),
    bundles,
    pending: pending.slice(0, 8),
  };
}

function proposalId() {
  return `prop-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}

export function buildWorkshopCaptureFingerprint({
  skill = "",
  niche = "",
  format = "SHORT",
  category = "",
  projectName = "",
} = {}) {
  return [
    String(skill).trim().toLowerCase(),
    String(niche).trim().toLowerCase(),
    String(format).trim().toUpperCase(),
    String(category).trim().toLowerCase(),
    String(projectName).trim().toLowerCase(),
  ].join("|");
}

function getWorkshopHandledSets(workspaceDir) {
  const config = loadStudioAgentsConfig(workspaceDir);
  const raw = config.workshopHandled || {};
  return {
    applied: new Set(Array.isArray(raw.applied) ? raw.applied : []),
    rejected: new Set(Array.isArray(raw.rejected) ? raw.rejected : []),
  };
}

export function rememberWorkshopHandled(workspaceDir, fingerprint, outcome = "applied") {
  const fp = String(fingerprint || "").trim();
  if (!fp) return;
  const config = loadStudioAgentsConfig(workspaceDir);
  const raw = config.workshopHandled || { applied: [], rejected: [] };
  const applied = Array.isArray(raw.applied) ? [...raw.applied] : [];
  const rejected = Array.isArray(raw.rejected) ? [...raw.rejected] : [];

  if (outcome === "rejected") {
    if (!rejected.includes(fp)) rejected.unshift(fp);
    const idx = applied.indexOf(fp);
    if (idx >= 0) applied.splice(idx, 1);
  } else {
    if (!applied.includes(fp)) applied.unshift(fp);
    const idx = rejected.indexOf(fp);
    if (idx >= 0) rejected.splice(idx, 1);
  }

  saveStudioAgentsConfig(workspaceDir, {
    workshopHandled: {
      applied: applied.slice(0, 150),
      rejected: rejected.slice(0, 150),
    },
  });
}

export function isWorkshopCaptureHandled(workspaceDir, fingerprint) {
  const fp = String(fingerprint || "").trim();
  if (!fp) return false;
  const { applied, rejected } = getWorkshopHandledSets(workspaceDir);
  return applied.has(fp) || rejected.has(fp);
}

export function fingerprintFromProposal(proposal = {}) {
  if (proposal.fingerprint) return proposal.fingerprint;
  if (proposal.captureLine) {
    const line = String(proposal.captureLine);
    const nicheMatch = line.match(/\*\*([^*]+)\*\*/);
    const projectMatch = line.match(/\/\s*score\s*\d+\s*\/\s*([^\n]+)/i);
    const categoryMatch = String(proposal.summary || "").match(/·\s*([^·]+)\s*·\s*score/i);
    return buildWorkshopCaptureFingerprint({
      skill: proposal.skill,
      niche: nicheMatch?.[1] || "",
      format: line.includes("/ LONG") ? "LONG" : "SHORT",
      category: categoryMatch?.[1]?.trim() || "",
      projectName: projectMatch?.[1]?.trim() || "",
    });
  }
  return `legacy::${proposal.id || proposal.summary || "unknown"}`;
}

export function shouldSkipWorkshopStage(workspaceDir, {
  skill,
  niche,
  format,
  category,
  projectName,
  captureLine,
  fingerprint,
  pending = [],
} = {}) {
  const fp = fingerprint || buildWorkshopCaptureFingerprint({
    skill, niche, format, category, projectName,
  });
  if (isWorkshopCaptureHandled(workspaceDir, fp)) return { skip: true, reason: "handled", fingerprint: fp };

  const skillPath = path.join(getSkillsRoot(workspaceDir), skill, "SKILL.md");
  if (captureLine && fs.existsSync(skillPath)) {
    const content = fs.readFileSync(skillPath, "utf8");
    if (content.includes(captureLine)) {
      rememberWorkshopHandled(workspaceDir, fp, "applied");
      return { skip: true, reason: "already_in_skill", fingerprint: fp };
    }
  }

  if (pending.some((p) => p.fingerprint === fp)) {
    return { skip: true, reason: "pending", fingerprint: fp };
  }

  return { skip: false, fingerprint: fp };
}

export function listSkillWorkshopProposals(workspaceDir) {
  const dir = getPendingDir(workspaceDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
        return { id: data.id || file.replace(/\.json$/, ""), file, ...data };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export function stageSkillProposal(workspaceDir, proposal = {}) {
  const config = loadStudioAgentsConfig(workspaceDir);
  if (config.skillsWriteApproval === false) {
    return applySkillProposal(workspaceDir, { ...proposal, id: proposalId() });
  }
  const dir = getPendingDir(workspaceDir);
  fs.mkdirSync(dir, { recursive: true });
  const id = proposal.id || proposalId();
  const record = {
    id,
    action: proposal.action || "patch",
    skill: proposal.skill,
    summary: proposal.summary || "",
    old_string: proposal.old_string || "",
    new_string: proposal.new_string || "",
    content: proposal.content || "",
    source: proposal.source || "studio-agents",
    fingerprint: proposal.fingerprint || "",
    captureLine: proposal.captureLine || "",
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(record, null, 2), "utf8");
  return { staged: true, id, record };
}

export function applySkillProposal(workspaceDir, proposal) {
  const slug = proposal.skill;
  if (!slug) throw new Error("Proposta sem skill.");
  const skillPath = path.join(getSkillsRoot(workspaceDir), slug, "SKILL.md");
  if (!fs.existsSync(skillPath)) throw new Error(`Skill não encontrada: ${slug}`);

  let content = fs.readFileSync(skillPath, "utf8");
  const action = proposal.action || "patch";

  if (proposal.captureLine && content.includes(proposal.captureLine)) {
    return { applied: true, skill: slug, action, skipped: true, reason: "already_in_skill" };
  }

  if (action === "patch" && proposal.old_string && proposal.new_string) {
    if (!content.includes(proposal.old_string)) {
      throw new Error("old_string não encontrado na skill.");
    }
    content = content.replace(proposal.old_string, proposal.new_string);
  } else if (action === "edit" && proposal.content) {
    content = proposal.content;
  } else {
    throw new Error(`Ação não suportada ou parâmetros incompletos: ${action}`);
  }

  fs.writeFileSync(skillPath, content, "utf8");
  return { applied: true, skill: slug, action };
}

export function applyWorkshopProposalById(workspaceDir, id) {
  const dir = getPendingDir(workspaceDir);
  const filePath = path.join(dir, `${id}.json`);
  if (!fs.existsSync(filePath)) throw new Error("Proposta não encontrada.");
  const proposal = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const result = applySkillProposal(workspaceDir, proposal);
  rememberWorkshopHandled(workspaceDir, fingerprintFromProposal(proposal), "applied");
  fs.unlinkSync(filePath);
  return result;
}

export function rejectWorkshopProposal(workspaceDir, id) {
  const filePath = path.join(getPendingDir(workspaceDir), `${id}.json`);
  if (!fs.existsSync(filePath)) throw new Error("Proposta não encontrada.");
  let fingerprint = id;
  try {
    const proposal = JSON.parse(fs.readFileSync(filePath, "utf8"));
    fingerprint = fingerprintFromProposal(proposal);
  } catch { /* ignore */ }
  fs.unlinkSync(filePath);
  rememberWorkshopHandled(workspaceDir, fingerprint, "rejected");
  return { rejected: true, id, fingerprint };
}

export function ensureDefaultSkillBundles(workspaceDir) {
  const dir = getBundlesDir(workspaceDir);
  fs.mkdirSync(dir, { recursive: true });

  const defaults = [
    {
      file: "studio-overlay-agent.json",
      data: {
        name: "studio-overlay-agent",
        description: "Planejamento de overlays — HyperFrames, retenção Shorts, ganchos limpos",
        tasks: ["overlay"],
        formats: ["SHORT", "LONG"],
        skills: ["hyperframes", "viral-youtube-shorts", "viral-hooks"],
        instruction:
          "Combine catálogo HyperFrames com regras VVSA Shorts. Gancho limpo até 1.5s — sem overlay informativo no bloco 1. Alterne tipos de overlay; dados novos, nunca eco da narração.",
      },
    },
    {
      file: "shorts-ideas.json",
      data: {
        name: "shorts-ideas",
        description: "Ideação Short — pilares, matriz, hooks, estratégia de canal",
        tasks: ["ideas"],
        formats: ["SHORT"],
        skills: ["viral-short-form-ideas", "content-strategy", "viral-hooks", "video-marketing", "viral-youtube-shorts"],
        instruction: "Varie hook_angle entre as 10 ideias. Pilares do nicho + searchable/shareable.",
      },
    },
    {
      file: "shorts-script.json",
      data: {
        name: "shorts-script",
        description: "Roteiro Short — UGC, ads, captions, estrutura viral",
        tasks: ["script"],
        formats: ["SHORT"],
        skills: ["viral-short-form", "ugc-scriptwriter", "ad-concept-generator", "ai-ugc-ads", "viral-captions-and-ctas"],
        instruction: "Narração UGC autêntica PT-BR, CTA declarativo (sem engagement bait).",
      },
    },
    {
      file: "long-ideas.json",
      data: {
        name: "long-ideas",
        description: "Ideação vídeo longo — pilares, SEO, clusters documentais",
        tasks: ["ideas"],
        formats: ["LONG"],
        skills: ["content-strategy", "viral-short-form-ideas", "youtube-seo", "video-marketing", "viral-hooks"],
        instruction: "Títulos pesquisáveis + promessa de retenção 10–20 min.",
      },
    },
    {
      file: "publish-seo.json",
      data: {
        name: "publish-seo",
        description: "Metadados e publicação — SEO, thumbnail, captions",
        tasks: ["metadata", "upload"],
        formats: ["SHORT", "LONG"],
        skills: ["youtube-seo", "youtube-thumbnail", "viral-captions-and-ctas"],
        instruction:
          "Título pesquisável + thumbnail-first. Descrição: 2 primeiras linhas com keyword. Comentário fixo com stakes reais.",
      },
    },
    {
      file: "long-documentary.json",
      data: {
        name: "long-documentary",
        description: "Vídeo longo documental — overlays, BGM, Remotion",
        tasks: ["overlay", "script"],
        formats: ["LONG"],
        skills: ["hyperframes", "remotion_docs", "epidemic_sound", "youtube-seo"],
        instruction:
          "Gancho 5s, gap 18s entre overlays, chapter stingers. Infográficos > cards flutuantes no centro.",
      },
    },
    {
      file: "openmontage-prod.json",
      data: {
        name: "openmontage-prod",
        description: "Produção inspirada em referência — OpenMontage adaptado Lumiera",
        tasks: ["ideas", "script", "metadata"],
        formats: ["SHORT", "LONG"],
        skills: [
          "openmontage-reference-video",
          "openmontage-preflight",
          "openmontage-reviewer",
          "viral-hooks",
          "viral-short-form",
          "ugc-scriptwriter",
          "content-strategy",
          "hyperframes",
          "remotion-best-practices",
          "youtube-seo",
          "youtube-thumbnail",
        ],
        instruction:
          "Preflight capability-menu → analisar referência com twist obrigatório → reviewer em cada estágio. Nunca cópia carbono.",
      },
    },
  ];

  for (const { file, data } of defaults) {
    const fp = path.join(dir, file);
    if (!fs.existsSync(fp)) {
      fs.writeFileSync(fp, JSON.stringify(data, null, 2), "utf8");
    }
  }
}