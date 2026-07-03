import { applyBgmProductionDefaults } from "./bgmProductionDefaults.js";

/** Prefixos herdados do config global — não são B-roll do projeto. */
export const GHOST_TIMELINE_ASSET_PREFIXES = ["logos/"];

export function isGhostTimelineAssetPath(assetPath) {
  const normalized = String(assetPath || "").trim().replace(/\\/g, "/").toLowerCase();
  if (!normalized) return false;
  return GHOST_TIMELINE_ASSET_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function isTimelineAssetUserOwned(entry = {}) {
  return entry.user_locked === true || entry.manual_asset === true;
}

/**
 * Remove slots com logos/templates ou arquivos ausentes no ASSETS do projeto.
 * Preserva entradas travadas pelo usuário.
 */
export function sanitizeTimelineAssetsForProject(
  timelineAssets = {},
  { assetFiles = [], stripGhosts = true } = {},
) {
  const fileSet = new Set(
    (assetFiles || []).map((f) => String(f || "").trim().replace(/\\/g, "/")),
  );
  const next = {};
  let stripped = 0;

  for (const [blockKey, slots] of Object.entries(timelineAssets || {})) {
    const cleaned = (Array.isArray(slots) ? slots : []).map((entry) => {
      const asset = String(entry?.asset || "").trim().replace(/\\/g, "/");
      if (!asset) return { ...entry, asset: "" };

      if (isTimelineAssetUserOwned(entry)) return entry;

      if (stripGhosts && isGhostTimelineAssetPath(asset)) {
        stripped += 1;
        return { ...entry, asset: "" };
      }

      const bare = asset.replace(/^ASSETS\//i, "");
      if (fileSet.size > 0 && !fileSet.has(asset) && !fileSet.has(bare)) {
        stripped += 1;
        return { ...entry, asset: "" };
      }

      return entry;
    });

    const hasMedia = cleaned.some((e) => String(e?.asset || "").trim());
    if (hasMedia || cleaned.some(isTimelineAssetUserOwned)) {
      next[blockKey] = cleaned;
    }
  }

  return { timeline: next, stripped };
}

/** Estado que pertence a um projeto em edição — não clonar do config global. */
export function stripInheritedProjectState(cfg = {}) {
  const next = { ...cfg };
  next.timeline_assets = {};
  next.block_phrases = [];
  next.impact_texts = [];
  next.bgm_mappings = [];
  next.highlight_keywords = [];
  delete next.block_progress_bar;
  delete next.timeline_map_epoch;
  delete next.timeline_map_epoch_v2;
  delete next.single_bgm;
  delete next.project_music_volume;
  delete next.narration_mode;
  return next;
}

export function bootstrapNewProjectConfig(template = {}, { isShort = false, niche = "Geral", defaultDuration = 120 } = {}) {
  const cfg = stripInheritedProjectState(template);
  cfg.aspect_ratio = isShort ? "9:16" : "16:9";
  cfg.video_format = isShort ? "SHORTS" : "LONGO";
  cfg.caption_style = isShort ? "shorts-viral" : "documentary";
  cfg.niche = niche || cfg.niche || "Geral";
  if (cfg.gemini_api_key) delete cfg.gemini_api_key;
  return applyBgmProductionDefaults(cfg, defaultDuration);
}