/**
 * motionDirector.js
 * Analisa o storyboard e atribui shot cards do video-shotcraft a cada cena.
 * Gera o motion plan consumido pelo ShotcraftLayer no render.
 */

import {
  SHOTCRAFT_CATALOG,
  cardsByFunction,
  searchCardsByTags,
  findCard,
} from "./shotcraftCatalog.js";
import { resolveNicheMotionPrefs } from "./nicheMotionPreferences.js";
import { buildShotProps } from "./shotcraftPropsMap.js";

export function detectarSceneFunctions(narration = "") {
  const t = String(narration).toLowerCase();
  const fn = [];

  if (
    /\d+(?:[.,]\d+)?\s*(metros?|km|kg|toneladas?|anos?|dias?|horas?|milh\w*|bilh\w*|%|por cento|vezes|reais?|d[oó]lares?)/.test(
      t
    )
  )
    fn.push("dado_numerico");
  if (
    /\b(gr[aá]fico|aumentou|cresceu|caiu|subiu|diminuiu|tend[eê]ncia|escala)\b/.test(
      t
    )
  )
    fn.push("grafico");
  if (
    /\b(vs\.?|versus|comparad|enquanto|diferente|maior que|menor que|melhor que|pior que)\b/.test(
      t
    )
  )
    fn.push("comparacao");
  if (/\b(antes|depois|evolu|transformou|mudou de)\b/.test(t))
    fn.push("antes_depois");
  if (
    /\b(em \d{3,4}|ano de|s[eé]culo|d[eé]cada|antes de cristo|d\.c\.|cronolog|linha do tempo)\b/.test(
      t
    )
  )
    fn.push("timeline");
  if (
    /\b(primeiro|segundo|terceiro|quarto|quinto|[uú]ltimo|top \d|ranking|posi[çc][ãa]o|n[uú]mero \d)\b/.test(
      t
    )
  )
    fn.push("ranking");
  if (/\b(al[eé]m disso|outro|tamb[eé]m|mais um|item|lista)\b/.test(t))
    fn.push("lista");
  if (
    /\b(processo|etapa|fase|passo a passo|como funciona|funciona assim|constru|fabrica|monta)\b/.test(
      t
    )
  )
    fn.push("processo");
  if (
    /\b(revel|descobr|surpre|incr[ií]vel|impression|chocante|segredo)\b/.test(t)
  )
    fn.push("revelacao");

  return fn.length ? fn : ["narrativa"];
}

export function extrairDados(narration = "") {
  const num = String(narration).match(
    /(\d+(?:[.,]\d+)?)\s*(metros?|km|kg|toneladas?|anos?|dias?|%|vezes|milh\w*|bilh\w*|reais?|d[oó]lares?)?/i
  );
  const ano = String(narration).match(/\b(\d{4})\b/);
  return {
    valor: num ? num[1] : null,
    unidade: num && num[2] ? num[2] : "",
    ano: ano ? ano[1] : null,
  };
}

function escolherShotCard({ functions, narration, format, nichePrefs }) {
  const preferred = nichePrefs.preferidos || [];
  for (const prefId of preferred) {
    const card = findCard(prefId);
    if (
      card &&
      card.supportedFormats.includes(format) &&
      card.function.some((f) => functions.includes(f))
    ) {
      return card;
    }
  }

  for (const func of functions) {
    const candidates = cardsByFunction(func).filter((c) =>
      c.supportedFormats.includes(format)
    );
    if (candidates.length) {
      const pref = candidates.find((c) => preferred.includes(c.templateId));
      return pref || candidates[0];
    }
  }

  const byTags = searchCardsByTags(narration, { format, limit: 1 });
  if (byTags.length) return byTags[0];

  return null;
}

const TRANSICOES = [
  "shot-transitions",
  "wipe-transitions",
  "transition-hidden-cut",
  "circle-match-iris",
  "color-block-step-wipe",
];

function escolherTransicao(index, nichePrefs) {
  if (nichePrefs.transicao) return nichePrefs.transicao;
  return TRANSICOES[index % TRANSICOES.length];
}

/**
 * Gera o motion plan do storyboard.
 */
export function buildMotionPlan({
  storyboard = {},
  niche = "",
  format = "16:9",
} = {}) {
  const scenes = storyboard.visual_prompts || storyboard.scenes || [];
  const nichePrefs = resolveNicheMotionPrefs(niche);
  const isShorts =
    format === "9:16" ||
    String(format).toUpperCase() === "SHORTS" ||
    String(format).toUpperCase() === "SHORT";
  const fmt = isShorts ? "9:16" : "16:9";
  const channelName =
    storyboard.channel_name ||
    storyboard.channelName ||
    storyboard.strategy?.channel ||
    "";

  const plan = {
    niche,
    format: fmt,
    palette: nichePrefs.palette,
    source: "video-shotcraft",
    catalog_size: SHOTCRAFT_CATALOG.length,
    abertura: {
      templateId: isShorts ? "trailer-grammar-moves" : "brand-ink-open",
      style: isShorts ? "trailer-bumper" : "brand-ink-open",
      duracao_s: isShorts ? 1.5 : 3,
      props: buildShotProps(
        isShorts ? "trailer-grammar-moves" : "brand-ink-open",
        {
          dados: {},
          narration: storyboard.strategy?.hook || storyboard.strategy?.title_main || "",
          palette: nichePrefs.palette,
          scene: {},
          format: fmt,
          channelName,
        }
      ),
    },
    cenas: [],
    encerramento: {
      templateId: "outro-group-photo-launch",
      duracao_s: isShorts ? 1.5 : 3,
      props: buildShotProps("outro-group-photo-launch", {
        dados: {},
        narration: "",
        palette: nichePrefs.palette,
        scene: { cta: "Inscreva-se" },
        format: fmt,
        channelName,
      }),
    },
  };

  scenes.forEach((scene, i) => {
    const narration =
      scene.narration_text || scene.narration_excerpt || scene.narration || "";
    const functions = scene.scene_function
      ? Array.isArray(scene.scene_function)
        ? scene.scene_function
        : [scene.scene_function]
      : detectarSceneFunctions(narration);
    const dados = scene.extracted_data || extrairDados(narration);
    const card = escolherShotCard({
      functions,
      narration,
      format: fmt,
      nichePrefs,
    });

    const props = card
      ? buildShotProps(card.templateId, {
          dados,
          narration,
          palette: nichePrefs.palette,
          scene,
          format: fmt,
          channelName,
        })
      : { palette: nichePrefs.palette };

    plan.cenas.push({
      scene_ref: scene.scene || scene.scene_id || i + 1,
      scene_functions: functions,
      extracted_data: dados,
      motion_shot: card
        ? {
            templateId: card.templateId,
            style: card.styles?.[0],
            props,
            palette: nichePrefs.palette,
          }
        : null,
      camera_move: card
        ? null
        : nichePrefs.camera_padrao || "slow-push-in",
      transicao_entrada:
        i === 0 ? "shot-transitions" : escolherTransicao(i, nichePrefs),
      transicao_style: i === 0 ? "flash-cut" : undefined,
    });
  });

  return plan;
}

/**
 * Aplica o motion plan às cenas do storyboard (mutação controlada / retorna cópia).
 */
export function applyMotionPlanToStoryboard(storyboard = {}, plan) {
  if (!plan?.cenas?.length) return storyboard;
  const byRef = new Map(
    plan.cenas.map((c) => [String(c.scene_ref), c])
  );
  const visual_prompts = (storyboard.visual_prompts || []).map((vp, i) => {
    const key = String(vp.scene || vp.scene_id || i + 1);
    const motion = byRef.get(key) || plan.cenas[i];
    if (!motion) return vp;
    return {
      ...vp,
      scene_function: motion.scene_functions,
      extracted_data: motion.extracted_data,
      motion_shot: motion.motion_shot,
      camera_move: motion.camera_move,
      transicao_entrada: motion.transicao_entrada,
      suggested_shot: motion.motion_shot?.templateId || vp.suggested_shot,
    };
  });
  return {
    ...storyboard,
    visual_prompts,
    motion_plan: plan,
  };
}

export function validateMotionPlan(plan) {
  const avisos = [];
  if (!plan) return { ok: false, avisos: ["plan ausente"] };
  for (const cena of plan.cenas || []) {
    if (cena.motion_shot) {
      const card = findCard(cena.motion_shot.templateId);
      if (!card) {
        avisos.push(
          `Cena ${cena.scene_ref}: template '${cena.motion_shot.templateId}' não existe no catálogo.`
        );
      }
    }
  }
  return { ok: avisos.length === 0, avisos };
}

/**
 * Anota storyboard com scene_function + motion_shot (shotcraft).
 * Idempotente: reescreve motion_shot a partir da narração/nicho atuais.
 */
export function ensureShotcraftOnStoryboard(
  storyboard = {},
  { niche = "", format = "16:9" } = {}
) {
  const resolvedNiche =
    niche ||
    storyboard.niche ||
    storyboard.strategy?.niche ||
    storyboard._vpe_checklist?.nicho_detectado ||
    "";
  const resolvedFormat =
    format ||
    (String(storyboard.technical_config?.video_format || "").toUpperCase() ===
    "SHORTS"
      ? "9:16"
      : "16:9");
  const plan = buildMotionPlan({
    storyboard,
    niche: resolvedNiche,
    format: resolvedFormat,
  });
  const next = applyMotionPlanToStoryboard(storyboard, plan);
  const validation = validateMotionPlan(plan);
  return { storyboard: next, plan, validation };
}

/**
 * Preenche só scene_function / extracted_data quando ausentes (criadores).
 */
export function enrichSceneFunctionsOnVisualPrompts(visualPrompts = []) {
  return (Array.isArray(visualPrompts) ? visualPrompts : []).map((vp) => {
    if (!vp || typeof vp !== "object") return vp;
    const narration =
      vp.narration_text || vp.narration_excerpt || vp.narration || "";
    const hasFn =
      (Array.isArray(vp.scene_function) && vp.scene_function.length) ||
      (typeof vp.scene_function === "string" && vp.scene_function.trim());
    const next = { ...vp };
    if (!hasFn) next.scene_function = detectarSceneFunctions(narration);
    if (!vp.extracted_data || typeof vp.extracted_data !== "object") {
      next.extracted_data = extrairDados(narration);
    }
    return next;
  });
}
