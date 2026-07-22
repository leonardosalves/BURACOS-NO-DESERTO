/**
 * shotcraftPropsMap.js
 * Mapeia os 20 shot cards mais usados → props preenchidos a partir da narração.
 */

function resumo(narration, maxLen = 55) {
  return String(narration || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function extrairDatas(narration) {
  const anos = String(narration).match(/\b(\d{4})\b/g) || [];
  return [...new Set(anos)];
}

function extrairPalavraChave(narration) {
  const upper = String(narration).match(/\b[A-ZÀ-Ú]{4,}\b/);
  if (upper) return upper[0];
  const words = String(narration)
    .replace(/[^\w\sà-ú]/gi, "")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  return words.sort((a, b) => b.length - a.length)[0] || "";
}

function toNum(v) {
  return (
    Number(
      String(v || "0")
        .replace(/\./g, "")
        .replace(",", ".")
    ) || 0
  );
}

/**
 * Normaliza props do motion_shot para o ShotcraftLayer parameterizado.
 * Aceita chaves PT (valor/unidade) e formatos legados (dataPoints/columns).
 */
export function normalizeMotionShotProps(props = {}) {
  const p =
    props && typeof props === "object" && !Array.isArray(props)
      ? { ...props }
      : {};

  if (
    (p.value == null || p.value === "") &&
    p.valor != null &&
    p.valor !== ""
  ) {
    const n = toNum(p.valor);
    p.value = n || p.valor;
  }
  if (typeof p.value === "string" && p.value.trim() !== "") {
    const n = toNum(p.value);
    if (n || p.value === "0") p.value = n;
  }
  if (!p.unit && p.unidade) p.unit = p.unidade;
  if (!p.label && p.titulo) p.label = p.titulo;
  if (!p.title && p.label) p.title = p.label;

  if (
    (!Array.isArray(p.items) || !p.items.length) &&
    Array.isArray(p.dataPoints)
  ) {
    p.items = p.dataPoints.map((v, i) =>
      v && typeof v === "object"
        ? {
            label: v.label || String(i + 1),
            value: toNum(v.value ?? v.valor ?? v),
          }
        : { label: String(i + 1), value: toNum(v) }
    );
  }
  if (
    (!Array.isArray(p.items) || !p.items.length) &&
    Array.isArray(p.columns)
  ) {
    p.items = p.columns.map((c, i) => ({
      label: c?.label || String(i + 1),
      value: toNum(c?.value ?? c?.valor),
    }));
  }

  return p;
}

/**
 * Normaliza um motion_shot completo (props + timing defaults).
 */
export function normalizeMotionShot(shot) {
  if (!shot || typeof shot !== "object") return shot;
  const props = normalizeMotionShotProps(shot.props || {});
  const next = {
    ...shot,
    props,
  };
  if (next.start_seconds == null || Number.isNaN(Number(next.start_seconds))) {
    next.start_seconds = props.value != null && props.value !== "" ? 0.9 : 1.2;
  } else {
    next.start_seconds = Number(next.start_seconds);
  }
  if (
    next.duration_seconds == null ||
    Number.isNaN(Number(next.duration_seconds))
  ) {
    next.duration_seconds = 4;
  } else {
    next.duration_seconds = Number(next.duration_seconds);
  }
  return next;
}

export const SHOTCRAFT_PROPS_MAP = {
  "odometer-digit-roll": {
    propsSchema: {
      value: "number",
      unit: "string",
      label: "string",
      prefix: "string",
      suffix: "string",
    },
    buildProps: (ctx) => ({
      value: toNum(ctx.dados?.valor),
      unit: ctx.dados?.unidade || "",
      label: resumo(ctx.narration, 50),
      prefix: "",
      suffix: "",
      palette: ctx.palette,
    }),
  },
  "timeline-travel": {
    propsSchema: {
      milestones: "array",
      highlightIndex: "number",
    },
    buildProps: (ctx) => {
      const datas = extrairDatas(ctx.narration);
      const milestones = datas.length
        ? datas.map((year) => ({
            year,
            label: resumo(ctx.narration, 40),
            description: "",
          }))
        : [
            {
              year: ctx.dados?.ano || "—",
              label: resumo(ctx.narration, 40),
              description: "",
            },
          ];
      return {
        milestones,
        highlightIndex: milestones.length - 1,
        palette: ctx.palette,
      };
    },
  },
  "list-stack-press": {
    propsSchema: { items: "array", counterLabel: "string" },
    buildProps: (ctx) => ({
      items: ctx.scene?.ranking_items || [
        {
          rank: ctx.scene?.rank || 1,
          title: resumo(ctx.narration, 45),
          value: ctx.dados?.valor || "",
        },
      ],
      counterLabel: resumo(ctx.narration, 30),
      palette: ctx.palette,
    }),
  },
  "crane-rise-reveal": {
    propsSchema: { rows: "array", focusLabel: "string", title: "string" },
    buildProps: (ctx) => ({
      rows: ctx.scene?.dashboard_rows || [
        {
          label: resumo(ctx.narration, 30),
          value: `${ctx.dados?.valor || ""}${ctx.dados?.unidade || ""}`,
        },
      ],
      focusLabel: resumo(ctx.narration, 30),
      title: resumo(ctx.narration, 40),
      palette: ctx.palette,
    }),
  },
  "particle-sand-fill": {
    propsSchema: { columns: "array", maxValue: "number" },
    buildProps: (ctx) => {
      const columns = ctx.scene?.chart_columns || [
        {
          label: resumo(ctx.narration, 20),
          value: toNum(ctx.dados?.valor),
          color: ctx.palette?.primary,
        },
      ];
      return {
        columns,
        maxValue: Math.max(...columns.map((c) => c.value), 1),
        palette: ctx.palette,
      };
    },
  },
  "before-after-slider-scrub": {
    propsSchema: {
      beforeLabel: "string",
      afterLabel: "string",
      beforeImage: "string",
      afterImage: "string",
    },
    buildProps: (ctx) => ({
      beforeLabel: ctx.scene?.before_label || "Antes",
      afterLabel: ctx.scene?.after_label || "Depois",
      beforeImage: ctx.scene?.before_asset || "",
      afterImage: ctx.scene?.after_asset || "",
      palette: ctx.palette,
    }),
  },
  "chart-live-moves": {
    propsSchema: {
      dataPoints: "array",
      items: "array",
      style: "string",
      label: "string",
      title: "string",
    },
    buildProps: (ctx) => {
      const rawPoints = ctx.scene?.data_points ||
        ctx.scene?.chart_items || [toNum(ctx.dados?.valor) || 50];
      const items = Array.isArray(rawPoints)
        ? rawPoints.map((v, i) =>
            v && typeof v === "object"
              ? {
                  label: v.label || String(i + 1),
                  value: toNum(v.value ?? v.valor ?? v),
                }
              : { label: String(i + 1), value: toNum(v) }
          )
        : [{ label: "1", value: toNum(rawPoints) }];
      const label = resumo(ctx.narration, 40);
      return {
        dataPoints: rawPoints,
        items,
        style: ctx.scene?.chart_style || "oscilloscope-stream",
        label,
        title: label,
        palette: ctx.palette,
      };
    },
  },
  "gauge-readout-moves": {
    propsSchema: {
      value: "number",
      min: "number",
      max: "number",
      unit: "string",
      label: "string",
      style: "string",
    },
    buildProps: (ctx) => {
      const value = toNum(ctx.dados?.valor);
      return {
        value,
        min: ctx.scene?.gauge_min || 0,
        max: ctx.scene?.gauge_max || Math.max(value * 1.5, 100),
        unit: ctx.dados?.unidade || "%",
        label: resumo(ctx.narration, 30),
        style: ctx.scene?.gauge_style || "needle-sweep-selftest",
        palette: ctx.palette,
      };
    },
  },
  "spotlight-hero-card": {
    propsSchema: { card: "object", contextCards: "array" },
    buildProps: (ctx) => ({
      card: {
        title: resumo(ctx.narration, 40),
        subtitle: ctx.dados?.valor
          ? `${ctx.dados.valor}${ctx.dados.unidade || ""}`
          : "",
        image: ctx.scene?.hero_asset || "",
      },
      contextCards: ctx.scene?.context_cards || [],
      palette: ctx.palette,
    }),
  },
  "card-flip-reveal": {
    propsSchema: { front: "object", back: "object" },
    buildProps: (ctx) => ({
      front: { title: resumo(ctx.narration, 35) },
      back: {
        result: resumo(ctx.narration, 30),
        value: ctx.dados?.valor
          ? `${ctx.dados.valor}${ctx.dados.unidade || ""}`
          : "",
      },
      palette: ctx.palette,
    }),
  },
  "gradient-word-sweep": {
    propsSchema: { text: "string", highlightWord: "string" },
    buildProps: (ctx) => ({
      text: resumo(ctx.narration, 60),
      highlightWord:
        ctx.scene?.highlight_word || extrairPalavraChave(ctx.narration),
      palette: ctx.palette,
    }),
  },
  "brand-ink-open": {
    propsSchema: { wordmark: "string", subtitle: "string" },
    buildProps: (ctx) => ({
      wordmark: ctx.channelName || ctx.scene?.wordmark || "",
      subtitle: resumo(ctx.narration, 45),
      palette: ctx.palette,
    }),
  },
  "trailer-grammar-moves": {
    propsSchema: { hookText: "string", style: "string" },
    buildProps: (ctx) => ({
      hookText: resumo(ctx.narration, 50),
      style: ctx.scene?.trailer_style || "trailer-bumper",
      palette: ctx.palette,
    }),
  },
  "outro-group-photo-launch": {
    propsSchema: { wordmark: "string", subtitle: "string" },
    buildProps: (ctx) => ({
      wordmark: ctx.channelName || ctx.scene?.wordmark || "",
      subtitle: ctx.scene?.cta || "Inscreva-se",
      palette: ctx.palette,
    }),
  },
  "cel-flash-stomp": {
    propsSchema: { words: "array", colors: "array" },
    buildProps: (ctx) => {
      const words = String(ctx.narration || "")
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 5);
      const p = ctx.palette || {};
      return {
        words: words.length ? words : ["ISSO", "É", "INCRÍVEL"],
        colors: [p.primary, p.accent, p.bg, p.primary, p.accent].filter(
          Boolean
        ),
        palette: ctx.palette,
      };
    },
  },
  "impact-feedback": {
    propsSchema: { counter: "number", value: "string", style: "string" },
    buildProps: (ctx) => ({
      counter: ctx.scene?.combo || toNum(ctx.dados?.valor) || 1,
      value: ctx.dados?.valor
        ? `${ctx.dados.valor}${ctx.dados.unidade || ""}`
        : "!",
      style: ctx.scene?.impact_style || "anime-impact",
      palette: ctx.palette,
    }),
  },
  "beat-cut-moves": {
    propsSchema: { clips: "array", style: "string" },
    buildProps: (ctx) => ({
      clips: ctx.scene?.beat_clips || [],
      style: ctx.scene?.beat_style || "beat-cut-accelerando",
      palette: ctx.palette,
    }),
  },
  "space-camera-moves": {
    propsSchema: { layers: "array", style: "string" },
    buildProps: (ctx) => ({
      layers: ctx.scene?.camera_layers || [],
      style: ctx.scene?.space_style || "drone-dive-landing",
      palette: ctx.palette,
    }),
  },
  "text-as-mask": {
    propsSchema: { title: "string", footage: "string" },
    buildProps: (ctx) => ({
      title:
        ctx.scene?.mask_title ||
        extrairPalavraChave(ctx.narration) ||
        resumo(ctx.narration, 20),
      footage: ctx.scene?.mask_footage || "",
      palette: ctx.palette,
    }),
  },
  "wall-reveal-moves": {
    propsSchema: { items: "array", style: "string" },
    buildProps: (ctx) => ({
      items: ctx.scene?.wall_items || [
        { title: resumo(ctx.narration, 25), value: ctx.dados?.valor || "" },
      ],
      style: ctx.scene?.wall_style || "bento-light-up",
      palette: ctx.palette,
    }),
  },
};

export function buildShotProps(templateId, ctx) {
  const entry = SHOTCRAFT_PROPS_MAP[templateId];
  if (!entry) {
    return normalizeMotionShotProps({
      palette: ctx.palette,
      label: resumo(ctx.narration, 50),
    });
  }
  try {
    return normalizeMotionShotProps(entry.buildProps(ctx) || {});
  } catch (err) {
    console.warn(
      `[shotcraftPropsMap] falha em ${templateId}: ${err?.message || err}`
    );
    return normalizeMotionShotProps({ palette: ctx.palette });
  }
}

export function getPropsSchema(templateId) {
  return SHOTCRAFT_PROPS_MAP[templateId]?.propsSchema || null;
}

export const MAPPED_CARDS = Object.keys(SHOTCRAFT_PROPS_MAP);
export const TOTAL_MAPPED_CARDS = MAPPED_CARDS.length;
