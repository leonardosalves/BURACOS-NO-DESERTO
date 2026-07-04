import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const startIdx = lines.findIndex((l) => l.includes("{activeTab === 'editor'"));
const agentsIdx = lines.findIndex((l) => l.includes("{activeTab === 'agents'"));

if (startIdx < 0 || agentsIdx < 0) {
  console.error("markers not found", { startIdx, agentsIdx });
  process.exit(1);
}

// Body starts at DashminProjectTabLayout inside editor block
let bodyStart = -1;
for (let i = startIdx; i < agentsIdx; i++) {
  if (lines[i].includes("<DashminProjectTabLayout")) {
    bodyStart = i;
    break;
  }
}

// Body ends at </DashminProjectTabLayout> before closing )}
let bodyEnd = -1;
for (let i = agentsIdx - 1; i > bodyStart; i--) {
  if (lines[i].trim() === "</DashminProjectTabLayout>") {
    bodyEnd = i + 1;
    break;
  }
}

if (bodyStart < 0 || bodyEnd < 0) {
  console.error("body bounds not found", { bodyStart, bodyEnd });
  process.exit(1);
}

const body = lines.slice(bodyStart, bodyEnd).join("\n") + "\n";
const outPath = path.join(__dirname, "..", "src", "_editor_tab_body.txt");
fs.writeFileSync(outPath, body);
console.log("wrote", outPath, "lines", bodyEnd - bodyStart);