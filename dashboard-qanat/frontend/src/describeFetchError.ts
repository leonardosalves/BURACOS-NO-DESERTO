/** Mensagem legível quando fetch() falha (backend offline, proxy, etc.). */
export function describeFetchError(err: unknown, context = 'operação'): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  if (/failed to fetch|networkerror|network error|load failed|fetch failed/i.test(raw)) {
    return `Backend inacessível (porta 3005). Rode .\\scripts\\restart-backend.ps1, aguarde subir e recarregue a página — ${context}.`;
  }
  return raw.trim() || `Falha em ${context}.`;
}

export async function pingBackendHealth(timeoutMs = 4000): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/api/health', { signal: ctrl.signal });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return data?.ok === true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}