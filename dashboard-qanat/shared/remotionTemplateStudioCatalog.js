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
  const category = String(template.category || "")
    .trim()
    .toLowerCase();

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

  if (/transition|wipe|dissolve|fade/.test(haystack)) return "counter";
  if (/background|backdrop|pattern|frame/.test(haystack)) return "counter";
  if (/logo|bug|watermark|branding/.test(haystack)) return "lower-third";
  if (/lower/.test(haystack)) return "lower-third";
  if (/timeline|cronolog|process|roadmap|steps/.test(haystack))
    return "timeline";
  if (/counter|contador|stat|circular|progress/.test(haystack))
    return "counter";
  if (/pie|donut|pictogram/.test(haystack)) return "pictogram-chart";
  if (/bar|bars|line|area|comparison|chart|grafico|gráfico/.test(haystack))
    return "bar-chart";
  if (/text|title|quote|chapter|glitch|typewriter|kinetic/.test(haystack))
    return "kinetic-text";
  if (/mapa|geo|location|satelite|satélite/.test(haystack))
    return "location-intro";
  if (
    /picture.in.picture|pip media|image.media|split screen|gallery|carousel/.test(
      haystack
    )
  )
    return "location-intro";
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
