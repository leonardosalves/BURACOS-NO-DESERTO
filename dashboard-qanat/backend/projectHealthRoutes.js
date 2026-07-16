import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { buildProjectHealthReport } from "./projectHealth.js";

const execFileAsync = promisify(execFile);

function escapePowerShellSingle(value) {
  return String(value).replace(/'/g, "''");
}

async function runTempCacheTool(
  workspaceDir,
  { apply = false, includeExternal = false, minimumAgeHours = 24 } = {}
) {
  const script = path.join(workspaceDir, "scripts", "cleanup-lumiera-temp.ps1");
  const safeHours = Math.max(
    1,
    Math.min(24 * 90, Number(minimumAgeHours) || 24)
  );
  const command = [
    `& '${escapePowerShellSingle(script)}'`,
    apply ? "-Apply" : "",
    includeExternal ? "-IncludeExternalCaches" : "",
    `-MinimumAgeHours ${safeHours}`,
    "-Quiet",
    "| ConvertTo-Json -Depth 6 -Compress",
  ]
    .filter(Boolean)
    .join(" ");
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    {
      cwd: workspaceDir,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
    }
  );
  const raw = String(stdout || "")
    .replace(/^\uFEFF/, "")
    .trim();
  if (!raw) throw new Error("O diagnostico de cache nao retornou dados.");
  return JSON.parse(raw);
}

export function registerProjectHealthRoutes(app, deps) {
  const {
    WORKSPACE_DIR,
    getProjectDir,
    countActiveRenderJobs = () => 0,
  } = deps;

  app.get("/api/project-health", (req, res) => {
    try {
      const projectName = String(req.query?.project || "").trim();
      let projectDir = null;
      if (projectName) projectDir = getProjectDir(req);
      res.json(
        buildProjectHealthReport({
          workspaceDir: WORKSPACE_DIR,
          projectDir,
          projectName,
        })
      );
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/project-health/temp-cache", async (req, res) => {
    try {
      const result = await runTempCacheTool(WORKSPACE_DIR, {
        includeExternal: req.query?.include_external === "true",
        minimumAgeHours: req.query?.minimum_age_hours,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/project-health/temp-cache/cleanup", async (req, res) => {
    try {
      if (String(req.body?.confirm || "") !== "LIMPAR") {
        return res.status(400).json({ error: "Confirmacao LIMPAR ausente." });
      }
      const activeRenders = Number(countActiveRenderJobs()) || 0;
      if (activeRenders > 0) {
        return res.status(409).json({
          error: "Limpeza bloqueada durante renderizacao.",
          renderActive: activeRenders,
        });
      }
      const result = await runTempCacheTool(WORKSPACE_DIR, {
        apply: true,
        includeExternal: req.body?.includeExternal === true,
        minimumAgeHours: req.body?.minimumAgeHours,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
