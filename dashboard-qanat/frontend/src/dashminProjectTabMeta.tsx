import type { ElementType } from "react";
import {
  Bot,
  Clapperboard,
  Layers,
  Music,
  Settings,
  Share2,
  Sparkles,
  Terminal,
  Tv,
  Wand2,
} from "lucide-react";

export type DashProjectTabId =
  | "status"
  | "workflow"
  | "timeline"
  | "music"
  | "ai"
  | "upload"
  | "director"
  | "editor"
  | "terminal"
  | "video-agent";

export type DashProjectTabMeta = {
  id: DashProjectTabId;
  title: string;
  subtitle: string;
  icon: ElementType;
};

export const DASH_PROJECT_TAB_META: Record<
  DashProjectTabId,
  DashProjectTabMeta
> = {
  status: {
    id: "status",
    title: "Render",
    subtitle: "Compilação, qualidade pré-render e vídeos no OUTPUT.",
    icon: Tv,
  },
  workflow: {
    id: "workflow",
    title: "Workflow e Tarefas",
    subtitle:
      "Narração TTS, B-roll, trilha e pipelines — prepare o projeto antes do render.",
    icon: Wand2,
  },
  timeline: {
    id: "timeline",
    title: "Roteiro e Tags",
    subtitle:
      "Palavras-chave em destaque (Gold) e textos de impacto por bloco.",
    icon: Layers,
  },
  music: {
    id: "music",
    title: "Trilha BGM",
    subtitle: "Epidemic Sound, trilhas por bloco e música única do projeto.",
    icon: Music,
  },
  ai: {
    id: "ai",
    title: "IA · Metadados",
    subtitle: "Títulos, descrição, tags, thumbnails e experimentos YouTube.",
    icon: Sparkles,
  },
  upload: {
    id: "upload",
    title: "Upload",
    subtitle: "Distribuição multi-plataforma e metadados por rede.",
    icon: Share2,
  },
  director: {
    id: "director",
    title: "Diretor",
    subtitle:
      "Direção temporal de B-roll, motion, narração, legendas e transições.",
    icon: Clapperboard,
  },
  editor: {
    id: "editor",
    title: "Editor",
    subtitle: "Substitua narração, imagens, vídeos ou trilhas por bloco.",
    icon: Settings,
  },
  terminal: {
    id: "terminal",
    title: "Terminal",
    subtitle: "Console de compilação, logs e diagnóstico do render.",
    icon: Terminal,
  },
  "video-agent": {
    id: "video-agent",
    title: "Video Agent",
    subtitle:
      "Companion mode: dirija a criação do vídeo com storyboard HyperFrames, gráficos e overlays.",
    icon: Bot,
  },
};
