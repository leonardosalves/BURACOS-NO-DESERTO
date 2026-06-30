/**
 * Registro de skills do Studio Agents — padrões Hermes (progressive disclosure) + OpenClaw (bundles, gating).
 * Skills em <workspace>/.agents/skills/ (equivalente OpenClaw project-agent skills).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { buildLearningsPromptAddendum, loadStudioAgentsConfig } from "./agentMemory.js";

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
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: content, rawFrontmatter: "" };
  }
  const raw = match[1];
  const body = match[2];
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

function parseNestedLumieraMeta(rawFrontmatter = "") {
  const out = {};
  if (/^\s*lumiera:\s*true/m.test(rawFrontmatter)) out.lumiera = true;
  const fmt = rawFrontmatter.match(/^\s*formats:\s*\[([^\]]+)\]/m);
  if (fmt) {
    out.formats = fmt[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  const tasks = rawFrontmatter.match(/^\s*tasks:\s*\[([^\]]+)\]/m);
  if (tasks) {
    out.tasks = tasks[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  const cat = rawFrontmatter.match(/^\s*category:\s*(.+)$/m);
  if (cat) out.category = cat[1].trim().replace(/^['"]|['"]$/g, "");
  return out;
}

function readLumieraMeta(meta = {}, rawFrontmatter = "") {
  const nested = parseNestedLumieraMeta(rawFrontmatter);
  if (Object.keys(nested).length) return nested;
  const lumiera = meta.metadata?.lumiera ?? meta.lumiera;
  if (typeof lumiera === "object" && lumiera !== null) return lumiera;
  if (meta.lumiera === true || meta.lumiera === "true") {
    return { lumiera: true };
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
  const preferred = map[task] || map.default;
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

function resolveMaxSkillsForTask(task) {
  if (task === "ideas") return 7;
  if (task === "script") return 6;
  if (task === "metadata" || task === "upload") return 5;
  return 4;
}

export function buildStudioAgentsPromptAddendum(workspaceDir, opts = {}) {
  const task = opts.task || "overlay";
  const parts = [
    buildLearningsPromptAddendum(workspaceDir, {
      ...opts,
      format: normalizeStudioFormat(opts.format) || opts.format,
    }),
    buildSkillsPromptAddendum(workspaceDir, {
      ...opts,
      format: normalizeStudioFormat(opts.format) || opts.format,
      maxSkills: opts.maxSkills ?? resolveMaxSkillsForTask(task),
    }),
  ];
  return parts.filter(Boolean).join("\n");
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
  fs.unlinkSync(filePath);
  return result;
}

export function rejectWorkshopProposal(workspaceDir, id) {
  const filePath = path.join(getPendingDir(workspaceDir), `${id}.json`);
  if (!fs.existsSync(filePath)) throw new Error("Proposta não encontrada.");
  fs.unlinkSync(filePath);
  return { rejected: true, id };
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
      file: "shorts-viral.json",
      data: {
        name: "shorts-viral",
        description: "Roteiro Short viral — hooks, UGC, captions, ideias",
        tasks: ["script", "ideas"],
        formats: ["SHORT"],
        skills: [
          "viral-short-form",
          "viral-hooks",
          "viral-captions-and-ctas",
          "ugc-scriptwriter",
          "viral-short-form-ideas",
        ],
        instruction:
          "Priorize gancho em 3 camadas, narração UGC autêntica, CTA declarativo (sem engagement bait). Varie hook_angle entre ideias.",
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
  ];

  for (const { file, data } of defaults) {
    const fp = path.join(dir, file);
    if (!fs.existsSync(fp)) {
      fs.writeFileSync(fp, JSON.stringify(data, null, 2), "utf8");
    }
  }
}