import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { getInstagramConnectionStatus } from "./instagramOAuth.js";
import { buildPythonSpawnEnv } from "./pythonEnv.js";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".avi", ".mkv"]);

function makeCheck(id, label, status, detail, action = "") {
  return { id, label, status, detail, action };
}

function commandWorks(command, args = ["-version"]) {
  const candidates =
    process.platform === "win32" && !/\.(cmd|exe)$/i.test(command)
      ? [command, `${command}.cmd`, `${command}.exe`]
      : [command];

  const spawnEnv = buildPythonSpawnEnv();

  for (const candidate of candidates) {
    const result = spawnSync(candidate, args, {
      encoding: "utf8",
      windowsHide: true,
      env: spawnEnv,
    });
    if (result.error?.code === "ENOENT") continue;
    const output =
      (result.stdout || result.stderr || "").trim().split(/\r?\n/)[0] || "";
    return { ok: result.status === 0 || result.status === null, output };
  }
  return { ok: false, output: "" };
}

function countOutputVideos(projDir) {
  const outputDir = path.join(projDir, "OUTPUT", "qanat_persa_video_final");
  if (!fs.existsSync(outputDir))
    return { count: 0, latest: null, dir: outputDir };
  try {
    const files = fs
      .readdirSync(outputDir)
      .filter((f) => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map((f) => {
        const full = path.join(outputDir, f);
        const stat = fs.statSync(full);
        return { name: f, mtime: stat.mtimeMs, sizeBytes: stat.size };
      })
      .sort((a, b) => b.mtime - a.mtime);
    return {
      count: files.length,
      latest: files[0]?.name || null,
      dir: outputDir,
    };
  } catch {
    return { count: 0, latest: null, dir: outputDir };
  }
}

function countStatuses(checks) {
  return checks.reduce(
    (acc, check) => {
      acc[check.status] = (acc[check.status] || 0) + 1;
      return acc;
    },
    { ok: 0, warn: 0, fail: 0 }
  );
}

function overallFromCounts(counts) {
  if (counts.fail > 0) return "fail";
  if (counts.warn > 0) return "warn";
  return "ok";
}

export function buildSocialPublishHealth({
  workspaceDir,
  projectDir = null,
  youtubeScopes = null,
} = {}) {
  const checks = [];

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  checks.push(
    makeCheck(
      "node",
      "Node.js",
      nodeMajor >= 18 ? "ok" : "fail",
      process.versions.node,
      "Instale Node.js 18 ou superior."
    )
  );

  const ffmpeg = commandWorks("ffmpeg", ["-version"]);
  checks.push(
    makeCheck(
      "ffmpeg",
      "FFmpeg",
      ffmpeg.ok ? "ok" : "fail",
      ffmpeg.ok ? ffmpeg.output : "ffmpeg não encontrado no PATH",
      "Instale FFmpeg e adicione ao PATH."
    )
  );

  const ffprobe = commandWorks("ffprobe", ["-version"]);
  checks.push(
    makeCheck(
      "ffprobe",
      "ffprobe",
      ffprobe.ok ? "ok" : "fail",
      ffprobe.ok ? ffprobe.output : "ffprobe não encontrado no PATH",
      "Instale FFmpeg (inclui ffprobe)."
    )
  );

  const python = commandWorks("python", ["--version"]);
  checks.push(
    makeCheck(
      "python",
      "Python",
      python.ok ? "ok" : "warn",
      python.ok
        ? python.output
        : "Python não encontrado — upload TikTok/Kwai pode falhar",
      "Instale Python 3 e Playwright para automação de browser."
    )
  );

  const ytSecrets = path.join(workspaceDir, "youtube_client_secrets.json");
  const ytToken = path.join(workspaceDir, "youtube_token.json");
  const ytConnected = fs.existsSync(ytSecrets) && fs.existsSync(ytToken);
  checks.push(
    makeCheck(
      "youtube-oauth",
      "YouTube OAuth",
      ytConnected ? "ok" : "fail",
      ytConnected
        ? "Credenciais e token salvos"
        : "Configure OAuth em Configurações → Integrações",
      "Vincule a conta Google / YouTube."
    )
  );

  if (ytConnected && youtubeScopes) {
    checks.push(
      makeCheck(
        "youtube-scopes",
        "Escopos YouTube",
        youtubeScopes.ready ? "ok" : "warn",
        youtubeScopes.ready
          ? "Escopos completos (upload + analytics)"
          : `Faltam: ${(youtubeScopes.missingLabels || []).join(", ") || "escopos"}`,
        "Reautorize o YouTube com todos os escopos."
      )
    );
  }

  const igStatus = getInstagramConnectionStatus(workspaceDir);
  const igLegacy = path.join(workspaceDir, "instagram_secrets.json");
  const igConnected = igStatus.connected || fs.existsSync(igLegacy);
  checks.push(
    makeCheck(
      "instagram",
      "Instagram",
      igConnected ? "ok" : "warn",
      igConnected
        ? igStatus.oauthReady
          ? "OAuth Graph API configurado"
          : "Token legado ou OAuth ativo"
        : "Não conectado — Reels via API ou Playwright",
      "Configure Instagram em Configurações → Integrações."
    )
  );

  const ttCookies = path.join(workspaceDir, "tiktok_cookies.json");
  checks.push(
    makeCheck(
      "tiktok",
      "TikTok (Playwright)",
      fs.existsSync(ttCookies) ? "ok" : "warn",
      fs.existsSync(ttCookies)
        ? "Sessão salva (cookies)"
        : "Sem sessão — conecte em Integrações",
      "Use Conectar TikTok no painel de upload."
    )
  );

  const kwCookies = path.join(workspaceDir, "kwai_cookies.json");
  checks.push(
    makeCheck(
      "kwai",
      "Kwai (Playwright)",
      fs.existsSync(kwCookies) ? "ok" : "warn",
      fs.existsSync(kwCookies)
        ? "Sessão salva"
        : "Opcional — conecte se for publicar no Kwai",
      "Use Conectar Kwai nas integrações."
    )
  );

  let projectOutput = null;
  if (projectDir && projectDir !== workspaceDir) {
    projectOutput = countOutputVideos(projectDir);
    const slug = path.basename(projectDir);
    checks.push(
      makeCheck(
        "project-output",
        `Vídeo em OUTPUT (${slug})`,
        projectOutput.count > 0 ? "ok" : "fail",
        projectOutput.count > 0
          ? `${projectOutput.count} arquivo(s) — último: ${projectOutput.latest}`
          : "Nenhum MP4 em OUTPUT/qanat_persa_video_final",
        "Renderize o vídeo na aba Render antes de publicar."
      )
    );
  }

  const counts = countStatuses(checks);
  return {
    generatedAt: new Date().toISOString(),
    overall: overallFromCounts(counts),
    counts,
    checks,
    projectOutput,
    nextSteps: [
      "Verifique integrações em Configurações.",
      "Renderize o vídeo na aba Render.",
      "Gere metadados na aba IA · Metadados.",
      "Adicione à fila de publicação ou publique direto.",
    ],
  };
}
