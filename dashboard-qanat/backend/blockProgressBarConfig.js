/**
 * Barra de progresso por blocos — ícones temáticos + timings.
 */

import { isListicleProject } from "./videoProEnhancements.js";

const ICON_RULES = [
  { re: /foguete|rocket|propulsão|propulsao|lançamento|lancamento|starship/i, icon: "rocket" },
  { re: /espaço|espacial|nasa|órbita|orbita|satélite|satelite|lua|marte|cosmos/i, icon: "science" },
  { re: /inteligência artificial|\bia\b|machine learning|algoritmo|software|tech|digital|cyber/i, icon: "gear" },
  { re: /dinheiro|economia|invest|financ|dólar|dolar|mercado|bilhão|bilhao|milhão|milhao/i, icon: "money" },
  { re: /históri|histori|antig|século|seculo|império|imperio|guerra|batalha|espada|conflito/i, icon: "history" },
  { re: /combate|luta|duelo|medieval/i, icon: "swords" },
  { re: /natureza|floresta|oceano|animal|planeta|terra|clima/i, icon: "nature" },
  { re: /geograf|mapa|país|pais|cidade|continente|viagem/i, icon: "compass" },
  { re: /militar|defesa|tanque|míssil|missil|exército|exercito/i, icon: "shield" },
  { re: /energia|elétric|eletric|nuclear|solar|petróleo|petroleo/i, icon: "lightning" },
  { re: /avião|aviao|aéreo|aereo|transporte|carro|veículo|veiculo/i, icon: "plane" },
  { re: /mistério|misterio|segredo|conspira|desaparec/i, icon: "warning" },
  { re: /livro|educa|estudo|universidade|ciência|ciencia/i, icon: "book" },
  { re: /social|viral|internet|rede|comunidade|público|publico|audiência|audiencia/i, icon: "users" },
  { re: /dado|estatíst|estatist|gráfico|grafico|percentual|tendência|tendencia/i, icon: "chart" },
  { re: /tempo|cronolog|relógio|relogio|prazo|deadline/i, icon: "clock" },
  { re: /notifica|alerta sonoro|campainha/i, icon: "bell" },
  { re: /favorito|salvar|marcador/i, icon: "bookmark" },
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

function parseChapterTimestampSeconds(ts = "") {
  const parts = String(ts).trim().split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function cleanChapterTitle(title = "") {
  return String(title)
    .trim()
    .replace(/^#\d+\s+/, "")
    .replace(/^introdução$/i, "Introdução")
    .replace(/^recap\s*\+\s*cta$/i, "Recap + CTA");
}

export function parseYoutubeChaptersText(chaptersText = "") {
  return String(chaptersText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+)$/);
      if (!match) return null;
      const time = match[1];
      const title = cleanChapterTitle(match[2]);
      return title ? { time, title, seconds: parseChapterTimestampSeconds(time) } : null;
    })
    .filter(Boolean);
}

export function resolveListicleTitlesByBlock(storyboard = {}, config = {}) {
  const map = new Map();
  const items = Array.isArray(storyboard.list_items) ? storyboard.list_items : [];
  const rankCount = Number(config.rank_count || storyboard.listicle?.rank_count || items.length || 0);
  const rankOrder = config.rank_order || storyboard.listicle?.rank_order || "desc";

  for (const item of items) {
    const block = Number(item.block);
    const title = String(item.title || item.name || "").trim();
    if (block > 0 && title) map.set(block, title);
  }

  if (map.size < rankCount && items.length) {
    const sorted = [...items].sort((a, b) => Number(a.rank) - Number(b.rank));
    sorted.forEach((item, idx) => {
      const title = String(item.title || item.name || "").trim();
      if (!title) return;
      let block = Number(item.block);
      if (!block) {
        const rank = Number(item.rank);
        if (rankOrder === "desc" && rankCount > 0) {
          block = rankCount - rank + 2;
        } else {
          block = (rank || idx + 1) + 1;
        }
      }
      if (block > 1 && !map.has(block)) map.set(block, title);
    });
  }

  return map;
}

export function resolveBlockTitlesFromChapters(chaptersText = "", blockStarts = []) {
  const chapters = parseYoutubeChaptersText(chaptersText);
  if (!chapters.length || !blockStarts.length) return [];

  return blockStarts.map((start, idx) => {
    if (chapters.length === blockStarts.length && chapters[idx]?.title) {
      return chapters[idx].title;
    }
    const exact = chapters.find((c) => Math.abs(c.seconds - start) < 1.5);
    if (exact?.title) return exact.title;
    let best = chapters[0];
    let bestDiff = Infinity;
    for (const chapter of chapters) {
      const diff = Math.abs(chapter.seconds - start);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = chapter;
      }
    }
    if (bestDiff <= 4 && best?.title) return best.title;
    return `Bloco ${idx + 1}`;
  });
}

export function buildBlockTitlesForProgressBar({
  chaptersText = "",
  blockStarts = [],
  storyboard = {},
  config = {},
} = {}) {
  const result = new Map();
  const listicle = isListicleProject(config, storyboard);

  if (listicle) {
    const listicleTitles = resolveListicleTitlesByBlock(storyboard, config);
    listicleTitles.forEach((title, block) => result.set(block, title));
  }

  if (String(chaptersText).trim()) {
    const fromChapters = resolveBlockTitlesFromChapters(chaptersText, blockStarts);
    blockStarts.forEach((_, idx) => {
      const block = idx + 1;
      const chapterTitle = fromChapters[idx];
      if (!chapterTitle) return;
      if (listicle && result.has(block)) return;
      result.set(block, chapterTitle);
    });
  }

  return result;
}

export function resolveChaptersTextForProject(projectDir, readProjectJson) {
  const config = readProjectJson(projectDir, "config_qanat.json", {});
  const fromUpload = config.upload_metadata?.youtube?.chapters;
  if (String(fromUpload || "").trim()) return String(fromUpload).trim();

  const cache = readProjectJson(projectDir, "youtube_metadata_cache.json", {});
  if (String(cache?.parsed?.chapters || "").trim()) return String(cache.parsed.chapters).trim();

  return "";
}

function isGenericBlockTitle(title, blockNum, phraseStart = "") {
  const t = String(title || "").trim();
  if (!t) return true;
  if (t === `Bloco ${blockNum}`) return true;
  const phrase = String(phraseStart || "").trim();
  if (phrase && t === phrase) return true;
  if (phrase && phrase.startsWith(t) && t.length <= 56) return true;
  return false;
}

export function resolveBlockDisplayTitle(saved, metadataTitle, blockNum, phraseStart = "") {
  const meta = String(metadataTitle || "").trim();
  const savedTitle = String(saved?.title || saved?.label || "").trim();
  if (meta && isGenericBlockTitle(savedTitle, blockNum, phraseStart)) return meta;
  if (saved?.title?.trim()) return saved.title.trim();
  if (meta) return meta;
  if (saved?.label?.trim()) return saved.label.trim();
  return `Bloco ${blockNum}`;
}

function isIconExcluded(iconId, iconStyle, excludeIds, excludeVisuals) {
  const id = String(iconId || "").toLowerCase();
  if (excludeIds.has(id)) return true;
  return excludeVisuals.has(resolveIconVisualKey(id, iconStyle));
}

export function suggestBlockProgressIcon(
  narration = "",
  niche = "",
  excludeIds = new Set(),
  excludeVisuals = new Set(),
) {
  const text = `${niche} ${narration}`.toLowerCase();
  for (const rule of ICON_RULES) {
    const style = resolveIconStyleForType(rule.icon);
    if (rule.re.test(text) && !isIconExcluded(rule.icon, style, excludeIds, excludeVisuals)) {
      return rule.icon;
    }
  }
  for (const icon of ALLOWED_BLOCK_PROGRESS_ICONS) {
    const style = resolveIconStyleForType(icon);
    if (!isIconExcluded(icon, style, excludeIds, excludeVisuals)) return icon;
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
  chaptersText = "",
  storyboard = {},
  config = {},
} = {}) {
  const existingMap = new Map(
    (existingBlocks || []).map((b) => [Number(b.block), b]),
  );
  const narrationsByBlock = collectBlockNarrationsByBlock({ visualPrompts, blockPhrases });
  const metadataTitles = buildBlockTitlesForProgressBar({
    chaptersText,
    blockStarts: starts,
    storyboard,
    config,
  });

  const usedIconIds = new Set();
  const usedIconVisuals = new Set();
  const blocks = (blockPhrases || []).map((bp, idx) => {
    const block = Number(bp.block || idx + 1);
    const saved = existingMap.get(block);
    const phraseStart = String(bp.phrase || bp.text || "").trim();
    const fullNarration = narrationsByBlock.get(block) || phraseStart;
    const title = resolveBlockDisplayTitle(saved, metadataTitles.get(block), block, phraseStart);
    const start = Number(starts[idx]) || 0;
    const duration = Number(durations[idx]) || 10;
    const iconStyle = saved?.iconStyle || "lottie";
    const iconType = saved?.iconType || suggestBlockProgressIcon(
      fullNarration,
      niche,
      usedIconIds,
      usedIconVisuals,
    );
    if (!saved?.iconType) {
      usedIconIds.add(iconType);
      usedIconVisuals.add(resolveIconVisualKey(iconType, iconStyle));
    }
    return {
      block,
      start,
      duration,
      title,
      label: title,
      iconType,
      iconStyle,
      iconSize: saved?.iconSize,
    };
  });

  return dedupeBlockProgressIcons(blocks, { niche });
}

/** Usa ícones/títulos salvos no config — só atualiza start/duration dos timings. */
export function mergeSavedBlockProgressMarkers(
  rawBlocks = [],
  {
    blockPhrases = [],
    visualPrompts = [],
    starts = [],
    durations = [],
    chaptersText = "",
    storyboard = {},
    config = {},
  } = {},
) {
  const savedMap = new Map(
    (rawBlocks || []).map((b) => [Number(b.block), b]),
  );
  const metadataTitles = buildBlockTitlesForProgressBar({
    chaptersText,
    blockStarts: starts,
    storyboard,
    config,
  });
  const narrationsByBlock = collectBlockNarrationsByBlock({ visualPrompts, blockPhrases });

  return (blockPhrases || []).map((bp, idx) => {
    const block = Number(bp.block || idx + 1);
    const saved = savedMap.get(block) || {};
    const phraseStart = String(bp.phrase || bp.text || "").trim();
    const title = resolveBlockDisplayTitle(saved, metadataTitles.get(block), block, phraseStart);
    const iconType = String(saved.iconType || "info").toLowerCase();
    const iconStyle = saved.iconStyle === "svg" || SVG_ONLY_BLOCK_PROGRESS_ICONS.has(iconType)
      ? "svg"
      : "lottie";

    return {
      block,
      start: Number(starts[idx]) || Number(saved.start) || 0,
      duration: Number(durations[idx]) || Number(saved.duration) || 10,
      title,
      label: title,
      iconType: ALLOWED_BLOCK_PROGRESS_ICONS.includes(iconType) ? iconType : "info",
      iconStyle,
      iconSize: saved.iconSize,
    };
  });
}

function hasCompleteSavedBlockIcons(rawBlocks = [], blockPhrases = []) {
  if (!Array.isArray(rawBlocks) || !rawBlocks.length || !blockPhrases.length) return false;
  const savedMap = new Map(rawBlocks.map((b) => [Number(b.block), b]));
  return blockPhrases.every((bp, idx) => {
    const block = Number(bp.block || idx + 1);
    const saved = savedMap.get(block);
    return Boolean(saved?.iconType);
  });
}

export const BLOCK_PROGRESS_DESIGNS = [
  "cinematic", "neon", "minimal", "documentary", "tech",
  "dashed", "dotted", "bold", "glass", "elegant", "gradient", "glow", "retro", "outline",
];

export function normalizeBlockProgressDesign(raw) {
  const id = String(raw || "cinematic").toLowerCase();
  return BLOCK_PROGRESS_DESIGNS.includes(id) ? id : "cinematic";
}

export const ALLOWED_BLOCK_PROGRESS_ICONS = [
  "sparkles", "flame", "earth", "building", "globe", "info", "gear", "shield", "crown",
  "science", "history", "nature", "money", "warning", "compass", "book", "heart",
  "lightbulb", "graph", "chart", "trophy", "target", "gift", "coin", "wallet", "shop",
  "delivery", "api", "wifi", "mobile", "video", "server", "lightning", "bolt", "map",
  "plane", "rocket", "skull", "sun", "rain", "snow", "storm", "like", "star", "share",
  "message", "mail", "phone", "swords", "users", "clock", "bookmark", "bell",
];

/** Ícones disponíveis só como SVG animado (sem Lottie dedicado). */
export const SVG_ONLY_BLOCK_PROGRESS_ICONS = new Set([
  "swords", "bolt", "rocket", "chart", "users", "clock",
]);

/** Lista enviada à IA — sem alias earth/globe (mesmo globo). */
export const BLOCK_PROGRESS_ICONS_FOR_AI = ALLOWED_BLOCK_PROGRESS_ICONS.filter(
  (id) => id !== "globe",
);

const LOTTIE_FILE_BY_ICON = {
  sparkles: "sparkles.json",
  flame: "flame.json",
  info: "info.json",
  earth: "globe.json",
  building: "lottie_edu_pillar_1.json",
  globe: "lottie_life_globe_1.json",
  gear: "lottie_ui_gear_1.json",
  shield: "lottie_edu_shield_1.json",
  crown: "lottie_biz_crown_1.json",
  science: "lottie_tech_dna_1.json",
  history: "lottie_edu_scroll_1.json",
  nature: "lottie_nature_leaf_1.json",
  money: "lottie_biz_money_1.json",
  warning: "lottie_ui_warning_1.json",
  compass: "lottie_life_location_1.json",
  book: "lottie_edu_book_1.json",
  heart: "lottie_interact_heart_1.json",
  lightbulb: "lottie_life_idea_1.json",
  graph: "lottie_biz_graph_1.json",
  trophy: "lottie_biz_trophy_1.json",
  target: "lottie_biz_target_1.json",
  gift: "lottie_biz_gift_1.json",
  coin: "lottie_biz_coin_1.json",
  wallet: "lottie_biz_wallet_1.json",
  shop: "lottie_biz_shop_1.json",
  delivery: "lottie_biz_truck_1.json",
  api: "lottie_tech_api_1.json",
  wifi: "lottie_tech_wifi_1.json",
  mobile: "lottie_tech_mobile_1.json",
  video: "lottie_tech_video_1.json",
  server: "lottie_tech_server_1.json",
  lightning: "lottie_tech_lightning_2.json",
  map: "lottie_life_map_1.json",
  plane: "lottie_life_plane_1.json",
  skull: "lottie_life_skull_1.json",
  sun: "weather_clear_day.json",
  rain: "weather_rain.json",
  snow: "weather_snow.json",
  storm: "weather_thunderstorms.json",
  like: "lottie_interact_like_1.json",
  star: "lottie_interact_star_1.json",
  share: "lottie_interact_share_1.json",
  message: "lottie_interact_message_1.json",
  mail: "lottie_interact_mail_1.json",
  phone: "lottie_interact_phone_1.json",
  rocket: "lottie_nature_rocket_1.json",
  bookmark: "lottie_interact_bookmark_1.json",
  bell: "lottie_interact_bell_4.json",
};

/** Família visual — ids diferentes que renderizam o mesmo ícone na barra. */
const ICON_VISUAL_FAMILY = {
  earth: "globe",
  building: "building",
  globe: "globe",
  money: "coin",
  coin: "coin",
  wallet: "coin",
  graph: "chart",
  chart: "chart",
  bolt: "bolt",
  lightning: "bolt",
  history: "hourglass",
  clock: "hourglass",
};

function normalizeAiIconId(raw) {
  const id = String(raw || "").trim().toLowerCase();
  if (id === "globe") return "earth";
  if (ALLOWED_BLOCK_PROGRESS_ICONS.includes(id)) return id;
  if (id === "atom") return "science";
  if (id === "people" || id === "user") return "users";
  return null;
}

function resolveIconStyleForType(iconType, preferred) {
  if (SVG_ONLY_BLOCK_PROGRESS_ICONS.has(iconType)) return "svg";
  return preferred === "svg" ? "svg" : "lottie";
}

function resolveIconVisualKey(iconType, iconStyle = "lottie") {
  const id = String(iconType || "info").toLowerCase();
  const style = iconStyle === "svg" ? "svg" : "lottie";
  const family = ICON_VISUAL_FAMILY[id] || id;
  return `${style}:${family}`;
}

function isIconSlotAvailable(iconType, iconStyle, usedIds, usedVisuals) {
  const id = String(iconType || "").toLowerCase();
  if (!ALLOWED_BLOCK_PROGRESS_ICONS.includes(id)) return false;
  const style = resolveIconStyleForType(id, iconStyle);
  const visual = resolveIconVisualKey(id, style);
  return !usedIds.has(id) && !usedVisuals.has(visual);
}

function buildCandidateIconIds(marker, niche, preferredId) {
  const text = `${niche} ${marker.title || marker.label || ""}`.toLowerCase();
  const candidates = [];
  const push = (id) => {
    const norm = normalizeAiIconId(id) || (ALLOWED_BLOCK_PROGRESS_ICONS.includes(id) ? id : null);
    if (norm && !candidates.includes(norm)) candidates.push(norm);
  };
  if (preferredId) push(preferredId);
  for (const rule of ICON_RULES) {
    if (rule.re.test(text)) push(rule.icon);
  }
  for (const id of ALLOWED_BLOCK_PROGRESS_ICONS) push(id);
  return candidates;
}

function pickUniqueIconForMarker(marker, niche, idx, usedIds, usedVisuals) {
  const preferred = normalizeAiIconId(marker.iconType)
    || String(marker.iconType || "").toLowerCase();
  const candidates = buildCandidateIconIds(marker, niche, preferred);
  const styleCandidates = (candId) => {
    const styles = [resolveIconStyleForType(candId, marker.iconStyle)];
    if (candId !== preferred) styles.push("svg");
    if (!styles.includes("lottie")) styles.push("lottie");
    return styles;
  };

  for (const candId of candidates) {
    for (const style of styleCandidates(candId)) {
      if (isIconSlotAvailable(candId, style, usedIds, usedVisuals)) {
        return { iconType: candId, iconStyle: style, adjusted: candId !== preferred };
      }
    }
  }

  for (let i = 0; i < ALLOWED_BLOCK_PROGRESS_ICONS.length; i += 1) {
    const id = ALLOWED_BLOCK_PROGRESS_ICONS[(idx + i) % ALLOWED_BLOCK_PROGRESS_ICONS.length];
    const style = resolveIconStyleForType(id, marker.iconStyle);
    if (isIconSlotAvailable(id, style, usedIds, usedVisuals)) {
      return { iconType: id, iconStyle: style, adjusted: true };
    }
  }

  return { iconType: "info", iconStyle: "lottie", adjusted: preferred !== "info" };
}

export function dedupeBlockProgressIcons(markers = [], { niche = "Geral" } = {}) {
  const usedIds = new Set();
  const usedVisuals = new Set();

  return (markers || []).map((marker, idx) => {
    const pick = pickUniqueIconForMarker(marker, niche, idx, usedIds, usedVisuals);
    usedIds.add(pick.iconType);
    usedVisuals.add(resolveIconVisualKey(pick.iconType, pick.iconStyle));

    const next = { ...marker, iconType: pick.iconType, iconStyle: pick.iconStyle };
    if (pick.adjusted) {
      next.aiReason = marker.aiReason
        ? `${marker.aiReason} · ícone único na barra`
        : "Ícone ajustado para não repetir na barra";
    }
    return next;
  });
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

ÍCONES PERMITIDOS (use exatamente estes ids, cada um NO MÁXIMO uma vez):
${BLOCK_PROGRESS_ICONS_FOR_AI.join(", ")}

ROTEIRO POR BLOCO (${blocks.length} blocos = ${blocks.length} ícones DIFERENTES):
${blockLines}

Regras OBRIGATÓRIAS (violação = resposta inválida):
- Liste exatamente ${blocks.length} blocos no JSON, um por bloco do roteiro
- iconType ÚNICO em cada bloco — proibido repetir qualquer id
- Proibido repetir animações parecidas: earth e globe são o MESMO globo — use no máximo um
- Também não repita famílias visuais: money/coin/wallet, graph/chart, bolt/lightning, history/clock
- building (coluna) é distinto de earth/globo — pode usar quando o bloco fala de monumento/arquitetura
- Varie categorias: espaço, energia, história, dados, natureza, tech, negócios, social
- iconStyle: "lottie" (padrão) ou "svg" para: swords, bolt, rocket, chart, users, clock

Retorne APENAS JSON válido:
{
  "blocks": [
    { "block": 1, "iconType": "science", "iconStyle": "lottie", "reason": "breve justificativa" }
  ]
}`;
}

export function mergeAiBlockProgressIcons(markers = [], aiBlocks = [], { niche = "Geral" } = {}) {
  const aiMap = new Map(
    (aiBlocks || []).map((b) => [Number(b.block), b]),
  );
  const merged = (markers || []).map((marker) => {
    const ai = aiMap.get(Number(marker.block));
    if (!ai) return marker;
    const iconType = normalizeAiIconId(ai.iconType) || marker.iconType;
    let iconStyle = ai.iconStyle === "svg" ? "svg" : "lottie";
    if (SVG_ONLY_BLOCK_PROGRESS_ICONS.has(iconType)) iconStyle = "svg";
    return {
      ...marker,
      iconType,
      iconStyle: ai.iconStyle ? iconStyle : marker.iconStyle,
      aiReason: ai.reason || null,
    };
  });
  return dedupeBlockProgressIcons(merged, { niche });
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

  const chaptersText = resolveChaptersTextForProject(projectDir, readProjectJson);
  const rawBlocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  const starts = timings.starts || [];
  const durations = timings.durations || [];

  const markers = hasCompleteSavedBlockIcons(rawBlocks, blockPhrases)
    ? mergeSavedBlockProgressMarkers(rawBlocks, {
      blockPhrases,
      visualPrompts,
      starts,
      durations,
      chaptersText,
      storyboard,
      config,
    })
    : buildDefaultBlockProgressMarkers({
      blockPhrases,
      visualPrompts,
      starts,
      durations,
      niche: config.niche || "Geral",
      existingBlocks: rawBlocks,
      chaptersText,
      storyboard,
      config,
    });

  const titleFont = BLOCK_PROGRESS_TITLE_FONTS[raw.titleFont]
    ? raw.titleFont
    : "inter";

  return {
    enabled: true,
    design: normalizeBlockProgressDesign(raw.design),
    iconSize: Number(raw.iconSize) || (config.aspect_ratio === "9:16" ? 16 : 22),
    defaultIconStyle: raw.defaultIconStyle === "svg" ? "svg" : "lottie",
    showBlockTitles: raw.showBlockTitles === true,
    titleFont,
    titleFontSize: Number(raw.titleFontSize) || (config.aspect_ratio === "9:16" ? 9 : 10),
    titleColor: String(raw.titleColor || "#FFFFFF"),
    showChannelLogo: raw.showChannelLogo === true,
    channelLogoSize: Number(raw.channelLogoSize) || (config.aspect_ratio === "9:16" ? 22 : 28),
    blocks: markers,
    totalDuration: Number(timings.total_duration)
      || markers.reduce((max, m) => Math.max(max, m.start + m.duration), 0)
      || 120,
  };
}