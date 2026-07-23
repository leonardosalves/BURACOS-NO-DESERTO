import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseJsonLocally } from "./aiJsonParse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "gold_prompt_channels.json");

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
              cloneName: "Engenharia & Mistérios",
              niche: "Engenharia & Ciência Documental",
              createdAt: new Date().toISOString(),
              branding: {
                nameVariants: [
                  "Mistérios da Engenharia",
                  "Vértice Documental",
                  "Crônicas do Espaço-Tempo",
                  "Arquivos do Progresso",
                  "Vórtex Científico",
                ],
                descriptions: [
                  "Documentários visuais profundos sobre as maiores obras, desastres e triunfos da engenharia humana.",
                  "Explorando a física, a história e a engenharia por trás das estruturas mais inacreditáveis do planeta.",
                ],
                logoPrompt:
                  "Ultra-detailed minimalist emblem of a glowing mechanical gear intertwined with an ancient hourglass, 8k resolution, cinematic dark background, gold and dark cyan accents",
                bannerPrompt:
                  "Wide panoramic 16:9 cinematic illustration of monumental mega-structures emerging from dark clouds, neon gold geometry lines, photorealistic, 8k",
              },
              styleDna: {
                niche: "Engenharia & Mistérios Históricos",
                targetAudience:
                  "Curiosos de tecnologia, física e arquitetura (18-45 anos)",
                hookStyle:
                  "Pergunta chocante de 1.5s sobre desastre eminente + revelação em 5s",
                scriptFlow:
                  "Hook -> Mistério -> Causa Oculta -> Clímax -> Lição Técnica",
                sentenceRhythm:
                  "Frases curtas, diretas, pausadas para efeito dramático",
                tone: "Autoritário, intrigante, hiper-focado",
                retentionTechniques:
                  "Curiosity gap a cada 45 segundos, pergunta aberta antes de cada bloco",
                wordsPerSecond: 2.4,
                targetWordCount: "1800 - 2400 palavras (8 a 12 minutos)",
              },
              visualProfile: {
                artStyle: "Cinematográfico documental hiper-realista 16mm",
                colorPalette:
                  "Tons escuros, dourado vintage, azul profundo e âmbar",
                lightingStyle:
                  "Iluminação dramática com contraste chiaroscuro e névoa volumétrica",
                cameraStyle:
                  "Lentes anamórficas 35mm, travelling lento e close-ups técnicos",
              },
              videos: [
                {
                  id: "video-1",
                  title:
                    "A Falha Invisível que Derrubou a Torre Ronan Point em 1968",
                  duration: "9:30 min",
                  wordCount: 1950,
                  narrationScript:
                    "Tudo começou em 16 de maio de 1968, no décimo oitavo andar de uma torre em Londres. Uma simples chaleira a gás causou um vazamento imperceptível. Mas o verdadeiro desastre não foi o fogo — foi a própria estrutura do prédio.",
                  beats: [
                    {
                      id: "b1",
                      scriptSegment:
                        "Tudo começou em 16 de maio de 1968, no décimo oitavo andar de uma torre em Londres.",
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
                        "Uma simples chaleira a gás causou um vazamento imperceptível. Mas o verdadeiro desastre não foi o fogo.",
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
    return JSON.parse(raw);
  } catch (e) {
    return { channels: [] };
  }
}

function saveStoreData(data) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function registerGoldPromptRoutes(app, deps) {
  const { WORKSPACE_DIR, getApiKey, callGeminiWithRetry } = deps;

  // GET /api/gold-prompt/channels — List all saved cloned channels
  app.get("/api/gold-prompt/channels", (req, res) => {
    const data = getStoreData();
    return res.json({ ok: true, channels: data.channels || [] });
  });

  // GET /api/gold-prompt/channels/:id — Get details of a single cloned channel
  app.get("/api/gold-prompt/channels/:id", (req, res) => {
    const data = getStoreData();
    const channel = (data.channels || []).find((c) => c.id === req.params.id);
    if (!channel) {
      return res
        .status(404)
        .json({ ok: false, error: "Canal clonado não encontrado." });
    }
    return res.json({ ok: true, channel });
  });

  // POST /api/gold-prompt/clone — Run THE GOLDEN PROMPT workflow & save cloned channel
  app.post("/api/gold-prompt/clone", async (req, res) => {
    const { sourceChannel, transcripts, topic } = req.body;
    if (!sourceChannel) {
      return res
        .status(400)
        .json({
          ok: false,
          error: "Informe o nome ou URL do canal de origem.",
        });
    }

    const prompt = `Você é o executivo de IA THE GOLDEN PROMPT para clonagem e recondicionamento de conteúdo do YouTube.

ENTRADAS DO USUÁRIO:
- Canal a Clonar: ${sourceChannel}
- Transcrições fornecidas: ${String(transcripts || "Estudo do nicho e ritmo do canal").slice(0, 3000)}
- Tema/Tópico para o Vídeo Recondicionado: ${topic || "Desastre de Engenharia Histórico ou Invenção Oculta"}

SUA TAREFA:
Execute rigorosamente o workflow de 12 Estados do THE GOLDEN PROMPT:
1. **Branding Brief**: 5 variações de nomes de canal clone (originais, não cópias exatas), 2 descrições curtas no tom do canal, 1 prompt de Logo e 1 prompt de Banner.
2. **Style DNA**: Nicho, público, hook style, ritmo, tom, gatilhos de retenção, palavras/segundo, contagem de palavras (alvo 8 a 15 minutos = 1800 a 2600 palavras).
3. **Visual Profile**: Estilo de arte, paleta de cores, iluminação e câmera.
4. **Roteiro Recondicionado (8-15 min)**: Escreva um roteiro humanizado (ótimo para 11Labs, sem tom de IA, palavras-chave do nicho e travessões longos).
5. **Beats de Imagem e Vídeo (3 a 5 seg por beat, max 3 frases)**: Divida o roteiro em beats. Para cada beat, gere o Prompt de Imagem Standalone completo (com assunto, ambiente, iluminação, estilo) e Prompt de Vídeo.
6. **Thumbnails**: 5 conceitos de thumbnail com texto na capa, gatilho emocional e prompt visual.

Responda EXCLUSIVAMENTE em formato JSON com esta estrutura:
{
  "cloneName": "Nome do Canal Adaptado",
  "niche": "Nicho do Canal",
  "branding": {
    "nameVariants": ["Nome 1", "Nome 2", "Nome 3", "Nome 4", "Nome 5"],
    "descriptions": ["Descrição 1", "Descrição 2"],
    "logoPrompt": "Prompt para Logo...",
    "bannerPrompt": "Prompt para Banner..."
  },
  "styleDna": {
    "niche": "nicho",
    "targetAudience": "público",
    "hookStyle": "estilo de gancho",
    "scriptFlow": "fluxo do roteiro",
    "sentenceRhythm": "ritmo",
    "tone": "tom",
    "retentionTechniques": "técnicas",
    "wordsPerSecond": 2.4,
    "targetWordCount": "1800-2400 palavras (8-12 min)"
  },
  "visualProfile": {
    "artStyle": "estilo de arte",
    "colorPalette": "paleta",
    "lightingStyle": "iluminação",
    "cameraStyle": "câmera"
  },
  "video": {
    "title": "Título Recondicionado Impactante",
    "duration": "10:00 min",
    "wordCount": 2100,
    "narrationScript": "Texto completo do roteiro...",
    "beats": [
      {
        "id": "b1",
        "scriptSegment": "Trecho da narração...",
        "imagePrompt": "Prompt de imagem standalone...",
        "videoPrompt": "Prompt de vídeo...",
        "cameraAngle": "Ângulo",
        "lighting": "Iluminação",
        "mood": "Clima"
      }
    ],
    "thumbnails": [
      {
        "id": "t1",
        "visualConcept": "Conceito...",
        "textOverlay": "TEXTO DA THUMB",
        "emotionTrigger": "Gatilho...",
        "prompt": "Prompt visual..."
      }
    ]
  }
}`;

    try {
      const apiKey = getApiKey
        ? getApiKey(WORKSPACE_DIR)
        : process.env.GEMINI_API_KEY;
      const llmText = await callGeminiWithRetry(apiKey, prompt, {
        temperature: 0.7,
        maxTokens: 8000,
      });

      if (!llmText) {
        throw new Error("Falha ao receber resposta do modelo LLM.");
      }

      const parsed = parseJsonLocally(llmText);
      if (!parsed || !parsed.cloneName) {
        throw new Error("Resposta inválida da IA ao estruturar o canal.");
      }

      const store = getStoreData();
      const newChannel = {
        id: `channel-${Date.now()}`,
        sourceChannel: sourceChannel.trim(),
        cloneName: parsed.cloneName || sourceChannel,
        niche: parsed.niche || "Conteúdo do YouTube",
        createdAt: new Date().toISOString(),
        branding: parsed.branding || {},
        styleDna: parsed.styleDna || {},
        visualProfile: parsed.visualProfile || {},
        videos: parsed.video
          ? [{ ...parsed.video, id: `video-${Date.now()}` }]
          : [],
      };

      store.channels.unshift(newChannel);
      saveStoreData(store);

      return res.json({ ok: true, channel: newChannel });
    } catch (err) {
      console.error("[GoldPrompt] Erro na clonagem:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // DELETE /api/gold-prompt/channels/:id — Delete a cloned channel
  app.delete("/api/gold-prompt/channels/:id", (req, res) => {
    const store = getStoreData();
    store.channels = (store.channels || []).filter(
      (c) => c.id !== req.params.id
    );
    saveStoreData(store);
    return res.json({ ok: true });
  });
}
