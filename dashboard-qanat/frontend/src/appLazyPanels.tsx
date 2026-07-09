import type { ComponentType } from "react";
import { AgentReachPanel } from "./AgentReachPanel";
import { AppMusicTab } from "./AppMusicTab";
import { ComfyMcpPage } from "./ComfyMcpPage";
import { DashminAiChat } from "./DashminAiChat";
import { ListicleCreatorStep } from "./ListicleCreatorStep";
import { LumieraDubPanel } from "./LumieraDubPanel";
import { LumieraHomePage } from "./LumieraHomePage";
import { MotionTimelineEditor } from "./MotionTimelineEditor";
import { NarrationChunksPanel } from "./NarrationChunksPanel";
import { NarrationReplacePanel } from "./NarrationReplacePanel";
import { NarrationReviewPanel } from "./NarrationReviewPanel";
import { OverlayTimelineEditor } from "./OverlayTimelineEditor";
import { ProjectsLibraryPanel } from "./ProjectsLibraryPanel";
import { SceneTimingEditor } from "./SceneTimingEditor";
import { StudioAgents } from "./StudioAgents";
import { TrendForecastPanel } from "./TrendForecastPanel";
import { TtsVoiceStudioPanel } from "./TtsVoiceStudioPanel";
import { VideoResurrectorPanel } from "./VideoResurrectorPanel";
import { WorkflowToolkit } from "./WorkflowToolkit";
import { YoutubeStudioPanel } from "./YoutubeStudioPanel";
import { lazyPanel } from "./lazyPanel";

type PanelComponent = ComponentType<unknown>;

function staticPanel<T extends PanelComponent>(component: T): T {
  return component;
}

const useStaticUniportPanels = import.meta.env.PROD;

export const LazySceneTimingEditor = useStaticUniportPanels
  ? staticPanel(SceneTimingEditor)
  : lazyPanel(() =>
      import("./SceneTimingEditor").then((m) => ({
        default: m.SceneTimingEditor,
      }))
    );

export const LazyWorkflowToolkit = useStaticUniportPanels
  ? staticPanel(WorkflowToolkit)
  : lazyPanel(() =>
      import("./WorkflowToolkit").then((m) => ({ default: m.WorkflowToolkit }))
    );

export const LazyLumieraHomePage = useStaticUniportPanels
  ? staticPanel(LumieraHomePage)
  : lazyPanel(() =>
      import("./LumieraHomePage").then((m) => ({ default: m.LumieraHomePage }))
    );

export const LazyOverlayTimelineEditor = useStaticUniportPanels
  ? staticPanel(OverlayTimelineEditor)
  : lazyPanel(() =>
      import("./OverlayTimelineEditor").then((m) => ({
        default: m.OverlayTimelineEditor,
      }))
    );

export const LazyMotionTimelineEditor = useStaticUniportPanels
  ? staticPanel(MotionTimelineEditor)
  : lazyPanel(() =>
      import("./MotionTimelineEditor").then((m) => ({
        default: m.MotionTimelineEditor,
      }))
    );

export const LazyYoutubeStudioPanel = useStaticUniportPanels
  ? staticPanel(YoutubeStudioPanel)
  : lazyPanel(() =>
      import("./YoutubeStudioPanel").then((m) => ({
        default: m.YoutubeStudioPanel,
      }))
    );

export const LazyVideoResurrectorPanel = useStaticUniportPanels
  ? staticPanel(VideoResurrectorPanel)
  : lazyPanel(() =>
      import("./VideoResurrectorPanel").then((m) => ({
        default: m.VideoResurrectorPanel,
      }))
    );

export const LazyComfyMcpPage = useStaticUniportPanels
  ? staticPanel(ComfyMcpPage)
  : lazyPanel(() =>
      import("./ComfyMcpPage").then((m) => ({ default: m.ComfyMcpPage }))
    );

export const LazyTrendForecastPanel = useStaticUniportPanels
  ? staticPanel(TrendForecastPanel)
  : lazyPanel(() =>
      import("./TrendForecastPanel").then((m) => ({
        default: m.TrendForecastPanel,
      }))
    );

export const LazyAgentReachPanel = useStaticUniportPanels
  ? staticPanel(AgentReachPanel)
  : lazyPanel(() =>
      import("./AgentReachPanel").then((m) => ({ default: m.AgentReachPanel }))
    );

export const LazyProjectsLibraryPanel = useStaticUniportPanels
  ? staticPanel(ProjectsLibraryPanel)
  : lazyPanel(() =>
      import("./ProjectsLibraryPanel").then((m) => ({
        default: m.ProjectsLibraryPanel,
      }))
    );

export const LazyStudioAgents = useStaticUniportPanels
  ? staticPanel(StudioAgents)
  : lazyPanel(() =>
      import("./StudioAgents").then((m) => ({ default: m.StudioAgents }))
    );

export const LazyDashminAiChat = useStaticUniportPanels
  ? staticPanel(DashminAiChat)
  : lazyPanel(() =>
      import("./DashminAiChat").then((m) => ({ default: m.DashminAiChat }))
    );

export const LazyListicleCreatorStep = useStaticUniportPanels
  ? staticPanel(ListicleCreatorStep)
  : lazyPanel(() =>
      import("./ListicleCreatorStep").then((m) => ({
        default: m.ListicleCreatorStep,
      }))
    );

export const LazyNarrationReviewPanel = useStaticUniportPanels
  ? staticPanel(NarrationReviewPanel)
  : lazyPanel(() =>
      import("./NarrationReviewPanel").then((m) => ({
        default: m.NarrationReviewPanel,
      }))
    );

export const LazyNarrationChunksPanel = useStaticUniportPanels
  ? staticPanel(NarrationChunksPanel)
  : lazyPanel(() =>
      import("./NarrationChunksPanel").then((m) => ({
        default: m.NarrationChunksPanel,
      }))
    );

export const LazyTtsVoiceStudioPanel = useStaticUniportPanels
  ? staticPanel(TtsVoiceStudioPanel)
  : lazyPanel(() =>
      import("./TtsVoiceStudioPanel").then((m) => ({
        default: m.TtsVoiceStudioPanel,
      }))
    );

export const LazyLumieraDubPanel = useStaticUniportPanels
  ? staticPanel(LumieraDubPanel)
  : lazyPanel(() =>
      import("./LumieraDubPanel").then((m) => ({ default: m.LumieraDubPanel }))
    );

export const LazyNarrationReplacePanel = useStaticUniportPanels
  ? staticPanel(NarrationReplacePanel)
  : lazyPanel(() =>
      import("./NarrationReplacePanel").then((m) => ({
        default: m.NarrationReplacePanel,
      }))
    );

export const LazyAppMusicTab = useStaticUniportPanels
  ? staticPanel(AppMusicTab)
  : lazyPanel(() =>
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
