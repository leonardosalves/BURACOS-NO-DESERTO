import { applyBgmProductionDefaults } from "./bgmProductionDefaults.js";
import { dedupeOrchestratedTimelineSlots } from "../shared/timelineAssetDedupe.js";

/** Prefixos herdados do config global — não são B-roll do projeto. */
export const GHOST_TIMELINE_ASSET_PREFIXES = ["logos/"];

export function isGhostTimelineAssetPath(assetPath) {
  const normalized = String(assetPath || "")
    .trim()
    .replace(/\\/g, "/")
    .toLowerCase();
  if (!normalized) return false;
  return GHOST_TIMELINE_ASSET_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix)
  );
}

export function isTimelineAssetUserOwned(entry = {}) {
  return entry.user_locked === true || entry.manual_asset === true;
}

export function storyboardAssetPath(assetRef) {
  if (!assetRef) return "";
  if (typeof assetRef === "string") return assetRef.trim();
  return String(assetRef.asset || "").trim();
}

/**
 * Mescla um slot da timeline com o asset do storyboard sem apagar upload manual.
 */
export function mergeTimelineSlotFromStoryboard(
  existing = {},
  fromStoryboard = null
) {
  const ex = existing && typeof existing === "object" ? existing : {};
  const sb =
    fromStoryboard && storyboardAssetPath(fromStoryboard)
      ? fromStoryboard
      : null;
  const exOwned = isTimelineAssetUserOwned(ex);
  const sbOwned = sb ? isTimelineAssetUserOwned(sb) : false;

  if (exOwned && (!sb || !sbOwned)) {
    return { ...ex };
  }

  if (sbOwned) {
    return {
      ...ex,
      ...sb,
      asset: sb.asset || ex.asset,
      type: sb.type || ex.type,
      user_locked: true,
      manual_asset: true,
    };
  }

  if (ex.asset && sb) {
    return {
      ...ex,
      asset: sb.asset || ex.asset,
      type: sb.type || ex.type,
      ...(sb.fixed !== undefined && sb.fixed !== null
        ? { fixed: sb.fixed }
        : {}),
    };
  }

  if (ex.asset) return { ...ex };
  if (sb) return { ...sb };
  return {};
}

/**
 * Vincula assets da timeline ao storyboard (upload manual tem prioridade).
 */
export function bindStoryboardAssetsFromTimeline(
  visualPrompts = [],
  timelineAssets = {}
) {
  if (!Array.isArray(visualPrompts) || !timelineAssets) {
    return { visualPrompts: visualPrompts || [], updated: false };
  }

  const blockCounters = {};
  let updated = false;
  const nextPrompts = visualPrompts.map((vp) => {
    const blockKey = String(vp?.block || 1);
    if (blockCounters[blockKey] === undefined) blockCounters[blockKey] = 0;
    const idx = blockCounters[blockKey]++;
    const tlAsset = timelineAssets[blockKey]?.[idx];
    if (!tlAsset?.asset) return vp;

    const prevPath = storyboardAssetPath(vp?.asset);
    const tlOwned = isTimelineAssetUserOwned(tlAsset);
    const shouldBind = !prevPath || (tlOwned && prevPath !== tlAsset.asset);

    if (!shouldBind) return vp;

    updated = true;
    return {
      ...vp,
      asset: {
        asset: tlAsset.asset,
        type: tlAsset.type || "image",
        ...(tlAsset.fixed !== undefined && tlAsset.fixed !== null
          ? { fixed: tlAsset.fixed }
          : {}),
        ...(tlOwned ? { user_locked: true, manual_asset: true } : {}),
      },
    };
  });

  return { visualPrompts: nextPrompts, updated };
}

/**
 * Remove slots com logos/templates ou arquivos ausentes no ASSETS do projeto.
 * Preserva entradas travadas pelo usuário.
 */
export function sanitizeTimelineAssetsForProject(
  timelineAssets = {},
  { assetFiles = [], stripGhosts = true } = {}
) {
  const { timeline: deduped, removed: dedupeRemoved } =
    dedupeOrchestratedTimelineSlots(timelineAssets);

  const fileSet = new Set(
    (assetFiles || []).map((f) =>
      String(f || "")
        .trim()
        .replace(/\\/g, "/")
    )
  );
  const next = {};
  let stripped = 0;

  for (const [blockKey, slots] of Object.entries(deduped || {})) {
    const cleaned = (Array.isArray(slots) ? slots : []).map((entry) => {
      const asset = String(entry?.asset || "")
        .trim()
        .replace(/\\/g, "/");
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

  return { timeline: next, stripped, dedupeRemoved };
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

export function bootstrapNewProjectConfig(
  template = {},
  { isShort = false, niche = "Geral", defaultDuration = 120 } = {}
) {
  const cfg = stripInheritedProjectState(template);
  cfg.aspect_ratio = isShort ? "9:16" : "16:9";
  cfg.video_format = isShort ? "SHORTS" : "LONGO";
  cfg.caption_style = isShort ? "shorts-viral" : "documentary";
  cfg.niche = niche || cfg.niche || "Geral";
  if (cfg.gemini_api_key) delete cfg.gemini_api_key;
  return applyBgmProductionDefaults(cfg, defaultDuration);
}
