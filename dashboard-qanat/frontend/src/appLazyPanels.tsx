import { AgentReachPanel } from "./AgentReachPanel";
import { AppMusicTab } from "./AppMusicTab";
import { DashminAiChat } from "./DashminAiChat";
import { FlowLabPage } from "./FlowLabPage";
import { ListicleCreatorStep } from "./ListicleCreatorStep";
import { LumieraDubPanel } from "./LumieraDubPanel";
import { LumieraHomePage } from "./LumieraHomePage";
import { MotionTimelineEditor } from "./MotionTimelineEditor";
import { NarrationChunksPanel } from "./NarrationChunksPanel";
import { NarrationReplacePanel } from "./NarrationReplacePanel";
import { NarrationReviewPanel } from "./NarrationReviewPanel";
import { OverlayTimelineEditor } from "./OverlayTimelineEditor";
import { ProjectsLibraryPanel } from "./ProjectsLibraryPanel";
import { StudioAgents } from "./StudioAgents";
import { TrendForecastPanel } from "./TrendForecastPanel";
import { TtsVoiceStudioPanel } from "./TtsVoiceStudioPanel";
import { VideoResurrectorPanel } from "./VideoResurrectorPanel";
import { WorkflowToolkit } from "./WorkflowToolkit";
import { YoutubeStudioPanel } from "./YoutubeStudioPanel";
import { VideoMonitorPage } from "./VideoMonitorPage";

/** Uniport: imports estáticos — sem lazy chunks que quebram após deploy. */
export const LazyWorkflowToolkit = WorkflowToolkit;
export const LazyLumieraHomePage = LumieraHomePage;
export const LazyOverlayTimelineEditor = OverlayTimelineEditor;
export const LazyMotionTimelineEditor = MotionTimelineEditor;
export const LazyYoutubeStudioPanel = YoutubeStudioPanel;
export const LazyVideoResurrectorPanel = VideoResurrectorPanel;
export const LazyTrendForecastPanel = TrendForecastPanel;
export const LazyAgentReachPanel = AgentReachPanel;
export const LazyProjectsLibraryPanel = ProjectsLibraryPanel;
export const LazyStudioAgents = StudioAgents;
export const LazyDashminAiChat = DashminAiChat;
export const LazyListicleCreatorStep = ListicleCreatorStep;
export const LazyNarrationReviewPanel = NarrationReviewPanel;
export const LazyNarrationChunksPanel = NarrationChunksPanel;
export const LazyTtsVoiceStudioPanel = TtsVoiceStudioPanel;
export const LazyLumieraDubPanel = LumieraDubPanel;
export const LazyNarrationReplacePanel = NarrationReplacePanel;
export const LazyAppMusicTab = AppMusicTab;
export const LazyFlowLabPage = FlowLabPage;
/** RemotionTemplateStudio removido da navegação — use Editor do Lumiera (tab templates). */
export const LazyVideoMonitorPage = VideoMonitorPage;

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
