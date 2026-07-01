/**
 * Resolve o termo de busca de stock/B-roll por cena (UI Creator).
 * Prioridade: stock_query/visual_hook → prompt visual → narração.
 * Nunca usa título principal do projeto.
 */

const GENERIC_QUERIES = new Set([
  'cinematic',
  'documentary',
  'documentary scene',
  'video',
  'image',
]);

function normalizeComparable(text = ''): string {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectRejectTitles(options: {
  projectTitle?: string;
  strategyTitle?: string;
  rejectTitles?: string[];
} = {}): string[] {
  const titles = [
    options.projectTitle,
    options.strategyTitle,
    ...(options.rejectTitles || []),
  ]
    .map((t) => String(t || '').trim())
    .filter(Boolean);
  return [...new Set(titles)];
}

export function looksLikeProjectTitle(query = '', rejectTitles: string[] = []): boolean {
  const q = normalizeComparable(query);
  if (!q || q.length < 10) return false;

  for (const title of rejectTitles) {
    const t = normalizeComparable(title);
    if (!t || t.length < 10) continue;
    if (q === t) return true;
    if (q.includes(t) || t.includes(q)) return true;
  }

  const wordCount = q.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 7 && /[àáâãéêíóôõúç]/i.test(query)) return true;

  return false;
}

export function extractStockQueryFromPrompt(prompt = ''): string {
  const raw = String(prompt || '').trim();
  if (!raw) return '';

  const cleaned = raw
    .replace(/^(photorealistic|hyperrealistic|cinematic|documentary|2k|4k|8k)[\s,:-]+/gi, '')
    .replace(/\b(no text|sharp detail|dramatic lighting|documentary style|style)[^.]*\.?/gi, '')
    .replace(/\b(related to|illustrating|showing|depicting)\s*:?\s*/gi, '')
    .trim();

  const clause = cleaned.split(/[.!?]/)[0].trim();
  const words = clause
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, ''))
    .filter((w) => w.length > 2 && !/^(the|and|with|for|from|into|over|under|scene|image|video)$/i.test(w))
    .slice(0, 8);

  return words.join(' ').slice(0, 80);
}

export function extractStockQueryFromNarration(narration = ''): string {
  const text = String(narration || '').trim();
  if (text.length < 12) return '';

  const words = text
    .replace(/[^\w\sà-úÀ-Ú]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 6);

  return words.join(' ').slice(0, 80);
}

export function resolveStockSearchQuery(
  vp: Record<string, unknown> = {},
  options: {
    projectTitle?: string;
    strategyTitle?: string;
    rejectTitles?: string[];
  } = {},
): string {
  const rejectTitles = collectRejectTitles(options);

  const directCandidates = [
    vp.stock_query,
    vp.stockQuery,
    vp.visual_hook,
    vp.visualHook,
    vp.busca_termo,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);

  for (const candidate of directCandidates) {
    const lower = candidate.toLowerCase();
    if (GENERIC_QUERIES.has(lower)) continue;
    if (looksLikeProjectTitle(candidate, rejectTitles)) continue;
    return candidate.slice(0, 80);
  }

  const promptSources = [
    vp.prompt,
    vp.visual_prompt,
    vp.image_prompt,
    vp.prompt_visual,
  ];
  for (const prompt of promptSources) {
    const fromPrompt = extractStockQueryFromPrompt(String(prompt || ''));
    if (fromPrompt.length >= 6 && !looksLikeProjectTitle(fromPrompt, rejectTitles)) {
      return fromPrompt;
    }
  }

  const fromNarration = extractStockQueryFromNarration(
    String(vp.narration_text || vp.narration_excerpt || vp.narracao || ''),
  );
  if (fromNarration.length >= 8 && !looksLikeProjectTitle(fromNarration, rejectTitles)) {
    return fromNarration;
  }

  return 'cinematic documentary';
}