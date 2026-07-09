import React from "react";
import { Loader2, LogIn, RefreshCw } from "lucide-react";
import { useNotebooklmAuth } from "./useNotebooklmAuth";

type Props = {
  /** Tenta login automático uma vez por sessão do navegador */
  autoLogin?: boolean;
  compact?: boolean;
};

export function NotebookLmConnect({
  autoLogin = false,
  compact = false,
}: Props) {
  const { status, loggingIn, refresh, login } = useNotebooklmAuth({
    autoLogin,
  });

  const connected = Boolean(status?.authenticated);
  const manualLogin = Boolean(
    status?.manualLoginRequired || status?.serviceMode
  );
  const showConnect = !connected;
  const pending =
    loggingIn || (Boolean(status?.loginInProgress) && !manualLogin);

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
            connected
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
              : loggingIn
                ? "bg-sky-500/10 text-sky-300 border border-sky-500/25"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
          }`}
          title={status?.message}
        >
          {connected
            ? `NotebookLM · ${status?.notebookCount ?? 0} nb`
            : loggingIn
              ? "Aguardando login…"
              : "NotebookLM offline"}
        </span>
        {!connected && (
          <button
            type="button"
            disabled={loggingIn}
            onClick={() => void login()}
            className="dash-btn-secondary text-[10px] px-2.5 py-1 flex items-center gap-1"
          >
            {loggingIn ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <LogIn className="w-3 h-3" />
            )}
            Conectar
          </button>
        )}
        <button
          type="button"
          disabled={loggingIn}
          onClick={() => void refresh()}
          className="dash-btn-secondary text-[10px] px-2 py-1"
          title="Atualizar status"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
          connected
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
            : loggingIn
              ? "bg-sky-500/10 text-sky-300 border border-sky-500/25"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
        }`}
        title={status?.message}
      >
        {connected
          ? status?.message || "NotebookLM conectado"
          : pending
            ? "Aguardando login no navegador…"
            : manualLogin
              ? "Login manual necessário"
              : "NotebookLM desconectado"}
      </span>
      {showConnect && (
        <button
          type="button"
          disabled={pending}
          onClick={() => void login()}
          className="dash-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 border-violet-500/30 text-violet-200"
          title={
            manualLogin
              ? "No PowerShell: .\\nlm-login.ps1 na pasta Lumiera"
              : status?.cliMissing
                ? "Se falhar, rode .\\nlm-login.ps1 na pasta Lumiera (serviço Windows)"
                : "Abre login Google do NotebookLM no navegador"
          }
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LogIn className="w-3.5 h-3.5" />
          )}
          {pending
            ? "Abrindo navegador…"
            : manualLogin
              ? "Como conectar"
              : "Conectar NotebookLM"}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => void refresh()}
        className="dash-btn-secondary text-[10px] px-2.5 py-1 flex items-center gap-1"
        title="Verificar se o login no navegador terminou"
      >
        <RefreshCw className="w-3 h-3" />
        Atualizar
      </button>
    </div>
  );
}
