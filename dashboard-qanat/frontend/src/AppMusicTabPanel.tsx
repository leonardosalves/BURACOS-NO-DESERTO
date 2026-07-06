import React, { Suspense, lazy } from "react";
import { RefreshCw } from "lucide-react";
import { TabErrorBoundary } from "./TabErrorBoundary";
import { TabPanelFallback } from "./appLazyPanels";
import type { AppMusicTabProps } from "./AppMusicTab";

const LazyAppMusicTab = lazy(() =>
  import("./AppMusicTab").then((m) => ({ default: m.AppMusicTab }))
);

export type AppMusicTabPanelProps = AppMusicTabProps & {
  projectDataLoading: boolean;
  fetchData: () => void | Promise<void>;
};

export function AppMusicTabPanel({
  projectDataLoading,
  fetchData,
  config,
  ...musicProps
}: AppMusicTabPanelProps) {
  return (
    <TabErrorBoundary tabName="Trilha BGM">
      {!config ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-zinc-400 font-sans">
          <RefreshCw
            className={`w-8 h-8 text-gold-500 ${projectDataLoading ? "animate-spin" : ""}`}
          />
          <p className="text-sm">
            {projectDataLoading
              ? "Carregando trilhas do projeto..."
              : "Não foi possível carregar a configuração do projeto."}
          </p>
          {!projectDataLoading && (
            <button
              type="button"
              onClick={() => fetchData()}
              className="text-xs text-gold-400 hover:text-gold-300 border border-gold-500/30 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Tentar novamente
            </button>
          )}
        </div>
      ) : (
        <Suspense fallback={<TabPanelFallback label="Carregando trilhas..." />}>
          <LazyAppMusicTab
            config={config}
            fetchData={fetchData}
            {...musicProps}
          />
        </Suspense>
      )}
    </TabErrorBoundary>
  );
}
