import React from "react";
import { Loader2, ServerCrash, Wifi } from "lucide-react";

type BackendStatusBannerProps = {
  online: boolean;
  checking?: boolean;
  onRetry?: () => void;
};

export function BackendStatusBanner({
  online,
  checking = false,
  onRetry,
}: BackendStatusBannerProps) {
  if (online) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-amber-500/30 bg-amber-500/10 text-amber-100 text-xs"
    >
      <div className="flex items-center gap-2 min-w-0">
        {checking ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-amber-300" />
        ) : (
          <ServerCrash className="w-4 h-4 shrink-0 text-amber-300" />
        )}
        <span className="leading-snug">
          Modo cache ativo: o app continua abrindo projetos, status, timeline e
          configuracoes do ultimo snapshot. Render, upload, IA e arquivos novos
          voltam quando o worker da porta 3005 responder.
        </span>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-200 hover:bg-amber-500/15 transition shrink-0"
        >
          <Wifi className="w-3.5 h-3.5" />
          Verificar agora
        </button>
      ) : null}
    </div>
  );
}
