/**
 * Templates de Frame de identidade (full video) — seed programático por nicho.
 * Usados quando o catálogo ainda não tem frames de nicho desenhados.
 */

const FRAME_TSX = `export default function IdentityFrame(props = {}) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const accent = props.accentColor || props.primaryColor || "#D4AF37";
  const title = props.title || props.niche || "";
  const opacity = Number(props.studio_opacity);
  const a = Number.isFinite(opacity) ? Math.min(1, Math.max(0.15, opacity)) : 0.85;
  const border = Math.max(8, Math.round(Math.min(width, height) * 0.012));
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.04);
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      pointerEvents: "none", boxSizing: "border-box",
      border: border + "px solid " + accent,
      boxShadow: "inset 0 0 " + (40 + pulse * 20) + "px rgba(0,0,0,0.45)",
      opacity: a,
    }}>
      <div style={{
        position: "absolute", top: border + 8, left: border + 12,
        color: accent, fontFamily: "Inter, system-ui, sans-serif",
        fontSize: Math.max(12, Math.round(width * 0.014)),
        fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
        textShadow: "0 1px 4px rgba(0,0,0,0.6)",
      }}>{title}</div>
      <div style={{
        position: "absolute", bottom: border + 8, right: border + 12,
        width: Math.round(width * 0.08), height: 3, background: accent, opacity: 0.7 + pulse * 0.3,
      }} />
    </div>
  );
}`;

function frameTemplate(niche, variant) {
  const id = `seed-frame-${String(niche || "default")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${variant.id}`;
  return {
    id,
    name: `${niche || "Default"} ${variant.label}`,
    category: "frame",
    subcategory: variant.label,
    niche: niche || "DEFAULT",
    status: "approved",
    description: "Frame de identidade full-duration (seed automático).",
    dataSlots: ["title", "accentColor", "studio_opacity", "backgroundColor"],
    motion_template_id: "studio-runtime",
    orchestration_ready: true,
    orchestration_role: "identity_frame",
    shortPreview: "frame",
    longPreview: "frame",
    sourceCode: { short: FRAME_TSX, long: FRAME_TSX },
    has_source_code: true,
    seed_frame: true,
  };
}

const VARIANTS = [
  { id: "full", label: "Full frame" },
  { id: "border", label: "Niche border" },
  { id: "channel", label: "Channel frame" },
  { id: "doc", label: "Documentary frame" },
];

/**
 * Gera seeds de frame para um nicho se o catálogo ainda não tiver category=frame.
 */
export function seedIdentityFramesForNiche(
  niche = "Default",
  existingTemplates = []
) {
  const hasFrame = (existingTemplates || []).some(
    (t) =>
      String(t.category || "")
        .trim()
        .toLowerCase() === "frame"
  );
  if (hasFrame) return [];
  const label = String(niche || "Default").trim() || "Default";
  return VARIANTS.map((v) => frameTemplate(label, v));
}

/**
 * Mescla seeds de frame no catálogo em memória (não grava disco).
 */
export function mergeIdentityFrameSeeds(catalog = {}, niche = "") {
  const niches =
    catalog.niches && typeof catalog.niches === "object" ? catalog.niches : {};
  const next = { ...catalog, niches: { ...niches } };
  const keys = niche
    ? Object.keys(next.niches).filter(
        (k) => k.toLowerCase() === String(niche).toLowerCase()
      )
    : Object.keys(next.niches);
  if (niche && !keys.length) {
    next.niches[niche] = { templates: seedIdentityFramesForNiche(niche, []) };
    return next;
  }
  for (const key of keys.length ? keys : Object.keys(next.niches)) {
    const entry = next.niches[key] || { templates: [] };
    const templates = Array.isArray(entry.templates)
      ? [...entry.templates]
      : [];
    const seeds = seedIdentityFramesForNiche(key, templates);
    next.niches[key] = {
      ...entry,
      templates: seeds.length ? [...templates, ...seeds] : templates,
    };
  }
  return next;
}
