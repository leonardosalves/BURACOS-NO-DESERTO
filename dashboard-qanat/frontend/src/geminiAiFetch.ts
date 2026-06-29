export type GeminiBrowserRequest = {
  needs_browser?: boolean;
  prompt?: string;
  title?: string;
  instructions?: string[];
  text?: string;
  error?: string;
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
  },
): Promise<{ ok: boolean; status: number; data: GeminiBrowserRequest }> {
  const firstRes = await fetch(url, init);
  let data: GeminiBrowserRequest = {};
  try {
    data = await firstRes.json();
  } catch {
    return { ok: firstRes.ok, status: firstRes.status, data: { error: 'Resposta inválida' } };
  }

  if (
    firstRes.ok
    && data.needs_browser
    && opts.geminiBrowserMode
    && opts.aiProvider === 'gemini'
    && data.prompt
  ) {
    const browserResponse = await opts.resolveBrowserResponse({
      prompt: data.prompt,
      title: data.title,
      instructions: data.instructions,
    });

    const body = {
      ...(typeof init.body === 'string' ? JSON.parse(init.body) : {}),
      browser_response: browserResponse,
    };

    const secondRes = await fetch(url, {
      ...init,
      body: JSON.stringify(body),
    });
    const secondData: GeminiBrowserRequest = await secondRes.json().catch(() => ({}));
    if (secondRes.ok && secondData.needs_browser) {
      return {
        ok: false,
        status: secondRes.status,
        data: { error: 'Automação Gemini não completou a resposta. Tente novamente.' },
      };
    }
    return { ok: secondRes.ok, status: secondRes.status, data: secondData };
  }

  return { ok: firstRes.ok, status: firstRes.status, data };
}