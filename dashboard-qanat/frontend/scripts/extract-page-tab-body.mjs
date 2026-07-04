import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const tab = process.argv[2];
const nextTab = process.argv[3];
const layout = process.argv[4] || "DashminPageLayout";
if (!tab || !nextTab) {
  console.error("usage: node extract-page-tab-body.mjs <tab> <nextTab> [LayoutComponent]");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const startIdx = lines.findIndex((l) => l.includes(`{activeTab === '${tab}'`));
const nextIdx = lines.findIndex((l) => l.includes(`{activeTab === '${nextTab}'`));

if (startIdx < 0 || nextIdx < 0) {
  console.error("markers not found", { tab, nextTab, startIdx, nextIdx });
  process.exit(1);
}

let bodyStart = -1;
for (let i = startIdx; i < nextIdx; i++) {
  if (lines[i].includes(`<${layout}`)) {
    bodyStart = i;
    break;
  }
}

let bodyEnd = -1;
const closeTag = `</${layout}>`;
for (let i = nextIdx - 1; i > bodyStart; i--) {
  if (lines[i].trim() === closeTag) {
    bodyEnd = i + 1;
    break;
  }
}

if (bodyStart < 0 || bodyEnd < 0) {
  console.error("body bounds not found", { bodyStart, bodyEnd, layout });
  process.exit(1);
}

const body = lines.slice(bodyStart, bodyEnd).join("\n") + "\n";
const outPath = path.join(__dirname, "..", "src", `_${tab}_tab_body.txt`);
fs.writeFileSync(outPath, body);
console.log("wrote", outPath, "lines", bodyEnd - bodyStart);