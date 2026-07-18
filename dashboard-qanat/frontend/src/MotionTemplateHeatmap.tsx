import React, { useMemo } from "react";
import { Layers } from "lucide-react";

type MotionScene = {
  id?: string;
  start_hint?: number;
  duration_seconds?: number;
  template_id?: string;
  trigger?: string;
  source?: string;
  props?: {
    studio_role?: string;
    template_studio_name?: string;
    template_studio_subcategory?: string;
    template_studio_id?: string;
  };
};

type Props = {
  motionScenes?: MotionScene[] | null;
  totalDurationSec?: number;
  policySummary?: string;
  narradorPlacementCount?: number;
};

function formatTime(sec: number) {
  const s = Math.max(0, Number(sec) || 0);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

const ROLE_COLORS: Record<string, string> = {
  chart: "#38bdf8",
  scene_effect: "#a78bfa",
  intro: "#fbbf24",
  end_card: "#f472b6",
  chapter_title: "#34d399",
  subscribe_mid: "#fb7185",
  quote: "#fcd34d",
  lower_third: "#94a3b8",
  transition: "#818cf8",
  media_layout: "#2dd4bf",
  background_frame: "#64748b",
  identity_frame: "#e2e8f0",
  content_animation: "#67e8f9",
  text_overlay: "#fde68a",
  overlay: "#d4af37",
};

export function MotionTemplateHeatmap({
  motionScenes,
  totalDurationSec,
  policySummary,
  narradorPlacementCount,
}: Props) {
  const scenes = Array.isArray(motionScenes) ? motionScenes : [];
  const duration = useMemo(() => {
    if (totalDurationSec && totalDurationSec > 0) return totalDurationSec;
    let max = 30;
    for (const s of scenes) {
      const end =
        (Number(s.start_hint) || 0) + (Number(s.duration_seconds) || 3);
      if (end > max) max = end;
    }
    return max;
  }, [scenes, totalDurationSec]);

  if (!scenes.length) {
    return (
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 text-[11px] text-zinc-500">
        Nenhum template Remotion planejado ainda. Use{" "}
        <strong className="text-zinc-300">Planejar templates Remotion</strong>{" "}
        para gerar o mapa visual.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-gold-400 shrink-0" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
              Mapa de templates · {scenes.length} camadas
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {policySummary || "Orquestração semântica (v1.3+)"}
              {narradorPlacementCount
                ? ` · ${narradorPlacementCount} placement(s) NARRADORPRO`
                : ""}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
          0:00 — {formatTime(duration)}
        </span>
      </div>

      <div className="relative h-10 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        {scenes.map((s, i) => {
          const start = Math.max(0, Number(s.start_hint) || 0);
          const dur = Math.max(0.5, Number(s.duration_seconds) || 3);
          const left = (start / duration) * 100;
          const width = Math.max(1.2, (dur / duration) * 100);
          const role = String(s.props?.studio_role || "overlay");
          const color = ROLE_COLORS[role] || ROLE_COLORS.overlay;
          const label =
            s.props?.template_studio_subcategory ||
            s.props?.template_studio_name ||
            s.template_id ||
            role;
          return (
            <div
              key={s.id || `${role}-${i}`}
              title={`${formatTime(start)} · ${label} (${role})`}
              className="absolute top-1 bottom-1 rounded-md border border-white/10 opacity-90 hover:opacity-100 cursor-default"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: color,
                minWidth: 6,
              }}
            />
          );
        })}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
        {scenes
          .slice()
          .sort(
            (a, b) => (Number(a.start_hint) || 0) - (Number(b.start_hint) || 0)
          )
          .map((s, i) => {
            const role = String(s.props?.studio_role || "overlay");
            const color = ROLE_COLORS[role] || ROLE_COLORS.overlay;
            const name =
              s.props?.template_studio_name ||
              s.props?.template_studio_subcategory ||
              s.template_id ||
              "template";
            return (
              <li
                key={s.id || `row-${i}`}
                className="flex items-center gap-2 text-[10px] text-zinc-400 min-w-0"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono text-zinc-500 shrink-0">
                  {formatTime(Number(s.start_hint) || 0)}
                </span>
                <span className="truncate text-zinc-300">{name}</span>
                <span className="text-zinc-600 truncate">· {role}</span>
                {s.source ? (
                  <span className="text-zinc-700 truncate hidden md:inline">
                    · {s.source}
                  </span>
                ) : null}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
