/**
 * Fase 3 — enriquecimento LLM opcional + dedupe com overlays_ai.
 */

import fs from "fs";
import path from "path";

function loadRemotionTemplatesInstruction() {
  try {
    const filePath = path.join(
      process.cwd(),
      ".agents",
      "remotiontemplatesinstruction.md"
    );
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8");
    }
  } catch (e) {
    console.warn(
      "Aviso ao carregar remotiontemplatesinstruction.md:",
      e.message
    );
  }
  return "";
}

import {
  DEFAULT_DURATIONS,
  MOTION_SCENE_TRIGGERS,
  operationalCatalogForTemplates,
  resolveLayoutForTemplate,
} from "../shared/motionSceneCatalog.js";
import { nicheDesignPromptBlock } from "../shared/nicheDesignPack.js";
import {
  buildPropsForTemplate,
  resolveNichePack,
} from "./motionScenePlanner.js";
import { buildMotionResearchContext } from "../shared/storyboardResearch.js";
import { enrichMotionScenesWithResearch } from "../shared/motionResearchProps.js";
import { summarizeCatalogForLlm } from "./remotionTemplateCatalogService.js";
import {
  computeStudioContractCoverage,
  enrichStudioTemplateScene,
  mergeStudioPropsFromLlm,
  validateStudioContractCoverage,
} from "../shared/studioTemplatePropsBinder.js";

export const STUDIO_CONTRACT_MIN_COVERAGE = 0.5;

const VALID_TEMPLATES = new Set(
  Object.values(MOTION_SCENE_TRIGGERS).flatMap((t) => t.templates || [])
);

function extractJsonCandidate(text) {
  const raw = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const firstObject = raw.indexOf("{");
  const firstArray = raw.indexOf("[");
  const start =
    firstObject === -1
      ? firstArray
      : firstArray === -1
        ? firstObject
        : Math.min(firstObject, firstArray);
  if (start === -1) return raw;
  const closeForOpen = raw[start] === "{" ? "}" : "]";
  const stack = [closeForOpen];
  let inString = false;
  let escaped = false;
  for (let i = start + 1; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      if (ch !== stack.pop()) break;
      if (stack.length === 0) return raw.slice(start, i + 1);
    }
  }
  const fallback = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return fallback ? fallback[0] : raw;
}

export function parseMotionSceneLlmPayload(text) {
  const candidate = extractJsonCandidate(text);
  const variants = [
    candidate,
    candidate.replace(/,\s*([}\]])/g, "$1"),
    candidate
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/,\s*([}\]])/g, "$1"),
  ];
  let lastError = null;
  for (const variant of variants) {
    try {
      const parsed = JSON.parse(variant);
      if (Array.isArray(parsed)) return { motion_scenes: parsed };
      if (Array.isArray(parsed?.motion_scenes)) return parsed;
      if (Array.isArray(parsed?.scenes))
        return { motion_scenes: parsed.scenes };
      return parsed;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("JSON inválido na resposta LLM");
}

function overlaySceneRef(overlay = {}) {
  return String(
    overlay.start || overlay.scene_ref || overlay.scene || ""
  ).trim();
}

function motionSceneRef(scene = {}) {
  return String(scene.scene_ref || scene.scene || "").trim();
}

function overlayDedupeKey(overlay = {}) {
  const type = String(overlay.type || overlay.template_id || "").trim();
  const scene = overlaySceneRef(overlay);
  if (!type) return "";
  if (scene) return `${type}::${scene}`;
  const block = Number(overlay.block || overlay.props?.block || 0);
  if (block > 0) return `${type}::block-${block}`;
  return "";
}

function motionDedupeKey(scene = {}) {
  const type = String(scene.template_id || "").trim();
  const sceneRef = motionSceneRef(scene);
  if (!type) return "";
  if (sceneRef) return `${type}::${sceneRef}`;
  const block = Number(scene.block || 0);
  if (block > 0) return `${type}::block-${block}`;
  return "";
}

/**
 * Remove motion scenes que colidem com overlays_ai (mesmo template + cena/bloco).
 */
export function dedupeMotionScenesAgainstOverlays(
  motionScenes = [],
  overlaysAi = []
) {
  const overlays = Array.isArray(overlaysAi) ? overlaysAi : [];
  const overlayKeys = new Set(overlays.map(overlayDedupeKey).filter(Boolean));

  if (!overlayKeys.size) {
    return { scenes: motionScenes, removed: [] };
  }

  const removed = [];
  const scenes = (Array.isArray(motionScenes) ? motionScenes : []).filter(
    (ms) => {
      const key = motionDedupeKey(ms);
      if (key && overlayKeys.has(key)) {
        removed.push({ id: ms.id, key, reason: "overlay_ai_duplicate" });
        return false;
      }
      return true;
    }
  );

  return { scenes, removed };
}

function summarizeStudioContractsForPrompt(scenes = []) {
  const studioScenes = (Array.isArray(scenes) ? scenes : []).filter(
    (s) =>
      s.props?.template_studio_id && s.props?.template_studio_data_slots?.length
  );
  if (!studioScenes.length) return "";

  return studioScenes
    .map((scene) => {
      const dataSlots = scene.props.template_studio_data_slots;
      const coverage = computeStudioContractCoverage(scene);
      return {
        id: scene.id,
        template_studio_id: scene.props.template_studio_id,
        template_studio_name: scene.props.template_studio_name,
        dataSlots,
        studio_props: scene.props.studio_props || {},
        missing_slots: coverage.missing_slots,
        coverage: Math.round(coverage.coverage * 100),
        narration_excerpt: String(scene.narration_text || "").slice(0, 160),
      };
    })
    .slice(0, 12);
}

function summarizeOverlaysForPrompt(overlaysAi = []) {
  return (Array.isArray(overlaysAi) ? overlaysAi : [])
    .slice(0, 24)
    .map((o) => {
      const type = String(o.type || "").trim();
      const scene = overlaySceneRef(o);
      const label =
        o.props?.location ||
        o.props?.title ||
        o.props?.text ||
        o.props?.label ||
        "";
      return `- ${type} @ cena ${scene || "?"} — ${String(label).slice(0, 60)}`;
    })
    .join("\n");
}

export function buildMotionSceneEnrichmentPrompt({
  heuristicPlan = {},
  storyboard = {},
  config = {},
  overlaysAi = [],
}) {
  const templateGuidelines = loadRemotionTemplatesInstruction();
  const guidelinesBlock = templateGuidelines
    ? `\n[DIRETRIZES DE ENRIQUECIMENTO E PREENCHIMENTO DE TEMPLATES (remotiontemplatesinstruction.md)]:\n${templateGuidelines}\n`
    : "";

  const niche = String(config.niche || storyboard?.strategy?.niche || "Geral");
  const nichePack =
    heuristicPlan.niche_pack || resolveNichePack(config, storyboard);
  const accent = String(config.accent_color || "#D4AF37");
  const scenes = (heuristicPlan.motion_scenes || []).slice(0, 16);
  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  // If no heuristic scenes AND no visual prompts, nothing to do
  if (!scenes.length && !visualPrompts.length) return null;

  const visualContext = visualPrompts
    .slice(0, 20)
    .map((vp, i) => ({
      scene: vp.scene || vp.scene_id || i + 1,
      block: vp.block,
      narration: String(
        vp.narration_text || vp.asset?.narration_segment || ""
      ).slice(0, 220),
      has_asset: Boolean(vp.asset?.url || vp.asset?.src || vp.generated_image),
    }));

  const templateList = [...VALID_TEMPLATES].join(", ");
  const operationalCatalog = operationalCatalogForTemplates([
    ...VALID_TEMPLATES,
  ]);
  const studioCatalog =
    config.motion_template_pack?.enabled !== false
      ? summarizeCatalogForLlm(
          config.motion_template_pack?.niche || config.niche || niche
        )
      : [];
  const overlaySummary = summarizeOverlaysForPrompt(overlaysAi);
  const studioContracts = summarizeStudioContractsForPrompt(scenes);
  const researchContext = buildMotionResearchContext(storyboard, config);
  const researchFacts = (researchContext.globalFacts || []).slice(0, 12);
  const researchSources = (researchContext.globalSources || [])
    .slice(0, 8)
    .map((src) => ({
      title: src.title,
      url: src.url,
      snippet: String(src.snippet || "").slice(0, 200),
    }));

  // Generation mode: heuristic found nothing, LLM creates from scratch
  const isGenerationMode = scenes.length === 0;
  const modeInstruction = isGenerationMode
    ? [
        "MODO: GERAÇÃO COMPLETA — o planner heurístico não encontrou triggers. Você deve CRIAR motion scenes do zero analisando a narração de cada cena.",
        "- Analise CADA cena do CONTEXTO visual_prompts e decida se ela merece um template.",
        "- Crie motion scenes APENAS para cenas que têm DADOS CONCRETOS (números, datas, comparações, listas, fatos históricos).",
        "- Para cada motion scene gerada, use id: 'llm-<scene_ref>' (ex: 'llm-1', 'llm-3').",
        "- scene_ref deve corresponder ao número da cena no visual_prompts.",
        "- Se NENHUMA cena tem dados concretos, retorne { \"motion_scenes\": [], \"notes\": \"sem dados concretos para templates\" }.",
      ].join("\n")
    : "MODO: REFINAMENTO — refine o plano heurístico abaixo (mesmos ids). NÃO adicione cenas novas.";

  return [
    `Você é diretor de motion graphics Remotion para vídeo documental (nicho: "${niche}", pack: "${nichePack}").`,
    modeInstruction,
    "",
    "REGRAS:",
    `- Use APENAS template_id: ${templateList}`,
    `- CATALOGO OPERACIONAL DOS TEMPLATES:\n${JSON.stringify(operationalCatalog, null, 2)}`,
    "- NUNCA duplique overlays já planejados em overlays_ai (mesmo template + mesma cena/bloco).",
    isGenerationMode ? "" : "- NÃO adicione cenas novas — refine APENAS as do plano heurístico (mesmos id).",
    "- Preserve start_hint de cada cena; nunca empilhe cenas em start_hint 0.",
    "- DADOS CONCRETOS: Extraia APENAS dados reais da narração e da pesquisa — números, anos, nomes. NUNCA invente valores sem suporte textual.",
    "",
    "PROPS OBRIGATÓRIOS POR TIPO DE RENDERER (preencha com dados REAIS da narração/pesquisa):",
    "  odometer-digit-roll / gauge-readout-moves / impact-feedback: { value: <número real>, unit: '<unidade>', label: '<nome curto da métrica>' }",
    "  chart-live-moves / particle-sand-fill / dataviz-landscape-open: { value: <percent ou número>, label: '<título do dado>' }",
    "  timeline-travel / document-typewriter-reveal: { milestones: [{ year: '<ano/época>', label: '<evento curto>' }] } (mín 2)",
    "  list-stack-press / wall-reveal-moves: { items: [{ rank: 1, title: '<nome>', value: '<valor>' }] } (mín 2)",
    "  before-after-slider-scrub / text-column-converge: { left: '<antes/lado A>', right: '<depois/lado B>', label: '<contexto>' }",
    "  gradient-word-sweep / cel-flash-stomp / trailer-grammar-moves: { words: ['<palavra1>', '<palavra2>', ...] } (keywords curtos da narração, máx 5)",
    "  spotlight-hero-card / crane-rise-reveal / card-flip-reveal: { card: { title: '<título curto ≤5 palavras>', subtitle: '<dado numérico>' } }",
    "  brand-ink-open / neon-frame-forerun / outro-group-photo-launch: { text: '<título do vídeo/canal>', subtitle: '<subtítulo curto>' }",
    "  marker-underline-title / type-entrance-moves: { text: '<frase curta ≤6 palavras>', value: '<dado complementar>' }",
    "",
    "- Se a cena NÃO tem dados concretos (só narrativa genérica), NÃO coloque template — deixe motion_shot: null e use apenas camera_move.",
    "- Template SÓ aparece quando tem DADO REAL para mostrar. Nunca mostre template vazio ou com texto da narração como placeholder.",
    "- DURATION: cada template deve ter duration_seconds adequado: dados=3-4s, timeline=4-6s, lista=3-5s, abertura=2-3s, texto=2-3s.",
    "- COEXISTÊNCIA: se a cena tem asset visual forte (vídeo IA/imagem), o template entra como overlay menor (pip/bottom) após 2s do asset. Se a cena é só narração, template pode ser fullscreen.",
    "- ESCOLHA INTELIGENTE: analise a narração de cada cena e escolha o template que MELHOR comunica o dado. Não use o mesmo template 2x seguidas.",
    "- TEMPLATES DISPONÍVEIS (video-shotcraft): odometer-digit-roll, gauge-readout-moves, chart-live-moves, particle-sand-fill, before-after-slider-scrub, timeline-travel, list-stack-press, wall-reveal-moves, crash-zoom-punch, impact-feedback, slam-entrance-moves, gradient-word-sweep, marker-underline-title, type-entrance-moves, brand-ink-open, trailer-grammar-moves, space-camera-moves, crane-rise-reveal, canvas-materialize-moves, shot-transitions, transition-hidden-cut.",
    "- PROIBIDO usar: location-intro, geo-map, ou qualquer template que não esteja na lista acima.",
    "- Para texto/título use: gradient-word-sweep, marker-underline-title, type-entrance-moves, typewriter-moves (shotcraft). Nunca texto solto sem template.",
    studioCatalog.length
      ? "- CATÁLOGO DO NICHO (Template Studio): escolha template_id conforme motion_template_id que melhor encaixa na narração de cada cena — a IA decide automaticamente, sem seleção manual do usuário."
      : "",
    studioCatalog.length
      ? `CATÁLOGO_TEMPLATE_STUDIO:\n${JSON.stringify(studioCatalog, null, 2)}`
      : "",
    "- DENSIDADE: Shorts 9:16 max 2-3 motion scenes (alta energia, nao polua). Longo 16:9 max 6-8 distribuidas equilibradamente (max 1 por bloco, nao empilhe 2+ na mesma janela de 5s).",
    "- counter: value numérico real + label curto em PT-BR (extraído da narração).",
    "- bar-chart: props.items com labels e valores reais da narração (mín. 2 itens).",
    "- timeline: events com year + label (mín. 2 eventos quando houver datas).",
    "- kinetic-text: props.text = frase de impacto da narração (≤60 chars).",
    "- lower-third: props.subtitle com o fato histórico da narração.",
    "- Mantenha id, scene_ref, block e start_hint do plano heurístico quando possível.",
    `- accentColor padrão: ${accent}`,
    studioContracts.length
      ? "- CONTRATO TEMPLATE STUDIO: para cenas com template_studio_id, preencha props.studio_props com TODOS os dataSlots faltantes usando narração e pesquisa — NÃO invente números sem suporte textual."
      : "",
    studioContracts.length
      ? "- studio_props: use APENAS chaves listadas em dataSlots; preserve valores já preenchidos no plano heurístico."
      : "",
    studioContracts.length
      ? `- Cobertura mínima exigida após enrich: ${Math.round(STUDIO_CONTRACT_MIN_COVERAGE * 100)}% dos dataSlots.`
      : "",
    studioContracts.length
      ? `CONTRATOS_STUDIO:\n${JSON.stringify(studioContracts, null, 2)}`
      : "",
    "",
    guidelinesBlock,
    "",
    nicheDesignPromptBlock(nichePack),
    "",
    overlaySummary
      ? `OVERLAYS_AI (não duplicar):\n${overlaySummary}`
      : "OVERLAYS_AI: (nenhum)",
    "",
    researchFacts.length || researchSources.length
      ? `PESQUISA DO ROTEIRO (priorize estes fatos — NÃO invente dados genéricos):\nFATOS:\n${researchFacts.map((f) => `- ${f}`).join("\n")}\n\nFONTES:\n${researchSources.map((s) => `- ${s.title || s.url}: ${s.snippet || ""}`).join("\n")}`
      : "PESQUISA DO ROTEIRO: (nenhuma fonte no storyboard)",
    "",
    isGenerationMode ? "" : "PLANO HEURÍSTICO:",
    isGenerationMode ? "" : JSON.stringify(scenes, null, 2),
    "",
    "CONTEXTO visual_prompts (cenas do vídeo com narração):",
    JSON.stringify(visualContext, null, 2),
    "",
    'Retorne APENAS JSON: { "motion_scenes": [ { "id", "scene_ref", "template_id", "trigger", "duration_seconds", "props": { ... } } ], "notes": "breve" }',
  ].join("\n");
}

function extractLlmStudioProps(raw = {}, dataSlots = []) {
  const llmProps =
    raw.props?.studio_props && typeof raw.props.studio_props === "object"
      ? raw.props.studio_props
      : {};
  const topLevel = {};
  for (const slot of dataSlots) {
    if (raw.props?.[slot] !== undefined) topLevel[slot] = raw.props[slot];
  }
  return { ...topLevel, ...llmProps };
}

export function applyStudioContractFromLlm(
  scene = {},
  raw = {},
  researchContext = {},
  config = {}
) {
  const dataSlots = Array.isArray(scene.props?.template_studio_data_slots)
    ? scene.props.template_studio_data_slots
    : [];
  if (!dataSlots.length || !scene.props?.template_studio_id) return scene;

  const heuristicStudio = scene.props.studio_props || {};
  const llmStudio = extractLlmStudioProps(raw, dataSlots);
  const mergedStudio = mergeStudioPropsFromLlm(
    heuristicStudio,
    llmStudio,
    dataSlots
  );

  let enriched = {
    ...scene,
    props: {
      ...(scene.props || {}),
      ...mergedStudio,
      studio_props: mergedStudio,
    },
  };

  enriched = enrichStudioTemplateScene(enriched, {
    researchContext,
    config,
  });

  const validation = validateStudioContractCoverage(
    enriched,
    STUDIO_CONTRACT_MIN_COVERAGE
  );
  enriched.props.studio_props_meta = {
    ...(enriched.props.studio_props_meta || {}),
    llm_enriched: Object.keys(llmStudio).length > 0,
    contract_valid: validation.valid,
    contract_coverage: validation.coverage,
    contract_missing_slots: validation.missing_slots,
  };

  if (!validation.valid) {
    return {
      ...enriched,
      studio_contract_rejected: true,
      studio_contract_reason: `cobertura ${Math.round(validation.coverage * 100)}% abaixo do mínimo ${Math.round(STUDIO_CONTRACT_MIN_COVERAGE * 100)}%`,
    };
  }

  return enriched;
}

export function filterScenesFailingStudioContract(scenes = []) {
  const input = Array.isArray(scenes) ? scenes : [];
  const kept = [];
  const rejected = [];
  for (const scene of input) {
    if (!scene.props?.template_studio_id) {
      kept.push(scene);
      continue;
    }
    const validation = validateStudioContractCoverage(
      scene,
      STUDIO_CONTRACT_MIN_COVERAGE
    );
    if (validation.valid) {
      kept.push(scene);
    } else {
      rejected.push({
        id: scene.id,
        template_studio_id: scene.props.template_studio_id,
        coverage: validation.coverage,
        missing_slots: validation.missing_slots,
      });
    }
  }
  return { scenes: kept, rejected };
}

function normalizeLlmMotionScene(
  raw,
  heuristicById,
  { accentColor, nichePack, researchContext = null }
) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || "").trim();
  const heuristic = id ? heuristicById.get(id) : null;
  const trigger = String(raw.trigger || heuristic?.trigger || "").trim();
  let templateId = String(
    raw.template_id || heuristic?.template_id || ""
  ).trim();
  if (!VALID_TEMPLATES.has(templateId)) {
    templateId = heuristic?.template_id || "lower-third";
  }
  const narration = String(
    raw.narration_text || heuristic?.narration_text || ""
  ).trim();
  const aspectRatio = String(
    raw.props?.aspect_ratio || heuristic?.props?.aspect_ratio || "16:9"
  );
  const baseProps = buildPropsForTemplate(
    templateId,
    trigger,
    narration,
    accentColor,
    aspectRatio,
    nichePack,
    researchContext
  );
  const llmProps = raw.props && typeof raw.props === "object" ? raw.props : {};

  const rawDuration =
    Number(raw.duration_seconds) ||
    Number(heuristic?.duration_seconds) ||
    DEFAULT_DURATIONS[templateId] ||
    4;
  const maxLocationDuration =
    templateId === "location-intro"
      ? aspectRatio === "9:16"
        ? 10
        : 20
      : Number.POSITIVE_INFINITY;

  const scene = {
    ...(heuristic || {}),
    ...raw,
    id: id || heuristic?.id || `ms-llm-${Date.now()}`,
    scene_ref: String(raw.scene_ref || heuristic?.scene_ref || ""),
    block: Number(raw.block || heuristic?.block) || 1,
    start_hint: Number.isFinite(Number(raw.start_hint))
      ? Number(raw.start_hint)
      : Number(heuristic?.start_hint) || 0,
    duration_seconds: Math.min(maxLocationDuration, Math.max(0.5, rawDuration)),
    template_id: templateId,
    trigger: trigger || heuristic?.trigger || "curiosity_punch",
    layout:
      raw.layout ||
      heuristic?.layout ||
      resolveLayoutForTemplate(templateId, trigger, {
        text: narration,
        aspectRatio,
        niche: nichePack,
      }),
    props: {
      ...baseProps,
      ...llmProps,
      ...(heuristic?.props?.studio_source_code
        ? {
            template_studio_id: heuristic.props.template_studio_id,
            template_studio_name: heuristic.props.template_studio_name,
            template_studio_category: heuristic.props.template_studio_category,
            template_studio_subcategory:
              heuristic.props.template_studio_subcategory,
            template_studio_motion_template_id:
              heuristic.props.template_studio_motion_template_id,
            template_studio_data_slots:
              heuristic.props.template_studio_data_slots,
            studio_source_code: heuristic.props.studio_source_code,
            studio_props: heuristic.props.studio_props,
            studio_props_meta: heuristic.props.studio_props_meta,
            ...(heuristic.props.studio_props &&
            typeof heuristic.props.studio_props === "object"
              ? heuristic.props.studio_props
              : {}),
          }
        : {}),
    },
    narration_text: narration || heuristic?.narration_text || "",
    media_mode: "remotion",
    niche_pack: nichePack,
    confidence: Math.min(
      1,
      Math.max(
        0.5,
        Number(raw.confidence) || Number(heuristic?.confidence) || 0.75
      )
    ),
    source: "llm",
  };

  const triggerMeta = MOTION_SCENE_TRIGGERS[scene.trigger] || {};
  scene.rve_ref = heuristic?.rve_ref ?? triggerMeta.rveRef ?? null;
  scene.remotion_ref =
    heuristic?.remotion_ref ?? triggerMeta.remotionRef ?? null;

  if (templateId === "location-intro") {
    const isEngineeringShort =
      aspectRatio === "9:16" &&
      /engenharia|engineering|industrial/i.test(String(nichePack || ""));
    const layout = isEngineeringShort ? "pip" : "fullscreen";
    scene.layout = layout;
    scene.props = {
      ...scene.props,
      aspect_ratio: aspectRatio,
      niche: scene.props?.niche || nichePack,
      presentation: layout,
      layout,
    };
  }

  return scene;
}

export function applyLlmEnrichmentToPlan(
  heuristicPlan = {},
  llmPayload = {},
  { config = {}, storyboard = {} } = {}
) {
  const rawScenes = Array.isArray(llmPayload?.motion_scenes)
    ? llmPayload.motion_scenes
    : [];
  if (!rawScenes.length) {
    return { ...heuristicPlan, source: heuristicPlan.source || "heuristic" };
  }

  const accentColor = String(config.accent_color || "#D4AF37");
  const nichePack =
    heuristicPlan.niche_pack || resolveNichePack(config, storyboard);
  const researchContext = buildMotionResearchContext(storyboard, config);
  const heuristicScenes = heuristicPlan.motion_scenes || [];
  const heuristicById = new Map(
    heuristicScenes.map((s) => [String(s.id), s])
  );
  const isGenerationMode = heuristicScenes.length === 0;

  const llmById = new Map();
  const generatedScenes = [];
  const usedTemplateIds = new Set(); // dedup: nunca repetir template no mesmo vídeo
  for (const raw of rawScenes) {
    const normalized = normalizeLlmMotionScene(raw, heuristicById, {
      accentColor,
      nichePack,
      researchContext,
    });
    if (!normalized?.id) continue;
    // Deduplicação global de template_id
    const tid = String(normalized.template_id || "");
    if (tid && usedTemplateIds.has(tid)) continue;
    if (tid) usedTemplateIds.add(tid);
    if (isGenerationMode) {
      // Generation mode: accept LLM-created scenes directly
      generatedScenes.push(normalized);
    } else {
      // Refinement mode: only accept scenes matching heuristic IDs
      if (!heuristicById.has(String(normalized.id))) continue;
      llmById.set(String(normalized.id), normalized);
    }
  }

  // Generation mode: LLM created scenes from scratch
  if (isGenerationMode) {
    const contractFiltered = filterScenesFailingStudioContract(generatedScenes);
    return {
      ...heuristicPlan,
      motion_scenes: enrichMotionScenesWithResearch(
        contractFiltered.scenes,
        researchContext
      ),
      planner_version: 2,
      source: "llm_generation",
      llm_notes: String(llmPayload?.notes || "").slice(0, 500),
      studio_contract_rejected: contractFiltered.rejected,
    };
  }

  // Refinement mode: merge LLM enrichments into heuristic scenes
  const motion_scenes = heuristicScenes.map((heuristic) => {
    const llm = llmById.get(String(heuristic.id));
    if (!llm) return heuristic;
    const startHint = Number.isFinite(Number(llm.start_hint))
      ? Number(llm.start_hint)
      : Number(heuristic.start_hint) || 0;
    const safeStart =
      startHint > 0
        ? startHint
        : Number(heuristic.start_hint) > 0
          ? Number(heuristic.start_hint)
          : startHint;
    const merged = {
      ...heuristic,
      ...llm,
      start_hint: safeStart,
      props: { ...(heuristic.props || {}), ...(llm.props || {}) },
    };
    return applyStudioContractFromLlm(merged, llm, researchContext, config);
  });

  const contractFiltered = filterScenesFailingStudioContract(motion_scenes);

  return {
    ...heuristicPlan,
    motion_scenes: enrichMotionScenesWithResearch(
      contractFiltered.scenes,
      researchContext
    ),
    planner_version: 2,
    source: "heuristic+llm",
    llm_notes: String(llmPayload?.notes || "").slice(0, 500),
    studio_contract_rejected: contractFiltered.rejected,
    planned_at: new Date().toISOString(),
  };
}

export async function enrichMotionScenesWithLlm(
  heuristicPlan,
  {
    storyboard = {},
    config = {},
    overlaysAi = [],
    callGemini,
    getApiKey,
    projDir,
    parseAiJson,
  } = {}
) {
  const prompt = buildMotionSceneEnrichmentPrompt({
    heuristicPlan,
    storyboard,
    config,
    overlaysAi,
  });
  if (!prompt) {
    return {
      plan: heuristicPlan,
      llm: { skipped: true, reason: "empty_heuristic" },
    };
  }

  const apiKey = getApiKey?.(projDir);
  if (!apiKey || !callGemini) {
    return {
      plan: heuristicPlan,
      llm: { skipped: true, reason: "no_api_key" },
    };
  }

  const text = await callGemini(projDir, prompt, {
    temperature: 0.32,
    maxRetries: 2,
  });
  if (!text) {
    return {
      plan: heuristicPlan,
      llm: { skipped: true, reason: "empty_response" },
    };
  }

  let payload;
  try {
    payload = parseAiJson
      ? await parseAiJson(text, apiKey, "motion scenes LLM")
      : parseMotionSceneLlmPayload(text);
  } catch (err) {
    return {
      plan: heuristicPlan,
      llm: { error: err.message, fallback: "heuristic" },
    };
  }

  let plan = applyLlmEnrichmentToPlan(heuristicPlan, payload, {
    config,
    storyboard,
  });
  const deduped = dedupeMotionScenesAgainstOverlays(
    plan.motion_scenes,
    overlaysAi
  );
  plan = { ...plan, motion_scenes: deduped.scenes };

  return {
    plan,
    llm: {
      enriched: true,
      notes: plan.llm_notes || null,
      dedupe_removed: deduped.removed,
    },
  };
}
