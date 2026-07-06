/** Mensagem legível quando fetch() falha (backend offline, proxy, etc.). */
export function describeFetchError(err: unknown, context = "operação"): string {
  const raw = err instanceof Error ? err.message : String(err || "");
  if (
    /failed to fetch|networkerror|network error|load failed|fetch failed/i.test(
      raw
    )
  ) {
    return `Backend reiniciando (porta 3005). O watchdog sobe automaticamente — aguarde alguns segundos e tente de novo: ${context}.`;
  }
  return raw.trim() || `Falha em ${context}.`;
}

export async function pingBackendHealth(timeoutMs = 15000): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("/api/health", {
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return data?.ok === true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Aguarda o backend voltar (ex.: durante reinício do watchdog). */
export async function waitForBackendHealth(
  maxWaitMs = 45_000,
  intervalMs = 1_500
): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await pingBackendHealth(Math.min(intervalMs + 1000, 6000))) return true;
    await new Promise((r) => window.setTimeout(r, intervalMs));
  }
  return false;
}

/** fetch com espera pelo backend e uma retentativa automática. */
export async function fetchWithBackendRetry(
  url: string,
  init?: RequestInit,
  context = "operação"
): Promise<Response> {
  const attempt = async () => fetch(url, init);
  try {
    return await attempt();
  } catch (firstErr) {
    const raw =
      firstErr instanceof Error ? firstErr.message : String(firstErr || "");
    if (
      !/failed to fetch|networkerror|network error|load failed|fetch failed/i.test(
        raw
      )
    ) {
      throw firstErr;
    }
    const ok = await waitForBackendHealth(40_000, 1_200);
    if (!ok) {
      throw new Error(describeFetchError(firstErr, context));
    }
    return await attempt();
  }
}
