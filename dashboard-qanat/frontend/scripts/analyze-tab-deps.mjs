import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const tab = process.argv[2];
if (!tab) {
  console.error("usage: node analyze-tab-deps.mjs <tab>");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bodyPath = path.join(__dirname, "..", "src", `_${tab}_tab_body.txt`);
const body = fs.readFileSync(bodyPath, "utf8");

const components = new Set([
  "DashminProjectTabLayout", "DashminPageLayout", "SectionHeader", "DashminAiChat",
  "DashminChatApplyButton", "ProjectYoutubeCard", "PostPublishChecklist", "LazyDashminAiChat",
  "CheckCircle", "Lock", "Settings", "Video", "Sparkles", "Copy", "Check", "RefreshCw",
  "Trash2", "Upload", "Download", "ExternalLink", "Youtube", "Cloud", "Share2", "Send",
  "ChevronDown", "ChevronUp", "Image", "Wand2", "Save", "strong", "Suspense",
]);

const keywords = new Set([
  "true", "false", "null", "undefined", "if", "else", "return", "const", "let", "var", "for",
  "while", "do", "new", "typeof", "void", "as", "in", "of", "async", "await", "Number", "String",
  "Math", "Object", "Array", "Date", "JSON", "document", "fetch", "toast", "prev", "data", "e",
  "step", "index", "i", "idx", "it", "item", "t", "mode", "value", "base", "project", "res",
  "msg", "options", "patch", "next", "path", "file", "type", "id", "label", "key", "log",
  "track", "img", "url", "name", "n", "p", "s", "v", "x", "y", "a", "b", "c", "d", "f", "g",
  "h", "j", "k", "l", "m", "o", "q", "r", "u", "w", "z",
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
  "detectJsonConfig", "parseInt", "JSON.stringify", "encodeURIComponent",
]);

const props = [...ids].filter((id) => !localFns.has(id)).sort();
console.log(props.join("\n"));
console.log("--- count", props.length);