export const YOUTUBE_VIEWS_THRESHOLD_KEY = 'lumiera_youtube_views_threshold';

export function getYoutubeViewsThreshold(): number {
  try {
    const value = Number(localStorage.getItem(YOUTUBE_VIEWS_THRESHOLD_KEY));
    if (Number.isFinite(value) && value > 0) {
      return Math.min(Math.round(value), 100000);
    }
  } catch {
    // ignore
  }
  return 100;
}

export function setYoutubeViewsThreshold(value: number): number {
  const normalized = Math.min(Math.max(Math.round(Number(value) || 100), 1), 100000);
  try {
    localStorage.setItem(YOUTUBE_VIEWS_THRESHOLD_KEY, String(normalized));
  } catch {
    // ignore
  }
  return normalized;
}