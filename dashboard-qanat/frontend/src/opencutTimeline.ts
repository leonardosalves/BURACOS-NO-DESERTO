/** Helpers inspirados em OpenCut v0.3.0 — timeline Lumiera */

export const CANVAS_BG_PRESETS = [
  { id: 'dark', label: 'Escuro (padrão)', color: '#050506' },
  { id: 'black', label: 'Preto', color: '#000000' },
  { id: 'charcoal', label: 'Carvão', color: '#1a1a1e' },
  { id: 'navy', label: 'Azul noturno', color: '#0a1628' },
  { id: 'white', label: 'Branco', color: '#ffffff' },
] as const;

export function clipKey(blockKey: string, index: number) {
  return `${blockKey}:${index}`;
}

export function parseClipKey(key: string): { blockKey: string; index: number } | null {
  const m = /^(\d+):(\d+)$/.exec(key);
  if (!m) return null;
  return { blockKey: m[1], index: Number(m[2]) };
}

/** Aceita Whisper JSON (array de segmentos) ou { segments: [...] } */
export function normalizeImportedTranscript(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { segments?: unknown[] }).segments)) {
    return (raw as { segments: unknown[] }).segments;
  }
  return null;
}

export function clampVolume(v: unknown, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function clampPlaybackRate(v: unknown, fallback = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(2, Math.max(0.25, Math.round(n * 100) / 100));
}