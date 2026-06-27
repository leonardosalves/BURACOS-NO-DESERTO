/**
 * Catálogo Lottie + pareamentos HyperFrames para orquestração de overlays.
 * Usado pela IA e pelo enforcement pós-processamento.
 */

export const LOTTIE_ICONS = [
  { id: "sparkles", label: "Curiosidade / destaque", keywords: ["curios", "surpreend", "incrível", "fato", "segredo", "detalhe"], niches: ["history", "default"] },
  { id: "flame", label: "Fogo / energia / impacto", keywords: ["fogo", "queim", "energia", "explos", "calor", "volc"], niches: ["history", "industrial", "default"] },
  { id: "earth", label: "Mundo / global", keywords: ["mundo", "global", "planeta", "internacional", "mundial"], niches: ["nature", "history", "default"] },
  { id: "globe", label: "Globo / geografia", keywords: ["globo", "mapa", "continente", "país", "região", "geograf"], niches: ["nature", "history"] },
  { id: "compass", label: "Localização / navegação", keywords: ["local", "cidade", "lugar", "onde", "região", "coorden"], niches: ["nature", "history"] },
  { id: "map", label: "Mapa / território", keywords: ["mapa", "fronteira", "território", "rota", "viagem", "distância"], niches: ["nature", "history"] },
  { id: "pin", label: "Ponto no mapa", keywords: ["pin", "marcador", "localização", "destino"], niches: ["nature"] },
  { id: "history", label: "História / tempo", keywords: ["século", "ano", "época", "antig", "império", "dinastia", "império", "roma", "egito"], niches: ["history"] },
  { id: "book", label: "Documento / registro", keywords: ["livro", "document", "registro", "manuscrito", "arquivo", "lei"], niches: ["history", "default"] },
  { id: "shield", label: "Proteção / guerra / defesa", keywords: ["guerra", "exército", "defesa", "fortaleza", "legião", "militar", "escudo"], niches: ["history", "industrial"] },
  { id: "crown", label: "Realeza / poder", keywords: ["rei", "império", "césar", "monarquia", "trono", "poder"], niches: ["history"] },
  { id: "money", label: "Finanças / riqueza", keywords: ["dinheiro", "ouro", "riqueza", "custo", "invest", "economia", "milhão"], niches: ["finance"] },
  { id: "coin", label: "Moeda / valor", keywords: ["moeda", "câmbio", "valor", "preço", "custo"], niches: ["finance", "history"] },
  { id: "chart", label: "Gráfico / comparação", keywords: ["gráfico", "compar", "estatíst", "dados", "percent", "ranking", "top"], niches: ["finance", "default"] },
  { id: "analytics", label: "Análise / métrica", keywords: ["análise", "métrica", "crescimento", "tendência", "dado"], niches: ["finance", "tech"] },
  { id: "warning", label: "Alerta / perigo", keywords: ["alerta", "perigo", "cuidado", "atenção", "risco", "ameaça"], niches: ["industrial", "default"] },
  { id: "gear", label: "Engenharia / mecanismo", keywords: ["engenharia", "mecan", "máquina", "técnica", "constru", "invenção", "arco", "aqueduto", "estrada"], niches: ["industrial", "history", "tech"] },
  { id: "science", label: "Ciência / descoberta", keywords: ["ciência", "descoberta", "experimento", "laborat", "física", "química"], niches: ["tech", "default"] },
  { id: "lightbulb", label: "Ideia / insight", keywords: ["ideia", "insight", "solução", "inovação", "criou", "inventou"], niches: ["tech", "default", "history"] },
  { id: "nature", label: "Natureza / clima", keywords: ["natureza", "vento", "clima", "floresta", "rio", "oceano", "animal"], niches: ["nature"] },
  { id: "heart", label: "Emoção / comunidade", keywords: ["amor", "comunidade", "povo", "cultura", "sociedade"], niches: ["social-proof", "default"] },
  { id: "star", label: "Destaque / ranking", keywords: ["estrela", "melhor", "primeiro", "top", "ranking", "lugar"], niches: ["default", "history"] },
  { id: "award", label: "Conquista / prêmio", keywords: ["conquista", "vitória", "prêmio", "record", "marco"], niches: ["history", "default"] },
  { id: "target", label: "Objetivo / precisão", keywords: ["objetivo", "meta", "foco", "precisão", "estratégia"], niches: ["industrial", "default"] },
  { id: "check", label: "Confirmação / fato", keywords: ["confirmado", "verdade", "fato", "comprovado", "sim"], niches: ["default"] },
  { id: "info", label: "Informação geral", keywords: ["informação", "contexto", "definição", "explica"], niches: ["default"] },
  { id: "calendar", label: "Data / cronologia", keywords: ["data", "cronolog", "período", "era", "século", "timeline"], niches: ["history"] },
  { id: "bolt", label: "Velocidade / tech", keywords: ["rápido", "tech", "digital", "software", "api", "código"], niches: ["tech"] },
  { id: "code", label: "Programação", keywords: ["código", "program", "terminal", "dev", "software", "api"], niches: ["tech"] },
  { id: "play", label: "Ação / continuar", keywords: ["play", "ação", "próximo", "continua"], niches: ["default"] },
  { id: "share", label: "Viral / compartilhar", keywords: ["viral", "compartilh", "social", "trend"], niches: ["social-proof"] },
  { id: "message", label: "Comentário / social", keywords: ["coment", "post", "reddit", "twitter", "rede"], niches: ["social-proof"] },
  { id: "bell", label: "Notificação / alerta suave", keywords: ["notific", "novidade", "update"], niches: ["social-proof", "tech"] },
  { id: "building", label: "Arquitetura / cidade", keywords: ["arquitet", "cidade", "constru", "edifício", "monumento", "templo"], niches: ["history", "industrial"] },
];

export const HYPERFRAMES_LOTTIE_PAIRINGS = {
  "apple-money-count": { overlayTypes: ["counter"], iconTypes: ["money", "coin", "chart"], variant: "bold-block" },
  "data-chart": { overlayTypes: ["bar-chart"], iconTypes: ["chart", "analytics"], variant: "clean-bar" },
  "flowchart": { overlayTypes: ["timeline"], iconTypes: ["gear", "check", "arrow"], variant: "accent-underline" },
  "flowchart-vertical": { overlayTypes: ["timeline"], iconTypes: ["check", "gear", "star"], variant: "glass" },
  "world-map": { overlayTypes: ["lower-third", "counter"], iconTypes: ["globe", "earth", "compass", "map"] },
  "nyc-paris-flight": { overlayTypes: ["lower-third", "timeline"], iconTypes: ["map", "compass", "pin"] },
  "us-map": { overlayTypes: ["bar-chart", "lower-third"], iconTypes: ["map", "chart", "analytics"] },
  "spain-map": { overlayTypes: ["lower-third"], iconTypes: ["map", "globe"] },
  "north-korea-locked-down": { overlayTypes: ["lower-third"], iconTypes: ["warning", "shield", "pin"] },
  "lt-kicker-name": { overlayTypes: ["lower-third"], iconTypes: ["info", "book", "history"] },
  "lt-side-rule": { overlayTypes: ["lower-third"], iconTypes: ["compass", "history", "info"] },
  "lt-accent-underline": { overlayTypes: ["lower-third"], iconTypes: ["sparkles", "lightbulb", "star"] },
  "lt-bold-block": { overlayTypes: ["lower-third"], iconTypes: ["warning", "bolt", "target"] },
  "lt-clean-bar": { overlayTypes: ["lower-third"], iconTypes: ["info", "chart", "check"] },
  "lt-soft-pill": { overlayTypes: ["lower-third"], iconTypes: ["heart", "sparkles", "star"] },
  "lt-mask-reveal": { overlayTypes: ["lower-third", "kinetic-text"], iconTypes: ["sparkles", "warning", "bolt"] },
  "lt-stack-bars": { overlayTypes: ["lower-third", "bar-chart"], iconTypes: ["chart", "analytics", "target"] },
  "lower-third-bild": { overlayTypes: ["lower-third"], iconTypes: ["history", "warning", "shield"] },
  "news-ticker": { overlayTypes: ["lower-third"], iconTypes: ["info", "warning", "bell"] },
  "caption-kinetic-slam": { overlayTypes: ["kinetic-text"], iconTypes: ["sparkles", "bolt", "star", "flame"] },
  "reddit-post": { overlayTypes: ["lower-third"], iconTypes: ["message", "share", "heart"] },
  "x-post": { overlayTypes: ["lower-third"], iconTypes: ["message", "share", "bolt"] },
  "tiktok-follow": { overlayTypes: ["lower-third"], iconTypes: ["heart", "star", "play"] },
  "instagram-follow": { overlayTypes: ["lower-third"], iconTypes: ["heart", "star", "crown"] },
  "spotify-card": { overlayTypes: ["lower-third"], iconTypes: ["play", "heart", "star"] },
  "macos-notification": { overlayTypes: ["lower-third"], iconTypes: ["bell", "info", "check"] },
  "logo-outro": { overlayTypes: ["kinetic-text", "lower-third"], iconTypes: ["crown", "star", "award"] },
  "vfx-portal": { overlayTypes: ["kinetic-text"], iconTypes: ["sparkles", "bolt", "star"] },
  "code-3d-extrude": { overlayTypes: ["lower-third", "kinetic-text"], iconTypes: ["code", "science", "bolt"] },
  "code-typing": { overlayTypes: ["lower-third"], iconTypes: ["code", "gear", "science"] },
};

const OVERLAY_DEFAULT_ICONS = {
  "lower-third": ["info", "history", "sparkles", "compass", "book"],
  counter: ["chart", "money", "history", "target", "star"],
  "bar-chart": ["chart", "analytics", "target"],
  timeline: ["history", "calendar", "check", "gear"],
  "kinetic-text": ["sparkles", "bolt", "star", "flame"],
  "info-card": ["info", "lightbulb", "sparkles"],
};

function tokenize(text = "") {
  return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function scoreIcon(icon, text, nicheCategory) {
  const t = tokenize(text);
  let score = 0;
  for (const kw of icon.keywords) {
    if (t.includes(tokenize(kw))) score += 3;
  }
  if (icon.niches?.includes(nicheCategory)) score += 2;
  if (icon.niches?.includes("default")) score += 0.5;
  return score;
}

export function getLottieIconsForHyperframesRef(ref = "") {
  const pairing = HYPERFRAMES_LOTTIE_PAIRINGS[ref];
  return pairing?.iconTypes || [];
}

export function pickLottieIcon({
  overlayType = "lower-third",
  text = "",
  hyperframesRef = "",
  nicheCategory = "default",
  usedIcons = [],
  fallbackPool = [],
} = {}) {
  const used = new Set(usedIcons);
  const candidates = new Map();

  const addCandidate = (id, bonus = 0) => {
    const icon = LOTTIE_ICONS.find((i) => i.id === id);
    if (!icon || used.has(id)) return;
    const score = scoreIcon(icon, text, nicheCategory) + bonus;
    candidates.set(id, Math.max(candidates.get(id) || 0, score));
  };

  if (hyperframesRef) {
    for (const id of getLottieIconsForHyperframesRef(hyperframesRef)) {
      addCandidate(id, 6);
    }
  }

  const pool = fallbackPool.length ? fallbackPool : (OVERLAY_DEFAULT_ICONS[overlayType] || ["info"]);
  for (const id of pool) addCandidate(id, 2);

  for (const icon of LOTTIE_ICONS) {
    addCandidate(icon.id, 0);
  }

  const sorted = [...candidates.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length) return sorted[0][0];

  const unused = (pool.find((id) => !used.has(id)) || "info");
  return unused;
}

export function inferHyperframesRef(overlay = {}) {
  if (overlay.props?.hyperframesRef) return overlay.props.hyperframesRef;
  const type = overlay.type;
  const variant = overlay.props?.variant;
  const text = `${overlay.props?.title || ""} ${overlay.props?.subtitle || ""} ${overlay.props?.label || ""} ${overlay.props?.description || ""}`;

  if (type === "counter") return "apple-money-count";
  if (type === "bar-chart") return "data-chart";
  if (type === "timeline") return tokenize(text).includes("short") ? "flowchart-vertical" : "flowchart";
  if (type === "kinetic-text") return "caption-kinetic-slam";
  if (type === "lower-third") {
    if (variant === "bild") return "lower-third-bild";
    if (variant === "bold-block") return "lt-bold-block";
    if (variant === "accent-underline") return "lt-accent-underline";
    if (variant === "clean-bar") return "lt-clean-bar";
    if (variant === "glass") return "lt-soft-pill";
    if (/reddit|coment|post/i.test(text)) return "reddit-post";
    if (/twitter|@\w|x\.com/i.test(text)) return "x-post";
    return "lt-kicker-name";
  }
  return "";
}

export function applyLottieHyperframesPairing(overlay, context = {}) {
  if (!overlay?.props) overlay.props = {};
  const hyperframesRef = overlay.props.hyperframesRef || inferHyperframesRef(overlay);
  const text = [
    overlay.props.title,
    overlay.props.subtitle,
    overlay.props.label,
    overlay.props.description,
    overlay.props.suffix,
    ...(overlay.props.events || []).map((e) => `${e.year} ${e.description}`),
    ...(overlay.props.items || []).map((i) => `${i.label} ${i.displayValue || i.value}`),
  ].filter(Boolean).join(" ");

  const iconType = pickLottieIcon({
    overlayType: overlay.type,
    text,
    hyperframesRef,
    nicheCategory: context.nicheCategory || "default",
    usedIcons: context.usedIcons || [],
    fallbackPool: context.fallbackPool || [],
  });

  overlay.props.hyperframesRef = hyperframesRef;
  overlay.props.iconType = iconType;

  const pairing = HYPERFRAMES_LOTTIE_PAIRINGS[hyperframesRef];
  if (pairing?.variant && overlay.type === "lower-third" && !overlay.props.variant) {
    overlay.props.variant = pairing.variant;
  }

  return iconType;
}

export function buildLottieHyperframesGuide(plan = {}) {
  const refs = plan.hyperframesRefs || [];
  const pairings = refs
    .map((ref) => {
      const p = HYPERFRAMES_LOTTIE_PAIRINGS[ref];
      if (!p) return `- \`${ref}\` → escolha iconType pelo contexto do overlay`;
      return `- \`${ref}\` → tipos: ${p.overlayTypes.join(", ")} | Lotties: ${p.iconTypes.join(", ")}${p.variant ? ` | variant lower-third: ${p.variant}` : ""}`;
    })
    .join("\n");

  const iconList = LOTTIE_ICONS.map((i) => `- \`${i.id}\`: ${i.label}`).join("\n");

  return `
### Integração Lottie + HyperFrames (OBRIGATÓRIO)
Cada overlay deve combinar **estilo HyperFrames** + **ícone Lottie animado** para reforçar a informação sem repetir a narração.

**Regras:**
1. Todo overlay (lower-third, counter, bar-chart, timeline) DEVE ter \`iconType\` + \`hyperframesRef\`.
2. O \`hyperframesRef\` indica qual bloco do catálogo HyperFrames inspirou o design (ex: \`lt-kicker-name\`, \`apple-money-count\`, \`data-chart\`).
3. O \`iconType\` deve ser semanticamente coerente com o conteúdo — nunca repita o mesmo ícone em overlays consecutivos.
4. Lottie complementa o texto: ícone = categoria visual, texto = dado específico novo.

**Pareamentos deste vídeo (perfil ${plan.varietyLabel || "—"}):**
${pairings || "- Use lt-kicker-name, apple-money-count, data-chart conforme o contexto"}

**Ícones Lottie disponíveis (${LOTTIE_ICONS.length}):**
${iconList}
`.trim();
}

export { OVERLAY_DEFAULT_ICONS };