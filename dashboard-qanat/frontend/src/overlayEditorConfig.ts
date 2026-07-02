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

export type OverlayDraft = {
  id: string;
  type: string;
  start: number | string;
  duration: number;
  scene_ref?: string;
  block_ref?: number;
  props?: Record<string, unknown>;
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
};

export const OVERLAY_VARIANTS: Record<string, { id: string; label: string }[]> = {
  'lower-third': [
    { id: 'glass', label: 'Glass' },
    { id: 'bild', label: 'Bild' },
    { id: 'accent-underline', label: 'Sublinhado' },
    { id: 'bold-block', label: 'Bloco bold' },
    { id: 'clean-bar', label: 'Barra limpa' },
    { id: 'soft-pill', label: 'Pill suave' },
  ],
  'info-card': [
    { id: 'glass', label: 'Glass' },
    { id: 'minimal', label: 'Minimal' },
    { id: 'accent', label: 'Acento' },
    { id: 'floating', label: 'Flutuante' },
  ],
};

export const OVERLAY_THEMES = [
  { id: 'classic', label: 'Clássico' },
  { id: 'ancient', label: 'Antigo' },
  { id: 'tech', label: 'Tech' },
  { id: 'nature', label: 'Natureza' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'mysterious', label: 'Mistério' },
];

export const LOTTIE_ICON_OPTIONS = [
  { id: 'sparkles', label: 'Brilho' },
  { id: 'flame', label: 'Chama' },
  { id: 'earth', label: 'Terra' },
  { id: 'info', label: 'Info' },
  { id: 'gear', label: 'Engrenagem' },
  { id: 'shield', label: 'Escudo' },
  { id: 'crown', label: 'Coroa' },
  { id: 'science', label: 'Ciência' },
  { id: 'history', label: 'História' },
  { id: 'nature', label: 'Natureza' },
  { id: 'money', label: 'Dinheiro' },
  { id: 'warning', label: 'Alerta' },
  { id: 'compass', label: 'Bússola' },
  { id: 'book', label: 'Livro' },
  { id: 'heart', label: 'Coração' },
  { id: 'lightbulb', label: 'Ideia' },
];

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
      ],
    },
  ],
  'bar-chart': [
    { key: 'title', label: 'Título', kind: 'text' },
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
  return ['lower-third', 'info-card', 'source-card', 'counter'].includes(type);
}

export function formatOverlayTime(seconds: number): string {
  const s = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toFixed(1).padStart(4, '0')}`;
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
    return {
      id: o.id || `overlay-${index + 1}`,
      type: o.type || 'lower-third',
      start: o.start ?? 0,
      duration: Number(o.duration) > 0 ? Number(o.duration) : 4,
      scene_ref: o.scene_ref,
      block_ref: o.block_ref,
      props,
    };
  });
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