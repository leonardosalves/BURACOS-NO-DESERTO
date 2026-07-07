/**
 * Design tokens por nicho — props Remotion personalizados (tipografia, paleta, easing).
 */

export const NICHE_DESIGN_PACKS = {
  "documentary-prestige": {
    accentColor: "#D4AF37",
    secondaryColor: "#8B7355",
    theme: "ancient",
    fontDisplay: "Cinzel",
    fontBody: "Cormorant Garamond",
    lowerThirdVariant: "glass",
    chartStyle: "cinematic",
    kineticEasing: "ease-out",
    customStyle: {
      filmGrain: 0.12,
      vignette: 0.35,
      serifHeadlines: true,
    },
  },
  "data-journalist": {
    accentColor: "#00E5FF",
    secondaryColor: "#FFFFFF",
    theme: "minimal",
    fontDisplay: "IBM Plex Sans",
    fontBody: "IBM Plex Sans",
    lowerThirdVariant: "flat",
    chartStyle: "high-contrast",
    kineticEasing: "linear",
    customStyle: {
      gridLines: true,
      dataLabels: true,
      monochrome: false,
    },
  },
  "geography-explorer": {
    accentColor: "#4CAF50",
    secondaryColor: "#1B5E20",
    theme: "earth",
    fontDisplay: "Montserrat",
    fontBody: "Source Sans 3",
    lowerThirdVariant: "map",
    chartStyle: "terrain",
    kineticEasing: "ease-in-out",
    customStyle: {
      mapDominant: true,
      earthTones: true,
      boundaryGlow: 1.2,
    },
  },
  "mystery-reveal": {
    accentColor: "#E53935",
    secondaryColor: "#212121",
    theme: "dramatic",
    fontDisplay: "Bebas Neue",
    fontBody: "Roboto",
    lowerThirdVariant: "shadow",
    chartStyle: "spotlight",
    kineticEasing: "sharp",
    customStyle: {
      dramaticReveal: true,
      pulseAccent: true,
      darkBackdrop: 0.72,
    },
  },
  "social-proof": {
    accentColor: "#FF4081",
    secondaryColor: "#FFFFFF",
    theme: "viral",
    fontDisplay: "Poppins",
    fontBody: "Poppins",
    lowerThirdVariant: "bold",
    chartStyle: "rounded",
    kineticEasing: "bounce",
    customStyle: {
      boldNumbers: true,
      emojiAccent: false,
      highSaturation: true,
    },
  },
  "industrial-impact": {
    accentColor: "#FF6B35",
    secondaryColor: "#78909C",
    theme: "technical",
    fontDisplay: "Rajdhani",
    fontBody: "IBM Plex Sans",
    lowerThirdVariant: "steel",
    chartStyle: "engineering",
    kineticEasing: "sharp",
    customStyle: {
      gridLines: true,
      blueprint: true,
      steelTexture: true,
      hazardStripes: false,
    },
  },
};

export function resolveNicheDesignPack(packId = "documentary-prestige") {
  const id = String(packId || "").trim() || "documentary-prestige";
  return NICHE_DESIGN_PACKS[id] || NICHE_DESIGN_PACKS["documentary-prestige"];
}

export function buildDesignPropsForTemplate(templateId, pack) {
  const tokens = pack || resolveNicheDesignPack();
  const tpl = String(templateId || "");
  const out = {
    accentColor: tokens.accentColor,
    design_tokens: { ...tokens },
    customStyle: { ...(tokens.customStyle || {}) },
  };
  if (tpl === "lower-third") {
    out.variant = tokens.lowerThirdVariant || "glass";
    out.theme = tokens.theme;
  }
  if (tpl === "bar-chart" || tpl === "pictogram-chart") {
    out.theme = tokens.theme;
    out.chartStyle = tokens.chartStyle;
  }
  if (tpl === "kinetic-text") {
    out.theme = tokens.theme;
    out.easing = tokens.kineticEasing;
  }
  if (tpl === "counter" || tpl === "timeline") {
    out.theme = tokens.theme;
  }
  if (tpl === "location-intro" || tpl === "geo-map") {
    out.accentColor = tokens.accentColor;
  }
  return out;
}

export function applyNicheDesignPack(
  scene = {},
  packId = "documentary-prestige"
) {
  const id =
    String(packId || scene.niche_pack || "").trim() || "documentary-prestige";
  const pack = resolveNicheDesignPack(id);
  const templateId = String(scene.template_id || "");
  const designProps = buildDesignPropsForTemplate(templateId, pack);
  return {
    ...scene,
    niche_pack: id,
    props: {
      ...(scene.props || {}),
      ...designProps,
      design_tokens: {
        pack_id: id,
        fontDisplay: pack.fontDisplay,
        fontBody: pack.fontBody,
        secondaryColor: pack.secondaryColor,
        theme: pack.theme,
        chartStyle: pack.chartStyle,
        kineticEasing: pack.kineticEasing,
        customStyle: pack.customStyle,
      },
    },
  };
}

export function applyNicheDesignToMotionScenes(
  motionScenes = [],
  packId = "documentary-prestige"
) {
  return (Array.isArray(motionScenes) ? motionScenes : []).map((ms) =>
    applyNicheDesignPack(ms, packId || ms.niche_pack)
  );
}

export function nicheDesignPromptBlock(packId = "documentary-prestige") {
  const pack = resolveNicheDesignPack(packId);
  return [
    `DESIGN PACK "${packId}":`,
    `- accentColor: ${pack.accentColor}`,
    `- theme: ${pack.theme}`,
    `- tipografia display: ${pack.fontDisplay}, corpo: ${pack.fontBody}`,
    `- chartStyle: ${pack.chartStyle}`,
    `- customStyle: ${JSON.stringify(pack.customStyle)}`,
    "- Injete design_tokens + customStyle em props de cada cena.",
  ].join("\n");
}
