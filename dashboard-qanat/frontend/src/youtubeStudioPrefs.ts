export const YOUTUBE_VIEWS_THRESHOLD_KEY = 'lumiera_youtube_views_threshold';
export const YOUTUBE_POLL_INTERVAL_KEY = 'lumiera_youtube_poll_minutes';
export const YOUTUBE_NOTIFICATIONS_KEY = 'lumiera_youtube_notifications';

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

export function getYoutubePollIntervalMinutes(): number {
  try {
    const value = Number(localStorage.getItem(YOUTUBE_POLL_INTERVAL_KEY));
    if ([5, 20, 60].includes(value)) return value;
  } catch {
    // ignore
  }
  return 20;
}

export function setYoutubePollIntervalMinutes(value: number): number {
  const normalized = [5, 20, 60].includes(value) ? value : 20;
  try {
    localStorage.setItem(YOUTUBE_POLL_INTERVAL_KEY, String(normalized));
    window.dispatchEvent(new CustomEvent('lumiera-youtube-poll-change'));
  } catch {
    // ignore
  }
  return normalized;
}

export function getYoutubePollIntervalMs(): number {
  return getYoutubePollIntervalMinutes() * 60 * 1000;
}

export function getYoutubeNotificationsEnabled(): boolean {
  try {
    return localStorage.getItem(YOUTUBE_NOTIFICATIONS_KEY) === '1';
  } catch {
    return false;
  }
}

export function setYoutubeNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(YOUTUBE_NOTIFICATIONS_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

export async function requestYoutubeNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}