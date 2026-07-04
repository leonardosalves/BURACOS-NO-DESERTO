import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const creatorStart = lines.findIndex((l) => l.includes("{activeTab === 'creator'"));
const shellClose = lines.findIndex((l) => l.trim() === "</AppShell>");
if (creatorStart < 0 || shellClose < 0) {
  console.error("markers not found", creatorStart, shellClose);
  process.exit(1);
}

// Find end of AppCreatorTab block: line after TabErrorBoundary closing )}
let creatorEnd = -1;
for (let i = creatorStart; i < shellClose; i++) {
  if (lines[i].includes('label="Creator IA"')) {
    for (let j = i; j < shellClose; j++) {
      if (lines[j].trim() === ")}") {
        creatorEnd = j + 1;
        break;
      }
    }
    break;
  }
}

// Orphan block ends at `)}` before `</div>` that precedes `</AppShell>`
let orphanEnd = -1;
for (let i = creatorEnd; i < shellClose; i++) {
  if (lines[i].trim() === "</div>" && lines[i + 1]?.trim() === "</AppShell>") {
    // walk back to find the `)}` before this </div>
    for (let j = i - 1; j > creatorEnd; j--) {
      if (lines[j].trim() === ")}") {
        orphanEnd = j + 1;
        break;
      }
    }
    break;
  }
}

if (creatorEnd < 0 || orphanEnd < 0 || orphanEnd <= creatorEnd) {
  console.error("orphan range not found", creatorEnd, orphanEnd);
  process.exit(1);
}

const removed = orphanEnd - creatorEnd;
const next = [...lines.slice(0, creatorEnd), ...lines.slice(orphanEnd)];
fs.writeFileSync(appPath, next.join("\n"));
console.log("removed orphan lines", creatorEnd, "to", orphanEnd, "(", removed, "lines)");