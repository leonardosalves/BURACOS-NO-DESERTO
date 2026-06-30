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

  return { run, patterns };
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
  getSkillsRegistryStatus,
  listSkills,
  listSkillBundles,
  viewSkill,
  listSkillWorkshopProposals,
  applyWorkshopProposalById,
  rejectWorkshopProposal,
  ensureDefaultSkillBundles,
} from "./skillsRegistry.js";