/**
 * Extrai exampleProps e chaves de design do source TSX do Template Studio
 * para o inspector do Timing (ENG-3107, ANÁLISE TÉCNICA, MEGAESTRUTURA…).
 */

/**
 * Parse superficial de `export const exampleProps = { ... }` do source.
 * @param {string} sourceCode
 * @returns {Record<string, unknown>}
 */
export function extractExamplePropsFromSource(sourceCode = "") {
  const src = String(sourceCode || "");
  if (!src.trim()) return {};

  // export const exampleProps: Type = { ... };
  // export const exampleProps = { ... };
  const m = src.match(
    /export\s+const\s+exampleProps(?:\s*:\s*[^=]+)?\s*=\s*(\{[\s\S]*?\n\s*\});/
  );
  if (!m?.[1]) {
    // fallback: first object after exampleProps =
    const m2 = src.match(
      /exampleProps(?:\s*:\s*[^=]+)?\s*=\s*(\{[\s\S]{10,4000}?\})/
    );
    if (!m2?.[1]) return {};
    return parseLooseObjectLiteral(m2[1]);
  }
  return parseLooseObjectLiteral(m[1]);
}

/**
 * @param {string} objLit
 * @returns {Record<string, unknown>}
 */
function parseLooseObjectLiteral(objLit) {
  try {
    // JSON-ish: keys unquoted → quote; single quotes → double; trailing commas
    let s = objLit
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(\w+)\s*:/g, '"$1":')
      .replace(/'/g, '"')
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/\n/g, " ");
    // remove trailing commas again
    s = s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    return JSON.parse(s);
  } catch {
    // regex fallback key by key
    const out = {};
    const re =
      /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(?:"([^"]*)"|'([^']*)'|(-?\d+(?:\.\d+)?)|(true|false))/g;
    let match;
    while ((match = re.exec(objLit)) !== null) {
      const key = match[1];
      if (match[2] !== undefined) out[key] = match[2];
      else if (match[3] !== undefined) out[key] = match[3];
      else if (match[4] !== undefined) out[key] = Number(match[4]);
      else if (match[5] !== undefined) out[key] = match[5] === "true";
    }
    return out;
  }
}

/** Ordem de exibição no Timing (só se o template tiver a chave). */
const DESIGN_KEY_ORDER = [
  "title",
  "subtitle",
  "eyebrow",
  "kicker",
  "projectCode",
  "statusText",
  "panelLabel",
  "location",
  "tag",
  "label",
  "signalLabel",
  "scanLabel",
  "burnLabel",
  "handle",
  "ctaText",
  "channelName",
  "leftCardTitle",
  "leftCardSubtitle",
  "rightCardTitle",
  "rightCardSubtitle",
  "text",
  "quote",
  "attribution",
  "headline",
  "subhead",
  "mainTitle",
  "mainSubtitle",
  "descriptorText",
  "overlayText",
  "caption",
  "badge",
  "sceneAsset",
  "imageUrl",
  "videoUrl",
  "backgroundImage",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "textColor",
  "backgroundColor",
  "studio_opacity",
];

const META_PROP_KEYS = new Set([
  "studio_props",
  "studio_props_meta",
  "studio_user_locked",
  "studio_user_locked_slots",
  "studio_source_code",
  "studio_role",
  "studio_template_id",
  "studio_template_name",
  "motion_scene",
  "media_mode",
  "narration_text",
  "scene_ref",
  "overlayType",
  "timing_manual",
  "durationInFrames",
  "effect_intensity",
  "geo_pip_composite",
  "geo_prompt",
  "scene_asset",
]);

function isInspectorSlotKey(key = "") {
  const k = String(key || "").trim();
  if (!k) return false;
  if (k.startsWith("template_studio")) return false;
  if (k.startsWith("studio_") && k !== "studio_opacity") return false;
  if (META_PROP_KEYS.has(k)) return false;
  if (k.startsWith("geo_")) return false;
  return true;
}

/**
 * Chaves usadas no destructuring `const { title = "…", … } = props`.
 * Fallback se exampleProps não parsear.
 * @param {string} sourceCode
 * @returns {string[]}
 */
export function extractDestructurePropKeys(sourceCode = "") {
  const src = String(sourceCode || "");
  const keys = [];
  const re =
    /(?:const|let)\s*\{([\s\S]*?)\}\s*=\s*(?:props|inputProps|\{\s*\.\.\.props)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const body = m[1];
    const keyRe = /([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|,|\})/g;
    let km;
    while ((km = keyRe.exec(body)) !== null) {
      const k = km[1];
      if (k && !keys.includes(k) && isInspectorSlotKey(k)) keys.push(k);
    }
  }
  return keys;
}

/**
 * Campos do TEMPLATE SELECIONADO no clip — NÃO a lista global de todos os templates.
 * Fonte: exampleProps do source + dataSlots deste clip (+ destructuring se vazio).
 * @param {object} clip
 * @returns {string[]}
 */
export function extractDesignPropKeys(clip = {}) {
  const props = clip.props || {};
  const source = String(props.studio_source_code || "");
  const example = extractExamplePropsFromSource(source);
  const exampleKeys = Object.keys(example).filter(isInspectorSlotKey);

  const dataSlots = Array.isArray(props.template_studio_data_slots)
    ? props.template_studio_data_slots
        .map((s) => String(s).trim())
        .filter(isInspectorSlotKey)
    : [];

  // Só chaves DESTE template
  const allowed = new Set();
  for (const k of exampleKeys) allowed.add(k);
  for (const k of dataSlots) {
    // dataSlots sem example: ainda é do template selecionado
    allowed.add(k);
  }

  // Se não achou exampleProps, usa destructuring do TSX deste template
  if (allowed.size === 0 && source.trim()) {
    for (const k of extractDestructurePropKeys(source)) allowed.add(k);
  }

  // studio_props: só se a chave já é do template (example/slots) — evita lixo de outros templates
  // (não adiciona chaves novas de studio_props sozinhas)

  if (allowed.size === 0) {
    // último recurso: slots declarados ou nada
    return dataSlots.slice(0, 24);
  }

  // Ordena: DESIGN_KEY_ORDER primeiro, depois o resto do template
  const ordered = [];
  for (const key of DESIGN_KEY_ORDER) {
    if (allowed.has(key)) ordered.push(key);
  }
  for (const key of [...exampleKeys, ...dataSlots, ...allowed]) {
    if (!ordered.includes(key) && allowed.has(key)) ordered.push(key);
  }
  return ordered;
}

/** Labels amigáveis PT-BR para o inspector. */
export const SLOT_LABELS = {
  title: "Título grande (MEGAESTRUTURA)",
  subtitle: "Subtítulo",
  eyebrow: "Faixa superior (ANÁLISE TÉCNICA)",
  kicker: "Kicker / faixa",
  projectCode: "Código (ENG-3107)",
  statusText: "Status (SISTEMA ATIVO)",
  panelLabel: "Label do painel",
  location: "Local / setor / tag",
  tag: "Tag",
  label: "Label",
  text: "Texto",
  handle: "Handle (@canal)",
  ctaText: "CTA (INSCREVA-SE)",
  channelName: "Nome do canal",
  signalLabel: "Label de sinal",
  scanLabel: "Label de scan",
  burnLabel: "Label de burn",
  leftCardTitle: "Card esquerdo · título",
  leftCardSubtitle: "Card esquerdo · subtítulo",
  rightCardTitle: "Card direito · título",
  rightCardSubtitle: "Card direito · subtítulo",
  sceneAsset: "Asset da cena",
  imageUrl: "Imagem",
  videoUrl: "Vídeo",
  accentColor: "Cor de destaque",
  primaryColor: "Cor primária",
  secondaryColor: "Cor secundária",
  backgroundColor: "Cor de fundo",
  studio_opacity: "Opacidade",
  effect_intensity: "Intensidade do efeito",
};

/** Exemplos clássicos do template — valor e placeholder no Timing (nunca vazio). */
export const SLOT_PLACEHOLDER_EXAMPLES = {
  title: "MEGAESTRUTURA",
  subtitle: "A engenharia por trás do impossível",
  eyebrow: "ANÁLISE TÉCNICA",
  kicker: "ANÁLISE TÉCNICA",
  projectCode: "ENG-3107",
  statusText: "SISTEMA ATIVO",
  panelLabel: "BLUEPRINT INTRO",
  location: "SETOR ESTRUTURAL",
  tag: "SETOR ESTRUTURAL",
  label: "Label",
  text: "Texto na tela",
  handle: "@canal",
  ctaText: "INSCREVA-SE",
  channelName: "Nome do canal",
  signalLabel: "SINAL",
  scanLabel: "SCAN",
  burnLabel: "BURN",
  leftCardTitle: "Card esquerdo",
  leftCardSubtitle: "Detalhe esquerdo",
  rightCardTitle: "Card direito",
  rightCardSubtitle: "Detalhe direito",
  headline: "Título",
  subhead: "Subtítulo",
  quote: "Citação",
  attribution: "— Autor",
  descriptorText: "Descrição curta",
  primaryColor: "#22d3ee",
  secondaryColor: "#0ea5e9",
  accentColor: "#facc15",
  backgroundColor: "#030712",
  textColor: "#f8fafc",
};

const DESIGN_TEXT_SLOTS = new Set([
  "title",
  "subtitle",
  "eyebrow",
  "kicker",
  "projectCode",
  "statusText",
  "panelLabel",
  "location",
  "tag",
  "ctaText",
  "handle",
  "channelName",
  "text",
  "headline",
  "subhead",
  "quote",
  "attribution",
]);

const DESIGN_ROLES = new Set([
  "intro",
  "end_card",
  "chapter_title",
  "subscribe_mid",
  "quote",
  "lower_third",
]);

/**
 * Placeholder = valor do exampleProps DESTE template.
 * Não inventa MEGAESTRUTURA/ENG-3107 se o template selecionado não tem essa prop.
 * @param {string} slot
 * @param {Record<string, unknown>|null} [exampleProps]
 */
export function slotPlaceholderExample(slot = "", exampleProps = null) {
  const ex = exampleProps && exampleProps[slot];
  if (ex !== undefined && ex !== null && String(ex).trim() !== "") {
    return String(ex);
  }
  // Só usa fallback genérico se o template realmente declara a chave (valor vazio)
  if (
    exampleProps &&
    Object.prototype.hasOwnProperty.call(exampleProps, slot) &&
    SLOT_PLACEHOLDER_EXAMPLES[slot] !== undefined
  ) {
    return String(SLOT_PLACEHOLDER_EXAMPLES[slot]);
  }
  return SLOT_LABELS[slot] || String(slot || "editar…");
}

function looksLikeNarrationPollution(value) {
  const cur = String(value ?? "").trim();
  if (!cur) return true;
  const words = cur.split(/\s+/).filter(Boolean).length;
  return cur.length > 48 || words > 8;
}

/**
 * Valor efetivo: props do clip → studio_props → exampleProps → exemplo clássico.
 * @param {object} clip
 * @param {string} slot
 * @param {Record<string, unknown>} [exampleProps]
 */
export function resolveEffectiveSlotValue(
  clip = {},
  slot = "",
  exampleProps = null
) {
  const props = clip.props || {};
  const studio =
    props.studio_props && typeof props.studio_props === "object"
      ? props.studio_props
      : {};
  const example =
    exampleProps ||
    extractExamplePropsFromSource(String(props.studio_source_code || ""));

  if (props[slot] !== undefined && props[slot] !== null && props[slot] !== "") {
    return props[slot];
  }
  if (
    studio[slot] !== undefined &&
    studio[slot] !== null &&
    studio[slot] !== ""
  ) {
    return studio[slot];
  }
  if (
    example[slot] !== undefined &&
    example[slot] !== null &&
    example[slot] !== ""
  ) {
    return example[slot];
  }
  return "";
}

/**
 * Valor no inspector Timing: sempre mostra o texto do template (ENG-3107, MEGAESTRUTURA…).
 * Se title veio poluído com narração longa, mostra o default de design.
 * @param {object} clip
 * @param {string} slot
 * @param {Record<string, unknown>} [exampleProps]
 */
export function resolveInspectorDisplayValue(
  clip = {},
  slot = "",
  exampleProps = null
) {
  const props = clip.props || {};
  const example =
    exampleProps ||
    extractExamplePropsFromSource(String(props.studio_source_code || ""));
  const locked = new Set(
    (Array.isArray(props.studio_user_locked_slots)
      ? props.studio_user_locked_slots
      : []
    ).map((s) => String(s).trim())
  );
  const role = String(props.studio_role || "")
    .trim()
    .toLowerCase();
  const raw = resolveEffectiveSlotValue(clip, slot, example);
  const hasExampleKey =
    example && Object.prototype.hasOwnProperty.call(example, slot);
  const exampleVal =
    hasExampleKey && example[slot] !== undefined && example[slot] !== null
      ? example[slot]
      : null;

  // Design roles: narração longa no title → mostra default DESTE template
  if (
    DESIGN_ROLES.has(role) &&
    DESIGN_TEXT_SLOTS.has(slot) &&
    !locked.has(slot) &&
    looksLikeNarrationPollution(raw)
  ) {
    if (exampleVal !== null && String(exampleVal).trim()) return exampleVal;
  }

  if (raw === undefined || raw === null || String(raw).trim() === "") {
    if (exampleVal !== null && String(exampleVal).trim()) return exampleVal;
    return "";
  }
  return raw;
}

export function slotLabel(slot = "") {
  return SLOT_LABELS[slot] || slot;
}
