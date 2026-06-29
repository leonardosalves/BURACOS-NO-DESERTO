import { useCallback } from 'react';
import { queryGeminiWithRetry } from './geminiExtensionBridge';
import type { GeminiBrowserResolver } from './geminiAiFetch';

export type GeminiAutomationState = {
  active: boolean;
  title?: string;
  attempt?: number;
};

export function useGeminiBrowserResolver(
  setAutomation?: (state: GeminiAutomationState) => void,
): GeminiBrowserResolver {
  return useCallback(async (opts) => {
    setAutomation?.({ active: true, title: opts.title || 'Consultando Gemini…' });
    try {
      return await queryGeminiWithRetry(opts.prompt, {
        attempts: 3,
        onAttempt: (n) => setAutomation?.({
          active: true,
          title: opts.title || 'Consultando Gemini…',
          attempt: n,
        }),
      });
    } finally {
      setAutomation?.({ active: false });
    }
  }, [setAutomation]);
}