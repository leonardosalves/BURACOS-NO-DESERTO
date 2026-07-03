export type OverlayEditorType =
  | 'lower-third'
  | 'counter'
  | 'bar-chart'
  | 'timeline'
  | 'kinetic-text'
  | 'info-card'
  | 'source-card'
  | 'social-post'
  | 'geo-map'
  | 'listicle-stinger'
  | 'listicle-recap'
  | 'rank-progress'
  | 'chapter-stinger';

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

export type OverlayDraft = {
  id: string;
  type: string;
  start: number | string;
  duration: number;
  scene_ref?: string;
  block_ref?: number;
  /** Início/duração definidos no editor — o render não reautoajusta. */
  timing_manual?: boolean;
  props?: Record<string, unknown>;
  ai_meta?: OverlayAiMeta;
};

export const INFORMATIVE_OVERLAY_TYPES: OverlayEditorType[] = [
  'lower-third',
  'counter',
  'bar-chart',
  'timeline',
  'kinetic-text',
  'info-card',
  'source-card',
  'social-post',
  'geo-map',
];

export const SYSTEM_OVERLAY_TYPES: OverlayEditorType[] = [
  'listicle-stinger',
  'listicle-recap',
  'rank-progress',
  'chapter-stinger',
];

export const OVERLAY_TYPE_LABELS: Record<string, string> = {
  'lower-third': 'Lower Third',
  counter: 'Contador',
  'bar-chart': 'Gráfico de barras',
  timeline: 'Linha do tempo',
  'kinetic-text': 'Texto cinético',
  'info-card': 'Card informativo',
  'source-card': 'Card de fonte',
  'social-post': 'Post social',
  'geo-map': 'Mapa geográfico',
  'listicle-stinger': 'Stinger listicle',
  'listicle-recap': 'Recap listicle',
  'rank-progress': 'HUD ranking',
  'chapter-stinger': 'Chapter stinger',
};

export const OVERLAY_POSITIONS: Record<string, { id: string; label: string }[]> = {
  'lower-third': [
    { id: 'bottom-left', label: 'Inferior esquerda' },
    { id: 'bottom-center', label: 'Inferior centro' },
    { id: 'bottom-right', label: 'Inferior direita' },
    { id: 'top-left', label: 'Superior esquerda' },
    { id: 'top-right', label: 'Superior direita' },
  ],
  counter: [
    { id: 'center', label: 'Centro' },
    { id: 'bottom-right', label: 'Inferior direita' },
    { id: 'bottom-left', label: 'Inferior esquerda' },
    { id: 'top-right', label: 'Superior direita' },
  ],
  'info-card': [
    { id: 'top-right', label: 'Superior direita' },
    { id: 'top-left', label: 'Superior esquerda' },
    { id: 'bottom-right', label: 'Inferior direita' },
    { id: 'bottom-left', label: 'Inferior esquerda' },
  ],
  'source-card': [
    { id: 'bottom-left', label: 'Inferior esquerda' },
    { id: 'bottom-right', label: 'Inferior direita' },
  ],
  'social-post': [
    { id: 'bottom-left', label: 'Inferior esquerda' },
    { id: 'bottom-right', label: 'Inferior direita' },
  ],
  'geo-map': [
    { id: 'bottom-right', label: 'Inferior direita' },
    { id: 'bottom-left', label: 'Inferior esquerda' },
    { id: 'top-right', label: 'Superior direita' },
  ],
  'kinetic-text': [
    { id: 'center', label: 'Centro' },
    { id: 'bottom-left', label: 'Inferior esquerda' },
    { id: 'bottom-right', label: 'Inferior direita' },
    { id: 'top-left', label: 'Superior esquerda' },
    { id: 'top-right', label: 'Superior direita' },
  ],
  'bar-chart': [
    { id: 'bottom-left', label: 'Inferior esquerda' },
    { id: 'bottom-center', label: 'Inferior centro' },
    { id: 'bottom-right', label: 'Inferior direita' },
    { id: 'top-left', label: 'Superior esquerda' },
    { id: 'top-center', label: 'Superior centro' },
    { id: 'top-right', label: 'Superior direita' },
    { id: 'center', label: 'Centro' },
  ],
  timeline: [
    { id: 'bottom-left', label: 'Inferior esquerda' },
    { id: 'bottom-center', label: 'Inferior centro' },
    { id: 'bottom-right', label: 'Inferior direita' },
    { id: 'top-left', label: 'Superior esquerda' },
    { id: 'top-center', label: 'Superior centro' },
    { id: 'top-right', label: 'Superior direita' },
    { id: 'center', label: 'Centro' },
  ],
};

/** Grade 3×3 para o seletor visual de posição (linha × coluna). */
export const OVERLAY_POSITION_GRID: { id: string; label: string; row: number; col: number }[] = [
  { id: 'top-left', label: '↖', row: 0, col: 0 },
  { id: 'top-center', label: '↑', row: 0, col: 1 },
  { id: 'top-right', label: '↗', row: 0, col: 2 },
  { id: 'center', label: '●', row: 1, col: 1 },
  { id: 'bottom-left', label: '↙', row: 2, col: 0 },
  { id: 'bottom-center', label: '↓', row: 2, col: 1 },
  { id: 'bottom-right', label: '↘', row: 2, col: 2 },
];

export function defaultOverlayPosition(type: string): string {
  const positions = OVERLAY_POSITIONS[type];
  if (positions?.length) return positions[0].id;
  return 'bottom-left';
}

export function isValidOverlayPosition(type: string, position?: string): boolean {
  const raw = String(position || '').trim();
  if (!raw) return false;
  const normalized = raw === 'right' ? 'bottom-right' : raw;
  return (OVERLAY_POSITIONS[type] || []).some((p) => p.id === normalized);
}

export const OVERLAY_VARIANTS: Record<string, { id: string; label: string }[]> = {
  'lower-third': [
    { id: 'glass', label: 'Glass' },
    { id: 'bild', label: 'Bild' },
    { id: 'accent-underline', label: 'Sublinhado' },
    { id: 'bold-block', label: 'Bloco bold' },
    { id: 'clean-bar', label: 'Barra limpa' },
    { id: 'soft-pill', label: 'Pill suave' },
    { id: 'color-block', label: 'Color Block' },
    { id: 'dark-card', label: 'Dark Card' },
    { id: 'kicker-name', label: 'Kicker + Nome' },
    { id: 'mask-reveal', label: 'Mask Reveal' },
    { id: 'side-rule', label: 'Side Rule' },
    { id: 'stack-bars', label: 'Stack Bars' },
    { id: 'youtube-bar', label: 'YouTube Bar' },
    { id: 'news-ticker', label: 'News Ticker' },
  ],
  'info-card': [
    { id: 'glass', label: 'Glass' },
    { id: 'minimal', label: 'Minimal' },
    { id: 'accent', label: 'Acento' },
    { id: 'floating', label: 'Flutuante' },
  ],
  'bar-chart': [
    { id: 'comparison', label: 'Comparação' },
    { id: 'compact', label: 'Compacto' },
  ],
  timeline: [
    { id: 'horizontal', label: 'Horizontal' },
    { id: 'vertical', label: 'Vertical' },
  ],
};

export const OVERLAY_THEMES = [
  { id: 'classic', label: 'Clássico' },
  { id: 'minimal', label: 'Minimalista' },
  { id: 'modern', label: 'Moderno' },
  { id: 'futuristic', label: 'Futurista' },
  { id: 'neon', label: 'Neon' },
  { id: 'ancient', label: 'Antigo' },
  { id: 'tech', label: 'Tech' },
  { id: 'nature', label: 'Natureza' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'mysterious', label: 'Mistério' },
];

export const OVERLAY_THEME_IDS = OVERLAY_THEMES.map((t) => t.id);

export { LOTTIE_ICON_OPTIONS, type OverlayIconStyle } from './overlayIconCatalog';

export type ContentField = {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'number' | 'select';
  options?: { id: string; label: string }[];
  placeholder?: string;
};

export const OVERLAY_CONTENT_FIELDS: Record<string, ContentField[]> = {
  'lower-third': [
    { key: 'title', label: 'Título', kind: 'text' },
    { key: 'subtitle', label: 'Subtítulo', kind: 'text' },
  ],
  counter: [
    { key: 'value', label: 'Valor', kind: 'text' },
    { key: 'label', label: 'Rótulo', kind: 'text' },
    { key: 'suffix', label: 'Sufixo', kind: 'text', placeholder: '% / km / anos' },
  ],
  'info-card': [
    { key: 'title', label: 'Título', kind: 'text' },
    { key: 'description', label: 'Descrição', kind: 'textarea' },
  ],
  'source-card': [
    { key: 'source', label: 'Fonte', kind: 'text' },
    { key: 'detail', label: 'Detalhe', kind: 'text' },
  ],
  'social-post': [
    {
      key: 'platform',
      label: 'Plataforma',
      kind: 'select',
      options: [
        { id: 'reddit', label: 'Reddit' },
        { id: 'x', label: 'X (Twitter)' },
        { id: 'instagram', label: 'Instagram' },
        { id: 'tiktok', label: 'TikTok' },
        { id: 'spotify', label: 'Spotify' },
        { id: 'macos-notification', label: 'macOS Notification' },
        { id: 'generic', label: 'Genérico' },
      ],
    },
    { key: 'username', label: 'Usuário', kind: 'text' },
    { key: 'text', label: 'Texto do post', kind: 'textarea' },
    { key: 'upvotes', label: 'Upvotes', kind: 'text' },
  ],
  'geo-map': [
    { key: 'location', label: 'Local', kind: 'text' },
    { key: 'region', label: 'Região', kind: 'text' },
  ],
  'kinetic-text': [
    { key: 'text', label: 'Texto', kind: 'text' },
    {
      key: 'style',
      label: 'Estilo',
      kind: 'select',
      options: [
        { id: 'slam', label: 'Slam' },
        { id: 'reveal', label: 'Reveal' },
        { id: 'glitch', label: 'Glitch' },
        { id: 'typewriter', label: 'Typewriter' },
        { id: 'fade-up', label: 'Fade Up' },
        { id: 'blend-difference', label: 'Blend Difference' },
        { id: 'morph-text', label: 'Morph Text' },
        { id: 'texture-mask', label: 'Texture Mask' },
        { id: 'mask-reveal', label: 'Mask Reveal' },
      ],
    },
  ],
  'bar-chart': [
    { key: 'title', label: 'Título', kind: 'text', placeholder: 'COMPARAÇÃO' },
  ],
  timeline: [
    { key: 'title', label: 'Título', kind: 'text' },
  ],
};

export function isSceneId(value: unknown): boolean {
  return /^\d+\.\d+$/.test(String(value ?? '').trim());
}

export function overlaySupportsLottie(type: string): boolean {
  return ['lower-third', 'counter', 'info-card', 'bar-chart', 'timeline'].includes(type);
}

export function overlaySupportsPosition(type: string): boolean {
  return Boolean(OVERLAY_POSITIONS[type]);
}

export function overlaySupportsVariant(type: string): boolean {
  return Boolean(OVERLAY_VARIANTS[type]);
}

export function overlaySupportsTheme(type: string): boolean {
  return ['lower-third', 'info-card', 'source-card', 'counter', 'bar-chart', 'timeline', 'kinetic-text'].includes(type);
}

export function formatOverlayTime(seconds: number): string {
  const s = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toFixed(1).padStart(4, '0')}`;
}

/** Aceita vírgula ou ponto decimal (locale PT-BR). */
export function parseOverlaySeconds(raw: string | number): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  const normalized = String(raw).trim().replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

export function resolveSceneSeconds(
  sceneId: string,
  starts: number[] = [],
): number | null {
  const block = parseInt(String(sceneId).split('.')[0], 10);
  if (!Number.isFinite(block) || block < 1) return null;
  const idx = block - 1;
  if (!Number.isFinite(starts[idx])) return null;
  return starts[idx] + 0.5;
}

export function buildSceneOptions(
  visualPrompts: Array<{ scene?: string; block?: number; narration_text?: string }> = [],
): { id: string; label: string; seconds: number | null }[] {
  return visualPrompts.map((vp, index) => {
    const id = String(vp.scene || `${vp.block || 1}.${index + 1}`).trim();
    const snippet = (vp.narration_text || '').replace(/\s+/g, ' ').trim().slice(0, 48);
    return {
      id,
      label: snippet ? `Cena ${id} — ${snippet}…` : `Cena ${id}`,
      seconds: null,
    };
  });
}

export function normalizeOverlayList(raw: unknown[]): OverlayDraft[] {
  return (raw || []).map((item, index) => {
    const o = item as OverlayDraft;
    const props = { ...(o.props || {}) };
    const raw = o as OverlayDraft;
    return {
      id: raw.id || `overlay-${index + 1}`,
      type: raw.type || 'lower-third',
      start: raw.start ?? 0,
      duration: Number(raw.duration) > 0 ? Number(raw.duration) : 4,
      scene_ref: raw.scene_ref,
      block_ref: raw.block_ref,
      timing_manual: raw.timing_manual === true,
      props,
      ai_meta: raw.ai_meta,
    };
  });
}

export function overlaySceneRef(overlay: OverlayDraft): string | undefined {
  const sceneId = String(
    overlay.scene_ref || (isSceneId(overlay.start) ? overlay.start : '') || '',
  ).trim();
  return sceneId || undefined;
}

export function overlaySceneLabel(
  overlay: OverlayDraft,
  sceneOptions: { id: string; label: string }[] = [],
): string | undefined {
  const ref = overlaySceneRef(overlay);
  if (!ref) return undefined;
  const opt = sceneOptions.find((s) => s.id === ref);
  return opt?.label || `Cena ${ref}`;
}

export function overlaySummary(overlay: OverlayDraft): string {
  const p = overlay.props || {};
  const pick = (...keys: string[]) => keys.map((k) => p[k]).find((v) => typeof v === 'string' && v.trim());
  return (
    pick('title', 'text', 'source', 'location', 'label', 'value')
    || OVERLAY_TYPE_LABELS[overlay.type]
    || overlay.type
  ) as string;
}