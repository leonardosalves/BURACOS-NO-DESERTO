/**
 * VideoAgent → Lumiera (adaptação leve)
 * Inspirado em HKUDS/VideoAgent: intent analysis, agent graph, storyboard beats.
 * Mapeia para ações reais do Lumiera (sem CosyVoice/ImageBind local).
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { parseAiJson } from "./aiJsonParse.js";
import { appendDailyRunLog, ensureAgentDirs, getAgentPaths } from "./agentMemory.js";
import { repairVaultGraphLinks } from "./obsidianVault.js";

const MEMORY_FILE = "videoagent-lumiera.md";

/** Intents VideoAgent adaptados → nós Lumiera */
export const LUMIERA_INTENT_MAP = {
  "Short viral": ["creator_ideas", "creator_narration", "creator_script", "overlay_plan", "render_short", "youtube_metadata", "upload_youtube"],
  "Vídeo longo documental": ["creator_ideas", "notebooklm_enrich", "creator_script", "overlay_plan", "render_long", "youtube_metadata", "upload_youtube"],
  "Overview / resumo (estilo NotebookLM)": ["notebooklm_enrich", "creator_script", "overlay_plan", "youtube_metadata"],
  "Comentário / narração": ["creator_narration", "creator_script", "overlay_plan", "beat_sync", "render_short"],
  "Edição ritmada (beat-sync)": ["beat_sync", "overlay_plan", "render_short"],
  "Pesquisa concorrentes": ["competitor_research", "editorial_queue", "creator_script"],
  "SEO e publicação": ["youtube_metadata", "thumbnail_ab", "schedule_heatmap", "upload_youtube"],
  "Diagnóstico pós-upload": ["retention_cliff", "top_winners", "editorial_queue"],
  "Q&A / entender vídeo": ["notebooklm_enrich", "retention_cliff"],
};

export const LUMIERA_AGENT_REGISTRY = {
  creator_ideas: {
    node: "CreatorIdeas",
    label: "Creator — ideias",
    tab: "creator",
    description: "Brainstorm e ranking de ideias (viral-short-form-ideas).",
    inputs: ["niche", "format"],
    outputs: ["ideas_ranking"],
  },
  creator_narration: {
    node: "CreatorNarration",
    label: "Creator — narração",
    tab: "creator",
    description: "Gera narração UGC; revisão humana antes do roteiro completo.",
    inputs: ["title", "hook", "project"],
    outputs: ["narration_draft"],
  },
  creator_script: {
    node: "CreatorScript",
    label: "Creator — roteiro + cenas",
    tab: "creator",
    description: "Roteiro completo com visual_prompts e blocos.",
    inputs: ["narration_draft", "project"],
    outputs: ["storyboard"],
  },
  notebooklm_enrich: {
    node: "NotebookLMEnrich",
    label: "NotebookLM — pesquisa",
    tab: "creator",
    description: "Enriquece fatos e ângulos via NotebookLM.",
    inputs: ["topic"],
    outputs: ["research_context"],
  },
  overlay_plan: {
    node: "OverlayPlan",
    label: "Overlays / HyperFrames",
    tab: "editor",
    description: "Planeja overlays Remotion/HyperFrames antes do render.",
    inputs: ["storyboard"],
    outputs: ["overlays_json"],
  },
  beat_sync: {
    node: "BeatSync",
    label: "Sincronizar beats",
    tab: "workflow",
    description: "Alinha cortes e legendas ao áudio (pattern interrupt 8–12s em Shorts).",
    inputs: ["storyboard", "narration_audio"],
    outputs: ["timeline"],
  },
  render_short: {
    node: "RenderShort",
    label: "Render Short 9:16",
    tab: "terminal",
    description: "Render Remotion/HyperFrames para Shorts.",
    inputs: ["timeline", "overlays_json"],
    outputs: ["mp4"],
  },
  render_long: {
    node: "RenderLong",
    label: "Render longo 16:9",
    tab: "terminal",
    description: "Render vídeo longo com BGM por bloco.",
    inputs: ["timeline", "overlays_json"],
    outputs: ["mp4"],
  },
  youtube_metadata: {
    node: "YoutubeMetadata",
    label: "Metadados YouTube",
    tab: "ai",
    description: "Títulos A/B, descrição, tags, comentário fixo.",
    inputs: ["storyboard"],
    outputs: ["metadata_md"],
  },
  thumbnail_ab: {
    node: "ThumbnailAB",
    label: "Thumbnail A/B/C",
    tab: "upload",
    description: "Variantes de capa com texto overlay.",
    inputs: ["metadata_md"],
    outputs: ["thumbnails"],
  },
  schedule_heatmap: {
    node: "ScheduleHeatmap",
    label: "Agendar (heatmap)",
    tab: "upload",
    description: "Define publish_at pelo melhor horário do canal.",
    inputs: ["metadata_md"],
    outputs: ["publish_at"],
  },
  upload_youtube: {
    node: "UploadYoutube",
    label: "Upload YouTube",
    tab: "upload",
    description: "Publica ou agenda o vídeo.",
    inputs: ["mp4", "metadata_md", "publish_at"],
    outputs: ["video_id"],
  },
  competitor_research: {
    node: "CompetitorResearch",
    label: "Pesquisa concorrentes",
    tab: "youtube-studio",
    description: "Outliers, fichas Obsidian, ideias derivadas.",
    inputs: ["niche"],
    outputs: ["derived_ideas"],
  },
  editorial_queue: {
    node: "EditorialQueue",
    label: "Fila editorial",
    tab: "youtube-studio",
    description: "Inbox → roteiro → render → publicado.",
    inputs: ["derived_ideas"],
    outputs: ["queue_item"],
  },
  top_winners: {
    node: "TopWinners",
    label: "Replicar top 3",
    tab: "youtube-studio",
    description: "Variações baseadas nos vídeos que mais performaram.",
    inputs: ["niche"],
    outputs: ["winner_variations"],
  },
  retention_cliff: {
    node: "RetentionCliff",
    label: "Penhasco retenção",
    tab: "youtube-studio",
    description: "Analisa queda de retenção no vídeo publicado.",
    inputs: ["video_id"],
    outputs: ["cliff_report"],
  },
};

const INTENT_KEYWORDS = [
  { intent: "Short viral", re: /short|shorts|9:16|viral|tiktok|reels|listicle|gancho/i },
  { intent: "Vídeo longo documental", re: /longo|long-form|16:9|document[aá]rio|capítulos|20\s*min/i },
  { intent: "Overview / resumo (estilo NotebookLM)", re: /overview|resumo|podcast|notebooklm|explicar o vídeo/i },
  { intent: "Comentário / narração", re: /coment[aá]rio|narra[cç][aã]o|voiceover|ugc|falar sobre/i },
  { intent: "Edição ritmada (beat-sync)", re: /beat|ritmo|sync|música|montagem|cortes? rápidos/i },
  { intent: "Pesquisa concorrentes", re: /concorrente|outlier|competitor|minera[cç][aã]o|pesquisa de canal/i },
  { intent: "SEO e publicação", re: /seo|metadados|thumbnail|capa|publicar|upload|agendar/i },
  { intent: "Diagnóstico pós-upload", re: /reten[cç][aã]o|analytics|performance|views|caiu|diagn[oó]stico/i },
  { intent: "Q&A / entender vídeo", re: /pergunt|q&a|qa|entender|analisar vídeo/i },
];

function detectIntentsRuleBased(requirement) {
  const text = String(requirement || "");
  const matched = INTENT_KEYWORDS.filter((row) => row.re.test(text)).map((r) => r.intent);
  if (!matched.length) {
    return ["Short viral"];
  }
  return [...new Set(matched)];
}

function toolsFromIntents(intentList) {
  const nodes = new Set();
  for (const intent of intentList) {
    for (const tool of LUMIERA_INTENT_MAP[intent] || []) {
      nodes.add(tool);
    }
  }
  return [...nodes];
}

function buildAgentGraph(chain) {
  return chain.map((key, idx) => {
    const meta = LUMIERA_AGENT_REGISTRY[key];
    const next = chain[idx + 1];
    const outputs = meta.outputs.map((name) => ({
      name,
      description: `Saída de ${meta.node}`,
      links: next ? [{ [LUMIERA_AGENT_REGISTRY[next].node]: LUMIERA_AGENT_REGISTRY[next].inputs[0] || name }] : [],
    }));
    return {
      node: meta.node,
      lumieraKey: key,
      label: meta.label,
      tab: meta.tab,
      inputs: meta.inputs.map((name) => ({ name, description: `Entrada ${name}` })),
      outputs,
    };
  });
}

function buildLumieraActions(chain) {
  return chain.map((key, i) => {
    const meta = LUMIERA_AGENT_REGISTRY[key];
    return {
      step: i + 1,
      action: key,
      node: meta.node,
      label: meta.label,
      tab: meta.tab,
      description: meta.description,
    };
  });
}

function buildStoryboardBeatsFallback(requirement, format = "SHORTS") {
  const isShort = format === "SHORTS" || /short/i.test(requirement);
  const blocks = isShort ? 5 : 8;
  const beats = [];
  for (let i = 0; i < blocks; i += 1) {
    beats.push({
      beat: i + 1,
      visualQuery: i === 0
        ? "Gancho visual — rosto/objeto + texto ≤8 palavras"
        : i === blocks - 1
          ? "CTA — pergunta específica ou parte 2"
          : `Pattern interrupt ~${8 + i * 2}s — fato visual concreto`,
      narrationHint: i === 0 ? "Primeira frase paga a promessa do título" : "Transição com open loop",
    });
  }
  return beats;
}

function buildUserInputs(chain, requirement) {
  const inputs = [];
  if (chain.includes("creator_narration") || chain.includes("creator_script")) {
    inputs.push({
      node: "video_title",
      description: "Título / ideia do vídeo",
      links: [{ CreatorNarration: "title" }, { CreatorScript: "title" }],
      suggested: requirement.slice(0, 120),
    });
  }
  if (chain.includes("competitor_research")) {
    inputs.push({
      node: "niche",
      description: "Nicho para pesquisa",
      links: [{ CompetitorResearch: "niche" }],
    });
  }
  return inputs;
}

function orderChain(tools) {
  const priority = Object.keys(LUMIERA_AGENT_REGISTRY);
  return [...tools].sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
}

function parsePlannerLlmJson(text, fallback) {
  try {
    const parsed = parseAiJson(text);
    if (parsed && (parsed.agentChain || parsed.lumieraActions)) return parsed;
  } catch { /* ignore */ }
  return fallback;
}

export function planVideoAgentLocally(requirement, { format = "SHORTS", niche = "" } = {}) {
  const explicit = detectIntentsRuleBased(requirement);
  const implicit = [];
  if (/fato|hist[oó]ria|engenharia|curiosidade/i.test(requirement) && !explicit.includes("NotebookLM")) {
    implicit.push("Enriquecer com fatos (NotebookLM)");
  }
  if (/thumb|capa|ctr/i.test(requirement) && !explicit.some((i) => i.includes("SEO"))) {
    implicit.push("Otimizar packaging (thumbnail + título)");
  }

  const tools = orderChain(toolsFromIntents(explicit));
  const agentChain = tools.map((t) => LUMIERA_AGENT_REGISTRY[t].node);
  const agentGraph = buildAgentGraph(tools);
  const lumieraActions = buildLumieraActions(tools);

  return {
    id: randomUUID(),
    feasibility: tools.length ? "Feasible" : "Infeasible",
    requirement: String(requirement || "").trim(),
    format,
    niche,
    intents: { explicit, implicit },
    agentGraph,
    agentChain,
    userInputs: buildUserInputs(tools, requirement),
    storyboardBeats: buildStoryboardBeatsFallback(requirement, format),
    lumieraActions,
    reasoning: tools.length
      ? `Plano Lumiera com ${tools.length} etapas derivadas dos intents VideoAgent: ${explicit.join(", ")}.`
      : "Nenhum intent reconhecido — refine o pedido.",
    source: "videoagent-lumiera-local",
    reflectionRounds: 0,
    createdAt: new Date().toISOString(),
  };
}

export async function planVideoAgentWithLlm(requirement, { format = "SHORTS", niche = "", llmFn = null } = {}) {
  const local = planVideoAgentLocally(requirement, { format, niche });
  if (!llmFn) return local;

  const registrySummary = Object.entries(LUMIERA_AGENT_REGISTRY)
    .map(([k, v]) => `${k}: ${v.description}`)
    .join("\n");

  const prompt = `Você adapta o framework VideoAgent (HKUDS) para o pipeline Lumiera.

Pedido do usuário (PT-BR):
${requirement}

Formato: ${format}
Nicho: ${niche || "Geral"}

Intents candidatos VideoAgent→Lumiera:
${Object.keys(LUMIERA_INTENT_MAP).join(", ")}

Agentes Lumiera disponíveis:
${registrySummary}

Tarefa:
1. Liste intents explícitos e implícitos
2. Monte agentChain usando APENAS chaves do registry (creator_ideas, creator_script, etc.)
3. Gere 5-8 storyboardBeats (visualQuery + narrationHint) estilo Storyboard Agent do VideoAgent
4. reasoning < 200 palavras

JSON puro:
{
  "feasibility": "Feasible" ou "Infeasible",
  "intents": {"explicit": [], "implicit": []},
  "agentChainKeys": ["creator_narration", "..."],
  "storyboardBeats": [{"beat": 1, "visualQuery": "", "narrationHint": ""}],
  "reasoning": ""
}`;

  try {
    const text = await llmFn(prompt);
    const parsed = parsePlannerLlmJson(text, null);
    if (!parsed?.agentChainKeys?.length) return { ...local, aiEnhanced: false };

    const tools = orderChain(parsed.agentChainKeys.filter((k) => LUMIERA_AGENT_REGISTRY[k]));
    if (!tools.length) return { ...local, aiEnhanced: false };

    return {
      ...local,
      feasibility: parsed.feasibility || "Feasible",
      intents: parsed.intents || local.intents,
      agentGraph: buildAgentGraph(tools),
      agentChain: tools.map((t) => LUMIERA_AGENT_REGISTRY[t].node),
      lumieraActions: buildLumieraActions(tools),
      storyboardBeats: parsed.storyboardBeats?.length ? parsed.storyboardBeats : local.storyboardBeats,
      reasoning: parsed.reasoning || local.reasoning,
      source: "videoagent-lumiera-llm",
      aiEnhanced: true,
      reflectionRounds: 1,
    };
  } catch (err) {
    console.warn("[VideoAgentPlanner] LLM falhou:", err.message);
    return { ...local, aiEnhanced: false, llmError: err.message };
  }
}

export function appendPlanToObsidian(workspaceDir, plan) {
  ensureAgentDirs(workspaceDir);
  const memoryPath = path.join(getAgentPaths(workspaceDir).memoryDir, MEMORY_FILE);
  let content = fs.existsSync(memoryPath)
    ? fs.readFileSync(memoryPath, "utf8")
    : `# VideoAgent → Lumiera\n\n> 🔗 [[MEMORIA-LUMIERA]] · [[skills/studio-agents-hermes]]\n\n`;

  const marker = "## Planos gerados (VideoAgent)";
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const block = [
    `### ${stamp} — ${plan.requirement.slice(0, 80)}${plan.requirement.length > 80 ? "…" : ""}`,
    `- **Feasibility:** ${plan.feasibility}`,
    `- **Intents:** ${(plan.intents?.explicit || []).join(", ")}`,
    `- **Implícitos:** ${(plan.intents?.implicit || []).join(", ") || "—"}`,
    `- **Chain:** ${(plan.lumieraActions || []).map((a) => a.label).join(" → ")}`,
    `- **Reasoning:** ${plan.reasoning}`,
    "",
    "#### Storyboard beats",
    ...(plan.storyboardBeats || []).map((b) => `- Beat ${b.beat}: ${b.visualQuery} · _${b.narrationHint}_`),
    "",
  ].join("\n");

  if (!content.includes(marker)) {
    content = `${content.trimEnd()}\n\n${marker}\n\n${block}`;
  } else {
    content = content.replace(marker, `${marker}\n\n${block}`);
  }

  fs.writeFileSync(memoryPath, content, "utf8");
  repairVaultGraphLinks(workspaceDir);
  appendDailyRunLog(
    workspaceDir,
    `- ${new Date().toISOString()} **videoagent-plan** intents=${(plan.intents?.explicit || []).length} steps=${plan.lumieraActions?.length || 0}`,
  );

  return { memoryPath, memoryFile: MEMORY_FILE };
}