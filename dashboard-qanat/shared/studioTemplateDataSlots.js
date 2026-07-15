/**
 * dataSlots canônicos por categoria/subcategoria — preenche catálogo sujo.
 */

const BY_CATEGORY = {
  "chart-data": ["title", "subtitle", "value", "label", "suffix", "items", "accentColor"],
  text: ["title", "subtitle", "text", "label", "accentColor"],
  "content-animation": ["title", "subtitle", "steps", "items", "accentColor"],
  background: ["accentColor", "backgroundColor", "intensity"],
  cinematic: [
    "sceneAsset",
    "imageUrl",
    "videoUrl",
    "intensity",
    "effect_intensity",
    "accentColor",
    "studio_opacity",
    "backgroundColor",
    "title",
    "subtitle",
  ],
  transition: [
    "sceneAsset",
    "imageUrl",
    "videoUrl",
    "accentColor",
    "durationSeconds",
    "studio_opacity",
    "backgroundColor",
    "title",
    "subtitle",
  ],
  "logo-branding": ["title", "subtitle", "accentColor", "studio_opacity"],
  "intro-outro": ["title", "subtitle", "text", "quote", "attribution", "label", "chapter", "accentColor"],
  "image-media": [
    "title",
    "subtitle",
    "sceneAsset",
    "imageUrl",
    "images",
    "label",
    "accentColor",
  ],
  frame: ["accentColor", "backgroundColor", "title", "studio_opacity"],
};

const BY_SUBCATEGORY = {
  "stat counter": ["value", "label", "suffix", "title", "accentColor"],
  "counter": ["value", "label", "suffix", "title", "accentColor"],
  "bar chart": ["title", "items", "accentColor"],
  "comparison chart": ["title", "items", "accentColor"],
  "progress bars": ["title", "items", "value", "accentColor"],
  "quote card": ["quote", "attribution", "title", "accentColor"],
  "chapter title": ["title", "label", "chapter", "subtitle", "accentColor"],
  "end card": ["title", "subtitle", "text", "accentColor"],
  "subscribe reminder": ["title", "subtitle", "text", "accentColor"],
  "lower third": ["title", "subtitle", "label", "accentColor"],
  "cinematic title intro": ["title", "subtitle", "accentColor"],
  "countdown intro": ["title", "value", "accentColor"],
  "film burn": ["sceneAsset", "intensity", "studio_opacity"],
  "vignette pulse": ["intensity", "studio_opacity", "accentColor"],
  "parallax pan": ["sceneAsset", "imageUrl", "intensity"],
  "ken burns": ["sceneAsset", "imageUrl", "intensity"],
  "full frame": ["accentColor", "title", "studio_opacity"],
  "niche border": ["accentColor", "title", "studio_opacity"],
  "channel frame": ["accentColor", "title", "studio_opacity"],
  "documentary frame": ["accentColor", "title", "studio_opacity"],
};

/**
 * Resolve dataSlots: existentes + defaults da categoria.
 */
export function resolveTemplateDataSlots(template = {}) {
  const existing = Array.isArray(template.dataSlots)
    ? template.dataSlots.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const cat = String(template.category || "")
    .trim()
    .toLowerCase();
  const sub = String(template.subcategory || "")
    .trim()
    .toLowerCase();
  const fromSub = BY_SUBCATEGORY[sub] || [];
  const fromCat = fromSub.length > 0
    ? []
    : BY_CATEGORY[cat] || ["title", "subtitle", "label", "accentColor"];
  const merged = [...existing];
  for (const slot of [...fromSub, ...fromCat]) {
    if (!merged.includes(slot)) merged.push(slot);
  }
  return merged;
}
