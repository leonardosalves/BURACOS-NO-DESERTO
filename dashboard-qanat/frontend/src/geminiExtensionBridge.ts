const BRIDGE_SOURCE = 'lumiera-gemini-bridge';
const APP_SOURCE = 'lumiera-app';

function formatExtensionError(message: string) {
  if (/extension context invalidated|context invalidated/i.test(message)) {
    return 'Extensão foi recarregada. Recarregue esta página (F5) e tente de novo.';
  }
  if (/receiving end does not exist|could not establish connection|sem conexão/i.test(message)) {
    return 'Aba do Gemini desconectada. Abra https://gemini.google.com/app, faça login e tente de novo.';
  }
  return message;
}

type BridgeMessage = {
  source: string;
  type: string;
  requestId?: string;
  ok?: boolean;
  text?: string;
  error?: string;
  version?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function isBridgeScriptPresent() {
  return document.documentElement.getAttribute('data-lumiera-gemini-bridge') != null;
}

export async function waitForBridgeScript(maxMs = 2000): Promise<boolean> {
  if (isBridgeScriptPresent()) return true;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await sleep(150);
    if (isBridgeScriptPresent()) return true;
  }
  return false;
}

function postToBridge<T extends BridgeMessage>(
  payload: Omit<T, 'source'>,
  timeoutMs = 95000,
) {
  return new Promise<T>((resolve, reject) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('Gemini demorou demais (timeout). Tente de novo.'));
    }, timeoutMs);

    const onMessage = (event: MessageEvent) => {
      const data = event.data as BridgeMessage;
      if (!data || data.source !== BRIDGE_SOURCE || data.requestId !== requestId) return;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timeout);

      if (data.type === 'LUMIERA_GEMINI_PONG') {
        if (data.ok) resolve(data as T);
        else reject(new Error(formatExtensionError(data.error || 'Extensão indisponível.')));
        return;
      }
      if (data.type === 'LUMIERA_GEMINI_RESULT') {
        if (data.ok && data.text) resolve(data as T);
        else reject(new Error(formatExtensionError(data.error || 'Automação Gemini falhou.')));
      }
    };

    window.addEventListener('message', onMessage);
    window.postMessage({
      source: APP_SOURCE,
      type: payload.type,
      requestId,
      prompt: (payload as { prompt?: string }).prompt,
    }, '*');
  });
}

let extensionCached = false;

export async function diagnoseGeminiExtension() {
  const scriptPresent = await waitForBridgeScript(3000);
  if (!scriptPresent) {
    return { scriptPresent: false, pingOk: false, error: 'Extensão não injetou. Recarregue extensão + F5.' };
  }
  try {
    const resp = await postToBridge<BridgeMessage>({ type: 'LUMIERA_GEMINI_PING' }, 3000);
    extensionCached = true;
    return { scriptPresent: true, pingOk: true, version: resp.version };
  } catch (err) {
    return { scriptPresent: true, pingOk: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function isGeminiExtensionAvailable(force = false): Promise<boolean> {
  if (!force && extensionCached) return true;
  if (!await waitForBridgeScript(2000)) return false;
  try {
    await postToBridge<BridgeMessage>({ type: 'LUMIERA_GEMINI_PING' }, 3000);
    extensionCached = true;
    return true;
  } catch {
    extensionCached = false;
    return false;
  }
}

export function estimateGeminiQueryTimeoutMs(prompt: string): number {
  const len = String(prompt || '').length;
  if (/LUMIERA_TASK:metadata/i.test(prompt)) return 200000;
  if (/Metadados YouTube|##\s*T[ÍI]TULOS|SEO para YouTube/i.test(prompt)) return 200000;
  if (len > 6000 || /"overlays"\s*:/i.test(prompt) || /LUMIERA_TASK:overlay/i.test(prompt)) return 180000;
  if (/Ideas Engine|"best_idea_index"|ranking_ideas/i.test(prompt)) return 150000;
  if (len > 3000) return 130000;
  return 120000;
}

export async function queryGeminiViaExtension(prompt: string): Promise<string> {
  const timeoutMs = estimateGeminiQueryTimeoutMs(prompt);
  const resp = await postToBridge<BridgeMessage>({ type: 'LUMIERA_GEMINI_QUERY', prompt }, timeoutMs);
  return String(resp.text || '').trim();
}

export async function queryGeminiWithRetry(
  prompt: string,
  opts: { attempts?: number; onAttempt?: (n: number) => void } = {},
): Promise<string> {
  const attempts = opts.attempts ?? 2;
  let lastErr: Error | null = null;

  for (let i = 0; i < attempts; i += 1) {
    opts.onAttempt?.(i + 1);
    if (!await waitForBridgeScript(2000)) {
      throw new Error('Extensão não conectada. Recarregue extensão + F5.');
    }
    if (i === 0 && !extensionCached) {
      const ok = await isGeminiExtensionAvailable(true);
      if (!ok) throw new Error('Extensão não respondeu. Recarregue extensão + F5.');
    }
    try {
      return await queryGeminiViaExtension(prompt);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      extensionCached = false;
      if (i < attempts - 1) await sleep(800);
    }
  }
  throw lastErr || new Error('Automação Gemini falhou.');
}

export function resetGeminiExtensionCache() {
  extensionCached = false;
}