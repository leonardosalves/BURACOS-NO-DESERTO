/**
 * Autofill IA de campos do template Remotion no Timing.
 * Muda só props do clip no projeto — nunca grava no catálogo/base do template.
 *
 * Regras:
 * - Textos curtos (1–4 palavras) na maioria dos slots
 * - Sem quebra no meio da palavra
 * - Quote/text podem ser um pouco maiores
 * - Palavra-chave da cena (narração sob o clip)
 * - Propósito do template (role/categoria/nome)
 * - Sem poluição visual (não preencher tudo com frase longa)
 */

/** Slots que aceitam texto um pouco mais longo. */
export const LONG_TEXT_SLOTS = new Set([
  "quote",
  "text",
  "attribution",
  "descriptorText",
  "subtitle",
]);

/** Máx. palavras por tipo de slot. */
export function maxWordsForSlot(slot = "") {
  const s = String(slot || "");
  if (s === "quote" || s === "text") return 12;
  if (s === "subtitle" || s === "descriptorText") return 6;
  if (s === "attribution") return 5;
  if (/color|opacity|intensity|scale|value|count|duration/i.test(s)) return 1;
  return 4;
}

export function maxCharsForSlot(slot = "") {
  const s = String(slot || "");
  if (s === "quote" || s === "text") return 72;
  if (s === "subtitle" || s === "descriptorText") return 42;
  if (s === "projectCode" || s === "statusText") return 18;
  if (s === "eyebrow" || s === "kicker" || s === "tag" || s === "label")
    return 22;
  if (s === "title" || s === "headline" || s === "mainTitle") return 28;
  if (s === "ctaText" || s === "handle") return 16;
  return 32;
}

/**
 * Garante palavras inteiras — nunca corta no meio de letra.
 * @param {string} text
 * @param {number} maxWords
 * @param {number} maxChars
 */
export function clampWholeWords(text = "", maxWords = 4, maxChars = 32) {
  let t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  // Remove pontuação excessiva no fim
  t = t.replace(/^["'«»]+|["'«»]+$/g, "").trim();
  const words = t.split(/\s+/).filter(Boolean);
  // Acumula palavras inteiras até o limite de palavras E de chars
  const kept = [];
  for (
    let i = 0;
    i < words.length && kept.length < Math.max(1, maxWords);
    i += 1
  ) {
    const w = words[i];
    const candidate = kept.length ? `${kept.join(" ")} ${w}` : w;
    if (candidate.length > maxChars) {
      // se a 1ª palavra sozinha estoura, devolve ela inteira (nunca corta letras)
      if (!kept.length) return w;
      break;
    }
    kept.push(w);
  }
  return kept.join(" ").trim();
}

/**
 * Extrai palavra-chave / gancho curto da narração da cena.
 * @param {string} narration
 */
export function extractSceneKeyword(narration = "") {
  const raw = String(narration || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";

  // Preferir número + substantivo (ex.: "6 toneladas", "7000 km/h")
  const numPhrase = raw.match(
    /\b(\d{1,4}(?:[.,]\d+)?)\s*([a-zA-ZÀ-ú%]{2,16})\b/
  );
  if (numPhrase) {
    return clampWholeWords(
      `${numPhrase[1]} ${numPhrase[2]}`,
      3,
      22
    ).toUpperCase();
  }

  // Substantivos longos / termos técnicos
  const stop = new Set(
    "a o os as um uma de do da dos das e em no na nos nas por para com sem que se ao à pelo pela mais menos muito já não sim é foi ser ter".split(
      " "
    )
  );
  const tokens = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s%-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w));
  if (!tokens.length) {
    return clampWholeWords(raw.split(/[.!?]/)[0] || raw, 3, 24).toUpperCase();
  }
  // 1–2 tokens mais longos
  const ranked = [...tokens].sort((a, b) => b.length - a.length);
  const pick = ranked.slice(0, 2);
  return clampWholeWords(pick.join(" "), 2, 22).toUpperCase();
}

/**
 * Normaliza mapa de slots após a IA.
 * @param {Record<string, unknown>} raw
 * @param {string[]} allowedSlots
 */
export function normalizeAutofillValues(raw = {}, allowedSlots = []) {
  const allow = new Set((allowedSlots || []).map((s) => String(s).trim()));
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const slot = String(k || "").trim();
    if (!slot || (allow.size && !allow.has(slot))) continue;
    if (v === undefined || v === null) continue;
    if (typeof v === "number" || typeof v === "boolean") {
      out[slot] = v;
      continue;
    }
    if (Array.isArray(v)) {
      out[slot] = v;
      continue;
    }
    const s = String(v).trim();
    if (!s) continue;
    // cores hex intactas
    if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) {
      out[slot] = s;
      continue;
    }
    out[slot] = clampWholeWords(
      s,
      maxWordsForSlot(slot),
      maxCharsForSlot(slot)
    );
  }
  return out;
}

/**
 * Prompt do sistema para o Gemini (autofill).
 */
export function buildAutofillSystemPrompt({
  templateName = "",
  category = "",
  subcategory = "",
  role = "",
  slots = [],
  exampleProps = {},
  sceneKeyword = "",
  narration = "",
  projectTitle = "",
  niche = "",
} = {}) {
  const purpose =
    [
      role && `papel: ${role}`,
      category && `categoria: ${category}`,
      subcategory && `sub: ${subcategory}`,
      templateName && `nome: ${templateName}`,
    ]
      .filter(Boolean)
      .join(" · ") || "overlay documental";

  const exampleHint = Object.entries(exampleProps || {})
    .filter(([k]) => slots.includes(k))
    .slice(0, 14)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
    .join("\n");

  return `Você preenche props de um template Remotion no Timing do Lumiera.

REGRA DE OURO: a mudança é SÓ no projeto (clip). NÃO redesenhe o template base.

PROPÓSITO DO TEMPLATE (trabalhe em cima disso):
${purpose}

CONTEXTO DO PROJETO:
- Título: ${projectTitle || "—"}
- Nicho: ${niche || "—"}
- Palavra-chave da CENA atual: ${sceneKeyword || "—"}
- Narração da cena (trecho): ${String(narration || "").slice(0, 500) || "—"}

SLOTS A PREENCHER (somente estes): ${slots.join(", ") || "(nenhum)"}

EXEMPLO ORIGINAL DO TEMPLATE (tom/estrutura — NÃO copiar literal se não couber na cena):
${exampleHint || "(sem exampleProps)"}

REGRAS DE TEXTO (anti-poluição visual):
1. Maioria dos slots: 1 a 4 PALAVRAS, caixa alta quando for HUD/código/status.
2. NUNCA quebre palavra no meio. Frases longas SÓ em quote/text (máx ~12 palavras).
3. title / headline = gancho CURTO da cena (não a narração inteira).
4. projectCode = código curto estilo ENG-XXXX se o template for técnico; senão omita ou 1 token.
5. eyebrow / kicker / statusText = 1–3 palavras de contexto (ex.: ANÁLISE TÉCNICA, SISTEMA ATIVO).
6. location / tag = setor/local curto se fizer sentido.
7. Não encha todos os campos com a mesma frase. Menos texto = melhor.
8. Cores: só se o slot for *Color e fizer sentido (#hex).
9. Responda APENAS JSON: { "values": { "slot": "texto" }, "rationale": "1 frase" }

Pergunta-guia: "Para que este template foi feito?" → preencha só o que serve a esse papel, com a palavra-chave da cena.`;
}

/**
 * Monta payload de autofill a partir do clip + studio + config.
 */
export function buildAutofillContext({
  clip = {},
  studio = {},
  config = {},
  storyboard = {},
  slots = [],
  exampleProps = {},
} = {}) {
  const props = clip.props || {};
  const start = Number(clip.start) || 0;
  const end = start + Math.max(0.1, Number(clip.duration) || 1);
  const mid = (start + end) / 2;

  // Narração: clip → captions sob o clip → storyboard visual_prompts
  let narration = String(
    props.narration_text || props.scene_narration || clip.label || ""
  ).trim();

  if (!narration && Array.isArray(studio.clips)) {
    const caps = studio.clips
      .filter((c) => c.trackId === "captions")
      .filter((c) => {
        const cs = Number(c.start) || 0;
        const ce = cs + (Number(c.duration) || 0);
        return cs < end && ce > start;
      })
      .map((c) => String(c.props?.text || c.label || "").trim())
      .filter(Boolean);
    if (caps.length) narration = caps.join(" ");
  }

  if (!narration && Array.isArray(storyboard.visual_prompts)) {
    const vp = storyboard.visual_prompts.find((p) => {
      const ps = Number(p.speech_start ?? p.asset?.audio_start ?? 0);
      return Math.abs(ps - start) < 8 || (ps <= mid && ps + 12 >= mid);
    });
    narration = String(
      vp?.narration_text || vp?.asset?.narration_segment || ""
    ).trim();
  }

  if (!narration && storyboard.full_narration) {
    // pega ~120 chars em torno do ratio temporal
    const full = String(storyboard.full_narration);
    const total = Number(studio.totalDuration) || 60;
    const ratio = Math.min(0.95, Math.max(0, mid / total));
    const idx = Math.floor(full.length * ratio);
    narration = full.slice(Math.max(0, idx - 80), idx + 160);
  }

  const sceneKeyword = extractSceneKeyword(narration);
  const templateName = String(
    props.template_studio_name || clip.label || clip.templateId || ""
  );
  const category = String(props.template_studio_category || "");
  const subcategory = String(props.template_studio_subcategory || "");
  const role = String(props.studio_role || "");

  return {
    templateName,
    category,
    subcategory,
    role,
    slots: Array.isArray(slots) ? slots : [],
    exampleProps: exampleProps || {},
    sceneKeyword,
    narration: narration.slice(0, 800),
    projectTitle: String(config.video_title || config.project_name || ""),
    niche: String(config.niche || ""),
  };
}
