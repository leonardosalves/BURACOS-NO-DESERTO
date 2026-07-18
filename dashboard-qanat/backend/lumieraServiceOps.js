import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const SERVICE_NAME = "LumieraBackend";
const NSSM_EXE = "C:\\Lumiera\\tools\\nssm\\nssm.exe";

function resolveRepoRoot(backendDir) {
  return path.resolve(backendDir, "..", "..");
}

export function isWindowsServiceMode(backendDir) {
  if (process.platform !== "win32") return false;
  const marker = path.join(
    resolveRepoRoot(backendDir),
    ".lumiera-logs",
    "windows-service.mode"
  );
  if (fs.existsSync(marker)) return true;
  const user = String(
    process.env.USERNAME || process.env.USER || ""
  ).toUpperCase();
  return user === "SYSTEM";
}

function resolveNssmExe(backendDir) {
  if (fs.existsSync(NSSM_EXE)) return NSSM_EXE;
  const repoNssm = path.join(
    resolveRepoRoot(backendDir),
    "tools",
    "nssm",
    "nssm.exe"
  );
  if (fs.existsSync(repoNssm)) return repoNssm;
  return null;
}

function resolveRestartBackendScript(backendDir) {
  const script = path.join(
    resolveRepoRoot(backendDir),
    "scripts",
    "restart-backend.ps1"
  );
  return fs.existsSync(script) ? script : null;
}

export function getLumieraServiceOpsStatus(backendDir) {
  const windowsService = isWindowsServiceMode(backendDir);
  const nssmExe = resolveNssmExe(backendDir);
  return {
    platform: process.platform,
    windowsService,
    serviceName: SERVICE_NAME,
    canRestart: process.platform === "win32",
    nssmAvailable: Boolean(nssmExe),
    restartScript: resolveRestartBackendScript(backendDir),
    pid: process.pid,
    uptimeSec: Math.floor(process.uptime()),
  };
}

export function scheduleLumieraServiceRestart(backendDir) {
  if (process.platform !== "win32") {
    return { scheduled: false, error: "Reinício de serviço só no Windows." };
  }

  const windowsService = isWindowsServiceMode(backendDir);

  if (windowsService) {
    // O processo do serviço não precisa abrir o Service Control Manager para
    // reiniciar a si próprio. Encerrar normalmente é mais confiável: o NSSM
    // está configurado com AppExit=Restart e inicia um Node novo com o código
    // atualizado. A resposta HTTP tem tempo de ser enviada antes da saída.
    const timer = setTimeout(() => process.exit(0), 1500);
    timer.unref();
    return {
      scheduled: true,
      mode: "windows-service-self-exit",
      serviceName: SERVICE_NAME,
      message: "Reiniciando serviço LumieraBackend (~10–20s)…",
    };
  }

  const restartScript = resolveRestartBackendScript(backendDir);
  if (restartScript) {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        restartScript,
        "-Force",
      ],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        cwd: path.dirname(restartScript),
      }
    );
    child.unref();
    return {
      scheduled: true,
      mode: windowsService ? "powershell-restart" : "restart-script",
      message: "Reiniciando backend Lumiera…",
    };
  }

  return {
    scheduled: false,
    error:
      "Nenhum método de reinício disponível (NSSM ou restart-backend.ps1).",
  };
}
