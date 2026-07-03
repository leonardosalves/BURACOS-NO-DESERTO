import sparklesLottie from './lottie_assets/sparkles.json';
import flameLottie from './lottie_assets/flame.json';
import globeLottie from './lottie_assets/globe.json';
import infoLottie from './lottie_assets/info.json';
import gearLottie from './lottie_assets/lottie_ui_gear_1.json';
import lockLottie from './lottie_assets/lottie_ui_lock_3.json';
import crownLottie from './lottie_assets/lottie_biz_crown_1.json';
import apiLottie from './lottie_assets/lottie_tech_api_1.json';
import boltLottie from './lottie_assets/lottie_tech_bolt_1.json';
import timeLottie from './lottie_assets/lottie_ui_time_1.json';
import windLottie from './lottie_assets/weather_wind.json';
import moneyLottie from './lottie_assets/lottie_biz_money_1.json';
import warningLottie from './lottie_assets/lottie_ui_warning_1.json';
import locationLottie from './lottie_assets/lottie_life_location_1.json';
import docLottie from './lottie_assets/lottie_tech_document_1.json';
import heartLottie from './lottie_assets/lottie_interact_heart_1.json';
import ideaLottie from './lottie_assets/lottie_life_idea_1.json';
import graphLottie from './lottie_assets/lottie_biz_graph_1.json';
import trophyLottie from './lottie_assets/lottie_biz_trophy_1.json';
import targetLottie from './lottie_assets/lottie_biz_target_1.json';
import giftLottie from './lottie_assets/lottie_biz_gift_1.json';
import coinLottie from './lottie_assets/lottie_biz_coin_1.json';
import walletLottie from './lottie_assets/lottie_biz_wallet_1.json';
import shopLottie from './lottie_assets/lottie_biz_shop_1.json';
import deliveryLottie from './lottie_assets/lottie_biz_delivery_1.json';
import wifiLottie from './lottie_assets/lottie_tech_wifi_1.json';
import mobileLottie from './lottie_assets/lottie_tech_mobile_1.json';
import videoLottie from './lottie_assets/lottie_tech_video_1.json';
import serverLottie from './lottie_assets/lottie_tech_server_1.json';
import lightningLottie from './lottie_assets/lottie_tech_lightning_2.json';
import lifeGlobeLottie from './lottie_assets/lottie_life_globe_1.json';
import mapLottie from './lottie_assets/lottie_life_map_1.json';
import planeLottie from './lottie_assets/lottie_life_plane_1.json';
import skullLottie from './lottie_assets/lottie_life_skull_1.json';
import sunLottie from './lottie_assets/weather_clear_day.json';
import rainLottie from './lottie_assets/weather_rain.json';
import snowLottie from './lottie_assets/weather_snow.json';
import stormLottie from './lottie_assets/weather_thunderstorms.json';
import likeLottie from './lottie_assets/lottie_interact_like_1.json';
import starLottie from './lottie_assets/lottie_interact_star_1.json';
import shareLottie from './lottie_assets/lottie_interact_share_1.json';
import messageLottie from './lottie_assets/lottie_interact_message_1.json';
import mailLottie from './lottie_assets/lottie_interact_mail_1.json';
import phoneLottie from './lottie_assets/lottie_interact_phone_1.json';
import rocketLottie from './lottie_assets/lottie_nature_rocket_1.json';
import bookmarkLottie from './lottie_assets/lottie_interact_bookmark_1.json';
import bellLottie from './lottie_assets/lottie_interact_bell_4.json';

export const overlayLottieMap: Record<string, object> = {
  sparkles: sparklesLottie,
  flame: flameLottie,
  earth: globeLottie,
  building: globeLottie,
  globe: lifeGlobeLottie,
  info: infoLottie,
  gear: gearLottie,
  shield: lockLottie,
  crown: crownLottie,
  science: boltLottie,
  history: timeLottie,
  nature: windLottie,
  money: moneyLottie,
  warning: warningLottie,
  compass: locationLottie,
  book: docLottie,
  heart: heartLottie,
  lightbulb: ideaLottie,
  graph: graphLottie,
  trophy: trophyLottie,
  target: targetLottie,
  gift: giftLottie,
  coin: coinLottie,
  wallet: walletLottie,
  shop: shopLottie,
  delivery: deliveryLottie,
  api: apiLottie,
  wifi: wifiLottie,
  mobile: mobileLottie,
  video: videoLottie,
  server: serverLottie,
  lightning: lightningLottie,
  map: mapLottie,
  plane: planeLottie,
  skull: skullLottie,
  sun: sunLottie,
  rain: rainLottie,
  snow: snowLottie,
  storm: stormLottie,
  like: likeLottie,
  star: starLottie,
  share: shareLottie,
  message: messageLottie,
  mail: mailLottie,
  phone: phoneLottie,
  rocket: rocketLottie,
  bookmark: bookmarkLottie,
  bell: bellLottie,
};

export function resolveOverlayIconStyle(props: { iconStyle?: string; iconRender?: string } = {}): 'lottie' | 'svg' {
  const raw = String(props.iconStyle || props.iconRender || 'lottie');
  return raw === 'svg' ? 'svg' : 'lottie';
}

export function pickLottieData(
  iconType?: string,
  iconStyle?: 'lottie' | 'svg',
): object | null {
  if (!iconType || iconStyle === 'svg') return null;
  return overlayLottieMap[iconType] || null;
}