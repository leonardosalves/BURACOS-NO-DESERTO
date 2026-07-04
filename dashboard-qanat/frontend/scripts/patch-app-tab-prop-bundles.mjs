import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
let content = fs.readFileSync(appPath, "utf8");

if (content.includes("buildAppTabPropBundles")) {
  console.log("already patched");
  process.exit(0);
}

// Remove type-only tab prop imports
content = content.replace(
  /import type \{ AppCreatorTabProps \} from '\.\/AppCreatorTab';\n/g,
  "",
);
content = content.replace(
  /import type \{ AppAiTabProps \} from '\.\/AppAiTab';\n/g,
  "",
);
content = content.replace(
  /import type \{ AppUploadTabProps \} from '\.\/AppUploadTab';\n/g,
  "",
);
content = content.replace(
  /import type \{ AppEditorTabProps \} from '\.\/AppEditorTab';\n/g,
  "",
);
content = content.replace(
  /import type \{ AppSettingsTabProps \} from '\.\/AppSettingsTab';\n/g,
  "",
);
content = content.replace(
  /import type \{ AppStatusTabProps \} from '\.\/AppStatusTab';\n/g,
  "",
);
content = content.replace(
  /import type \{ AppTimelineTabProps \} from '\.\/AppTimelineTab';\n/g,
  "",
);
content = content.replace(
  /import type \{ AppMusicTabPanelProps \} from '\.\/AppMusicTabPanel';\n/g,
  "",
);

if (!content.includes("appTabPropBundles")) {
  const anchor = "import { buildThumbnailBrief, normalizeYoutubeMetadataDisplay } from './youtubeMetadataDisplay';";
  content = content.replace(
    anchor,
    `${anchor}\nimport { buildAppTabPropBundles } from './appTabPropBundles';`,
  );
}

const blockStart = content.indexOf("  const creatorTabProps:");
const blockEnd = content.indexOf("  return (", blockStart);
if (blockStart < 0 || blockEnd < 0) {
  console.error("tab props block not found");
  process.exit(1);
}

const blockText = content.slice(blockStart, blockEnd);
const keys = new Set();
for (const m of blockText.matchAll(/^\s+([A-Za-z_$][\w$]*),?\s*$/gm)) {
  const name = m[1];
  if (!name.endsWith("TabProps") && name !== "const") keys.add(name);
}

const extraKeys = [
  "activeTab",
  "logs",
  "openCreatorTab",
  "postAi",
  "recentProjects",
  "renderProgress",
  "saveTimelinePatch",
  "setLogs",
  "terminalEndRef",
  "youtubeChannelAlerts",
];
const sortedKeys = [...new Set([...extraKeys, ...keys])].sort();
const callLines = sortedKeys.map((k) => `    ${k},`).join("\n");

const replacement = `  const {
    creatorTabProps,
    aiTabProps,
    uploadTabProps,
    editorTabProps,
    settingsTabProps,
    statusTabProps,
    timelineTabProps,
    musicTabPanelProps,
    homeTabProps,
    workflowTabProps,
    sceneTimingTabProps,
    terminalTabProps,
  } = buildAppTabPropBundles({
${callLines}
  });

`;

content = content.slice(0, blockStart) + replacement + content.slice(blockEnd);

// JSX shorthand for small tabs
content = content.replace(
  /<AppHomeTab[\s\S]*?\/>\s*\n\s*<\/Suspense>/,
  `<AppHomeTab {...homeTabProps} />\n              </Suspense>`,
);
content = content.replace(
  /<AppWorkflowTab[\s\S]*?\/>\s*\n\s*<\/Suspense>/,
  `<AppWorkflowTab {...workflowTabProps} />\n              </Suspense>`,
);
content = content.replace(
  /<AppSceneTimingTab[\s\S]*?\/>\s*\n\s*<\/Suspense>/,
  `<AppSceneTimingTab {...sceneTimingTabProps} />\n              </Suspense>`,
);
content = content.replace(
  /<AppTerminalTab[\s\S]*?\/>\s*\n\s*<\/Suspense>/,
  `<AppTerminalTab {...terminalTabProps} />\n              </Suspense>`,
);

fs.writeFileSync(appPath, content, "utf8");
console.log("patched App.tsx, ctx keys:", sortedKeys.length);