import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

type ChecklistItem = { id: string; label: string; done: boolean; detail?: string; required?: boolean };

type Props = {
  projectName: string;
  videoId?: string;
  toast?: (msg: string) => void;
  compact?: boolean;
};

export function PostPublishChecklist({ projectName, videoId, toast, compact = false }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvedVideoId, setResolvedVideoId] = useState(videoId || '');

  const load = useCallback(async () => {
    if (!projectName) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ project: projectName });
      if (videoId) params.set('videoId', videoId);
      const res = await fetch(`/api/youtube/channel/post-publish-checklist?${params}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.checklist || []);
        if (data.videoId) setResolvedVideoId(data.videoId);
      }
    } catch {
      toast?.('Erro ao carregar checklist pós-publicação.');
    } finally {
      setLoading(false);
    }
  }, [projectName, toast, videoId]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (itemId: string, done: boolean) => {
    try {
      const res = await fetch('/api/youtube/channel/post-publish-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectName, itemId, done }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, done } : i)));
      }
    } catch {
      toast?.('Erro ao atualizar checklist.');
    }
  };

  if (!projectName) return null;

  const shellClass = compact
    ? 'p-3 rounded-xl bg-zinc-950 border border-emerald-500/20 space-y-2'
    : 'bg-zinc-950/60 border border-emerald-500/20 rounded-2xl p-4 space-y-2';

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between">
        <span className={`font-bold text-emerald-300 uppercase tracking-wide ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          Checklist pós-publicação
          {resolvedVideoId && compact && (
            <span className="text-zinc-600 normal-case ml-1">· {resolvedVideoId.slice(0, 8)}…</span>
          )}
        </span>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
      </div>
      {items.length === 0 && !loading ? (
        <p className="text-[9px] text-zinc-600">Sem itens — publique o vídeo primeiro.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id, !item.done)}
                className={`w-full flex items-start gap-2 text-left hover:text-zinc-200 ${compact ? 'text-[9px] text-zinc-400' : 'text-[10px] text-zinc-400'}`}
              >
                {item.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
                )}
                <span>
                  {item.label}
                  {item.required && !item.done && <span className="text-red-400/70 ml-0.5">*</span>}
                  {item.detail ? <span className="text-zinc-600 ml-1">({item.detail})</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}