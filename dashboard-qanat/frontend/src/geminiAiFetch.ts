export type GeminiBrowserRequest = {
  needs_browser?: boolean;
  started?: boolean;
  jobId?: string;
  prompt?: string;
  title?: string;
  instructions?: string[];
  plan_session_id?: string;
  metadata_session_id?: string;
  text?: string;
  error?: string;
  details?: string;
  staleResponse?: boolean;
  fallback?: boolean;
  narrative_script?: string;
  [key: string]: unknown;
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

  if (firstRes.ok && data.started && data.jobId) {
    return { ok: true, status: firstRes.status, data };
  }

  return { ok: firstRes.ok, status: firstRes.status, data };
}

/** POST Creator script com job assíncrono + retry do modo navegador. */
export async function fetchCreatorScriptAi(
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
  let requestInit = init;
  let body = parseRequestBody(init);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetchGeminiAi(url, requestInit, {
      ...opts,
      progressJobId: opts.progressJobId,
    });

    if (res.data.started && res.data.jobId) {
      const { waitForAiJobDone } = await import('./aiJobProgressClient');
      const jobResult = await waitForAiJobDone(String(res.data.jobId));

      if (jobResult.needs_browser && jobResult.prompt) {
        if (opts.progressJobId) {
          const { reportClientProgress } = await import('./aiJobProgressClient');
          await reportClientProgress(opts.progressJobId, {
            phase: 'browser_gemini',
            label: 'Consultando gemini.google.com…',
            percent: 62,
          });
        }
        const browserResponse = String(
          await opts.resolveBrowserResponse({
            prompt: String(jobResult.prompt),
            title: typeof jobResult.title === 'string' ? jobResult.title : undefined,
            instructions: Array.isArray(jobResult.instructions)
              ? jobResult.instructions.map(String)
              : undefined,
          }) || '',
        ).trim();
        if (!browserResponse) {
          return {
            ok: false,
            status: 400,
            data: {
              error: 'A extensão não capturou a resposta do Gemini. Verifique gemini.google.com e tente de novo.',
            },
          };
        }
        body = {
          ...body,
          browser_response: browserResponse,
        };
        requestInit = {
          ...init,
          method: init.method || 'POST',
          headers: jsonRequestHeaders(init),
          body: JSON.stringify({
            ...body,
            ...(opts.progressJobId ? { progress_job_id: opts.progressJobId } : {}),
          }),
        };
        continue;
      }

      const hasError = Boolean(jobResult.error);
      return {
        ok: !hasError,
        status: hasError ? 500 : 200,
        data: jobResult as GeminiBrowserRequest,
      };
    }

    return res;
  }

  return {
    ok: false,
    status: 400,
    data: { error: 'Limite de tentativas no modo navegador — tente de novo.' },
  };
}