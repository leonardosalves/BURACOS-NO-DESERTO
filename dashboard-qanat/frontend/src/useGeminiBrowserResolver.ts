import { useCallback } from 'react';
import { queryGeminiWithRetry } from './geminiExtensionBridge';
import type { GeminiBrowserResolver } from './geminiAiFetch';

export type GeminiAutomationState = {
  active: boolean;
  title?: string;
  attempt?: number;
  hint?: string;
};

export function useGeminiBrowserResolver(
  setAutomation?: (state: GeminiAutomationState) => void,
): GeminiBrowserResolver {
  return useCallback(async (opts) => {
    const title = opts.title || 'Consultando Gemini…';
    const prompt = String(opts.prompt || '');
    const isMetadata = /metadados/i.test(title)
      || /LUMIERA_TASK:metadata/i.test(prompt)
      || /##\s*T[ÍI]TULOS/i.test(prompt);
    const isOverlay = /overlay/i.test(title)
      || /LUMIERA_TASK:overlay/i.test(prompt)
      || /"overlays"\s*:\s*\[/i.test(prompt);
    const hint = isMetadata
      ? 'Metadados em texto/markdown (~30–90s). Não feche gemini.google.com.'
      : isOverlay
        ? 'Overlays em JSON (~30–90s). Não feche gemini.google.com.'
        : 'Consultando gemini.google.com…';
    setAutomation?.({ active: true, title, hint });
    try {
      return await queryGeminiWithRetry(opts.prompt, {
        attempts: 1,
        onAttempt: () => setAutomation?.({
          active: true,
          title,
          hint,
        }),
      });
    } finally {
      setAutomation?.({ active: false });
    }
  }, [setAutomation]);
}