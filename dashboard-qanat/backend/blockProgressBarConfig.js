/**
 * Barra de progresso por blocos — ícones temáticos + timings.
 */

const ICON_RULES = [
  { re: /espaço|espacial|foguete|nasa|órbita|orbita|satélite|satelite|lua|marte/i, icon: "science" },
  { re: /inteligência artificial|\bia\b|machine learning|algoritmo|software|tech|digital|cyber/i, icon: "gear" },
  { re: /dinheiro|economia|invest|financ|dólar|dolar|mercado|bilhão|bilhao|milhão|milhao/i, icon: "money" },
  { re: /históri|histori|antig|século|seculo|império|imperio|guerra|batalha/i, icon: "history" },
  { re: /natureza|floresta|oceano|animal|planeta|terra|clima/i, icon: "nature" },
  { re: /geograf|mapa|país|pais|cidade|continente|viagem/i, icon: "compass" },
  { re: /militar|defesa|tanque|míssil|missil|exército|exercito/i, icon: "shield" },
  { re: /energia|elétric|eletric|nuclear|solar|petróleo|petroleo/i, icon: "lightning" },
  { re: /avião|aviao|aéreo|aereo|transporte|carro|veículo|veiculo/i, icon: "plane" },
  { re: /mistério|misterio|segredo|conspira|desaparec/i, icon: "warning" },
  { re: /livro|educa|estudo|universidade|ciência|ciencia/i, icon: "book" },
  { re: /social|viral|internet|rede|comunidade/i, icon: "sparkles" },
];

export const BLOCK_PROGRESS_TITLE_FONTS = {
  inter: "Inter, sans-serif",
  oswald: "Oswald, sans-serif",
  playfair: "Playfair Display, serif",
  cinzel: "Cinzel, serif",
  bebas: "Bebas Neue, sans-serif",
  jetbrains: "JetBrains Mono, monospace",
};

export function resolveBlockProgressTitleFontStack(fontId) {
  return BLOCK_PROGRESS_TITLE_FONTS[fontId] || BLOCK_PROGRESS_TITLE_FONTS.inter;
}

export function collectBlockNarrationsByBlock({ visualPrompts = [], blockPhrases = [] } = {}) {
  const map = new Map();
  for (const vp of visualPrompts) {
    const block = Number(vp.block);
    const chunk = String(vp.narration_text || "").trim();
    if (!block || !chunk) continue;
    map.set(block, map.has(block) ? `${map.get(block)} ${chunk}` : chunk);
  }
  for (const bp of blockPhrases) {
    const block = Number(bp.block || 0);
    if (!block || map.has(block)) continue;
    const phrase = String(bp.phrase || bp.text || "").trim();
    if (phrase) map.set(block, phrase);
  }
  return map;
}

export function suggestBlockTitleHeuristic(narration = "") {
  const text = String(narration).replace(/\s+/g, " ").trim();
  if (!text) return "";
  const masParts = text.split(/\s+mas\s+/i);
  const focus = (masParts.length > 1 ? masParts[masParts.length - 1] : text).trim();
  const sentence = focus.split(/[.!?]/)[0].trim();
  const words = sentence
    .replace(/^(o|a|os|as|um|uma|esse|essa|este|esta|o nosso|a nossa)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  let title = words.join(" ");
  if (title.length > 38) {
    title = `${title.slice(0, 36).replace(/\s+\S*$/, "")}…`;
  }
  return title || "Bloco";
}

function phraseMatchesLabel(label, phrase) {
  const a = String(label || "").toLowerCase().trim().slice(0, 24);
  const b = String(phrase || "").toLowerCase().trim().slice(0, 24);
  if (!a || !b) return false;
  return a.startsWith(b) || b.startsWith(a);
}

export function resolveBlockDisplayTitle(saved, phraseStart, fullNarration, blockNum) {
  if (saved?.title?.trim()) return saved.title.trim();
  if (saved?.label?.trim() && !phraseMatchesLabel(saved.label, phraseStart)) {
    return saved.label.trim();
  }
  const fromNarration = suggestBlockTitleHeuristic(fullNarration);
  if (fromNarration && fromNarration !== "Bloco") return fromNarration;
  return `Bloco ${blockNum}`;
}

export function suggestBlockProgressIcon(narration = "", niche = "") {
  const text = `${niche} ${narration}`.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.re.test(text)) return rule.icon;
  }
  return "info";
}

export function buildDefaultBlockProgressMarkers({
  blockPhrases = [],
  visualPrompts = [],
  starts = [],
  durations = [],
  niche = "Geral",
  existingBlocks = [],
} = {}) {
  const existingMap = new Map(
    (existingBlocks || []).map((b) => [Number(b.block), b]),
  );
  const narrationsByBlock = collectBlockNarrationsByBlock({ visualPrompts, blockPhrases });

  return (blockPhrases || []).map((bp, idx) => {
    const block = Number(bp.block || idx + 1);
    const saved = existingMap.get(block);
    const phraseStart = String(bp.phrase || bp.text || "").trim();
    const fullNarration = narrationsByBlock.get(block) || phraseStart;
    const title = resolveBlockDisplayTitle(saved, phraseStart, fullNarration, block);
    const start = Number(starts[idx]) || 0;
    const duration = Number(durations[idx]) || 10;
    return {
      block,
      start,
      duration,
      title,
      label: title,
      iconType: saved?.iconType || suggestBlockProgressIcon(fullNarration, niche),
      iconStyle: saved?.iconStyle || "lottie",
      iconSize: saved?.iconSize,
    };
  });
}

export const ALLOWED_BLOCK_PROGRESS_ICONS = [
  "sparkles", "flame", "earth", "building", "globe", "info", "gear", "shield", "crown",
  "science", "history", "nature", "money", "warning", "compass", "book", "heart",
  "lightbulb", "graph", "trophy", "target", "gift", "coin", "wallet", "shop",
  "delivery", "api", "wifi", "mobile", "video", "server", "lightning", "map",
  "plane", "skull", "sun", "rain", "snow", "storm", "like", "star", "share",
  "message", "mail", "phone",
];

function normalizeAiIconId(raw) {
  const id = String(raw || "").trim().toLowerCase();
  if (ALLOWED_BLOCK_PROGRESS_ICONS.includes(id)) return id;
  if (id === "rocket") return "science";
  if (id === "atom") return "science";
  if (id === "bolt") return "lightning";
  return null;
}

export function buildBlockProgressTitleAiPrompt({ niche = "Geral", blocks = [] } = {}) {
  const blockLines = (blocks || []).map((b) => (
    `Bloco ${b.block} — narração completa:\n"${String(b.narration || b.label || "").slice(0, 480)}"`
  )).join("\n\n");

  return `Você cria títulos curtos para barra de progresso de vídeo documental em PT-BR.
Para CADA bloco, escreva um RESUMO temático (3 a 6 palavras) — NÃO copie o início da frase.
Nicho: "${niche}"

BLOCOS:
${blockLines}

Regras:
- Título = assunto do bloco (ex: "Cura química do concreto", "Descoberta do MIT")
- Máximo 6 palavras, sem ponto final
- Não repita o mesmo padrão em todos

Retorne APENAS JSON:
{
  "blocks": [
    { "block": 1, "title": "Resumo curto", "reason": "opcional" }
  ]
}`;
}

export function mergeAiBlockProgressTitles(markers = [], aiBlocks = []) {
  const aiMap = new Map((aiBlocks || []).map((b) => [Number(b.block), b]));
  return (markers || []).map((marker) => {
    const ai = aiMap.get(Number(marker.block));
    if (!ai?.title) return marker;
    const title = String(ai.title || "").trim().slice(0, 48);
    if (!title) return marker;
    return { ...marker, title, label: title };
  });
}

export function buildBlockProgressIconAiPrompt({ niche = "Geral", blocks = [] } = {}) {
  const blockLines = (blocks || []).map((b) => (
    `Bloco ${b.block}: "${String(b.title || b.label || "").slice(0, 220)}"`
  )).join("\n");

  return `Você é designer de motion graphics para barra de progresso de vídeo documental.
Para CADA bloco do roteiro abaixo, escolha o ícone MAIS adequado ao assunto narrado.
Nicho: "${niche}"

ÍCONES PERMITIDOS (use exatamente estes ids):
${ALLOWED_BLOCK_PROGRESS_ICONS.join(", ")}

ROTEIRO POR BLOCO:
${blockLines}

Regras:
- 1 ícone diferente por bloco quando possível (evite repetir em sequência)
- Prefira ícones que representem o TEMA do bloco, não palavras genéricas
- iconStyle: "lottie" (padrão) ou "svg" para ícones simples

Retorne APENAS JSON válido:
{
  "blocks": [
    { "block": 1, "iconType": "science", "iconStyle": "lottie", "reason": "breve justificativa" }
  ]
}`;
}

export function mergeAiBlockProgressIcons(markers = [], aiBlocks = []) {
  const aiMap = new Map(
    (aiBlocks || []).map((b) => [Number(b.block), b]),
  );
  return (markers || []).map((marker) => {
    const ai = aiMap.get(Number(marker.block));
    if (!ai) return marker;
    const iconType = normalizeAiIconId(ai.iconType) || marker.iconType;
    const iconStyle = ai.iconStyle === "svg" ? "svg" : "lottie";
    return {
      ...marker,
      iconType,
      iconStyle: ai.iconStyle ? iconStyle : marker.iconStyle,
      aiReason: ai.reason || null,
    };
  });
}

export function resolveBlockProgressBarForRender(projectDir, readProjectJson) {
  const config = readProjectJson(projectDir, "config_qanat.json", {});
  const timings = readProjectJson(projectDir, "block_timings.json", { starts: [], durations: [], total_duration: 0 });
  const blockPhrases = Array.isArray(config.block_phrases) ? config.block_phrases : [];
  const storyboard = readProjectJson(projectDir, "storyboard.json", {});
  const visualPrompts = Array.isArray(storyboard.visual_prompts) ? storyboard.visual_prompts : [];
  const raw = config.block_progress_bar || {};
  const enabled = raw.enabled === true;

  if (!enabled || !blockPhrases.length) {
    return null;
  }

  const markers = buildDefaultBlockProgressMarkers({
    blockPhrases,
    visualPrompts,
    starts: timings.starts || [],
    durations: timings.durations || [],
    niche: config.niche || "Geral",
    existingBlocks: raw.blocks || [],
  });

  const titleFont = BLOCK_PROGRESS_TITLE_FONTS[raw.titleFont]
    ? raw.titleFont
    : "inter";

  return {
    enabled: true,
    design: raw.design || "cinematic",
    iconSize: Number(raw.iconSize) || (config.aspect_ratio === "9:16" ? 16 : 22),
    defaultIconStyle: raw.defaultIconStyle === "svg" ? "svg" : "lottie",
    showBlockTitles: raw.showBlockTitles === true,
    titleFont,
    titleFontSize: Number(raw.titleFontSize) || (config.aspect_ratio === "9:16" ? 9 : 10),
    titleColor: String(raw.titleColor || "#FFFFFF"),
    blocks: markers,
    totalDuration: Number(timings.total_duration)
      || markers.reduce((max, m) => Math.max(max, m.start + m.duration), 0)
      || 120,
  };
}