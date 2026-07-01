import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export const PIPELINE_STEPS = [
  { id: "mix", label: "Mix BGM", script: "mix_bgm.py", optional: true },
  { id: "render", label: "Render Remotion PRO", mode: "remotion-pro" },
  { id: "metadata", label: "Metadados YouTube", api: true },
  { id: "thumbnails", label: "Thumbnails", api: true },
  { id: "upload", label: "Upload YouTube", script: "upload_youtube.py" },
];

function runPython(pythonPath, cwd, script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonPath, [script, ...args], {
      cwd,
      shell: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `Exit ${code}`));
    });
  });
}

export async function runPipelineStep({
  stepId,
  projDir,
  pythonPath,
  sendLog,
  handlers = {},
}) {
  const step = PIPELINE_STEPS.find((s) => s.id === stepId);
  if (!step) throw new Error(`Step desconhecido: ${stepId}`);

  sendLog(`[Pipeline] ▶ ${step.label}...`);

  if (step.script) {
    const scriptPath = path.join(projDir, step.script);
    if (!fs.existsSync(scriptPath)) {
      if (step.optional) {
        sendLog(`[Pipeline] ⏭ ${step.script} não encontrado (opcional).`);
        return { skipped: true };
      }
      throw new Error(`${step.script} não encontrado.`);
    }
    const result = await runPython(pythonPath, projDir, step.script, [projDir]);
    if (result.stdout) {
      for (const line of result.stdout.split("\n").filter(Boolean)) sendLog(line);
    }
    return { success: true };
  }

  if (step.api && handlers[stepId]) {
    await handlers[stepId](projDir, sendLog);
    return { success: true };
  }

  if (step.id === "render" && handlers.render) {
    await handlers.render(projDir, sendLog, step.mode);
    return { success: true };
  }

  throw new Error(`Handler ausente para step ${stepId}`);
}

export async function runFullPipeline({
  projDir,
  pythonPath,
  sendLog,
  steps = ["mix", "render", "metadata", "thumbnails", "upload"],
  handlers = {},
}) {
  const results = [];
  for (const stepId of steps) {
    try {
      const result = await runPipelineStep({ stepId, projDir, pythonPath, sendLog, handlers });
      results.push({ stepId, ok: true, ...result });
    } catch (err) {
      results.push({ stepId, ok: false, error: err.message });
      sendLog(`[Pipeline] ✗ Falha em ${stepId}: ${err.message}`);
      break;
    }
  }
  return results;
}