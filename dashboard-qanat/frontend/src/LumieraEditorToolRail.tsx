import React from "react";
import {
  AudioLines,
  Captions,
  Film,
  Focus,
  Image,
  Layers3,
  Palette,
  Shapes,
  Sparkles,
  Type,
} from "lucide-react";

export type LumieraEditorTool =
  | "motion"
  | "media"
  | "text"
  | "audio"
  | "captions"
  | "images"
  | "lottie"
  | "effects"
  | "background"
  | "templates";

const TOOLS: Array<{
  id: LumieraEditorTool;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "motion", label: "Motion", icon: Sparkles },
  { id: "media", label: "Vídeo", icon: Film },
  { id: "text", label: "Texto", icon: Type },
  { id: "audio", label: "Áudio", icon: AudioLines },
  { id: "captions", label: "Legendas", icon: Captions },
  { id: "images", label: "Imagens", icon: Image },
  { id: "lottie", label: "Lottie", icon: Shapes },
  { id: "effects", label: "Efeitos", icon: Focus },
  { id: "background", label: "Fundo", icon: Palette },
  { id: "templates", label: "Projetos", icon: Layers3 },
];

export function LumieraEditorToolRail({
  activeTool,
  onChange,
}: {
  activeTool: LumieraEditorTool;
  onChange: (tool: LumieraEditorTool) => void;
}) {
  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-white/5 bg-[#080810] py-2">
      {TOOLS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          onClick={() => onChange(id)}
          className={`flex w-14 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[9px] transition ${
            activeTool === id
              ? "bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-400/30"
              : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          }`}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
