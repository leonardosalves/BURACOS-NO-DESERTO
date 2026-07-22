/**
 * nicheVideoPlans.js
 * Planos profissionais de roteiro de vídeo por nicho.
 * Define estrutura narrativa, templates preferidos, transições, filtros e densidade.
 */

const NICHE_VIDEO_PLANS = {
  engenharia: {
    niche: "engenharia",
    label: "Engenharia / Construção",
    formats: {
      long: {
        structure: {
          abertura: { template: "brand-ink-open", dur: 3, category: "abertura" },
          hook: { template: "crane-rise-reveal", dur: 5, category: "dados" },
          development: { maxTemplates: 5, categories: ["dados", "camera", "comparacao", "elemento"] },
          climax: { template: "odometer-digit-roll", dur: 3.5, category: "dados" },
          encerramento: { template: "outro-group-photo-launch", dur: 4, category: "encerramento" },
        },
        transitions: ["shot-transitions", "transition-hidden-cut", "wipe-transitions"],
        filter: "amber-documentary",
        density: "balanced",
        minGapSeconds: 20,
        preferredTemplates: ["crane-rise-reveal", "odometer-digit-roll", "space-camera-moves", "gauge-readout-moves", "chart-live-moves"],
      },
      shorts: {
        structure: {
          hook: { template: "crash-zoom-punch", dur: 1, category: "impacto" },
          content: { maxTemplates: 2, categories: ["dados", "impacto"] },
          encerramento: { template: "edit-hook-moves", dur: 1.5, category: "encerramento" },
        },
        transitions: ["shot-transitions", "tear-streak-transitions"],
        filter: "amber-documentary",
        density: "compact",
        minGapSeconds: 8,
        preferredTemplates: ["odometer-digit-roll", "crash-zoom-punch", "particle-sand-fill"],
      },
    },
  },

  historia: {
    niche: "historia",
    label: "História / Arqueologia",
    formats: {
      long: {
        structure: {
          abertura: { template: "brand-ink-open", dur: 3.5, category: "abertura" },
          hook: { template: "document-typewriter-reveal", dur: 5, category: "timeline" },
          development: { maxTemplates: 5, categories: ["timeline", "texto", "camera", "destaque"] },
          climax: { template: "timeline-travel", dur: 5, category: "timeline" },
          encerramento: { template: "ui-strip-away-outro", dur: 4, category: "encerramento" },
        },
        transitions: ["transition-hidden-cut", "print-texture-transitions", "circle-match-iris"],
        filter: "vintage-archive",
        density: "balanced",
        minGapSeconds: 20,
        preferredTemplates: ["timeline-travel", "document-typewriter-reveal", "paper-title-card", "text-as-mask", "spotlight-sweep-moves"],
      },
      shorts: {
        structure: {
          hook: { template: "trailer-grammar-moves", dur: 2, category: "abertura" },
          content: { maxTemplates: 2, categories: ["timeline", "destaque"] },
          encerramento: { template: "edit-hook-moves", dur: 1.5, category: "encerramento" },
        },
        transitions: ["transition-hidden-cut", "shot-transitions"],
        filter: "vintage-archive",
        density: "compact",
        minGapSeconds: 8,
        preferredTemplates: ["timeline-travel", "card-flip-reveal", "gradient-word-sweep"],
      },
    },
  },

  ciencia: {
    niche: "ciencia",
    label: "Ciência / Espaço",
    formats: {
      long: {
        structure: {
          abertura: { template: "dataviz-landscape-open", dur: 4, category: "abertura" },
          hook: { template: "chart-live-moves", dur: 4.5, category: "dados" },
          development: { maxTemplates: 6, categories: ["dados", "camera", "elemento", "comparacao"] },
          climax: { template: "particle-sand-fill", dur: 4, category: "dados" },
          encerramento: { template: "outro-group-photo-launch", dur: 4, category: "encerramento" },
        },
        transitions: ["wipe-transitions", "transition-travel", "bubble-swarm-takeover"],
        filter: "cold-technical",
        density: "balanced",
        minGapSeconds: 18,
        preferredTemplates: ["chart-live-moves", "particle-sand-fill", "dataviz-landscape-open", "space-camera-moves", "ai-stream-response"],
      },
      shorts: {
        structure: {
          hook: { template: "slam-entrance-moves", dur: 2, category: "impacto" },
          content: { maxTemplates: 2, categories: ["dados", "impacto"] },
          encerramento: { template: "edit-hook-moves", dur: 1.5, category: "encerramento" },
        },
        transitions: ["wipe-transitions", "shot-transitions"],
        filter: "cold-technical",
        density: "compact",
        minGapSeconds: 8,
        preferredTemplates: ["odometer-digit-roll", "particle-sand-fill", "crash-zoom-punch"],
      },
    },
  },

  tecnologia: {
    niche: "tecnologia",
    label: "Tecnologia / Digital",
    formats: {
      long: {
        structure: {
          abertura: { template: "neon-frame-forerun", dur: 3, category: "abertura" },
          hook: { template: "spotlight-hero-card", dur: 4, category: "destaque" },
          development: { maxTemplates: 5, categories: ["elemento", "destaque", "texto", "camera"] },
          climax: { template: "command-palette-summon", dur: 4.5, category: "elemento" },
          encerramento: { template: "ui-to-brand-morph", dur: 3.5, category: "encerramento" },
        },
        transitions: ["transition-travel", "line-carry-transition", "shot-transitions"],
        filter: "cold-technical",
        density: "balanced",
        minGapSeconds: 18,
        preferredTemplates: ["spotlight-hero-card", "command-palette-summon", "type-entrance-moves", "neon-frame-forerun", "fui-hud-moves"],
      },
      shorts: {
        structure: {
          hook: { template: "neon-frame-forerun", dur: 2, category: "abertura" },
          content: { maxTemplates: 2, categories: ["destaque", "impacto"] },
          encerramento: { template: "edit-hook-moves", dur: 1.5, category: "encerramento" },
        },
        transitions: ["transition-travel", "tear-streak-transitions"],
        filter: "cold-technical",
        density: "compact",
        minGapSeconds: 8,
        preferredTemplates: ["spotlight-hero-card", "type-entrance-moves", "crash-zoom-punch"],
      },
    },
  },

  humor: {
    niche: "humor",
    label: "Humor / Entretenimento",
    formats: {
      long: {
        structure: {
          abertura: { template: "trailer-grammar-moves", dur: 2.5, category: "abertura" },
          hook: { template: "cel-flash-stomp", dur: 2.5, category: "impacto" },
          development: { maxTemplates: 6, categories: ["impacto", "texto", "elemento", "lista"] },
          climax: { template: "impact-feedback", dur: 2, category: "impacto" },
          encerramento: { template: "outro-group-photo-launch", dur: 3, category: "encerramento" },
        },
        transitions: ["shot-transitions", "tear-streak-transitions", "color-block-step-wipe"],
        filter: "vibrant-social",
        density: "energetic",
        minGapSeconds: 10,
        preferredTemplates: ["cel-flash-stomp", "beat-cut-moves", "impact-feedback", "riso-print-hits", "icon-performance-moves"],
      },
      shorts: {
        structure: {
          hook: { template: "slam-entrance-moves", dur: 1.5, category: "impacto" },
          content: { maxTemplates: 3, categories: ["impacto", "texto"] },
          encerramento: { template: "edit-hook-moves", dur: 1, category: "encerramento" },
        },
        transitions: ["tear-streak-transitions", "shot-transitions"],
        filter: "vibrant-social",
        density: "energetic",
        minGapSeconds: 5,
        preferredTemplates: ["cel-flash-stomp", "impact-feedback", "beat-cut-moves"],
      },
    },
  },

  ranking: {
    niche: "ranking",
    label: "Ranking / Listas",
    formats: {
      long: {
        structure: {
          abertura: { template: "brand-frame-snap", dur: 2.5, category: "abertura" },
          hook: { template: "list-stack-press", dur: 4, category: "lista" },
          development: { maxTemplates: 6, categories: ["lista", "dados", "destaque", "comparacao"] },
          climax: { template: "spotlight-hero-card", dur: 4, category: "destaque" },
          encerramento: { template: "outro-group-photo-launch", dur: 3.5, category: "encerramento" },
        },
        transitions: ["color-block-step-wipe", "bottom-push-stack-wipe", "shot-transitions"],
        filter: "vibrant-social",
        density: "balanced",
        minGapSeconds: 15,
        preferredTemplates: ["list-stack-press", "odometer-digit-roll", "spotlight-hero-card", "particle-sand-fill", "row-embed"],
      },
      shorts: {
        structure: {
          hook: { template: "beat-step-list-theme-cycle", dur: 3, category: "lista" },
          content: { maxTemplates: 2, categories: ["lista", "dados"] },
          encerramento: { template: "edit-hook-moves", dur: 1.5, category: "encerramento" },
        },
        transitions: ["color-block-step-wipe", "shot-transitions"],
        filter: "vibrant-social",
        density: "compact",
        minGapSeconds: 6,
        preferredTemplates: ["list-stack-press", "odometer-digit-roll", "particle-sand-fill"],
      },
    },
  },

  natureza: {
    niche: "natureza",
    label: "Natureza / Vida Selvagem",
    formats: {
      long: {
        structure: {
          abertura: { template: "brand-ink-open", dur: 3, category: "abertura" },
          hook: { template: "space-camera-moves", dur: 5, category: "camera" },
          development: { maxTemplates: 4, categories: ["camera", "dados", "texto"] },
          climax: { template: "overhead-camera-moves", dur: 4, category: "camera" },
          encerramento: { template: "outro-group-photo-launch", dur: 4, category: "encerramento" },
        },
        transitions: ["transition-hidden-cut", "circle-match-iris", "wipe-transitions"],
        filter: "nature-vivid",
        density: "minimal",
        minGapSeconds: 25,
        preferredTemplates: ["space-camera-moves", "overhead-camera-moves", "depth-layer-moves", "odometer-digit-roll"],
      },
      shorts: {
        structure: {
          hook: { template: "crash-zoom-punch", dur: 1, category: "impacto" },
          content: { maxTemplates: 1, categories: ["camera", "dados"] },
          encerramento: { template: "edit-hook-moves", dur: 1.5, category: "encerramento" },
        },
        transitions: ["transition-hidden-cut", "shot-transitions"],
        filter: "nature-vivid",
        density: "minimal",
        minGapSeconds: 10,
        preferredTemplates: ["space-camera-moves", "crash-zoom-punch"],
      },
    },
  },

  financeiro: {
    niche: "financeiro",
    label: "Financeiro / Economia",
    formats: {
      long: {
        structure: {
          abertura: { template: "brand-frame-snap", dur: 2.5, category: "abertura" },
          hook: { template: "chart-live-moves", dur: 4.5, category: "dados" },
          development: { maxTemplates: 5, categories: ["dados", "comparacao", "lista"] },
          climax: { template: "odometer-digit-roll", dur: 3.5, category: "dados" },
          encerramento: { template: "ui-strip-away-outro", dur: 3.5, category: "encerramento" },
        },
        transitions: ["wipe-transitions", "line-carry-transition", "shot-transitions"],
        filter: "clean-modern",
        density: "balanced",
        minGapSeconds: 18,
        preferredTemplates: ["chart-live-moves", "odometer-digit-roll", "before-after-slider-scrub", "particle-sand-fill", "ai-stream-response"],
      },
      shorts: {
        structure: {
          hook: { template: "odometer-digit-roll", dur: 3, category: "dados" },
          content: { maxTemplates: 2, categories: ["dados", "comparacao"] },
          encerramento: { template: "edit-hook-moves", dur: 1.5, category: "encerramento" },
        },
        transitions: ["wipe-transitions", "shot-transitions"],
        filter: "clean-modern",
        density: "compact",
        minGapSeconds: 8,
        preferredTemplates: ["odometer-digit-roll", "chart-live-moves", "before-after-slider-scrub"],
      },
    },
  },
};

// Default genérico
const DEFAULT_PLAN = {
  niche: "geral",
  label: "Geral / Documentário",
  formats: {
    long: {
      structure: {
        abertura: { template: "brand-ink-open", dur: 3, category: "abertura" },
        hook: { template: "spotlight-hero-card", dur: 4, category: "destaque" },
        development: { maxTemplates: 5, categories: ["dados", "destaque", "camera", "texto"] },
        climax: { template: "gradient-word-sweep", dur: 3, category: "texto" },
        encerramento: { template: "outro-group-photo-launch", dur: 4, category: "encerramento" },
      },
      transitions: ["shot-transitions", "transition-hidden-cut", "wipe-transitions"],
      filter: "amber-documentary",
      density: "balanced",
      minGapSeconds: 18,
      preferredTemplates: ["spotlight-hero-card", "odometer-digit-roll", "gradient-word-sweep", "timeline-travel", "card-flip-reveal"],
    },
    shorts: {
      structure: {
        hook: { template: "trailer-grammar-moves", dur: 2, category: "abertura" },
        content: { maxTemplates: 2, categories: ["impacto", "dados"] },
        encerramento: { template: "edit-hook-moves", dur: 1.5, category: "encerramento" },
      },
      transitions: ["shot-transitions", "tear-streak-transitions"],
      filter: "amber-documentary",
      density: "compact",
      minGapSeconds: 8,
      preferredTemplates: ["spotlight-hero-card", "crash-zoom-punch", "odometer-digit-roll"],
    },
  },
};

/**
 * Resolve o plano de vídeo profissional para um nicho.
 */
export function resolveNicheVideoPlan(niche = "", format = "long") {
  const n = String(niche || "").toLowerCase();
  const fmt = String(format || "").toLowerCase().includes("short") ? "shorts" : "long";

  // Match por keyword
  for (const [key, plan] of Object.entries(NICHE_VIDEO_PLANS)) {
    if (n.includes(key) || n.includes(plan.niche)) {
      return { ...plan, resolvedFormat: fmt, formatPlan: plan.formats[fmt] };
    }
  }

  // Match por regex patterns
  if (/engenh|constru|industrial|obra|m[aá]quina|militar/.test(n))
    return { ...NICHE_VIDEO_PLANS.engenharia, resolvedFormat: fmt, formatPlan: NICHE_VIDEO_PLANS.engenharia.formats[fmt] };
  if (/hist[oó]ri|antig|arqueol|medieval|ru[ií]na/.test(n))
    return { ...NICHE_VIDEO_PLANS.historia, resolvedFormat: fmt, formatPlan: NICHE_VIDEO_PLANS.historia.formats[fmt] };
  if (/ci[eê]nci|biolog|qu[ií]mic|f[ií]sic|natur|espa[cç]o/.test(n))
    return { ...NICHE_VIDEO_PLANS.ciencia, resolvedFormat: fmt, formatPlan: NICHE_VIDEO_PLANS.ciencia.formats[fmt] };
  if (/tecnolog|digital|software|ia|robot|futur|app/.test(n))
    return { ...NICHE_VIDEO_PLANS.tecnologia, resolvedFormat: fmt, formatPlan: NICHE_VIDEO_PLANS.tecnologia.formats[fmt] };
  if (/humor|gra[cç]a|com[eé]dia|engra[cç]ad|fatos/.test(n))
    return { ...NICHE_VIDEO_PLANS.humor, resolvedFormat: fmt, formatPlan: NICHE_VIDEO_PLANS.humor.formats[fmt] };
  if (/ranking|top|lista|compara|versus/.test(n))
    return { ...NICHE_VIDEO_PLANS.ranking, resolvedFormat: fmt, formatPlan: NICHE_VIDEO_PLANS.ranking.formats[fmt] };
  if (/natur|selvag|animal|floresta|oceano|bioma/.test(n))
    return { ...NICHE_VIDEO_PLANS.natureza, resolvedFormat: fmt, formatPlan: NICHE_VIDEO_PLANS.natureza.formats[fmt] };
  if (/financ|econom|invest|dinheiro|mercado|bolsa/.test(n))
    return { ...NICHE_VIDEO_PLANS.financeiro, resolvedFormat: fmt, formatPlan: NICHE_VIDEO_PLANS.financeiro.formats[fmt] };

  return { ...DEFAULT_PLAN, resolvedFormat: fmt, formatPlan: DEFAULT_PLAN.formats[fmt] };
}

/**
 * Lista todos os nichos com planos disponíveis.
 */
export function listNicheVideoPlans() {
  return Object.values(NICHE_VIDEO_PLANS).map((p) => ({
    niche: p.niche,
    label: p.label,
    formats: Object.keys(p.formats),
  }));
}

export { NICHE_VIDEO_PLANS, DEFAULT_PLAN };
