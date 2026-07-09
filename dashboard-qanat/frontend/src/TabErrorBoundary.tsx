import React from "react";
import { hardReloadDashboard, isStaleChunkLoadError } from "./deployRecovery";

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
};

export class TabErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, reloading: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, reloading: false };
  }

  private async handleRecovery() {
    const message = this.state.error?.message || "";
    if (isStaleChunkLoadError(message)) {
      this.setState({ reloading: true });
      await hardReloadDashboard();
      return;
    }
    this.setState({ error: null, reloading: false });
  }

  render() {
    const label = this.props.label || this.props.tabName || "painel";
    if (this.state.error) {
      const staleChunk = isStaleChunkLoadError(this.state.error.message);
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
              antigos. Clique abaixo para recarregar com a versao nova.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void this.handleRecovery()}
            disabled={this.state.reloading}
            className="text-xs text-gold-400 border border-gold-500/30 px-3 py-1.5 rounded-lg hover:bg-gold-500/10 disabled:opacity-50"
          >
            {this.state.reloading
              ? "Recarregando..."
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
