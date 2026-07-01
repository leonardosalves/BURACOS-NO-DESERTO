/**
 * Loop Engineering — integração com @cobusgreyling/loop-{audit,cost,sync,init}
 * https://github.com/cobusgreyling/loop-engineering
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const LOOP_PATTERNS = [
  {
    id: "changelog-drafter",
    name: "Changelog Drafter",
    cadence: "1d",
    risk: "low",
    tokenCost: "low",
    stateFile: "changelog-drafter-state.md",
    description: "Rascunho de release notes a partir de merges/commits — revisão humana.",
  },
  {
    id: "daily-triage",
    name: "Daily Triage",
    cadence: "1d–2h",
    risk: "low",
    tokenCost: "low",
    stateFile: "STATE.md",
    description: "Scan matinal de CI, issues e commits — L1 report-only na semana 1.",
  },
  {
    id: "pr-babysitter",
    name: "PR Babysitter",
    cadence: "5–15m",
    risk: "medium",
    tokenCost: "high",
    stateFile: "pr-babysitter-state.md",
    description: "Acompanha PRs por review, CI, rebase e merge.",
  },
  {
    id: "ci-sweeper",
    name: "CI Sweeper",
    cadence: "5–15m",
    risk: "medium",
    tokenCost: "very-high",
    stateFile: "ci-sweeper-state.md",
    description: "Reage a CI falhando com fixes mínimos e escalação.",
  },
  {
    id: "dependency-sweeper",
    name: "Dependency Sweeper",
    cadence: "6h–1d",
    risk: "medium",
    tokenCost: "medium",
    stateFile: "dependency-sweeper-state.md",
    description: "Atualiza dependências e CVEs com gates humanos.",
  },
  {
    id: "post-merge-cleanup",
    name: "Post-Merge Cleanup",
    cadence: "1d–6h",
    risk: "low",
    tokenCost: "low",
    stateFile: "post-merge-state.md",
    description: "Tech debt e limpeza após merges em main.",
  },
  {
    id: "issue-triage",
    name: "Issue Triage",
    cadence: "2h–1d",
    risk: "low",
    tokenCost: "low",
    stateFile: "issue-triage-state.md",
    description: "Dedup, priorização e labels em issues.",
  },
];

const LOOP_FILES = [
  "LOOP.md",
  "STATE.md",
  "loop-budget.md",
  "loop-run-log.md",
  "loop-constraints.md",
  "changelog-drafter-state.md",
  "AGENTS.md",
];

const NPX = "npx";
const CLI_TIMEOUT_MS = 180000;

function readTextSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function parseJsonOutput(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseSyncReport(raw) {
  const json = parseJsonOutput(raw);
  if (json && typeof json.score === "number") return json;

  const scoreMatch = raw.match(/Score:\s*(\d+)\/100/i);
  const issueMatch = raw.match(/Found\s+(\d+)\s+issue/i);
  const missingState = /STATE\.md.*missing/i.test(raw);

  return {
    score: scoreMatch ? Number(scoreMatch[1]) : null,
    issueCount: issueMatch ? Number(issueMatch[1]) : missingState ? 1 : 0,
    issues: missingState ? [{ severity: "error", message: "STATE.md is missing" }] : [],
    raw: raw.slice(0, 4000),
  };
}

function parseCostReport(raw) {
  const json = parseJsonOutput(raw);
  if (json) return json;

  const blendMatch = raw.match(/Realistic blend:\s*([\d,]+)k/i);
  const capMatch = raw.match(/Suggested daily cap:\s*([\d,]+)k/i);
  const patternMatch = raw.match(/Loop Cost Estimate —\s*(.+?)\s*\(/);

  return {
    pattern: patternMatch?.[1]?.trim() || null,
    realisticBlendDaily: blendMatch ? Number(blendMatch[1].replace(/,/g, "")) * 1000 : null,
    suggestedDailyCap: capMatch ? Number(capMatch[1].replace(/,/g, "")) * 1000 : null,
    raw: raw.slice(0, 4000),
  };
}

function runNpxCli(packageName, args, workspaceDir) {
  // Use "." as target — cwd is workspaceDir (avoids Windows shell splitting paths with spaces)
  const cliArgs = args.map((a) => (a === workspaceDir ? "." : a));
  const result = spawnSync(NPX, ["--yes", packageName, ...cliArgs], {
    cwd: workspaceDir,
    encoding: "utf8",
    timeout: CLI_TIMEOUT_MS,
    windowsHide: true,
    shell: process.platform === "win32",
  });

  if (result.error) throw result.error;

  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();
  const combined = [stdout, stderr].filter(Boolean).join("\n");

  return {
    ok: result.status === 0 || result.status === 2,
    exitCode: result.status,
    stdout,
    stderr,
    combined,
  };
}

function detectActivePattern(workspaceDir) {
  const loopMd = readTextSafe(path.join(workspaceDir, "LOOP.md")) || "";
  for (const p of LOOP_PATTERNS) {
    if (loopMd.toLowerCase().includes(p.id) || loopMd.includes(p.name)) {
      return p.id;
    }
  }
  const statePaths = LOOP_PATTERNS.map((p) => p.stateFile).filter((f) =>
    fs.existsSync(path.join(workspaceDir, f)),
  );
  if (statePaths.includes("changelog-drafter-state.md")) return "changelog-drafter";
  if (statePaths.includes("STATE.md")) return "daily-triage";
  return "changelog-drafter";
}

function extractLastRunFromState(content) {
  if (!content) return null;
  const m = content.match(/Last run:\s*(.+)/i);
  return m ? m[1].trim() : null;
}

export function listLoopPatterns() {
  return LOOP_PATTERNS;
}

export function getLoopFileIndex(workspaceDir) {
  return LOOP_FILES.map((name) => {
    const full = path.join(workspaceDir, name);
    const exists = fs.existsSync(full);
    return {
      name,
      exists,
      size: exists ? fs.statSync(full).size : 0,
      mtime: exists ? fs.statSync(full).mtime.toISOString() : null,
    };
  });
}

export function getLoopEngineeringStatus(workspaceDir, { includeCli = false } = {}) {
  const activePattern = detectActivePattern(workspaceDir);
  const pattern = LOOP_PATTERNS.find((p) => p.id === activePattern) || LOOP_PATTERNS[0];
  const statePath = path.join(workspaceDir, pattern.stateFile);
  const stateContent = readTextSafe(statePath);
  const loopMd = readTextSafe(path.join(workspaceDir, "LOOP.md"));

  let audit = null;
  let sync = null;
  let cost = null;

  if (includeCli) {
    try {
      audit = runLoopAudit(workspaceDir, { suggest: false });
    } catch (err) {
      audit = { error: err.message };
    }

    try {
      sync = runLoopSync(workspaceDir);
    } catch (err) {
      sync = { error: err.message };
    }

    try {
      cost = runLoopCost(workspaceDir, { pattern: activePattern, level: "L1" });
    } catch (err) {
      cost = { error: err.message };
    }
  }

  const grokSkillsDir = path.join(workspaceDir, ".grok", "skills");
  let loopSkillCount = 0;
  if (fs.existsSync(grokSkillsDir)) {
    loopSkillCount = fs.readdirSync(grokSkillsDir).filter((d) => {
      const skillMd = path.join(grokSkillsDir, d, "SKILL.md");
      return fs.existsSync(skillMd);
    }).length;
  }

  return {
    installed: Boolean(loopMd),
    activePattern: activePattern,
    pattern,
    patterns: LOOP_PATTERNS,
    files: getLoopFileIndex(workspaceDir),
    lastRun: extractLastRunFromState(stateContent) || extractLastRunFromState(readTextSafe(path.join(workspaceDir, "STATE.md"))),
    stateFile: pattern.stateFile,
    loopSkillCount,
    audit,
    sync,
    cost,
    firstLoopCommand: buildFirstLoopCommand(activePattern, "grok"),
    lumieraLinks: {
      studioAgents: "Studio Agents → Loops",
      videoAgentMemory: ".agents/memory/videoagent-lumiera.md",
      hermesSkill: ".agents/skills/studio-agents-hermes",
      opsSkill: ".agents/skills/lumiera-ops",
    },
  };
}

export function runLoopAudit(workspaceDir, { suggest = false } = {}) {
  const args = [workspaceDir, "--json"];
  if (suggest) args.push("--suggest");
  const result = runNpxCli("@cobusgreyling/loop-audit", args, workspaceDir);
  const parsed = parseJsonOutput(result.stdout) || parseJsonOutput(result.combined);

  if (!parsed) {
    const err = new Error(result.stderr || result.stdout || `loop-audit exit ${result.exitCode}`);
    err.raw = result.combined;
    throw err;
  }

  return {
    ...parsed,
    exitCode: result.exitCode,
    suggestAvailable: suggest,
  };
}

export function runLoopSync(workspaceDir) {
  const result = runNpxCli("@cobusgreyling/loop-sync", [workspaceDir, "--json"], workspaceDir);
  const parsed = parseJsonOutput(result.stdout) || parseSyncReport(result.combined);

  return {
    ...parsed,
    exitCode: result.exitCode,
    healthy: (parsed?.score ?? 0) >= 90,
  };
}

export function runLoopCost(workspaceDir, { pattern = "changelog-drafter", level = "L1", cadence } = {}) {
  const args = ["--pattern", pattern, "--level", level, "--json"];
  if (cadence) args.push("--cadence", cadence);
  const result = runNpxCli("@cobusgreyling/loop-cost", args, workspaceDir);
  const parsed = parseJsonOutput(result.stdout) || parseCostReport(result.combined);

  if (!parsed && result.exitCode !== 0) {
    const err = new Error(result.stderr || result.stdout || `loop-cost exit ${result.exitCode}`);
    err.raw = result.combined;
    throw err;
  }

  return {
    pattern,
    level,
    ...parsed,
    exitCode: result.exitCode,
  };
}

export function runLoopInit(workspaceDir, { pattern = "changelog-drafter", tool = "grok" } = {}) {
  const validPattern = LOOP_PATTERNS.some((p) => p.id === pattern) ? pattern : "changelog-drafter";
  const validTool = ["grok", "claude", "codex", "cursor", "opencode"].includes(tool) ? tool : "grok";

  const result = runNpxCli(
    "@cobusgreyling/loop-init",
    [workspaceDir, "--pattern", validPattern, "--tool", validTool],
    workspaceDir,
  );

  if (result.exitCode !== 0) {
    const err = new Error(result.stderr || result.stdout || `loop-init exit ${result.exitCode}`);
    err.raw = result.combined;
    throw err;
  }

  let audit = null;
  try {
    audit = runLoopAudit(workspaceDir);
  } catch {
    /* non-blocking */
  }

  return {
    ok: true,
    pattern: validPattern,
    tool: validTool,
    output: result.combined.slice(0, 8000),
    audit,
    status: getLoopEngineeringStatus(workspaceDir),
  };
}

function buildFirstLoopCommand(patternId, tool) {
  const commands = {
    "changelog-drafter":
      "/loop 1d Run changelog-scan on merges since last tag. Produce categorized draft in RELEASE_NOTES_DRAFT.md using draft-release-notes. Update changelog-drafter-state.md. Human review only.",
    "daily-triage":
      "/loop 1d Run loop-triage. Update STATE.md. Report-only (L1) — no auto-fix in week one.",
    "pr-babysitter":
      "/loop 15m Watch open PRs. Triage review comments and CI. Escalate security/auth changes.",
    "issue-triage":
      "/loop 1d Run issue-triage. Propose labels and dedupe. Human review before applying.",
  };
  return {
    tool,
    command: commands[patternId] || commands["changelog-drafter"],
  };
}

export function appendLoopRunLog(workspaceDir, entry) {
  const logPath = path.join(workspaceDir, "loop-run-log.md");
  const stamp = new Date().toISOString();
  const payload = {
    run_id: entry.run_id || stamp,
    pattern: entry.pattern || detectActivePattern(workspaceDir),
    duration_s: entry.duration_s ?? null,
    items_found: entry.items_found ?? 0,
    actions_taken: entry.actions_taken ?? 0,
    escalations: entry.escalations ?? 0,
    tokens_estimate: entry.tokens_estimate ?? null,
    outcome: entry.outcome || "report-only",
    source: entry.source || "lumiera-studio-agents",
    note: entry.note || null,
  };

  const block = `\n### ${stamp}\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`;
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, `# Loop Run Log — Lumiera\n\n${block}`, "utf8");
  } else {
    fs.appendFileSync(logPath, block, "utf8");
  }

  return { ok: true, entry: payload, path: logPath };
}