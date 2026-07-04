import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");

const PATCHES = [
  {
    tab: "status",
    component: "AppStatusTab",
    nextTab: "workflow",
    label: "Render",
    props: [
      "activeProject", "brandPanelProps", "config", "effectiveRenderResolution",
      "fetchVideoQuality", "getFormatBytes", "handlePreRenderAutoFix", "outputs",
      "preRenderFixingId", "renderResolutionLabel", "rendering", "selectedUploadVideo",
      "setActiveTab", "setPendingOutputDelete", "setPreviewVideoUrl", "setSelectedUploadVideo",
      "status", "triggerRender", "videoQuality",
    ],
  },
  {
    tab: "settings",
    component: "AppSettingsTab",
    nextTab: "creator",
    label: "Configurações",
    props: [
      "activeProject", "aiProvider", "applyProductionPatchToConfig", "applyVisualPatchToConfig",
      "canvaClientId", "canvaClientSecret", "config", "epidemicKeyInput", "fetchUploadStatus",
      "geminiBrowserMode", "geminiExtensionDiag", "geminiExtensionReady", "geminiExtensionTesting",
      "geminiKeyCount", "geminiKeysInput", "geminiModel", "geminiModelOptions", "globalBlockGap",
      "globalDebugOverlay", "globalFps", "globalMusicVolume", "globalRenderResolution",
      "globalUseRemotion", "handleClearProjectRenderResolution", "handleRelinkYoutube",
      "handleSaveAiSettings", "handleSaveApiKeys", "handleSaveGlobalRenderConfig",
      "handleSaveProjectRenderResolution", "handleTestSupermemory", "hasEpidemicKey", "hasNvidiaKey",
      "hasOpenRouterKey", "hasPexelsKey", "hasPixabayKey", "hasSupermemoryKey", "hasXaiKey",
      "igAccessToken", "igAccountId", "igAppId", "igAppSecret", "nvidiaKeyInput", "openrouterKeyInput",
      "pexelsKeyInput", "pickProductionConfig", "pickVisualConfig", "pixabayKeyInput",
      "productionDraftToApiPatch", "projectRenderResolution", "refreshGeminiExtensionStatus",
      "resolutionConfigScope", "saveConfigPatch", "savingAiSettings", "savingApiKeys",
      "savingGlobalConfig", "savingProductionConfig", "savingProjectResolution", "savingVisualConfig",
      "setAiProvider", "setCanvaClientId", "setCanvaClientSecret", "setConfig", "setEpidemicKeyInput",
      "setGeminiBrowserMode", "setGeminiExtensionTesting", "setGeminiKeysInput", "setGeminiModel",
      "setGlobalBlockGap", "setGlobalDebugOverlay", "setGlobalFps", "setGlobalMusicVolume",
      "setGlobalRenderResolution", "setGlobalUseRemotion", "setIgAccessToken", "setIgAccountId",
      "setIgAppId", "setIgAppSecret", "setNvidiaKeyInput", "setOpenRouterKeyInput", "setPexelsKeyInput",
      "setPixabayKeyInput", "setProjectRenderResolution", "setResolutionConfigScope",
      "setSavingProductionConfig", "setSavingVisualConfig", "setSettingsSection",
      "setSupermemoryBaseUrlInput", "setSupermemoryEnabled", "setSupermemoryKeyInput", "setXaiKeyInput",
      "setYtClientId", "setYtClientSecret", "settingsSection", "supermemoryBaseUrlInput",
      "supermemoryEnabled", "supermemoryKeyInput", "testingSupermemory", "uploadStatus",
      "visualDraftToApiPatch", "xaiKeyInput", "ytClientId", "ytClientSecret",
    ],
  },
];

function findEnd(lines, startIdx, nextIdx) {
  for (let i = nextIdx - 1; i > startIdx; i--) {
    if (lines[i].trim() !== ")}") continue;
    let j = i + 1;
    while (j < nextIdx && lines[j].trim() === "") j++;
    if (j >= nextIdx || lines[j].includes("{activeTab ===") || lines[j].includes("/* TAB")) {
      return i + 1;
    }
  }
  return -1;
}

function patchTab(lines, { tab, component, nextTab, label, props }) {
  const startIdx = lines.findIndex((l) => l.includes(`{activeTab === '${tab}'`));
  const nextIdx = lines.findIndex((l) => l.includes(`{activeTab === '${nextTab}'`));
  if (startIdx < 0 || nextIdx < 0) throw new Error(`markers ${tab} ${startIdx} ${nextIdx}`);
  const endIdx = findEnd(lines, startIdx, nextIdx);
  if (endIdx < 0) throw new Error(`end ${tab}`);

  const propsLines = props.map((p) => `                ${p}={${p}}`).join("\n");
  const replacement = `          {activeTab === '${tab}' && (
            <TabErrorBoundary tabName="${label}">
              <Suspense fallback={<TabPanelFallback label="Carregando ${label.toLowerCase()}..." />}>
                <${component}
${propsLines}
                />
              </Suspense>
            </TabErrorBoundary>
          )}

`.split("\n");

  return [...lines.slice(0, startIdx), ...replacement, ...lines.slice(endIdx)];
}

let appContent = fs.readFileSync(appPath, "utf8");
if (!appContent.includes("AppStatusTab")) {
  appContent = appContent.replace(
    "const AppAiTab = lazy(() => import('./AppAiTab').then((m) => ({ default: m.AppAiTab })));",
    "const AppAiTab = lazy(() => import('./AppAiTab').then((m) => ({ default: m.AppAiTab })));\nconst AppStatusTab = lazy(() => import('./AppStatusTab').then((m) => ({ default: m.AppStatusTab })));\nconst AppSettingsTab = lazy(() => import('./AppSettingsTab').then((m) => ({ default: m.AppSettingsTab })));",
  );
  fs.writeFileSync(appPath, appContent);
}

let lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);
for (const p of PATCHES.slice().reverse()) {
  lines = patchTab(lines, p);
  console.log("patched", p.tab);
}
fs.writeFileSync(appPath, lines.join("\n"));