import React from "react";
import { Layers } from "lucide-react";
import type { NichePackInfo } from "./timelineStudioAskTypes";

type Props = {
  activePackId: string;
  packs: NichePackInfo[];
  playhead: number;
  onInsertTemplate: (templateId: string) => void;
  onSelectPack: (packId: string) => void;
};

export function NicheTemplatePalette({
  activePackId,
  packs,
  playhead,
  onInsertTemplate,
  onSelectPack,
}: Props) {
  const activePack =
    packs.find((p) => p.id === activePackId) || packs[0] || null;

  if (!activePack) return null;

  return (
    <div className="border-t border-zinc-800/60 bg-zinc-900/30 px-2 py-2 space-y-2">
      <div className="flex items-center gap-1.5">
        <Layers className="w-3 h-3 text-emerald-400 shrink-0" />
        <select
          value={activePackId}
          onChange={(e) => onSelectPack(e.target.value)}
          className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-300 rounded-lg px-2 py-1 cursor-pointer"
          title="Pacote de nicho"
        >
          {packs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1">
        {activePack.templates.map((tpl) => (
          <button
            key={tpl.templateId}
            type="button"
            onClick={() => onInsertTemplate(tpl.templateId)}
            className="text-[9px] px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition cursor-pointer"
            title={`Inserir ${tpl.label} em ${formatShort(playhead)}`}
          >
            + {tpl.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatShort(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
