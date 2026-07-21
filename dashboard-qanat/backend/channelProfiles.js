/**
 * channelProfiles.js — Gerenciador de Perfis de Canal (Channel Swap)
 *
 * Integra com:
 *  - render_config_global.json (padrão existente do brandAssets.js)
 *  - channels/ na raiz do repositório (configs detalhadas)
 *  - projectsRoot.js (estrutura de projetos existente)
 *  - globalStudioDefaults.js (padrão de merge global → projeto)
 *
 * NÃO modifica: server.js, brandAssets.js, projectsRoot.js
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Raiz do repositório (2 níveis acima de dashboard-qanat/backend/)
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CHANNELS_DIR = path.join(REPO_ROOT, "channels");
const REGISTRY_PATH = path.join(CHANNELS_DIR, "_registry.json");

// ─── HELPERS ──────────────────────────────────────────────────

function readJsonSafe(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// ─── REGISTRY ─────────────────────────────────────────────────

export function loadRegistry() {
  const reg = readJsonSafe(REGISTRY_PATH, null);
  if (!reg) {
    // Auto-criar registry vazio se não existir
    const empty = { version: "1.0", active_channel: null, channels: [] };
    writeJson(REGISTRY_PATH, empty);
    return empty;
  }
  return reg;
}

function saveRegistry(reg) {
  writeJson(REGISTRY_PATH, reg);
}

// ─── CANAL ATIVO ──────────────────────────────────────────────

export function getActiveChannelId() {
  const reg = loadRegistry();
  return reg.active_channel || null;
}

export function setActiveChannel(channelId) {
  const reg = loadRegistry();
  const exists = reg.channels.find((c) => c.id === channelId);
  if (!exists) {
    throw new Error(`Canal '${channelId}' não encontrado no registro.`);
  }
  reg.active_channel = channelId;
  saveRegistry(reg);
  return exists;
}

// ─── LISTAR CANAIS ────────────────────────────────────────────

export function listChannels() {
  const reg = loadRegistry();
  return reg.channels.map((ch) => ({
    ...ch,
    ativo: ch.id === reg.active_channel,
    has_config: fs.existsSync(
      path.join(CHANNELS_DIR, ch.id, "channel.config.json")
    ),
  }));
}

// ─── CARREGAR CONFIG COMPLETA ─────────────────────────────────

export function loadChannelConfig(channelId) {
  const configPath = path.join(CHANNELS_DIR, channelId, "channel.config.json");
  return readJsonSafe(configPath, null);
}

export function saveChannelConfig(channelId, config) {
  const configPath = path.join(CHANNELS_DIR, channelId, "channel.config.json");
  writeJson(configPath, config);
}

export function getActiveChannelConfig() {
  const id = getActiveChannelId();
  if (!id) return null;
  return loadChannelConfig(id);
}

// ─── CARREGAR PROMPTS DO CANAL ────────────────────────────────

export function loadChannelPrompts(channelId) {
  const promptsDir = path.join(CHANNELS_DIR, channelId, "prompts");
  const prompts = {};
  if (!fs.existsSync(promptsDir)) return prompts;

  for (const file of fs.readdirSync(promptsDir)) {
    if (!file.endsWith(".md")) continue;
    const name = path.basename(file, ".md");
    prompts[name] = fs.readFileSync(path.join(promptsDir, file), "utf8");
  }
  return prompts;
}

// ─── CARREGAR TEMPLATES DO CANAL ──────────────────────────────

export function loadChannelTemplates(channelId) {
  const templatesDir = path.join(CHANNELS_DIR, channelId, "templates");
  const templates = {};
  if (!fs.existsSync(templatesDir)) return templates;

  for (const file of fs.readdirSync(templatesDir)) {
    if (!file.endsWith(".json")) continue;
    const name = path.basename(file, ".json");
    templates[name] = readJsonSafe(path.join(templatesDir, file), {});
  }
  return templates;
}

// ─── PIPELINE CONFIG (tudo que o pipeline precisa) ────────────

export function getPipelineConfigForChannel(channelId) {
  const config = loadChannelConfig(channelId);
  if (!config) return null;

  const prompts = loadChannelPrompts(channelId);
  const templates = loadChannelTemplates(channelId);

  return {
    canal_id: channelId,
    canal_nome: config.meta?.nome || channelId,
    idioma: config.meta?.idioma || "pt-BR",
    youtube_channel_id: config.meta?.youtube_channel_id || null,

    nicho: config.nicho || {},
    publico_alvo: config.publico_alvo || {},
    formato: config.formato_video || {},
    roteiro: config.roteiro || {},
    titulo: config.titulo || {},
    visual: config.visual || {},
    tts: config.tts || {},
    pesquisa: config.pesquisa || {},
    upload: config.upload || {},
    brand: config.brand || {},

    prompts,
    templates,

    // Paths
    channel_dir: path.join(CHANNELS_DIR, channelId),
    output_dir: path.join(CHANNELS_DIR, channelId, "output"),
  };
}

export function getActivePipelineConfig() {
  const id = getActiveChannelId();
  if (!id) return null;
  return getPipelineConfigForChannel(id);
}

// ─── CRIAR NOVO CANAL ─────────────────────────────────────────

export function createChannel({
  id,
  nome,
  youtubeChannelId = "",
  avatarUrl = "",
  cor = "#f5a623",
  nicho = "",
  subNichos = "",
  temasProibidos = "",
  descricao = "",
}) {
  if (!id || !nome) {
    throw new Error("id e nome são obrigatórios.");
  }

  // Sanitizar id
  const safeId = String(id)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  if (!safeId) throw new Error("id inválido após sanitização.");

  const channelDir = path.join(CHANNELS_DIR, safeId);
  if (fs.existsSync(channelDir)) {
    throw new Error(`Canal '${safeId}' já existe.`);
  }

  // Copiar template
  const templateDir = path.join(CHANNELS_DIR, "_template");
  if (fs.existsSync(templateDir)) {
    fs.cpSync(templateDir, channelDir, { recursive: true });
  } else {
    // Criar estrutura mínima
    fs.mkdirSync(path.join(channelDir, "prompts"), { recursive: true });
    fs.mkdirSync(path.join(channelDir, "templates"), { recursive: true });
    fs.mkdirSync(path.join(channelDir, "output"), { recursive: true });
  }

  // Atualizar config
  const configPath = path.join(channelDir, "channel.config.json");
  const config = readJsonSafe(configPath, {}) || {};
  config.meta = {
    ...(config.meta || {}),
    id: safeId,
    nome: String(nome).trim(),
    youtube_channel_id: youtubeChannelId,
    avatar_url: avatarUrl,
    cor,
    descricao,
    criado_em: new Date().toISOString().split("T")[0],
  };
  config.nicho = {
    ...(config.nicho || {}),
    principal: nicho,
    sub_nichos_permitidos:
      typeof subNichos === "string"
        ? subNichos
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : subNichos || [],
    temas_proibidos:
      typeof temasProibidos === "string"
        ? temasProibidos
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : temasProibidos || [],
  };
  writeJson(configPath, config);

  // Atualizar registry
  const reg = loadRegistry();
  reg.channels.push({
    id: safeId,
    nome: String(nome).trim(),
    youtube_channel_id: youtubeChannelId,
    avatar_url: avatarUrl,
    status: "rascunho",
    criado_em: config.meta.criado_em,
    ultimo_video: null,
  });
  if (!reg.active_channel) reg.active_channel = safeId;
  saveRegistry(reg);

  return { id: safeId, nome: config.meta.nome, dir: channelDir };
}

// ─── DELETAR CANAL ────────────────────────────────────────────

export function deleteChannel(channelId) {
  const reg = loadRegistry();
  if (reg.channels.length <= 1) {
    throw new Error("Mantenha pelo menos um canal.");
  }

  reg.channels = reg.channels.filter((c) => c.id !== channelId);
  if (reg.active_channel === channelId) {
    reg.active_channel = reg.channels[0]?.id || null;
  }
  saveRegistry(reg);

  // NÃO deletar a pasta (segurança) — apenas remover do registry
  return { deleted: channelId, new_active: reg.active_channel };
}

// ─── VALIDAÇÃO PRÉ-PUBLICAÇÃO ─────────────────────────────────

export function validateVideoForChannel(channelId, videoProject) {
  const config = loadChannelConfig(channelId);
  if (!config) {
    return {
      approved: true,
      errors: [],
      warnings: ["Canal sem config — validação pulada."],
    };
  }

  const errors = [];
  const warnings = [];

  // Título
  const tituloCfg = config.titulo || {};
  const maxChars = tituloCfg.max_caracteres || 70;
  if (videoProject.title && videoProject.title.length > maxChars) {
    errors.push(
      `Título tem ${videoProject.title.length} chars (máx: ${maxChars}).`
    );
  }

  // Nicho
  const nicho = config.nicho || {};
  if (
    videoProject.sub_nicho &&
    Array.isArray(nicho.sub_nichos_permitidos) &&
    nicho.sub_nichos_permitidos.length > 0 &&
    !nicho.sub_nichos_permitidos.includes(videoProject.sub_nicho)
  ) {
    errors.push(
      `Sub-nicho '${videoProject.sub_nicho}' não permitido para ${config.meta?.nome}.`
    );
  }
  if (
    videoProject.sub_nicho &&
    Array.isArray(nicho.temas_proibidos) &&
    nicho.temas_proibidos.includes(videoProject.sub_nicho)
  ) {
    errors.push(`Tema '${videoProject.sub_nicho}' é PROIBIDO para este canal.`);
  }

  // Duração
  const formato = config.formato_video || {};
  if (videoProject.duration_seconds != null) {
    if (
      formato.duracao_min_segundos &&
      videoProject.duration_seconds < formato.duracao_min_segundos
    ) {
      errors.push(
        `Vídeo tem ${videoProject.duration_seconds}s (mín: ${formato.duracao_min_segundos}s).`
      );
    }
    if (
      formato.duracao_max_segundos &&
      videoProject.duration_seconds > formato.duracao_max_segundos
    ) {
      warnings.push(
        `Vídeo tem ${videoProject.duration_seconds}s (ideal máx: ${formato.duracao_max_segundos}s).`
      );
    }
  }

  // Gancho
  const roteiroCfg = config.roteiro || {};
  const hook = videoProject.blocks?.[0];
  if (hook?.text) {
    const proibidos = roteiroCfg.hook_proibido_comecar_com || [];
    for (const p of proibidos) {
      if (hook.text.trimStart().startsWith(p)) {
        errors.push(`Gancho começa com "${p}" (proibido para este canal).`);
        break;
      }
    }
  }

  // Thumbnail
  const visualCfg = config.visual || {};
  if (visualCfg.thumbnail_separada && !videoProject.thumbnail_prompt) {
    warnings.push("Canal exige thumbnail dedicada (prompt separado).");
  }

  return { approved: errors.length === 0, errors, warnings };
}

// ─── INTEGRAÇÃO COM render_config_global.json ─────────────────
// (Expande o padrão existente do brandAssets.js SEM modificá-lo)

export function syncChannelToRenderConfig(backendDir, channelId) {
  const configPath = path.join(backendDir, "render_config_global.json");
  const renderConfig = readJsonSafe(configPath, {});

  const channelConfig = loadChannelConfig(channelId);
  if (!channelConfig) return renderConfig;

  // Injetar channelProfile ativo no render_config_global
  renderConfig.active_channel_profile = {
    id: channelId,
    nome: channelConfig.meta?.nome || channelId,
    nicho: channelConfig.nicho?.principal || null,
    youtube_channel_id: channelConfig.meta?.youtube_channel_id || null,
    synced_at: new Date().toISOString(),
  };

  writeJson(configPath, renderConfig);
  return renderConfig;
}

export function getChannelFromRenderConfig(backendDir) {
  const configPath = path.join(backendDir, "render_config_global.json");
  const renderConfig = readJsonSafe(configPath, {});
  return renderConfig.active_channel_profile || null;
}
