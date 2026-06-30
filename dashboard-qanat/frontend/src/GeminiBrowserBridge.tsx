import React, { createContext, useCallback, useContext, useState } from 'react';
import { Chrome, Loader2 } from 'lucide-react';
import type { GeminiAutomationState } from './useGeminiBrowserResolver';

type BridgeContextValue = {
  setAutomation: (state: GeminiAutomationState) => void;
};

const GeminiBrowserContext = createContext<BridgeContextValue | null>(null);

export function useGeminiBrowserBridge() {
  const ctx = useContext(GeminiBrowserContext);
  if (!ctx) throw new Error('useGeminiBrowserBridge must be used within GeminiBrowserProvider');
  return ctx;
}

export function GeminiBrowserProvider({ children }: { children: React.ReactNode }) {
  const [automation, setAutomationState] = useState<GeminiAutomationState>({ active: false });

  const setAutomation = useCallback((state: GeminiAutomationState) => {
    setAutomationState(state);
  }, []);

  return (
    <GeminiBrowserContext.Provider value={{ setAutomation }}>
      {children}
      {automation.active && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-violet-500/40 bg-zinc-950/95 shadow-2xl px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
                <Chrome className="w-5 h-5 text-violet-300" />
                <Loader2 className="absolute -bottom-1 -right-1 w-4 h-4 text-violet-400 animate-spin" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-violet-100 truncate">
                  {automation.title || (automation.provider === 'grok' ? 'Automação Grok' : 'Automação Gemini')}
                </p>
                <p className="text-[10px] text-zinc-400 leading-relaxed mt-0.5">
                  {automation.hint || (automation.provider === 'grok' ? 'Consultando grok.com…' : 'Consultando gemini.google.com…')}
                  {automation.attempt && automation.attempt > 1 ? ` Tentativa ${automation.attempt}…` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </GeminiBrowserContext.Provider>
  );
}