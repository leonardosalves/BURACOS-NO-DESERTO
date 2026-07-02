export type GeminiBrowserRequest = {
  needs_browser?: boolean;
  prompt?: string;
  title?: string;
  instructions?: string[];
  plan_session_id?: string;
  metadata_session_id?: string;
  text?: string;
  error?: string;
  staleResponse?: boolean;
  fallback?: boolean;
};

export type OpenGeminiBridge = (opts: {
  prompt: string;
  title?: string;
  instructions?: string[];
}) => Promise<string>;

export type GeminiBrowserResolver = (opts: {
  prompt: string;
  title?: string;
  instructions?: string[];
}) => Promise<string>;

function parseRequestBody(init: RequestInit): Record<string, unknown> {
  if (typeof init.body !== 'string' || !init.body.trim()) return {};
  try {
    const parsed = JSON.parse(init.body);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function jsonRequestHeaders(init: RequestInit): HeadersInit {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  return headers;
}

const DEFAULT_AI_FETCH_TIMEOUT_MS = 360_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_AI_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'A geração demorou demais (timeout). Tente de novo — se usar Gemini no Chrome, mantenha gemini.google.com aberto.',
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Chama um endpoint de IA. Se o backend pedir modo navegador (needs_browser),
 * a extensão Lumiera consulta gemini.google.com automaticamente e reenvia com browser_response.
 */
export async function fetchGeminiAi(
  url: string,
  init: RequestInit,
  opts: {
    geminiBrowserMode: boolean;
    aiProvider: string;
    resolveBrowserResponse: GeminiBrowserResolver;
    timeoutMs?: number;
    progressJobId?: string;
  },
): Promise<{ ok: boolean; status: number; data: GeminiBrowserRequest }> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_AI_FETCH_TIMEOUT_MS;
  const progressJobId = opts.progressJobId;
  let requestInit = init;
  if (progressJobId && typeof init.body === 'string') {
    try {
      const parsed = JSON.parse(init.body) as Record<string, unknown>;
      if (!parsed.progress_job_id) {
        requestInit = {
          ...init,
          body: JSON.stringify({ ...parsed, progress_job_id: progressJobId }),
        };
      }
    } catch {
      /* keep original body */
    }
  }
  const firstRes = await fetchWithTimeout(url, requestInit, timeoutMs);
  let data: GeminiBrowserRequest = {};
  try {
    data = await firstRes.json();
  } catch {
    return { ok: firstRes.ok, status: firstRes.status, data: { error: 'Resposta inválida' } };
  }

  if (firstRes.ok && data.needs_browser && data.prompt) {
    if (!opts.geminiBrowserMode) {
      console.warn('[Lumiera] Gemini pediu modo navegador — aguardando extensão.');
    }
    if (progressJobId) {
      const { reportClientProgress } = await import('./aiJobProgressClient');
      await reportClientProgress(progressJobId, {
        phase: 'browser_gemini',
        label: 'Consultando gemini.google.com…',
        percent: 62,
      });
    }
    const browserResponse = String(
      await opts.resolveBrowserResponse({
        prompt: data.prompt,
        title: data.title,
        instructions: data.instructions,
      }) || '',
    ).trim();
    if (progressJobId) {
      const { reportClientProgress } = await import('./aiJobProgressClient');
      await reportClientProgress(progressJobId, {
        phase: 'browser_apply',
        label: 'Aplicando resposta do Gemini…',
        percent: 68,
      });
    }

    if (!browserResponse) {
      return {
        ok: false,
        status: 400,
        data: {
          error: 'A extensão não capturou a resposta do Gemini. Verifique gemini.google.com e tente de novo.',
        },
      };
    }

    const body = {
      ...parseRequestBody(init),
      browser_response: browserResponse,
      ...(data.plan_session_id ? { plan_session_id: data.plan_session_id } : {}),
      ...(data.metadata_session_id ? { metadata_session_id: data.metadata_session_id } : {}),
    };

    const secondRes = await fetchWithTimeout(url, {
      ...requestInit,
      method: requestInit.method || 'POST',
      headers: jsonRequestHeaders(requestInit),
      body: JSON.stringify(body),
    }, timeoutMs);
    const secondData: GeminiBrowserRequest = await secondRes.json().catch(() => ({}));
    if (secondRes.ok && secondData.needs_browser) {
      return {
        ok: false,
        status: secondRes.status,
        data: {
          error: 'Gemini respondeu, mas o Lumiera não recebeu o texto no servidor. Recarregue a página (F5) e tente de novo.',
        },
      };
    }
    if (!secondRes.ok && secondData.error) {
      return { ok: false, status: secondRes.status, data: secondData };
    }
    return { ok: secondRes.ok, status: secondRes.status, data: secondData };
  }

  return { ok: firstRes.ok, status: firstRes.status, data };
}