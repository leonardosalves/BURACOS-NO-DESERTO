import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
let content = fs.readFileSync(appPath, "utf8");

const lazyImports = `const AppHomeTab = lazy(() => import('./AppHomeTab').then((m) => ({ default: m.AppHomeTab })));
const AppWorkflowTab = lazy(() => import('./AppWorkflowTab').then((m) => ({ default: m.AppWorkflowTab })));
const AppSceneTimingTab = lazy(() => import('./AppSceneTimingTab').then((m) => ({ default: m.AppSceneTimingTab })));
const AppTerminalTab = lazy(() => import('./AppTerminalTab').then((m) => ({ default: m.AppTerminalTab })));
const AppMusicTabPanel = lazy(() => import('./AppMusicTabPanel').then((m) => ({ default: m.AppMusicTabPanel })));`;

if (!content.includes("AppHomeTab")) {
  content = content.replace(
    "const AppSettingsTab = lazy(() => import('./AppSettingsTab').then((m) => ({ default: m.AppSettingsTab })));",
    `const AppSettingsTab = lazy(() => import('./AppSettingsTab').then((m) => ({ default: m.AppSettingsTab })));\n${lazyImports}`,
  );
}

const CREATOR_PROPS = [
  "activeProject", "applyMetadataToUpload", "applyWizardSessionPatch", "config", "copiedSection",
  "copyToClipboard", "creatorIdeasBundle", "creatorLoading", "creatorLoadingMode", "creatorProjectName",
  "creatorScenesNeedRepair", "creatorStep", "customBlocks", "customHooks", "customIdeaBlocks",
  "customIdeaEmotion", "customIdeaHook", "customIdeaPromise", "customIdeaTitle", "customOutline",
  "customTitle", "dragActive", "editorialIdeaImport", "expandedBlocks", "fetchData", "formatSelector",
  "geminiBrowserMode", "generateYoutubeMetadata", "generatedScriptData", "getAssetUrl", "getMusicUrl",
  "getProjectUrl", "handleApproveNarrationAndGenerateScript", "handleCaptureGeminiNarration", "handleDrag",
  "handleDrop", "handleEnhanceVisualPrompts", "handleEvaluateScriptChecklist", "handleFileInput",
  "handleGenerateFullScript", "handleGenerateIdeas", "handleGenerateListicleScript", "handleGenerateNarration",
  "handleGenerateNarrationFromImport", "handleGenerateYoutubeThumbnailImages", "handleNotebooklmImproveNarrationDraft",
  "handleRemoveSceneAsset", "handleSaveConfig", "handleSuggestListicleRankings", "handleSyncTimings",
  "handleUpdateCreatorScene", "handleUploadSceneAsset", "hasApiKey", "ideasData", "ideationTab",
  "leaveGlobalViewForProject", "listNiche", "listTopic", "listicleHudStyle", "listicleIdeasData", "mixBGM",
  "mixing", "narrationBlockPhrases", "narrationBlockScript", "narrationDraft", "narrationNotebooklmEnriched",
  "narrationProjectName", "narrationStrategy", "narrationTaggedDraft", "nicheInput", "notebooklmImproving",
  "notebooklmStatus", "rankCount", "rankOrder", "renderRichTimelineEditor", "rendering", "resetCreatorWizard",
  "saveConfigPatch", "saveWizardSession", "selectedIdeaIndex", "selectedListicleIdeaIndex", "setConfig",
  "setCreatorProjectName", "setCreatorStep", "setCustomBlocks", "setCustomHooks", "setCustomIdeaBlocks",
  "setCustomIdeaEmotion", "setCustomIdeaHook", "setCustomIdeaPromise", "setCustomIdeaTitle", "setCustomOutline",
  "setCustomTitle", "setEditorialIdeaImport", "setExpandedBlocks", "setFormatSelector", "setIdeasData",
  "setIdeationTab", "setListNiche", "setListTopic", "setListicleHudStyle", "setNarrationDraft",
  "setNarrationTaggedDraft", "setNicheInput", "setRankCount", "setRankOrder", "setSelectedIdeaIndex",
  "setSelectedListicleIdeaIndex", "setTaggedNarrations", "setUploadSuccess", "setUseNotebooklm",
  "showNarrationReview", "status", "storyboardData", "syncCreatorStoryboard", "syncingTimings",
  "taggedNarrations", "timelineAssets", "triggerRender", "uploadSuccess", "uploadedScenes",
  "uploadingNarration", "useNotebooklm", "wizardSavedAtLabel", "wordTranscripts", "youtubeLoading",
  "youtubeMetadata", "youtubeMetadataParsed",
];

if (!content.includes("creatorTabProps")) {
  if (!content.includes("AppCreatorTabProps")) {
    content = content.replace(
      "import { buildThumbnailBrief, normalizeYoutubeMetadataDisplay } from './youtubeMetadataDisplay';",
      "import { buildThumbnailBrief, normalizeYoutubeMetadataDisplay } from './youtubeMetadataDisplay';\nimport type { AppCreatorTabProps } from './AppCreatorTab';",
    );
  }
  const shorthand = CREATOR_PROPS.map((p) => `    ${p},`).join("\n");
  content = content.replace(
    "  return (\n\n    <>",
    `  const creatorTabProps: AppCreatorTabProps = {\n${shorthand}\n  };\n\n  return (\n\n    <>`,
  );
}

// Replace home tab
content = content.replace(
  /\{activeTab === 'home' && \([\s\S]*?\)\}\n\n          \{\/\* TAB: RENDER \*\//,
  `{activeTab === 'home' && (
            <TabErrorBoundary tabName="Início">
              <Suspense fallback={<TabPanelFallback label="Carregando início..." />}>
                <AppHomeTab
                  projects={projects}
                  activeProject={activeProject}
                  recentProjects={recentProjects}
                  status={status}
                  videoQualityScore={videoQuality?.score}
                  outputCount={outputs.length}
                  youtubeAlerts={youtubeChannelAlerts?.badgeCount ?? 0}
                  hotVideos={youtubeChannelAlerts?.hotVideos}
                  rendering={rendering}
                  renderPercent={renderProgress?.percent}
                  openCreatorTab={openCreatorTab}
                  setActiveTab={setActiveTab}
                />
              </Suspense>
            </TabErrorBoundary>
          )}

          {/* TAB: RENDER */`,
);

// workflow
content = content.replace(
  /\{activeTab === 'workflow' && \([\s\S]*?\)\}\n\n          \{activeTab === 'scene-timing'/,
  `{activeTab === 'workflow' && (
            <TabErrorBoundary tabName="Workflow">
              <Suspense fallback={<TabPanelFallback label="Carregando workflow..." />}>
                <AppWorkflowTab
                  activeProject={activeProject}
                  activeTab={activeTab}
                  config={config}
                  status={status}
                  getProjectUrl={getProjectUrl}
                  getMusicUrl={getMusicUrl}
                  postAi={postAi}
                  fetchData={fetchData}
                  setActiveTab={setActiveTab}
                />
              </Suspense>
            </TabErrorBoundary>
          )}

          {activeTab === 'scene-timing'`,
);

// scene-timing
content = content.replace(
  /\{activeTab === 'scene-timing' && \([\s\S]*?\)\}\n\n          \{\/\* TAB: TIMELINE/,
  `{activeTab === 'scene-timing' && (
            <TabErrorBoundary tabName="Timing de cenas">
              <Suspense fallback={<TabPanelFallback label="Carregando timing..." />}>
                <AppSceneTimingTab
                  activeProject={activeProject}
                  config={config}
                  status={status}
                  storyboardData={storyboardData}
                  wordTranscripts={wordTranscripts}
                  getMusicUrl={getMusicUrl}
                  getAssetUrl={getAssetUrl}
                  saveTimelinePatch={saveTimelinePatch}
                />
              </Suspense>
            </TabErrorBoundary>
          )}

          {/* TAB: TIMELINE`,
);

// terminal
content = content.replace(
  /\{activeTab === 'terminal' && \([\s\S]*?\)\}\n\n          \{\/\* TAB 5: AI AGENT \*\//,
  `{activeTab === 'terminal' && (
            <TabErrorBoundary tabName="Terminal">
              <Suspense fallback={<TabPanelFallback label="Carregando terminal..." />}>
                <AppTerminalTab
                  activeProject={activeProject}
                  logs={logs}
                  setLogs={setLogs}
                  terminalEndRef={terminalEndRef}
                />
              </Suspense>
            </TabErrorBoundary>
          )}

          {/* TAB 5: AI AGENT */`,
);

// music - replace large block with AppMusicTabPanel
const musicStart = content.indexOf("{activeTab === 'music' && (");
const musicEnd = content.indexOf("{/* TAB 4: COMPILATION TERMINAL */}");
if (musicStart >= 0 && musicEnd > musicStart) {
  const musicReplacement = `{activeTab === 'music' && (
            <Suspense fallback={<TabPanelFallback label="Carregando trilhas..." />}>
              <AppMusicTabPanel
                projectDataLoading={projectDataLoading}
                fetchData={fetchData}
                config={config}
                activeProject={activeProject}
                mixing={mixing}
                mixBGM={mixBGM}
                globalMusicVolume={globalMusicVolume}
                activeBgmMode={activeBgmMode}
                isShortVideo={isShortVideo}
                saveConfig={saveConfig}
                planningBgmEmotions={planningBgmEmotions}
                hasApiKey={hasApiKey}
                handlePlanBgmEmotions={handlePlanBgmEmotions}
                bgmEmotionRows={bgmEmotionRows}
                safeMusicFiles={safeMusicFiles}
                handleEmotionMusicChange={handleEmotionMusicChange}
                playingMusic={playingMusic}
                togglePlayMusic={togglePlayMusic}
                bgmSuggestions={bgmSuggestions}
                bgmBlockRows={bgmBlockRows}
                handleMusicChange={handleMusicChange}
                searchMusic={searchMusic}
                setSearchMusic={setSearchMusic}
                handleDeleteAllMusic={handleDeleteAllMusic}
                getProjectUrl={getProjectUrl}
                suggestingBGM={suggestingBGM}
                handleSuggestBGM={handleSuggestBGM}
                handleDeleteMusic={handleDeleteMusic}
                getFormatBytes={getFormatBytes}
                hasEpidemicKey={hasEpidemicKey}
                autoSoundtracking={autoSoundtracking}
                handleAutoSoundtrack={handleAutoSoundtrack}
                epidemicSearchType={epidemicSearchType}
                setEpidemicSearchType={setEpidemicSearchType}
                setEpidemicSearchResults={setEpidemicSearchResults}
                epidemicSearchQuery={epidemicSearchQuery}
                setEpidemicSearchQuery={setEpidemicSearchQuery}
                handleSearchEpidemic={handleSearchEpidemic}
                searchingEpidemic={searchingEpidemic}
                safeEpidemicResults={safeEpidemicResults}
                downloadingEpidemicId={downloadingEpidemicId}
                handleDownloadEpidemic={handleDownloadEpidemic}
                storyboardData={storyboardData}
              />
            </Suspense>
          )}

          `;
  content = content.slice(0, musicStart) + musicReplacement + content.slice(musicEnd);
}

// creator spread
const creatorStart = content.indexOf("<AppCreatorTab\n");
if (creatorStart >= 0) {
  const creatorEnd = content.indexOf("/>\n              </Suspense>\n            </TabErrorBoundary>\n          )}\n\n        </div>\n      </AppShell>", creatorStart);
  if (creatorEnd > creatorStart) {
    content =
      content.slice(0, creatorStart) +
      "<AppCreatorTab {...creatorTabProps} />\n              " +
      content.slice(creatorEnd);
  }
}

// Remove unused AppMusicTab lazy if present
content = content.replace(
  "const AppMusicTab = lazy(() => import('./AppMusicTab').then((m) => ({ default: m.AppMusicTab })));\n",
  "",
);

fs.writeFileSync(appPath, content);
console.log("patched App.tsx small tabs + creator spread");