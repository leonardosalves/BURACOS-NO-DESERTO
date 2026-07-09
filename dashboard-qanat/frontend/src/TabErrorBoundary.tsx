import React from "react";
import {
  canAutoReloadDashboard,
  hardReloadDashboard,
  isStaleChunkLoadError,
} from "./deployRecovery";

type Props = {
  /** Rótulo exibido no erro (preferido). */
  label?: string;
  /** Alias legado — mesmo que `label`. */
  tabName?: string;
  children: React.ReactNode;
};

type State = {
  error: Error | null;
  reloading: boolean;
  reloadBlocked: boolean;
};

export class TabErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, reloading: false, reloadBlocked: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, reloading: false };
  }

  private async handleRecovery() {
    const message = this.state.error?.message || "";
    if (isStaleChunkLoadError(message)) {
      if (!canAutoReloadDashboard()) {
        this.setState({ reloadBlocked: true });
        return;
      }
      this.setState({ reloading: true });
      const started = await hardReloadDashboard();
      if (!started) {
        this.setState({ reloading: false, reloadBlocked: true });
      }
      return;
    }
    this.setState({ error: null, reloading: false, reloadBlocked: false });
  }

  render() {
    const label = this.props.label || this.props.tabName || "painel";
    if (this.state.error) {
      const staleChunk = isStaleChunkLoadError(this.state.error.message);
      const showManualCacheHelp =
        staleChunk && (this.state.reloadBlocked || !canAutoReloadDashboard());
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-3 p-8 text-center font-sans bg-zinc-950 text-zinc-200">
          <p className="text-sm font-bold text-red-300">
            Erro ao abrir {label}
          </p>
          <p className="text-xs text-zinc-500 max-w-md">
            {this.state.error.message}
          </p>
          {staleChunk ? (
            <p className="text-xs text-zinc-600 max-w-md">
              O dashboard foi atualizado e o navegador ainda usa arquivos
              antigos em cache.
            </p>
          ) : null}
          {showManualCacheHelp ? (
            <div className="text-xs text-zinc-500 max-w-md space-y-2 text-left">
              <p className="font-semibold text-zinc-400">
                Limpe o cache desta pagina (uma vez):
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Feche todas as abas do Lumiera (127.0.0.1:3005)</li>
                <li>
                  No Chrome: Configuracoes → Privacidade → Limpar dados de
                  navegacao → so &quot;Imagens e arquivos em cache&quot; →
                  127.0.0.1
                </li>
                <li>Ou abra DevTools (F12) → Application → Clear site data</li>
                <li>Abra de novo: http://127.0.0.1:3005/</li>
              </ol>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void this.handleRecovery()}
            disabled={this.state.reloading}
            className="text-xs text-gold-400 border border-gold-500/30 px-3 py-1.5 rounded-lg hover:bg-gold-500/10 disabled:opacity-50"
          >
            {this.state.reloading
              ? "Recarregando..."
              : staleChunk && showManualCacheHelp
                ? "Tentar recarregar de novo"
                : staleChunk
                  ? "Atualizar dashboard"
                  : "Tentar novamente"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
