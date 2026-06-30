/**
 * Melhorias de profissionalismo: presets, listicle PRO, quality checker,
 * SFX/BGM, Epidemic mood e export TTS cinematográfico.
 */

import fs from "fs";
import path from "path";
import { buildOverlayOrchestrationPlan, detectNicheCategory } from "./overlayOrchestration.js";
import { buildListicleVideoSeed, pickListicleLottieKey } from "./listicleLottieResolve.js";
import {
  stabilizeOverlayTimings,
  isHudOverlay,
  verifyAndRepairAiOverlayTiming,
  overlayTimingIssuesFromReport,
} from "./overlayTiming.js";

export { stabilizeOverlayTimings };

export { buildListicleVideoSeed, pickListicleLottieKey };

export const DOCUMENTARY_HISTORY_PRESET = {
  id: "documentary-history",
  label: "Documentário História",
  captionStyle: { short: "shorts-viral", long: "documentary" },
  theme: "ancient",
  accentColor: "#C5A880",
  secondaryColor: "#8B0000",
  backgroundTone: "#1A1410",
  fontTitle: "Cinzel",
  fontBody: "Inter",
  varietyProfile: "documentary-prestige",
  lowerThirdVariants: ["bild", "accent-underline", "clean-bar"],
  grain: true,
  vignette: true,
  thumbnailPalette: ["#C5A880", "#8B0000", "#1A1410"],
};

export const DOCUMENTARY_MYSTERY_PRESET = {
  id: "documentary-mystery",
  label: "Documentário Mistério",
  captionStyle: { short: "shorts-viral", long: "documentary" },
  theme: "mysterious",
  accentColor: "#7B68EE",
  secondaryColor: "#1A1A2E",
  backgroundTone: "#0D0D14",
  fontTitle: "Cinzel",
  fontBody: "Inter",
  varietyProfile: "mystery-reveal",
  lowerThirdVariants: ["glass", "accent-underline", "bild"],
  grain: true,
  vignette: true,
  thumbnailPalette: ["#7B68EE", "#1A1A2E", "#0D0D14"],
};

export const DOCUMENTARY_GEOGRAPHY_PRESET = {
  id: "documentary-geography",
  label: "Explorador Geográfico",
  captionStyle: { short: "shorts-viral", long: "documentary" },
  theme: "nature",
  accentColor: "#00E5FF",
  secondaryColor: "#2E7D32",
  backgroundTone: "#0A1A12",
  fontTitle: "Cinzel",
  fontBody: "Inter",
  varietyProfile: "geography-explorer",
  lowerThirdVariants: ["glass", "clean-bar", "soft-pill"],
  grain: true,
  vignette: true,
  thumbnailPalette: ["#00E5FF", "#2E7D32", "#0A1A12"],
};

export const DOCUMENTARY_DATA_PRESET = {
  id: "documentary-data",
  label: "Jornalismo de Dados",
  captionStyle: { short: "shorts-viral", long: "documentary" },
  theme: "classic",
  accentColor: "#FFFFFF",
  secondaryColor: "#00FF87",
  backgroundTone: "#0D1117",
  fontTitle: "Inter",
  fontBody: "Inter",
  varietyProfile: "data-journalist",
  lowerThirdVariants: ["accent-underline", "bold-block", "clean-bar"],
  grain: false,
  vignette: true,
  thumbnailPalette: ["#FFFFFF", "#00FF87", "#0D1117"],
};

export const DOCUMENTARY_FINANCE_PRESET = {
  id: "documentary-finance",
  label: "Finanças Premium",
  captionStyle: { short: "shorts-viral", long: "documentary" },
  theme: "classic",
  accentColor: "#D4AF37",
  secondaryColor: "#00FF87",
  backgroundTone: "#0D1117",
  fontTitle: "Cinzel",
  fontBody: "Inter",
  varietyProfile: "data-journalist",
  lowerThirdVariants: ["accent-underline", "bold-block", "clean-bar"],
  grain: false,
  vignette: true,
  thumbnailPalette: ["#D4AF37", "#00FF87", "#0D1117"],
};

export const DESIGN_PRESETS = {
  [DOCUMENTARY_HISTORY_PRESET.id]: DOCUMENTARY_HISTORY_PRESET,
  [DOCUMENTARY_MYSTERY_PRESET.id]: DOCUMENTARY_MYSTERY_PRESET,
  [DOCUMENTARY_GEOGRAPHY_PRESET.id]: DOCUMENTARY_GEOGRAPHY_PRESET,
  [DOCUMENTARY_DATA_PRESET.id]: DOCUMENTARY_DATA_PRESET,
  [DOCUMENTARY_FINANCE_PRESET.id]: DOCUMENTARY_FINANCE_PRESET,
};

export const GLOBAL_SFX_ALIASES = [
  { target: "sfx_whoosh.mp3", sources: ["sfx_whoosh_transition.mp3", "sfx_whoosh.mp3"] },
  { target: "sfx_tick.mp3", sources: ["sfx_tick.mp3"] },
  { target: "sfx_impact.mp3", sources: ["sfx_impact.mp3", "sfx_whoosh_transition.mp3"] },
  { target: "sfx_riser.mp3", sources: ["sfx_riser.mp3", "sfx_whoosh_transition.mp3"] },
  { target: "sfx_room_tone.mp3", sources: ["sfx_room_tone.mp3", "sfx_wind.mp3"] },
];

export const EPIDEMIC_MOOD_BY_CATEGORY = {
  history: { bgm: "epic orchestral documentary ancient", sfx: "cinematic impact whoosh", label: "Épico Histórico" },
  mystery: { bgm: "dark mystery suspense documentary", sfx: "eerie tension reveal", label: "Mistério Sombrio" },
  nature: { bgm: "cinematic nature exploration ambient", sfx: "wind atmosphere transition", label: "Exploração Natural" },
  tech: { bgm: "modern tech documentary electronic", sfx: "digital ui whoosh", label: "Tech Documentary" },
  finance: { bgm: "corporate documentary confident", sfx: "money counter tick", label: "Corporativo Premium" },
  industrial: { bgm: "industrial epic documentary", sfx: "mechanical impact", label: "Impacto Industrial" },
  default: { bgm: "quirky documentary curious upbeat", sfx: "cinematic whoosh transition", label: "Curiosidades Documentary" },
};

const HISTORY_NICHE_RE = /histor|arqueolog|antig|castelo|egito|inca|curios|roma|império|imperio|medieval|guerra|mito|listicle/i;
const MYSTERY_NICHE_RE = /mistér|misterio|enigma|inexplic|paranormal|conspir|desaparec|assassinato|crime/i;
const GEO_NICHE_RE = /geograf|deserto|amazon|terra|mapa|continente|oceano|viagem|buraco/i;
const DATA_NICHE_RE = /dados|número|numero|estatíst|estatist|fato|ciência|ciencia|compar|ranking/i;
const FINANCE_NICHE_RE = /finan|negoc|dinheiro|invest|economia|lucro|bolsa|cripto|empresa/i;

function formatChapterTimestamp(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function resolveListicleHudStyle(config = {}, storyboard = {}, rankCount = 0) {
  const explicit = config.listicle_hud_style || storyboard?.listicle?.hud_style;
  if (explicit === "compact" || explicit === "full" || explicit === "auto") return explicit;
  return rankCount > 8 ? "compact" : "full";
}

export function buildListicleYoutubeChapters(storyboard = {}, config = {}, timings = {}) {
  if (!isListicleProject(config, storyboard)) return "";
  const starts = Array.isArray(timings.starts) ? timings.starts : [];
  if (!starts.length) return "";

  const { listItems, rankCount, rankOrder } = getListicleMeta(storyboard, config);
  const lines = [];

  if (Number.isFinite(starts[0])) {
    lines.push(`${formatChapterTimestamp(starts[0])} Introdução`);
  }

  const itemBlocks = [];
  if (listItems.length) {
    for (const item of listItems) {
      const block = Number(item.block);
      const rank = Number(item.rank);
      if (block > 1 && rank) {
        itemBlocks.push({
          block,
          rank,
          title: String(item.title || item.name || "").trim(),
        });
      }
    }
  } else if (rankCount > 0) {
    for (let i = 0; i < rankCount; i++) {
      const rank = rankOrder === "desc" ? rankCount - i : i + 1;
      itemBlocks.push({ block: i + 2, rank, title: "" });
    }
  }

  itemBlocks.sort((a, b) => a.block - b.block);
  for (const item of itemBlocks) {
    const blockStart = Number(starts[item.block - 1]);
    if (!Number.isFinite(blockStart)) continue;
    const label = item.title ? `#${item.rank} ${item.title}` : `#${item.rank}`;
    lines.push(`${formatChapterTimestamp(blockStart)} ${label}`);
  }

  const outroIdx = Math.max(0, starts.length - 1);
  if (Number.isFinite(starts[outroIdx]) && outroIdx > 0) {
    lines.push(`${formatChapterTimestamp(starts[outroIdx])} Recap + CTA`);
  }

  return lines.join("\n").trim();
}

export function isListicleProject(config = {}, storyboard = {}) {
  if (config.content_mode === "LISTICLE") return true;
  if (storyboard?.listicle?.content_mode === "LISTICLE") return true;
  const rankFromConfig = Number(config.rank_count);
  const rankFromStoryboard = Number(storyboard?.listicle?.rank_count);
  if (Number.isFinite(rankFromConfig) && rankFromConfig >= 3) return true;
  if (Number.isFinite(rankFromStoryboard) && rankFromStoryboard >= 3) return true;
  if (Array.isArray(storyboard?.list_items) && storyboard.list_items.length >= 3) return true;
  return false;
}

export function isDocumentaryHistoryNiche(niche = "", config = {}, storyboard = {}) {
  const topic = String(storyboard?.listicle?.topic || config.list_topic || "").toLowerCase();
  const n = String(niche || config.niche || "").toLowerCase();
  return HISTORY_NICHE_RE.test(n) || HISTORY_NICHE_RE.test(topic)
    || detectNicheCategory(niche) === "history";
}

export function resolveDesignPreset(config = {}, storyboard = {}, niche = "") {
  const explicit = config.design_preset || storyboard.design_preset;
  if (explicit && explicit !== "auto" && DESIGN_PRESETS[explicit]) {
    return DESIGN_PRESETS[explicit];
  }

  const topic = String(storyboard?.listicle?.topic || config.list_topic || "").toLowerCase();
  const n = String(niche || config.niche || "").toLowerCase();
  const combined = `${n} ${topic}`;

  if (MYSTERY_NICHE_RE.test(combined)) return DOCUMENTARY_MYSTERY_PRESET;
  if (GEO_NICHE_RE.test(combined) || detectNicheCategory(niche) === "nature") return DOCUMENTARY_GEOGRAPHY_PRESET;
  if (FINANCE_NICHE_RE.test(combined) || detectNicheCategory(niche) === "finance") return DOCUMENTARY_FINANCE_PRESET;
  if (isDocumentaryHistoryNiche(niche, config, storyboard)) return DOCUMENTARY_HISTORY_PRESET;
  if (DATA_NICHE_RE.test(combined) || isListicleProject(config, storyboard)) return DOCUMENTARY_DATA_PRESET;

  return null;
}

export function applyDocumentaryHistoryPreset(config = {}, storyboard = {}, niche = "") {
  const preset = resolveDesignPreset(config, storyboard, niche || config.niche);
  if (!preset) {
    return { config, storyboard, applied: false };
  }

  const isShort = config.aspect_ratio === "9:16" || config.video_format === "SHORTS";
  const nextConfig = { ...config };

  if (!nextConfig.design_preset || nextConfig.design_preset === "auto") {
    nextConfig.design_preset = preset.id;
  }
  if (!nextConfig.caption_style || nextConfig.caption_style === "auto") {
    nextConfig.caption_style = isShort ? preset.captionStyle.short : preset.captionStyle.long;
  }
  if (!nextConfig.overlay_theme) nextConfig.overlay_theme = preset.theme;
  if (!nextConfig.accent_color) nextConfig.accent_color = preset.accentColor;
  if (!nextConfig.secondary_color) nextConfig.secondary_color = preset.secondaryColor;
  if (nextConfig.grain_overlay === undefined) nextConfig.grain_overlay = preset.grain;
  if (nextConfig.vignette === undefined) nextConfig.vignette = preset.vignette;
  if (!nextConfig.font_title) nextConfig.font_title = preset.fontTitle;
  if (!nextConfig.font_body) nextConfig.font_body = preset.fontBody;

  const nextStoryboard = {
    ...storyboard,
    design_preset: nextConfig.design_preset,
  };

  return { config: nextConfig, storyboard: nextStoryboard, applied: true, preset };
}

export function getEpidemicMoodForNiche(niche = "", config = {}, storyboard = {}) {
  const preset = resolveDesignPreset(config, storyboard, niche);
  if (preset?.id === DOCUMENTARY_MYSTERY_PRESET.id) return EPIDEMIC_MOOD_BY_CATEGORY.mystery;
  if (preset?.id === DOCUMENTARY_GEOGRAPHY_PRESET.id) return EPIDEMIC_MOOD_BY_CATEGORY.nature;
  if (preset?.id === DOCUMENTARY_FINANCE_PRESET.id) return EPIDEMIC_MOOD_BY_CATEGORY.finance;
  if (preset?.id === DOCUMENTARY_DATA_PRESET.id) return EPIDEMIC_MOOD_BY_CATEGORY.default;

  const category = detectNicheCategory(niche);
  return EPIDEMIC_MOOD_BY_CATEGORY[category] || EPIDEMIC_MOOD_BY_CATEGORY.default;
}

export function buildEpidemicMoodPrompt(niche = "", config = {}, storyboard = {}) {
  const mood = getEpidemicMoodForNiche(niche, config, storyboard);
  return `
SONOPLASTIA EPIDEMIC SOUND (obrigatório em bgm_recommendations e strategy):
- Mood do nicho: "${mood.label}"
- search_theme da trilha principal: "${mood.bgm}"
- Para Shorts: use use_single_bgm com search_theme acima em strategy.bgm_search_theme
- SFX sugeridos no roteiro: ${mood.sfx}`;
}

export function buildCinematicNarrationRules() {
  return `
NARRAÇÃO CINEMATOGRÁFICA (obrigatório em "narrative_script_tagged"):
- Use marcadores de performance para TTS natural:
  • [pausa] ou [pause] — silêncio breve (0.4–0.8s) antes de dado importante
  • [ênfase] — a palavra IMEDIATAMENTE seguinte com peso vocal
  • [rápido] — trecho até o próximo [pausa] em ritmo acelerado
  • [lento] — leitura pausada para números, datas e nomes próprios
- Máximo 1 marcador a cada 2 frases — não sature.
- O campo "narrative_script" permanece SEM marcadores (texto limpo para leitura humana).
- Em listicles: [ênfase] no número do ranking ("Número três...") e [pausa] antes do impacto do #1.`;
}

export function convertCinematicMarkersForTts(taggedScript = "", platform = "fish") {
  let text = String(taggedScript);
  const emphasisNext = (match, word) => {
    const w = String(word || "").trim();
    if (!w) return match;
    if (platform === "fish") return `[ênfase] ${w}`;
    if (platform === "eleven") return `[emphasis] ${w}`;
    return `[ênfase] ${w}`;
  };

  text = text
    .replace(/\[ênfase\]\s*/gi, (m, offset, str) => {
      const rest = str.slice(offset + m.length).trim();
      const word = rest.split(/\s+/)[0] || "";
      return emphasisNext(m, word);
    })
    .replace(/\[rápido\]/gi, platform === "eleven" ? "[fast]" : "[rápido]")
    .replace(/\[lento\]/gi, platform === "eleven" ? "[slowly]" : "[lento]")
    .replace(/\[pausa\]|\[pause\]/gi, platform === "fish" ? "[pausa]" : platform === "eleven" ? "[pause]" : "(pause 600ms)");

  return text.replace(/\s+/g, " ").trim();
}

export function ensureProjectSfxPack(projectDir) {
  const copied = [];
  for (const { target, sources } of GLOBAL_SFX_ALIASES) {
    const dest = path.join(projectDir, target);
    if (fs.existsSync(dest)) continue;
    for (const src of sources) {
      const srcPath = path.join(projectDir, src);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dest);
        copied.push(target);
        break;
      }
    }
  }
  if (copied.length) {
    console.log(`[SFX Pack] Aliases criados: ${copied.join(", ")}`);
  }
  return copied;
}

function getListicleMeta(storyboard = {}, config = {}) {
  const listItems = Array.isArray(storyboard.list_items) ? storyboard.list_items : [];
  const rankCount = Number(config.rank_count || storyboard.listicle?.rank_count || listItems.length || 0);
  const rankOrder = config.rank_order || storyboard.listicle?.rank_order || "desc";
  return { listItems, rankCount, rankOrder };
}

export function resolveListicleContext(storyboard = {}, config = {}) {
  if (!isListicleProject(config, storyboard)) return null;

  const { listItems, rankCount, rankOrder } = getListicleMeta(storyboard, config);
  const rawTopic = String(
    storyboard?.listicle?.topic
    || config.list_topic
    || storyboard?.listicle_meta?.topic
    || "",
  ).trim();

  const items = listItems
    .map((item) => ({
      rank: Number(item.rank) || 0,
      title: String(item.title || item.name || "").trim(),
      origin: String(item.origin || item.hook || item.fact || "").trim(),
      block: Number(item.block) || 0,
    }))
    .filter((item) => item.title);

  const itemTitles = items.map((item) => item.title);
  const effectiveRank = rankCount || itemTitles.length || 3;
  const topic = rawTopic.replace(/^top\s+\d+\s+/i, "").trim();

  let coreTopic = "";
  if (topic) {
    coreTopic = `Top ${effectiveRank} ${topic}`;
  } else {
    const topLine = String(storyboard?.strategy?.hook || storyboard?.strategy?.title_main || "").trim();
    const topFromHook = topLine.match(/\btop\s+(\d+)\b[^.!?]{0,100}/i)?.[0];
    if (topFromHook) {
      coreTopic = sanitizeListicleTopic(topFromHook);
    } else if (itemTitles.length >= 2) {
      coreTopic = `Top ${effectiveRank} objetos do dia a dia com origens bizarras`;
    }
  }

  return {
    isListicle: true,
    rankCount: effectiveRank,
    rankOrder,
    topic,
    coreTopic,
    itemTitles,
    items,
    itemsLine: itemTitles.join(" → "),
  };
}

function sanitizeListicleTopic(text = "") {
  return String(text || "").replace(/\s+/g, " ").trim().replace(/[.!?]+$/g, "");
}

export function buildOpenLoopIntroOverlay(storyboard = {}, config = {}, starts = []) {
  if (!isListicleProject(config, storyboard)) return null;

  const introStart = Number(starts[0]);
  if (!Number.isFinite(introStart)) return null;

  const { rankCount } = getListicleMeta(storyboard, config);
  const hook = String(
    storyboard?.listicle?.controversy_hook
    || storyboard?.strategy?.hook
    || storyboard?.strategy?.title_main
    || "",
  ).trim();

  const text = hook
    ? hook.slice(0, 52)
    : (rankCount > 0 ? `O #1 vai surpreender — mas primeiro...` : "O que vem a seguir vai te surpreender");

  const preset = resolveDesignPreset(config, storyboard, config.niche);
  return {
    id: "listicle-open-loop",
    type: "kinetic-text",
    start: introStart + 0.2,
    duration: 2.4,
    props: {
      text,
      style: "reveal",
      accentColor: preset?.accentColor || "#D4AF37",
      position: "center",
    },
  };
}

export function buildListicleStingerOverlays(storyboard = {}, config = {}, starts = []) {
  if (!isListicleProject(config, storyboard)) return [];

  const { listItems, rankCount, rankOrder } = getListicleMeta(storyboard, config);
  const startsList = Array.isArray(starts) ? starts : [];
  const preset = resolveDesignPreset(config, storyboard, config.niche);
  const accent = preset?.accentColor || config.accent_color || "#C5A880";
  const overlays = [];

  const itemBlocks = [];
  if (listItems.length) {
    for (const item of listItems) {
      const block = Number(item.block);
      if (block > 1) itemBlocks.push({ block, rank: Number(item.rank) });
    }
  } else if (rankCount > 0) {
    for (let i = 0; i < rankCount; i++) {
      itemBlocks.push({ block: i + 2, rank: rankOrder === "desc" ? rankCount - i : i + 1 });
    }
  }

  for (let i = 0; i < itemBlocks.length; i++) {
    if (i === 0) continue;
    const { block } = itemBlocks[i];
    const blockStart = Number(startsList[block - 1]);
    if (!Number.isFinite(blockStart)) continue;

    overlays.push({
      id: `listicle-stinger-${block}`,
      type: "listicle-stinger",
      start: Math.max(0, blockStart - 0.12),
      duration: 0.85,
      props: { accentColor: accent },
    });
  }

  return overlays;
}

function titleForListicleRank(listItems = [], rank) {
  const item = listItems.find((it) => Number(it.rank) === Number(rank));
  return String(item?.title || item?.name || "").trim();
}

function listItemForRank(listItems = [], rank) {
  return listItems.find((it) => Number(it.rank) === Number(rank)) || null;
}

function stripLegacyRankProgressOverlays(overlays = []) {
  return (overlays || []).filter((o) => {
    if (!o || o.type !== "rank-progress") return true;
    if (o.id === "listicle-progress-hud") return false;
    return !/^listicle-progress-\d+$/.test(String(o.id || ""));
  });
}

export function buildListicleProgressOverlays(storyboard = {}, config = {}, starts = [], durations = [], projectSlug = "") {
  if (!isListicleProject(config, storyboard)) return [];

  const { listItems, rankCount, rankOrder } = getListicleMeta(storyboard, config);
  const startsList = Array.isArray(starts) ? starts : [];
  const durationsList = Array.isArray(durations) ? durations : [];
  const preset = resolveDesignPreset(config, storyboard, config.niche);
  const accent = preset?.accentColor || config.accent_color || "#C5A880";

  const itemBlocks = [];
  if (listItems.length) {
    for (const item of listItems) {
      const block = Number(item.block);
      const rank = Number(item.rank);
      if (block > 1 && rank) {
        itemBlocks.push({ block, rank, title: titleForListicleRank(listItems, rank) });
      }
    }
  } else if (rankCount > 0) {
    for (let i = 0; i < rankCount; i++) {
      const rank = rankOrder === "desc" ? rankCount - i : i + 1;
      itemBlocks.push({
        block: i + 2,
        rank,
        title: "",
      });
    }
  }

  itemBlocks.sort((a, b) => a.block - b.block);
  if (!itemBlocks.length) return [];

  const firstItemStart = Number(startsList[itemBlocks[0].block - 1]);
  const outroBlockStart = Number(startsList[startsList.length - 1]);

  const hudStart = firstItemStart;
  if (!Number.isFinite(hudStart)) return [];

  let hudEnd = outroBlockStart;
  if (!Number.isFinite(hudEnd) || hudEnd <= hudStart) {
    const lastBlock = itemBlocks[itemBlocks.length - 1].block;
    hudEnd = firstItemStart + (Number(durationsList[lastBlock - 1]) || 6);
  }

  const hudDuration = Math.max(1, hudEnd - hudStart);
  const segments = [];
  const climaxRank = rankOrder === "desc" ? 1 : itemBlocks.length;
  const videoSeed = buildListicleVideoSeed(config, storyboard, projectSlug);

  for (let i = 0; i < itemBlocks.length; i++) {
    const { block, rank, title } = itemBlocks[i];
    const blockStart = Number(startsList[block - 1]);
    if (!Number.isFinite(blockStart)) continue;
    const item = listItemForRank(listItems, rank);
    const resolvedTitle = title || titleForListicleRank(listItems, rank);
    const visualHook = String(item?.visual_hook || item?.hook || "").trim();
    segments.push({
      at: Math.max(0, blockStart - hudStart),
      mode: "item",
      rank,
      title: resolvedTitle,
      visualHook,
      progress: i + 1,
    });
  }

  const hudStyle = resolveListicleHudStyle(config, storyboard, itemBlocks.length);

  return [{
    id: "listicle-progress-hud",
    type: "rank-progress",
    start: hudStart,
    duration: hudDuration,
    props: {
      total: itemBlocks.length,
      rankOrder: rankOrder === "asc" ? "asc" : "desc",
      accentColor: accent,
      persistentHud: true,
      fadeOnEntry: true,
      hudStyle,
      hudTheme: config.listicle_hud_theme || preset?.theme || "ancient",
      fontTitle: preset?.fontTitle || "Cinzel",
      secondaryColor: config.secondary_color || preset?.secondaryColor || accent,
      thumbnailPalette: preset?.thumbnailPalette || [accent],
      videoSeed,
      segments,
    },
  }];
}

export function buildListicleRecapOverlay(storyboard = {}, config = {}, starts = [], durations = [], projectSlug = "") {
  if (!isListicleProject(config, storyboard)) return null;

  const { listItems, rankCount, rankOrder } = getListicleMeta(storyboard, config);
  const startsList = Array.isArray(starts) ? starts : [];
  const durationsList = Array.isArray(durations) ? durations : [];
  const outroIdx = Math.max(0, startsList.length - 1);
  const outroStart = Number(startsList[outroIdx]);
  if (!Number.isFinite(outroStart)) return null;

  const preset = resolveDesignPreset(config, storyboard, config.niche);
  const accent = preset?.accentColor || config.accent_color || "#C5A880";

  const sortedItems = [...listItems].sort((a, b) => {
    const ra = Number(a.rank);
    const rb = Number(b.rank);
    return rankOrder === "desc" ? ra - rb : rb - ra;
  });

  const recapLines = sortedItems.length
    ? sortedItems.slice(0, 3).map((it) => ({
      rank: Number(it.rank),
      title: String(it.title || it.name || "").trim() || `Item #${it.rank}`,
      visualHook: String(it.visual_hook || it.hook || "").trim(),
    }))
    : Array.from({ length: Math.min(3, rankCount) }, (_, i) => {
      const r = rankOrder === "desc" ? i + 1 : rankCount - i;
      return { rank: r, title: `Item #${r}` };
    });

  const outroDur = Number(durationsList[outroIdx]) || 6;
  const effectiveRankCount = rankCount || recapLines.length || 3;
  const videoSeed = buildListicleVideoSeed(config, storyboard, projectSlug);

  return {
    id: "listicle-recap",
    type: "listicle-recap",
    start: outroStart + 0.5,
    duration: Math.min(outroDur - 0.5, 6),
    props: {
      title: `TOP ${effectiveRankCount} — RECAP`,
      lines: recapLines,
      cta: "Qual você colocaria em 1º? Comenta!",
      accentColor: preset?.accentColor || "#D4AF37",
      theme: preset?.theme || "ancient",
      fontTitle: preset?.fontTitle || "Cinzel",
      position: "top-center",
      videoSeed,
    },
  };
}

export function promoteSourceCardOverlays(overlays = [], config = {}, storyboard = {}) {
  const preset = resolveDesignPreset(config, storyboard, config.niche);
  return (overlays || []).map((overlay) => {
    if (!overlay?.props) return overlay;
    const source = String(overlay.props.source || overlay.props.citation || overlay.props.fonte || "").trim();
    if (!source || overlay.type === "source-card" || isHudOverlay(overlay)) return overlay;

    return {
      ...overlay,
      type: "source-card",
      props: {
        source: source.slice(0, 80),
        detail: String(overlay.props.detail || overlay.props.year || "").trim().slice(0, 40),
        accentColor: overlay.props.accentColor || preset?.accentColor || "#C5A880",
        theme: overlay.props.theme || preset?.theme || "classic",
        position: overlay.props.position === "bottom-right" ? "bottom-right" : "bottom-left",
      },
    };
  });
}

export function buildChapterStingerOverlays(config = {}, storyboard = {}, starts = [], durations = []) {
  const isShort = isShortFormVideo(config);
  if (isShort) return [];

  const startsList = Array.isArray(starts) ? starts : [];
  const durationsList = Array.isArray(durations) ? durations : [];
  if (startsList.length < 3) return [];

  const preset = resolveDesignPreset(config, storyboard, config.niche);
  const accent = preset?.accentColor || config.accent_color || "#C5A880";
  const fontTitle = preset?.fontTitle || "Cinzel";

  const blockCount = startsList.length;
  const pivotBlocks = [
    1,
    Math.max(2, Math.floor(blockCount * 0.33)),
    Math.max(3, Math.floor(blockCount * 0.66)),
  ];
  const uniqueBlocks = [...new Set(pivotBlocks)].filter((b) => b >= 1 && b <= blockCount);

  const labels = ["Contexto", "Desenvolvimento", "Revelação"];
  const overlays = [];

  uniqueBlocks.forEach((block, idx) => {
    const blockStart = Number(startsList[block - 1]);
    if (!Number.isFinite(blockStart)) return;
    const blockDur = Number(durationsList[block - 1]) || 6;
    if (blockDur < 4) return;

    overlays.push({
      id: `chapter-stinger-${block}`,
      type: "chapter-stinger",
      start: blockStart + 0.15,
      duration: Math.min(2.2, Math.max(1.6, blockDur * 0.12)),
      props: {
        title: labels[idx] || `Parte ${idx + 1}`,
        subtitle: `Bloco ${block}`,
        accentColor: accent,
        fontTitle,
      },
    });
  });

  return overlays;
}

/** Remove kinetic "TOP N" / "#N —" no centro — ranking só via badge rank-progress no topo. */
export function stripListicleCenterRankKinetics(overlays = [], config = {}, storyboard = {}) {
  if (!isListicleProject(config, storyboard)) return overlays || [];
  return (overlays || []).filter((o) => {
    if (!o) return false;
    if (o.id === "listicle-intro-topn") return false;
    if (/^listicle-rank-\d+$/.test(String(o.id || ""))) return false;
    if (o.type === "kinetic-text" && String(o.props?.position || "").toLowerCase() === "center") {
      const text = String(o.props?.text || "").trim();
      if (/^TOP\s*\d+$/i.test(text)) return false;
      if (/^#\d+(\s*[—-]\s*)?/i.test(text)) return false;
    }
    return true;
  });
}

export function buildListicleRankOverlays() {
  // Ranking visual = apenas HUD rank-progress (#N + TOP N no topo). Sem kinetic central.
  return [];
}

function mergeOverlays(base = [], additions = []) {
  const existingIds = new Set(base.map((o) => o.id));
  const merged = [...base];
  for (const o of additions) {
    if (!o || existingIds.has(o.id)) continue;
    merged.push(o);
    existingIds.add(o.id);
  }
  merged.sort((a, b) => (Number(a.start) || 0) - (Number(b.start) || 0));
  return merged;
}

const LISTICLE_HUD_TYPES = new Set(["rank-progress", "listicle-stinger", "listicle-recap"]);
const LISTICLE_BOTTOM_POSITIONS = ["bottom-right", "bottom-left", "bottom-center"];

function isListicleHudOverlay(overlay) {
  if (!overlay) return false;
  return LISTICLE_HUD_TYPES.has(overlay.type)
    || String(overlay.id || "").startsWith("listicle-");
}

function isShortFormVideo(config = {}) {
  const aspect = String(config.aspect_ratio || "").trim();
  const format = String(config.video_format || config.format_type || "").toUpperCase();
  return aspect === "9:16" || format === "SHORTS" || format === "SHORT";
}

function listicleHudSlot(overlay = {}) {
  const seed = String(overlay.id || overlay.type || "overlay");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function relocateOverlayAwayFromListicleHud(overlay, { isShort = false } = {}) {
  if (!overlay?.props || isListicleHudOverlay(overlay)) return overlay;

  const next = { ...overlay, props: { ...overlay.props } };
  const slot = listicleHudSlot(overlay);
  const shortPool = ["bottom-left", "bottom-right"];
  const longPool = LISTICLE_BOTTOM_POSITIONS;
  const pool = isShort ? shortPool : longPool;
  const pick = pool[slot % pool.length];

  if (next.type === "counter" || next.type === "timeline" || next.type === "bar-chart" || next.type === "geo-map" || next.type === "social-post") {
    next.props.position = pick;
  } else if (next.type === "info-card") {
    next.props.position = pick === "bottom-center" ? "bottom-right" : pick;
  } else if (next.type === "kinetic-text") {
    next.props.position = "bottom";
  } else if (next.type === "lower-third") {
    next.props.position = pick === "bottom-right" ? "bottom-center" : "bottom-left";
  } else {
    next.props.position = pick;
  }

  if (isShort) {
    next.props.layoutZone = "listicle-shorts-safe";
  }

  return next;
}

export function avoidListicleHudCollisions(overlays = [], config = {}, storyboard = {}) {
  if (!isListicleProject(config, storyboard)) return overlays || [];
  const isShort = isShortFormVideo(config);
  return (overlays || []).map((overlay) => relocateOverlayAwayFromListicleHud(overlay, { isShort }));
}

const SHORTS_LISTICLE_STRIP_TYPES = new Set([
  "lower-third",
  "kinetic-text",
  "bar-chart",
  "timeline",
  "info-card",
]);

function isShortsListicleNoiseOverlay(overlay = {}) {
  if (!overlay) return false;
  if (overlay.id === "listicle-recap") return false;
  if (overlay.id === "listicle-intro-topn") return true;
  if (/^listicle-rank-\d+$/.test(String(overlay.id || ""))) return true;
  if (SHORTS_LISTICLE_STRIP_TYPES.has(overlay.type) && !isListicleHudOverlay(overlay)) return true;
  if (/^listicle-(open-loop|rank-\d+)$/.test(String(overlay.id || ""))) return true;
  if (overlay.type === "listicle-stinger") return true;
  return false;
}

export function pruneListicleOverlayDensity(overlays = [], config = {}, storyboard = {}, plan = {}) {
  if (!isListicleProject(config, storyboard) || !isShortFormVideo(config)) {
    return overlays || [];
  }

  const maxTotal = Number(plan?.limits?.finalMaxTotal || plan?.limits?.maxTotal || 8);
  let filtered = (overlays || []).filter((o) => !isShortsListicleNoiseOverlay(o));

  const hud = filtered.filter(isListicleHudOverlay);
  let counters = filtered
    .filter((o) => !isListicleHudOverlay(o) && o.type === "counter")
    .sort((a, b) => (Number(b.props?.value) || 0) - (Number(a.props?.value) || 0));

  const maxCounters = counters.length > 0 && Number(counters[counters.length - 1]?.start) > 50 ? 3 : 2;
  const minCounterGap = 7;

  const keptCounters = [];
  for (const counter of counters) {
    if (keptCounters.length >= maxCounters) break;
    const start = Number(counter.start) || 0;
    const tooClose = keptCounters.some((k) => Math.abs((Number(k.start) || 0) - start) < minCounterGap);
    if (!tooClose) keptCounters.push(counter);
  }

  filtered = [...hud, ...keptCounters];

  if (filtered.length > maxTotal) {
    const hudOnly = filtered.filter(isListicleHudOverlay);
    const room = Math.max(0, maxTotal - hudOnly.length);
    filtered = [...hudOnly, ...keptCounters.slice(0, room)];
  }

  if (filtered.length < overlays.length) {
    console.log(`[Listicle Shorts] ${overlays.length} → ${filtered.length} overlays (densidade reduzida)`);
  }

  return filtered;
}

export function injectListicleRankOverlays(overlays = [], storyboard = {}, config = {}, starts = [], durations = [], projectDir = "") {
  if (!isListicleProject(config, storyboard)) return overlays || [];

  const projectSlug = projectDir ? path.basename(projectDir) : String(config.project_slug || "");
  const isShort = isShortFormVideo(config);
  let base = stripLegacyRankProgressOverlays(stripListicleCenterRankKinetics(overlays, config, storyboard));
  const batches = [
    buildListicleRankOverlays(storyboard, config, starts, durations),
    buildListicleProgressOverlays(storyboard, config, starts, durations, projectSlug),
  ];

  if (!isShort) {
    batches.push(buildListicleStingerOverlays(storyboard, config, starts));
    const openLoop = buildOpenLoopIntroOverlay(storyboard, config, starts);
    if (openLoop) batches.push([openLoop]);
  }

  const recap = buildListicleRecapOverlay(storyboard, config, starts, durations, projectSlug);
  if (recap) batches.push([recap]);

  let merged = avoidListicleHudCollisions(base, config, storyboard);
  let added = 0;
  for (const batch of batches) {
    const before = merged.length;
    merged = mergeOverlays(merged, batch);
    added += merged.length - before;
  }
  merged = stripListicleCenterRankKinetics(merged, config, storyboard);

  if (added) {
    console.log(`[Listicle PRO] ${added} overlays profissionais injetados${isShort ? " (modo Shorts minimal)" : ""}.`);
  }

  const plan = buildOverlayOrchestrationPlan({
    config,
    niche: config.niche || "Geral",
    totalDuration: durations.reduce((a, b) => a + (Number(b) || 0), 0),
    projectName: config.project || "lumiera",
    blockCount: Array.isArray(starts) ? starts.length : 0,
  });
  merged = avoidListicleHudCollisions(merged, config, storyboard);
  merged = pruneListicleOverlayDensity(merged, config, storyboard, plan);
  merged = stabilizeOverlayTimings(merged, { starts, durations, plan, config, storyboard });
  return merged;
}

export function filterOverlaysByVisualConfig(overlays = [], config = {}) {
  return (overlays || []).filter((overlay) => {
    if (!overlay) return false;
    if (overlay.type === "social-post" && config.social_proof_cards === false) return false;
    if (overlay.type === "geo-map" && config.geo_map_overlays === false) return false;
    return true;
  });
}

export function injectProLayoutOverlays(overlays = [], config = {}, storyboard = {}, starts = [], durations = [], plan = {}) {
  let merged = overlays || [];
  if (config.source_cards !== false) {
    merged = promoteSourceCardOverlays(merged, config, storyboard);
  }
  if (config.chapter_stingers !== false) {
    merged = mergeOverlays(merged, buildChapterStingerOverlays(config, storyboard, starts, durations));
  }
  merged = stabilizeOverlayTimings(merged, { starts, durations, plan, config, storyboard });
  return merged;
}

function wordCount(text = "") {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

export function buildBgmDuckPoints(overlays = [], wordTranscripts = []) {
  const points = new Set();

  for (const overlay of overlays || []) {
    const t = Number(overlay.start);
    if (!Number.isFinite(t)) continue;
    if (
      overlay.type === "kinetic-text"
      || overlay.type === "listicle-stinger"
      || overlay.id?.startsWith("listicle-rank")
      || overlay.id === "listicle-intro-topn"
    ) {
      points.add(Math.max(0, t));
    }

    if (overlay.id === "listicle-progress-hud" && Array.isArray(overlay.props?.segments)) {
      const rank1Seg = overlay.props.segments.find((seg) => seg.mode === "item" && Number(seg.rank) === 1);
      if (rank1Seg) {
        const dramaticAt = Number(overlay.start) + Number(rank1Seg.at || 0) - 0.3;
        if (Number.isFinite(dramaticAt)) points.add(Math.max(0, dramaticAt));
      }
    }

    if (overlay.type === "listicle-recap") {
      points.add(Math.max(0, t));
    }
  }

  for (const block of wordTranscripts || []) {
    const words = Array.isArray(block?.words) ? block.words : [];
    for (let i = 0; i < words.length; i++) {
      const w = String(words[i]?.word || words[i]?.text || "").toLowerCase();
      if (/número|numero|primeiro|segundo|terceiro|#?\d+/.test(w)) {
        const time = Number(words[i]?.start ?? words[i]?.startTime);
        if (Number.isFinite(time)) points.add(time);
      }
    }
  }

  return [...points].sort((a, b) => a - b);
}

export function validateVideoQuality({
  overlays = [],
  config = {},
  storyboard = {},
  totalDuration = 0,
  starts = [],
  durations = [],
  scenes = [],
  captions = [],
  orchestrationPlan = null,
} = {}) {
  const issues = [];
  const plan = orchestrationPlan || buildOverlayOrchestrationPlan({
    config,
    niche: config.niche || "Geral",
    totalDuration: totalDuration || 60,
    projectName: "check",
  });

  const isShort = plan.format === "SHORT";
  const hookEnd = isShort ? 1.5 : 5;
  const sorted = [...overlays]
    .filter((o) => typeof o.start === "number" && Number.isFinite(o.start))
    .sort((a, b) => a.start - b.start);

  for (const overlay of sorted) {
    if (overlay.start < hookEnd && overlay.type !== "kinetic-text" && overlay.type !== "listicle-stinger") {
      issues.push({
        severity: "warning",
        code: "hook_polluted",
        message: `Overlay "${overlay.id}" aparece em ${overlay.start.toFixed(1)}s — gancho deve ficar limpo até ${hookEnd}s`,
      });
    }

    const texts = [
      overlay.props?.title,
      overlay.props?.subtitle,
      overlay.props?.description,
      overlay.props?.label,
      overlay.props?.text,
    ].filter(Boolean);

    for (const t of texts) {
      const wc = wordCount(t);
      if (wc > 12) {
        issues.push({
          severity: "warning",
          code: "text_too_long",
          message: `Overlay "${overlay.id}": ${wc} palavras (máx. 12) — "${String(t).slice(0, 40)}..."`,
        });
      }
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].type === "lower-third" && sorted[i - 1].type === "lower-third") {
      issues.push({
        severity: "warning",
        code: "lt_repeat",
        message: `Dois lower-thirds seguidos (${sorted[i - 1].id} → ${sorted[i].id}) — alterne tipos`,
      });
    }

    const prevHud = isListicleHudOverlay(sorted[i - 1]);
    const currHud = isListicleHudOverlay(sorted[i]);
    if (prevHud && currHud) continue;

    const gap = sorted[i].start - sorted[i - 1].start;
    const minGap = (prevHud || currHud) && isListicleProject(config, storyboard) && isShort
      ? 0.5
      : plan.limits.minGapSeconds;
    if (gap < minGap) {
      issues.push({
        severity: "info",
        code: "gap_short",
        message: `Gap de ${gap.toFixed(1)}s entre "${sorted[i - 1].id}" e "${sorted[i].id}" (mín. ${minGap}s)`,
      });
    }
  }

  const maxOverlaysBudget = Number(plan.limits.finalMaxTotal || plan.limits.maxTotal || 8);
  if (sorted.length > maxOverlaysBudget) {
    issues.push({
      severity: "error",
      code: "overlay_budget",
      message: `${sorted.length} overlays — orçamento máximo: ${maxOverlaysBudget}`,
    });
  }

  if (isListicleProject(config, storyboard)) {
    const rankHudOverlays = sorted.filter((o) => o.type === "rank-progress"
      && (o.id === "listicle-progress-hud" || /^listicle-progress-\d+$/.test(String(o.id || ""))));
    const expected = Number(config.rank_count || storyboard.listicle?.rank_count || 0);
    if (rankHudOverlays.length < Math.min(expected, 1)) {
      issues.push({
        severity: "warning",
        code: "listicle_no_rank",
        message: "Listicle sem HUD de ranking (#N no topo) — badge persistente ausente",
      });
    }

    const listItems = storyboard.list_items;
    if (!Array.isArray(listItems) || listItems.length === 0) {
      issues.push({
        severity: "warning",
        code: "listicle_no_items",
        message: "Storyboard sem list_items — ranking pode ficar genérico",
      });
    }

    const hasProgress = sorted.some((o) => o.type === "rank-progress");
    if (!hasProgress && expected > 1) {
      issues.push({
        severity: "info",
        code: "listicle_no_progress",
        message: "Barra de progresso do ranking ausente",
      });
    }
  }

  if (isShort && Array.isArray(scenes) && scenes.length) {
    for (const scene of scenes) {
      const dur = Number(scene.duration);
      const sceneStart = Number(scene.start);
      if (!Number.isFinite(dur) || dur <= 12) continue;
      const hasOverlayInScene = sorted.some((o) => o.start >= sceneStart && o.start < sceneStart + dur);
      if (!hasOverlayInScene) {
        issues.push({
          severity: "warning",
          code: "pattern_interrupt",
          message: `Cena ${scene.block || "?"} com ${dur.toFixed(1)}s sem overlay — risco de queda de retenção`,
        });
      }
    }
  }

  if (Array.isArray(captions) && captions.length) {
    for (const cap of captions) {
      const text = String(cap.text || "");
      const wc = wordCount(text);
      if (wc > 8) {
        issues.push({
          severity: "info",
          code: "caption_long",
          message: `Legenda com ${wc} palavras (ideal ≤8): "${text.slice(0, 36)}..."`,
        });
      }
    }
  }

  const hasBgm = Boolean(config.single_bgm || (Array.isArray(config.bgm_mappings) && config.bgm_mappings.length));
  if (!hasBgm && !config.use_single_bgm) {
    issues.push({
      severity: "info",
      code: "no_bgm",
      message: "Nenhuma trilha BGM mapeada — sonoplastia pode ficar vazia",
    });
  }

  const firstScene = Array.isArray(scenes) && scenes.length ? scenes[0] : null;
  if (firstScene && isShort) {
    const asset = String(firstScene.asset || "").toLowerCase();
    if (asset.includes("logo") || asset.includes("placeholder")) {
      issues.push({
        severity: "warning",
        code: "weak_hook_visual",
        message: "Primeira cena parece logo/placeholder — use o visual mais forte no gancho",
      });
    }
  }

  if (isListicleProject(config, storyboard)) {
    const { listItems } = getListicleMeta(storyboard, config);
    for (const item of listItems) {
      const title = String(item?.title || item?.name || "").trim();
      if (title.length > 60) {
        issues.push({
          severity: "warning",
          code: "listicle_title_long",
          message: `#${item.rank} com ${title.length} caracteres no HUD (ideal ≤60): "${title.slice(0, 42)}..."`,
        });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 25 - warnings * 8 - issues.filter((i) => i.severity === "info").length * 2);

  return {
    ok: errors === 0,
    score,
    issues,
    plan: {
      format: plan.format,
      maxOverlays: Number(plan.limits.finalMaxTotal || plan.limits.maxTotal || 8),
      profile: plan.varietyLabel,
    },
    preset: resolveDesignPreset(config, storyboard, config.niche)?.id || null,
    epidemicMood: getEpidemicMoodForNiche(config.niche, config, storyboard).label,
  };
}

export function augmentSfxTimelineForOverlays(projectDir, overlays = [], starts = [], config = {}) {
  ensureProjectSfxPack(projectDir);

  const timelinePath = path.join(projectDir, "sfx_timeline.json");
  let timeline = { sfx_events: [] };
  if (fs.existsSync(timelinePath)) {
    try {
      timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));
    } catch { /* keep empty */ }
  }

  const events = Array.isArray(timeline.sfx_events) ? [...timeline.sfx_events] : [];
  if (config.overlay_sfx_sync === false) {
    return timeline;
  }

  const hasAt = (time, file) => events.some((e) => Math.abs(Number(e.time) - time) < 0.35 && e.file === file);

  const sfxMul = Number.isFinite(Number(config.overlay_sfx_volume))
    ? Math.max(0.25, Math.min(1.5, Number(config.overlay_sfx_volume)))
    : 1;
  const sfxVol = (v) => Math.round(v * sfxMul * 1000) / 1000;

  const files = {
    tick: "sfx_tick.mp3",
    whoosh: "sfx_whoosh.mp3",
    impact: "sfx_impact.mp3",
    riser: "sfx_riser.mp3",
    room: "sfx_room_tone.mp3",
  };

  const exists = (f) => fs.existsSync(path.join(projectDir, f));

  for (const overlay of overlays) {
    const t = Number(overlay.start);
    if (!Number.isFinite(t)) continue;

    if (overlay.type === "counter" && exists(files.tick) && !hasAt(t, files.tick)) {
      events.push({ time: t, file: files.tick, volume: sfxVol(0.045) });
    }

    if (overlay.type === "bar-chart" && exists(files.tick) && !hasAt(t + 0.05, files.tick)) {
      events.push({ time: t + 0.05, file: files.tick, volume: sfxVol(0.04) });
    }

    if (overlay.type === "kinetic-text" && exists(files.whoosh) && !hasAt(Math.max(0, t - 0.05), files.whoosh)) {
      events.push({ time: Math.max(0, t - 0.05), file: files.whoosh, volume: sfxVol(0.048) });
      if (exists(files.impact) && !hasAt(t + 0.12, files.impact)) {
        events.push({ time: t + 0.12, file: files.impact, volume: sfxVol(0.042) });
      }
    }

    if (overlay.type === "lower-third" && exists(files.whoosh) && !hasAt(Math.max(0, t - 0.08), files.whoosh)) {
      events.push({ time: Math.max(0, t - 0.08), file: files.whoosh, volume: sfxVol(0.032) });
    }

    if (overlay.type === "chapter-stinger" && exists(files.whoosh) && !hasAt(Math.max(0, t - 0.1), files.whoosh)) {
      events.push({ time: Math.max(0, t - 0.1), file: files.whoosh, volume: sfxVol(0.04) });
      if (exists(files.impact) && !hasAt(t + 0.15, files.impact)) {
        events.push({ time: t + 0.15, file: files.impact, volume: sfxVol(0.038) });
      }
    }

    if (overlay.type === "source-card" && exists(files.tick) && !hasAt(t, files.tick)) {
      events.push({ time: t, file: files.tick, volume: sfxVol(0.03) });
    }

    if (overlay.type === "social-post" && exists(files.whoosh) && !hasAt(Math.max(0, t - 0.06), files.whoosh)) {
      events.push({ time: Math.max(0, t - 0.06), file: files.whoosh, volume: sfxVol(0.036) });
    }

    if (overlay.type === "geo-map" && exists(files.tick) && !hasAt(t, files.tick)) {
      events.push({ time: t, file: files.tick, volume: sfxVol(0.035) });
    }

    if (overlay.type === "listicle-stinger" && exists(files.impact) && !hasAt(t, files.impact)) {
      events.push({ time: t, file: files.impact, volume: sfxVol(0.055) });
      if (exists(files.whoosh) && !hasAt(Math.max(0, t - 0.1), files.whoosh)) {
        events.push({ time: Math.max(0, t - 0.1), file: files.whoosh, volume: sfxVol(0.04) });
      }
    }

    if ((overlay.id?.startsWith("listicle-rank") || overlay.id === "listicle-intro-topn")
      && exists(files.whoosh) && !hasAt(Math.max(0, t - 0.25), files.whoosh)) {
      events.push({ time: Math.max(0, t - 0.25), file: files.whoosh, volume: sfxVol(0.04) });
    }

    if (overlay.id === "listicle-progress-hud" && Array.isArray(overlay.props?.segments)) {
      for (const seg of overlay.props.segments) {
        if (seg.mode !== "item" || !seg.rank) continue;
        const tickAt = Number(overlay.start) + Number(seg.at || 0);
        if (!Number.isFinite(tickAt)) continue;
        if (exists(files.whoosh) && !hasAt(Math.max(0, tickAt - 0.08), files.whoosh)) {
          events.push({ time: Math.max(0, tickAt - 0.08), file: files.whoosh, volume: sfxVol(0.038) });
        }
        if (exists(files.tick) && !hasAt(tickAt, files.tick)) {
          events.push({ time: tickAt, file: files.tick, volume: sfxVol(seg.rank === 1 ? 0.06 : 0.05) });
        }
        if (seg.rank === 1 && exists(files.impact) && !hasAt(tickAt + 0.08, files.impact)) {
          events.push({ time: tickAt + 0.08, file: files.impact, volume: sfxVol(0.055) });
        }
        if (seg.rank === 1 && exists(files.riser) && !hasAt(Math.max(0, tickAt - 0.35), files.riser)) {
          events.push({ time: Math.max(0, tickAt - 0.35), file: files.riser, volume: sfxVol(0.035) });
        }
      }
    }

    if (overlay.type === "listicle-recap" && exists(files.impact) && !hasAt(t, files.impact)) {
      events.push({ time: t, file: files.impact, volume: sfxVol(0.04) });
    }
  }

  const startsList = Array.isArray(starts) ? starts : [];
  if (exists(files.room) && startsList.length > 1) {
    for (let i = 0; i < startsList.length - 1; i++) {
      const blockEnd = Number(startsList[i]) + (Number(startsList[i + 1]) - Number(startsList[i]));
      const gapStart = blockEnd - 0.3;
      if (!hasAt(gapStart, files.room)) {
        events.push({ time: Math.max(0, gapStart), file: files.room, volume: sfxVol(0.025) });
      }
    }
  }

  timeline.sfx_events = events;
  fs.writeFileSync(timelinePath, JSON.stringify(timeline, null, 2), "utf8");
  return timeline;
}

export function truncatePropsForPreview(props, previewSeconds = 30) {
  const limit = Math.max(5, Number(previewSeconds) || 30);
  const scenes = (props.scenes || []).filter((s) => Number(s.start) < limit);
  const captions = (props.captions || []).filter((c) => Number(c.startMs) < limit * 1000);
  const overlays = (props.overlays || []).filter((o) => Number(o.start) < limit);
  const bgmTracks = (props.bgmTracks || []).map((t) => ({
    ...t,
    duration: Math.min(Number(t.duration) || limit, limit - Number(t.start || 0)),
  }));
  const sfxTracks = (props.sfxTracks || []).filter((t) => Number(t.start) < limit);

  return {
    ...props,
    totalDuration: limit,
    scenes,
    captions,
    overlays,
    bgmTracks,
    sfxTracks,
    narrationDuration: Math.min(Number(props.narrationDuration) || limit, limit),
    previewMode: true,
  };
}

export function runVideoQualityCheck(projectDir, readProjectJson) {
  const config = readProjectJson(projectDir, "config_qanat.json", {});
  const storyboard = readProjectJson(projectDir, "storyboard.json", {});
  const timings = readProjectJson(projectDir, "block_timings.json", { starts: [], durations: [], total_duration: 0 });

  const totalDuration = Number(timings.total_duration)
    || (timings.starts?.length && timings.durations?.length
      ? timings.starts[timings.starts.length - 1] + timings.durations[timings.durations.length - 1]
      : 60);

  const orchestrationPlan = buildOverlayOrchestrationPlan({
    config,
    niche: config.niche || "Geral",
    totalDuration,
    projectName: path.basename(projectDir),
    blockCount: Array.isArray(timings.starts) ? timings.starts.length : 0,
  });

  let overlays = storyboard.overlays || [];
  overlays = avoidListicleHudCollisions(overlays, config, storyboard);
  overlays = pruneListicleOverlayDensity(overlays, config, storyboard, orchestrationPlan);

  const wordTranscripts = readProjectJson(projectDir, "word_transcripts.json", []);
  const sceneStarts = {};
  const sceneDurations = {};
  if (Array.isArray(storyboard.visual_prompts)) {
    for (const vp of storyboard.visual_prompts) {
      const sceneId = String(vp.scene || `${vp.block || 1}.1`).trim();
      const blockIdx = Math.max(0, Number(vp.block || 1) - 1);
      const blockStart = Number(timings.starts?.[blockIdx]);
      sceneStarts[sceneId] = Number.isFinite(blockStart) ? blockStart : 0;
      sceneDurations[sceneId] = Number(vp.duration_seconds)
        || Number(String(vp.duration || "").replace(/[^\d.]/g, ""))
        || 5;
    }
  }

  const { report: timingReport } = verifyAndRepairAiOverlayTiming(overlays, {
    starts: timings.starts || [],
    durations: timings.durations || [],
    sceneStarts,
    sceneDurations,
    wordTranscripts,
    totalDuration,
    plan: orchestrationPlan,
    repair: false,
  });

  const baseQuality = validateVideoQuality({
    overlays,
    config,
    storyboard,
    totalDuration,
    starts: timings.starts || [],
    durations: timings.durations || [],
    orchestrationPlan,
  });

  const timingIssues = overlayTimingIssuesFromReport(
    storyboard.overlay_timing_report || timingReport,
  );

  return {
    ...baseQuality,
    issues: [...(baseQuality.issues || []), ...timingIssues],
    overlay_timing: storyboard.overlay_timing_report || timingReport,
  };
}

export function resolveThumbnailPalette(config = {}, storyboard = {}, niche = "") {
  const preset = resolveDesignPreset(config, storyboard, niche);
  if (preset?.thumbnailPalette?.length) return preset.thumbnailPalette;
  return ["#D4AF37", "#00E5FF", "#121214"];
}