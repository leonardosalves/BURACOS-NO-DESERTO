import {
  Bot,
  Clapperboard,
  Layers,
  LayoutTemplate,
  Music,
  Share2,
  Sparkles,
  Terminal,
  Tv,
  Wand2,
} from "lucide-react";
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
  {
    id: "workflow" as const,
    label: "Workflow e Tarefas",
    icon: Wand2,
    helpId: "tab-workflow",
  },
  {
    id: "timeline" as const,
    label: "Roteiro e Tags",
    icon: Layers,
    helpId: "tab-timeline",
  },
  {
    id: "music" as const,
    label: "Trilha BGM",
    icon: Music,
    helpId: "tab-music",
  },
  {
    id: "ai" as const,
    label: "IA · Metadados",
    icon: Sparkles,
    helpId: "tab-ai",
  },
  {
    id: "upload" as const,
    label: "Upload",
    icon: Share2,
    helpId: "tab-upload",
  },
  {
    id: "director" as const,
    label: "Diretor",
    icon: Clapperboard,
    helpId: "tab-director",
  },
  {
    id: "editor" as const,
    label: "Editor do Lumiera",
    icon: LayoutTemplate,
    helpId: "tab-editor",
  },
  {
    id: "terminal" as const,
    label: "Terminal",
    icon: Terminal,
    helpId: "tab-terminal",
  },
  {
    id: "video-agent" as const,
    label: "Video Agent",
    icon: Bot,
    helpId: undefined,
  },
];
