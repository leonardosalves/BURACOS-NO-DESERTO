import fs from "fs";
import path from "path";
import { applyTitleVariant, loadTitleExperiment } from "./youtubeTitleAnalytics.js";
import { applyThumbnailVariant, loadThumbnailExperiment } from "./thumbnailExperiment.js";

function listProjectDirs(projectsRoot) {
  if (!fs.existsSync(projectsRoot)) return [];
  const roots = [projectsRoot];
  for (const sub of ["videos longos", "videos curtos shorts"]) {
    const p = path.join(projectsRoot, sub);
    if (fs.existsSync(p)) roots.push(p);
  }

  const projects = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(root, entry.name);
      if (fs.existsSync(path.join(dir, "config_qanat.json"))) {
        projects.push(dir);
      }
    }
  }
  return [...new Set(projects)];
}

function hoursSince(isoDate) {
  if (!isoDate) return Infinity;
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60);
}

function nextVariantId(experiment) {
  const variants = experiment.variants || [];
  if (!variants.length) return null;
  const currentIdx = variants.findIndex((v) => v.id === experiment.activeVariantId);
  const next = variants[(currentIdx + 1) % variants.length];
  return next?.id || null;
}

export async function tickTitleRotations(workspaceDir, projectsRoot) {
  const projects = listProjectDirs(projectsRoot);
  const results = [];

  for (const projectDir of projects) {
    const experiment = loadTitleExperiment(projectDir);
    if (!experiment || experiment.status !== "running" || !experiment.videoId) continue;

    const rotateHours = Number(experiment.rotateHours) || 48;
    const lastApplied = experiment.lastAppliedAt || experiment.startedAt;
    if (hoursSince(lastApplied) < rotateHours) continue;

    const variantId = nextVariantId(experiment);
    if (!variantId) continue;

    try {
      const applied = await applyTitleVariant(workspaceDir, projectDir, variantId);
      results.push({
        project: path.basename(projectDir),
        variantId,
        appliedTitle: applied.appliedTitle,
        ok: true,
      });
    } catch (err) {
      results.push({
        project: path.basename(projectDir),
        variantId,
        ok: false,
        error: err.message,
      });
    }
  }

  for (const projectDir of projects) {
    const thumbExp = loadThumbnailExperiment(projectDir);
    if (!thumbExp || thumbExp.status !== "running" || !thumbExp.videoId) continue;

    const rotateHours = Number(thumbExp.rotateHours) || 72;
    const lastApplied = thumbExp.lastAppliedAt || thumbExp.startedAt;
    if (hoursSince(lastApplied) < rotateHours) continue;

    const variants = thumbExp.variants || [];
    const currentIdx = variants.findIndex((v) => v.id === thumbExp.activeVariantId);
    const next = variants[(currentIdx + 1) % variants.length];
    if (!next?.id) continue;

    try {
      await applyThumbnailVariant(workspaceDir, projectDir, next.id);
      results.push({ project: path.basename(projectDir), type: "thumbnail", variantId: next.id, ok: true });
    } catch (err) {
      results.push({ project: path.basename(projectDir), type: "thumbnail", ok: false, error: err.message });
    }
  }

  return results;
}

let schedulerHandle = null;

export function startTitleRotationScheduler({ workspaceDir, projectsRoot, intervalMs = 15 * 60 * 1000 }) {
  if (schedulerHandle) return schedulerHandle;

  const run = async () => {
    try {
      const results = await tickTitleRotations(workspaceDir, projectsRoot);
      if (results.length) {
        console.log(`[TitleRotation] ${results.length} rotação(ões):`, results.map((r) => `${r.project}:${r.variantId}`).join(", "));
      }
    } catch (err) {
      console.warn("[TitleRotation] Erro no scheduler:", err.message);
    }
  };

  run();
  schedulerHandle = setInterval(run, intervalMs);
  return schedulerHandle;
}