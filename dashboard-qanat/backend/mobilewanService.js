import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import {
  registerExternalJob,
  updateExternalJob,
} from "./externalJobRegistry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, "../..");
const MODELS_DIR = path.join(WORKSPACE_DIR, "models");
const MOBILEWAN_CHECKPOINT_DIR = path.join(
  MODELS_DIR,
  "MobileWAN-T2V-1.3B-FP16"
);

// Read python path configured in server.js
const PYTHON_PATH = "C:\\Users\\Leo\\AppData\\Local\\Python\\bin\\python.exe";

export function isMobileWanAvailable() {
  const sf = path.join(
    MOBILEWAN_CHECKPOINT_DIR,
    "diffusion_pytorch_model.safetensors"
  );
  const idx = path.join(
    MOBILEWAN_CHECKPOINT_DIR,
    "diffusion_pytorch_model.safetensors.index.json"
  );
  return fs.existsSync(sf) || fs.existsSync(idx);
}

export function downloadMobileWanWeights(token) {
  const promptId = "mobilewan-download-" + randomUUID();
  const job = {
    prompt_id: promptId,
    status: "running",
    percent: 10,
    message: "Iniciando download dos pesos de MobileWAN...",
    outputs: null,
    error: null,
    started_at: Date.now(),
    updated_at: Date.now(),
  };

  registerExternalJob(promptId, job);

  const scriptPath = path.join(
    WORKSPACE_DIR,
    "scripts",
    "download_mobilewan.py"
  );
  const child = spawn(
    PYTHON_PATH,
    [scriptPath, "--token", token, "--output_dir", MOBILEWAN_CHECKPOINT_DIR],
    {
      cwd: WORKSPACE_DIR,
      env: { ...process.env },
    }
  );

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (data) => {
    stdout += data.toString();
    console.log(`[MobileWAN Download] ${data.toString().trim()}`);
    if (data.toString().includes("Downloading")) {
      updateExternalJob(promptId, {
        percent: 40,
        message: "Baixando arquivos do Hugging Face...",
      });
    }
  });

  child.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  child.on("close", (code) => {
    if (code === 0) {
      updateExternalJob(promptId, {
        status: "completed",
        percent: 100,
        message: "Pesos baixados com sucesso!",
      });
    } else {
      let errorMsg = stderr.trim() || "Falha no script de download.";
      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.error) errorMsg = parsed.error;
      } catch {}
      updateExternalJob(promptId, {
        status: "error",
        error: errorMsg,
        message: "Erro no download.",
      });
    }
  });

  return { prompt_id: promptId };
}

export async function queueMobileWanGeneration({
  prompt,
  aspect_ratio = "9:16",
  steps = 3,
  high_quality = false,
}) {
  if (!isMobileWanAvailable()) {
    throw new Error(
      "Pesos do MobileWAN não encontrados. Por favor, faça o download primeiro nas configurações."
    );
  }

  const promptId = "mobilewan-gen-" + randomUUID();
  const outputFilename = `${promptId}.mp4`;
  const mobileWanOutputDir = path.join(WORKSPACE_DIR, "mobilewan", "output");

  if (!fs.existsSync(mobileWanOutputDir)) {
    fs.mkdirSync(mobileWanOutputDir, { recursive: true });
  }

  const job = {
    prompt_id: promptId,
    status: "running",
    percent: 10,
    message: "Iniciando geração MobileWAN...",
    outputs: null,
    error: null,
    started_at: Date.now(),
    updated_at: Date.now(),
  };

  registerExternalJob(promptId, job);

  const sampleScript = path.join(
    WORKSPACE_DIR,
    "mobilewan",
    "scripts",
    "sample.py"
  );
  const args = [
    sampleScript,
    "--pretrained_model_name_or_path",
    "Wan-AI/Wan2.2-TI2V-5B-Diffusers",
    "--checkpoint",
    MOBILEWAN_CHECKPOINT_DIR,
    "--prompt",
    prompt,
    "--output_dir",
    mobileWanOutputDir,
    "--output_name",
    outputFilename,
    "--num_denoising_steps",
    String(steps),
  ];

  if (high_quality) {
    args.push("--high_quality");
  }

  console.log(`[MobileWAN T2V] Executing command: python ${args.join(" ")}`);

  const child = spawn(PYTHON_PATH, args, {
    cwd: path.join(WORKSPACE_DIR, "mobilewan"),
    env: {
      ...process.env,
      PYTHONPATH: path.join(WORKSPACE_DIR, "mobilewan"),
    },
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (data) => {
    stdout += data.toString();
    console.log(`[MobileWAN] ${data.toString().trim()}`);

    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.includes("Loading pipeline")) {
        updateExternalJob(promptId, {
          percent: 30,
          message: "Carregando pipeline de difusão...",
        });
      } else if (line.includes("Applied self-attention head pruning")) {
        updateExternalJob(promptId, {
          percent: 50,
          message: "Aplicando otimizações MobileWAN...",
        });
      } else if (line.includes("Loading fine-tuned transformer")) {
        updateExternalJob(promptId, {
          percent: 70,
          message: "Carregando pesos otimizados...",
        });
      } else if (line.includes("Saved video to")) {
        updateExternalJob(promptId, {
          percent: 95,
          message: "Escrevendo vídeo final...",
        });
      }
    }
  });

  child.stderr.on("data", (data) => {
    stderr += data.toString();
    const line = data.toString().trim();
    const stepMatch = line.match(/(\d+)%\s*\|/);
    if (stepMatch) {
      const pct = Math.floor(70 + parseInt(stepMatch[1], 10) * 0.25);
      updateExternalJob(promptId, {
        percent: pct,
        message: `Geração por difusão (${stepMatch[1]}%)`,
      });
    }
  });

  child.on("close", (code) => {
    const finalDest = path.join(mobileWanOutputDir, outputFilename);
    if (code === 0 && fs.existsSync(finalDest)) {
      updateExternalJob(promptId, {
        status: "completed",
        percent: 100,
        message: "Vídeo gerado com sucesso!",
        outputs: [
          {
            filename: outputFilename,
            subfolder: "",
            type: "output",
            filepath: finalDest,
          },
        ],
      });
      console.log(`[MobileWAN T2V] Concluído! Arquivo gerado: ${finalDest}`);
    } else {
      const errorMsg = stderr.trim() || "Inference script exited with error.";
      updateExternalJob(promptId, {
        status: "error",
        error: errorMsg,
        message: "Erro na geração.",
      });
      console.error(`[MobileWAN T2V] Erro: ${errorMsg}`);
    }
  });

  return { prompt_id: promptId };
}
