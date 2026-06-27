/**
 * Melhorias de profissionalismo: listicle #N, preset documentário história,
 * checker de qualidade pré-render e SFX complementares.
 */

import fs from "fs";
import path from "path";
import { buildOverlayOrchestrationPlan } from "./overlayOrchestration.js";
import { detectNicheCategory } from "./overlayOrchestration.js";

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
};

const HISTORY_NICHE_RE = /histor|arqueolog|antig|castelo|egito|inca|curios|roma|império|imperio|medieval|guerra|mito|listicle/i;

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
  if (config.design_preset === DOCUMENTARY_HISTORY_PRESET.id
    || isDocumentaryHistoryNiche(niche, config, storyboard)) {
    return DOCUMENTARY_HISTORY_PRESET;
  }
  return null;
}

export function applyDocumentaryHistoryPreset(config = {}, storyboard = {}, niche = "") {
  if (!isDocumentaryHistoryNiche(niche, config, storyboard)) {
    return { config, storyboard, applied: false };
  }

  const preset = DOCUMENTARY_HISTORY_PRESET;
  const isShort = config.aspect_ratio === "9:16" || config.video_format === "SHORTS";

  const nextConfig = {
    ...config,
    design_preset: preset.id,
    caption_style: isShort ? preset.captionStyle.short : preset.captionStyle.long,
    overlay_theme: preset.theme,
    accent_color: preset.accentColor,
    grain_overlay: preset.grain,
    vignette: preset.vignette,
    font_title: preset.fontTitle,
    font_body: preset.fontBody,
  };

  const nextStoryboard = {
    ...storyboard,
    design_preset: preset.id,
  };

  return { config: nextConfig, storyboard: nextStoryboard, applied: true };
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

export function buildListicleRankOverlays(storyboard = {}, config = {}, starts = [], durations = []) {
  if (!isListicleProject(config, storyboard)) return [];

  const listItems = Array.isArray(storyboard.list_items) ? storyboard.list_items : [];
  const rankCount = Number(config.rank_count || storyboard.listicle?.rank_count || listItems.length || 0);
  const rankOrder = config.rank_order || storyboard.listicle?.rank_order || "desc";
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
        position: "top",
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
        position: isClimax ? "center" : "top",
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

export function injectListicleRankOverlays(overlays = [], storyboard = {}, config = {}, starts = [], durations = []) {
  const rankOverlays = buildListicleRankOverlays(storyboard, config, starts, durations);
  if (!rankOverlays.length) return overlays;

  const existingIds = new Set((overlays || []).map((o) => o.id));
  const merged = [...(overlays || [])];

  for (const ro of rankOverlays) {
    if (existingIds.has(ro.id)) continue;
    const dupRank = merged.some(
      (o) => o.type === "kinetic-text" && String(o.props?.text || "").includes(`#${ro.id.split("-").pop()}`),
    );
    if (dupRank) continue;
    merged.push(ro);
    existingIds.add(ro.id);
  }

  merged.sort((a, b) => (Number(a.start) || 0) - (Number(b.start) || 0));
  console.log(`[Listicle] ${rankOverlays.length} overlays de ranking #N injetados.`);
  return merged;
}

function wordCount(text = "") {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

export function validateVideoQuality({
  overlays = [],
  config = {},
  storyboard = {},
  totalDuration = 0,
  starts = [],
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
    if (overlay.start < hookEnd && overlay.type !== "kinetic-text") {
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
  };
}

export function augmentSfxTimelineForOverlays(projectDir, overlays = []) {
  const timelinePath = path.join(projectDir, "sfx_timeline.json");
  let timeline = { sfx_events: [] };
  if (fs.existsSync(timelinePath)) {
    try {
      timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));
    } catch { /* keep empty */ }
  }

  const events = Array.isArray(timeline.sfx_events) ? [...timeline.sfx_events] : [];
  const hasAt = (time, file) => events.some((e) => Math.abs(Number(e.time) - time) < 0.4 && e.file === file);

  const tickFile = "sfx_tick.mp3";
  const whooshFile = "sfx_whoosh.mp3";
  const tickExists = fs.existsSync(path.join(projectDir, tickFile));
  const whooshExists = fs.existsSync(path.join(projectDir, whooshFile));

  for (const overlay of overlays) {
    const t = Number(overlay.start);
    if (!Number.isFinite(t)) continue;

    if (overlay.type === "counter" && tickExists && !hasAt(t, tickFile)) {
      events.push({ time: t, file: tickFile, volume: 0.045 });
    }

    if ((overlay.id?.startsWith("listicle-rank") || overlay.id === "listicle-intro-topn")
      && whooshExists && !hasAt(Math.max(0, t - 0.25), whooshFile)) {
      events.push({ time: Math.max(0, t - 0.25), file: whooshFile, volume: 0.04 });
    }
  }

  timeline.sfx_events = events;
  fs.writeFileSync(timelinePath, JSON.stringify(timeline, null, 2), "utf8");
  return timeline;
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
  });
}