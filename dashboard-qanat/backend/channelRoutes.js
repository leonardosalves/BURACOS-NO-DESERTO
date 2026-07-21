/**
 * channelRoutes.js — Rotas Express para Channel Swap
 *
 * USO: No server.js, adicionar APENAS esta linha:
 *   import channelRouter from "./channelRoutes.js";
 *   app.use("/api/channels", channelRouter);
 *
 * Isso é a ÚNICA modificação no server.js (2 linhas).
 */

import { Router } from "express";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";
import {
  listChannels,
  getActiveChannelId,
  setActiveChannel,
  loadChannelConfig,
  saveChannelConfig,
  loadChannelPrompts,
  loadChannelTemplates,
  getPipelineConfigForChannel,
  getActivePipelineConfig,
  createChannel,
  deleteChannel,
  validateVideoForChannel,
  syncChannelToRenderConfig,
} from "./channelProfiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// GET /api/channels — Listar todos
router.get("/", (_req, res) => {
  try {
    const channels = listChannels();
    const activeId = getActiveChannelId();
    res.json({ channels, active_channel: activeId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels/active — Canal ativo + pipeline config
router.get("/active", (_req, res) => {
  try {
    const pipeline = getActivePipelineConfig();
    if (!pipeline) {
      return res.status(404).json({ error: "Nenhum canal ativo configurado." });
    }
    res.json({ ok: true, pipeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/switch — Trocar canal ativo
router.post("/switch", (req, res) => {
  try {
    const { channelId } = req.body || {};
    if (!channelId) {
      return res.status(400).json({ error: "channelId é obrigatório." });
    }
    const channel = setActiveChannel(channelId);

    // Sincronizar com render_config_global.json
    syncChannelToRenderConfig(__dirname, channelId);

    res.json({ ok: true, active: channel });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Helper para buscar avatar público do YouTube
export function fetchYoutubeAvatarUrl(youtubeChannelId) {
  return new Promise((resolve) => {
    if (!youtubeChannelId || typeof youtubeChannelId !== "string")
      return resolve(null);
    const cleanId = youtubeChannelId.trim();
    if (!cleanId) return resolve(null);

    const url = cleanId.startsWith("UC")
      ? `https://www.youtube.com/channel/${cleanId}`
      : cleanId.startsWith("@")
        ? `https://www.youtube.com/${cleanId}`
        : `https://www.youtube.com/channel/${cleanId}`;

    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      },
      (res) => {
        let html = "";
        res.on("data", (chunk) => {
          html += chunk;
        });
        res.on("end", () => {
          const ogMatch = html.match(
            /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i
          );
          if (ogMatch && ogMatch[1]) return resolve(ogMatch[1]);

          const avatarMatch = html.match(
            /"avatar":\s*\{\s*"thumbnails":\s*\[\s*\{\s*"url":\s*"([^"]+)"/i
          );
          if (avatarMatch && avatarMatch[1]) return resolve(avatarMatch[1]);

          resolve(null);
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(6000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

// POST /api/channels/fetch-avatar — Buscar avatar automático no YouTube
router.post("/fetch-avatar", async (req, res) => {
  try {
    const youtubeChannelId =
      req.body?.youtubeChannelId || req.body?.youtube_channel_id;
    if (!youtubeChannelId) {
      return res.status(400).json({ error: "youtubeChannelId é obrigatório." });
    }
    const avatarUrl = await fetchYoutubeAvatarUrl(youtubeChannelId);
    if (!avatarUrl) {
      return res
        .status(404)
        .json({ error: "Avatar não encontrado para este ID de canal." });
    }
    res.json({ ok: true, avatar_url: avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/create — Criar novo canal
router.post("/create", async (req, res) => {
  try {
    const {
      id,
      nome,
      youtubeChannelId,
      avatarUrl,
      cor,
      nicho,
      subNichos,
      temasProibidos,
      descricao,
    } = req.body || {};
    let finalAvatarUrl = avatarUrl;
    if (!finalAvatarUrl && youtubeChannelId) {
      finalAvatarUrl = await fetchYoutubeAvatarUrl(youtubeChannelId);
    }
    const result = createChannel({
      id,
      nome,
      youtubeChannelId,
      avatarUrl: finalAvatarUrl,
      cor,
      nicho,
      subNichos,
      temasProibidos,
      descricao,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/channels/:id — Remover canal do registry
router.delete("/:id", (req, res) => {
  try {
    const result = deleteChannel(req.params.id);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/channels/:id/config — Config de um canal
router.get("/:id/config", (req, res) => {
  try {
    const config = loadChannelConfig(req.params.id);
    if (!config) {
      return res.status(404).json({ error: "Canal não encontrado." });
    }
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/channels/:id/config — Atualizar config
router.put("/:id/config", async (req, res) => {
  try {
    const existing = loadChannelConfig(req.params.id) || {};
    // Deep merge (não sobrescrever meta.id)
    const merged = { ...existing, ...req.body };
    merged.meta = {
      ...(existing.meta || {}),
      ...(req.body.meta || {}),
      id: req.params.id,
    };

    // Tentar buscar avatar automaticamente se não fornecido mas youtube_channel_id existe
    if (merged.meta.youtube_channel_id && !merged.meta.avatar_url) {
      const fetched = await fetchYoutubeAvatarUrl(
        merged.meta.youtube_channel_id
      );
      if (fetched) {
        merged.meta.avatar_url = fetched;
      }
    }

    saveChannelConfig(req.params.id, merged);
    res.json({ ok: true, config: merged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels/:id/prompts — Prompts do canal
router.get("/:id/prompts", (req, res) => {
  try {
    const prompts = loadChannelPrompts(req.params.id);
    res.json({ ok: true, prompts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels/:id/templates — Templates do canal
router.get("/:id/templates", (req, res) => {
  try {
    const templates = loadChannelTemplates(req.params.id);
    res.json({ ok: true, templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels/:id/pipeline — Config completa para o pipeline
router.get("/:id/pipeline", (req, res) => {
  try {
    const pipeline = getPipelineConfigForChannel(req.params.id);
    if (!pipeline) {
      return res.status(404).json({ error: "Canal não encontrado." });
    }
    res.json({ ok: true, pipeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/:id/validate — Validar vídeo para o canal
router.post("/:id/validate", (req, res) => {
  try {
    const result = validateVideoForChannel(req.params.id, req.body || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
