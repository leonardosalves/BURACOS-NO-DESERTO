/**
 * Clip Factory — extrai ideias Short de um projeto longo → fila editorial (OpenMontage).
 */

import fs from "fs";
import path from "path";
import { enqueueEditorialIdeas } from "./youtubeEditorialQueue.js";

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

export function isLongFormProject(config = {}) {
  const aspect = String(config.aspect_ratio || "").trim();
  const format = String(config.video_format || config.format_type || config.format || "").toUpperCase();
  return aspect === "16:9" || format === "LONGO" || format === "LONG";
}

/** block_phrases pode ser string ou { block, phrase } — extrai texto legível. */
export function phraseFromBlockEntry(entry) {
  if (entry == null) return "";
  if (typeof entry === "string") return entry.replace(/\s+/g, " ").trim();
  if (typeof entry === "object") {
    const raw = entry.phrase ?? entry.text ?? entry.hook ?? entry.content ?? entry.line ?? "";
    return String(raw).replace(/\s+/g, " ").trim();
  }
  const s = String(entry).replace(/\s+/g, " ").trim();
  return s === "[object Object]" ? "" : s;
}

function hookFromText(text = "", maxWords = 10) {
  const words = phraseFromBlockEntry(text).split(" ").filter(Boolean);
  if (!words.length) return "";
  return words.slice(0, maxWords).join(" ");
}

function titleForShort(baseTitle, angle, index) {
  const clean = String(baseTitle || "Vídeo").trim().slice(0, 80);
  const prefix = index === 0 ? "⚡" : `#${index + 1}`;
  return `${prefix} ${angle} — ${clean}`.slice(0, 240);
}

/**
 * Gera ideias Short a partir de blocos do projeto longo.
 */
export function buildShortIdeasFromLongProject(config = {}, storyboard = {}, timings = {}, projectSlug = "") {
  if (!isLongFormProject(config)) {
    return { ok: false, error: "Clip Factory só aplica a projetos longos (16:9 / LONGO)." };
  }

  const blockPhrases = Array.isArray(config.block_phrases)
    ? config.block_phrases.map(phraseFromBlockEntry).filter(Boolean)
    : [];
  const starts = Array.isArray(timings.starts) ? timings.starts : [];
  const durations = Array.isArray(timings.durations) ? timings.durations : [];
  const niche = String(config.niche || storyboard.niche || "Geral").trim();
  const projectTitle = String(config.project_title || config.title || projectSlug || "Vídeo longo").trim();
  const listItems = Array.isArray(storyboard.list_items) ? storyboard.list_items : [];

  const ideas = [];
  const maxIdeas = 8;

  if (blockPhrases.length > 0) {
    const introHook = hookFromText(blockPhrases[0], 12);
    if (introHook) {
      ideas.push({
        title: titleForShort(projectTitle, "Gancho em 60s", 0),
        hookPt: introHook,
        mechanic: "clip-factory-hook",
        whyWorks: "Abre com o mesmo gancho do longo, pacing acelerado para Shorts.",
        angle: introHook,
      });
    }
  }

  const bodyBlocks = blockPhrases.slice(1, Math.max(1, blockPhrases.length - 1));
  for (let i = 0; i < bodyBlocks.length && ideas.length < maxIdeas; i++) {
    const phrase = phraseFromBlockEntry(bodyBlocks[i]);
    if (phrase.length < 24) continue;
    const hook = hookFromText(phrase, 14);
    const blockNum = i + 2;
    const dur = Number(durations[blockNum - 1]);
    const start = Number(starts[blockNum - 1]);
    const timeHint = Number.isFinite(start) && Number.isFinite(dur)
      ? ` (~${Math.round(start)}s–${Math.round(start + dur)}s no longo)`
      : "";

    ideas.push({
      title: titleForShort(projectTitle, `Trecho ${blockNum}${timeHint}`, ideas.length),
      hookPt: hook,
      mechanic: `clip-factory-bloco-${blockNum}`,
      whyWorks: `Recorte vertical do bloco ${blockNum} — mesmo factual, ritmo Short.`,
      angle: hook,
      sourceBlock: blockNum,
    });
  }

  for (const item of listItems.slice(0, 3)) {
    if (ideas.length >= maxIdeas) break;
    const rank = item.rank ?? ideas.length;
    const itemTitle = String(item.title || item.name || "").trim();
    if (!itemTitle) continue;
    ideas.push({
      title: titleForShort(projectTitle, `#${rank} isolado`, ideas.length),
      hookPt: hookFromText(item.visual_hook || item.hook || itemTitle, 12),
      mechanic: `clip-factory-rank-${rank}`,
      whyWorks: `Item #${rank} do listicle longo virando Short standalone.`,
      angle: itemTitle,
    });
  }

  if (ideas.length < 2 && blockPhrases.length >= 1) {
    ideas.push({
      title: titleForShort(projectTitle, "3 fatos rápidos", ideas.length),
      hookPt: hookFromText(blockPhrases.join(" "), 16),
      mechanic: "clip-factory-compilation",
      whyWorks: "Compilação dos melhores momentos do vídeo longo.",
    });
  }

  if (!ideas.length) {
    return { ok: false, error: "Nenhum bloco de narração encontrado para extrair clips." };
  }

  return {
    ok: true,
    ideas: ideas.slice(0, maxIdeas),
    sourceProject: projectSlug,
    niche,
    blockCount: blockPhrases.length,
  };
}

export function runClipFactory(workspaceDir, projDir, options = {}) {
  const config = readJsonSafe(path.join(projDir, "config_qanat.json"));
  const storyboard = readJsonSafe(path.join(projDir, "storyboard.json"));
  const timings = readJsonSafe(path.join(projDir, "block_timings.json"));
  const projectSlug = path.basename(projDir);

  const built = buildShortIdeasFromLongProject(config, storyboard, timings, projectSlug);
  if (!built.ok) return built;

  const enqueue = options.enqueue !== false;
  let queue = null;
  if (enqueue) {
    queue = enqueueEditorialIdeas(workspaceDir, built.ideas, {
      source: `clip-factory:${projectSlug}`,
      format: "SHORTS",
    });
  }

  const manifestPath = path.join(projDir, "clip_factory_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourceProject: projectSlug,
    ideas: built.ideas,
    enqueued: enqueue,
  }, null, 2), "utf8");

  return {
    ok: true,
    ideas: built.ideas,
    enqueued: built.ideas.length,
    total: queue?.items?.length ?? null,
    manifestPath,
    niche: built.niche,
  };
}