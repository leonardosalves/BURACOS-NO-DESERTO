/**
 * Supermemory — memória persistente entre conversas do Lumiera.
 * API: https://supermemory.ai/docs
 */

import path from "path";
import { loadRenderConfig, saveRenderConfig } from "./brandAssets.js";

const DEFAULT_BASE_URL = "https://api.supermemory.ai";

function sanitizeContainerTag(raw) {
  return String(raw || "lumiera")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) || "lumiera";
}

export function resolveSupermemoryConfig(backendDir) {
  const cfg = loadRenderConfig(backendDir);
  const apiKey = String(
    cfg.supermemory_api_key || process.env.SUPERMEMORY_API_KEY || "",
  ).trim();
  const baseURL = String(
    cfg.supermemory_base_url || process.env.SUPERMEMORY_BASE_URL || DEFAULT_BASE_URL,
  ).trim().replace(/\/$/, "");
  const enabled = cfg.supermemory_enabled !== false && apiKey.length > 0;
  return {
    apiKey,
    baseURL,
    enabled,
    hasKey: apiKey.length > 0,
  };
}

export function isSupermemoryEnabled(backendDir) {
  return resolveSupermemoryConfig(backendDir).enabled;
}

export function getSupermemoryStatus(backendDir) {
  const { hasKey, enabled, baseURL } = resolveSupermemoryConfig(backendDir);
  const isLocal = baseURL.includes("localhost") || baseURL.includes("127.0.0.1");
  return {
    has_supermemory_key: hasKey,
    supermemory_enabled: enabled,
    supermemory_local: isLocal,
    supermemory_base_url: isLocal ? baseURL : undefined,
  };
}

export function saveSupermemorySettings(backendDir, patch = {}) {
  const cfg = loadRenderConfig(backendDir);
  if (typeof patch.supermemory_api_key === "string" && patch.supermemory_api_key.trim()) {
    cfg.supermemory_api_key = patch.supermemory_api_key.trim();
  }
  if (typeof patch.supermemory_base_url === "string" && patch.supermemory_base_url.trim()) {
    cfg.supermemory_base_url = patch.supermemory_base_url.trim().replace(/\/$/, "");
  }
  if (typeof patch.supermemory_enabled === "boolean") {
    cfg.supermemory_enabled = patch.supermemory_enabled;
  }
  saveRenderConfig(backendDir, cfg);
  return getSupermemoryStatus(backendDir);
}

export function buildContainerTags(projDir) {
  const projectSlug = sanitizeContainerTag(
    path.basename(String(projDir || "").replace(/\\/g, "/")),
  );
  return {
    workspace: "lumiera-studio",
    project: `lumiera-proj-${projectSlug}`,
  };
}

function formatProfileBlock(profilePayload) {
  if (!profilePayload || typeof profilePayload !== "object") return "";

  const profile = profilePayload.profile || profilePayload;
  const staticFacts = Array.isArray(profile.static) ? profile.static.filter(Boolean) : [];
  const dynamicFacts = Array.isArray(profile.dynamic) ? profile.dynamic.filter(Boolean) : [];

  const searchResults =
    profilePayload.searchResults?.results
    || profilePayload.search_results?.results
    || [];

  const memories = searchResults
    .map((r) => r.memory || r.content || r.text || "")
    .filter(Boolean)
    .slice(0, 12);

  const parts = [];
  if (staticFacts.length) {
    parts.push(`Perfil estável:\n${staticFacts.map((f) => `- ${f}`).join("\n")}`);
  }
  if (dynamicFacts.length) {
    parts.push(`Contexto recente:\n${dynamicFacts.map((f) => `- ${f}`).join("\n")}`);
  }
  if (memories.length) {
    parts.push(`Memórias relevantes:\n${memories.map((m) => `- ${m}`).join("\n")}`);
  }
  if (!parts.length) return "";
  return `=== SUPERMEMORY (memória entre sessões) ===\n${parts.join("\n\n")}\n=== FIM SUPERMEMORY ===`;
}

async function postProfile({ apiKey, baseURL, containerTag, query }) {
  const res = await fetch(`${baseURL}/v4/profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      containerTag,
      ...(query ? { q: query } : {}),
      threshold: 0.55,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`profile ${res.status}: ${errText.slice(0, 200)}`);
  }
  return res.json();
}

export async function fetchMemoryContext(backendDir, projDir, query = "") {
  const { apiKey, baseURL, enabled } = resolveSupermemoryConfig(backendDir);
  if (!enabled) return { contextBlock: "", containerTags: null };

  const tags = buildContainerTags(projDir);
  const blocks = [];

  try {
    const [workspaceProfile, projectProfile] = await Promise.all([
      postProfile({ apiKey, baseURL, containerTag: tags.workspace, query }),
      postProfile({ apiKey, baseURL, containerTag: tags.project, query }),
    ]);
    const workspaceBlock = formatProfileBlock(workspaceProfile);
    const projectBlock = formatProfileBlock(projectProfile);
    if (workspaceBlock) blocks.push(`[Estúdio Lumiera]\n${workspaceBlock}`);
    if (projectBlock) blocks.push(`[Projeto atual: ${path.basename(projDir)}]\n${projectBlock}`);
  } catch (err) {
    console.warn("[supermemory] fetchMemoryContext:", err.message);
    return { contextBlock: "", containerTags: tags, error: err.message };
  }

  return {
    contextBlock: blocks.join("\n\n"),
    containerTags: tags,
  };
}

export async function persistConversation(backendDir, projDir, messages, assistantReply) {
  const { apiKey, baseURL, enabled } = resolveSupermemoryConfig(backendDir);
  if (!enabled || !Array.isArray(messages) || !messages.length) return null;

  const tags = buildContainerTags(projDir);
  const projectName = path.basename(projDir);
  const transcript = [
    ...messages.map((m) => `${m.role}: ${m.content}`),
    `assistant: ${assistantReply}`,
  ].join("\n");

  const body = {
    content: transcript,
    containerTag: tags.project,
    metadata: {
      source: "lumiera-chat",
      project: projectName,
    },
    entityContext: `Conversa do assistente Lumiera sobre o projeto de vídeo "${projectName}".`,
  };

  const res = await fetch(`${baseURL}/v3/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`add ${res.status}: ${errText.slice(0, 200)}`);
  }
  return res.json();
}

export async function testSupermemoryConnection(backendDir) {
  const { apiKey, baseURL, enabled } = resolveSupermemoryConfig(backendDir);
  if (!apiKey) {
    return { ok: false, error: "Chave Supermemory não configurada." };
  }
  try {
    await postProfile({
      apiKey,
      baseURL,
      containerTag: "lumiera-studio",
      query: "teste de conexão Lumiera",
    });
    return { ok: true, enabled, baseURL };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}