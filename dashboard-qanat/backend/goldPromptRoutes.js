import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseJsonLocally } from "./aiJsonParse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "gold_prompt_channels.json");

// â”€â”€ O motor canÃ´nico de 12 estados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const GOLD_STATES = [
  {
    id: "s1",
    key: "reference",
    label: "Canal de ReferÃªncia",
    desc: "AnÃ¡lise do canal de origem",
  },
  {
    id: "s2",
    key: "branding",
    label: "Branding Brief",
    desc: "Nome, descriÃ§Ãµes, logo e banner",
  },
  {
    id: "s3",
    key: "positioning",
    label: "Posicionamento",
    desc: "DiferenciaÃ§Ã£o e territÃ³rio editorial",
  },
  {
    id: "s4",
    key: "audience",
    label: "PÃºblico e Promessa",
    desc: "AudiÃªncia-alvo e promessa de valor",
  },
  {
    id: "s5",
    key: "styleDna",
    label: "Style DNA",
    desc: "PadrÃµes narrativos e de linguagem",
  },
  {
    id: "s6",
    key: "narrative",
    label: "Estrutura Narrativa",
    desc: "Fluxo, ritmo e retenÃ§Ã£o",
  },
  {
    id: "s7",
    key: "visual",
    label: "Identidade Visual",
    desc: "EstÃ©tica, paleta, luz e cÃ¢mera",
  },
  {
    id: "s8",
    key: "editorial",
    label: "EstratÃ©gia Editorial",
    desc: "FrequÃªncia, formatos e pautas",
  },
  {
    id: "s9",
    key: "ideas",
    label: "Ideias de VÃ­deos",
    desc: "Pipeline de pautas",
  },
  {
    id: "s10",
    key: "scripts",
    label: "Roteiros",
    desc: "NarraÃ§Ã£o e estrutura por vÃ­deo",
  },
  {
    id: "s11",
    key: "production",
    label: "ProduÃ§Ã£o Visual",
    desc: "Beats, assets e thumbnails",
  },
  {
    id: "s12",
    key: "review",
    label: "RevisÃ£o e ExportaÃ§Ã£o",
    desc: "Checagem factual e entrega",
  },
];

export const STATE_STATUSES = [
  "blocked",
  "pending",
  "processing",
  "review",
  "done",
  "approved",
];

export const VIDEO_STAGES = [
  { id: "ideia", label: "Ideia" },
  { id: "pesquisa", label: "Pesquisa" },
  { id: "roteiro", label: "Roteiro" },
  { id: "revisao", label: "RevisÃ£o" },
  { id: "storyboard", label: "Storyboard" },
  { id: "assets", label: "Assets" },
  { id: "narracao", label: "NarraÃ§Ã£o" },
  { id: "edicao", label: "EdiÃ§Ã£o" },
  { id: "finalizado", label: "Finalizado" },
];

function defaultStateProgress() {
  const progress = {};
  GOLD_STATES.forEach((state, index) => {
    progress[state.id] =
      index === 0
        ? "approved"
        : index < 8
          ? "done"
          : index === 8
            ? "review"
            : "pending";
  });
  return progress;
}

function migrateChannel(channel) {
  if (!channel.stateProgress) channel.stateProgress = defaultStateProgress();
  if (!Array.isArray(channel.lockedBlocks)) channel.lockedBlocks = [];
  if (!Array.isArray(channel.versions)) channel.versions = [];
  if (!channel.transformationLevel) channel.transformationLevel = "equilibrado";
  if (typeof channel.similarityScore !== "number") channel.similarityScore = 34;
  if (!channel.lastEditedAt)
    channel.lastEditedAt = channel.createdAt || new Date().toISOString();
  if (!Array.isArray(channel.videos)) channel.videos = [];
  channel.videos.forEach((video) => {
    if (!video.pipelineStage) video.pipelineStage = "roteiro";
    if (!video.factCheck) video.factCheck = null;
  });
  return channel;
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(
      STORE_PATH,
      JSON.stringify(
        {
          channels: [
            {
              id: "channel-1",
              sourceChannel: "Veritasium / Magnates Media",
              cloneName: "Engenharia & MistÃ©rios",
              niche: "Engenharia & CiÃªncia Documental",
              createdAt: new Date().toISOString(),
              branding: {
                nameVariants: [
                  "MistÃ©rios da Engenharia",
                  "VÃ©rtice Documental",
                  "CrÃ´nicas do EspaÃ§o-Tempo",
                  "Arquivos do Progresso",
                  "VÃ³rtex CientÃ­fico",
                ],
                descriptions: [
                  "DocumentÃ¡rios visuais profundos sobre as maiores obras, desastres e triunfos da engenharia humana.",
                  "Explorando a fÃ­sica, a histÃ³ria e a engenharia por trÃ¡s das estruturas mais inacreditÃ¡veis do planeta.",
                ],
                logoPrompt:
                  "Ultra-detailed minimalist emblem of a glowing mechanical gear intertwined with an ancient hourglass, 8k resolution, cinematic dark background, gold and dark cyan accents",
                bannerPrompt:
                  "Wide panoramic 16:9 cinematic illustration of monumental mega-structures emerging from dark clouds, neon gold geometry lines, photorealistic, 8k",
              },
              styleDna: {
                niche: "Engenharia & MistÃ©rios HistÃ³ricos",
                targetAudience:
                  "Curiosos de tecnologia, fÃ­sica e arquitetura (18-45 anos)",
                hookStyle:
                  "Pergunta chocante de 1.5s sobre desastre eminente + revelaÃ§Ã£o em 5s",
                scriptFlow:
                  "Hook -> MistÃ©rio -> Causa Oculta -> ClÃ­max -> LiÃ§Ã£o TÃ©cnica",
                sentenceRhythm:
                  "Frases curtas, diretas, pausadas para efeito dramÃ¡tico",
                tone: "AutoritÃ¡rio, intrigante, hiper-focado",
                retentionTechniques:
                  "Curiosity gap a cada 45 segundos, pergunta aberta antes de cada bloco",
                wordsPerSecond: 2.4,
                targetWordCount: "1800 - 2400 palavras (8 a 12 minutos)",
              },
              visualProfile: {
                artStyle: "CinematogrÃ¡fico documental hiper-realista 16mm",
                colorPalette:
                  "Tons escuros, dourado vintage, azul profundo e Ã¢mbar",
                lightingStyle:
                  "IluminaÃ§Ã£o dramÃ¡tica com contraste chiaroscuro e nÃ©voa volumÃ©trica",
                cameraStyle:
                  "Lentes anamÃ³rficas 35mm, travelling lento e close-ups tÃ©cnicos",
              },
              videos: [
                {
                  id: "video-1",
                  title:
                    "A Falha InvisÃ­vel que Derrubou a Torre Ronan Point em 1968",
                  duration: "9:30 min",
                  wordCount: 1950,
                  pipelineStage: "revisao",
                  narrationScript:
                    "Tudo comeÃ§ou em 16 de maio de 1968, no dÃ©cimo oitavo andar de uma torre em Londres. Uma simples chaleira a gÃ¡s causou um vazamento imperceptÃ­vel. Mas o verdadeiro desastre nÃ£o foi o fogo â€” foi a prÃ³pria estrutura do prÃ©dio.",
                  beats: [
                    {
                      id: "b1",
                      scriptSegment:
                        "Tudo comeÃ§ou em 16 de maio de 1968, no dÃ©cimo oitavo andar de uma torre em Londres.",
                      imagePrompt:
                        "Photorealistic 1968 London high-rise residential apartment tower on a hazy morning, vintage 35mm film grain, muted color grading, dramatic low angle view, 8k",
                      videoPrompt:
                        "Slow cinematic pan up along the concrete facade of a 1960s London apartment tower, morning light piercing fog",
                      cameraAngle: "Low Angle Track Up",
                      lighting: "Early Morning Foggy Sunlight",
                      mood: "Tense, Historical",
                    },
                    {
                      id: "b2",
                      scriptSegment:
                        "Uma simples chaleira a gÃ¡s causou um vazamento imperceptÃ­vel. Mas o verdadeiro desastre nÃ£o foi o fogo.",
                      imagePrompt:
                        "Close-up cinematic shot of an authentic 1960s brass tea kettle heating on a vintage gas stove, soft blue flame glow, cinematic warm dark atmosphere",
                      videoPrompt:
                        "Slow zoom in on the gas kettle nozzle with subtle steam rising in high resolution 60fps",
                      cameraAngle: "Macro Close-Up",
                      lighting: "Dark Kitchen Ambient Accent",
                      mood: "Suspenseful",
                    },
                  ],
                  thumbnails: [
                    {
                      id: "t1",
                      visualConcept:
                        "Foto em close-up do colapso da torre com raio dourado cortando a falha estrutural",
                      textOverlay: "1 CHALEIRA DERRUBOU ISTO?",
                      emotionTrigger: "Choque & Curiosidade Extrema",
                      prompt:
                        "High-contrast thumbnail of a collapsing concrete skyscraper with glowing red stress lines along the structural joints, dramatic lighting, 8k, YouTube CTR optimized",
                    },
                  ],
                },
              ],
            },
          ],
        },
        null,
        2
      ),
      "utf8"
    );
  }
}

function getStoreData() {
  ensureStore();
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const data = JSON.parse(raw);
    data.channels = (data.channels || []).map(migrateChannel);
    return data;
  } catch (e) {
    return { channels: [] };
  }
}

function saveStoreData(data) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function findChannel(store, id) {
  return (store.channels || []).find((c) => c.id === id);
}

function touch(channel) {
  channel.lastEditedAt = new Date().toISOString();
}

export function registerGoldPromptRoutes(app, deps) {
  const { WORKSPACE_DIR, getApiKey, callGeminiWithRetry } = deps;

  // GET /api/gold-prompt/states â€” definiÃ§Ãµes do motor de 12 estados
  app.get("/api/gold-prompt/states", (_req, res) => {
    return res.json({
      ok: true,
      states: GOLD_STATES,
      statuses: STATE_STATUSES,
      videoStages: VIDEO_STAGES,
    });
  });

  // GET /api/gold-prompt/channels â€” lista todos os canais
  app.get("/api/gold-prompt/channels", (req, res) => {
    const data = getStoreData();
    return res.json({ ok: true, channels: data.channels || [] });
  });

  // GET /api/gold-prompt/channels/:id â€” detalhe de um canal
  app.get("/api/gold-prompt/channels/:id", (req, res) => {
    const data = getStoreData();
    const channel = findChannel(data, req.params.id);
    if (!channel) {
      return res
        .status(404)
        .json({ ok: false, error: "Canal nÃ£o encontrado." });
    }
    return res.json({ ok: true, channel });
  });

  // PATCH /api/gold-prompt/channels/:id/state â€” define o status de um estado
  app.patch("/api/gold-prompt/channels/:id/state", (req, res) => {
    const { stateId, status } = req.body || {};
    if (!STATE_STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, error: "Status invÃ¡lido." });
    }
    const store = getStoreData();
    const channel = findChannel(store, req.params.id);
    if (!channel)
      return res
        .status(404)
        .json({ ok: false, error: "Canal nÃ£o encontrado." });
    channel.stateProgress[stateId] = status;
    touch(channel);
    saveStoreData(store);
    return res.json({ ok: true, channel });
  });

  // PATCH /api/gold-prompt/channels/:id/field â€” edita um campo de um bloco
  app.patch("/api/gold-prompt/channels/:id/field", (req, res) => {
    const { section, field, value } = req.body || {};
    const store = getStoreData();
    const channel = findChannel(store, req.params.id);
    if (!channel)
      return res
        .status(404)
        .json({ ok: false, error: "Canal nÃ£o encontrado." });
    const blockPath = `${section}.${field}`;
    if (channel.lockedBlocks.includes(blockPath)) {
      return res
        .status(423)
        .json({
          ok: false,
          error: "Campo bloqueado. Desbloqueie antes de editar.",
        });
    }
    if (!channel[section] || typeof channel[section] !== "object")
      channel[section] = {};
    channel[section][field] = value;
    touch(channel);
    saveStoreData(store);
    return res.json({ ok: true, channel });
  });

  // POST /api/gold-prompt/channels/:id/lock â€” bloqueia/desbloqueia um campo
  app.post("/api/gold-prompt/channels/:id/lock", (req, res) => {
    const { path: blockPath, locked } = req.body || {};
    const store = getStoreData();
    const channel = findChannel(store, req.params.id);
    if (!channel)
      return res
        .status(404)
        .json({ ok: false, error: "Canal nÃ£o encontrado." });
    const has = channel.lockedBlocks.includes(blockPath);
    if (locked && !has) channel.lockedBlocks.push(blockPath);
    if (!locked && has)
      channel.lockedBlocks = channel.lockedBlocks.filter(
        (p) => p !== blockPath
      );
    touch(channel);
    saveStoreData(store);
    return res.json({ ok: true, channel });
  });

  // POST /api/gold-prompt/channels/:id/official-name â€” define o nome oficial
  app.post("/api/gold-prompt/channels/:id/official-name", (req, res) => {
    const { name } = req.body || {};
    const store = getStoreData();
    const channel = findChannel(store, req.params.id);
    if (!channel)
      return res
        .status(404)
        .json({ ok: false, error: "Canal nÃ£o encontrado." });
    channel.officialName = name || null;
    if (name) channel.cloneName = name;
    touch(channel);
    saveStoreData(store);
    return res.json({ ok: true, channel });
  });

  // POST /api/gold-prompt/channels/:id/snapshot â€” cria uma versÃ£o
  app.post("/api/gold-prompt/channels/:id/snapshot", (req, res) => {
    const { name } = req.body || {};
    const store = getStoreData();
    const channel = findChannel(store, req.params.id);
    if (!channel)
      return res
        .status(404)
        .json({ ok: false, error: "Canal nÃ£o encontrado." });
    const version = {
      id: `v-${Date.now()}`,
      name: name || `VersÃ£o ${channel.versions.length + 1}`,
      createdAt: new Date().toISOString(),
      snapshot: {
        cloneName: channel.cloneName,
        officialName: channel.officialName,
        branding: channel.branding,
        styleDna: channel.styleDna,
        visualProfile: channel.visualProfile,
        stateProgress: channel.stateProgress,
      },
    };
    channel.versions.unshift(version);
    touch(channel);
    saveStoreData(store);
    return res.json({ ok: true, version, channel });
  });

  // POST /api/gold-prompt/channels/:id/versions/:vid/restore â€” restaura uma versÃ£o
  app.post(
    "/api/gold-prompt/channels/:id/versions/:vid/restore",
    (req, res) => {
      const store = getStoreData();
      const channel = findChannel(store, req.params.id);
      if (!channel)
        return res
          .status(404)
          .json({ ok: false, error: "Canal nÃ£o encontrado." });
      const version = (channel.versions || []).find(
        (v) => v.id === req.params.vid
      );
      if (!version)
        return res
          .status(404)
          .json({ ok: false, error: "VersÃ£o nÃ£o encontrada." });
      const snap = version.snapshot || {};
      channel.cloneName = snap.cloneName ?? channel.cloneName;
      channel.officialName = snap.officialName ?? channel.officialName;
      channel.branding = snap.branding ?? channel.branding;
      channel.styleDna = snap.styleDna ?? channel.styleDna;
      channel.visualProfile = snap.visualProfile ?? channel.visualProfile;
      channel.stateProgress = snap.stateProgress ?? channel.stateProgress;
      touch(channel);
      saveStoreData(store);
      return res.json({ ok: true, channel });
    }
  );

  // POST /api/gold-prompt/channels/:id/regenerate-block â€” regenera um bloco via IA
  app.post(
    "/api/gold-prompt/channels/:id/regenerate-block",
    async (req, res) => {
      const { block } = req.body || {};
      const store = getStoreData();
      const channel = findChannel(store, req.params.id);
      if (!channel)
        return res
          .status(404)
          .json({ ok: false, error: "Canal nÃ£o encontrado." });

      const blockPrompts = {
        branding: `Gere um NOVO Branding Brief para o canal "${channel.cloneName}" (nicho: ${channel.niche}).
Retorne JSON: {"nameVariants":["5 nomes originais"],"descriptions":["desc curta para cabeÃ§alho","desc completa para YouTube"],"logoPrompt":"...","bannerPrompt":"..."}`,
        styleDna: `Gere um NOVO Style DNA para o canal "${channel.cloneName}" (nicho: ${channel.niche}).
Retorne JSON: {"niche":"...","targetAudience":"...","hookStyle":"...","scriptFlow":"...","sentenceRhythm":"...","tone":"...","retentionTechniques":"...","wordsPerSecond":2.4,"targetWordCount":"..."}`,
        visualProfile: `Gere um NOVO Visual Profile para o canal "${channel.cloneName}" (nicho: ${channel.niche}).
Retorne JSON: {"artStyle":"...","colorPalette":"...","lightingStyle":"...","cameraStyle":"..."}`,
      };
      if (!blockPrompts[block]) {
        return res
          .status(400)
          .json({
            ok: false,
            error: "Bloco invÃ¡lido. Use branding, styleDna ou visualProfile.",
          });
      }

      try {
        const apiKey = getApiKey
          ? getApiKey(WORKSPACE_DIR)
          : process.env.GEMINI_API_KEY;
        const lockedNote = channel.lockedBlocks.length
          ? `\nCAMPOS BLOQUEADOS (NÃƒO altere, mantenha exatamente): ${channel.lockedBlocks.join(", ")}`
          : "";
        const llmText = await callGeminiWithRetry(
          apiKey,
          blockPrompts[block] + lockedNote,
          {
            temperature: 0.8,
            maxTokens: 3000,
            activityLabel: `Gold Prompt Â· regenerar ${block}`,
          }
        );
        const parsed = parseJsonLocally(llmText);
        if (!parsed) throw new Error("Resposta invÃ¡lida da IA.");

        const prev = channel[block] || {};
        const merged = { ...prev, ...parsed };
        // preserva campos bloqueados
        channel.lockedBlocks
          .filter((p) => p.startsWith(`${block}.`))
          .forEach((p) => {
            const field = p.split(".")[1];
            if (prev[field] !== undefined) merged[field] = prev[field];
          });
        channel[block] = merged;
        touch(channel);
        saveStoreData(store);
        return res.json({ ok: true, channel });
      } catch (err) {
        console.error(`[GoldPrompt] regenerar ${block}:`, err);
        return res.status(500).json({ ok: false, error: err.message });
      }
    }
  );

  // POST /api/gold-prompt/channels/:id/videos/:vid/fact-check â€” checagem factual via IA
  app.post(
    "/api/gold-prompt/channels/:id/videos/:vid/fact-check",
    async (req, res) => {
      const store = getStoreData();
      const channel = findChannel(store, req.params.id);
      if (!channel)
        return res
          .status(404)
          .json({ ok: false, error: "Canal nÃ£o encontrado." });
      const video = (channel.videos || []).find((v) => v.id === req.params.vid);
      if (!video)
        return res
          .status(404)
          .json({ ok: false, error: "VÃ­deo nÃ£o encontrado." });

      const prompt = `VocÃª Ã© um revisor factual rigoroso para documentÃ¡rios de engenharia.

NARRAÃ‡ÃƒO:
${String(video.narrationScript || "").slice(0, 6000)}

Identifique as afirmaÃ§Ãµes factuais e classifique cada uma. Retorne JSON:
{
  "claims": [
    {"text":"trecho exato","status":"confirmada|provavel|contestada|sem_fonte|interpretacao","note":"explicaÃ§Ã£o curta","confidence":0-100}
  ],
  "riskySentences": ["frases que exigem cautela e o porquÃª"],
  "summary": "parecer geral em 2 frases"
}`;

      try {
        const apiKey = getApiKey
          ? getApiKey(WORKSPACE_DIR)
          : process.env.GEMINI_API_KEY;
        const llmText = await callGeminiWithRetry(apiKey, prompt, {
          temperature: 0.2,
          maxTokens: 3000,
          activityLabel: "Gold Prompt Â· checagem factual",
        });
        const parsed = parseJsonLocally(llmText);
        if (!parsed) throw new Error("Resposta invÃ¡lida da IA.");
        video.factCheck = {
          ...parsed,
          checkedAt: new Date().toISOString(),
        };
        touch(channel);
        saveStoreData(store);
        return res.json({ ok: true, factCheck: video.factCheck, channel });
      } catch (err) {
        console.error("[GoldPrompt] fact-check:", err);
        return res.status(500).json({ ok: false, error: err.message });
      }
    }
  );

  // PATCH /api/gold-prompt/channels/:id/videos/:vid/stage â€” move o vÃ­deo no pipeline
  app.patch("/api/gold-prompt/channels/:id/videos/:vid/stage", (req, res) => {
    const { stage } = req.body || {};
    if (!VIDEO_STAGES.some((s) => s.id === stage)) {
      return res.status(400).json({ ok: false, error: "EstÃ¡gio invÃ¡lido." });
    }
    const store = getStoreData();
    const channel = findChannel(store, req.params.id);
    if (!channel)
      return res
        .status(404)
        .json({ ok: false, error: "Canal nÃ£o encontrado." });
    const video = (channel.videos || []).find((v) => v.id === req.params.vid);
    if (!video)
      return res
        .status(404)
        .json({ ok: false, error: "VÃ­deo nÃ£o encontrado." });
    video.pipelineStage = stage;
    touch(channel);
    saveStoreData(store);
    return res.json({ ok: true, channel });
  });

  // POST /api/gold-prompt/channels/:id/videos â€” gera um novo vÃ­deo para o canal
  app.post("/api/gold-prompt/channels/:id/videos", async (req, res) => {
    const { topic } = req.body || {};
    const store = getStoreData();
    const channel = findChannel(store, req.params.id);
    if (!channel)
      return res
        .status(404)
        .json({ ok: false, error: "Canal nÃ£o encontrado." });

    const prompt = `VocÃª Ã© o roteirista do canal "${channel.cloneName}" (Style DNA: ${channel.styleDna?.hookStyle || "documental"}).

TEMA DO NOVO VÃDEO: ${topic || "escolha um tema forte do nicho " + channel.niche}

Escreva um roteiro recondicionado (8-15 min) e divida em beats. Retorne JSON:
{
  "title":"tÃ­tulo impactante",
  "duration":"10:00 min",
  "wordCount":2100,
  "narrationScript":"roteiro completo humanizado...",
  "beats":[{"id":"b1","scriptSegment":"...","imagePrompt":"...","videoPrompt":"...","cameraAngle":"...","lighting":"...","mood":"..."}],
  "thumbnails":[{"id":"t1","visualConcept":"...","textOverlay":"...","emotionTrigger":"...","prompt":"..."}]
}`;

    try {
      const apiKey = getApiKey
        ? getApiKey(WORKSPACE_DIR)
        : process.env.GEMINI_API_KEY;
      const llmText = await callGeminiWithRetry(apiKey, prompt, {
        temperature: 0.7,
        maxTokens: 8000,
        activityLabel: "Gold Prompt Â· novo vÃ­deo",
      });
      const parsed = parseJsonLocally(llmText);
      if (!parsed || !parsed.title)
        throw new Error("Resposta invÃ¡lida da IA.");
      const newVideo = {
        ...parsed,
        id: `video-${Date.now()}`,
        pipelineStage: "roteiro",
        factCheck: null,
      };
      channel.videos.push(newVideo);
      touch(channel);
      saveStoreData(store);
      return res.json({ ok: true, video: newVideo, channel });
    } catch (err) {
      console.error("[GoldPrompt] novo vÃ­deo:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/gold-prompt/clone â€” executa o workflow e salva o canal
  app.post("/api/gold-prompt/clone", async (req, res) => {
    const { sourceChannel, transcripts, topic, transformationLevel } = req.body;
    if (!sourceChannel) {
      return res
        .status(400)
        .json({
          ok: false,
          error: "Informe o nome ou URL do canal de referÃªncia.",
        });
    }

    const transformNote =
      transformationLevel === "conservador"
        ? "Mantenha a estrutura bem prÃ³xima do original (transformaÃ§Ã£o leve)."
        : transformationLevel === "original"
          ? "Seja ALTAMENTE original: reinvente nomes, Ã¢ngulos e estrutura, mantendo apenas a essÃªncia estratÃ©gica."
          : "Equilibre fidelidade estratÃ©gica com originalidade (recomendado).";

    const prompt = `VocÃª Ã© o executivo de IA THE GOLDEN PROMPT para anÃ¡lise e recondicionamento de conteÃºdo do YouTube.
${transformNote}
IMPORTANTE: identifique padrÃµes estratÃ©gicos, mas NÃƒO copie nomes, frases, roteiros, identidade visual ou elementos protegidos do canal de origem.

ENTRADAS DO USUÃRIO:
- Canal de ReferÃªncia: ${sourceChannel}
- TranscriÃ§Ãµes fornecidas: ${String(transcripts || "Estudo do nicho e ritmo do canal").slice(0, 3000)}
- Tema/TÃ³pico para o VÃ­deo Recondicionado: ${topic || "Desastre de Engenharia HistÃ³rico ou InvenÃ§Ã£o Oculta"}

SUA TAREFA â€” execute o workflow de 12 Estados:
1. Branding Brief: 5 variaÃ§Ãµes de nomes ORIGINAIS, 2 descriÃ§Ãµes (curta p/ cabeÃ§alho + completa p/ YouTube), prompt de Logo e de Banner.
2. Style DNA: nicho, pÃºblico, hook style, fluxo, ritmo, tom, gatilhos de retenÃ§Ã£o, palavras/segundo, contagem alvo.
3. Visual Profile: estilo de arte, paleta, iluminaÃ§Ã£o, cÃ¢mera.
4. Roteiro Recondicionado (8-15 min) humanizado (Ã³timo para 11Labs).
5. Beats de Imagem/VÃ­deo (3-5s por beat).
6. Thumbnails: 5 conceitos.

Responda EXCLUSIVAMENTE em JSON:
{
  "cloneName": "Nome Original do Canal",
  "niche": "Nicho",
  "branding": {"nameVariants":["..."],"descriptions":["curta","completa"],"logoPrompt":"...","bannerPrompt":"..."},
  "styleDna": {"niche":"...","targetAudience":"...","hookStyle":"...","scriptFlow":"...","sentenceRhythm":"...","tone":"...","retentionTechniques":"...","wordsPerSecond":2.4,"targetWordCount":"..."},
  "visualProfile": {"artStyle":"...","colorPalette":"...","lightingStyle":"...","cameraStyle":"..."},
  "video": {"title":"...","duration":"10:00 min","wordCount":2100,"narrationScript":"...","beats":[{"id":"b1","scriptSegment":"...","imagePrompt":"...","videoPrompt":"...","cameraAngle":"...","lighting":"...","mood":"..."}],"thumbnails":[{"id":"t1","visualConcept":"...","textOverlay":"...","emotionTrigger":"...","prompt":"..."}]}
}`;

    try {
      const apiKey = getApiKey
        ? getApiKey(WORKSPACE_DIR)
        : process.env.GEMINI_API_KEY;
      const llmText = await callGeminiWithRetry(apiKey, prompt, {
        temperature: 0.7,
        maxTokens: 8000,
        activityLabel: "Gold Prompt Â· analisar canal de referÃªncia",
      });

      if (!llmText) throw new Error("Falha ao receber resposta do modelo LLM.");

      const parsed = parseJsonLocally(llmText);
      if (!parsed || !parsed.cloneName) {
        throw new Error("Resposta invÃ¡lida da IA ao estruturar o canal.");
      }

      const store = getStoreData();
      const newChannel = migrateChannel({
        id: `channel-${Date.now()}`,
        sourceChannel: sourceChannel.trim(),
        cloneName: parsed.cloneName || sourceChannel,
        niche: parsed.niche || "ConteÃºdo do YouTube",
        createdAt: new Date().toISOString(),
        transformationLevel: transformationLevel || "equilibrado",
        similarityScore:
          transformationLevel === "conservador"
            ? 62
            : transformationLevel === "original"
              ? 18
              : 34,
        branding: parsed.branding || {},
        styleDna: parsed.styleDna || {},
        visualProfile: parsed.visualProfile || {},
        videos: parsed.video
          ? [
              {
                ...parsed.video,
                id: `video-${Date.now()}`,
                pipelineStage: "roteiro",
                factCheck: null,
              },
            ]
          : [],
        stateProgress: defaultStateProgress(),
      });

      store.channels.unshift(newChannel);
      saveStoreData(store);

      return res.json({ ok: true, channel: newChannel });
    } catch (err) {
      console.error("[GoldPrompt] Erro na anÃ¡lise:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // DELETE /api/gold-prompt/channels/:id â€” exclui um canal
  app.delete("/api/gold-prompt/channels/:id", (req, res) => {
    const store = getStoreData();
    store.channels = (store.channels || []).filter(
      (c) => c.id !== req.params.id
    );
    saveStoreData(store);
    return res.json({ ok: true });
  });
}
