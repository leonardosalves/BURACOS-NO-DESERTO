import React from 'react';
import { DashminProjectTabLayout } from './DashminProjectTabLayout';
import { FlowStudioPage } from './FlowStudioPage';
import type { ConfigData, WorkspaceStatus } from './appTypes';
import type { AppTab } from './appTabs';

export type AppFlowStudioTabProps = {
  activeProject: string;
  config: ConfigData | null;
  storyboardData: { visual_prompts?: any[] } | null;
  status: WorkspaceStatus | null;
  wordTranscripts: unknown[];
  getAssetUrl: (fileName: string) => string;
  handleUploadSceneAsset: (
    sceneNum: number,
    type: 'video' | 'image',
    file: File,
    assetIdx?: number,
  ) => void | Promise<void>;
  setActiveTab: (tab: AppTab) => void;
};

export function AppFlowStudioTab({
  activeProject,
  config,
  storyboardData,
  status,
  wordTranscripts,
  getAssetUrl,
  handleUploadSceneAsset,
  setActiveTab,
}: AppFlowStudioTabProps) {
  return (
    <DashminProjectTabLayout tab="flow-studio" activeProject={activeProject}>
      <div className="lumiera-panel-stack min-w-0">
        {activeProject ? (
          <FlowStudioPage
            activeProject={activeProject}
            config={config}
            storyboardData={storyboardData}
            status={status}
            wordTranscripts={wordTranscripts}
            getAssetUrl={getAssetUrl}
            onUpload={(blockNum, type, file, assetIdx) =>
              handleUploadSceneAsset(blockNum, type, file, assetIdx)
            }
            onOpenCreator={() => setActiveTab('creator')}
          />
        ) : (
          <div className="glass-panel p-8 rounded-2xl text-center text-zinc-500 text-sm">
            Selecione um projeto na barra lateral.
          </div>
        )}
      </div>
    </DashminProjectTabLayout>
  );
}