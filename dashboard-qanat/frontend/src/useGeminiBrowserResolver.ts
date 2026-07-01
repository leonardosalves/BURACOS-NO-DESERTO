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
    const isIdeas = /ideias/i.test(title)
      || /Ideas Engine/i.test(prompt)
      || /"best_idea_index"/i.test(prompt);
    const hint = isMetadata
      ? 'Metadados em texto/markdown (~1–3 min). Não feche gemini.google.com.'
      : isOverlay
        ? 'Overlays em JSON (~1–3 min). Não feche gemini.google.com.'
        : isIdeas
          ? '10 ideias em JSON (~1–2 min). Não feche gemini.google.com.'
          : 'Consultando gemini.google.com (até ~2 min)…';
    setAutomation?.({ active: true, title, hint });
    try {
      return await queryGeminiWithRetry(opts.prompt, {
        attempts: isMetadata ? 2 : 3,
        onAttempt: (attempt) => setAutomation?.({
          active: true,
          title,
          hint: attempt > 1 ? `${hint} Tentativa ${attempt}…` : hint,
          attempt,
        }),
      });
    } finally {
      setAutomation?.({ active: false });
    }
  }, [setAutomation]);
}