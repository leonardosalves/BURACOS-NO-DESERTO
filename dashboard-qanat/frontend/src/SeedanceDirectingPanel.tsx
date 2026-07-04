import React, { useState } from 'react';
import { Clapperboard, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import {
  DIRECTING_BRIEF_FIELDS,
  SEEDANCE_REF_SLOTS,
  sceneHasDirecting,
  sceneHasRefs,
  type DirectingBrief,
  type SeedanceRefs,
} from './seedanceDirecting';

type SeedanceDirectingPanelProps = {
  sceneIndex: number;
  sceneNum: string | number;
  isVideo: boolean;
  directingBrief?: DirectingBrief;
  seedanceRefs?: SeedanceRefs;
  onUpdateBrief: (field: keyof DirectingBrief, value: string) => void;
  onUpdateRef: (slot: keyof SeedanceRefs, value: string) => void;
  onGenerateScene?: (sceneIndex: number) => void | Promise<void>;
  generating?: boolean;
  defaultOpen?: boolean;
};

export function SeedanceDirectingPanel({
  sceneIndex,
  sceneNum,
  isVideo,
  directingBrief = {},
  seedanceRefs = {},
  onUpdateBrief,
  onUpdateRef,
  onGenerateScene,
  generating = false,
  defaultOpen = false,
}: SeedanceDirectingPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = sceneHasDirecting({ directing_brief: directingBrief }) || sceneHasRefs({ seedance_refs: seedanceRefs });

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-violet-500/10 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clapperboard className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-violet-300">
            Directing · Cena {sceneNum}
          </span>
          {hasContent && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-200 border border-violet-500/25">
              preenchido
            </span>
          )}
          {isVideo && (
            <span className="text-[8px] text-blue-400/80">vídeo IA</span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-violet-500/15">
          <div className="flex justify-end pt-2">
            {onGenerateScene && (
              <button
                type="button"
                disabled={generating}
                onClick={() => onGenerateScene(sceneIndex)}
                className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-violet-500/30 text-violet-200 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-50 transition flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                {generating ? 'Gerando…' : 'IA · esta cena'}
              </button>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[9px] text-violet-300/70 font-mono uppercase tracking-wider">Directing brief</p>
            {DIRECTING_BRIEF_FIELDS.map((f) => (
              <div key={f.id} className="space-y-0.5">
                <label className="text-[8px] text-zinc-500 font-mono uppercase" title={f.hint}>
                  {f.label}
                </label>
                <textarea
                  rows={1}
                  value={directingBrief[f.id] || ''}
                  onChange={(e) => onUpdateBrief(f.id, e.target.value)}
                  placeholder={f.hint}
                  className="bg-zinc-950/80 border border-zinc-850 rounded-lg text-[11px] text-zinc-300 p-2 w-full focus:border-violet-500/40 focus:outline-none transition leading-snug resize-y min-h-[2rem]"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-[9px] text-violet-300/70 font-mono uppercase tracking-wider">Refs Seedance</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SEEDANCE_REF_SLOTS.map((s) => (
                <div key={s.id} className="space-y-0.5">
                  <label className="text-[8px] text-zinc-500 font-mono uppercase" title={s.hint}>
                    {s.label}
                  </label>
                  <input
                    type="text"
                    value={seedanceRefs[s.id] || ''}
                    onChange={(e) => onUpdateRef(s.id, e.target.value)}
                    placeholder={s.hint}
                    className="bg-zinc-950/80 border border-zinc-850 rounded-lg text-[10px] text-zinc-400 p-1.5 w-full focus:border-violet-500/40 focus:outline-none transition"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type SeedanceDirectingToolbarProps = {
  sceneCount: number;
  filledCount: number;
  loading?: boolean;
  onCompileAll: () => void | Promise<void>;
};

export function SeedanceDirectingToolbar({
  sceneCount,
  filledCount,
  loading = false,
  onCompileAll,
}: SeedanceDirectingToolbarProps) {
  return (
    <button
      type="button"
      disabled={loading || sceneCount === 0}
      onClick={onCompileAll}
      className="bg-violet-500/15 hover:bg-violet-500/30 border border-violet-500/30 text-violet-200 disabled:opacity-50 text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
      title="Gera directing_brief + slots de referência por cena (antes da Engenharia Visual PRO)"
    >
      <Clapperboard className="w-3 h-3" />
      {loading ? '🎬 Directing…' : '🎬 Seedance Directing'}
      {filledCount > 0 && (
        <span className="text-[8px] opacity-70 font-mono">
          {filledCount}/{sceneCount}
        </span>
      )}
    </button>
  );
}