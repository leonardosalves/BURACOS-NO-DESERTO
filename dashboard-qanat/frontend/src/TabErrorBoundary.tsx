import React from 'react';

type Props = {
  /** Rótulo exibido no erro (preferido). */
  label?: string;
  /** Alias legado — mesmo que `label`. */
  tabName?: string;
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export class TabErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const label = this.props.label || this.props.tabName || 'painel';
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-3 p-8 text-center font-sans bg-zinc-950 text-zinc-200">
          <p className="text-sm font-bold text-red-300">Erro ao abrir {label}</p>
          <p className="text-xs text-zinc-500 max-w-md">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="text-xs text-gold-400 border border-gold-500/30 px-3 py-1.5 rounded-lg hover:bg-gold-500/10"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}