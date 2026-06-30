import { useCallback } from 'react';
import { queryBrowserWithRetry, type BrowserChatProvider } from './geminiExtensionBridge';
import type { GeminiBrowserResolver } from './geminiAiFetch';

export type GeminiAutomationState = {
  active: boolean;
  title?: string;
  attempt?: number;
  hint?: string;
  provider?: BrowserChatProvider;
};

function providerSite(provider: BrowserChatProvider) {
  return provider === 'grok' ? 'grok.com' : 'gemini.google.com';
}

export function useGeminiBrowserResolver(
  setAutomation?: (state: GeminiAutomationState) => void,
  defaultProvider: BrowserChatProvider = 'gemini',
): GeminiBrowserResolver {
  return useCallback(async (opts) => {
    const provider: BrowserChatProvider = opts.provider === 'grok' ? 'grok' : (
      opts.provider === 'gemini' ? 'gemini' : defaultProvider
    );
    const site = providerSite(provider);
    const title = opts.title || (provider === 'grok' ? 'Consultando Grok…' : 'Consultando Gemini…');
    const prompt = String(opts.prompt || '');
    const isMetadata = /metadados/i.test(title)
      || /LUMIERA_TASK:metadata/i.test(prompt)
      || /##\s*T[ÍI]TULOS/i.test(prompt);
    const isOverlay = /overlay/i.test(title)
      || /LUMIERA_TASK:overlay/i.test(prompt)
      || /"overlays"\s*:\s*\[/i.test(prompt);
    const hint = isMetadata
      ? `Metadados em texto/markdown (~30–90s). Não feche ${site}.`
      : isOverlay
        ? `Overlays em JSON (~30–90s). Não feche ${site}.`
        : `Consultando ${site}…`;
    setAutomation?.({ active: true, title, hint, provider });
    try {
      return await queryBrowserWithRetry(opts.prompt, {
        provider,
        attempts: 1,
        onAttempt: () => setAutomation?.({
          active: true,
          title,
          hint,
          provider,
        }),
      });
    } finally {
      setAutomation?.({ active: false });
    }
  }, [setAutomation, defaultProvider]);
}