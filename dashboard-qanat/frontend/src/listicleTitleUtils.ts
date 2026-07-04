export const TITLE_WARN_CHARS = 60;

export function warnLongListicleTitles(titles: string[], limit = TITLE_WARN_CHARS) {
  return titles
    .map((title, index) => ({ title: title.trim(), index }))
    .filter((entry) => entry.title.length > limit);
}