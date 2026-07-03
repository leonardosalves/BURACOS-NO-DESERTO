import type { BlockProgressMarkerDraft } from './BlockProgressBarEditor';
import { LOTTIE_FILE_BY_ID } from './overlayIconCatalog';

const ICON_RULES: { re: RegExp; icon: string }[] = [
  { re: /foguete|rocket|propulsão|propulsao|lançamento|lancamento|starship/i, icon: 'rocket' },
  { re: /espaço|espacial|nasa|órbita|orbita|satélite|satelite|lua|marte|cosmos/i, icon: 'science' },
  { re: /inteligência artificial|\bia\b|machine learning|algoritmo|software|tech|digital|cyber/i, icon: 'gear' },
  { re: /dinheiro|economia|invest|financ|dólar|dolar|mercado|bilhão|bilhao|milhão|milhao/i, icon: 'money' },
  { re: /históri|histori|antig|século|seculo|império|imperio|guerra|batalha|espada|conflito/i, icon: 'history' },
  { re: /combate|luta|duelo|medieval/i, icon: 'swords' },
  { re: /natureza|floresta|oceano|animal|planeta|terra|clima/i, icon: 'nature' },
  { re: /geograf|mapa|país|pais|cidade|continente|viagem/i, icon: 'compass' },
  { re: /militar|defesa|tanque|míssil|missil|exército|exercito/i, icon: 'shield' },
  { re: /energia|elétric|eletric|nuclear|solar|petróleo|petroleo/i, icon: 'lightning' },
  { re: /avião|aviao|aéreo|aereo|transporte|carro|veículo|veiculo/i, icon: 'plane' },
  { re: /mistério|misterio|segredo|conspira|desaparec/i, icon: 'warning' },
  { re: /livro|educa|estudo|universidade|ciência|ciencia/i, icon: 'book' },
  { re: /social|viral|internet|rede|comunidade|público|publico|audiência|audiencia/i, icon: 'users' },
  { re: /dado|estatíst|estatist|gráfico|grafico|percentual|tendência|tendencia/i, icon: 'chart' },
  { re: /tempo|cronolog|relógio|relogio|prazo|deadline/i, icon: 'clock' },
  { re: /notifica|alerta sonoro|campainha/i, icon: 'bell' },
  { re: /favorito|salvar|marcador/i, icon: 'bookmark' },
];

export const SVG_ONLY_BLOCK_PROGRESS_ICONS = new Set([
  'swords', 'bolt', 'rocket', 'chart', 'users', 'clock',
]);

export const ALLOWED_BLOCK_PROGRESS_ICONS = [
  'sparkles', 'flame', 'earth', 'building', 'globe', 'info', 'gear', 'shield', 'crown',
  'science', 'history', 'nature', 'money', 'warning', 'compass', 'book', 'heart',
  'lightbulb', 'graph', 'chart', 'trophy', 'target', 'gift', 'coin', 'wallet', 'shop',
  'delivery', 'api', 'wifi', 'mobile', 'video', 'server', 'lightning', 'bolt', 'map',
  'plane', 'rocket', 'skull', 'sun', 'rain', 'snow', 'storm', 'like', 'star', 'share',
  'message', 'mail', 'phone', 'swords', 'users', 'clock', 'bookmark', 'bell',
];

const SVG_VISUAL_GROUP: Record<string, string> = {
  earth: 'earth-globe',
  building: 'earth-globe',
  globe: 'earth-globe',
  money: 'coin',
  coin: 'coin',
  bolt: 'bolt',
  lightning: 'bolt',
  history: 'hourglass',
  clock: 'hourglass',
  chart: 'chart',
  graph: 'chart',
};

function normalizeAiIconId(raw: unknown): string | null {
  const id = String(raw || '').trim().toLowerCase();
  if (id === 'building') return 'earth';
  if (ALLOWED_BLOCK_PROGRESS_ICONS.includes(id)) return id;
  if (id === 'atom') return 'science';
  if (id === 'people' || id === 'user') return 'users';
  return null;
}

function resolveIconStyleForType(iconType: string, preferred?: string): 'lottie' | 'svg' {
  if (SVG_ONLY_BLOCK_PROGRESS_ICONS.has(iconType)) return 'svg';
  return preferred === 'svg' ? 'svg' : 'lottie';
}

export function resolveIconVisualKey(iconType: string, iconStyle: 'lottie' | 'svg' = 'lottie'): string {
  const id = String(iconType || 'info').toLowerCase();
  if (iconStyle === 'svg') {
    return `svg:${SVG_VISUAL_GROUP[id] || id}`;
  }
  const file = LOTTIE_FILE_BY_ID[id];
  return file ? `lottie:${file}` : `lottie:id:${id}`;
}

function isIconSlotAvailable(
  iconType: string,
  iconStyle: 'lottie' | 'svg',
  usedIds: Set<string>,
  usedVisuals: Set<string>,
): boolean {
  const id = String(iconType || '').toLowerCase();
  if (!ALLOWED_BLOCK_PROGRESS_ICONS.includes(id)) return false;
  const style = resolveIconStyleForType(id, iconStyle);
  const visual = resolveIconVisualKey(id, style);
  return !usedIds.has(id) && !usedVisuals.has(visual);
}

function buildCandidateIconIds(marker: BlockProgressMarkerDraft, niche: string, preferredId?: string) {
  const text = `${niche} ${marker.title || marker.label || ''}`.toLowerCase();
  const candidates: string[] = [];
  const push = (id: string) => {
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

function pickUniqueIconForMarker(
  marker: BlockProgressMarkerDraft,
  niche: string,
  idx: number,
  usedIds: Set<string>,
  usedVisuals: Set<string>,
) {
  const preferred = normalizeAiIconId(marker.iconType)
    || String(marker.iconType || '').toLowerCase();
  const candidates = buildCandidateIconIds(marker, niche, preferred);
  const styleCandidates = (candId: string): Array<'lottie' | 'svg'> => {
    const styles: Array<'lottie' | 'svg'> = [resolveIconStyleForType(candId, marker.iconStyle)];
    if (candId !== preferred) styles.push('svg');
    if (!styles.includes('lottie')) styles.push('lottie');
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

  return { iconType: 'info', iconStyle: 'lottie' as const, adjusted: preferred !== 'info' };
}

export function suggestBlockProgressIcon(narration = '', niche = '', exclude = new Set<string>()): string {
  const text = `${niche} ${narration}`.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.re.test(text) && !exclude.has(rule.icon)) return rule.icon;
  }
  for (const icon of ALLOWED_BLOCK_PROGRESS_ICONS) {
    if (!exclude.has(icon)) return icon;
  }
  return 'info';
}

export function dedupeBlockProgressIcons(
  markers: BlockProgressMarkerDraft[],
  { niche = 'Geral' }: { niche?: string } = {},
): BlockProgressMarkerDraft[] {
  const usedIds = new Set<string>();
  const usedVisuals = new Set<string>();

  return markers.map((marker, idx) => {
    const pick = pickUniqueIconForMarker(marker, niche, idx, usedIds, usedVisuals);
    usedIds.add(pick.iconType);
    usedVisuals.add(resolveIconVisualKey(pick.iconType, pick.iconStyle));

    const next: BlockProgressMarkerDraft = {
      ...marker,
      iconType: pick.iconType,
      iconStyle: pick.iconStyle,
    };
    if (pick.adjusted) {
      next.aiReason = marker.aiReason
        ? `${marker.aiReason} · ícone único na barra`
        : 'Ícone ajustado para não repetir na barra';
    }
    return next;
  });
}

export function swapBlockProgressIcons(
  markers: BlockProgressMarkerDraft[],
  blockA: number,
  blockB: number,
): BlockProgressMarkerDraft[] {
  const swapped = markers.map((m) => {
    if (m.block === blockA) {
      const b = markers.find((x) => x.block === blockB);
      if (!b) return m;
      return { ...m, iconType: b.iconType, iconStyle: b.iconStyle, aiReason: undefined };
    }
    if (m.block === blockB) {
      const a = markers.find((x) => x.block === blockA);
      if (!a) return m;
      return { ...m, iconType: a.iconType, iconStyle: a.iconStyle, aiReason: undefined };
    }
    return m;
  });
  return dedupeBlockProgressIcons(swapped, { niche: 'Geral' });
}

export function collectUsedIconVisualKeys(
  markers: BlockProgressMarkerDraft[],
  excludeBlock?: number,
): string[] {
  return markers
    .filter((m) => m.block !== excludeBlock)
    .map((m) => resolveIconVisualKey(m.iconType, m.iconStyle || 'lottie'));
}