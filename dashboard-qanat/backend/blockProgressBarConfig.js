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

export function suggestBlockProgressIcon(narration = "", niche = "") {
  const text = `${niche} ${narration}`.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.re.test(text)) return rule.icon;
  }
  return "info";
}

export function buildDefaultBlockProgressMarkers({
  blockPhrases = [],
  starts = [],
  durations = [],
  niche = "Geral",
  existingBlocks = [],
} = {}) {
  const existingMap = new Map(
    (existingBlocks || []).map((b) => [Number(b.block), b]),
  );

  return (blockPhrases || []).map((bp, idx) => {
    const block = Number(bp.block || idx + 1);
    const saved = existingMap.get(block);
    const narration = String(bp.phrase || bp.text || "").trim();
    const start = Number(starts[idx]) || 0;
    const duration = Number(durations[idx]) || 10;
    return {
      block,
      start,
      duration,
      label: narration.slice(0, 48) || `Bloco ${block}`,
      iconType: saved?.iconType || suggestBlockProgressIcon(narration, niche),
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

export function buildBlockProgressIconAiPrompt({ niche = "Geral", blocks = [] } = {}) {
  const blockLines = (blocks || []).map((b) => (
    `Bloco ${b.block}: "${String(b.label || "").slice(0, 220)}"`
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
  const raw = config.block_progress_bar || {};
  const enabled = raw.enabled === true;

  if (!enabled || !blockPhrases.length) {
    return null;
  }

  const markers = buildDefaultBlockProgressMarkers({
    blockPhrases,
    starts: timings.starts || [],
    durations: timings.durations || [],
    niche: config.niche || "Geral",
    existingBlocks: raw.blocks || [],
  });

  return {
    enabled: true,
    design: raw.design || "cinematic",
    iconSize: Number(raw.iconSize) || (config.aspect_ratio === "9:16" ? 16 : 22),
    defaultIconStyle: raw.defaultIconStyle === "svg" ? "svg" : "lottie",
    blocks: markers,
    totalDuration: Number(timings.total_duration)
      || markers.reduce((max, m) => Math.max(max, m.start + m.duration), 0)
      || 120,
  };
}