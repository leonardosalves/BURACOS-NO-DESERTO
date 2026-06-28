/**
 * Catálogo de logos e canais YouTube — múltiplos itens com seleção ativa.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

export function getGlobalConfigPath(backendDir) {
  return path.join(backendDir, "render_config_global.json");
}

export function getLogosDir(workspaceDir) {
  return path.join(workspaceDir, "ASSETS", "logos");
}

export function loadRenderConfig(backendDir) {
  const configPath = getGlobalConfigPath(backendDir);
  const defaults = {
    fps: 30,
    blockGapSeconds: 1.0,
    musicVolume: 0.15,
    useRemotionByDefault: true,
    debugOverlay: false,
    youtubeChannel: {
      channelUrl: "",
      channelName: "",
      subscriberCount: "",
    },
    brandLogos: [],
    selectedLogoId: null,
    youtubeChannels: [],
    selectedYoutubeChannelId: null,
  };

  if (!fs.existsSync(configPath)) return { ...defaults };

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return {
      ...defaults,
      ...raw,
      brandLogos: Array.isArray(raw.brandLogos) ? raw.brandLogos : [],
      youtubeChannels: Array.isArray(raw.youtubeChannels) ? raw.youtubeChannels : [],
    };
  } catch {
    return { ...defaults };
  }
}

export function saveRenderConfig(backendDir, config) {
  const configPath = getGlobalConfigPath(backendDir);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  return config;
}

function syncLegacyYoutubeChannel(config) {
  const selected = resolveChannelEntry(config, config.selectedYoutubeChannelId);
  if (selected) {
    config.youtubeChannel = {
      channelUrl: selected.channelUrl || "",
      channelName: selected.channelName || "",
      subscriberCount: selected.subscriberCount || "",
    };
  }
  return config;
}

export function ensureBrandCatalogMigrated(workspaceDir, backendDir) {
  const config = loadRenderConfig(backendDir);
  let changed = false;

  if (!Array.isArray(config.brandLogos)) {
    config.brandLogos = [];
    changed = true;
  }
  if (!Array.isArray(config.youtubeChannels)) {
    config.youtubeChannels = [];
    changed = true;
  }

  const logosDir = getLogosDir(workspaceDir);
  fs.mkdirSync(logosDir, { recursive: true });

  const legacyLogo = path.join(workspaceDir, "ASSETS", "logo.png");
  if (config.brandLogos.length === 0 && fs.existsSync(legacyLogo)) {
    const id = "legacy-default";
    const dest = path.join(logosDir, `${id}.png`);
    if (!fs.existsSync(dest)) fs.copyFileSync(legacyLogo, dest);
    config.brandLogos.push({
      id,
      name: "Logo Padrão",
      file: `${id}.png`,
      createdAt: new Date().toISOString(),
    });
    config.selectedLogoId = id;
    changed = true;
  }

  const legacyChannel = config.youtubeChannel || {};
  if (config.youtubeChannels.length === 0 && legacyChannel.channelUrl) {
    const id = "legacy-default";
    config.youtubeChannels.push({
      id,
      label: "Canal Padrão",
      channelUrl: legacyChannel.channelUrl || "",
      channelName: legacyChannel.channelName || "",
      subscriberCount: legacyChannel.subscriberCount || "",
      createdAt: new Date().toISOString(),
    });
    config.selectedYoutubeChannelId = id;
    changed = true;
  }

  if (changed) {
    syncLegacyYoutubeChannel(config);
    saveRenderConfig(backendDir, config);
  }

  return config;
}

export function resolveLogoEntry(config, logoId) {
  if (!logoId) return null;
  return (config.brandLogos || []).find((l) => l.id === logoId) || null;
}

export function resolveChannelEntry(config, channelId) {
  if (!channelId) return null;
  return (config.youtubeChannels || []).find((c) => c.id === channelId) || null;
}

function findLegacyProjectLogo(projectDir) {
  const candidates = [
    path.join(projectDir, "ASSETS", "logo.png"),
    path.join(projectDir, "logo.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function resolveLogoFilePath(workspaceDir, projectDir, globalConfig, projectConfig = {}) {
  const logosDir = getLogosDir(workspaceDir);

  const tryEntry = (entry) => {
    if (!entry?.file) return null;
    const full = path.join(logosDir, path.basename(entry.file));
    return fs.existsSync(full) ? full : null;
  };

  const projectLogoId = projectConfig.selected_logo_id || projectConfig.selectedLogoId;
  if (projectLogoId) {
    const fromCatalog = tryEntry(resolveLogoEntry(globalConfig, projectLogoId));
    if (fromCatalog) return fromCatalog;
  }

  const legacyProject = findLegacyProjectLogo(projectDir);
  if (legacyProject) return legacyProject;

  const selectedId = globalConfig.selectedLogoId || globalConfig.brandLogos?.[0]?.id;
  const fromGlobal = tryEntry(resolveLogoEntry(globalConfig, selectedId));
  if (fromGlobal) return fromGlobal;

  const legacyGlobal = path.join(workspaceDir, "ASSETS", "logo.png");
  return fs.existsSync(legacyGlobal) ? legacyGlobal : null;
}

export function listBrandLogos(workspaceDir, backendDir) {
  const config = ensureBrandCatalogMigrated(workspaceDir, backendDir);
  const logosDir = getLogosDir(workspaceDir);
  const logos = (config.brandLogos || []).map((logo) => ({
    ...logo,
    url: `/api/projects-media/ASSETS/logos/${encodeURIComponent(logo.file)}`,
    exists: fs.existsSync(path.join(logosDir, logo.file)),
  }));
  const active = resolveLogoEntry(config, config.selectedLogoId) || logos[0] || null;
  return {
    logos,
    selectedLogoId: config.selectedLogoId || active?.id || null,
    activeLogo: active
      ? { ...active, url: `/api/projects-media/ASSETS/logos/${encodeURIComponent(active.file)}` }
      : null,
  };
}

export function addBrandLogo(workspaceDir, backendDir, { name = "Novo Logo", sourcePath }) {
  const config = ensureBrandCatalogMigrated(workspaceDir, backendDir);
  const logosDir = getLogosDir(workspaceDir);
  fs.mkdirSync(logosDir, { recursive: true });

  const id = `logo-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const file = `${id}.png`;
  const dest = path.join(logosDir, file);
  fs.copyFileSync(sourcePath, dest);

  const entry = {
    id,
    name: String(name || "Novo Logo").trim().slice(0, 80) || "Novo Logo",
    file,
    createdAt: new Date().toISOString(),
  };
  config.brandLogos.push(entry);
  if (!config.selectedLogoId) config.selectedLogoId = id;
  saveRenderConfig(backendDir, config);

  return { entry, selectedLogoId: config.selectedLogoId };
}

export function selectBrandLogo(backendDir, logoId) {
  const config = loadRenderConfig(backendDir);
  const entry = resolveLogoEntry(config, logoId);
  if (!entry) throw new Error("Logo não encontrado no catálogo.");
  config.selectedLogoId = logoId;
  saveRenderConfig(backendDir, config);
  return { selectedLogoId: logoId, entry };
}

export function deleteBrandLogo(workspaceDir, backendDir, logoId) {
  const config = loadRenderConfig(backendDir);
  const entry = resolveLogoEntry(config, logoId);
  if (!entry) throw new Error("Logo não encontrado.");

  const logosDir = getLogosDir(workspaceDir);
  const filePath = path.join(logosDir, entry.file);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  config.brandLogos = (config.brandLogos || []).filter((l) => l.id !== logoId);
  if (config.selectedLogoId === logoId) {
    config.selectedLogoId = config.brandLogos[0]?.id || null;
  }
  saveRenderConfig(backendDir, config);
  return { selectedLogoId: config.selectedLogoId };
}

export function listYoutubeChannelsFromConfig(config) {
  return {
    channels: config.youtubeChannels || [],
    selectedYoutubeChannelId: config.selectedYoutubeChannelId || config.youtubeChannels?.[0]?.id || null,
  };
}

export function addYoutubeChannel(backendDir, { label, channelUrl, channelName = "", subscriberCount = "" }) {
  const config = loadRenderConfig(backendDir);
  if (!Array.isArray(config.youtubeChannels)) config.youtubeChannels = [];

  const id = `channel-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const entry = {
    id,
    label: String(label || "Novo Canal").trim().slice(0, 80) || "Novo Canal",
    channelUrl: String(channelUrl || "").trim(),
    channelName: String(channelName || "").trim(),
    subscriberCount: String(subscriberCount || "").trim(),
    createdAt: new Date().toISOString(),
  };
  if (!entry.channelUrl) throw new Error("URL do canal é obrigatória.");

  config.youtubeChannels.push(entry);
  if (!config.selectedYoutubeChannelId) config.selectedYoutubeChannelId = id;
  syncLegacyYoutubeChannel(config);
  saveRenderConfig(backendDir, config);
  return { entry, selectedYoutubeChannelId: config.selectedYoutubeChannelId };
}

export function updateYoutubeChannel(backendDir, channelId, patch = {}) {
  const config = loadRenderConfig(backendDir);
  const idx = (config.youtubeChannels || []).findIndex((c) => c.id === channelId);
  if (idx < 0) throw new Error("Canal não encontrado.");

  const current = config.youtubeChannels[idx];
  config.youtubeChannels[idx] = {
    ...current,
    label: patch.label !== undefined ? String(patch.label).trim().slice(0, 80) : current.label,
    channelUrl: patch.channelUrl !== undefined ? String(patch.channelUrl).trim() : current.channelUrl,
    channelName: patch.channelName !== undefined ? String(patch.channelName).trim() : current.channelName,
    subscriberCount: patch.subscriberCount !== undefined ? String(patch.subscriberCount).trim() : current.subscriberCount,
  };

  if (!config.youtubeChannels[idx].channelUrl) throw new Error("URL do canal é obrigatória.");

  if (config.selectedYoutubeChannelId === channelId) syncLegacyYoutubeChannel(config);
  saveRenderConfig(backendDir, config);
  return config.youtubeChannels[idx];
}

export function selectYoutubeChannel(backendDir, channelId) {
  const config = loadRenderConfig(backendDir);
  const entry = resolveChannelEntry(config, channelId);
  if (!entry) throw new Error("Canal não encontrado no catálogo.");
  config.selectedYoutubeChannelId = channelId;
  syncLegacyYoutubeChannel(config);
  saveRenderConfig(backendDir, config);
  return { selectedYoutubeChannelId: channelId, entry };
}

export function deleteYoutubeChannel(backendDir, channelId) {
  const config = loadRenderConfig(backendDir);
  if ((config.youtubeChannels || []).length <= 1) {
    throw new Error("Mantenha pelo menos um canal no catálogo.");
  }

  config.youtubeChannels = (config.youtubeChannels || []).filter((c) => c.id !== channelId);
  if (config.selectedYoutubeChannelId === channelId) {
    config.selectedYoutubeChannelId = config.youtubeChannels[0]?.id || null;
  }
  syncLegacyYoutubeChannel(config);
  saveRenderConfig(backendDir, config);
  return { selectedYoutubeChannelId: config.selectedYoutubeChannelId };
}

export function readYoutubeChannelFromCatalog(projectConfig = {}, globalConfig = {}) {
  const projectChannel = projectConfig.youtube_channel || projectConfig.youtubeChannel || {};
  const projectChannelId = projectConfig.selected_youtube_channel_id || projectConfig.selectedYoutubeChannelId;

  const hasLegacyProjectFields = Boolean(
    !projectChannelId && (
      projectChannel.channel_url || projectChannel.channelUrl
      || projectChannel.channel_name || projectChannel.channelName
      || projectChannel.subscriber_count || projectChannel.subscriberCount
    ),
  );

  if (hasLegacyProjectFields) {
    return {
      channelUrl: projectChannel.channel_url || projectChannel.channelUrl || "",
      channelName: projectChannel.channel_name || projectChannel.channelName || "",
      subscriberCount: projectChannel.subscriber_count || projectChannel.subscriberCount || "",
      scope: "project",
      channelId: null,
    };
  }

  if (projectChannelId) {
    const entry = resolveChannelEntry(globalConfig, projectChannelId);
    if (entry) {
      return {
        channelUrl: entry.channelUrl || "",
        channelName: entry.channelName || "",
        subscriberCount: entry.subscriberCount || "",
        scope: "project",
        channelId: projectChannelId,
      };
    }
  }

  const selectedId = globalConfig.selectedYoutubeChannelId || globalConfig.youtubeChannels?.[0]?.id;
  const entry = resolveChannelEntry(globalConfig, selectedId)
    || resolveChannelEntry(globalConfig, "legacy-default");

  if (entry) {
    return {
      channelUrl: entry.channelUrl || "",
      channelName: entry.channelName || "",
      subscriberCount: entry.subscriberCount || "",
      scope: "global",
      channelId: entry.id,
    };
  }

  const legacy = globalConfig.youtubeChannel || globalConfig.youtube_channel || {};
  return {
    channelUrl: legacy.channelUrl || legacy.channel_url || "",
    channelName: legacy.channelName || legacy.channel_name || "",
    subscriberCount: legacy.subscriberCount || legacy.subscriber_count || "",
    scope: "global",
    channelId: null,
  };
}