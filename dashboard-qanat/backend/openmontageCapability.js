/**
 * Capability envelope Lumiera — inspirado no provider_menu / support_envelope do OpenMontage.
 * Mapeia o que está configurado e pronto para produção (sem copiar código AGPL).
 */

import path from "path";
import fs from "fs";
import { getWorkflowApiKeys } from "./workflowTools.js";
import {
  loadFishSpeechConfig,
  probeFishSpeechServer,
} from "./fishSpeechTts.js";
import { probeChatterbox } from "./chatterboxTts.js";
import { probeQwen3Tts } from "./qwen3Tts.js";
import { loadVoiceboxConfig, probeVoiceboxServer } from "./voiceboxTts.js";
import { loadGptSovitsConfig, probeGptSovitsServer } from "./gptSovitsTts.js";
import { getNotebooklmStatus } from "./notebooklmService.js";

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function statusRow(id, label, ready, { hint = "", providers = [] } = {}) {
  return { id, label, ready, hint, providers };
}

/**
 * @param {object} ctx
 * @param {string} ctx.workspaceDir
 * @param {string} ctx.projDir
 * @param {Function} ctx.getApiKeys
 * @param {Function} ctx.getAiProvider
 * @param {Function} ctx.getXaiApiKey
 * @param {Function} ctx.getOpenRouterApiKey
 * @param {Function} ctx.getNvidiaApiKey
 * @param {Function} ctx.getEpidemicSoundKey
 */
export async function buildCapabilityMenu(ctx) {
  const {
    workspaceDir,
    projDir,
    getApiKeys,
    getAiProvider,
    getXaiApiKey,
    getOpenRouterApiKey,
    getNvidiaApiKey,
    getEpidemicSoundKey,
  } = ctx;

  const stockKeys = getWorkflowApiKeys(workspaceDir, projDir);
  const globalCfg = readJsonSafe(
    path.join(
      workspaceDir,
      "dashboard-qanat",
      "backend",
      "render_config_global.json"
    )
  );
  const projCfg = readJsonSafe(path.join(projDir, "config_qanat.json"));

  const geminiKeys = getApiKeys(projDir) || [];
  const aiProvider = getAiProvider(projDir);
  const hasGemini = geminiKeys.length > 0;
  const hasXai = Boolean(getXaiApiKey(projDir));
  const hasOpenRouter = Boolean(getOpenRouterApiKey(projDir));
  const hasNvidia = Boolean(getNvidiaApiKey?.(projDir));
  const hasEpidemic = Boolean(getEpidemicSoundKey(projDir));

  const fishConfig = loadFishSpeechConfig({ workspaceDir });
  const fishProbe = await probeFishSpeechServer(fishConfig);
  const chatterboxProbe = await probeChatterbox();
  const qwen3Probe = await probeQwen3Tts();
  const voiceboxConfig = loadVoiceboxConfig({ workspaceDir });
  const voiceboxProbe = await probeVoiceboxServer(voiceboxConfig);
  const gptSovitsConfig = loadGptSovitsConfig({ workspaceDir });
  const gptSovitsProbe = await probeGptSovitsServer(gptSovitsConfig);

  let notebooklmStatus = { ok: false };
  try {
    const backendDir = path.join(workspaceDir, "dashboard-qanat", "backend");
    notebooklmStatus = getNotebooklmStatus(backendDir);
  } catch {
    /* optional */
  }

  const remotionReady = true;
  const hyperframesReady = fs.existsSync(
    path.join(workspaceDir, ".agents", "skills", "hyperframes", "SKILL.md")
  );

  const categories = [
    {
      id: "narration",
      label: "Narração / TTS",
      items: [
        statusRow("kokoro", "Kokoro (local)", true, {
          hint: "Padrão Lumiera — grátis, PT/EN",
        }),
        statusRow("edge", "Edge TTS", true, {
          hint: "Microsoft neural — sem chave",
        }),
        statusRow("fish", "Fish Speech", fishProbe.ok, {
          hint: fishProbe.ok
            ? fishProbe.mode || "local"
            : fishProbe.error || "Inicie Fish Speech",
        }),
        statusRow("chatterbox", "Chatterbox", chatterboxProbe.ok, {
          hint: chatterboxProbe.ok
            ? "GPU local"
            : chatterboxProbe.error || "pip install chatterbox-tts",
        }),
        statusRow("qwen3", "Qwen3-TTS CustomVoice", qwen3Probe.ok, {
          hint: qwen3Probe.ok
            ? `GPU/CPU local · PT+EN · ${qwen3Probe.device || "auto"}`
            : qwen3Probe.error || "pip install -U qwen-tts (.venv-qwen3-tts)",
        }),
        statusRow("voicebox", "Voicebox", voiceboxProbe.ok, {
          hint: voiceboxProbe.ok
            ? `Clone local · ${voiceboxProbe.profiles?.length || 0} perfil(is)`
            : voiceboxProbe.error || ".\\scripts\\setup-voicebox.ps1",
        }),
        statusRow("gptsovits", "GPT-SoVITS", gptSovitsProbe.ok, {
          hint: gptSovitsProbe.ok
            ? `Clone few-shot · ${gptSovitsProbe.voiceCount || 0} voz(es)`
            : gptSovitsProbe.error || ".\\scripts\\start-gpt-sovits.ps1",
        }),
      ],
    },
    {
      id: "stock",
      label: "B-roll / Stock",
      items: [
        statusRow("pexels", "Pexels", Boolean(stockKeys.pexels), {
          hint: stockKeys.pexels ? "API ativa" : "Settings → Pexels API key",
        }),
        statusRow("pixabay", "Pixabay", Boolean(stockKeys.pixabay), {
          hint: stockKeys.pixabay ? "API ativa" : "Settings → Pixabay API key",
        }),
        statusRow(
          "bing_images",
          "Bing Images (scrap)",
          projCfg.use_bing_images !== false,
          {
            hint: "Sem chave — fallback de imagens após Pexels/Pixabay",
          }
        ),
        statusRow(
          "archive_org",
          "Archive.org",
          projCfg.use_archive_org !== false,
          {
            hint: "Documental — sem chave, fallback após Bing",
          }
        ),
      ],
    },
    {
      id: "composition",
      label: "Composição / Render",
      items: [
        statusRow("remotion", "Remotion PRO", remotionReady, {
          hint:
            globalCfg.useRemotionByDefault !== false
              ? "Padrão ativo"
              : "Ative em render config",
        }),
        statusRow("hyperframes", "HyperFrames", hyperframesReady, {
          hint: "134 recursos no catálogo Lumiera",
        }),
      ],
    },
    {
      id: "music",
      label: "Trilha",
      items: [
        statusRow("epidemic", "Epidemic Sound", hasEpidemic, {
          hint: hasEpidemic ? "BGM automático" : "Settings → Epidemic token",
        }),
      ],
    },
    {
      id: "llm",
      label: "IA / Metadados",
      items: [
        statusRow("gemini", "Gemini", hasGemini, {
          hint: hasGemini
            ? `${geminiKeys.length} chave(s)`
            : "Settings → Gemini",
          providers: hasGemini ? ["gemini"] : [],
        }),
        statusRow("xai", "xAI Grok", hasXai, {
          hint: hasXai ? "Ativo" : "Opcional",
        }),
        statusRow("openrouter", "OpenRouter", hasOpenRouter, {
          hint: hasOpenRouter ? "Ativo" : "Opcional",
        }),
        statusRow("nvidia", "NVIDIA NIM", hasNvidia, {
          hint: hasNvidia ? "Ativo" : "Opcional",
        }),
      ],
    },
    {
      id: "research",
      label: "Pesquisa",
      items: [
        statusRow(
          "notebooklm",
          "NotebookLM",
          Boolean(notebooklmStatus.available),
          {
            hint: notebooklmStatus.available
              ? notebooklmStatus.message || "MCP/CLI ativo"
              : notebooklmStatus.message || "nlm login + MCP",
          }
        ),
        statusRow("youtube_studio", "YouTube Studio Pro", true, {
          hint: "Concorrentes, fila editorial, retenção",
        }),
      ],
    },
  ];

  const gaps = [];
  for (const cat of categories) {
    for (const item of cat.items) {
      if (!item.ready) gaps.push({ category: cat.id, ...item });
    }
  }

  const readyCount = categories.reduce(
    (n, c) => n + c.items.filter((i) => i.ready).length,
    0
  );
  const totalCount = categories.reduce((n, c) => n + c.items.length, 0);

  return {
    source: "OpenMontage capability envelope (adaptado Lumiera)",
    aiProvider,
    projectFormat: projCfg.format || projCfg.video_format || null,
    summary: {
      ready: readyCount,
      total: totalCount,
      coverage: totalCount ? Math.round((readyCount / totalCount) * 100) : 0,
    },
    categories,
    gaps,
    recommendation: gaps.length
      ? `Configure ${gaps
          .slice(0, 3)
          .map((g) => g.label)
          .join(", ")} para ampliar o envelope de produção.`
      : "Envelope completo — todas as capacidades principais estão prontas.",
  };
}
