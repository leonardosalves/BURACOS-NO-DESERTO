import React, { Suspense } from "react";
import toast from "react-hot-toast";
import { DashminProjectTabLayout } from "./DashminProjectTabLayout";
import { LazyWorkflowToolkit, TabPanelFallback } from "./appLazyPanels";
import type { AppTab } from "./appTabs";
import type { ConfigData, WorkspaceStatus } from "./appTypes";
import type { AiFetchResult } from "./WorkflowToolkit";

export type AppWorkflowTabProps = {
  activeProject: string;
  activeTab: AppTab;
  config: ConfigData | null;
  status: WorkspaceStatus | null;
  getProjectUrl: (path: string) => string;
  getMusicUrl: (fileName: string, projectOverride?: string) => string;
  postAi: (path: string, body: unknown) => Promise<AiFetchResult | any>;
  fetchData: (opts?: { includeVideoQuality?: boolean }) => void | Promise<void>;
  setActiveTab: (tab: AppTab) => void;
};

export function AppWorkflowTab({
  activeProject,
  activeTab,
  config,
  status,
  getProjectUrl,
  getMusicUrl,
  postAi,
  fetchData,
  setActiveTab,
}: AppWorkflowTabProps) {
  return (
    <DashminProjectTabLayout tab="workflow" activeProject={activeProject}>
      <div className="lumiera-panel-stack">
        {config ? (
          <Suspense
            fallback={<TabPanelFallback label="Carregando workflow..." />}
          >
            <LazyWorkflowToolkit
              getProjectUrl={getProjectUrl}
              getMediaUrl={getMusicUrl}
              postAi={postAi}
              toast={(msg) => toast(msg)}
              enabled={activeTab === "workflow"}
              hasNarration={!!status?.has_narration}
              hasTimings={!!status?.block_timings}
              onNarrationReady={() => fetchData()}
              onTimelineRefresh={() => fetchData()}
              onMetadataReady={() => fetchData({ includeVideoQuality: true })}
              onNavigateTab={(tab) => setActiveTab(tab as AppTab)}
            />
          </Suspense>
        ) : (
          <div className="glass-panel p-8 rounded-2xl text-center text-zinc-500 text-sm">
            Selecione um projeto para ver as ferramentas de workflow.
          </div>
        )}
      </div>
    </DashminProjectTabLayout>
  );
}
