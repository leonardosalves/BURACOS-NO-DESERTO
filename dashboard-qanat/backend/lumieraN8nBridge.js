/**
 * Ponte Lumiera ↔ n8n — mapa de funcionamento, webhooks e sync bidirecional.
 * Repositório upstream: https://github.com/n8n-io/n8n
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { LUMIERA_CODE_MAP } from "./lumieraCodeMap.js";

export const N8N_STATE_FILE = "lumiera_n8n_state.json";
export const N8N_WORKFLOW_TAG = "lumiera";
export const N8N_WORKFLOW_NAME = "Lumiera — Mapa de Funcionamento";

/** Nós do pipeline Lumiera expostos ao n8n (ordem = fluxo de produção). */
export const LUMIERA_PIPELINE_NODES = [
  {
    id: "creator_ideas",
    label: "Ideias IA",
    category: "creator",
    phase: 1,
    method: "POST",
    path: "/api/ai/creator/ideas",
    lumieraAction: "creator.ideas",
    description: "Gera ideias de vídeo por nicho/formato.",
  },
  {
    id: "creator_script",
    label: "Roteiro completo",
    category: "creator",
    phase: 2,
    method: "POST",
    path: "/api/ai/creator/script",
    lumieraAction: "creator.script",
    description: "Roteiro + visual_prompts + checklist.",
  },
  {
    id: "enhance_visual",
    label: "Engenharia Visual PRO",
    category: "creator",
    phase: 2,
    method: "POST",
    path: "/api/ai/creator/enhance-visual-prompts",
    lumieraAction: "creator.enhance_visual",
    description: "Reprocessa prompts visuais com IA premium.",
  },
  {
    id: "narration_tts",
    label: "Narração / TTS",
    category: "production",
    phase: 3,
    method: "POST",
    path: "/api/workflow/narration-tts",
    lumieraAction: "production.narration_tts",
    description: "Gera ou envia narração master.",
  },
  {
    id: "whisper_sync",
    label: "Whisper / timings",
    category: "production",
    phase: 4,
    method: "GET",
    path: "/api/sync-timings",
    lumieraAction: "production.whisper_sync",
    description: "Sincroniza legendas e durações por bloco.",
    sse: true,
  },
  {
    id: "timeline_align",
    label: "Alinhar timeline",
    category: "production",
    phase: 5,
    method: "POST",
    path: "/api/projects/storyboard",
    lumieraAction: "production.timeline_save",
    description: "Persiste storyboard e timeline_assets.",
  },
  {
    id: "render_remotion",
    label: "Render Remotion",
    category: "render",
    phase: 6,
    method: "POST",
    path: "/api/render",
    lumieraAction: "render.start",
    description: "Renderiza vídeo final no workspace.",
  },
  {
    id: "metadata_youtube",
    label: "Metadados YouTube",
    category: "publish",
    phase: 7,
    method: "POST",
    path: "/api/ai/creator/metadata",
    lumieraAction: "publish.metadata",
    description: "Título, descrição, tags e capítulos SEO.",
  },
  {
    id: "upload_youtube",
    label: "Upload YouTube",
    category: "publish",
    phase: 8,
    method: "POST",
    path: "/api/upload/youtube",
    lumieraAction: "publish.youtube",
    description: "Publica vídeo no canal conectado.",
  },
  {
    id: "resurrector_scan",
    label: "Ressuscitador — scan",
    category: "ops",
    phase: 9,
    method: "POST",
    path: "/api/youtube/resurrector/scan",
    lumieraAction: "resurrector.scan",
    description: "Enfileira vídeos antigos do canal.",
  },
  {
    id: "resurrector_batch",
    label: "Ressuscitador — batch",
    category: "ops",
    phase: 9,
    method: "POST",
    path: "/api/youtube/resurrector/run-batch",
    lumieraAction: "resurrector.batch",
    description: "Batch SEO 11h/18h — publica no YouTube.",
  },
  {
    id: "deep_research",
    label: "Deep research",
    category: "research",
    phase: 0,
    method: "POST",
    path: "/api/research/deep",
    lumieraAction: "research.deep",
    description: "Pesquisa profunda DeerFlow / web.",
  },
  {
    id: "clip_factory",
    label: "Clip Factory",
    category: "workflow",
    phase: 5,
    method: "POST",
    path: "/api/workflow/clip-factory",
    lumieraAction: "workflow.clip_factory",
    description: "Corta longos em shorts automaticamente.",
  },
  {
    id: "capability_menu",
    label: "Capability menu",
    category: "workflow",
    phase: 0,
    method: "GET",
    path: "/api/workflow/capability-menu",
    lumieraAction: "workflow.capability_menu",
    description: "Preflight — o que está pronto no projeto.",
  },
];

const DEFAULT_CONNECTIONS = [
  ["creator_ideas", "creator_script"],
  ["creator_script", "enhance_visual"],
  ["enhance_visual", "narration_tts"],
  ["narration_tts", "whisper_sync"],
  ["whisper_sync", "timeline_align"],
  ["timeline_align", "render_remotion"],
  ["render_remotion", "metadata_youtube"],
  ["metadata_youtube", "upload_youtube"],
  ["resurrector_scan", "resurrector_batch"],
];

const DEFAULT_CONFIG = {
  enabled: true,
  n8nBaseUrl: "http://127.0.0.1:5678",
  n8nApiKey: "",
  lumieraPublicUrl: "http://127.0.0.1:3005",
  webhookSecret: "",
  autoSyncIntervalSec: 30,
  workflowId: null,
};

function readJsonSafe(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonSafe(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function loadN8nState(workspaceDir) {
  const filePath = path.join(workspaceDir, N8N_STATE_FILE);
  const stored = readJsonSafe(filePath, {});
  const nodeState = {};
  for (const node of LUMIERA_PIPELINE_NODES) {
    nodeState[node.id] = {
      enabled: stored.nodes?.[node.id]?.enabled !== false,
      lastRunAt: stored.nodes?.[node.id]?.lastRunAt || null,
      lastStatus: stored.nodes?.[node.id]?.lastStatus || null,
      params: stored.nodes?.[node.id]?.params || {},
    };
  }
  return {
    version: 1,
    updatedAt: stored.updatedAt || null,
    config: { ...DEFAULT_CONFIG, ...(stored.config || {}) },
    nodes: nodeState,
    connections: stored.connections || DEFAULT_CONNECTIONS,
    events: (stored.events || []).slice(0, 80),
    n8nWorkflowId: stored.n8nWorkflowId || stored.config?.workflowId || null,
    lastSyncAt: stored.lastSyncAt || null,
    lastSyncDirection: stored.lastSyncDirection || null,
  };
}

export function saveN8nState(workspaceDir, state) {
  const filePath = path.join(workspaceDir, N8N_STATE_FILE);
  const payload = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  writeJsonSafe(filePath, payload);
  return payload;
}

export function appendN8nEvent(state, entry) {
  const events = [
    {
      id: randomUUID(),
      at: new Date().toISOString(),
      ...entry,
    },
    ...(state.events || []),
  ].slice(0, 80);
  return { ...state, events };
}

export function getLumieraOperationMap(workspaceDir) {
  const state = loadN8nState(workspaceDir);
  const categories = [...new Set(LUMIERA_PIPELINE_NODES.map((n) => n.category))];
  return {
    version: 1,
    workflowName: N8N_WORKFLOW_NAME,
    workflowTag: N8N_WORKFLOW_TAG,
    upstreamRepo: "https://github.com/n8n-io/n8n",
    lumieraBackend: state.config.lumieraPublicUrl,
    n8nBaseUrl: state.config.n8nBaseUrl,
    nodes: LUMIERA_PIPELINE_NODES.map((node) => ({
      ...node,
      webhookUrl: `${state.config.lumieraPublicUrl}/api/n8n/inbound`,
      enabled: state.nodes[node.id]?.enabled !== false,
      lastRunAt: state.nodes[node.id]?.lastRunAt,
      lastStatus: state.nodes[node.id]?.lastStatus,
      params: state.nodes[node.id]?.params || {},
    })),
    connections: state.connections,
    categories: categories.map((id) => ({
      id,
      label: categoryLabel(id),
      nodes: LUMIERA_PIPELINE_NODES.filter((n) => n.category === id).map((n) => n.id),
    })),
    codeMap: LUMIERA_CODE_MAP,
    inbound: {
      method: "POST",
      path: "/api/n8n/inbound",
      body: { action: "creator.script", project: "nome_projeto", payload: {} },
    },
    sync: {
      push: "POST /api/n8n/sync/push — Lumiera → n8n",
      pull: "POST /api/n8n/sync/pull — n8n → Lumiera",
    },
  };
}

function categoryLabel(id) {
  const labels = {
    creator: "Creator / Roteiro",
    production: "Produção",
    render: "Render",
    publish: "Publicação",
    ops: "Operações",
    research: "Pesquisa",
    workflow: "Workflow",
  };
  return labels[id] || id;
}

export async function probeN8n(baseUrl, apiKey = "") {
  const root = String(baseUrl || "").replace(/\/$/, "");
  if (!root) return { ok: false, error: "URL do n8n não configurada." };

  const headers = { Accept: "application/json" };
  if (apiKey) headers["X-N8N-API-KEY"] = apiKey;

  try {
    const healthRes = await fetch(`${root}/healthz`, { headers, signal: AbortSignal.timeout(8000) });
    const healthOk = healthRes.ok;

    let workflows = [];
    let apiOk = false;
    if (apiKey) {
      const wfRes = await fetch(`${root}/api/v1/workflows?limit=5`, { headers, signal: AbortSignal.timeout(10000) });
      apiOk = wfRes.ok;
      if (wfRes.ok) {
        const data = await wfRes.json();
        workflows = (data.data || data || []).filter((w) =>
          (w.tags || []).some((t) => (typeof t === "string" ? t : t.name) === N8N_WORKFLOW_TAG)
          || String(w.name || "").includes("Lumiera"),
        );
      }
    }

    return {
      ok: healthOk,
      health: healthOk,
      api: apiOk,
      baseUrl: root,
      editorUrl: root,
      lumieraWorkflows: workflows.map((w) => ({ id: w.id, name: w.name, active: w.active })),
      error: healthOk ? null : `n8n não respondeu em ${root}`,
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err), baseUrl: root };
  }
}

function n8nHeaders(apiKey) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (apiKey) headers["X-N8N-API-KEY"] = apiKey;
  return headers;
}

function gridPosition(index, col = 3) {
  const row = Math.floor(index / col);
  const colIdx = index % col;
  return [240 + colIdx * 320, 120 + row * 200];
}

/** Gera workflow n8n importável a partir do mapa Lumiera. */
export function buildN8nWorkflowJson(workspaceDir, opts = {}) {
  const state = loadN8nState(workspaceDir);
  const base = String(opts.lumieraBaseUrl || state.config.lumieraPublicUrl).replace(/\/$/, "");
  const nodes = [];
  const connections = {};

  nodes.push({
    parameters: {
      path: "lumiera-pipeline",
      httpMethod: "POST",
      responseMode: "lastNode",
      options: {},
    },
    id: randomUUID(),
    name: "Webhook Lumiera",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [0, 300],
    webhookId: randomUUID(),
  });

  const webhookName = "Webhook Lumiera";
  let prevName = webhookName;

  LUMIERA_PIPELINE_NODES.forEach((def, index) => {
    if (state.nodes[def.id]?.enabled === false) return;

    const nodeName = `Lumiera · ${def.label}`;
    const url = `${base}${def.path}`;
    const isGet = def.method === "GET";

    nodes.push({
      parameters: isGet
        ? { url, options: {} }
        : {
          method: def.method,
          url,
          sendBody: true,
          specifyBody: "json",
          jsonBody: `={{ JSON.stringify({ project: $json.project || $json.body?.project, ...($json.payload || $json.body?.payload || {}) }) }}`,
          options: {},
        },
      id: randomUUID(),
      name: nodeName,
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: gridPosition(index + 1),
    });

    if (!connections[prevName]) connections[prevName] = { main: [[]] };
    connections[prevName].main[0].push({ node: nodeName, type: "main", index: 0 });
    prevName = nodeName;
  });

  return {
    name: N8N_WORKFLOW_NAME,
    nodes,
    connections,
    settings: { executionOrder: "v1" },
    tags: [{ name: N8N_WORKFLOW_TAG }],
    meta: {
      lumieraMapVersion: 1,
      generatedAt: new Date().toISOString(),
      lumieraBackend: base,
    },
  };
}

export async function pushMapToN8n(workspaceDir) {
  const state = loadN8nState(workspaceDir);
  const { n8nBaseUrl, n8nApiKey } = state.config;
  if (!n8nApiKey) {
    return { ok: false, error: "Configure a API key do n8n (Settings → API)." };
  }

  const probe = await probeN8n(n8nBaseUrl, n8nApiKey);
  if (!probe.ok) return { ok: false, error: probe.error || "n8n offline." };

  const workflowBody = buildN8nWorkflowJson(workspaceDir);
  const root = n8nBaseUrl.replace(/\/$/, "");
  const headers = n8nHeaders(n8nApiKey);

  let workflowId = state.n8nWorkflowId;
  let response;

  if (workflowId) {
    response = await fetch(`${root}/api/v1/workflows/${workflowId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(workflowBody),
      signal: AbortSignal.timeout(30000),
    });
  } else {
    response = await fetch(`${root}/api/v1/workflows`, {
      method: "POST",
      headers,
      body: JSON.stringify(workflowBody),
      signal: AbortSignal.timeout(30000),
    });
  }

  if (!response.ok) {
    const errText = await response.text();
    return { ok: false, error: `n8n API ${response.status}: ${errText.slice(0, 400)}` };
  }

  const saved = await response.json();
  workflowId = saved.id || saved.data?.id || workflowId;
  const next = {
    ...state,
    n8nWorkflowId: workflowId,
    lastSyncAt: new Date().toISOString(),
    lastSyncDirection: "push",
  };
  saveN8nState(workspaceDir, next);

  return {
    ok: true,
    workflowId,
    nodeCount: workflowBody.nodes.length,
    message: `Workflow "${N8N_WORKFLOW_NAME}" enviado ao n8n (${workflowBody.nodes.length} nós).`,
  };
}

export async function pullMapFromN8n(workspaceDir) {
  const state = loadN8nState(workspaceDir);
  const { n8nBaseUrl, n8nApiKey } = state.config;
  if (!n8nApiKey) {
    return { ok: false, error: "Configure a API key do n8n." };
  }

  const root = n8nBaseUrl.replace(/\/$/, "");
  const headers = n8nHeaders(n8nApiKey);
  let workflowId = state.n8nWorkflowId;

  if (!workflowId) {
    const listRes = await fetch(`${root}/api/v1/workflows?limit=50`, { headers, signal: AbortSignal.timeout(15000) });
    if (!listRes.ok) return { ok: false, error: `List workflows failed: ${listRes.status}` };
    const list = await listRes.json();
    const rows = list.data || list || [];
    const match = rows.find((w) =>
      String(w.name || "").includes("Lumiera")
      || (w.tags || []).some((t) => (typeof t === "string" ? t : t.name) === N8N_WORKFLOW_TAG),
    );
    workflowId = match?.id;
    if (!workflowId) return { ok: false, error: "Nenhum workflow Lumiera encontrado no n8n. Use Sync → Lumiera primeiro." };
  }

  const wfRes = await fetch(`${root}/api/v1/workflows/${workflowId}`, { headers, signal: AbortSignal.timeout(15000) });
  if (!wfRes.ok) return { ok: false, error: `Get workflow failed: ${wfRes.status}` };
  const workflow = await wfRes.json();
  const wfNodes = workflow.nodes || workflow.data?.nodes || [];

  const nextNodes = { ...state.nodes };
  for (const def of LUMIERA_PIPELINE_NODES) {
    const n8nNode = wfNodes.find((n) => String(n.name || "").includes(def.label));
    if (n8nNode) {
      nextNodes[def.id] = {
        ...nextNodes[def.id],
        enabled: n8nNode.disabled !== true,
      };
    }
  }

  const next = {
    ...state,
    nodes: nextNodes,
    n8nWorkflowId: workflowId,
    lastSyncAt: new Date().toISOString(),
    lastSyncDirection: "pull",
  };
  saveN8nState(workspaceDir, next);

  return {
    ok: true,
    workflowId,
    updated: LUMIERA_PIPELINE_NODES.filter((d) => nextNodes[d.id]?.enabled !== false).length,
    message: "Mapa atualizado a partir do n8n (nós ativos/desativados).",
  };
}

export function patchN8nNode(workspaceDir, nodeId, patch = {}) {
  const state = loadN8nState(workspaceDir);
  const def = LUMIERA_PIPELINE_NODES.find((n) => n.id === nodeId);
  if (!def) throw new Error(`Nó desconhecido: ${nodeId}`);

  const prev = state.nodes[nodeId] || { enabled: true, params: {} };
  state.nodes[nodeId] = {
    ...prev,
    ...(typeof patch.enabled === "boolean" ? { enabled: patch.enabled } : {}),
    ...(patch.params && typeof patch.params === "object" ? { params: { ...prev.params, ...patch.params } } : {}),
  };
  saveN8nState(workspaceDir, state);
  return state.nodes[nodeId];
}

export async function executeInboundAction(workspaceDir, body = {}, deps = {}) {
  const action = String(body.action || "").trim();
  const project = String(body.project || body.payload?.project || "").trim();
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

  const node = LUMIERA_PIPELINE_NODES.find((n) => n.lumieraAction === action || n.id === action);
  if (!node) {
    throw new Error(`Ação Lumiera desconhecida: ${action}`);
  }

  let state = loadN8nState(workspaceDir);
  if (state.nodes[node.id]?.enabled === false) {
    throw new Error(`Nó "${node.label}" está desativado no mapa.`);
  }

  const base = String(state.config.lumieraPublicUrl || "http://127.0.0.1:3005").replace(/\/$/, "");
  const sep = node.path.includes("?") ? "&" : "?";
  const url = project
    ? `${base}${node.path}${sep}project=${encodeURIComponent(project)}`
    : `${base}${node.path}`;

  const init = {
    method: node.method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    signal: AbortSignal.timeout(900000),
  };
  if (node.method !== "GET" && node.method !== "HEAD") {
    init.body = JSON.stringify({ project, ...payload, ...body });
  }

  const res = await fetch(url, init);
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 2000) };
  }

  const status = res.ok ? "success" : "error";
  state.nodes[node.id] = {
    ...state.nodes[node.id],
    lastRunAt: new Date().toISOString(),
    lastStatus: status,
  };
  state = appendN8nEvent(state, {
    type: "inbound",
    action: node.lumieraAction,
    nodeId: node.id,
    status,
    project: project || null,
    httpStatus: res.status,
  });
  saveN8nState(workspaceDir, state);

  if (!res.ok) {
    const errMsg = data?.error || data?.details || `HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  return {
    ok: true,
    action: node.lumieraAction,
    nodeId: node.id,
    label: node.label,
    result: data,
  };
}

export function getN8nDashboard(workspaceDir) {
  const state = loadN8nState(workspaceDir);
  const map = getLumieraOperationMap(workspaceDir);
  return {
    config: {
      ...state.config,
      hasApiKey: Boolean(state.config.n8nApiKey),
      apiKeyMasked: state.config.n8nApiKey
        ? `${state.config.n8nApiKey.slice(0, 4)}…${state.config.n8nApiKey.slice(-4)}`
        : "",
    },
    map,
    sync: {
      lastSyncAt: state.lastSyncAt,
      lastSyncDirection: state.lastSyncDirection,
      workflowId: state.n8nWorkflowId,
    },
    events: state.events || [],
    stats: {
      totalNodes: LUMIERA_PIPELINE_NODES.length,
      enabledNodes: LUMIERA_PIPELINE_NODES.filter((n) => state.nodes[n.id]?.enabled !== false).length,
    },
  };
}

export function updateN8nConfig(workspaceDir, patch = {}) {
  const state = loadN8nState(workspaceDir);
  const nextConfig = { ...state.config };
  if (typeof patch.enabled === "boolean") nextConfig.enabled = patch.enabled;
  if (patch.n8nBaseUrl) nextConfig.n8nBaseUrl = String(patch.n8nBaseUrl).replace(/\/$/, "");
  if (patch.lumieraPublicUrl) nextConfig.lumieraPublicUrl = String(patch.lumieraPublicUrl).replace(/\/$/, "");
  if (typeof patch.n8nApiKey === "string" && patch.n8nApiKey.trim()) nextConfig.n8nApiKey = patch.n8nApiKey.trim();
  if (typeof patch.webhookSecret === "string") nextConfig.webhookSecret = patch.webhookSecret;
  if (Number.isFinite(Number(patch.autoSyncIntervalSec))) {
    nextConfig.autoSyncIntervalSec = Math.max(10, Math.min(300, Number(patch.autoSyncIntervalSec)));
  }
  state.config = nextConfig;
  saveN8nState(workspaceDir, state);
  return state.config;
}