import {
  OVERLAY_POSITIONS,
  OVERLAY_THEMES,
  OVERLAY_TYPE_LABELS,
  OVERLAY_VARIANTS,
  overlaySceneRef,
  overlaySummary,
  type OverlayDraft,
} from './overlayEditorConfig';
import { iconLabel } from './overlayIconCatalog';

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
  sources?: Array<{ title?: string; url?: string }>;
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
  source: 'ai' | 'heuristic' | 'mixed';
  globalPlanning?: string[];
};

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3),
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

function overlayTextBlob(overlay: OverlayDraft): string {
  const p = overlay.props || {};
  return [
    p.title,
    p.subtitle,
    p.description,
    p.label,
    p.value,
    p.text,
    p.source,
    p.location,
  ]
    .filter((v) => v != null && String(v).trim())
    .map((v) => String(v))
    .join(' ');
}

function matchResearchFact(
  overlayText: string,
  research?: OverlayResearchSnapshot | null,
): { fact?: string; source?: string } {
  const facts = research?.facts || [];
  if (!facts.length || !overlayText.trim()) return {};

  const overlayTokens = tokenize(overlayText);
  let bestFact = '';
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
  const sources = research?.sources || [];
  if (sources.length) {
    const factTokens = tokenize(bestFact);
    let bestSrc = sources[0];
    let bestSrcScore = 0;
    for (const src of sources) {
      const title = String(src.title || src.url || '');
      const score = overlapScore(factTokens, tokenize(title));
      if (score > bestSrcScore) {
        bestSrcScore = score;
        bestSrc = src;
      }
    }
    source = bestSrc.title || bestSrc.url;
  }

  return { fact: bestFact, source };
}

function inferTypeSuggestion(overlay: OverlayDraft): string {
  const p = overlay.props || {};
  if (p.events && Array.isArray(p.events) && p.events.length >= 2) return 'timeline';
  if (p.items && Array.isArray(p.items) && p.items.length >= 2) return 'bar-chart';
  if (p.value != null && String(p.value).trim()) return 'counter';
  if (p.text && String(p.text).length <= 24) return 'kinetic-text';
  if (p.source || p.detail) return 'source-card';
  if (p.location || p.region) return 'geo-map';
  if (p.platform || p.username) return 'social-post';
  if (p.description && String(p.description).length > 40) return 'info-card';
  return overlay.type || 'lower-third';
}

function inferDesignRationale(type: string, theme?: string): string {
  const map: Record<string, string> = {
    counter: 'Números e estatísticas ficam legíveis em contador animado, sem competir com a imagem.',
    'bar-chart': 'Comparações visuais ajudam o espectador a entender proporções de relance.',
    timeline: 'Sequências temporais pedem linha do tempo horizontal ou vertical.',
    'lower-third': 'Contexto curto (nome, definição, dado pontual) funciona bem em lower third.',
    'kinetic-text': 'Frases de impacto curtas ganham ênfio com animação cinética.',
    'info-card': 'Fatos com mais de uma linha cabem melhor em card lateral.',
    'source-card': 'Citação de fonte reforça credibilidade sem poluir o quadro.',
    'geo-map': 'Localização geográfica pede mapa ou marcador regional.',
    'social-post': 'Depoimentos ou posts simulam prova social no formato da plataforma.',
  };
  const base = map[type] || 'Formato escolhido para complementar a cena sem repetir a narração.';
  if (theme === 'ancient') return `${base} Tema antigo combina com história e arqueologia.`;
  if (theme === 'nature') return `${base} Tema natureza combina com geografia e meio ambiente.`;
  if (theme === 'industrial') return `${base} Tema industrial combina com engenharia e militar.`;
  if (theme === 'mysterious') return `${base} Tema mistério combina com teorias e enigmas.`;
  return base;
}

function labelForVariant(type: string, variant?: string): string | undefined {
  if (!variant) return undefined;
  return OVERLAY_VARIANTS[type]?.find((v) => v.id === variant)?.label || variant;
}

function labelForTheme(theme?: string): string | undefined {
  if (!theme) return undefined;
  return OVERLAY_THEMES.find((t) => t.id === theme)?.label || theme;
}

function labelForPosition(type: string, position?: string): string | undefined {
  if (!position) return undefined;
  return OVERLAY_POSITIONS[type]?.find((p) => p.id === position)?.label || position;
}

function buildContentSummary(overlay: OverlayDraft, meta?: OverlayAiMeta): string {
  if (meta?.content_summary?.trim()) return meta.content_summary.trim();
  const p = overlay.props || {};
  const parts: string[] = [];
  if (p.title) parts.push(`Título: ${p.title}`);
  if (p.subtitle) parts.push(`Subtítulo: ${p.subtitle}`);
  if (p.description) parts.push(`Descrição: ${p.description}`);
  if (p.label) parts.push(`Rótulo: ${p.label}`);
  if (p.value != null) parts.push(`Valor: ${p.value}${p.suffix ? ` ${p.suffix}` : ''}`);
  if (p.text) parts.push(`Texto: ${p.text}`);
  if (parts.length) {
    return `Este overlay exibe ${parts.join(' · ')}.`;
  }
  return `Informativo do tipo ${OVERLAY_TYPE_LABELS[overlay.type] || overlay.type} com conteúdo ainda não preenchido.`;
}

function buildNarrationRelation(
  narration?: string,
  overlayText?: string,
  meta?: OverlayAiMeta,
): string {
  if (meta?.narration_relation?.trim()) return meta.narration_relation.trim();
  if (!narration?.trim()) {
    return 'Associe este overlay à cena do roteiro onde o dado visual complementa o que está na tela — não repita a narração falada.';
  }
  const narrTokens = tokenize(narration);
  const overlayTokens = tokenize(overlayText || '');
  const overlap = overlapScore(narrTokens, overlayTokens);
  if (overlap > 0.35) {
    return 'Atenção: o texto do overlay parece repetir a narração desta cena. O ideal é trazer um dado novo (número, data, comparação ou curiosidade) que a voz não disse.';
  }
  return 'Complementa a narração com informação visual de leitura rápida — dado, definição ou contexto que reforça a cena sem substituir o áudio.';
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
  } = {},
): OverlayBriefing {
  const meta = (overlay as OverlayDraft & { ai_meta?: OverlayAiMeta }).ai_meta;
  const sceneId = overlaySceneRef(overlay);
  const scene = sceneId
    ? visualPrompts.find((vp) => String(vp.scene || '') === sceneId)
    : undefined;
  const narration = scene?.narration_text?.replace(/\s+/g, ' ').trim();
  const visual = (scene?.visual_description || scene?.prompt || '').replace(/\s+/g, ' ').trim();
  const textBlob = overlayTextBlob(overlay);
  const researchMatch = matchResearchFact(textBlob, overlayResearch);

  const suggestedType = meta?.suggested_type || inferTypeSuggestion(overlay);
  const suggestedVariant = meta?.suggested_variant || overlay.props?.variant as string | undefined
    || OVERLAY_VARIANTS[suggestedType]?.[0]?.id;
  const suggestedTheme = meta?.suggested_theme || overlay.props?.theme as string | undefined || 'classic';
  const suggestedIcon = meta?.suggested_icon || overlay.props?.iconType as string | undefined;
  const suggestedPosition = meta?.suggested_position || overlay.props?.position as string | undefined
    || OVERLAY_POSITIONS[suggestedType]?.[0]?.id;

  const hasAiMeta = Boolean(
    meta?.scene_rationale
    || meta?.content_summary
    || meta?.design_rationale
    || meta?.research_fact
    || meta?.narration_relation,
  );
  const hasHeuristicResearch = Boolean(researchMatch.fact && !meta?.research_fact);

  return {
    sceneId,
    sceneNarration: narration,
    sceneVisual: visual || undefined,
    sceneRationale: meta?.scene_rationale?.trim()
      || (sceneId
        ? `Aparece na cena ${sceneId}${visual ? ` — momento visual: ${visual.slice(0, 120)}${visual.length > 120 ? '…' : ''}` : ''}.`
        : 'Sem cena âncora — defina a cena no roteiro para sincronizar com o vídeo.'),
    contentSummary: buildContentSummary(overlay, meta),
    narrationRelation: buildNarrationRelation(narration, textBlob, meta),
    designRationale: meta?.design_rationale?.trim() || inferDesignRationale(suggestedType, suggestedTheme),
    researchQuery: meta?.research_query || overlayResearch?.query,
    researchFact: meta?.research_fact || researchMatch.fact,
    researchSource: meta?.research_source || researchMatch.source,
    researchTopic: overlayResearch?.topic,
    suggestions: {
      type: suggestedType,
      typeLabel: OVERLAY_TYPE_LABELS[suggestedType] || suggestedType,
      variant: suggestedVariant,
      variantLabel: labelForVariant(suggestedType, suggestedVariant),
      theme: suggestedTheme,
      themeLabel: labelForTheme(suggestedTheme),
      icon: suggestedIcon,
      iconLabel: suggestedIcon ? iconLabel(suggestedIcon, 'lottie') : undefined,
      position: suggestedPosition,
      positionLabel: labelForPosition(suggestedType, suggestedPosition),
    },
    source: hasAiMeta && hasHeuristicResearch
      ? 'mixed'
      : hasAiMeta
        ? 'ai'
        : 'heuristic',
    globalPlanning: globalPlanning.length ? globalPlanning : undefined,
  };
}

export function overlayBriefingOneLiner(briefing: OverlayBriefing, overlay: OverlayDraft): string {
  const summary = overlaySummary(overlay);
  if (briefing.researchFact) {
    return `${summary} · pesquisa: ${briefing.researchFact.slice(0, 56)}…`;
  }
  if (briefing.sceneId) {
    return `${summary} · cena ${briefing.sceneId}`;
  }
  return summary;
}