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
      || /"best_idea_index"/i.test(prompt)
      || /ranking_ideas|listicle/i.test(prompt);
    const isNarration = /narra[cç][aã]o/i.test(title)
      || /Gerar narração/i.test(title)
      || /"narrative_script"/i.test(prompt);
    const hint = isMetadata
      ? 'Metadados em texto/markdown (~1–3 min). Não feche gemini.google.com.'
      : isOverlay
        ? 'Overlays em JSON (~1–3 min). Não feche gemini.google.com.'
        : isIdeas
          ? '10 ideias em JSON (~1–2 min). Não feche gemini.google.com.'
          : isNarration
            ? 'Narração (~1–3 min). Deixe gemini.google.com aberto. Se travar, clique Capturar do Gemini.'
            : 'Consultando gemini.google.com (até ~4 min)…';
    const startedAt = Date.now();
    const baseHint = hint;
    const tickHint = (attempt?: number) => {
      const sec = Math.floor((Date.now() - startedAt) / 1000);
      const attemptSuffix = attempt && attempt > 1 ? ` · tentativa ${attempt}` : '';
      setAutomation?.({
        active: true,
        title,
        hint: `${baseHint} (${sec}s${attemptSuffix})`,
        attempt,
      });
    };
    tickHint();
    const tick = window.setInterval(() => tickHint(), 4000);
    try {
      return await queryGeminiWithRetry(opts.prompt, {
        attempts: isMetadata ? 2 : isNarration ? 2 : 3,
        onAttempt: (attempt) => tickHint(attempt),
      });
    } finally {
      window.clearInterval(tick);
      setAutomation?.({ active: false });
    }
  }, [setAutomation]);
}