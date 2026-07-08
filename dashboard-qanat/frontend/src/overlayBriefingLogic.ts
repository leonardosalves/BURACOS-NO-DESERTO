import {
  OVERLAY_POSITIONS,
  OVERLAY_THEMES,
  OVERLAY_TYPE_LABELS,
  OVERLAY_VARIANTS,
  overlaySceneRef,
  overlaySummary,
  type OverlayDraft,
} from "./overlayEditorConfig";
import { iconLabel } from "./overlayIconCatalog";

export type OverlayAiMeta = {
  scene_rationale?: string;
  content_summary?: string;
  design_rationale?: string;
  research_fact?: string;
  research_query?: string;
  research_source?: string;
  narration_relation?: string;
  suggested_type?: string;
  suggested_variant?: string;
  suggested_theme?: string;
  suggested_icon?: string;
  suggested_position?: string;
};

export type OverlayResearchSnapshot = {
  topic?: string;
  query?: string;
  summary?: string;
  facts?: string[];
  sources?: Array<{ title?: string; url?: string; snippet?: string }>;
  selectedBlocks?: number[];
  sourceLocked?: boolean;
  blocks?: Array<{
    block?: number;
    sourceLocked?: boolean;
    primaryTopic?: string;
    narration?: string;
    query?: string;
    facts?: string[];
    sources?: Array<{ title?: string; url?: string; snippet?: string }>;
  }>;
  sufficient?: boolean;
  fetchedAt?: string;
};

export type VisualPromptScene = {
  scene?: string;
  block?: number;
  narration_text?: string;
  prompt?: string;
  visual_description?: string;
};

export type OverlayBriefing = {
  sceneId?: string;
  sceneNarration?: string;
  sceneVisual?: string;
  sceneRationale?: string;
  contentSummary?: string;
  narrationRelation?: string;
  designRationale?: string;
  researchQuery?: string;
  researchFact?: string;
  researchSource?: string;
  researchTopic?: string;
  suggestions: {
    type?: string;
    typeLabel?: string;
    variant?: string;
    variantLabel?: string;
    theme?: string;
    themeLabel?: string;
    icon?: string;
    iconLabel?: string;
    position?: string;
    positionLabel?: string;
  };
  source: "ai" | "heuristic" | "mixed";
  globalPlanning?: string[];
};

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let hits = 0;
  for (const t of a) {
    if (b.has(t)) hits += 1;
  }
  return hits / Math.max(a.size, b.size);
}

const STORY_OBJECT_GROUPS = [
  ["ponte", "pontes", "viaduto", "viadutos", "passarela", "passarelas"],
  [
    "predio",
    "predios",
    "edificio",
    "edificios",
    "condominio",
    "apartamento",
    "palace",
    "palacio",
    "palacios",
  ],
  ["barragem", "barragens", "represa", "represas"],
  ["navio", "navios", "barco", "barcos", "submarino", "submarinos"],
  ["aviao", "avioes", "aeronave", "aeronaves", "helicoptero"],
  ["trem", "trens", "metro", "ferrovia", "ferroviaria"],
  ["rodovia", "estrada", "tunel", "tuneis"],
];

function storyObjectGroupsInText(text = ""): string[][] {
  const tokens = tokenize(text);
  return STORY_OBJECT_GROUPS.filter((group) =>
    group.some((term) => tokens.has(term))
  );
}

function hasStoryObjectContradiction(candidate = "", context = ""): boolean {
  const contextGroups = storyObjectGroupsInText(context);
  if (!contextGroups.length) return false;
  const candidateGroups = storyObjectGroupsInText(candidate);
  if (!candidateGroups.length) return false;
  return candidateGroups.some(
    (candidateGroup) =>
      !contextGroups.some((contextGroup) => contextGroup === candidateGroup)
  );
}

function researchContextText(
  research?: OverlayResearchSnapshot | null
): string {
  return [
    research?.topic,
    research?.query,
    research?.blocks?.[0]?.primaryTopic,
    research?.blocks?.[0]?.narration,
  ]
    .filter(Boolean)
    .join(" ");
}

function isResearchCandidateRelevant(
  candidate = "",
  research?: OverlayResearchSnapshot | null
): boolean {
  const context = researchContextText(research);
  const contextTokens = tokenize(context);
  if (!contextTokens.size) return true;
  if (hasStoryObjectContradiction(candidate, context)) return false;
  return overlapScore(contextTokens, tokenize(candidate)) >= 0.12;
}

function overlayTextBlob(overlay: OverlayDraft): string {
  const p = overlay.props || {};
  const nestedText: string[] = [];
  const collect = (value: unknown, depth = 0) => {
    if (depth > 3 || value == null) return;
    if (typeof value === "string" || typeof value === "number") {
      nestedText.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => collect(item, depth + 1));
      return;
    }
    if (typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach((item) =>
        collect(item, depth + 1)
      );
    }
  };
  collect(p.events);
  collect(p.items);
  collect(p.segments);
  collect(p.rows);
  return [
    p.title,
    p.subtitle,
    p.description,
    p.label,
    p.value,
    p.text,
    p.source,
    p.location,
    ...nestedText,
  ]
    .filter((v) => v != null && String(v).trim())
    .map((v) => String(v))
    .join(" ");
}

function matchResearchFact(
  overlayText: string,
  research?: OverlayResearchSnapshot | null
): { fact?: string; source?: string } {
  const facts = (research?.facts || []).filter((fact) =>
    isResearchCandidateRelevant(fact, research)
  );
  if (!facts.length || !overlayText.trim()) return {};

  const overlayTokens = tokenize(overlayText);
  let bestFact = "";
  let bestScore = 0;

  for (const fact of facts) {
    const score = overlapScore(overlayTokens, tokenize(fact));
    if (score > bestScore) {
      bestScore = score;
      bestFact = fact;
    }
  }

  if (!bestFact || bestScore < 0.12) {
    const numeric = overlayText.match(/\d[\d.,]*/);
    if (numeric) {
      const byNumber = facts.find((f) => f.includes(numeric[0]));
      if (byNumber) bestFact = byNumber;
    }
  }

  if (!bestFact) return {};

  let source: string | undefined;
  const sources = (research?.sources || []).filter((src) =>
    isResearchCandidateRelevant(
      [src.title, src.url, src.snippet].filter(Boolean).join(" "),
      research
    )
  );
  if (sources.length) {
    const factTokens = tokenize(bestFact);
    let bestSrc: (typeof sources)[number] | undefined;
    let bestSrcScore = 0;
    for (const src of sources) {
      const sourceText = String(
        [src.title, src.url, src.snippet].filter(Boolean).join(" ")
      );
      const score = overlapScore(factTokens, tokenize(sourceText));
      if (score > bestSrcScore) {
        bestSrcScore = score;
        bestSrc = src;
      }
    }
    if (bestSrc && bestSrcScore >= 0.12) source = bestSrc.title || bestSrc.url;
  }

  return { fact: bestFact, source };
}

function fallbackResearchSource(
  research?: OverlayResearchSnapshot | null
): string | undefined {
  const source = (research?.sources || []).find((src) =>
    isResearchCandidateRelevant(
      [src.title, src.url, src.snippet].filter(Boolean).join(" "),
      research
    )
  );
  return source?.title || source?.url;
}

function blockFromSceneId(sceneId?: string): number | null {
  const m = String(sceneId || "").match(/^(\d+)\./);
  return m ? Number(m[1]) : null;
}

function scopedResearchForOverlay(
  sceneId: string | undefined,
  research?: OverlayResearchSnapshot | null
): OverlayResearchSnapshot | null {
  if (!research) return null;
  const block = blockFromSceneId(sceneId);
  if (!block || !Array.isArray(research.blocks)) return research;
  const scoped = research.blocks.find((b) => Number(b.block) === block);
  if (!scoped) return research;
  return {
    ...research,
    query: scoped.query || research.query,
    facts: scoped.facts || [],
    sources: scoped.sources || [],
    selectedBlocks: [block],
    blocks: [scoped],
  };
}

function factBelongsToResearch(
  fact = "",
  research?: OverlayResearchSnapshot | null
): boolean {
  const clean = fact.trim();
  if (!clean) return false;
  if (!isResearchCandidateRelevant(clean, research)) return false;
  const factTokens = tokenize(clean);
  return (research?.facts || [])
    .filter((candidate) => isResearchCandidateRelevant(candidate, research))
    .some(
      (candidate) =>
        candidate.includes(clean) ||
        overlapScore(factTokens, tokenize(candidate)) >= 0.18
    );
}

const ENTITY_ALLOWLIST = new Set([
  "IA",
  "AI",
  "Brasil",
  "Cena",
  "Lottie",
  "Timeline",
]);

function extractEntityHints(text = ""): string[] {
  const matches =
    text.match(
      /\b(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç-]+)(?:\s+(?:de|da|do|dos|das|e|[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç-]+)){1,5}/g
    ) || [];
  return [...new Set(matches.map((m) => m.trim()))].filter(
    (m) =>
      m.length >= 8 &&
      !ENTITY_ALLOWLIST.has(m) &&
      !/^(Cena|Bloco|Tipo|Tema|Design|Fonte|Fato)\b/i.test(m)
  );
}

function metaMatchesScopedStory(
  meta: OverlayAiMeta | undefined,
  scene?: VisualPromptScene,
  research?: OverlayResearchSnapshot | null
): boolean {
  if (!meta) return true;
  const metaText = [
    meta.scene_rationale,
    meta.content_summary,
    meta.design_rationale,
    meta.research_fact,
    meta.narration_relation,
  ]
    .filter(Boolean)
    .join(" ");
  if (!metaText.trim()) return true;
  const context = [
    scene?.narration_text,
    scene?.prompt,
    scene?.visual_description,
    research?.topic,
    research?.blocks?.[0]?.primaryTopic,
    research?.blocks?.[0]?.narration,
    ...(research?.facts || []),
  ]
    .filter(Boolean)
    .join(" ");
  const contextTokens = tokenize(context);
  if (!contextTokens.size) return true;
  return !extractEntityHints(metaText).some(
    (entity) => overlapScore(tokenize(entity), contextTokens) < 0.34
  );
}

function inferTypeSuggestion(overlay: OverlayDraft): string {
  const p = overlay.props || {};
  if (p.events && Array.isArray(p.events) && p.events.length >= 2)
    return "timeline";
  if (p.items && Array.isArray(p.items) && p.items.length >= 2)
    return "bar-chart";
  if (p.value != null && String(p.value).trim()) return "counter";
  if (p.text && String(p.text).length <= 24) return "kinetic-text";
  if (p.source || p.detail) return "source-card";
  if (p.segments && Array.isArray(p.segments) && p.segments.length >= 2)
    return "pictogram-chart";
  if (p.location && (p.country || p.variant)) return "location-intro";
  if (p.location || p.region) return "geo-map";
  if (p.platform || p.username) return "social-post";
  if (p.description && String(p.description).length > 40) return "info-card";
  return overlay.type || "lower-third";
}

function inferDesignRationale(type: string, theme?: string): string {
  const map: Record<string, string> = {
    counter:
      "Números e estatísticas ficam legíveis em contador animado, sem competir com a imagem.",
    "bar-chart":
      "Comparações visuais ajudam o espectador a entender proporções de relance.",
    timeline:
      "Sequências temporais pedem linha do tempo horizontal ou vertical.",
    "lower-third":
      "Contexto curto (nome, definição, dado pontual) funciona bem em lower third.",
    "kinetic-text":
      "Frases de impacto curtas ganham ênfio com animação cinética.",
    "info-card": "Fatos com mais de uma linha cabem melhor em card lateral.",
    "source-card":
      "Citação de fonte reforça credibilidade sem poluir o quadro.",
    "geo-map": "Localização geográfica pede mapa ou marcador regional.",
    "pictogram-chart":
      "Comparações em % com muitas categorias pedem grid de pictogramas full-screen.",
    "location-intro":
      "Primeira menção de cidade/país pede intro cinematográfica estilo satélite.",
    "social-post":
      "Depoimentos ou posts simulam prova social no formato da plataforma.",
  };
  const base =
    map[type] ||
    "Formato escolhido para complementar a cena sem repetir a narração.";
  if (theme === "minimal")
    return `${base} Tema minimalista — painel limpo para comparações legíveis.`;
  if (theme === "modern")
    return `${base} Tema moderno — glass escuro com contraste suave.`;
  if (theme === "futuristic")
    return `${base} Tema futurista — ideal para espaço, plasma e tech (como no print).`;
  if (theme === "neon")
    return `${base} Tema neon — barras com glow para destaque viral.`;
  if (theme === "ancient")
    return `${base} Tema antigo combina com história e arqueologia.`;
  if (theme === "nature")
    return `${base} Tema natureza combina com geografia e meio ambiente.`;
  if (theme === "industrial")
    return `${base} Tema industrial combina com engenharia e militar.`;
  if (theme === "mysterious")
    return `${base} Tema mistério combina com teorias e enigmas.`;
  if (theme === "tech")
    return `${base} Tema tech — barras horizontais dourado/ciano como comparação científica.`;
  return base;
}

function labelForVariant(type: string, variant?: string): string | undefined {
  if (!variant) return undefined;
  return (
    OVERLAY_VARIANTS[type]?.find((v) => v.id === variant)?.label || variant
  );
}

function labelForTheme(theme?: string): string | undefined {
  if (!theme) return undefined;
  return OVERLAY_THEMES.find((t) => t.id === theme)?.label || theme;
}

function labelForPosition(type: string, position?: string): string | undefined {
  if (!position) return undefined;
  return (
    OVERLAY_POSITIONS[type]?.find((p) => p.id === position)?.label || position
  );
}

function buildContentSummary(
  overlay: OverlayDraft,
  meta?: OverlayAiMeta
): string {
  if (meta?.content_summary?.trim()) return meta.content_summary.trim();
  const p = overlay.props || {};
  const parts: string[] = [];
  if (p.title) parts.push(`Título: ${p.title}`);
  if (p.subtitle) parts.push(`Subtítulo: ${p.subtitle}`);
  if (p.description) parts.push(`Descrição: ${p.description}`);
  if (p.label) parts.push(`Rótulo: ${p.label}`);
  if (p.value != null)
    parts.push(`Valor: ${p.value}${p.suffix ? ` ${p.suffix}` : ""}`);
  if (p.text) parts.push(`Texto: ${p.text}`);
  if (parts.length) {
    return `Este overlay exibe ${parts.join(" · ")}.`;
  }
  return `Informativo do tipo ${OVERLAY_TYPE_LABELS[overlay.type] || overlay.type} com conteúdo ainda não preenchido.`;
}

function buildNarrationRelation(
  narration?: string,
  overlayText?: string,
  meta?: OverlayAiMeta
): string {
  if (meta?.narration_relation?.trim()) return meta.narration_relation.trim();
  if (!narration?.trim()) {
    return "Associe este overlay à cena do roteiro onde o dado visual complementa o que está na tela — não repita a narração falada.";
  }
  const narrTokens = tokenize(narration);
  const overlayTokens = tokenize(overlayText || "");
  const overlap = overlapScore(narrTokens, overlayTokens);
  if (overlap > 0.35) {
    return "Atenção: o texto do overlay parece repetir a narração desta cena. O ideal é trazer um dado novo (número, data, comparação ou curiosidade) que a voz não disse.";
  }
  return "Complementa a narração com informação visual de leitura rápida — dado, definição ou contexto que reforça a cena sem substituir o áudio.";
}

export function buildOverlayBriefing(
  overlay: OverlayDraft,
  {
    visualPrompts = [],
    overlayResearch = null,
    globalPlanning = [],
  }: {
    visualPrompts?: VisualPromptScene[];
    overlayResearch?: OverlayResearchSnapshot | null;
    globalPlanning?: string[];
  } = {}
): OverlayBriefing {
  const meta = (overlay as OverlayDraft & { ai_meta?: OverlayAiMeta }).ai_meta;
  const sceneId = overlaySceneRef(overlay);
  const scene = sceneId
    ? visualPrompts.find((vp) => String(vp.scene || "") === sceneId)
    : undefined;
  const narration = scene?.narration_text?.replace(/\s+/g, " ").trim();
  const visual = (scene?.visual_description || scene?.prompt || "")
    .replace(/\s+/g, " ")
    .trim();
  const textBlob = overlayTextBlob(overlay);
  const scopedResearch = scopedResearchForOverlay(sceneId, overlayResearch);
  const safeMeta = metaMatchesScopedStory(meta, scene, scopedResearch)
    ? meta
    : undefined;
  const researchMatch = matchResearchFact(textBlob, scopedResearch);
  const researchSourceFallback = fallbackResearchSource(scopedResearch);

  const suggestedType =
    safeMeta?.suggested_type || inferTypeSuggestion(overlay);
  const suggestedVariant =
    safeMeta?.suggested_variant ||
    (overlay.props?.variant as string | undefined) ||
    OVERLAY_VARIANTS[suggestedType]?.[0]?.id;
  const suggestedTheme =
    safeMeta?.suggested_theme ||
    (overlay.props?.theme as string | undefined) ||
    "classic";
  const suggestedIcon =
    safeMeta?.suggested_icon || (overlay.props?.iconType as string | undefined);
  const suggestedPosition =
    safeMeta?.suggested_position ||
    (overlay.props?.position as string | undefined) ||
    OVERLAY_POSITIONS[suggestedType]?.[0]?.id;

  const hasAiMeta = Boolean(
    safeMeta?.scene_rationale ||
    safeMeta?.content_summary ||
    safeMeta?.design_rationale ||
    safeMeta?.research_fact ||
    safeMeta?.narration_relation
  );
  const hasHeuristicResearch = Boolean(
    researchMatch.fact && !safeMeta?.research_fact
  );

  return {
    sceneId,
    sceneNarration: narration,
    sceneVisual: visual || undefined,
    sceneRationale:
      safeMeta?.scene_rationale?.trim() ||
      (sceneId
        ? `Aparece na cena ${sceneId}${visual ? ` — momento visual: ${visual.slice(0, 120)}${visual.length > 120 ? "…" : ""}` : ""}.`
        : "Sem cena âncora — defina a cena no roteiro para sincronizar com o vídeo."),
    contentSummary: buildContentSummary(overlay, safeMeta),
    narrationRelation: buildNarrationRelation(narration, textBlob, safeMeta),
    designRationale:
      safeMeta?.design_rationale?.trim() ||
      inferDesignRationale(suggestedType, suggestedTheme),
    researchQuery: scopedResearch?.query,
    researchFact:
      safeMeta?.research_fact &&
      factBelongsToResearch(safeMeta.research_fact, scopedResearch)
        ? safeMeta.research_fact
        : researchMatch.fact,
    researchSource:
      safeMeta?.research_fact &&
      factBelongsToResearch(safeMeta.research_fact, scopedResearch)
        ? safeMeta.research_source
        : researchMatch.source || researchSourceFallback,
    researchTopic:
      scopedResearch?.blocks?.[0]?.primaryTopic || scopedResearch?.topic,
    suggestions: {
      type: suggestedType,
      typeLabel: OVERLAY_TYPE_LABELS[suggestedType] || suggestedType,
      variant: suggestedVariant,
      variantLabel: labelForVariant(suggestedType, suggestedVariant),
      theme: suggestedTheme,
      themeLabel: labelForTheme(suggestedTheme),
      icon: suggestedIcon,
      iconLabel: suggestedIcon ? iconLabel(suggestedIcon, "lottie") : undefined,
      position: suggestedPosition,
      positionLabel: labelForPosition(suggestedType, suggestedPosition),
    },
    source:
      hasAiMeta && hasHeuristicResearch
        ? "mixed"
        : hasAiMeta
          ? "ai"
          : "heuristic",
    globalPlanning: globalPlanning.length ? globalPlanning : undefined,
  };
}

export function overlayBriefingOneLiner(
  briefing: OverlayBriefing,
  overlay: OverlayDraft
): string {
  const summary = overlaySummary(overlay);
  if (briefing.researchFact) {
    return `${summary} · pesquisa: ${briefing.researchFact.slice(0, 56)}…`;
  }
  if (briefing.sceneId) {
    return `${summary} · cena ${briefing.sceneId}`;
  }
  return summary;
}
