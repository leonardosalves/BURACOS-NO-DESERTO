export type OverlayIconStyle = 'lottie' | 'svg';

export type OverlayIconDef = {
  id: string;
  label: string;
  category: string;
  lottieFile?: string;
  svgOnly?: boolean;
};

/** Ícones Lottie (arquivo em remotion-renderer/overlays/lottie_assets) */
export const LOTTIE_ICON_CATALOG: OverlayIconDef[] = [
  { id: 'sparkles', label: 'Brilho', category: 'Geral', lottieFile: 'sparkles.json' },
  { id: 'flame', label: 'Chama', category: 'Geral', lottieFile: 'flame.json' },
  { id: 'info', label: 'Info', category: 'Geral', lottieFile: 'info.json' },
  { id: 'earth', label: 'Terra', category: 'Geografia', lottieFile: 'globe.json' },
  { id: 'building', label: 'Edifício', category: 'Geografia', lottieFile: 'lottie_edu_pillar_1.json' },
  { id: 'gear', label: 'Engrenagem', category: 'Tech', lottieFile: 'lottie_ui_gear_1.json' },
  { id: 'shield', label: 'Escudo', category: 'Geral', lottieFile: 'lottie_edu_shield_1.json' },
  { id: 'crown', label: 'Coroa', category: 'Negócios', lottieFile: 'lottie_biz_crown_1.json' },
  { id: 'science', label: 'Ciência', category: 'Tech', lottieFile: 'lottie_tech_dna_1.json' },
  { id: 'history', label: 'História', category: 'História', lottieFile: 'lottie_edu_scroll_1.json' },
  { id: 'nature', label: 'Natureza', category: 'Natureza', lottieFile: 'lottie_nature_leaf_1.json' },
  { id: 'money', label: 'Dinheiro', category: 'Negócios', lottieFile: 'lottie_biz_money_1.json' },
  { id: 'warning', label: 'Alerta', category: 'Geral', lottieFile: 'lottie_ui_warning_1.json' },
  { id: 'compass', label: 'Bússola', category: 'Geografia', lottieFile: 'lottie_life_location_1.json' },
  { id: 'book', label: 'Livro', category: 'História', lottieFile: 'lottie_edu_book_1.json' },
  { id: 'heart', label: 'Coração', category: 'Social', lottieFile: 'lottie_interact_heart_1.json' },
  { id: 'lightbulb', label: 'Ideia', category: 'Geral', lottieFile: 'lottie_life_idea_1.json' },
  { id: 'graph', label: 'Gráfico', category: 'Negócios', lottieFile: 'lottie_biz_graph_1.json' },
  { id: 'trophy', label: 'Troféu', category: 'Negócios', lottieFile: 'lottie_biz_trophy_1.json' },
  { id: 'target', label: 'Alvo', category: 'Negócios', lottieFile: 'lottie_biz_target_1.json' },
  { id: 'gift', label: 'Presente', category: 'Negócios', lottieFile: 'lottie_biz_gift_1.json' },
  { id: 'coin', label: 'Moeda', category: 'Negócios', lottieFile: 'lottie_biz_coin_1.json' },
  { id: 'wallet', label: 'Carteira', category: 'Negócios', lottieFile: 'lottie_biz_wallet_1.json' },
  { id: 'shop', label: 'Loja', category: 'Negócios', lottieFile: 'lottie_biz_shop_1.json' },
  { id: 'delivery', label: 'Entrega', category: 'Negócios', lottieFile: 'lottie_biz_truck_1.json' },
  { id: 'api', label: 'API', category: 'Tech', lottieFile: 'lottie_tech_api_1.json' },
  { id: 'wifi', label: 'Wi-Fi', category: 'Tech', lottieFile: 'lottie_tech_wifi_1.json' },
  { id: 'mobile', label: 'Celular', category: 'Tech', lottieFile: 'lottie_tech_mobile_1.json' },
  { id: 'video', label: 'Vídeo', category: 'Tech', lottieFile: 'lottie_tech_video_1.json' },
  { id: 'server', label: 'Servidor', category: 'Tech', lottieFile: 'lottie_tech_server_1.json' },
  { id: 'lightning', label: 'Raio', category: 'Tech', lottieFile: 'lottie_tech_lightning_2.json' },
  { id: 'globe', label: 'Globo', category: 'Geografia', lottieFile: 'lottie_life_globe_1.json' },
  { id: 'map', label: 'Mapa', category: 'Geografia', lottieFile: 'lottie_life_map_1.json' },
  { id: 'plane', label: 'Avião', category: 'Geografia', lottieFile: 'lottie_life_plane_1.json' },
  { id: 'skull', label: 'Caveira', category: 'Mistério', lottieFile: 'lottie_life_skull_1.json' },
  { id: 'sun', label: 'Sol', category: 'Clima', lottieFile: 'weather_clear_day.json' },
  { id: 'rain', label: 'Chuva', category: 'Clima', lottieFile: 'weather_rain.json' },
  { id: 'snow', label: 'Neve', category: 'Clima', lottieFile: 'weather_snow.json' },
  { id: 'storm', label: 'Tempestade', category: 'Clima', lottieFile: 'weather_thunderstorms.json' },
  { id: 'like', label: 'Curtida', category: 'Social', lottieFile: 'lottie_interact_like_1.json' },
  { id: 'star', label: 'Estrela', category: 'Social', lottieFile: 'lottie_interact_star_1.json' },
  { id: 'share', label: 'Compartilhar', category: 'Social', lottieFile: 'lottie_interact_share_1.json' },
  { id: 'message', label: 'Mensagem', category: 'Social', lottieFile: 'lottie_interact_message_1.json' },
  { id: 'mail', label: 'E-mail', category: 'Social', lottieFile: 'lottie_interact_mail_1.json' },
  { id: 'phone', label: 'Telefone', category: 'Social', lottieFile: 'lottie_interact_phone_1.json' },
  { id: 'rocket', label: 'Foguete', category: 'Espaço', lottieFile: 'lottie_nature_rocket_1.json' },
  { id: 'bookmark', label: 'Marcador', category: 'Social', lottieFile: 'lottie_interact_bookmark_1.json' },
  { id: 'bell', label: 'Sino', category: 'Social', lottieFile: 'lottie_interact_bell_4.json' },
];

/** SVG animado — mesmo catálogo do Lottie + extras só-SVG */
const SVG_ONLY_EXTRAS: OverlayIconDef[] = [
  { id: 'swords', label: 'Espadas', category: 'História', svgOnly: true },
  { id: 'bolt', label: 'Raio (SVG)', category: 'Tech', svgOnly: true },
  { id: 'chart', label: 'Gráfico (SVG)', category: 'Negócios', svgOnly: true },
  { id: 'users', label: 'Pessoas', category: 'Social', svgOnly: true },
  { id: 'clock', label: 'Relógio', category: 'Geral', svgOnly: true },
];

export const SVG_ICON_CATALOG: OverlayIconDef[] = [
  ...LOTTIE_ICON_CATALOG.map(({ id, label, category }) => ({
    id,
    label,
    category,
    svgOnly: true as const,
  })),
  ...SVG_ONLY_EXTRAS.filter((extra) => !LOTTIE_ICON_CATALOG.some((i) => i.id === extra.id)),
];

export const LOTTIE_FILE_BY_ID = Object.fromEntries(
  LOTTIE_ICON_CATALOG
    .filter((i) => i.lottieFile)
    .map((i) => [i.id, i.lottieFile!]),
) as Record<string, string>;

/** @deprecated use LOTTIE_ICON_CATALOG */
export const LOTTIE_ICON_OPTIONS = LOTTIE_ICON_CATALOG.map((i) => ({
  id: i.id,
  label: i.label,
}));

export function lottieFileForIcon(id: string): string | undefined {
  return LOTTIE_FILE_BY_ID[id];
}

export function iconLabel(id: string, style: OverlayIconStyle = 'lottie'): string {
  const list = style === 'svg' ? SVG_ICON_CATALOG : LOTTIE_ICON_CATALOG;
  return list.find((i) => i.id === id)?.label || id;
}

export function resolveIconStyle(props: Record<string, unknown>): OverlayIconStyle {
  const raw = String(props.iconStyle || props.iconRender || 'lottie');
  return raw === 'svg' ? 'svg' : 'lottie';
}