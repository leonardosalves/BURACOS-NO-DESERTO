import { lazy } from "react";

export const LazySceneTimingEditor = lazy(() =>
  import("./SceneTimingEditor").then((m) => ({ default: m.SceneTimingEditor }))
);

export const LazyWorkflowToolkit = lazy(() =>
  import("./WorkflowToolkit").then((m) => ({ default: m.WorkflowToolkit }))
);

export const LazyLumieraHomePage = lazy(() =>
  import("./LumieraHomePage").then((m) => ({ default: m.LumieraHomePage }))
);

export const LazyOverlayTimelineEditor = lazy(() =>
  import("./OverlayTimelineEditor").then((m) => ({
    default: m.OverlayTimelineEditor,
  }))
);

export const LazyMotionTimelineEditor = lazy(() =>
  import("./MotionTimelineEditor").then((m) => ({
    default: m.MotionTimelineEditor,
  }))
);

export const LazyYoutubeStudioPanel = lazy(() =>
  import("./YoutubeStudioPanel").then((m) => ({
    default: m.YoutubeStudioPanel,
  }))
);

export const LazyVideoResurrectorPanel = lazy(() =>
  import("./VideoResurrectorPanel").then((m) => ({
    default: m.VideoResurrectorPanel,
  }))
);

export const LazyComfyMcpPage = lazy(() =>
  import("./ComfyMcpPage").then((m) => ({ default: m.ComfyMcpPage }))
);

export const LazyTrendForecastPanel = lazy(() =>
  import("./TrendForecastPanel").then((m) => ({
    default: m.TrendForecastPanel,
  }))
);

export const LazyAgentReachPanel = lazy(() =>
  import("./AgentReachPanel").then((m) => ({ default: m.AgentReachPanel }))
);

export const LazyProjectsLibraryPanel = lazy(() =>
  import("./ProjectsLibraryPanel").then((m) => ({
    default: m.ProjectsLibraryPanel,
  }))
);

export const LazyStudioAgents = lazy(() =>
  import("./StudioAgents").then((m) => ({ default: m.StudioAgents }))
);

export const LazyDashminAiChat = lazy(() =>
  import("./DashminAiChat").then((m) => ({ default: m.DashminAiChat }))
);

export const LazyListicleCreatorStep = lazy(() =>
  import("./ListicleCreatorStep").then((m) => ({
    default: m.ListicleCreatorStep,
  }))
);

export const LazyNarrationReviewPanel = lazy(() =>
  import("./NarrationReviewPanel").then((m) => ({
    default: m.NarrationReviewPanel,
  }))
);

export const LazyNarrationChunksPanel = lazy(() =>
  import("./NarrationChunksPanel").then((m) => ({
    default: m.NarrationChunksPanel,
  }))
);

export const LazyTtsVoiceStudioPanel = lazy(() =>
  import("./TtsVoiceStudioPanel").then((m) => ({
    default: m.TtsVoiceStudioPanel,
  }))
);

export const LazyLumieraDubPanel = lazy(() =>
  import("./LumieraDubPanel").then((m) => ({ default: m.LumieraDubPanel }))
);

export const LazyNarrationReplacePanel = lazy(() =>
  import("./NarrationReplacePanel").then((m) => ({
    default: m.NarrationReplacePanel,
  }))
);

export const LazyAppMusicTab = lazy(() =>
  import("./AppMusicTab").then((m) => ({ default: m.AppMusicTab }))
);

export function TabPanelFallback({
  label = "Carregando...",
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[40vh] text-zinc-400 text-sm font-sans">
      {label}
    </div>
  );
}
