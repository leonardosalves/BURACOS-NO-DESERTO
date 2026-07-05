import React from "react";
import { LazyLumieraHomePage } from "./appLazyPanels";
import { getYoutubeViewsThreshold } from "./youtubeStudioPrefs";
import type { AppTab } from "./appTabs";
import type { ProjectListItem } from "./ProjectsLibraryPanel";
import type { WorkspaceStatus } from "./appTypes";
import type { YoutubeChannelAlerts } from "./YoutubeStudioPanel";

export type AppHomeTabProps = {
  projects: ProjectListItem[];
  activeProject: string;
  recentProjects: string[];
  status: WorkspaceStatus | null;
  videoQualityScore?: number;
  outputCount: number;
  youtubeAlerts: number;
  hotVideos?: YoutubeChannelAlerts["hotVideos"];
  rendering: boolean;
  renderPercent?: number;
  openCreatorTab: () => void;
  setActiveTab: (tab: AppTab) => void;
  onSelectProject: (name: string) => void;
};

export function AppHomeTab({
  projects,
  activeProject,
  recentProjects,
  status,
  videoQualityScore,
  outputCount,
  youtubeAlerts,
  hotVideos,
  rendering,
  renderPercent,
  openCreatorTab,
  setActiveTab,
  onSelectProject,
}: AppHomeTabProps) {
  return (
    <LazyLumieraHomePage
      projects={projects}
      activeProject={activeProject}
      recentProjects={recentProjects}
      status={status}
      videoQualityScore={videoQualityScore}
      outputCount={outputCount}
      youtubeAlerts={youtubeAlerts}
      hotVideos={hotVideos}
      rendering={rendering}
      renderPercent={renderPercent}
      viewsThreshold={getYoutubeViewsThreshold()}
      onOpenCreator={openCreatorTab}
      onOpenProjects={() => setActiveTab("projects")}
      onOpenWorkflow={() => setActiveTab("workflow")}
      onOpenTimeline={() => setActiveTab("timeline")}
      onOpenMusic={() => setActiveTab("music")}
      onOpenRender={() => setActiveTab("status")}
      onOpenUpload={() => setActiveTab("upload")}
      onOpenMetadata={() => setActiveTab("ai")}
      onOpenYoutube={() => setActiveTab("youtube-studio")}
      onSelectProject={onSelectProject}
      setActiveTab={setActiveTab}
    />
  );
}
