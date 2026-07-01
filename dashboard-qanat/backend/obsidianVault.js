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
const HUB_STALE_MS = 60 * 60 * 1000;
const HUB_LINK = "[[MEMORIA-LUMIERA]]";
const HUB_LINK_RE = /\[\[MEMORIA-LUMIERA\]\]/;

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

const SKILL_LABELS = {
  hyperframes: "HyperFrames",
  "viral-short-form": "Viral Short Form",
  "ugc-scriptwriter": "UGC Scriptwriter",
  epidemic_sound: "Epidemic Sound",
  remotion_docs: "Remotion Docs",
};

function listSkillEntries(vaultDir) {
  const skillsRoot = path.join(vaultDir, "skills");
  if (!fs.existsSync(skillsRoot)) return [];
  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((slug) => fs.existsSync(path.join(skillsRoot, slug, "SKILL.md")))
    .sort();
}

function skillLabel(slug) {
  return SKILL_LABELS[slug] || slug.replace(/-/g, " ");
}

function buildSkillsIndexNote(vaultDir) {
  const slugs = listSkillEntries(vaultDir);
  const lines = slugs.map((slug) => {
    const label = skillLabel(slug);
    return `- [[skills/${slug}|${label}]] — doc: [[skills/${slug}/SKILL]]`;
  });
  return [
    "# Skills do Lumiera",
    "",
    `> 🔗 ${HUB_LINK} · [[AGENTS]] · [[MEMORY]]`,
    "",
    "Índice das skills em `.agents/skills/`. Cada pasta tem um atalho com nome legível no grafo.",
    "",
    `Hub: ${HUB_LINK} · Agentes: [[AGENTS]] · Memória: [[MEMORY]]`,
    "",
    "## Catálogo",
    lines.length ? lines.join("\n") : "- _(nenhuma skill em skills/)_",
    "",
    "## Por que vários arquivos SKILL?",
    "Cada skill vive em `skills/<nome>/SKILL.md`. No grafo, use os atalhos acima (`skills/hyperframes`, etc.) — todos aparecem ligados a este índice.",
    "",
    `atualizado: ${new Date().toISOString()}`,
    "",
  ].filter(Boolean).join("\n");
}

function listMarkdownFiles(vaultDir, { ignoreObsidian = true } = {}) {
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignoreObsidian && entry.name === ".obsidian") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) files.push(full);
    }
  }
  walk(vaultDir);
  return files;
}

function relVaultPath(vaultDir, filePath) {
  return path.relative(vaultDir, filePath).replace(/\\/g, "/");
}

function inferBacklinkLine(relPath) {
  if (relPath === HUB_NOTE) return null;
  if (relPath === "MEMORY.md") return `> 🔗 ${HUB_LINK} · [[SKILLS]] · [[AGENTS]]`;
  if (relPath === "AGENTS.md") return `> 🔗 ${HUB_LINK} · [[SKILLS]] · [[MEMORY]]`;
  if (relPath === "SKILLS.md") return `> 🔗 ${HUB_LINK} · [[AGENTS]] · [[MEMORY]]`;
  if (relPath.startsWith("memory/")) {
    return `> 🔗 ${HUB_LINK} · [[MEMORY]] · [[SKILLS]] · [[AGENTS]]`;
  }
  if (relPath.startsWith("agent_runs/")) {
    const day = relPath.replace("agent_runs/", "").replace(".md", "");
    return `> 🔗 ${HUB_LINK} · [[agent_runs/${day}]]`;
  }
  if (relPath.startsWith("skill-bundles/")) {
    return `> 🔗 ${HUB_LINK} · [[skills/studio-agents-hermes]] · [[SKILLS]]`;
  }
  const skillNested = relPath.match(/^skills\/([^/]+)\/(.+)\.md$/);
  if (skillNested) {
    const [, slug, rest] = skillNested;
    if (rest !== "SKILL") {
      const label = skillLabel(slug);
      return `> 🔗 ${HUB_LINK} · [[skills/${slug}|${label}]] · [[skills/${slug}/SKILL]] · [[skills/${slug}/REFERENCES]]`;
    }
  }
  const skillRef = relPath.match(/^skills\/([^/]+)\/(references|assets|reference)\/(.+)\.md$/);
  if (skillRef) {
    const [, slug] = skillRef;
    const label = skillLabel(slug);
    return `> 🔗 ${HUB_LINK} · [[skills/${slug}|${label}]] · [[skills/${slug}/SKILL]] · [[skills/${slug}/REFERENCES]]`;
  }
  const skillReadme = relPath.match(/^skills\/([^/]+)\/README\.md$/);
  if (skillReadme) {
    const slug = skillReadme[1];
    return `> 🔗 ${HUB_LINK} · [[skills/${slug}]] · [[skills/${slug}/SKILL]] · [[SKILLS]]`;
  }
  const skillRefIndex = relPath.match(/^skills\/([^/]+)\/REFERENCES\.md$/);
  if (skillRefIndex) {
    const slug = skillRefIndex[1];
    return `> 🔗 ${HUB_LINK} · [[skills/${slug}]] · [[skills/${slug}/SKILL]] · [[SKILLS]]`;
  }
  const skillStub = relPath.match(/^skills\/([^/]+)\.md$/);
  if (skillStub) {
    const slug = skillStub[1];
    return `> 🔗 ${HUB_LINK} · [[skills/${slug}/SKILL]] · [[SKILLS]] · [[AGENTS]]`;
  }
  return `> 🔗 ${HUB_LINK} · [[SKILLS]]`;
}

function prependBacklinkIfMissing(filePath, backlinkLine) {
  if (!backlinkLine) return false;
  let content = fs.readFileSync(filePath, "utf8");
  if (HUB_LINK_RE.test(content)) return false;
  fs.writeFileSync(filePath, `${backlinkLine}\n\n${content}`, "utf8");
  return true;
}

const SKILL_DOC_SKIP_DIRS = new Set(["scripts", "eval-viewer", "node_modules", ".git"]);

function listSkillReferenceFiles(skillDir) {
  const refs = [];
  if (!fs.existsSync(skillDir)) return refs;

  function walk(dir, prefix = "") {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKILL_DOC_SKIP_DIRS.has(entry.name)) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      if (entry.name === "SKILL.md" || entry.name === "REFERENCES.md") continue;
      refs.push(rel.replace(/\.md$/, ""));
    }
  }

  walk(skillDir);
  return refs.sort();
}

function buildSkillReferencesIndex(slug, refFiles) {
  const label = skillLabel(slug);
  const byFolder = new Map();
  for (const r of refFiles) {
    const folder = r.includes("/") ? r.split("/")[0] : "(raiz)";
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder).push(r);
  }
  const sections = [];
  for (const [folder, items] of [...byFolder.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    sections.push(`### ${folder}`);
    sections.push(items.map((r) => `- [[${r}]]`).join("\n"));
    sections.push("");
  }
  return [
    `# Referências — ${label}`,
    "",
    `> 🔗 ${HUB_LINK} · [[skills/${slug}]] · [[skills/${slug}/SKILL]] · [[SKILLS]]`,
    "",
    sections.length ? sections.join("\n") : "- _(sem docs aninhados)_",
    "",
  ].join("\n");
}

function ensureSkillReferencesIndex(vaultDir, slug) {
  const skillDir = path.join(vaultDir, "skills", slug);
  const refFiles = listSkillReferenceFiles(skillDir);
  if (!refFiles.length) return false;
  const indexPath = path.join(skillDir, "REFERENCES.md");
  fs.writeFileSync(indexPath, buildSkillReferencesIndex(slug, refFiles), "utf8");
  return true;
}

function ensureSkillBundlesNote(vaultDir) {
  const bundlesDir = path.join(vaultDir, "skill-bundles");
  const notePath = path.join(bundlesDir, "BUNDLES.md");
  if (!fs.existsSync(bundlesDir)) return;
  const jsonFiles = fs.existsSync(bundlesDir)
    ? fs.readdirSync(bundlesDir).filter((f) => f.endsWith(".json"))
    : [];
  const lines = jsonFiles.map((f) => `- \`${f}\` — ver [[skills/studio-agents-hermes]]`);
  const content = [
    "# Skill bundles (Hermes / OpenClaw)",
    "",
    `> 🔗 ${HUB_LINK} · [[skills/studio-agents-hermes]] · [[SKILLS]]`,
    "",
    "Bundles JSON usados pelo Studio Agents para injetar skills no prompt.",
    "",
    lines.length ? lines.join("\n") : "- _(nenhum bundle)_",
    "",
  ].join("\n");
  fs.writeFileSync(notePath, content, "utf8");
}

export function auditVaultGraph(workspaceDir) {
  const vaultDir = getObsidianVaultDir(workspaceDir);
  if (!fs.existsSync(vaultDir)) {
    return { total: 0, connected: 0, orphans: 0, orphanFiles: [] };
  }
  const files = listMarkdownFiles(vaultDir);
  const orphanFiles = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (!HUB_LINK_RE.test(content) && relVaultPath(vaultDir, file) !== HUB_NOTE) {
      orphanFiles.push(relVaultPath(vaultDir, file));
    }
  }
  return {
    total: files.length,
    connected: files.length - orphanFiles.length,
    orphans: orphanFiles.length,
    orphanFiles: orphanFiles.slice(0, 40),
  };
}

export function repairVaultGraphLinks(workspaceDir) {
  const vaultDir = getObsidianVaultDir(workspaceDir);
  ensureAgentDirs(workspaceDir);
  let repaired = 0;

  ensureSkillGraphLinks(vaultDir);
  ensureSkillBundlesNote(vaultDir);

  const slugs = listSkillEntries(vaultDir);
  for (const slug of slugs) {
    if (ensureSkillReferencesIndex(vaultDir, slug)) repaired += 1;
  }

  for (const file of listMarkdownFiles(vaultDir)) {
    const rel = relVaultPath(vaultDir, file);
    const backlink = inferBacklinkLine(rel);
    if (prependBacklinkIfMissing(file, backlink)) repaired += 1;
  }

  ensureMemoryIndexNote(vaultDir);

  fs.writeFileSync(path.join(vaultDir, HUB_NOTE), buildHubNote(workspaceDir), "utf8");
  fs.writeFileSync(path.join(vaultDir, "SKILLS.md"), buildSkillsIndexNote(vaultDir), "utf8");

  const audit = auditVaultGraph(workspaceDir);
  return { repaired, ...audit };
}

function ensureMemoryIndexNote(vaultDir) {
  const memoryDir = path.join(vaultDir, "memory");
  const memoryPath = path.join(vaultDir, "MEMORY.md");
  if (!fs.existsSync(memoryDir)) return;

  const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith(".md")).sort();
  const links = files.map((f) => {
    const slug = f.replace(".md", "");
    return `- [[memory/${slug}]]`;
  });

  let existing = fs.existsSync(memoryPath) ? fs.readFileSync(memoryPath, "utf8") : "";
  if (!HUB_LINK_RE.test(existing)) {
    existing = `> 🔗 ${HUB_LINK} · [[SKILLS]] · [[AGENTS]]\n\n${existing}`;
  }

  const marker = "## Índice memória por nicho";
  const block = [
    marker,
    "",
    links.length ? links.join("\n") : "- _(vazio)_",
    "",
    `atualizado: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  if (existing.includes(marker)) {
    existing = existing.replace(
      /## Índice memória por nicho[\s\S]*?(?=\n## |\n# |$)/,
      `${block.trim()}\n`,
    );
  } else {
    existing = `${existing.trimEnd()}\n\n${block}`;
  }

  fs.writeFileSync(memoryPath, existing, "utf8");
}

function ensureSkillGraphLinks(vaultDir) {
  const slugs = listSkillEntries(vaultDir);
  if (!slugs.length) return;

  for (const slug of slugs) {
    const label = skillLabel(slug);
    const stubPath = path.join(vaultDir, "skills", `${slug}.md`);
    const skillDoc = `skills/${slug}/SKILL`;
    const hasRefs = listSkillReferenceFiles(path.join(vaultDir, "skills", slug)).length > 0;
    fs.writeFileSync(
      stubPath,
      [
        `# ${label}`,
        "",
        `> 🔗 ${HUB_LINK} · [[${skillDoc}]] · [[SKILLS]]`,
        "",
        `Atalho Obsidian para [[${skillDoc}|${label} (SKILL completa)]].`,
        "",
        `- ${HUB_LINK}`,
        "- [[SKILLS]]",
        "- [[AGENTS]]",
        `- Documentação: [[${skillDoc}]]`,
        hasRefs ? `- Referências: [[skills/${slug}/REFERENCES]]` : "",
        "",
      ].filter(Boolean).join("\n"),
      "utf8",
    );

    const skillPath = path.join(vaultDir, "skills", slug, "SKILL.md");
    let content = fs.readFileSync(skillPath, "utf8");
    const backlink = `${HUB_LINK} · [[skills/${slug}|${label}]] · [[SKILLS]]`;
    if (!content.includes(HUB_LINK)) {
      content = `> 🔗 ${backlink}\n\n${content}`;
      fs.writeFileSync(skillPath, content, "utf8");
    }
    if (hasRefs && !content.includes("REFERENCES")) {
      content = content.trimEnd() + `\n\n## Referências\n\n- [[skills/${slug}/REFERENCES|Índice de references/assets]]\n`;
      fs.writeFileSync(skillPath, content, "utf8");
    }
  }

  const agentsPath = path.join(vaultDir, "AGENTS.md");
  if (fs.existsSync(agentsPath)) {
    let agents = fs.readFileSync(agentsPath, "utf8");
    if (!agents.includes(HUB_LINK)) {
      agents = `> 🔗 ${HUB_LINK} · [[SKILLS]] · [[MEMORY]]\n\n${agents}`;
    }
    if (!agents.includes("[[SKILLS]]")) {
      const skillLines = slugs
        .map((s) => `- [[skills/${s}|${skillLabel(s)}]]`)
        .join("\n");
      agents += [
        "",
        "## 5. Skills (Obsidian)",
        "",
        `Catálogo: [[SKILLS]] · Hub: ${HUB_LINK}`,
        "",
        skillLines,
        "",
      ].join("\n");
    }
    fs.writeFileSync(agentsPath, agents, "utf8");
  }
}

function buildHubNote(workspaceDir) {
  const vaultDir = getObsidianVaultDir(workspaceDir);
  const { memoryDir, runsDir } = getAgentPaths(workspaceDir);
  const nicheFiles = fs.existsSync(memoryDir)
    ? fs.readdirSync(memoryDir).filter((f) => f.endsWith(".md"))
    : [];
  const runFiles = fs.existsSync(runsDir)
    ? fs.readdirSync(runsDir).filter((f) => f.endsWith(".md")).sort().reverse().slice(0, 7)
    : [];
  const skillSlugs = listSkillEntries(vaultDir);

  const nicheLinks = nicheFiles
    .map((f) => `- [[memory/${f.replace(".md", "")}]]`)
    .join("\n");

  const runLinks = runFiles
    .map((f) => `- [[agent_runs/${f.replace(".md", "")}]]`)
    .join("\n");

  const skillLinks = skillSlugs
    .map((slug) => {
      const hasRefs = listSkillReferenceFiles(path.join(vaultDir, "skills", slug)).length > 0;
      const ref = hasRefs ? ` · [[skills/${slug}/REFERENCES|refs]]` : "";
      return `- [[skills/${slug}|${skillLabel(slug)}]]${ref}`;
    })
    .join("\n");

  const bundlesNote = fs.existsSync(path.join(vaultDir, "skill-bundles", "BUNDLES.md"))
    ? "- [[skill-bundles/BUNDLES|Skill bundles (Hermes)]]"
    : "";

  return [
    `# ${VAULT_NAME}`,
    "",
    "Hub da memória do **Lumiera Studio Agents**. Edite aqui ou use o dashboard — as notas são as mesmas em `.agents/`.",
    "**Grafo:** toda nota deve ligar a este hub — o Lumiera repara automaticamente ao abrir Studio Agents.",
    "",
    "## Navegação rápida",
    `- [[MEMORY]] — regras globais do estúdio`,
    `- [[AGENTS]] — documentação dos agentes`,
    `- [[SKILLS]] — índice das skills (HyperFrames, viral, UGC, etc.)`,
    `- [[memory/agent-frameworks-reference]] · [[memory/google-gemini-sdk-reference]] · [[memory/google-research-reference]]`,
    `- [[memory/lumiera-code-map]] · [[memory/videoagent-lumiera]]`,
    bundlesNote,
    "",
    "## Skills",
    skillLinks || "- _(nenhuma skill — pasta skills/)_",
    "",
    "## Memória por nicho",
    nicheLinks || "- _(nenhum nicho ainda — use Capturar qualidade na aba Studio Agents)_",
    "",
    "## Logs recentes",
    runLinks || "- _(sem execuções registradas)_",
    "",
    "## Regras por formato",
    "- Shorts: gancho 1.5s, pattern interrupt 8–12s, legendas ≤8 palavras",
    "- Longos: gancho 5s, gap 18s, BGM por bloco, chapter stingers",
    "",
    "## Dica",
    "Use o grafo do Obsidian (`Ctrl+G`) para ver padrões promovidos e candidatos por tema.",
    "Padrões com prefixo `SHORT/` ou `LONG/` na categoria aplicam só àquele formato.",
    "No grafo, prefira os nós `hyperframes`, `viral-short-form` (atalhos) — não só \"SKILL\".",
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

  const graph = repairVaultGraphLinks(workspaceDir);
  const hubPath = path.join(vaultDir, HUB_NOTE);

  return {
    vaultDir,
    vaultName: VAULT_NAME,
    vaultFolderName: path.basename(vaultDir),
    hubNote: HUB_NOTE,
    hubPath,
    graph,
  };
}

function buildObsidianUris(filePath, vault, safeRel) {
  const pathUri = `obsidian://open?path=${encodeURIComponent(filePath)}`;
  const vaultUri = `obsidian://open?vault=${encodeURIComponent(vault.vaultFolderName)}&file=${encodeURIComponent(safeRel)}`;
  const namedVaultUri = `obsidian://open?vault=${encodeURIComponent(vault.vaultName)}&file=${encodeURIComponent(safeRel)}`;
  return { pathUri, vaultUri, namedVaultUri };
}

/** Dispara processo GUI sem esperar encerramento (evita timeout da API). */
function spawnGuiDetached(command, args, { windowsHide = false } = {}) {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(command, args, {
        detached: true,
        stdio: "ignore",
        windowsHide,
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

  // windowsHide:true esconde a janela do Obsidian no Windows (processo sem MainWindowHandle).
  // Preferir `cmd start` com windowsHide:false para abrir a UI visível.

  // 1) start + exe + pasta do vault
  try {
    await spawnGuiDetached("cmd.exe", ["/c", "start", "", exe, vaultDir]);
    return "windows-start-exe-vault";
  } catch (err) {
    errors.push(`start exe vault: ${err.message}`);
  }

  // 2) URI absoluto (path) via protocol handler
  try {
    await spawnGuiDetached("cmd.exe", ["/c", "start", "", uris.pathUri]);
    return "windows-start-path-uri";
  } catch (err) {
    errors.push(`start path uri: ${err.message}`);
  }

  // 3) URI por pasta do vault (.agents)
  try {
    await spawnGuiDetached("cmd.exe", ["/c", "start", "", uris.vaultUri]);
    return "windows-start-vault-uri";
  } catch (err) {
    errors.push(`start vault uri: ${err.message}`);
  }

  // 4) URI pelo nome exibido do vault
  try {
    await spawnGuiDetached("cmd.exe", ["/c", "start", "", uris.namedVaultUri]);
    return "windows-start-named-vault-uri";
  } catch (err) {
    errors.push(`start named vault: ${err.message}`);
  }

  // 5) Fallback direto no exe (sem esconder janela)
  try {
    await spawnGuiDetached(exe, [vaultDir]);
    return "obsidian-exe-vault-dir";
  } catch (err) {
    errors.push(`exe vault: ${err.message}`);
  }

  throw new Error(errors.join("; ") || "Falha ao iniciar Obsidian no Windows");
}

async function launchObsidianUnix(uri, vaultDir) {
  if (process.platform === "darwin") {
    await spawnGuiDetached("open", [uri]);
    return "mac-open-uri";
  }
  await spawnGuiDetached("xdg-open", [uri]);
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
    graph: vault.graph || auditVaultGraph(workspaceDir),
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