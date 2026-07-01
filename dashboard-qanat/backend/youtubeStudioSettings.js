import fs from "fs";
import path from "path";

const SETTINGS_FILE = "youtube_studio_settings.json";

export const DEFAULT_REPLY_TEMPLATES = [
  { id: "thanks", label: "Agradecer", text: "Obrigado pelo comentário! Fico feliz que tenha gostado. 🙏" },
  { id: "question", label: "Próximo vídeo", text: "Ótima pergunta! Vou considerar isso em um próximo vídeo." },
  { id: "description", label: "Na descrição", text: "Mais detalhes e links estão na descrição do vídeo." },
  { id: "part2", label: "Parte 2", text: "Parte 2 em breve — ative o sininho para não perder!" },
];

function settingsPath(workspaceDir) {
  return path.join(workspaceDir, SETTINGS_FILE);
}

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function loadStudioSettings(workspaceDir) {
  const stored = readJsonSafe(settingsPath(workspaceDir)) || {};
  const templates = Array.isArray(stored.replyTemplates) && stored.replyTemplates.length
    ? stored.replyTemplates
    : DEFAULT_REPLY_TEMPLATES;
  return {
    handledCommentIds: Array.isArray(stored.handledCommentIds) ? stored.handledCommentIds : [],
    replyTemplates: templates,
    weeklyReportEmail: String(stored.weeklyReportEmail || "").trim(),
    smtp: stored.smtp || null,
    lastWeeklyReportAt: stored.lastWeeklyReportAt || null,
    lastWeeklyReportPath: stored.lastWeeklyReportPath || null,
  };
}

export function saveStudioSettings(workspaceDir, patch = {}) {
  const current = loadStudioSettings(workspaceDir);
  const next = {
    ...current,
    ...patch,
    handledCommentIds: patch.handledCommentIds ?? current.handledCommentIds,
    replyTemplates: patch.replyTemplates ?? current.replyTemplates,
  };
  fs.writeFileSync(settingsPath(workspaceDir), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function getHandledCommentIds(workspaceDir) {
  return new Set(loadStudioSettings(workspaceDir).handledCommentIds.map(String));
}

export function markCommentHandled(workspaceDir, threadId) {
  const id = String(threadId || "").trim();
  if (!id) throw new Error("threadId é obrigatório.");
  const settings = loadStudioSettings(workspaceDir);
  if (!settings.handledCommentIds.includes(id)) {
    settings.handledCommentIds.push(id);
    saveStudioSettings(workspaceDir, { handledCommentIds: settings.handledCommentIds });
  }
  return { success: true, threadId: id };
}

export function unmarkCommentHandled(workspaceDir, threadId) {
  const id = String(threadId || "").trim();
  const settings = loadStudioSettings(workspaceDir);
  const next = settings.handledCommentIds.filter((item) => item !== id);
  saveStudioSettings(workspaceDir, { handledCommentIds: next });
  return { success: true, threadId: id };
}

export function updateReplyTemplates(workspaceDir, templates) {
  const normalized = (templates || [])
    .map((item, index) => ({
      id: String(item?.id || `tpl_${index}`).trim(),
      label: String(item?.label || `Template ${index + 1}`).trim().slice(0, 40),
      text: String(item?.text || "").trim().slice(0, 10000),
    }))
    .filter((item) => item.text);
  saveStudioSettings(workspaceDir, { replyTemplates: normalized.length ? normalized : DEFAULT_REPLY_TEMPLATES });
  return loadStudioSettings(workspaceDir).replyTemplates;
}