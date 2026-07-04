import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);
const start = lines.findIndex((l) => l.includes("const renderRichTimelineEditor"));
const end = lines.findIndex((l, i) => i > start && l.includes("const openCreatorTab"));
const fnLines = lines.slice(start, end);
const bodyStart = fnLines.findIndex((l) => l.trim().startsWith("return ("));
const inner = fnLines.slice(bodyStart + 1, fnLines.lastIndexOf("    );"));

fs.writeFileSync(path.join(__dirname, "..", "src", "_timeline_editor_body.txt"), inner.join("\n"));
console.log("extracted", inner.length, "lines from", start, "to", end);