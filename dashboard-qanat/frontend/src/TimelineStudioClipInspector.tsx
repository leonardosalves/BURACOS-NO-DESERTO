import React from "react";
import { Trash2, X } from "lucide-react";
import {
  formatStudioTime,
  type StudioClip,
  type StudioTrack,
} from "./timelineStudioTypes";
import { isClipEditable } from "./timelineStudioClipOps";

type Props = {
  clip: StudioClip;
  track: StudioTrack | undefined;
  onClose: () => void;
  onUpdate: (patch: Partial<StudioClip>) => void;
  onCaptionText: (text: string) => void;
  onDelete: () => void;
};

export function TimelineStudioClipInspector({
  clip,
  track,
  onClose,
  onUpdate,
  onCaptionText,
  onDelete,
}: Props) {
  const editable = isClipEditable(clip);
  const captionText = String(clip.props?.text || clip.label || "");

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/90 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: clip.color || track?.color || "#64748b" }}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 truncate">
            {track?.label || clip.trackId}
          </span>
          <span className="text-[9px] text-zinc-600 font-mono truncate">
            {clip.id}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {editable ? (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
              title="Remover clip"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Início">
          <input
            type="number"
            min={0}
            step={0.05}
            disabled={!editable}
            value={Number(clip.start.toFixed(2))}
            onChange={(e) =>
              onUpdate({ start: Math.max(0, Number(e.target.value) || 0) })
            }
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono disabled:opacity-50"
          />
          <span className="text-[9px] text-zinc-600">
            {formatStudioTime(clip.start)}
          </span>
        </Field>

        <Field label="Duração">
          <input
            type="number"
            min={0.08}
            step={0.05}
            disabled={!editable}
            value={Number(clip.duration.toFixed(2))}
            onChange={(e) =>
              onUpdate({
                duration: Math.max(0.08, Number(e.target.value) || 0.08),
              })
            }
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono disabled:opacity-50"
          />
          <span className="text-[9px] text-zinc-600">
            fim {formatStudioTime(clip.start + clip.duration)}
          </span>
        </Field>

        {clip.source ? (
          <Field label="Fonte" className="sm:col-span-2">
            <p className="text-[10px] text-zinc-400 truncate font-mono">
              {clip.source}
            </p>
          </Field>
        ) : null}

        {clip.templateId ? (
          <Field label="Template">
            <p className="text-[10px] text-emerald-400 font-semibold">
              {clip.templateId}
            </p>
          </Field>
        ) : null}

        {clip.trackId === "captions" ? (
          <Field
            label="Texto da legenda"
            className="sm:col-span-2 lg:col-span-4"
          >
            <textarea
              value={captionText}
              disabled={!editable}
              onChange={(e) => onCaptionText(e.target.value)}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[12px] text-white resize-y min-h-[56px] disabled:opacity-50 focus:outline-none focus:border-indigo-500/50"
              placeholder="Edite a legenda…"
            />
          </Field>
        ) : clip.label ? (
          <Field label="Rótulo" className="sm:col-span-2">
            <input
              type="text"
              disabled={!editable}
              value={clip.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-white disabled:opacity-50"
            />
          </Field>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </div>
  );
}
