import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

type ChecklistItem = { id: string; label: string; done: boolean; detail?: string; required?: boolean };

type Props = {
  projectName: string;
  videoId?: string;
  toast?: (msg: string) => void;
};

export function PostPublishChecklist({ projectName, videoId, toast }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectName) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ project: projectName });
      if (videoId) params.set('videoId', videoId);
      const res = await fetch(`/api/youtube/channel/post-publish-checklist?${params}`);
      const data = await res.json();
      if (res.ok) setItems(data.checklist || []);
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

  if (!videoId) return null;

  return (
    <div className="bg-zinc-950/60 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">Checklist pós-publicação</span>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => toggle(item.id, !item.done)}
              className="w-full flex items-start gap-2 text-left text-[10px] text-zinc-400 hover:text-zinc-200"
            >
              {item.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
              )}
              <span>
                {item.label}
                {item.detail ? <span className="text-zinc-600 ml-1">({item.detail})</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}