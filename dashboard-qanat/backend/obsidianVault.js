/**
 * Vault Obsidian para memória do Studio Agents (.agents/).
 * Abre notas Markdown já geradas pelo Lumiera para edição e navegação visual.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { ensureAgentDirs, getAgentPaths } from "./agentMemory.js";

const VAULT_NAME = "Lumiera Memória";
const HUB_NOTE = "MEMORIA-LUMIERA.md";

const DEFAULT_OBSIDIAN_PATHS = [
  process.env.OBSIDIAN_PATH,
  path.join(process.env.LOCALAPPDATA || "", "Programs", "Obsidian", "Obsidian.exe"),
  path.join(process.env.ProgramFiles || "", "Obsidian", "Obsidian.exe"),
  path.join(process.env["ProgramFiles(x86)"] || "", "Obsidian", "Obsidian.exe"),
].filter(Boolean);

export function resolveObsidianExecutable() {
  for (const p of DEFAULT_OBSIDIAN_PATHS) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

export function getObsidianVaultDir(workspaceDir) {
  return path.join(workspaceDir, ".agents");
}

function writeJsonIfMissing(filePath, data) {
  if (fs.existsSync(filePath)) return;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function buildHubNote(workspaceDir) {
  const { memoryDir, runsDir } = getAgentPaths(workspaceDir);
  const nicheFiles = fs.existsSync(memoryDir)
    ? fs.readdirSync(memoryDir).filter((f) => f.endsWith(".md"))
    : [];
  const runFiles = fs.existsSync(runsDir)
    ? fs.readdirSync(runsDir).filter((f) => f.endsWith(".md")).sort().reverse().slice(0, 7)
    : [];

  const nicheLinks = nicheFiles
    .map((f) => `- [[memory/${f.replace(".md", "")}]]`)
    .join("\n");

  const runLinks = runFiles
    .map((f) => `- [[agent_runs/${f.replace(".md", "")}]]`)
    .join("\n");

  return [
    `# ${VAULT_NAME}`,
    "",
    "Hub da memória do **Lumiera Studio Agents**. Edite aqui ou use o dashboard — as notas são as mesmas em `.agents/`.",
    "",
    "## Navegação rápida",
    `- [[MEMORY]] — regras globais do estúdio`,
    `- [[AGENTS]] — documentação dos agentes`,
    "",
    "## Memória por nicho",
    nicheLinks || "- _(nenhum nicho ainda — use Capturar qualidade na aba Studio Agents)_",
    "",
    "## Logs recentes",
    runLinks || "- _(sem execuções registradas)_",
    "",
    "## Dica",
    "Use o grafo do Obsidian (`Ctrl+G`) para ver padrões promovidos e candidatos por tema.",
    "",
    `atualizado: ${new Date().toISOString()}`,
    "",
  ].join("\n");
}

export function ensureObsidianVault(workspaceDir) {
  ensureAgentDirs(workspaceDir);
  const vaultDir = getObsidianVaultDir(workspaceDir);
  const obsidianDir = path.join(vaultDir, ".obsidian");

  fs.mkdirSync(obsidianDir, { recursive: true });

  writeJsonIfMissing(path.join(obsidianDir, "app.json"), {
    legacyEditor: false,
    livePreview: true,
    defaultViewMode: "source",
    readableLineLength: true,
    showLineNumber: true,
    foldHeading: true,
    foldIndent: true,
    showFrontmatter: true,
    strictLineBreaks: false,
  });

  writeJsonIfMissing(path.join(obsidianDir, "appearance.json"), {
    theme: "obsidian",
    baseFontSize: 15,
    readableLineLength: true,
  });

  writeJsonIfMissing(path.join(obsidianDir, "core-plugins.json"), {
    "file-explorer": true,
    "global-search": true,
    graph: true,
    "outgoing-links": true,
    "tag-pane": true,
    "page-preview": true,
    starred: true,
    "markdown-importer": false,
    "daily-notes": false,
    templates: false,
    "note-composer": true,
    "command-palette": true,
    "editor-status": true,
    bookmarks: true,
  });

  const hubPath = path.join(vaultDir, HUB_NOTE);
  fs.writeFileSync(hubPath, buildHubNote(workspaceDir), "utf8");

  return {
    vaultDir,
    vaultName: VAULT_NAME,
    vaultFolderName: path.basename(vaultDir),
    hubNote: HUB_NOTE,
    hubPath,
  };
}

function buildObsidianUris(filePath, vault, safeRel) {
  const pathUri = `obsidian://open?path=${encodeURIComponent(filePath)}`;
  const vaultUri = `obsidian://open?vault=${encodeURIComponent(vault.vaultFolderName)}&file=${encodeURIComponent(safeRel)}`;
  const namedVaultUri = `obsidian://open?vault=${encodeURIComponent(vault.vaultName)}&file=${encodeURIComponent(safeRel)}`;
  return { pathUri, vaultUri, namedVaultUri };
}

/** Dispara processo GUI sem esperar encerramento (evita timeout da API). */
function spawnDetached(command, args) {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(command, args, {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      child.unref();
      child.on("error", reject);
      setImmediate(() => resolve(true));
    } catch (err) {
      reject(err);
    }
  });
}

async function launchObsidianOnWindows(exe, vaultDir, uris) {
  const errors = [];

  // 1) Abrir pasta do vault no exe — mais confiável que cmd start + URI
  try {
    await spawnDetached(exe, [vaultDir]);
    return "obsidian-exe-vault-dir";
  } catch (err) {
    errors.push(`exe vault: ${err.message}`);
  }

  // 2) URI direto no exe (mesmo handler do registro obsidian://)
  try {
    await spawnDetached(exe, [uris.pathUri]);
    return "obsidian-exe-path-uri";
  } catch (err) {
    errors.push(`exe uri: ${err.message}`);
  }

  // 3) Protocol handler via start
  try {
    await spawnDetached("cmd.exe", ["/c", "start", "", uris.pathUri]);
    return "windows-start-path-uri";
  } catch (err) {
    errors.push(`start path: ${err.message}`);
  }

  // 4) URI por nome da pasta do vault
  try {
    await spawnDetached("cmd.exe", ["/c", "start", "", uris.vaultUri]);
    return "windows-start-vault-uri";
  } catch (err) {
    errors.push(`start vault: ${err.message}`);
  }

  throw new Error(errors.join("; ") || "Falha ao iniciar Obsidian no Windows");
}

async function launchObsidianUnix(uri, vaultDir) {
  if (process.platform === "darwin") {
    await spawnDetached("open", [uri]);
    return "mac-open-uri";
  }
  await spawnDetached("xdg-open", [uri]);
  return "linux-xdg-open";
}

export function getObsidianVaultStatus(workspaceDir) {
  const vault = ensureObsidianVault(workspaceDir);
  const exe = resolveObsidianExecutable();
  const uris = buildObsidianUris(vault.hubPath, vault, vault.hubNote);
  return {
    installed: Boolean(exe),
    executable: exe,
    vaultDir: vault.vaultDir,
    vaultName: vault.vaultName,
    vaultFolderName: vault.vaultFolderName,
    hubNote: vault.hubNote,
    hubPath: vault.hubPath,
    uri: uris.pathUri,
    vaultUri: uris.vaultUri,
  };
}

export async function openInObsidian(workspaceDir, relativeFile = HUB_NOTE) {
  const exe = resolveObsidianExecutable();
  if (!exe) {
    throw new Error(
      "Obsidian não encontrado. Instale em https://obsidian.md ou defina OBSIDIAN_PATH no ambiente.",
    );
  }

  const vault = ensureObsidianVault(workspaceDir);
  const safeRel = String(relativeFile || HUB_NOTE).replace(/\\/g, "/").replace(/^\/+/, "");
  const filePath = path.resolve(vault.vaultDir, safeRel);
  const vaultResolved = path.resolve(vault.vaultDir);

  if (!filePath.startsWith(vaultResolved)) {
    throw new Error("Arquivo fora do vault Obsidian.");
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Nota não encontrada: ${safeRel}`);
  }

  const uris = buildObsidianUris(filePath, vault, safeRel);

  let method;
  if (process.platform === "win32") {
    method = await launchObsidianOnWindows(exe, vault.vaultDir, uris);
  } else {
    method = await launchObsidianUnix(uris.pathUri, vault.vaultDir);
  }

  return {
    ok: true,
    method,
    uri: uris.pathUri,
    vaultUri: uris.vaultUri,
    filePath,
    vaultDir: vault.vaultDir,
    hubPath: vault.hubPath,
  };
}