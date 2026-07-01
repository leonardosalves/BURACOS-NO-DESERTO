/**
 * Comfy Cloud MCP — integração Lumiera
 * https://docs.comfy.org/agent-tools/cloud
 */

import fs from "fs";
import path from "path";

export const COMFY_CLOUD_MCP_URL = "https://cloud.comfy.org/mcp";
export const COMFY_CLOUD_API_BASE = "https://cloud.comfy.org";

export const MCP_TOOLS = [
  { group: "Discovery", tools: [
    { name: "search_templates", desc: "Templates em comfy.org/workflows" },
    { name: "search_models", desc: "Catálogo de checkpoints, LoRAs, VAEs" },
    { name: "search_nodes", desc: "Nodes e blueprints (Text to Image, etc.)" },
    { name: "cql", desc: "Query estrutural no grafo de nodes" },
  ]},
  { group: "Execution", tools: [
    { name: "submit_workflow", desc: "Executa workflow API-format na nuvem" },
    { name: "upload_file", desc: "Upload de imagem/arquivo para LoadImage" },
    { name: "get_job_status", desc: "Status de execução" },
    { name: "get_output", desc: "URL assinada + comando curl de download" },
    { name: "use_previous_output", desc: "Encadeia outputs entre workflows" },
    { name: "cancel_job", desc: "Cancela job pendente/rodando" },
    { name: "get_queue", desc: "Fila running + pending" },
  ]},
  { group: "Saved workflows", tools: [
    { name: "list_saved_workflows", desc: "Workflows salvos na conta" },
    { name: "get_saved_workflow", desc: "Inspeciona nodes e inputs" },
    { name: "save_workflow", desc: "Salva workflow na conta" },
    { name: "share_workflow", desc: "Publica URL ?share=<id>" },
    { name: "import_shared_workflow", desc: "Importa share URL ou hub hex id" },
  ]},
];

export const PROMPT_EXAMPLES = [
  {
    label: "B-roll vertical",
    prompt: "Gere um clip cinematográfico 9:16 de uma cidade medieval ao entardecer, estilo documentário.",
  },
  {
    label: "Thumbnail A/B",
    prompt: "Crie 4 variantes de thumbnail 16:9 com rosto em destaque e texto CURTO — contraste alto para YouTube.",
  },
  {
    label: "Product placement",
    prompt: "A partir desta imagem hero, gere 8 variações de product placement em 4 aspect ratios para Meta ads.",
  },
  {
    label: "Storyboard → vídeo",
    prompt: "Transforme estes 3 frames de storyboard em um clip curto coerente e explique o workflow para reutilizar.",
  },
];

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function maskKey(key = "") {
  const k = String(key).trim();
  if (!k) return "";
  if (k.length <= 12) return "••••••••";
  return `${k.slice(0, 8)}…${k.slice(-4)}`;
}

export function loadComfyCloudConfig(workspaceDir) {
  const cfg = readJsonSafe(path.join(workspaceDir, "config_qanat.json"));
  const block = cfg.comfy_cloud || cfg.comfyCloud || {};
  return {
    api_key: String(block.api_key || block.apiKey || "").trim(),
    mcp_url: String(block.mcp_url || block.mcpUrl || COMFY_CLOUD_MCP_URL).trim(),
    enabled: block.enabled !== false,
    notes: String(block.notes || ""),
  };
}

export function saveComfyCloudConfig(workspaceDir, patch = {}) {
  const configPath = path.join(workspaceDir, "config_qanat.json");
  const cfg = readJsonSafe(configPath);
  const prev = cfg.comfy_cloud || {};
  const next = { ...prev };

  if (patch.api_key !== undefined) {
    const v = String(patch.api_key || "").trim();
    if (v) next.api_key = v;
    else delete next.api_key;
  }
  if (patch.mcp_url !== undefined) next.mcp_url = String(patch.mcp_url || COMFY_CLOUD_MCP_URL).trim();
  if (patch.enabled !== undefined) next.enabled = Boolean(patch.enabled);
  if (patch.notes !== undefined) next.notes = String(patch.notes || "");

  cfg.comfy_cloud = next;
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf8");
  return loadComfyCloudConfig(workspaceDir);
}

async function cloudFetch(apiPath, apiKey, { method = "GET", body } = {}) {
  const url = `${COMFY_CLOUD_API_BASE}${apiPath}`;
  const headers = { Accept: "application/json" };
  if (apiKey) headers["X-API-Key"] = apiKey;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || text.slice(0, 200) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function testComfyCloudConnection(apiKey) {
  if (!apiKey) throw new Error("API key não configurada");
  const user = await cloudFetch("/api/user", apiKey);
  return {
    ok: true,
    user,
    message: user?.status ? `Conta ${user.status}` : "Conectado",
  };
}

export async function getComfyCloudQueue(apiKey) {
  if (!apiKey) throw new Error("API key não configurada");
  return cloudFetch("/api/queue", apiKey);
}

export function buildCursorMcpConfig(config, workspaceDir) {
  const apiKey = config.api_key || "comfyui-SUA_CHAVE_AQUI";
  return {
    mcpServers: {
      "comfy-cloud": {
        url: config.mcp_url || COMFY_CLOUD_MCP_URL,
        headers: {
          "X-API-Key": apiKey,
        },
      },
    },
    _lumiera: {
      workspace: workspaceDir,
      docs: "https://docs.comfy.org/agent-tools/cloud",
      apiKeysUrl: "https://platform.comfy.org/profile/api-keys",
    },
  };
}

export function buildClaudeMcpCommand(apiKey) {
  const key = apiKey || "comfyui-…";
  return `claude mcp add --transport http comfy-cloud ${COMFY_CLOUD_MCP_URL} -H "X-API-Key: ${key}"`;
}

export function buildAgentInstallPrompt() {
  return [
    "Agent, please help me install Comfy MCP:",
    "https://docs.comfy.org/agent-tools/cloud",
    "",
    "MCP URL: https://cloud.comfy.org/mcp",
    "API key: https://platform.comfy.org/profile/api-keys",
  ].join("\n");
}

export async function getComfyMcpDashboard(workspaceDir, { localStatus } = {}) {
  const config = loadComfyCloudConfig(workspaceDir);
  const hasKey = Boolean(config.api_key);

  let cloud = { connected: false, error: null, user: null };
  let queue = null;

  if (hasKey && config.enabled) {
    try {
      const test = await testComfyCloudConnection(config.api_key);
      cloud = { connected: true, user: test.user, error: null };
      try {
        queue = await getComfyCloudQueue(config.api_key);
      } catch (err) {
        queue = { error: err.message };
      }
    } catch (err) {
      cloud = { connected: false, error: err.message, user: null };
    }
  } else if (!hasKey) {
    cloud.error = "Configure comfy_cloud.api_key em config_qanat.json";
  }

  const running = Array.isArray(queue?.queue_running) ? queue.queue_running.length : 0;
  const pending = Array.isArray(queue?.queue_pending) ? queue.queue_pending.length : 0;

  return {
    mcp_url: config.mcp_url || COMFY_CLOUD_MCP_URL,
    api_base: COMFY_CLOUD_API_BASE,
    config: {
      enabled: config.enabled,
      has_api_key: hasKey,
      api_key_masked: maskKey(config.api_key),
      notes: config.notes,
    },
    cloud,
    queue: queue ? { running, pending, raw: queue } : null,
    local_comfyui: localStatus || null,
    tools: MCP_TOOLS,
    prompts: PROMPT_EXAMPLES,
    install: {
      cursor_config: buildCursorMcpConfig(config, workspaceDir),
      claude_command: buildClaudeMcpCommand(hasKey ? config.api_key : null),
      agent_prompt: buildAgentInstallPrompt(),
      docs_url: "https://docs.comfy.org/agent-tools/cloud",
      blog_url: "https://blog.comfy.org/p/comfy-mcp-turn-your-agent-into-a",
      api_keys_url: "https://platform.comfy.org/profile/api-keys",
      cloud_url: "https://cloud.comfy.org",
      skills_repo: "https://github.com/Comfy-Org/comfy-skills/",
    },
  };
}