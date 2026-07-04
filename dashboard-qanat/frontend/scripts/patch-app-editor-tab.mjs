import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
let lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const startIdx = lines.findIndex((l) => l.includes("{activeTab === 'editor'"));
const agentsIdx = lines.findIndex((l) => l.includes("{activeTab === 'agents'"));

if (startIdx < 0 || agentsIdx < 0) {
  console.error("markers not found", { startIdx, agentsIdx });
  process.exit(1);
}

let endIdx = -1;
for (let i = agentsIdx - 1; i > startIdx; i--) {
  if (lines[i].trim() === ")}") {
    endIdx = i + 1;
    break;
  }
}

if (endIdx < 0) {
  console.error("end not found");
  process.exit(1);
}

const PROPS = [
  "activeProject",
  "addSceneAtEnd",
  "config",
  "copiedSection",
  "copyToClipboard",
  "debounceSaveStoryboard",
  "deleteScene",
  "editorSubTab",
  "fetchData",
  "generatingOverlays",
  "getAssetDuration",
  "getAssetUrl",
  "getMusicUrl",
  "getProjectUrl",
  "getTotalVideoDuration",
  "handleGenerateAiOverlays",
  "handleNotebooklmImprove",
  "handleSaveStoryboard",
  "handleUploadSceneAsset",
  "hasApiKey",
  "insertSceneAfter",
  "loadEditorProject",
  "loadingStoryboard",
  "moveScene",
  "notebooklmImproving",
  "notebooklmStatus",
  "notebooklmSuggestions",
  "projects",
  "renderRichTimelineEditor",
  "saveConfigPatch",
  "saveCreatorStoryboard",
  "selectedProject",
  "setActiveTab",
  "setConfig",
  "setEditorSubTab",
  "setSelectedProject",
  "setStoryboardData",
  "setVideoFileDurations",
  "status",
  "storyboardData",
  "titleExperimentVideoId",
  "updateSceneField",
  "videoFileDurations",
  "wordTranscripts",
];

const propsLines = PROPS.map((p) => `                ${p}={${p}}`).join("\n");

const replacement = `          {activeTab === 'editor' && (
            <TabErrorBoundary tabName="Editor">
              <Suspense fallback={<TabPanelFallback label="Carregando editor..." />}>
                <AppEditorTab
${propsLines}
                />
              </Suspense>
            </TabErrorBoundary>
          )}

`.split("\n");

let appContent = fs.readFileSync(appPath, "utf8");
if (!appContent.includes("AppEditorTab")) {
  appContent = appContent.replace(
    "const RichTimelineEditor = lazy(() => import('./RichTimelineEditor').then((m) => ({ default: m.RichTimelineEditor })));",
    "const RichTimelineEditor = lazy(() => import('./RichTimelineEditor').then((m) => ({ default: m.RichTimelineEditor })));\nconst AppEditorTab = lazy(() => import('./AppEditorTab').then((m) => ({ default: m.AppEditorTab })));",
  );
  fs.writeFileSync(appPath, appContent);
  lines = appContent.split(/\r?\n/);
}

const next = [...lines.slice(0, startIdx), ...replacement, ...lines.slice(endIdx)];
fs.writeFileSync(appPath, next.join("\n"));
console.log("replaced lines", startIdx, "to", endIdx, "removed", endIdx - startIdx, "added", replacement.length);