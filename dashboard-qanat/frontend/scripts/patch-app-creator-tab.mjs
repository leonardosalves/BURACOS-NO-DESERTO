import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const startIdx = lines.findIndex((l) => l.includes("{activeTab === 'creator'"));
const shellClose = lines.findIndex((l) => l.trim() === "</AppShell>");

let endIdx = -1;
if (startIdx >= 0 && shellClose >= 0) {
  for (let i = shellClose - 1; i > startIdx; i--) {
    if (lines[i].trim() === "</div>" && lines[i + 1]?.trim() === "</AppShell>") {
      for (let j = i - 1; j > startIdx; j--) {
        if (lines[j].trim() === ")}") {
          endIdx = j + 1;
          break;
        }
      }
      break;
    }
  }
}

if (startIdx < 0 || endIdx < 0) {
  console.error("markers not found", startIdx, endIdx);
  process.exit(1);
}

const PROPS = [
  "activeProject",
  "applyMetadataToUpload",
  "applyWizardSessionPatch",
  "config",
  "copiedSection",
  "copyToClipboard",
  "creatorIdeasBundle",
  "creatorLoading",
  "creatorLoadingMode",
  "creatorProjectName",
  "creatorScenesNeedRepair",
  "creatorStep",
  "customBlocks",
  "customHooks",
  "customIdeaBlocks",
  "customIdeaEmotion",
  "customIdeaHook",
  "customIdeaPromise",
  "customIdeaTitle",
  "customOutline",
  "customTitle",
  "dragActive",
  "editorialIdeaImport",
  "expandedBlocks",
  "fetchData",
  "formatSelector",
  "geminiBrowserMode",
  "generateYoutubeMetadata",
  "generatedScriptData",
  "getAssetUrl",
  "getMusicUrl",
  "getProjectUrl",
  "handleApproveNarrationAndGenerateScript",
  "handleCaptureGeminiNarration",
  "handleDrag",
  "handleDrop",
  "handleEnhanceVisualPrompts",
  "handleEvaluateScriptChecklist",
  "handleFileInput",
  "handleGenerateFullScript",
  "handleGenerateIdeas",
  "handleGenerateListicleScript",
  "handleGenerateNarration",
  "handleGenerateNarrationFromImport",
  "handleGenerateYoutubeThumbnailImages",
  "handleNotebooklmImproveNarrationDraft",
  "handleRemoveSceneAsset",
  "handleSaveConfig",
  "handleSuggestListicleRankings",
  "handleSyncTimings",
  "handleUpdateCreatorScene",
  "handleUploadSceneAsset",
  "hasApiKey",
  "ideasData",
  "ideationTab",
  "leaveGlobalViewForProject",
  "listNiche",
  "listTopic",
  "listicleHudStyle",
  "listicleIdeasData",
  "mixBGM",
  "mixing",
  "narrationBlockPhrases",
  "narrationBlockScript",
  "narrationDraft",
  "narrationNotebooklmEnriched",
  "narrationProjectName",
  "narrationStrategy",
  "narrationTaggedDraft",
  "nicheInput",
  "notebooklmImproving",
  "notebooklmStatus",
  "rankCount",
  "rankOrder",
  "renderRichTimelineEditor",
  "rendering",
  "resetCreatorWizard",
  "saveConfigPatch",
  "saveWizardSession",
  "selectedIdeaIndex",
  "selectedListicleIdeaIndex",
  "setConfig",
  "setCreatorProjectName",
  "setCreatorStep",
  "setCustomBlocks",
  "setCustomHooks",
  "setCustomIdeaBlocks",
  "setCustomIdeaEmotion",
  "setCustomIdeaHook",
  "setCustomIdeaPromise",
  "setCustomIdeaTitle",
  "setCustomOutline",
  "setCustomTitle",
  "setEditorialIdeaImport",
  "setExpandedBlocks",
  "setFormatSelector",
  "setIdeasData",
  "setIdeationTab",
  "setListNiche",
  "setListTopic",
  "setListicleHudStyle",
  "setNarrationDraft",
  "setNarrationTaggedDraft",
  "setNicheInput",
  "setRankCount",
  "setRankOrder",
  "setSelectedIdeaIndex",
  "setSelectedListicleIdeaIndex",
  "setTaggedNarrations",
  "setUploadSuccess",
  "setUseNotebooklm",
  "showNarrationReview",
  "status",
  "storyboardData",
  "syncCreatorStoryboard",
  "syncingTimings",
  "taggedNarrations",
  "timelineAssets",
  "triggerRender",
  "uploadSuccess",
  "uploadedScenes",
  "uploadingNarration",
  "useNotebooklm",
  "wizardSavedAtLabel",
  "wordTranscripts",
  "youtubeLoading",
  "youtubeMetadata",
  "youtubeMetadataParsed",
];

const propsLines = PROPS.map((p) => `                  ${p}={${p}}`).join("\n");

const replacement = `          {activeTab === 'creator' && (
            <TabErrorBoundary label="Creator IA">
              <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh] text-zinc-400 text-sm">Carregando creator...</div>}>
                <AppCreatorTab
${propsLines}
                />
              </Suspense>
            </TabErrorBoundary>
          )}

`.split("\n");

// Add lazy import if missing
let appContent = fs.readFileSync(appPath, "utf8");
if (!appContent.includes("AppCreatorTab")) {
  appContent = appContent.replace(
    "const AppMusicTab = lazy(() => import('./AppMusicTab').then((m) => ({ default: m.AppMusicTab })));",
    "const AppMusicTab = lazy(() => import('./AppMusicTab').then((m) => ({ default: m.AppMusicTab })));\nconst AppCreatorTab = lazy(() => import('./AppCreatorTab').then((m) => ({ default: m.AppCreatorTab })));",
  );
  fs.writeFileSync(appPath, appContent);
  lines.splice(0, lines.length, ...appContent.split(/\r?\n/));
}

const next = [...lines.slice(0, startIdx), ...replacement, ...lines.slice(endIdx)];
fs.writeFileSync(appPath, next.join("\n"));
console.log("replaced lines", startIdx, "to", endIdx, "removed", endIdx - startIdx, "added", replacement.length);