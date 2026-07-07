import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardRoot = path.resolve(__dirname, "..");
const pairs = [
  {
    src: path.join(
      dashboardRoot,
      "frontend",
      "node_modules",
      "cesium",
      "Build",
      "Cesium"
    ),
    dest: path.join(dashboardRoot, "frontend", "public", "cesium"),
  },
  {
    src: path.join(
      dashboardRoot,
      "remotion-renderer",
      "node_modules",
      "cesium",
      "Build",
      "Cesium"
    ),
    dest: path.join(dashboardRoot, "remotion-renderer", "public", "cesium"),
  },
];

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
  return true;
}

let copied = 0;
for (const { src, dest } of pairs) {
  if (!fs.existsSync(src)) continue;
  copyDir(src, dest);
  copied += 1;
  console.log(`[cesium] Assets copiados para ${dest}`);
}

if (!copied) {
  console.warn(
    "[cesium] Pacote nao instalado — rode npm install cesium no frontend e remotion-renderer"
  );
}
