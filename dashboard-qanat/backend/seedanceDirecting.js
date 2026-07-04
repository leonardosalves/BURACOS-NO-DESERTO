/**
 * Seedance Directing — Fase 1 Lumiera
 * Direção dramática por cena ANTES do visual_prompt (princípio: "direct the model, don't micro-manage the frame").
 * Inspirado no Skill OS seedance-2.0 (Emily2040).
 */

import { detectNicheFromContent } from "./scriptQuality.js";

export const SEEDANCE_REF_SLOTS = [
  { id: "identity", label: "Identidade", hint: "@Image1 — rosto, personagem, objeto âncora" },
  { id: "motion", label: "Movimento", hint: "@Video1 — gesto, walk cycle, ação de referência" },
  { id: "camera", label: "Câmera", hint: "@Video2 — movimento de câmera desejado" },
  { id: "audio", label: "Áudio", hint: "@Audio1 — ritmo, tom, ambiência sonora" },
  { id: "style", label: "Estilo", hint: "@Image2 — paleta, grading, look cinematográfico" },
  { id: "environment", label: "Ambiente", hint: "@Image3 — cenário, época, clima" },
  { id: "first_frame", label: "Primeiro frame", hint: "Composição de abertura (@Image4)" },
  { id: "last_frame", label: "Último frame", hint: "Composição de fechamento (@Image5)" },
];

export const DIRECTING_BRIEF_FIELDS = [
  { id: "dramatic_function", label: "Função dramática", hint: "Turno, POV, poder, subtexto da cena" },
  { id: "camera_intent", label: "Intenção de câmera", hint: "Push-in, orbit, handheld, static hero" },
  { id: "lighting_intent", label: "Iluminação", hint: "Golden hour, chiaroscuro, neon, flat doc" },
  { id: "performance_intent", label: "Performance", hint: "Expressão, gesto, ritmo de ação" },
  { id: "sound_intent", label: "Som", hint: "Silêncio tenso, SFX punch, ambiente urbano" },
];

const EMPTY_DIRECTING_BRIEF = () => ({
  dramatic_function: "",
  camera_intent: "",
  lighting_intent: "",
  performance_intent: "",
  sound_intent: "",
});

const EMPTY_SEEDANCE_REFS = () =>
  Object.fromEntries(SEEDANCE_REF_SLOTS.map((s) => [s.id, ""]));

export function normalizeDirectingBrief(raw = {}) {
  const base = EMPTY_DIRECTING_BRIEF();
  for (const f of DIRECTING_BRIEF_FIELDS) {
    const v = raw[f.id];
    if (typeof v === "string" && v.trim()) base[f.id] = v.trim();
  }
  return base;
}

export function normalizeSeedanceRefs(raw = {}) {
  const base = EMPTY_SEEDANCE_REFS();
  for (const s of SEEDANCE_REF_SLOTS) {
    const v = raw[s.id];
    if (typeof v === "string" && v.trim()) base[s.id] = v.trim();
  }
  return base;
}

export function normalizeSceneDirecting(vp = {}) {
  return {
    ...vp,
    directing_brief: normalizeDirectingBrief(vp.directing_brief),
    seedance_refs: normalizeSeedanceRefs(vp.seedance_refs),
  };
}

export function normalizeStoryboardDirecting(storyboard = {}) {
  if (!Array.isArray(storyboard.visual_prompts)) return storyboard;
  return {
    ...storyboard,
    visual_prompts: storyboard.visual_prompts.map(normalizeSceneDirecting),
  };
}

export function mergeDirectingIntoVisualPrompts(existing = [], incoming = []) {
  if (!Array.isArray(incoming) || incoming.length === 0) return existing;
  const byScene = new Map(
    incoming.map((vp) => [String(vp.scene ?? "").trim(), vp]).filter(([k]) => k),
  );
  const byIndex = [...incoming];

  return (existing || []).map((vp, idx) => {
    const sceneKey = String(vp.scene ?? "").trim();
    const patch = (sceneKey && byScene.get(sceneKey)) || byIndex[idx];
    if (!patch) return normalizeSceneDirecting(vp);

    return normalizeSceneDirecting({
      ...vp,
      directing_brief: {
        ...normalizeDirectingBrief(vp.directing_brief),
        ...normalizeDirectingBrief(patch.directing_brief),
      },
      seedance_refs: {
        ...normalizeSeedanceRefs(vp.seedance_refs),
        ...normalizeSeedanceRefs(patch.seedance_refs),
      },
    });
  });
}

export function buildSeedanceDirectingSystemPrompt({ niche = "geral", format = "SHORTS" } = {}) {
  const aspect = format === "SHORTS" ? "9:16 vertical" : "16:9 widescreen";
  return `Você é um Diretor de Cinema sênior preparando briefs de direção para geração de vídeo IA (Seedance / LTX / T2V).

PRINCÍPIO CENTRAL (Seedance): "Direct the model — don't micro-manage the frame."
- Defina INTENÇÃO dramática, câmera, luz, performance e som — NÃO descreva pixels frame a frame.
- O visual_prompt virá DEPOIS; aqui você pensa como diretor, não como prompt engineer.

NICHO DETECTADO: ${niche}
FORMATO: ${aspect}

Para cada cena, preencha:
1. directing_brief — função dramática, intenções de câmera/luz/performance/som (PT-BR, conciso, 1-2 frases cada)
2. seedance_refs — slots de referência multimodal (path relativo, nota @Image1/@Video1, ou descrição do asset a buscar)

SLOTS seedance_refs:
- identity: quem/o quê é o sujeito visual
- motion: referência de movimento corporal ou ação
- camera: referência de movimento de câmera
- audio: tom sonoro ou ritmo
- style: look / grading / paleta
- environment: cenário e época
- first_frame / last_frame: composição de abertura e fechamento (opcional)

REGRAS:
- Alinhar 100% com narration_text da cena
- Cenas tipo "vídeo IA" precisam de camera_intent e motion mais explícitos
- Cenas de imagem podem deixar motion vazio
- seedance_refs: use notação @Image1/@Video1 quando não houver arquivo; seja específico o suficiente para um humano anexar depois
- NÃO altere scene, block, narration_text, prompt, type, editor_notes, stock_query

SAÍDA: APENAS JSON válido:
{
  "visual_prompts": [
    {
      "scene": "1.1",
      "block": 1,
      "directing_brief": {
        "dramatic_function": "...",
        "camera_intent": "...",
        "lighting_intent": "...",
        "performance_intent": "...",
        "sound_intent": "..."
      },
      "seedance_refs": {
        "identity": "...",
        "motion": "...",
        "camera": "...",
        "audio": "...",
        "style": "...",
        "environment": "...",
        "first_frame": "...",
        "last_frame": "..."
      }
    }
  ],
  "directing_notes": "notas gerais de direção do vídeo (1 parágrafo)"
}`;
}

export function buildSeedanceDirectingRequest(storyboard = {}, opts = {}) {
  const strategy = storyboard.strategy || {};
  const narrative = String(storyboard.narrative_script || "").trim();
  const visualPrompts = Array.isArray(storyboard.visual_prompts) ? storyboard.visual_prompts : [];
  const hyperframe = String(storyboard.hyperframe_prompt || "").trim();
  const format = opts.format || "SHORTS";
  const sceneIndices = Array.isArray(opts.sceneIndices) ? opts.sceneIndices : null;

  const niche = detectNicheFromContent(strategy, narrative, hyperframe);
  const systemPrompt = buildSeedanceDirectingSystemPrompt({ niche, format });

  let scenes = visualPrompts;
  if (sceneIndices?.length) {
    scenes = sceneIndices
      .filter((i) => i >= 0 && i < visualPrompts.length)
      .map((i) => ({ ...visualPrompts[i], _index: i }));
  }

  const payload = {
    strategy: {
      title_main: strategy.title_main,
      niche: strategy.niche,
      hook: strategy.hook,
    },
    narrative_excerpt: narrative.slice(0, 4000),
    hyperframe_prompt: hyperframe.slice(0, 400),
    scenes: scenes.map((vp, idx) => ({
      index: vp._index ?? idx,
      scene: vp.scene,
      block: vp.block,
      narration_text: String(vp.narration_text || "").slice(0, 500),
      type: vp.type || "imagem IA 2k",
      prompt_excerpt: String(vp.prompt || "").slice(0, 200),
      existing_directing: vp.directing_brief || undefined,
      existing_refs: vp.seedance_refs || undefined,
    })),
  };

  const scope =
    sceneIndices?.length === 1
      ? "esta cena"
      : sceneIndices?.length
        ? "as cenas indicadas"
        : "TODAS as cenas";

  return {
    systemPrompt,
    userPrompt: `Gere directing_brief + seedance_refs para ${scope} do storyboard abaixo.\n\nSTORYBOARD:\n${JSON.stringify(payload, null, 2)}`,
    detectedNiche: niche,
  };
}

export function applySeedanceDirectingResponse(storyboard = {}, parsed = {}) {
  const merged = { ...storyboard };
  if (Array.isArray(parsed.visual_prompts) && parsed.visual_prompts.length > 0) {
    merged.visual_prompts = mergeDirectingIntoVisualPrompts(
      storyboard.visual_prompts,
      parsed.visual_prompts,
    );
  }
  if (parsed.directing_notes) {
    merged._seedance_directing_notes = String(parsed.directing_notes).trim();
  }
  merged._seedance_directing_at = new Date().toISOString();
  return normalizeStoryboardDirecting(merged);
}