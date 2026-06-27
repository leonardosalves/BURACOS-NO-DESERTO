import sparklesLottie from "./lottie_assets/sparkles.json";
import flameLottie from "./lottie_assets/flame.json";
import globeLottie from "./lottie_assets/globe.json";
import infoLottie from "./lottie_assets/info.json";
import gearLottie from "./lottie_assets/lottie_ui_gear_1.json";
import lockLottie from "./lottie_assets/lottie_ui_lock_3.json";
import crownLottie from "./lottie_assets/lottie_biz_crown_1.json";
import boltLottie from "./lottie_assets/lottie_tech_bolt_1.json";
import timeLottie from "./lottie_assets/lottie_ui_time_1.json";
import windLottie from "./lottie_assets/weather_wind.json";
import moneyLottie from "./lottie_assets/lottie_biz_money_1.json";
import warningLottie from "./lottie_assets/lottie_ui_warning_1.json";
import locationLottie from "./lottie_assets/lottie_life_location_1.json";
import docLottie from "./lottie_assets/lottie_tech_document_1.json";
import heartLottie from "./lottie_assets/lottie_interact_heart_1.json";
import ideaLottie from "./lottie_assets/lottie_life_idea_1.json";
import chartLottie from "./lottie_assets/lottie_biz_chart_1.json";
import coinLottie from "./lottie_assets/lottie_biz_coin_1.json";
import analyticsLottie from "./lottie_assets/lottie_biz_analytics_1.json";
import awardLottie from "./lottie_assets/lottie_biz_award_2.json";
import targetLottie from "./lottie_assets/lottie_biz_target_2.json";
import lifeGlobeLottie from "./lottie_assets/lottie_life_globe_1.json";
import mapLottie from "./lottie_assets/lottie_life_map_1.json";
import pinLottie from "./lottie_assets/lottie_life_pin_1.json";
import eduBookLottie from "./lottie_assets/lottie_edu_book_1.json";
import eduShieldLottie from "./lottie_assets/lottie_edu_shield_1.json";
import starLottie from "./lottie_assets/lottie_interact_star_1.json";
import checkLottie from "./lottie_assets/lottie_ui_check_1.json";
import calendarLottie from "./lottie_assets/lottie_ui_calendar_1.json";
import codeLottie from "./lottie_assets/lottie_tech_code_1.json";
import playLottie from "./lottie_assets/lottie_arrow_play_1.json";
import shareLottie from "./lottie_assets/lottie_interact_share_1.json";
import messageLottie from "./lottie_assets/lottie_interact_message_1.json";
import bellLottie from "./lottie_assets/lottie_interact_bell_1.json";

export const LOTTIE_ICON_TYPES = [
  "sparkles", "flame", "earth", "globe", "info", "gear", "shield", "crown",
  "science", "history", "nature", "money", "warning", "compass", "book",
  "heart", "lightbulb", "building", "chart", "coin", "analytics", "award",
  "target", "check", "calendar", "bolt", "code", "play", "share", "message",
  "bell", "map", "pin", "star",
] as const;

export type LottieIconType = typeof LOTTIE_ICON_TYPES[number];

export const lottieMap: Record<string, object> = {
  sparkles: sparklesLottie,
  flame: flameLottie,
  earth: globeLottie,
  globe: lifeGlobeLottie,
  building: globeLottie,
  info: infoLottie,
  gear: gearLottie,
  shield: eduShieldLottie,
  crown: crownLottie,
  science: boltLottie,
  history: timeLottie,
  nature: windLottie,
  money: moneyLottie,
  warning: warningLottie,
  compass: locationLottie,
  book: eduBookLottie,
  heart: heartLottie,
  lightbulb: ideaLottie,
  chart: chartLottie,
  coin: coinLottie,
  analytics: analyticsLottie,
  award: awardLottie,
  target: targetLottie,
  check: checkLottie,
  calendar: calendarLottie,
  bolt: boltLottie,
  code: codeLottie,
  play: playLottie,
  share: shareLottie,
  message: messageLottie,
  bell: bellLottie,
  map: mapLottie,
  pin: pinLottie,
  star: starLottie,
  // legacy aliases
  api: boltLottie,
  document: docLottie,
};

export function resolveLottieData(iconType?: string): object | null {
  if (!iconType) return null;
  return lottieMap[iconType] || lottieMap.info || null;
}