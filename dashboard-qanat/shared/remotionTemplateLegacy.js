/** Templates seed antigos (mocks sem export default + useCurrentFrame) — removidos do Studio. */
export const LEGACY_SEED_TEMPLATE_IDS = [
  "eng-map-pip-tactical",
  "geo-continuous-flyover",
  "industrial-kpi-ring",
  "engineering-line-chart",
  "engineering-bar-grid",
  "blueprint-lower-third",
  "structural-process",
];

export function isLegacySeedTemplateId(id = "") {
  return LEGACY_SEED_TEMPLATE_IDS.includes(String(id || "").trim());
}
