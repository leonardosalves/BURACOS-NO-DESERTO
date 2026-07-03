import type { BlockProgressMarkerDraft } from './BlockProgressBarEditor';

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

function pickUnusedIconForMarker(
  marker: BlockProgressMarkerDraft,
  used: Set<string>,
  niche: string,
  idx: number,
): string {
  const text = `${niche} ${marker.title || marker.label || ''}`.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.re.test(text) && !used.has(rule.icon)) return rule.icon;
  }
  const pool = ALLOWED_BLOCK_PROGRESS_ICONS.filter((icon) => !used.has(icon));
  if (!pool.length) return marker.iconType || 'info';
  return pool[idx % pool.length];
}

export function dedupeBlockProgressIcons(
  markers: BlockProgressMarkerDraft[],
  { niche = 'Geral' }: { niche?: string } = {},
): BlockProgressMarkerDraft[] {
  const used = new Set<string>();
  return markers.map((marker, idx) => {
    let iconType = String(marker.iconType || 'info').toLowerCase();
    if (!ALLOWED_BLOCK_PROGRESS_ICONS.includes(iconType)) iconType = 'info';

    let adjusted = false;
    if (used.has(iconType)) {
      const alt = pickUnusedIconForMarker(marker, used, niche, idx);
      if (alt && alt !== iconType) {
        iconType = alt;
        adjusted = true;
      }
    }
    used.add(iconType);

    let iconStyle = marker.iconStyle === 'svg' ? 'svg' : 'lottie';
    if (SVG_ONLY_BLOCK_PROGRESS_ICONS.has(iconType)) iconStyle = 'svg';

    const next: BlockProgressMarkerDraft = { ...marker, iconType, iconStyle };
    if (adjusted) {
      next.aiReason = marker.aiReason
        ? `${marker.aiReason} · ícone alternado (sem repetir na barra)`
        : 'Ícone alternado para evitar repetição na barra';
    }
    return next;
  });
}

export function swapBlockProgressIcons(
  markers: BlockProgressMarkerDraft[],
  blockA: number,
  blockB: number,
): BlockProgressMarkerDraft[] {
  const a = markers.find((m) => m.block === blockA);
  const b = markers.find((m) => m.block === blockB);
  if (!a || !b) return markers;
  return markers.map((m) => {
    if (m.block === blockA) {
      return { ...m, iconType: b.iconType, iconStyle: b.iconStyle, aiReason: undefined };
    }
    if (m.block === blockB) {
      return { ...m, iconType: a.iconType, iconStyle: a.iconStyle, aiReason: undefined };
    }
    return m;
  });
}