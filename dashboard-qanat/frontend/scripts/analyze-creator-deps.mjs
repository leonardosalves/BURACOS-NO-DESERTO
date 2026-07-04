import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const body = fs.readFileSync(path.join(__dirname, "..", "src", "_creator_tab_body.txt"), "utf8");

const components = new Set([
  "DashminPageLayout", "SectionHeader", "ListicleCreatorStep", "NarrationReviewPanel",
  "NarrationChunksPanel", "TtsVoiceStudioPanel", "Sparkles", "Trash2", "RefreshCw", "Chrome",
  "CheckCircle", "Volume2", "Play", "Check", "Copy",
]);

const keywords = new Set([
  "true", "false", "null", "undefined", "if", "else", "return", "const", "let", "var", "for",
  "while", "do", "new", "typeof", "void", "as", "in", "of", "async", "await", "Number", "String",
  "Math", "Object", "Array", "Date", "JSON", "document", "fetch", "toast", "encodeURIComponent",
  "HTMLInputElement", "TaggedNarrationPlatform", "prev", "data", "e", "step", "index", "i",
  "idx", "idea", "vp", "it", "item", "t", "entry", "platform", "meta", "plan", "mode", "value",
  "base", "project", "res", "cleanNarration", "taggedScript", "newBlocks", "shortName", "proresCheck",
  "blockNum", "blockKey", "assetIdx", "localIdx", "absoluteIndex", "sceneNum", "isVideo", "searchQuery",
  "sceneDurationSeconds", "durationFromWhisper", "isUploaded", "currentAsset", "assetUsedIn",
  "isExpanded", "blockPrompts", "blockTiming", "promptsByBlock", "sortedBlocks", "expectedBlocks",
  "blockPhrases", "longTitles", "isSelected", "isBest", "usedIn", "itemBlock", "itemBlockKey",
  "itemAssetIdx", "itemAsset", "itemIndex", "b", "a", "file", "track", "msg", "options", "patch",
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

// Local imports (not props)
const localFns = new Set([
  "parseCreatorBlockNumber", "getBlockTimingSummary", "getSceneDurationSeconds",
  "resolveStockSearchQuery", "warnLongListicleTitles", "isWhisperTimelineReady",
  "isClipFactorySource", "resolveEditorialImportOutline", "buildTaggedNarration",
  "taggedNarrationMeta", "countCreatorUniqueBlocks",
]);

const props = [...ids].filter((id) => !localFns.has(id)).sort();
console.log(props.join("\n"));
console.log("--- count", props.length);