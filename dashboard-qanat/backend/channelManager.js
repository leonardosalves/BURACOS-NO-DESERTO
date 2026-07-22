/**
 * channelManager.js — Gerenciador Central de Canais (Facade/Service Layer)
 *
 * Centraliza o acesso ao canal ativo e fornece helpers de alto nível
 * para todos os módulos do backend que precisam de contexto de canal.
 *
 * USO:
 *   import { getActiveContext, onChannelChange, channelMiddleware } from "./channelManager.js";
 *
 * Módulos que antes importavam de channelProfiles.js podem migrar para cá
 * gradualmente — este arquivo re-exporta tudo de channelProfiles para
 * compatibilidade retroativa.
 */

import { EventEmitter } from "events";
import path from "path";
import { fileURLToPath } from "url";

// Re-exporta tudo de channelProfiles (compatibilidade)
export {
  loadRegistry,
  getActiveChannelId,
  setActiveChannel as _setActiveChannelRaw,
  listChannels,
  loadChannelConfig,
  saveChannelConfig,
  getActiveChannelConfig,
  loadChannelPrompts,
  loadChannelTemplates,
  getPipelineConfigForChannel,
  getActivePipelineConfig,
  createChannel,
  deleteChannel,
  validateVideoForChannel,
  syncChannelToRenderConfig,
  getChannelFromRenderConfig,
} from "./channelProfiles.js";

import {
  getActiveChannelId,
  setActiveChannel as _setActiveRaw,
  getActivePipelineConfig,
  loadChannelConfig,
  loadChannelPrompts,
  syncChannelToRenderConfig,
} from "./channelProfiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── EVENT BUS ────────────────────────────────────────────────
const emitter = new EventEmitter();
emitter.setMaxListeners(30);

/**
 * Registra callback para quando o canal ativo mudar.
 * @param {(channelId: string|null, pipeline: object|null) => void} fn
 */
export function onChannelChange(fn) {
  emitter.on("channel:changed", fn);
  return () => emitter.off("channel:changed", fn);
}

// ─── CACHE DO CONTEXTO ATIVO ──────────────────────────────────
let _cachedContext = null;
let _cachedChannelId = undefined; // undefined = nunca carregado

function invalidateCache() {
  _cachedContext = null;
  _cachedChannelId = undefined;
}

/**
 * Retorna o contexto completo do canal ativo (com cache).
 * Inclui: pipeline config, prompts, nicho, TTS, formato, etc.
 * Retorna null se nenhum canal ativo.
 */
export function getActiveContext() {
  const currentId = getActiveChannelId();

  // Cache válido se o ID não mudou
  if (_cachedChannelId === currentId && _cachedContext !== null) {
    return _cachedContext;
  }

  if (!currentId) {
    _cachedChannelId = currentId;
    _cachedContext = null;
    return null;
  }

  _cachedChannelId = currentId;
  _cachedContext = getActivePipelineConfig();
  return _cachedContext;
}

// ─── SET ACTIVE (com evento + sync) ──────────────────────────

/**
 * Troca o canal ativo, sincroniza render config e emite evento.
 * @param {string} channelId
 * @returns {object} channel entry do registry
 */
export function setActiveChannel(channelId) {
  const result = _setActiveRaw(channelId);
  syncChannelToRenderConfig(__dirname, channelId);
  invalidateCache();
  const pipeline = getActiveContext();
  emitter.emit("channel:changed", channelId, pipeline);
  return result;
}

// ─── HELPERS DE CONVENIÊNCIA ──────────────────────────────────

/** Nicho principal do canal ativo (string ou null). */
export function getActiveNiche() {
  const ctx = getActiveContext();
  return ctx?.nicho?.principal || null;
}

/** Sub-nichos permitidos do canal ativo (array). */
export function getActiveSubNiches() {
  const ctx = getActiveContext();
  return ctx?.nicho?.sub_nichos_permitidos || [];
}

/** Temas proibidos do canal ativo (array). */
export function getActiveForbiddenTopics() {
  const ctx = getActiveContext();
  return ctx?.nicho?.temas_proibidos || [];
}

/** Config de TTS do canal ativo (object). */
export function getActiveTTSConfig() {
  const ctx = getActiveContext();
  return ctx?.tts || {};
}

/** Config de formato/duração do canal ativo. */
export function getActiveFormatConfig() {
  const ctx = getActiveContext();
  return ctx?.formato || {};
}

/** Config de título do canal ativo. */
export function getActiveTitleConfig() {
  const ctx = getActiveContext();
  return ctx?.titulo || {};
}

/** Config de pesquisa do canal ativo. */
export function getActiveSearchConfig() {
  const ctx = getActiveContext();
  return ctx?.pesquisa || {};
}

/** Prompts customizados do canal ativo (objeto { nome: markdown }). */
export function getActivePrompts() {
  const ctx = getActiveContext();
  return ctx?.prompts || {};
}

/** YouTube Channel ID do canal ativo. */
export function getActiveYoutubeChannelId() {
  const ctx = getActiveContext();
  return ctx?.youtube_channel_id || null;
}

/** Idioma do canal ativo (default: pt-BR). */
export function getActiveLanguage() {
  const ctx = getActiveContext();
  return ctx?.idioma || "pt-BR";
}

/**
 * Retorna um prompt específico do canal ativo.
 * @param {string} name — ex: "narracao", "visual", "pesquisa"
 * @returns {string|null}
 */
export function getActivePrompt(name) {
  const prompts = getActivePrompts();
  return prompts[name] || null;
}

// ─── MIDDLEWARE EXPRESS ───────────────────────────────────────

/**
 * Middleware que injeta `req.channelContext` com o pipeline do canal ativo.
 * Uso: app.use("/api/...", channelMiddleware, routeHandler)
 */
export function channelMiddleware(req, _res, next) {
  req.channelContext = getActiveContext();
  req.channelId = getActiveChannelId();
  next();
}

// ─── DIAGNÓSTICO / HEALTH ─────────────────────────────────────

/**
 * Retorna resumo do estado do gerenciador de canais (para /api/health).
 */
export function getChannelManagerStatus() {
  const activeId = getActiveChannelId();
  const ctx = getActiveContext();
  return {
    active_channel: activeId,
    has_pipeline: !!ctx,
    nicho: ctx?.nicho?.principal || null,
    idioma: ctx?.idioma || "pt-BR",
    youtube_channel_id: ctx?.youtube_channel_id || null,
    cached: _cachedChannelId === activeId && _cachedContext !== null,
  };
}
