/**
 * creatorSceneTagger.js
 * Módulo único que os criadores chamam ao final da geração.
 * Marca cenas com scene_function + extracted_data + suggested_shot.
 */

import { detectarSceneFunctions, extrairDados } from "./motionDirector.js";
import {
  searchCardsByTags,
  cardsByFunction,
  findCard,
} from "./shotcraftCatalog.js";
import { resolveNicheMotionPrefs } from "./nicheMotionPreferences.js";

function normFormat(format) {
  const f = String(format || "").toUpperCase();
  return f === "9:16" || f === "SHORTS" || f === "SHORT" ? "9:16" : "16:9";
}

function escolherSuggestedShot({ functions, narration, format, nichePrefs }) {
  const fmt = normFormat(format);

  for (const prefId of nichePrefs.preferidos || []) {
    const card = findCard(prefId);
    if (
      card &&
      card.supportedFormats.includes(fmt) &&
      card.function.some((f) => functions.includes(f))
    ) {
      return prefId;
    }
  }

  for (const func of functions) {
    const candidates = cardsByFunction(func).filter((c) =>
      c.supportedFormats.includes(fmt)
    );
    if (candidates.length) {
      const pref = candidates.find((c) =>
        (nichePrefs.preferidos || []).includes(c.templateId)
      );
      return (pref || candidates[0]).templateId;
    }
  }

  return (
    searchCardsByTags(narration, { format: fmt, limit: 1 })[0]?.templateId ||
    null
  );
}

export function tagSceneWithMotion(
  scene,
  { format = "16:9", niche = "" } = {}
) {
  if (!scene || typeof scene !== "object") return scene;

  const narration =
    scene.narration_text ||
    scene.narration_excerpt ||
    scene.narration ||
    scene.text ||
    "";
  const nichePrefs = resolveNicheMotionPrefs(niche);

  const functions = scene.scene_function
    ? Array.isArray(scene.scene_function)
      ? scene.scene_function
      : [scene.scene_function]
    : detectarSceneFunctions(narration);

  const dados = scene.extracted_data || extrairDados(narration);
  const suggested =
    scene.suggested_shot ||
    escolherSuggestedShot({
      functions,
      narration,
      format,
      nichePrefs,
    });

  return {
    ...scene,
    scene_function: functions,
    extracted_data: dados,
    suggested_shot: suggested,
  };
}

export function tagStoryboardWithMotion(
  storyboard,
  { format = "16:9", niche = "" } = {}
) {
  if (!storyboard || typeof storyboard !== "object") return storyboard;

  const scenesKey = storyboard.visual_prompts
    ? "visual_prompts"
    : storyboard.scenes
      ? "scenes"
      : storyboard.blocks
        ? "blocks"
        : null;

  if (!scenesKey) return storyboard;

  const tagged = (storyboard[scenesKey] || []).map((scene) =>
    tagSceneWithMotion(scene, { format, niche })
  );

  return {
    ...storyboard,
    [scenesKey]: tagged,
    motion_tagged: true,
    motion_format: normFormat(format),
    motion_niche: niche,
  };
}

export function calcularPotencialMotion(
  ideia,
  { format = "16:9", niche = "" } = {}
) {
  const tema =
    ideia.tema ||
    ideia.title ||
    ideia.title_main ||
    ideia.premissa ||
    ideia.hook ||
    "";
  const fmt = normFormat(format);
  const cards = searchCardsByTags(tema, { format: fmt, limit: 5 });
  return {
    ...ideia,
    potencial_motion: cards.map((c) => c.templateId),
    potencial_score: cards.length,
    melhor_shot: cards[0]?.templateId || null,
  };
}

export function extrairMarcosHistoricos(narration) {
  const texto = String(narration || "");
  const marcos = [];

  const anos = texto.matchAll(
    /\b(?:em|no ano de|durante|por volta de)\s+(\d{3,4})\b/gi
  );
  for (const m of anos) {
    marcos.push({ year: m[1], label: m[0].trim() });
  }

  const seculos = texto.matchAll(/\bs[eé]culo\s+([XVI]+|\d{1,2})\b/gi);
  for (const s of seculos) {
    marcos.push({ year: `Séc. ${s[1]}`, label: s[0].trim() });
  }

  return marcos;
}

export function detectarBeatPoints(narration) {
  const texto = String(narration || "");
  const beats = [];

  const punchlines = texto.matchAll(
    /([^.!?,]+(?:mas|por[eé]m|a[ií]|ent[aã]o|s[oó] que|e ent[aã]o)[^.!?,]+[.!?,]?)/gi
  );
  for (const p of punchlines) {
    beats.push({ texto: p[1].trim(), tipo: "virada" });
  }

  const enfases = texto.match(/\b[A-ZÀ-Ú]{3,}\b/g);
  if (enfases) {
    for (const e of enfases) beats.push({ texto: e, tipo: "enfase" });
  }

  return beats;
}

export function isStoryboardTagged(storyboard) {
  return Boolean(storyboard?.motion_tagged);
}

export function contarCenasTaggeadas(storyboard) {
  const scenes =
    storyboard?.visual_prompts ||
    storyboard?.scenes ||
    storyboard?.blocks ||
    [];
  return scenes.filter((s) => s.scene_function).length;
}

/** Enriquece história livre com marcos + tag. */
export function tagHistoricalStoryboard(storyboard, opts = {}) {
  const tagged = tagStoryboardWithMotion(storyboard, {
    ...opts,
    niche: opts.niche || "historia",
  });
  if (!tagged?.visual_prompts) return tagged;
  return {
    ...tagged,
    visual_prompts: tagged.visual_prompts.map((cena) => ({
      ...cena,
      marcos_historicos: extrairMarcosHistoricos(
        cena.narration_text || cena.narration_excerpt || ""
      ),
    })),
  };
}

/** Enriquece humor com beat points + tag. */
export function tagHumorStoryboard(storyboard, opts = {}) {
  const tagged = tagStoryboardWithMotion(storyboard, {
    format: opts.format || "9:16",
    niche: opts.niche || "humor",
  });
  if (!tagged?.visual_prompts) return tagged;
  return {
    ...tagged,
    visual_prompts: tagged.visual_prompts.map((cena) => ({
      ...cena,
      beat_points: detectarBeatPoints(
        cena.narration_text || cena.narration_excerpt || ""
      ),
    })),
  };
}
