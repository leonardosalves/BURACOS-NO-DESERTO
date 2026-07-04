import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bodyPath = path.join(__dirname, "..", "src", "_timeline_editor_body.txt");
if (!fs.existsSync(bodyPath)) {
  console.error("run extract-timeline-editor-body.mjs first");
  process.exit(1);
}
const body = fs.readFileSync(bodyPath, "utf8");

const keywords = new Set([
  "true", "false", "null", "undefined", "return", "const", "let", "if", "else", "for", "while",
  "new", "typeof", "void", "as", "in", "of", "async", "await", "Number", "String", "Math",
  "Object", "Array", "parseInt", "parseFloat", "JSON", "document", "fetch", "alert", "open",
  "prev", "next", "e", "i", "idx", "blockKey", "blockNum", "asset", "res", "file", "err",
  "all", "open", "color", "val", "field", "value", "msg", "path", "dur", "blockNum",
]);
const components = new Set([
  "EditorCollapsibleSection", "SectionHeader", "AlertTriangle", "RefreshCw", "Sparkles", "Bot",
  "TimelineOpenCutBar", "TimelineClipPreview", "TimelineClipOpenCutControls", "OverlayTimelineEditor",
  "BlockProgressBarProjectPanel", "Trash2", "Upload", "Save", "Play", "Pause", "ChevronDown",
  "ChevronUp", "Plus", "SettingHelpTip",
]);
const localFns = new Set([
  "formatTime", "clipKey", "toast", "Array", "Math", "parseFloat", "encodeURIComponent",
]);

const ids = new Set();
const patterns = [/\{([a-zA-Z_$][a-zA-Z0-9_$]*)/g, /=\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, /\b([a-z][a-zA-Z0-9_$]*)\(/g];
for (const p of patterns) {
  let m;
  while ((m = p.exec(body))) {
    const id = m[1];
    if (keywords.has(id) || components.has(id) || localFns.has(id)) continue;
    if (/^[a-z]/.test(id) && id.length < 3) continue;
    ids.add(id);
  }
}

const props = [...ids].sort();
console.log(props.join("\n"));
console.log("---", props.length);