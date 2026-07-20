/**
 * channelProjectDefaults.js — Injeta defaults do canal ativo em novos projetos
 *
 * Integra com o fluxo existente de criação de projetos.
 * Chamado quando um novo projeto é criado no Creator/Wizard.
 *
 * Padrão: mesmo approach do globalStudioDefaults.js
 * (global → merge no config do projeto)
 */

import {
  getActiveChannelConfig,
  getActiveChannelId,
} from "./channelProfiles.js";

/**
 * Retorna os defaults do canal ativo para injetar em um novo config_qanat.json
 */
export function getChannelDefaultsForNewProject() {
  const config = getActiveChannelConfig();
  if (!config) return {};

  const channelId = getActiveChannelId();

  return {
    // Identificação do canal
    channel_profile_id: channelId,
    channel_profile_name: config.meta?.nome || channelId,

    // Nicho (usado pelo Creator, pesquisa, e validação)
    niche: config.nicho?.principal || "Geral",
    sub_nichos_permitidos: config.nicho?.sub_nichos_permitidos || [],
    temas_proibidos: config.nicho?.temas_proibidos || [],
    palavras_chave_seo: config.nicho?.palavras_chave_seo || [],

    // Formato
    target_duration_seconds:
      config.formato_video?.duracao_ideal_segundos || 600,
    min_duration_seconds: config.formato_video?.duracao_min_segundos || 480,
    max_duration_seconds: config.formato_video?.duracao_max_segundos || 720,

    // Roteiro
    hook_max_seconds: config.roteiro?.hook_max_segundos || 10,
    energy_peak_interval_seconds:
      config.roteiro?.picos_energia_intervalo_segundos || 90,
    energy_peak_minimum: config.roteiro?.picos_energia_minimo || 4,
    max_words_per_sentence: config.roteiro?.frase_max_palavras || 15,

    // Título
    title_max_chars: config.titulo?.max_caracteres || 60,
    title_templates: config.titulo?.templates_vencedores || [],

    // Visual
    visual_style: config.visual?.estilo_padrao || "hiper_realista_fotografico",
    thumbnail_required: config.visual?.thumbnail_separada !== false,

    // TTS
    tts_engine: config.tts?.engine || "gpt_sovits",
    tts_voice_id: config.tts?.voz_id || null,
    tts_speed: config.tts?.velocidade || 1.0,

    // Upload
    youtube_category: config.upload?.youtube_categoria || "27",
    default_tags: config.upload?.tags_padrao || [],

    // Brand
    brand_palette: config.brand?.paleta_cores || null,
    brand_font: config.brand?.fonte_thumbnail || null,
  };
}

/**
 * Merge dos defaults do canal no config do projeto.
 * O config do projeto SEMPRE vence (usuário pode sobrescrever).
 *
 * Uso:
 *   const projectConfig = mergeChannelDefaults(existingProjectConfig);
 */
export function mergeChannelDefaults(projectConfig = {}) {
  const defaults = getChannelDefaultsForNewProject();
  if (!defaults || Object.keys(defaults).length === 0) return projectConfig;

  const merged = { ...projectConfig };

  // Só injeta se o projeto NÃO tem o campo definido
  for (const [key, value] of Object.entries(defaults)) {
    if (
      merged[key] === undefined ||
      merged[key] === null ||
      merged[key] === ""
    ) {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Valida se um tema é permitido para o canal ativo.
 * Retorna { allowed: boolean, reason?: string }
 */
export function validateTemaForActiveChannel(subNicho) {
  const config = getActiveChannelConfig();
  if (!config) return { allowed: true }; // Sem canal = sem restrição

  const nicho = config.nicho || {};

  if (
    Array.isArray(nicho.temas_proibidos) &&
    nicho.temas_proibidos.includes(subNicho)
  ) {
    return {
      allowed: false,
      reason: `'${subNicho}' é proibido para ${config.meta?.nome}.`,
    };
  }

  if (
    Array.isArray(nicho.sub_nichos_permitidos) &&
    nicho.sub_nichos_permitidos.length > 0 &&
    !nicho.sub_nichos_permitidos.includes(subNicho)
  ) {
    return {
      allowed: false,
      reason: `'${subNicho}' não está nos sub-nichos de ${config.meta?.nome}. Permitidos: ${nicho.sub_nichos_permitidos.join(", ")}`,
    };
  }

  return { allowed: true };
}
