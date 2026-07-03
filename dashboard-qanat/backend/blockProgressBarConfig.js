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
    const exact = chapters.find((c) => Math.abs(c.seconds - start) < 1.5);
    if (exact?.title) return exact.title;
    if (chapters.length === blockStarts.length && chapters[idx]?.title) {
      return chapters[idx].title;
    }
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

export function resolveBlockDisplayTitle(saved, metadataTitle, blockNum) {
  if (saved?.title?.trim()) return saved.title.trim();
  if (String(metadataTitle || "").trim()) return String(metadataTitle).trim();
  if (saved?.label?.trim()) return saved.label.trim();
  return `Bloco ${blockNum}`;
}

export function suggestBlockProgressIcon(narration = "", niche = "", exclude = new Set()) {
  const text = `${niche} ${narration}`.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.re.test(text) && !exclude.has(rule.icon)) return rule.icon;
  }
  for (const icon of ALLOWED_BLOCK_PROGRESS_ICONS) {
    if (!exclude.has(icon)) return icon;
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

  const blocks = (blockPhrases || []).map((bp, idx) => {
    const block = Number(bp.block || idx + 1);
    const saved = existingMap.get(block);
    const phraseStart = String(bp.phrase || bp.text || "").trim();
    const fullNarration = narrationsByBlock.get(block) || phraseStart;
    const title = resolveBlockDisplayTitle(saved, metadataTitles.get(block), block);
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

  return dedupeBlockProgressIcons(blocks, { niche });
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

function normalizeAiIconId(raw) {
  const id = String(raw || "").trim().toLowerCase();
  if (ALLOWED_BLOCK_PROGRESS_ICONS.includes(id)) return id;
  if (id === "atom") return "science";
  if (id === "people" || id === "user") return "users";
  return null;
}

function pickUnusedIconForMarker(marker, used, niche, idx) {
  const text = `${niche} ${marker.title || marker.label || ""}`.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.re.test(text) && !used.has(rule.icon)) return rule.icon;
  }
  const pool = ALLOWED_BLOCK_PROGRESS_ICONS.filter((icon) => !used.has(icon));
  if (!pool.length) return marker.iconType || "info";
  return pool[idx % pool.length];
}

export function dedupeBlockProgressIcons(markers = [], { niche = "Geral" } = {}) {
  const used = new Set();
  return (markers || []).map((marker, idx) => {
    let iconType = normalizeAiIconId(marker.iconType) || String(marker.iconType || "info").toLowerCase();
    if (!ALLOWED_BLOCK_PROGRESS_ICONS.includes(iconType)) iconType = "info";

    let adjusted = false;
    if (used.has(iconType)) {
      const alt = pickUnusedIconForMarker(marker, used, niche, idx);
      if (alt && alt !== iconType) {
        iconType = alt;
        adjusted = true;
      }
    }
    used.add(iconType);

    let iconStyle = marker.iconStyle === "svg" ? "svg" : "lottie";
    if (SVG_ONLY_BLOCK_PROGRESS_ICONS.has(iconType)) iconStyle = "svg";

    const next = { ...marker, iconType, iconStyle };
    if (adjusted) {
      next.aiReason = marker.aiReason
        ? `${marker.aiReason} · ícone alternado (sem repetir na barra)`
        : "Ícone alternado para evitar repetição na barra";
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

ÍCONES PERMITIDOS (use exatamente estes ids):
${ALLOWED_BLOCK_PROGRESS_ICONS.join(", ")}

ROTEIRO POR BLOCO:
${blockLines}

Regras OBRIGATÓRIAS:
- Cada bloco deve ter iconType ÚNICO — NENHUM ícone pode se repetir na barra inteira
- Prefira ícones que representem o TEMA do bloco, não palavras genéricas
- iconStyle: "lottie" (padrão animado) ou "svg" para: swords, bolt, rocket, chart, users, clock
- Diversifique categorias (espaço→rocket/science, guerra→swords/shield, dados→chart/graph)

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

  const markers = buildDefaultBlockProgressMarkers({
    blockPhrases,
    visualPrompts,
    starts: timings.starts || [],
    durations: timings.durations || [],
    niche: config.niche || "Geral",
    existingBlocks: raw.blocks || [],
    chaptersText,
    storyboard,
    config,
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