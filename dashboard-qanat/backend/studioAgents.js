/**
 * Orquestração do Studio Agents — área separada do fluxo normal de geração.
 * E também monitoramento/controle de prompts no Express router (export default).
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { detectVideoFormat } from "./formatResolver.js";
import { loadChannelPrompts } from "./channelProfiles.js";
import {
  buildLearningsPromptAddendum,
  consolidateAllNiches,
  extractPatternsFromQuality,
  getLearnings,
  getStudioAgentStatus,
  ingestPatternsToNiche,
  loadStudioAgentsConfig,
  previewConsolidationAllNiches,
  recordProjectRun,
  saveStudioAgentsConfig,
  shouldSkipAutoCapture,
} from "./agentMemory.js";
import {
  listSkillWorkshopProposals,
  shouldSkipWorkshopStage,
  stageSkillProposal,
} from "./skillsRegistry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_DIR = path.resolve(__dirname, "..", "..", "channels");

export { shouldSkipAutoCapture };

export {
  buildLearningsPromptAddendum,
  getLearnings,
  loadStudioAgentsConfig,
  saveStudioAgentsConfig,
};

function readProjectJsonSafe(projectDir, name, fallback) {
  try {
    const p = path.join(projectDir, name);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function resolveSkillSlugForPattern(category = "") {
  const c = String(category).toLowerCase();
  if (c.includes("overlay") || c.includes("timing") || c.includes("hyperframe"))
    return "hyperframes";
  if (
    c.includes("narrat") ||
    c.includes("script") ||
    c.includes("cta") ||
    c.includes("ugc")
  )
    return "ugc-scriptwriter";
  if (c.includes("metadata") || c.includes("seo") || c.includes("title"))
    return "youtube-seo";
  if (c.includes("caption") || c.includes("hashtag"))
    return "viral-captions-and-ctas";
  return "studio-agents-hermes";
}

/** Após capture com issues, propõe patch de skill no workshop (com aprovação). */
export function maybeStageWorkshopFromCapture(
  workspaceDir,
  {
    niche = "Geral",
    format = "SHORT",
    score = 100,
    patterns = [],
    projectName = "",
  } = {}
) {
  if (!patterns.length || score >= 88) return null;

  const pending = listSkillWorkshopProposals(workspaceDir);
  const autoPending = pending.filter((p) => p.source === "auto-capture");
  if (autoPending.length >= 5) return null;

  const primary = patterns[0];
  const skill = resolveSkillSlugForPattern(primary.category);
  const captureLine = `**${niche}** / ${format} / score ${score}${projectName ? ` / ${projectName}` : ""}`;

  const skip = shouldSkipWorkshopStage(workspaceDir, {
    skill,
    niche,
    format,
    category: primary.category,
    projectName,
    captureLine,
    pending: autoPending,
  });
  if (skip.skip) return null;

  const marker = "## Ver também";
  const bulletLines = patterns
    .slice(0, 4)
    .map((p) => `- \`${p.category}\` ${p.description}`)
    .join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  const header = `## Aprendizados capturados (workshop — ${stamp})`;
  const block = `${header}\n\n${captureLine}\n${bulletLines}\n`;

  return stageSkillProposal(workspaceDir, {
    skill,
    action: "patch",
    summary: `Auto-capture: ${niche} · ${primary.category} · score ${score}`,
    old_string: marker,
    new_string: `${block}\n${marker}`,
    source: "auto-capture",
    fingerprint: skip.fingerprint,
    captureLine,
  });
}

export function captureQualityRun(
  workspaceDir,
  projectDir,
  quality,
  source = "quality_check"
) {
  const config = readProjectJsonSafe(projectDir, "config_qanat.json", {});
  const timings = readProjectJsonSafe(projectDir, "block_timings.json", {});
  const format = detectVideoFormat(config, Number(timings.total_duration) || 0);
  const patterns = extractPatternsFromQuality(quality, format);
  const run = recordProjectRun(workspaceDir, projectDir, {
    niche: config.niche || "Geral",
    format,
    score: quality.score,
    patterns,
    issueCount: patterns.length,
    source,
  });

  if (patterns.length) {
    ingestPatternsToNiche(workspaceDir, config.niche || "Geral", patterns);
  }

  let workshop = null;
  try {
    workshop = maybeStageWorkshopFromCapture(workspaceDir, {
      niche: config.niche || "Geral",
      format,
      score: quality.score,
      patterns,
      projectName: path.basename(projectDir),
    });
  } catch (err) {
    console.warn("[Studio Agents] Workshop auto-capture falhou:", err.message);
  }

  return { run, patterns, workshop };
}

export function reflectProject(workspaceDir, projectDir, quality) {
  return captureQualityRun(workspaceDir, projectDir, quality, "reflect");
}

export function runConsolidation(workspaceDir) {
  const config = loadStudioAgentsConfig(workspaceDir);
  const threshold = Number(config.promoteThreshold) || 3;
  const results = consolidateAllNiches(workspaceDir, threshold);
  return { threshold, results };
}

export function previewConsolidation(workspaceDir) {
  const config = loadStudioAgentsConfig(workspaceDir);
  const threshold = Number(config.promoteThreshold) || 3;
  return previewConsolidationAllNiches(workspaceDir, threshold);
}

export function getDashboard(workspaceDir) {
  return getStudioAgentStatus(workspaceDir);
}

export function getNicheLearnings(
  workspaceDir,
  niche,
  task = "overlay",
  format = null
) {
  return getLearnings(workspaceDir, { niche, task, format, limit: 12 });
}

export {
  buildStudioAgentsPromptAddendum,
  injectStudioAgentsContext,
  buildSkillsPromptAddendum,
  resolveBundleForTask,
  resolveBundlePreview,
  resolveMaxSkillsForTask,
  getSkillsRegistryStatus,
  listSkills,
  listSkillBundles,
  viewSkill,
  listSkillWorkshopProposals,
  applyWorkshopProposalById,
  rejectWorkshopProposal,
  ensureDefaultSkillBundles,
} from "./skillsRegistry.js";

// ─── EXPRESS ROUTER PARA MONITORAMENTO E CONTROLE ───
const router = Router();

// Lista agentes e status
router.get("/:channelId", (req, res) => {
  const prompts = loadChannelPrompts(req.params.channelId);
  const agentes = [
    {
      id: "roteiro",
      nome: "Agente de Roteiro",
      prompt: prompts.narracao ? "configurado" : "padrão",
      status: "online",
    },
    {
      id: "visual",
      nome: "Agente Visual",
      prompt: prompts.visual ? "configurado" : "padrão",
      status: "online",
    },
    {
      id: "pesquisa",
      nome: "Agente de Pesquisa",
      prompt: prompts.pesquisa ? "configurado" : "padrão",
      status: "online",
    },
    { id: "tts", nome: "Agente TTS", prompt: "sistema", status: "online" },
  ];
  res.json({ ok: true, agentes });
});

// Editor de prompts (lê/salva .md do canal)
router.get("/:channelId/prompts/:nome", (req, res) => {
  const p = path.join(
    CHANNELS_DIR,
    req.params.channelId,
    "prompts",
    `${req.params.nome}.md`
  );
  res.json({
    ok: true,
    conteudo: fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "",
  });
});

router.put("/:channelId/prompts/:nome", (req, res) => {
  const dir = path.join(CHANNELS_DIR, req.params.channelId, "prompts");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${req.params.nome}.md`),
    req.body.conteudo || "",
    "utf8"
  );
  res.json({ ok: true });
});

// Logs de execução
router.get("/:channelId/logs", (req, res) => {
  const logsPath = path.join(
    CHANNELS_DIR,
    req.params.channelId,
    "data",
    "agent_logs.json"
  );
  const logs = fs.existsSync(logsPath)
    ? JSON.parse(fs.readFileSync(logsPath, "utf8"))
    : [];
  res.json({ ok: true, logs });
});

export default router;
