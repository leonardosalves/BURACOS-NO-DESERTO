export type BrowserChatProvider = 'gemini' | 'grok';

export type GeminiBrowserRequest = {
  needs_browser?: boolean;
  browser_provider?: BrowserChatProvider;
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
  provider?: BrowserChatProvider;
}) => Promise<string>;

export type GeminiBrowserResolver = (opts: {
  prompt: string;
  title?: string;
  instructions?: string[];
  provider?: BrowserChatProvider;
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
    browserChatProvider?: BrowserChatProvider;
    resolveBrowserResponse: GeminiBrowserResolver;
  },
): Promise<{ ok: boolean; status: number; data: GeminiBrowserRequest }> {
  const firstRes = await fetch(url, init);
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
    const browserProvider: BrowserChatProvider = data.browser_provider === 'grok'
      ? 'grok'
      : (opts.browserChatProvider === 'grok' ? 'grok' : 'gemini');
    const browserSite = browserProvider === 'grok' ? 'grok.com' : 'gemini.google.com';

    const browserResponse = String(
      await opts.resolveBrowserResponse({
        prompt: data.prompt,
        title: data.title,
        instructions: data.instructions,
        provider: browserProvider,
      }) || '',
    ).trim();

    if (!browserResponse) {
      return {
        ok: false,
        status: 400,
        data: {
          error: `A extensão não capturou a resposta do ${browserProvider === 'grok' ? 'Grok' : 'Gemini'}. Verifique ${browserSite} e tente de novo.`,
        },
      };
    }

    const body = {
      ...parseRequestBody(init),
      browser_response: browserResponse,
      ...(data.plan_session_id ? { plan_session_id: data.plan_session_id } : {}),
      ...(data.metadata_session_id ? { metadata_session_id: data.metadata_session_id } : {}),
    };

    const secondRes = await fetch(url, {
      ...init,
      method: init.method || 'POST',
      headers: jsonRequestHeaders(init),
      body: JSON.stringify(body),
    });
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