/**
 * Slideshow risk score — padrão OpenMontage reviewer (scene_plan / edit gates).
 * Detecta vídeos que parecem slides animados em vez de montagem cinematográfica.
 */

import { isInformativeOverlay, isPlaceholderInformativeOverlay } from "./overlayTiming.js";

const INFORMATIVE_TYPES = new Set([
  "lower-third",
  "counter",
  "bar-chart",
  "timeline",
  "kinetic-text",
  "info-card",
]);

function clampScore(n) {
  return Math.max(1, Math.min(5, Math.round(n * 10) / 10));
}

function avg(nums) {
  if (!nums.length) return 1;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * @returns {{ average: number, verdict: string, dimensions: Record<string, number>, findings: object[] }}
 */
export function scoreSlideshowRisk({
  overlays = [],
  visualPrompts = [],
  config = {},
} = {}) {
  const informative = (overlays || []).filter(
    (o) => o && INFORMATIVE_TYPES.has(o.type) && isInformativeOverlay(o),
  );

  const dimensions = {
    repetition: 1,
    decorative_visuals: 1,
    typography_overreliance: 1,
    weak_motion: 1,
    weak_shot_intent: 1,
  };
  const findings = [];

  if (informative.length >= 2) {
    let sameTypeStreak = 1;
    let maxStreak = 1;
    const positions = new Map();
    for (let i = 1; i < informative.length; i++) {
      if (informative[i].type === informative[i - 1].type) {
        sameTypeStreak += 1;
        maxStreak = Math.max(maxStreak, sameTypeStreak);
      } else {
        sameTypeStreak = 1;
      }
      const pos = String(informative[i].props?.position || informative[i].type);
      positions.set(pos, (positions.get(pos) || 0) + 1);
    }
    if (maxStreak >= 3) {
      dimensions.repetition = 4.5;
      findings.push({
        dimension: "repetition",
        message: `${maxStreak} overlays do mesmo tipo seguidos — varie counter, bar-chart, kinetic-text.`,
      });
    } else if (maxStreak === 2) {
      dimensions.repetition = 2.8;
    }
    const dominantPos = [...positions.entries()].sort((a, b) => b[1] - a[1])[0];
    if (dominantPos && dominantPos[1] >= Math.ceil(informative.length * 0.7)) {
      dimensions.repetition = Math.max(dimensions.repetition, 3.5);
      findings.push({
        dimension: "repetition",
        message: `Posição "${dominantPos[0]}" em ${dominantPos[1]}/${informative.length} overlays — falta variedade visual.`,
      });
    }
  }

  const placeholders = informative.filter(isPlaceholderInformativeOverlay);
  if (placeholders.length) {
    dimensions.decorative_visuals = Math.min(5, 3 + placeholders.length * 0.5);
    findings.push({
      dimension: "decorative_visuals",
      message: `${placeholders.length} overlay(s) placeholder (INFO/vazio) — sem dado visual concreto.`,
    });
  }

  const textHeavy = informative.filter((o) =>
    ["lower-third", "kinetic-text", "info-card"].includes(o.type),
  );
  const textRatio = informative.length ? textHeavy.length / informative.length : 0;
  if (textRatio >= 0.85 && informative.length >= 3) {
    dimensions.typography_overreliance = 4.2;
    findings.push({
      dimension: "typography_overreliance",
      message: `${Math.round(textRatio * 100)}% dos overlays são só texto — adicione counters, charts ou B-roll forte.`,
    });
  } else if (textRatio >= 0.65) {
    dimensions.typography_overreliance = 3.2;
  }

  const sceneCount = Array.isArray(visualPrompts) ? visualPrompts.length : 0;
  const videoScenes = (visualPrompts || []).filter((vp) => {
    const t = String(vp?.type || "").toLowerCase();
    return t.includes("video") || t.includes("mp4");
  }).length;

  if (sceneCount >= 4 && videoScenes === 0 && informative.length >= 2) {
    dimensions.weak_motion = 3.8;
    findings.push({
      dimension: "weak_motion",
      message: "Nenhuma cena de vídeo stock — só imagens estáticas + overlays (risco slideshow).",
    });
  }

  const blocksWithoutQuery = (visualPrompts || []).filter((vp) => {
    const q = String(vp.stock_query || vp.prompt || "").trim();
    return !q || q.length < 8;
  }).length;
  if (blocksWithoutQuery > sceneCount * 0.5 && sceneCount >= 3) {
    dimensions.weak_shot_intent = 3.5;
    findings.push({
      dimension: "weak_shot_intent",
      message: `${blocksWithoutQuery} cena(s) sem stock_query claro — intenção visual fraca.`,
    });
  }

  if (config.content_mode === "LISTICLE" && informative.length === 0 && sceneCount >= 5) {
    dimensions.weak_shot_intent = Math.max(dimensions.weak_shot_intent, 3);
  }

  const scores = Object.values(dimensions);
  const average = clampScore(avg(scores));

  let verdict = "strong";
  if (average >= 4) verdict = "fail";
  else if (average >= 3) verdict = "revise";
  else if (average >= 2.5) verdict = "acceptable";

  return {
    average,
    verdict,
    dimensions,
    findings,
    overlayCount: informative.length,
    sceneCount,
  };
}

export function slideshowRiskToQualityIssues(risk) {
  if (!risk || risk.verdict === "strong" || risk.verdict === "acceptable") return [];
  const severity = risk.verdict === "fail" ? "error" : "warning";
  const code = risk.verdict === "fail" ? "slideshow_risk_fail" : "slideshow_risk_revise";
  const topFinding = risk.findings?.[0]?.message || `Score médio ${risk.average}/5`;
  return [{
    severity,
    code,
    message: `Slideshow risk ${risk.verdict} (${risk.average}/5) — ${topFinding}`,
    slideshow_risk: risk,
  }];
}