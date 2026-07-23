import { APPROVED_ORCHESTRATION_TEMPLATES } from "./motionSceneCatalog.js";

export const STUDIO_RUNTIME_MOTION_ID = "studio-runtime";

export function hasRunnableStudioSource(sourceCode = null) {
  const code = String(sourceCode?.short || sourceCode?.long || "").trim();
  if (!code) return false;
  return (
    /export\s+default\s+function/.test(code) &&
    /\buseCurrentFrame\s*\(/.test(code)
  );
}

export function mapStudioTemplateToMotionId(template = {}) {
  const category = String(template.category || "").trim().toLowerCase();

  if (
    category === "cinematic" ||
    category === "transition" ||
    category === "intro-outro" ||
    category === "background" ||
    category === "frame"
  ) {
    return STUDIO_RUNTIME_MOTION_ID;
  }

  if (category === "logo-branding") return "lower-third";

  const haystack = [
    template.name,
    template.category,
    template.subcategory,
    template.shortPreview,
    template.longPreview,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // BUG FIX: transição/fundo NÃO são contador — viram genérico (studio-runtime)
  if (/transition|wipe|dissolve|fade/.test(haystack)) return STUDIO_RUNTIME_MOTION_ID;
  if (/background|backdrop|pattern|frame/.test(haystack)) return STUDIO_RUNTIME_MOTION_ID;
  if (/logo|bug|watermark|branding/.test(haystack)) return "lower-third";
  if (/lower/.test(haystack)) return "lower-third";
  // shotcraft (aprovados):
  if (/timeline|cronolog|process|roadmap|steps/.test(haystack)) return "timeline-travel";
  if (/counter|contador|stat|circular|progress/.test(haystack)) return "odometer-digit-roll";
  if (/pie|donut|pictogram/.test(haystack)) return "particle-sand-fill";
  if (/bar|bars|line|area|comparison|chart|grafico|gráfico/.test(haystack)) return "chart-live-moves";
  if (/text|title|quote|chapter|glitch|typewriter|kinetic/.test(haystack)) return "gradient-word-sweep";
  if (/mapa|geo|location|satelite|satélite/.test(haystack)) return "space-camera-moves";
  if (/picture.in.picture|pip media|image.media|split screen|gallery|carousel/.test(haystack)) return "space-camera-moves";
  return null;
}

export function isStudioTemplateOrchestrationReady(template = {}) {
  const motionId = mapStudioTemplateToMotionId(template);
  return Boolean(
    motionId &&
    (APPROVED_ORCHESTRATION_TEMPLATES.has(motionId) ||
      motionId === STUDIO_RUNTIME_MOTION_ID) &&
    hasRunnableStudioSource(template.sourceCode)
  );
}
