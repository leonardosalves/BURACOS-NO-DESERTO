import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
let content = fs.readFileSync(appPath, "utf8");

if (content.includes("<AppTabPanels")) {
  console.log("already patched");
  process.exit(0);
}

// Remove tab lazy imports only — keep RichTimelineEditor (used by renderRichTimelineEditor in App.tsx)
content = content.replace(
  /const AppCreatorTab = lazy\(\(\) => import\('\.\/AppCreatorTab'\)[\s\S]*?const AppMusicTabPanel = lazy\(\(\) => import\('\.\/AppMusicTabPanel'\)\.then\(\(m\) => \(\{ default: m\.AppMusicTabPanel \}\)\)\);\n/,
  "",
);

content = content.replace(
  /import \{\n  LazyAgentReachPanel,\n  LazyComfyMcpPage,\n  LazyProjectsLibraryPanel,\n  LazyStudioAgents,\n  LazyTrendForecastPanel,\n  LazyVideoResurrectorPanel,\n  LazyYoutubeStudioPanel,\n  TabPanelFallback,\n\} from '\.\/appLazyPanels';\n/,
  "import { TabPanelFallback } from './appLazyPanels';\n",
);

content = content.replace("import { DashminPageLayout } from './DashminPageLayout';\n", "");
content = content.replace("import { DashminAiChat } from './DashminAiChat';\n", "");
content = content.replace("import { SectionHeader } from './SectionHeader';\n", "");

content = content.replace(
  "import { buildAppTabPropBundles } from './appTabPropBundles';",
  "import { buildAppTabPropBundles } from './appTabPropBundles';\nimport { AppOverlays } from './AppOverlays';\nconst AppTabPanels = lazy(() => import('./AppTabPanels').then((m) => ({ default: m.AppTabPanels })));",
);

const panelsStart = content.indexOf('        <div className="text-balance-safe">');
const appShellEnd = content.indexOf("      </AppShell>", panelsStart);
const overlaysStart = content.indexOf("      {/* Global Floating Chat Button */}", appShellEnd);
const overlaysEnd = content.indexOf("    </>\n\n  );", overlaysStart);

if (panelsStart < 0 || appShellEnd < 0 || overlaysStart < 0 || overlaysEnd < 0) {
  console.error("blocks not found for patch");
  process.exit(1);
}

const tabPanelsReplacement = `        <Suspense fallback={<TabPanelFallback label="Carregando painel..." />}>
          <AppTabPanels
            activeTab={activeTab}
            activeProject={activeProject}
            config={config}
            projects={projects}
            recentProjects={recentProjects}
            nicheInput={nicheInput}
            geminiBrowserMode={geminiBrowserMode}
            aiProvider={aiProvider}
            youtubeChannelAlerts={youtubeChannelAlerts}
            resurrectorAlerts={resurrectorScheduler.alerts}
            getProjectUrl={getProjectUrl}
            postAi={postAi}
            setActiveTab={setActiveTab}
            setSettingsSection={setSettingsSection}
            handleSelectProject={handleSelectProject}
            handleDeleteProject={handleDeleteProject}
            handleApplyYoutubeStudioIdea={handleApplyYoutubeStudioIdea}
            handleRelinkYoutube={handleRelinkYoutube}
            handleScheduleFromHeatmap={handleScheduleFromHeatmap}
            resolveBrowserResponse={resolveBrowserResponse}
            setYoutubeChannelAlerts={setYoutubeChannelAlerts}
            setNewProjectFormat={setNewProjectFormat}
            setNewProjectNiche={setNewProjectNiche}
            setShowCreateModal={setShowCreateModal}
            creatorTabProps={creatorTabProps}
            aiTabProps={aiTabProps}
            uploadTabProps={uploadTabProps}
            editorTabProps={editorTabProps}
            settingsTabProps={settingsTabProps}
            statusTabProps={statusTabProps}
            timelineTabProps={timelineTabProps}
            musicTabPanelProps={musicTabPanelProps}
            homeTabProps={homeTabProps}
            workflowTabProps={workflowTabProps}
            sceneTimingTabProps={sceneTimingTabProps}
            terminalTabProps={terminalTabProps}
          />
        </Suspense>
      </AppShell>

`;

const overlaysReplacement = `      <AppOverlays
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        chatMessages={chatMessages}
        chatLoading={chatLoading}
        chatInput={chatInput}
        setChatInput={setChatInput}
        handleSendChatMessage={handleSendChatMessage}
        hasApiKey={hasApiKey}
        chatEndRef={chatEndRef}
        aiProviderBadge={aiProviderBadge}
        setActiveTab={setActiveTab}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        newProjectFormat={newProjectFormat}
        setNewProjectFormat={setNewProjectFormat}
        newProjectNiche={newProjectNiche}
        setNewProjectNiche={setNewProjectNiche}
        handleCreateProject={handleCreateProject}
        pendingMusicDelete={pendingMusicDelete}
        setPendingMusicDelete={setPendingMusicDelete}
        deletingMusic={deletingMusic}
        handleConfirmDeleteMusic={handleConfirmDeleteMusic}
        musicFiles={musicFiles}
        getFormatBytes={getFormatBytes}
        pendingOutputDelete={pendingOutputDelete}
        setPendingOutputDelete={setPendingOutputDelete}
        deletingOutput={deletingOutput}
        handleDeleteOutputVideo={handleDeleteOutputVideo}
        previewVideoUrl={previewVideoUrl}
        setPreviewVideoUrl={setPreviewVideoUrl}
        renderProgress={renderProgress}
        setRenderProgress={setRenderProgress}
      />

    </>

  );

}`;

content =
  content.slice(0, panelsStart) +
  tabPanelsReplacement +
  overlaysReplacement;

fs.writeFileSync(appPath, content, "utf8");
console.log("patched App.tsx");