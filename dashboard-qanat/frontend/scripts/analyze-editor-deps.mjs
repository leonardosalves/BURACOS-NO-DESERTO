import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const body = fs.readFileSync(path.join(__dirname, "..", "src", "_editor_tab_body.txt"), "utf8");

const components = new Set([
  "DashminProjectTabLayout", "ProjectYoutubeCard", "PostPublishChecklist", "LumieraDubPanel",
  "NarrationChunksPanel", "NarrationReplacePanel", "TtsVoiceStudioPanel", "SectionHeader",
  "TimelineClipPreview", "JsonTreeView", "LazyLumieraDubPanel", "LazyNarrationReplacePanel",
  "Suspense", "Wand2", "RefreshCw", "Sparkles", "Plus", "Save", "ChevronUp", "ChevronDown",
  "Trash2", "Upload", "strong",
]);

const keywords = new Set([
  "true", "false", "null", "undefined", "if", "else", "return", "const", "let", "var", "for",
  "while", "do", "new", "typeof", "void", "as", "in", "of", "async", "await", "Number", "String",
  "Math", "Object", "Array", "Date", "JSON", "document", "fetch", "toast", "encodeURIComponent",
  "HTMLInputElement", "prev", "data", "e", "step", "index", "i", "idx", "idea", "vp", "it", "item",
  "t", "entry", "platform", "meta", "plan", "mode", "value", "base", "project", "res", "blockNum",
  "blockKey", "assetIdx", "localIdx", "isVideo", "file", "type", "msg", "options", "patch", "next",
  "path", "dur", "blockScenes", "correspondingAsset", "track", "segMeta", "segmentId", "fileName",
  "blockNumber", "nameOrUrl", "name", "n", "q", "r", "s", "p", "l", "id", "label",
]);

const ids = new Set();
const patterns = [
  /\{([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
  /=\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g,
  /\b([a-z][a-zA-Z0-9_$]*)\(/g,
];

for (const p of patterns) {
  let m;
  while ((m = p.exec(body))) {
    const id = m[1];
    if (keywords.has(id) || components.has(id)) continue;
    if (/^[a-z]/.test(id) && id.length < 3) continue;
    ids.add(id);
  }
}

const localFns = new Set([
  "getSceneDurationSeconds", "parseInt", "JSON.stringify",
]);

const props = [...ids].filter((id) => !localFns.has(id)).sort();
console.log(props.join("\n"));
console.log("--- count", props.length);