export type BlockProgressTitleFontId =
  | 'inter'
  | 'oswald'
  | 'playfair'
  | 'jetbrains'
  | 'bebas'
  | 'cinzel';

export const BLOCK_PROGRESS_TITLE_FONTS: {
  id: BlockProgressTitleFontId;
  label: string;
  stack: string;
}[] = [
  { id: 'inter', label: 'Inter (neutro)', stack: 'Inter, sans-serif' },
  { id: 'oswald', label: 'Oswald (impacto)', stack: 'Oswald, sans-serif' },
  { id: 'playfair', label: 'Playfair (editorial)', stack: 'Playfair Display, serif' },
  { id: 'cinzel', label: 'Cinzel (história)', stack: 'Cinzel, serif' },
  { id: 'bebas', label: 'Bebas (títulos)', stack: 'Bebas Neue, sans-serif' },
  { id: 'jetbrains', label: 'JetBrains (tech)', stack: 'JetBrains Mono, monospace' },
];

type VisualPromptLike = { block?: number; narration_text?: string };
type BlockPhraseLike = { block?: number; phrase?: string; text?: string };

export function resolveBlockProgressTitleFontStack(fontId?: string): string {
  const found = BLOCK_PROGRESS_TITLE_FONTS.find((f) => f.id === fontId);
  return found?.stack || BLOCK_PROGRESS_TITLE_FONTS[0].stack;
}

export function collectBlockNarrationsByBlock(
  visualPrompts: VisualPromptLike[] = [],
  blockPhrases: BlockPhraseLike[] = [],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const vp of visualPrompts) {
    const block = Number(vp.block);
    const chunk = String(vp.narration_text || '').trim();
    if (!block || !chunk) continue;
    map.set(block, map.has(block) ? `${map.get(block)} ${chunk}` : chunk);
  }
  for (const bp of blockPhrases) {
    const block = Number(bp.block);
    if (!block || map.has(block)) continue;
    const phrase = String(bp.phrase || bp.text || '').trim();
    if (phrase) map.set(block, phrase);
  }
  return map;
}

/** Resumo curto do bloco — não é o início literal da narração. */
export function suggestBlockTitleHeuristic(narration = ''): string {
  const text = String(narration).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const masParts = text.split(/\s+mas\s+/i);
  const focus = (masParts.length > 1 ? masParts[masParts.length - 1] : text).trim();
  const sentence = focus.split(/[.!?]/)[0].trim();
  const words = sentence
    .replace(/^(o|a|os|as|um|uma|esse|essa|este|esta|o nosso|a nossa)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  let title = words.join(' ');
  if (title.length > 38) {
    title = `${title.slice(0, 36).replace(/\s+\S*$/, '')}…`;
  }
  return title || 'Bloco';
}

function phraseMatchesLabel(label: string, phrase: string): boolean {
  const a = label.toLowerCase().trim().slice(0, 24);
  const b = phrase.toLowerCase().trim().slice(0, 24);
  if (!a || !b) return false;
  return a.startsWith(b) || b.startsWith(a);
}

export function resolveBlockDisplayTitle(
  saved: { title?: string; label?: string } | undefined,
  phraseStart: string,
  fullNarration: string,
  blockNum: number,
): string {
  if (saved?.title?.trim()) return saved.title.trim();
  if (saved?.label?.trim() && !phraseMatchesLabel(saved.label, phraseStart)) {
    return saved.label.trim();
  }
  const fromNarration = suggestBlockTitleHeuristic(fullNarration);
  if (fromNarration && fromNarration !== 'Bloco') return fromNarration;
  return `Bloco ${blockNum}`;
}

export function truncateBlockDisplayTitle(text: string, max = 28): string {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}