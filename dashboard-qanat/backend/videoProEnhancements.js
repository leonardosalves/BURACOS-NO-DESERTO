/**
 * Melhorias de profissionalismo: presets, listicle PRO, quality checker,
 * SFX/BGM, Epidemic mood e export TTS cinematográfico.
 */

import fs from "fs";
import path from "path";
import { buildOverlayOrchestrationPlan, detectNicheCategory } from "./overlayOrchestration.js";

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

export const DESIGN_PRESETS = {
  [DOCUMENTARY_HISTORY_PRESET.id]: DOCUMENTARY_HISTORY_PRESET,
  [DOCUMENTARY_MYSTERY_PRESET.id]: DOCUMENTARY_MYSTERY_PRESET,
  [DOCUMENTARY_GEOGRAPHY_PRESET.id]: DOCUMENTARY_GEOGRAPHY_PRESET,
  [DOCUMENTARY_DATA_PRESET.id]: DOCUMENTARY_DATA_PRESET,
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

export function isListicleProject(config = {}, storyboard = {}) {
  return config.content_mode === "LISTICLE"
    || storyboard?.listicle?.content_mode === "LISTICLE";
}

export function isDocumentaryHistoryNiche(niche = "", config = {}, storyboard = {}) {
  const topic = String(storyboard?.listicle?.topic || config.list_topic || "").toLowerCase();
  const n = String(niche || config.niche || "").toLowerCase();
  return HISTORY_NICHE_RE.test(n) || HISTORY_NICHE_RE.test(topic)
    || detectNicheCategory(niche) === "history";
}

export function resolveDesignPreset(config = {}, storyboard = {}, niche = "") {
  const explicit = config.design_preset || storyboard.design_preset;
  if (explicit && DESIGN_PRESETS[explicit]) {
    return DESIGN_PRESETS[explicit];
  }

  const topic = String(storyboard?.listicle?.topic || config.list_topic || "").toLowerCase();
  const n = String(niche || config.niche || "").toLowerCase();
  const combined = `${n} ${topic}`;

  if (MYSTERY_NICHE_RE.test(combined)) return DOCUMENTARY_MYSTERY_PRESET;
  if (GEO_NICHE_RE.test(combined) || detectNicheCategory(niche) === "nature") return DOCUMENTARY_GEOGRAPHY_PRESET;
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
  const nextConfig = {
    ...config,
    design_preset: preset.id,
    caption_style: isShort ? preset.captionStyle.short : preset.captionStyle.long,
    overlay_theme: preset.theme,
    accent_color: preset.accentColor,
    secondary_color: preset.secondaryColor,
    grain_overlay: preset.grain,
    vignette: preset.vignette,
    font_title: preset.fontTitle,
    font_body: preset.fontBody,
  };

  const nextStoryboard = {
    ...storyboard,
    design_preset: preset.id,
  };

  return { config: nextConfig, storyboard: nextStoryboard, applied: true, preset };
}

export function getEpidemicMoodForNiche(niche = "", config = {}, storyboard = {}) {
  const preset = resolveDesignPreset(config, storyboard, niche);
  if (preset?.id === DOCUMENTARY_MYSTERY_PRESET.id) return EPIDEMIC_MOOD_BY_CATEGORY.mystery;
  if (preset?.id === DOCUMENTARY_GEOGRAPHY_PRESET.id) return EPIDEMIC_MOOD_BY_CATEGORY.nature;
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
      duration: 0.42,
      props: { accentColor: accent },
    });
  }

  return overlays;
}

export function buildListicleProgressOverlays(storyboard = {}, config = {}, starts = [], durations = []) {
  if (!isListicleProject(config, storyboard)) return [];

  const { listItems, rankCount, rankOrder } = getListicleMeta(storyboard, config);
  const startsList = Array.isArray(starts) ? starts : [];
  const durationsList = Array.isArray(durations) ? durations : [];
  const preset = resolveDesignPreset(config, storyboard, config.niche);
  const accent = preset?.accentColor || config.accent_color || "#C5A880";
  const overlays = [];

  const itemBlocks = [];
  if (listItems.length) {
    for (const item of listItems) {
      const block = Number(item.block);
      const rank = Number(item.rank);
      if (block > 1 && rank) itemBlocks.push({ block, rank });
    }
  } else if (rankCount > 0) {
    for (let i = 0; i < rankCount; i++) {
      itemBlocks.push({
        block: i + 2,
        rank: rankOrder === "desc" ? rankCount - i : i + 1,
      });
    }
  }

  itemBlocks.sort((a, b) => a.block - b.block);

  for (let i = 0; i < itemBlocks.length; i++) {
    const { block, rank } = itemBlocks[i];
    const blockStart = Number(startsList[block - 1]);
    if (!Number.isFinite(blockStart)) continue;
    const blockDur = Number(durationsList[block - 1]) || 6;

    overlays.push({
      id: `listicle-progress-${rank}`,
      type: "rank-progress",
      start: blockStart + 0.1,
      duration: Math.max(2.5, blockDur - 0.3),
      props: {
        current: rank,
        progress: i + 1,
        total: itemBlocks.length,
        rank,
        rankOrder: rankOrder === "asc" ? "asc" : "desc",
        accentColor: accent,
      },
    });
  }

  return overlays;
}

export function buildListicleRecapOverlay(storyboard = {}, config = {}, starts = [], durations = []) {
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

  const topLines = sortedItems.length
    ? sortedItems.slice(0, 3).map((it) => `#${it.rank} ${String(it.title || it.name || "").trim()}`).filter(Boolean)
    : Array.from({ length: Math.min(3, rankCount) }, (_, i) => {
      const r = rankOrder === "desc" ? i + 1 : rankCount - i;
      return `#${r}`;
    });

  const description = topLines.length
    ? topLines.join(" · ")
    : "Recap do ranking";

  const outroDur = Number(durationsList[outroIdx]) || 6;

  return {
    id: "listicle-recap",
    type: "info-card",
    start: outroStart + 0.5,
    duration: Math.min(outroDur - 0.5, 5),
    props: {
      title: "TOP 3 — RECAP",
      description: `${description}\nQual você colocaria em 1º? Comenta!`,
      iconType: "crown",
      position: "bottom-right",
      accentColor: accent,
      variant: "accent",
      theme: preset?.theme || "ancient",
    },
  };
}

export function buildListicleRankOverlays(storyboard = {}, config = {}, starts = [], durations = []) {
  if (!isListicleProject(config, storyboard)) return [];

  const { listItems, rankCount, rankOrder } = getListicleMeta(storyboard, config);
  const startsList = Array.isArray(starts) ? starts : [];
  const preset = resolveDesignPreset(config, storyboard, config.niche);
  const accent = preset?.accentColor || config.accent_color || "#C5A880";
  const overlays = [];

  const introStart = Number(startsList[0]);
  if (Number.isFinite(introStart) && rankCount > 0) {
    overlays.push({
      id: "listicle-intro-topn",
      type: "kinetic-text",
      start: introStart + 0.8,
      duration: 2.8,
      props: {
        text: `TOP ${rankCount}`,
        style: "reveal",
        accentColor: accent,
        position: "center",
      },
    });
  }

  const pushRankOverlay = (rank, title, block, isClimax = false) => {
    const blockIdx = block - 1;
    const blockStart = Number(startsList[blockIdx]);
    if (!Number.isFinite(blockStart)) return;

    const text = title
      ? `#${rank} — ${String(title).toUpperCase()}`.slice(0, 44)
      : `#${rank}`;

    overlays.push({
      id: `listicle-rank-${rank}`,
      type: "kinetic-text",
      start: blockStart + 0.35,
      duration: isClimax ? 3.6 : 2.5,
      props: {
        text,
        style: isClimax ? "slam" : "reveal",
        accentColor: isClimax ? "#D4AF37" : accent,
        position: isClimax ? "center" : "center",
      },
    });
  };

  if (listItems.length) {
    for (const item of listItems) {
      const block = Number(item.block);
      const rank = Number(item.rank);
      const title = String(item.title || item.name || "").trim();
      if (!block || !rank) continue;
      const isClimax = rankOrder === "desc" ? rank === 1 : rank === rankCount;
      pushRankOverlay(rank, title, block, isClimax);
    }
  } else if (rankCount > 0) {
    for (let i = 0; i < rankCount; i++) {
      const block = i + 2;
      const rank = rankOrder === "desc" ? rankCount - i : i + 1;
      const isClimax = rank === (rankOrder === "desc" ? 1 : rankCount);
      pushRankOverlay(rank, "", block, isClimax);
    }
  }

  return overlays;
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

const LISTICLE_HUD_TYPES = new Set(["rank-progress", "listicle-stinger"]);
const LISTICLE_SAFE_POSITIONS = ["bottom-right", "bottom-left", "bottom-center"];

function isListicleHudOverlay(overlay) {
  if (!overlay) return false;
  return LISTICLE_HUD_TYPES.has(overlay.type)
    || String(overlay.id || "").startsWith("listicle-");
}

function usesTopScreenZone(position = "") {
  const pos = String(position).toLowerCase();
  return pos === "top"
    || pos === "center"
    || pos.includes("top");
}

function relocateOverlayAwayFromListicleHud(overlay) {
  if (!overlay?.props || isListicleHudOverlay(overlay)) return overlay;

  const pos = overlay.props.position;
  const needsMove = usesTopScreenZone(pos)
    || (overlay.type === "counter" && (!pos || pos === "center"))
    || (overlay.type === "timeline" && (!pos || pos === "center"));

  if (!needsMove) return overlay;

  const next = { ...overlay, props: { ...overlay.props } };

  if (next.type === "counter" || next.type === "timeline" || next.type === "bar-chart") {
    next.props.position = "bottom-right";
  } else if (next.type === "info-card") {
    next.props.position = "bottom-left";
  } else if (next.type === "kinetic-text") {
    next.props.position = "bottom";
  } else if (next.type === "lower-third") {
    next.props.position = "bottom-left";
  } else {
    next.props.position = "bottom-right";
  }

  return next;
}

export function avoidListicleHudCollisions(overlays = [], config = {}, storyboard = {}) {
  if (!isListicleProject(config, storyboard)) return overlays || [];
  return (overlays || []).map(relocateOverlayAwayFromListicleHud);
}

export function injectListicleRankOverlays(overlays = [], storyboard = {}, config = {}, starts = [], durations = []) {
  const batches = [
    buildListicleRankOverlays(storyboard, config, starts, durations),
    buildListicleStingerOverlays(storyboard, config, starts),
    buildListicleProgressOverlays(storyboard, config, starts, durations),
  ];

  const openLoop = buildOpenLoopIntroOverlay(storyboard, config, starts);
  if (openLoop) batches.push([openLoop]);

  const recap = buildListicleRecapOverlay(storyboard, config, starts, durations);
  if (recap) batches.push([recap]);

  let merged = avoidListicleHudCollisions(overlays, config, storyboard);
  let added = 0;
  for (const batch of batches) {
    const before = merged.length;
    merged = mergeOverlays(merged, batch);
    added += merged.length - before;
  }

  if (added) {
    console.log(`[Listicle PRO] ${added} overlays profissionais injetados.`);
  }
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
    const gap = sorted[i].start - sorted[i - 1].start;
    if (gap < plan.limits.minGapSeconds) {
      issues.push({
        severity: "info",
        code: "gap_short",
        message: `Gap de ${gap.toFixed(1)}s entre "${sorted[i - 1].id}" e "${sorted[i].id}" (mín. ${plan.limits.minGapSeconds}s)`,
      });
    }
  }

  if (sorted.length > plan.limits.maxTotal) {
    issues.push({
      severity: "error",
      code: "overlay_budget",
      message: `${sorted.length} overlays — orçamento máximo: ${plan.limits.maxTotal}`,
    });
  }

  if (isListicleProject(config, storyboard)) {
    const rankOverlays = sorted.filter((o) => o.id?.startsWith("listicle-rank") || o.id === "listicle-intro-topn");
    const expected = Number(config.rank_count || storyboard.listicle?.rank_count || 0);
    if (rankOverlays.length < Math.min(expected, 1)) {
      issues.push({
        severity: "warning",
        code: "listicle_no_rank",
        message: "Listicle sem overlays de ranking #N — contadores visuais ausentes",
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

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 25 - warnings * 8 - issues.filter((i) => i.severity === "info").length * 2);

  return {
    ok: errors === 0,
    score,
    issues,
    plan: { format: plan.format, maxOverlays: plan.limits.maxTotal, profile: plan.varietyLabel },
    preset: resolveDesignPreset(config, storyboard, config.niche)?.id || null,
    epidemicMood: getEpidemicMoodForNiche(config.niche, config, storyboard).label,
  };
}

export function augmentSfxTimelineForOverlays(projectDir, overlays = [], starts = []) {
  ensureProjectSfxPack(projectDir);

  const timelinePath = path.join(projectDir, "sfx_timeline.json");
  let timeline = { sfx_events: [] };
  if (fs.existsSync(timelinePath)) {
    try {
      timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));
    } catch { /* keep empty */ }
  }

  const events = Array.isArray(timeline.sfx_events) ? [...timeline.sfx_events] : [];
  const hasAt = (time, file) => events.some((e) => Math.abs(Number(e.time) - time) < 0.35 && e.file === file);

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
      events.push({ time: t, file: files.tick, volume: 0.045 });
    }

    if (overlay.type === "listicle-stinger" && exists(files.impact) && !hasAt(t, files.impact)) {
      events.push({ time: t, file: files.impact, volume: 0.055 });
      if (exists(files.whoosh) && !hasAt(Math.max(0, t - 0.1), files.whoosh)) {
        events.push({ time: Math.max(0, t - 0.1), file: files.whoosh, volume: 0.04 });
      }
    }

    if ((overlay.id?.startsWith("listicle-rank") || overlay.id === "listicle-intro-topn")
      && exists(files.whoosh) && !hasAt(Math.max(0, t - 0.25), files.whoosh)) {
      events.push({ time: Math.max(0, t - 0.25), file: files.whoosh, volume: 0.04 });
    }
  }

  const startsList = Array.isArray(starts) ? starts : [];
  if (exists(files.room) && startsList.length > 1) {
    for (let i = 0; i < startsList.length - 1; i++) {
      const blockEnd = Number(startsList[i]) + (Number(startsList[i + 1]) - Number(startsList[i]));
      const gapStart = blockEnd - 0.3;
      if (!hasAt(gapStart, files.room)) {
        events.push({ time: Math.max(0, gapStart), file: files.room, volume: 0.025 });
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
  const overlays = storyboard.overlays || [];

  const totalDuration = Number(timings.total_duration)
    || (timings.starts?.length && timings.durations?.length
      ? timings.starts[timings.starts.length - 1] + timings.durations[timings.durations.length - 1]
      : 60);

  return validateVideoQuality({
    overlays,
    config,
    storyboard,
    totalDuration,
    starts: timings.starts || [],
    durations: timings.durations || [],
  });
}

export function resolveThumbnailPalette(config = {}, storyboard = {}, niche = "") {
  const preset = resolveDesignPreset(config, storyboard, niche);
  if (preset?.thumbnailPalette?.length) return preset.thumbnailPalette;
  return ["#D4AF37", "#00E5FF", "#121214"];
}