/**
 * Orquestração do Studio Agents — área separada do fluxo normal de geração.
 */

import fs from "fs";
import path from "path";
import { detectVideoFormat } from "./formatResolver.js";
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
  stageSkillProposal,
} from "./skillsRegistry.js";

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
  if (c.includes("overlay") || c.includes("timing") || c.includes("hyperframe")) return "hyperframes";
  if (c.includes("narrat") || c.includes("script") || c.includes("cta") || c.includes("ugc")) return "ugc-scriptwriter";
  if (c.includes("metadata") || c.includes("seo") || c.includes("title")) return "youtube-seo";
  if (c.includes("caption") || c.includes("hashtag")) return "viral-captions-and-ctas";
  return "studio-agents-hermes";
}

/** Após capture com issues, propõe patch de skill no workshop (com aprovação). */
export function maybeStageWorkshopFromCapture(workspaceDir, {
  niche = "Geral",
  format = "SHORT",
  score = 100,
  patterns = [],
  projectName = "",
} = {}) {
  if (!patterns.length || score >= 88) return null;

  const pending = listSkillWorkshopProposals(workspaceDir);
  const autoPending = pending.filter((p) => p.source === "auto-capture");
  if (autoPending.length >= 5) return null;

  const primary = patterns[0];
  const dedupeKey = `${niche}::${primary.category}::${Math.round(score)}`;
  if (autoPending.some((p) => String(p.summary || "").includes(dedupeKey.split("::")[1]) && String(p.summary || "").includes(niche))) {
    return null;
  }
  const skill = resolveSkillSlugForPattern(primary.category);
  const marker = "## Ver também";
  const bulletLines = patterns.slice(0, 4).map((p) => `- \`${p.category}\` ${p.description}`).join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  const header = `## Aprendizados capturados (workshop — ${stamp})`;
  const block = `${header}\n\n**${niche}** / ${format} / score ${score}${projectName ? ` / ${projectName}` : ""}\n${bulletLines}\n`;

  return stageSkillProposal(workspaceDir, {
    skill,
    action: "patch",
    summary: `Auto-capture: ${niche} · ${primary.category} · score ${score}`,
    old_string: marker,
    new_string: `${block}\n${marker}`,
    source: "auto-capture",
  });
}

export function captureQualityRun(workspaceDir, projectDir, quality, source = "quality_check") {
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

export function getNicheLearnings(workspaceDir, niche, task = "overlay", format = null) {
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