import React, { Suspense } from "react";
import toast from "react-hot-toast";
import { DashminProjectTabLayout } from "./DashminProjectTabLayout";
import { LazySceneTimingEditor, TabPanelFallback } from "./appLazyPanels";
import type { ConfigData, WorkspaceStatus } from "./appTypes";

export type AppSceneTimingTabProps = {
  activeProject: string;
  config: ConfigData | null;
  status: WorkspaceStatus | null;
  storyboardData: any;
  wordTranscripts: any;
  getMusicUrl: (fileName: string, projectOverride?: string) => string;
  getAssetUrl: (fileName: string) => string;
  saveTimelinePatch: (cfg: ConfigData) => void | Promise<void>;
  saveStoryboardData?: (storyboard: any) => void | Promise<void>;
};

export function AppSceneTimingTab({
  activeProject,
  config,
  status,
  storyboardData,
  wordTranscripts,
  getMusicUrl,
  getAssetUrl,
  saveTimelinePatch,
  saveStoryboardData,
}: AppSceneTimingTabProps) {
  return (
    <DashminProjectTabLayout tab="scene-timing" activeProject={activeProject}>
      <Suspense
        fallback={<TabPanelFallback label="Carregando timing de cenas..." />}
      >
        <LazySceneTimingEditor
          activeProject={activeProject}
          config={config}
          status={status}
          storyboard={storyboardData}
          wordTranscripts={wordTranscripts}
          getMediaUrl={getMusicUrl}
          getAssetUrl={getAssetUrl}
          onSave={async (
            timelineAssets,
            impactTexts,
            updatedStoryboardOverlays
          ) => {
            if (!config) return;
            await saveTimelinePatch({
              ...config,
              timeline_assets: timelineAssets,
              impact_texts: impactTexts,
            });
            if (
              updatedStoryboardOverlays &&
              saveStoryboardData &&
              storyboardData
            ) {
              await saveStoryboardData({
                ...storyboardData,
                overlays: updatedStoryboardOverlays,
              });
            }
          }}
          toast={(msg) => toast(msg)}
        />
      </Suspense>
    </DashminProjectTabLayout>
  );
}
