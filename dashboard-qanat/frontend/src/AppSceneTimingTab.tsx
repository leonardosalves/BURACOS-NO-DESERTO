import React from "react";
import { DashminProjectTabLayout } from "./DashminProjectTabLayout";

export type AppSceneTimingTabProps = {
  activeProject: string;
  renderTimelineStudio: () => React.ReactNode;
};

export function AppSceneTimingTab({
  activeProject,
  renderTimelineStudio,
}: AppSceneTimingTabProps) {
  return (
    <DashminProjectTabLayout tab="scene-timing" activeProject={activeProject}>
      {renderTimelineStudio()}
    </DashminProjectTabLayout>
  );
}
