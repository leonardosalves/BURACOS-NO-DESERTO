import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lines = fs.readFileSync(path.join(__dirname, "..", "src", "App.tsx"), "utf8").split(/\r?\n/);
const start = lines.findIndex((l) => l.includes("const renderRichTimelineEditor"));
const end = lines.findIndex((l, i) => i > start && l.trim() === "};" && lines[i - 1]?.includes("</div>"));
const body = lines.slice(start, end + 1).join("\n");

const keywords = new Set([
  "true", "false", "null", "undefined", "return", "const", "let", "if", "else", "for", "while",
  "new", "typeof", "void", "as", "in", "of", "async", "await", "Number", "String", "Math",
  "Object", "Array", "parseInt", "parseFloat", "String", "Math", "JSON", "document", "alert",
  "details", "summary", "div", "button", "span", "input", "label", "option", "select", "p",
  "key", "idx", "i", "blockKey", "asset", "blockNum", "e", "prev", "next", "seg", "mod",
]);
const components = new Set([
  "EditorCollapsibleSection", "SectionHeader", "AlertTriangle", "RefreshCw", "Sparkles", "Bot",
  "TimelineOpenCutBar", "TimelineClipPreview", "TimelineClipOpenCutControls", "OverlayTimelineEditor",
  "Trash2", "Upload", "Save", "Play", "Pause", "ChevronDown", "ChevronUp", "Volume2", "Image", "Video",
]);

const ids = new Set();
const patterns = [/\{([a-zA-Z_$][a-zA-Z0-9_$]*)/g, /=\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, /\b([a-z][a-zA-Z0-9_$]*)\(/g];
for (const p of patterns) {
  let m;
  while ((m = p.exec(body))) {
    const id = m[1];
    if (keywords.has(id) || components.has(id)) continue;
    if (/^[a-z]/.test(id) && id.length < 3) continue;
    ids.add(id);
  }
}

console.log([...ids].sort().join("\n"));
console.log("---", ids.size);