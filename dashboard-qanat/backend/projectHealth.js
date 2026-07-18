import fs from "fs";
import path from "path";
import {
  hashNarrationIntegrityText,
  normalizeNarrationIntegrityText,
} from "./narrationChunks.js";
import { stripTtsMarkersForPlainText } from "./videoProEnhancements.js";
import { readNarrationAudit } from "./narrationAudit.js";

function readJsonSafe(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function fileInfo(baseDir, name, { required = false } = {}) {
  const file = path.join(baseDir, name);
  try {
    const stat = fs.statSync(file);
    return {
      name,
      exists: true,
      required,
      kind: stat.isDirectory() ? "directory" : "file",
      bytes: stat.isFile() ? stat.size : null,
      modifiedAt: stat.mtime.toISOString(),
      status: "ok",
    };
  } catch {
    return {
      name,
      exists: false,
      required,
      kind: "file",
      bytes: null,
      modifiedAt: null,
      status: required ? "error" : "missing",
    };
  }
}

export function getDiskSpace(targetPath) {
  try {
    const stat = fs.statfsSync(targetPath);
    const blockSize = Number(stat.bsize || 0);
    const totalBytes = Number(stat.blocks || 0) * blockSize;
    const freeBytes = Number(stat.bavail || stat.bfree || 0) * blockSize;
    const freePercent = totalBytes > 0 ? (freeBytes / totalBytes) * 100 : 0;
    return {
      ok: true,
      path: targetPath,
      totalBytes,
      freeBytes,
      freePercent: Number(freePercent.toFixed(1)),
      status: freePercent < 5 ? "error" : freePercent < 12 ? "warning" : "ok",
    };
  } catch (err) {
    return {
      ok: false,
      path: targetPath,
      error: err.message,
      status: "warning",
    };
  }
}

function integrityCheck(id, label, status, detail) {
  return { id, label, status, detail };
}

export function buildNarrationIntegrityReport(projectDir) {
  const storyboard = readJsonSafe(path.join(projectDir, "storyboard.json"), {});
  const source = normalizeNarrationIntegrityText(
    storyboard.narrative_script || ""
  );
  const tagged = String(storyboard.narrative_script_tagged || "").trim();
  const integrity = storyboard.narration_integrity || {};
  const plan = storyboard.narration_chunk_plan || {};
  const sourceHash = source ? hashNarrationIntegrityText(source) : "";
  const approvedHash = String(integrity.approved_text_sha256 || "").trim();
  const taggedHash = tagged ? hashNarrationIntegrityText(tagged) : "";
  const approvedTaggedHash = String(
    integrity.approved_tagged_sha256 || ""
  ).trim();
  const strippedTagged = tagged
    ? normalizeNarrationIntegrityText(stripTtsMarkersForPlainText(tagged))
    : "";
  const planHash = String(plan.source_narration_hash || "").trim();
  const chunks = Array.isArray(plan.chunks) ? plan.chunks : [];
  const plannedText = normalizeNarrationIntegrityText(
    chunks.map((chunk) => chunk?.text || "").join(" ")
  );
  const plannedTaggedText = normalizeNarrationIntegrityText(
    chunks
      .map((chunk) => chunk?.text_tagged || chunk?.text || "")
      .join(" ")
      .replace(/[\u200b\u2060\ufeff]/g, "")
  );
  const taggedMatchesApprovedChunkOverrides =
    chunks.length > 0 &&
    plannedText === source &&
    plannedTaggedText === normalizeNarrationIntegrityText(tagged);
  const checks = [];

  checks.push(
    source
      ? integrityCheck(
          "source",
          "Texto principal",
          "ok",
          `${source.length} caracteres preservados`
        )
      : integrityCheck(
          "source",
          "Texto principal",
          "warning",
          "Storyboard sem narrative_script"
        )
  );
  checks.push(
    !approvedHash
      ? integrityCheck(
          "approved",
          "Versao aprovada",
          "warning",
          "Hash de aprovacao ainda nao registrado"
        )
      : sourceHash === approvedHash
        ? integrityCheck(
            "approved",
            "Versao aprovada",
            "ok",
            "Texto atual corresponde ao texto aprovado"
          )
        : integrityCheck(
            "approved",
            "Versao aprovada",
            "error",
            "Texto atual foi alterado depois da aprovacao"
          )
  );
  checks.push(
    !tagged
      ? integrityCheck(
          "tagged",
          "Texto com tags TTS",
          "neutral",
          "Nenhuma versao com tags"
        )
      : strippedTagged === source
        ? integrityCheck(
            "tagged",
            "Texto com tags TTS",
            "ok",
            "Tags nao mudaram as palavras faladas"
          )
        : taggedMatchesApprovedChunkOverrides
          ? integrityCheck(
              "tagged",
              "Texto com tags TTS",
              "ok",
              "Pronuncia expressiva aprovada nos trechos; legenda principal permanece intacta"
            )
          : integrityCheck(
              "tagged",
              "Texto com tags TTS",
              "error",
              "A versao com tags mudou o texto falado"
            )
  );
  if (tagged && approvedTaggedHash) {
    checks.push(
      taggedHash === approvedTaggedHash
        ? integrityCheck(
            "tagged-approved",
            "Tags aprovadas",
            "ok",
            "Versao com tags permanece intacta"
          )
        : integrityCheck(
            "tagged-approved",
            "Tags aprovadas",
            "error",
            "Tags mudaram depois da aprovacao"
          )
    );
  }
  checks.push(
    !chunks.length
      ? integrityCheck(
          "chunks",
          "Plano por trechos",
          "neutral",
          "Projeto sem plano de trechos"
        )
      : plannedText !== source
        ? integrityCheck(
            "chunks",
            "Plano por trechos",
            "error",
            "Trechos nao recompõem a narracao aprovada"
          )
        : planHash && planHash !== sourceHash
          ? integrityCheck(
              "chunks",
              "Plano por trechos",
              "error",
              "Plano pertence a outra versao da narracao"
            )
          : integrityCheck(
              "chunks",
              "Plano por trechos",
              "ok",
              `${chunks.length} trechos correspondem ao texto principal`
            )
  );

  const audit = readNarrationAudit(projectDir);
  const errors = checks.filter((check) => check.status === "error").length;
  const warnings = checks.filter((check) => check.status === "warning").length;
  return {
    status: errors ? "error" : warnings ? "warning" : "ok",
    sourceHash: sourceHash || null,
    approvedHash: approvedHash || null,
    checks,
    auditEvents: audit.events.length,
    lastAuditEvent: audit.events.at(-1) || null,
  };
}

export function buildProjectHealthReport({
  workspaceDir,
  projectDir = null,
  projectName = "",
}) {
  const memory = process.memoryUsage();
  const system = {
    status: "ok",
    pid: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    memory: {
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
    },
    disk: getDiskSpace(workspaceDir),
  };

  if (!projectDir) {
    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      overall: system.disk.status,
      system,
      project: null,
    };
  }

  const files = [
    fileInfo(projectDir, "config_qanat.json", { required: true }),
    fileInfo(projectDir, "storyboard.json", { required: true }),
    fileInfo(projectDir, "narracao_mestra_premium.mp3"),
    fileInfo(projectDir, "block_timings.json"),
    fileInfo(projectDir, "word_transcripts.json"),
    fileInfo(projectDir, "narration_chunks"),
    fileInfo(projectDir, "narration_audit.json"),
  ];
  const integrity = buildNarrationIntegrityReport(projectDir);
  const requiredMissing = files.filter(
    (file) => file.required && !file.exists
  ).length;
  const narrationTextExists = Boolean(
    normalizeNarrationIntegrityText(
      readJsonSafe(path.join(projectDir, "storyboard.json"), {})
        .narrative_script || ""
    )
  );
  const narrationAudio = files.find(
    (file) => file.name === "narracao_mestra_premium.mp3"
  );
  const alerts = [];
  if (requiredMissing)
    alerts.push(`${requiredMissing} arquivo(s) essencial(is) ausente(s)`);
  if (narrationTextExists && !narrationAudio?.exists)
    alerts.push("Narracao aprovada sem MP3 master");
  if (integrity.status === "error")
    alerts.push("Integridade da narracao comprometida");
  if (system.disk.status !== "ok") alerts.push("Pouco espaco livre no disco");
  const overall =
    requiredMissing ||
    integrity.status === "error" ||
    system.disk.status === "error"
      ? "error"
      : alerts.length ||
          integrity.status === "warning" ||
          system.disk.status === "warning"
        ? "warning"
        : "ok";

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    overall,
    system,
    project: {
      name: projectName || path.basename(projectDir),
      path: projectDir,
      files,
      integrity,
      alerts,
    },
  };
}
