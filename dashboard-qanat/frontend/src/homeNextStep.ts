import type { WorkspaceStatus } from "./appTypes";

export type HomeNextStep = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryTab:
    "creator" | "workflow" | "music" | "timeline" | "status" | "upload" | "ai";
  secondaryLabel?: string;
  secondaryTab?: "projects" | "flow-lab" | "creator" | "ai" | "workflow";
};

type Input = {
  status?: WorkspaceStatus | null;
  outputCount: number;
  rendering?: boolean;
  renderPercent?: number;
  videoQualityScore?: number;
  assetsCount?: number;
};

export function deriveHomeNextStep(input: Input): HomeNextStep {
  const {
    status,
    outputCount,
    rendering,
    renderPercent,
    videoQualityScore,
    assetsCount = status?.assets_count ?? 0,
  } = input;

  if (rendering) {
    return {
      eyebrow: "Render ativo",
      title:
        renderPercent != null
          ? `Renderizando — ${renderPercent}%`
          : "Render em andamento",
      description: "Acompanhe logs, progresso e saída na aba Render.",
      primaryLabel: "Abrir Render",
      primaryTab: "status",
      secondaryLabel: "Metadados IA",
      secondaryTab: "ai",
    };
  }

  if (outputCount > 0) {
    return {
      eyebrow: "Pronto para publicar",
      title: `${outputCount} vídeo(s) no OUTPUT`,
      description:
        "Gere títulos, tags e thumbnails antes do upload multi-plataforma.",
      primaryLabel: "Ir para Upload",
      primaryTab: "upload",
      secondaryLabel: "Metadados IA",
      secondaryTab: "ai",
    };
  }

  if (!status?.has_config) {
    return {
      eyebrow: "Projeto novo ou incompleto",
      title: "Configure o workspace",
      description:
        "Crie com o Wizard IA ou abra o Workflow para carregar config e assets.",
      primaryLabel: "Novo projeto com IA",
      primaryTab: "creator",
      secondaryLabel: "Abrir Workflow",
      secondaryTab: "workflow",
    };
  }

  if (!status?.has_narration) {
    return {
      eyebrow: "Narração pendente",
      title: "Gere TTS e sincronize timings",
      description:
        assetsCount > 0
          ? `${assetsCount} asset(s) no projeto — falta narração e alinhamento de cenas.`
          : "O Workflow prepara narração, trechos e duração por cena.",
      primaryLabel: "Abrir Workflow",
      primaryTab: "workflow",
      secondaryLabel: "Novo roteiro IA",
      secondaryTab: "creator",
    };
  }

  if (!status?.has_soundtrack) {
    return {
      eyebrow: "Trilha pendente",
      title: "Defina BGM por bloco ou emoção",
      description:
        "Narração pronta — escolha trilhas Epidemic Sound ou mix automático.",
      primaryLabel: "Abrir Trilha BGM",
      primaryTab: "music",
    };
  }

  if (videoQualityScore != null && videoQualityScore < 70) {
    return {
      eyebrow: "Qualidade pré-render",
      title: `Score ${videoQualityScore}/100 — revisar antes do PRO`,
      description:
        "Ajuste roteiro, overlays e keywords na timeline antes de renderizar.",
      primaryLabel: "Revisar Roteiro",
      primaryTab: "timeline",
      secondaryLabel: "Workflow",
      secondaryTab: "workflow",
    };
  }

  return {
    eyebrow: "Pipeline quase completo",
    title: "Iniciar render Remotion PRO",
    description: "Narração e trilha prontas — gere o vídeo final em OUTPUT.",
    primaryLabel: "Abrir Render",
    primaryTab: "status",
    secondaryLabel: "Metadados IA",
    secondaryTab: "ai",
  };
}

export type HomeNavTarget =
  HomeNextStep["primaryTab"] | NonNullable<HomeNextStep["secondaryTab"]>;

export function homeTabForNextStep(
  tab: HomeNavTarget
): import("./appTabs").AppTab | null {
  const map: Record<string, import("./appTabs").AppTab> = {
    creator: "creator",
    workflow: "workflow",
    music: "music",
    timeline: "timeline",
    status: "status",
    upload: "upload",
    ai: "ai",
    projects: "projects",
    "flow-lab": "flow-lab",
  };
  return map[tab] ?? null;
}
