import { Clapperboard, Layers, Music, Settings, Share2, Sparkles, Terminal, Tv, Wand2, Clock } from "lucide-react";
import type { PendingRenderJob } from "./appTypes";

export const RENDER_MODE_LABELS: Record<PendingRenderJob["mode"], string> = {
  standard: "Compilação Padrão",
  highlighted: "Render Destacado",
  remotion: "Remotion",
  "remotion-pro": "Remotion PRO",
};

export const RECENT_PROJECTS_KEY = "qanat_recent_projects";

export const PROJECT_WORKSPACE_TABS = [
  { id: "status" as const, label: "Render", icon: Tv, helpId: "tab-status" },
  { id: "workflow" as const, label: "Workflow e Tarefas", icon: Wand2, helpId: "tab-workflow" },
  { id: "timeline" as const, label: "Roteiro e Tags", icon: Layers, helpId: "tab-timeline" },
  { id: "scene-timing" as const, label: "Editor de Timing", icon: Clock, helpId: "tab-scene-timing" },
  { id: "flow-studio" as const, label: "Flow Studio", icon: Clapperboard, helpId: "tab-flow-studio" },
  { id: "music" as const, label: "Trilha BGM", icon: Music, helpId: "tab-music" },
  { id: "ai" as const, label: "IA · Metadados", icon: Sparkles, helpId: "tab-ai" },
  { id: "upload" as const, label: "Upload", icon: Share2, helpId: "tab-upload" },
  { id: "editor" as const, label: "Editor", icon: Settings, helpId: "tab-editor" },
  { id: "terminal" as const, label: "Terminal", icon: Terminal, helpId: "tab-terminal" },
];