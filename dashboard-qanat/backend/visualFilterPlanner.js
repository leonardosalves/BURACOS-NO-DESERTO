/**
 * visualFilterPlanner.js
 * Atribui filtros visuais / color grading por cena baseado no estilo visual,
 * nicho e tipo de asset. Integrado ao productionOrchestrator.
 */

import { resolveNicheMotionPrefs } from "./nicheMotionPreferences.js";

/**
 * Presets de filtro visual por estilo.
 */
export const FILTER_PRESETS = {
  "amber-documentary": {
    id: "amber-documentary",
    label: "Âmbar Documental",
    css: "sepia(0.15) saturate(1.1) contrast(1.05) brightness(0.98)",
    overlay: "rgba(245, 166, 35, 0.04)",
    grain: 0.03,
    vignette: 0.15,
    temperature: "warm",
  },
  "cold-technical": {
    id: "cold-technical",
    label: "Frio Técnico",
    css: "saturate(0.9) contrast(1.1) brightness(1.02) hue-rotate(-5deg)",
    overlay: "rgba(74, 158, 255, 0.03)",
    grain: 0,
    vignette: 0.05,
    temperature: "cold",
  },
  "cinematic-dark": {
    id: "cinematic-dark",
    label: "Cinematográfico Escuro",
    css: "contrast(1.12) saturate(1.05) brightness(0.95)",
    overlay: "rgba(0, 80, 100, 0.05)",
    grain: 0.04,
    vignette: 0.25,
    temperature: "teal-orange",
  },
  "vibrant-social": {
    id: "vibrant-social",
    label: "Vibrante Social",
    css: "saturate(1.25) contrast(1.05) brightness(1.05)",
    overlay: "rgba(255, 100, 50, 0.02)",
    grain: 0,
    vignette: 0,
    temperature: "neutral",
  },
  "vintage-archive": {
    id: "vintage-archive",
    label: "Arquivo Vintage",
    css: "sepia(0.3) saturate(0.8) contrast(0.95) brightness(1.02)",
    overlay: "rgba(180, 140, 80, 0.06)",
    grain: 0.06,
    vignette: 0.2,
    temperature: "warm",
  },
  "nature-vivid": {
    id: "nature-vivid",
    label: "Natureza Vívida",
    css: "saturate(1.2) contrast(1.05) brightness(1.0) hue-rotate(3deg)",
    overlay: "rgba(50, 180, 80, 0.02)",
    grain: 0.01,
    vignette: 0.1,
    temperature: "neutral",
  },
  "noir-dramatic": {
    id: "noir-dramatic",
    label: "Noir Dramático",
    css: "grayscale(0.3) contrast(1.2) brightness(0.9)",
    overlay: "rgba(0, 0, 0, 0.05)",
    grain: 0.05,
    vignette: 0.3,
    temperature: "cold",
  },
  "clean-modern": {
    id: "clean-modern",
    label: "Limpo Moderno",
    css: "contrast(1.02) saturate(1.0) brightness(1.0)",
    overlay: "transparent",
    grain: 0,
    vignette: 0,
    temperature: "neutral",
  },
};

/**
 * Mapeia nicho → filtro padrão.
 */
const NICHE_FILTER_MAP = {
  engenharia: "amber-documentary",
  construcao: "amber-documentary",
  industrial: "cold-technical",
  historia: "vintage-archive",
  arqueologia: "vintage-archive",
  ciencia: "cold-technical",
  espaco: "cinematic-dark",
  tecnologia: "cold-technical",
  digital: "clean-modern",
  humor: "vibrant-social",
  ranking: "vibrant-social",
  natureza: "nature-vivid",
  biologia: "nature-vivid",
  financeiro: "clean-modern",
  saude: "clean-modern",
  educacao: "clean-modern",
  misterio: "noir-dramatic",
  crime: "noir-dramatic",
};

/**
 * Mapeia visual_asset_style (do identity brief) → filtro.
 */
const STYLE_FILTER_MAP = {
  "amber-documentary": "amber-documentary",
  "cold-technical": "cold-technical",
  "cinematic-dark": "cinematic-dark",
  "vibrant-social": "vibrant-social",
  "vintage-archive": "vintage-archive",
  "nature-vivid": "nature-vivid",
  "noir-dramatic": "noir-dramatic",
  "clean-modern": "clean-modern",
};

/**
 * Resolve o filtro para uma cena baseado em múltiplos sinais.
 */
export function resolveFilterForScene({
  niche = "",
  visualAssetStyle = "",
  assetType = "",
  sceneFunction = "",
} = {}) {
  // 1. Visual asset style tem prioridade (vem do identity brief)
  const styleKey = String(visualAssetStyle || "").toLowerCase().replace(/\s+/g, "-");
  if (STYLE_FILTER_MAP[styleKey]) {
    return FILTER_PRESETS[STYLE_FILTER_MAP[styleKey]];
  }

  // 2. Nicho
  const nicheLower = String(niche || "").toLowerCase();
  for (const [key, filterId] of Object.entries(NICHE_FILTER_MAP)) {
    if (nicheLower.includes(key)) {
      return FILTER_PRESETS[filterId];
    }
  }

  // 3. Tipo de asset
  const asset = String(assetType || "").toLowerCase();
  if (asset.includes("stock") || asset.includes("pexels")) {
    return FILTER_PRESETS["cinematic-dark"];
  }
  if (asset.includes("imagem ia") || asset.includes("image")) {
    return FILTER_PRESETS["clean-modern"];
  }

  // 4. Default
  return FILTER_PRESETS["amber-documentary"];
}

/**
 * Aplica filtros a todos os visual prompts do storyboard.
 * Retorna storyboard com filter_preset e filter_props em cada VP.
 */
export function applyVisualFiltersToStoryboard(storyboard = {}, config = {}) {
  const niche = String(
    config.niche ||
    storyboard.strategy?.niche ||
    storyboard._vpe_checklist?.nicho_detectado ||
    ""
  );
  const visualAssetStyle = String(
    storyboard.visual_identity_brief?.visual_asset_style ||
    config.visual_asset_style ||
    ""
  );

  const visualPrompts = (storyboard.visual_prompts || []).map((vp) => {
    const assetType = String(vp.type || vp.asset?.type || "");
    const sceneFunction = Array.isArray(vp.scene_function)
      ? vp.scene_function[0] || ""
      : String(vp.scene_function || "");

    const filter = resolveFilterForScene({
      niche,
      visualAssetStyle,
      assetType,
      sceneFunction,
    });

    return {
      ...vp,
      filter_preset: filter.id,
      filter_props: {
        css: filter.css,
        overlay: filter.overlay,
        grain: filter.grain,
        vignette: filter.vignette,
        temperature: filter.temperature,
      },
    };
  });

  return { ...storyboard, visual_prompts };
}

/**
 * Aplica filtros às motion scenes (para render).
 */
export function applyVisualFiltersToMotionScenes(motionScenes = [], {
  niche = "",
  visualAssetStyle = "",
} = {}) {
  return (Array.isArray(motionScenes) ? motionScenes : []).map((scene) => {
    const filter = resolveFilterForScene({
      niche,
      visualAssetStyle,
      assetType: scene.asset_type || "",
      sceneFunction: scene.trigger || "",
    });
    return {
      ...scene,
      filter_preset: filter.id,
      filter_props: {
        css: filter.css,
        overlay: filter.overlay,
        grain: filter.grain,
        vignette: filter.vignette,
        temperature: filter.temperature,
      },
    };
  });
}
