import React, { useEffect, useState } from 'react';
import { Inbox, Loader2, Youtube } from 'lucide-react';

type Props = {
  onOpenPanel: () => void;
  viewsThreshold?: number;
};

type InboxSnapshot = {
  inbox?: {
    pending?: number;
    overdue?: number;
    inboxZero?: boolean;
    queuePending?: number;
  };
};

export function YoutubeStudioHomeCard({ onOpenPanel, viewsThreshold = 100 }: Props) {
  const [data, setData] = useState<InboxSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/youtube/channel/pro/dashboard?viewsThreshold=${viewsThreshold}&limit=10`);
        const json = await res.json();
        if (!cancelled && (res.ok || res.status === 403)) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [viewsThreshold]);

  const inbox = data?.inbox;

  return (
    <button
      type="button"
      onClick={onOpenPanel}
      className="glass-panel p-4 rounded-2xl w-full text-left hover:border-[rgba(130,128,253,0.35)] border border-transparent transition"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-400" />
          <span className="text-sm font-bold text-white">Canal YouTube</span>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
        ) : inbox?.inboxZero ? (
          <span className="text-[9px] font-bold text-emerald-400">Inbox zero</span>
        ) : (
          <span className="text-[9px] font-bold text-amber-400 tabular-nums">
            {(inbox?.pending ?? 0) + (inbox?.queuePending ?? 0)} pendente(s)
          </span>
        )}
      </div>
      {!loading && inbox && !inbox.inboxZero && (
        <p className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
          <Inbox className="w-3 h-3" />
          {inbox.pending ?? 0} sem resposta
          {(inbox.overdue ?? 0) > 0 && ` · ${inbox.overdue} fora do SLA`}
        </p>
      )}
    </button>
  );
}