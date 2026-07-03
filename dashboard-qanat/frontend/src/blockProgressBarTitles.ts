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

type ListItemLike = { block?: number; rank?: number; title?: string; name?: string };
type StoryboardLike = {
  list_items?: ListItemLike[];
  listicle?: { content_mode?: string; rank_count?: number; rank_order?: string };
  visual_prompts?: VisualPromptLike[];
};

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

export function isListicleProject(
  config: Record<string, unknown> = {},
  storyboard?: StoryboardLike | null,
): boolean {
  if (config.content_mode === 'LISTICLE') return true;
  if (storyboard?.listicle?.content_mode === 'LISTICLE') return true;
  const rank = Number(config.rank_count || storyboard?.listicle?.rank_count);
  if (Number.isFinite(rank) && rank >= 3) return true;
  if ((storyboard?.list_items?.length ?? 0) >= 3) return true;
  return false;
}

export function parseChapterTimestampSeconds(ts: string): number {
  const parts = String(ts || '').trim().split(':').map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

export function cleanChapterTitle(title: string): string {
  return String(title || '')
    .trim()
    .replace(/^#\d+\s+/, '')
    .replace(/^introdução$/i, 'Introdução')
    .replace(/^recap\s*\+\s*cta$/i, 'Recap + CTA');
}

export function parseYoutubeChaptersText(chaptersText = ''): { time: string; title: string; seconds: number }[] {
  return String(chaptersText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+)$/);
      if (!match) return null;
      const time = match[1];
      const title = cleanChapterTitle(match[2]);
      return { time, title, seconds: parseChapterTimestampSeconds(time) };
    })
    .filter((row): row is { time: string; title: string; seconds: number } => Boolean(row?.title));
}

export function resolveListicleTitlesByBlock(
  storyboard: StoryboardLike | null | undefined,
  config: Record<string, unknown> = {},
): Map<number, string> {
  const map = new Map<number, string>();
  const items = Array.isArray(storyboard?.list_items) ? storyboard.list_items : [];
  const rankCount = Number(config.rank_count || storyboard?.listicle?.rank_count || items.length || 0);
  const rankOrder = String(config.rank_order || storyboard?.listicle?.rank_order || 'desc');

  for (const item of items) {
    const block = Number(item.block);
    const title = String(item.title || item.name || '').trim();
    if (block > 0 && title) map.set(block, title);
  }

  if (map.size < rankCount && items.length) {
    const sorted = [...items].sort((a, b) => Number(a.rank) - Number(b.rank));
    sorted.forEach((item, idx) => {
      const title = String(item.title || item.name || '').trim();
      if (!title) return;
      let block = Number(item.block);
      if (!block) {
        const rank = Number(item.rank);
        if (rankOrder === 'desc' && rankCount > 0) {
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

export function resolveBlockTitlesFromChapters(
  chaptersText: string,
  blockStarts: number[] = [],
): string[] {
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
  chaptersText = '',
  blockStarts = [],
  storyboard,
  config = {},
}: {
  chaptersText?: string;
  blockStarts?: number[];
  storyboard?: StoryboardLike | null;
  config?: Record<string, unknown>;
}): Map<number, string> {
  const result = new Map<number, string>();
  const listicle = isListicleProject(config, storyboard);

  if (listicle) {
    const listicleTitles = resolveListicleTitlesByBlock(storyboard, config);
    listicleTitles.forEach((title, block) => result.set(block, title));
  }

  if (chaptersText.trim()) {
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

export function resolveBlockDisplayTitle(
  saved: { title?: string; label?: string } | undefined,
  metadataTitle: string | undefined,
  blockNum: number,
): string {
  if (saved?.title?.trim()) return saved.title.trim();
  if (metadataTitle?.trim()) return metadataTitle.trim();
  if (saved?.label?.trim()) return saved.label.trim();
  return `Bloco ${blockNum}`;
}

export function truncateBlockDisplayTitle(text: string, max = 28): string {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}