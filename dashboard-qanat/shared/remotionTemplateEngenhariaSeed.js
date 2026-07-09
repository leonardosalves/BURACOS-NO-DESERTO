/**
 * Seed do catalogo Engenharia — restaura templates do Template Studio
 * (12 Chart Data + 9 por categoria + FRAME 1 = 85 templates).
 */

import { generateEngineeringCircularProgressTemplate } from "./remotionTemplateStudioGenerate.js";
import { validateFinalTemplateCode } from "./remotionTemplateStudioValidate.js";
import { mapStudioTemplateToMotionId } from "./remotionTemplateStudioCatalog.js";

export const ENGENHARIA_SEED_CATEGORIES = [
  {
    id: "chart-data",
    label: "Chart Data",
    subcategories: [
      "Counter",
      "Bar chart",
      "Line chart",
      "Area chart",
      "Pie chart",
      "Donut chart",
      "KPI",
      "Circular Progress",
      "Progress Bar",
      "Comparison",
      "Gauge",
      "Horizontal bars",
    ],
  },
  {
    id: "text",
    label: "Text",
    subcategories: [
      "Lower third",
      "Title",
      "Quote",
      "Callout",
      "Headline",
      "Subtitle",
      "Caption",
      "Tag",
      "Label",
    ],
  },
  {
    id: "content-animation",
    label: "Content Animation",
    subcategories: [
      "Processo",
      "Timeline",
      "Comparacao",
      "Explainer",
      "Steps",
      "Flow",
      "Diagram",
      "Sequence",
      "Reveal",
    ],
  },
  {
    id: "background",
    label: "Background",
    subcategories: [
      "Grid",
      "HUD",
      "Blueprint",
      "Texture",
      "Scanlines",
      "Gradient",
      "Pattern",
      "Noise",
      "Vignette",
    ],
  },
  {
    id: "cinematic",
    label: "Cinematic",
    subcategories: [
      "Reveal",
      "Lens",
      "Depth",
      "Frame",
      "Parallax",
      "Zoom",
      "Pan",
      "Focus",
      "Sweep",
    ],
  },
  {
    id: "transition",
    label: "Transition",
    subcategories: [
      "Swipe",
      "Map zoom",
      "Match cut",
      "Glitch",
      "Fade",
      "Wipe",
      "Dissolve",
      "Slide",
      "Push",
    ],
  },
  {
    id: "logo-branding",
    label: "Logo e Branding",
    subcategories: [
      "Bug",
      "Ident",
      "Watermark",
      "Sponsor",
      "Logo reveal",
      "Brand strip",
      "End card",
      "Corner mark",
      "Tag",
    ],
  },
  {
    id: "intro-outro",
    label: "Intro e Outro",
    subcategories: [
      "Hook",
      "Chapter",
      "CTA",
      "Recap",
      "Opening",
      "Closing",
      "Teaser",
      "Credits",
      "Subscribe",
    ],
  },
  {
    id: "image-media",
    label: "Image e Media",
    subcategories: [
      "PIP media",
      "Before after",
      "Stack",
      "Gallery",
      "Picture in Picture",
      "Split screen",
      "Carousel",
      "Collage",
      "Media frame",
    ],
  },
  {
    id: "frame",
    label: "FRAME",
    subcategories: ["Frame"],
  },
];

const DEFAULT_CHART_ITEMS = `[
  { label: "Execucao", value: 34, color: "#22d3ee" },
  { label: "Planejado", value: 25, color: "#4f7cff" },
  { label: "Operacao", value: 20, color: "#facc15" },
  { label: "Restante", value: 21, color: "#ff2f8f" },
]`;

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toPascalCase(slug) {
  return String(slug || "Template")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

const ENGINEERING_BASE_PROPS = [
  "title",
  "subtitle",
  "statusText",
  "location",
  "projectCode",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
];

function uniqueProps(names = []) {
  return [...new Set(names.filter(Boolean))];
}

function propsForEntry(category, subcategory) {
  const sub = subcategory.toLowerCase();
  if (category === "chart-data") {
    if (
      sub.includes("counter") ||
      sub.includes("kpi") ||
      sub.includes("gauge")
    ) {
      return uniqueProps([
        ...ENGINEERING_BASE_PROPS,
        "value",
        "label",
        "suffix",
        "durationInFrames",
      ]);
    }
    if (sub.includes("circular") || sub.includes("progress bar")) {
      return uniqueProps([
        ...ENGINEERING_BASE_PROPS,
        "progress",
        "label",
        "suffix",
        "durationInFrames",
      ]);
    }
    return uniqueProps([
      ...ENGINEERING_BASE_PROPS,
      "chartData",
      "unit",
      "maxValue",
      "durationInFrames",
    ]);
  }
  if (category === "text") {
    return uniqueProps([...ENGINEERING_BASE_PROPS, "tag"]);
  }
  if (category === "image-media") {
    return uniqueProps([...ENGINEERING_BASE_PROPS, "mediaLabel"]);
  }
  return uniqueProps([...ENGINEERING_BASE_PROPS, "durationInFrames"]);
}

function defaultValue(name) {
  const key = String(name).toLowerCase();
  if (key === "value" || key === "progress" || key === "maxvalue") return 78;
  if (key === "durationinframes") return 84;
  if (key === "suffix") return '"%"';
  if (key === "unit") return '"%"';
  if (key === "label") return '"Completion Rate"';
  if (key === "title") return '"Structural Load Index"';
  if (key === "subtitle") return '"Live telemetry"';
  if (key === "statustext") return '"APROVADO"';
  if (key === "location") return '"Golden Gate Bridge"';
  if (key === "projectcode") return '"ENG-2048"';
  if (key === "medialabel") return '"PIP / Media"';
  if (key === "tag") return '"HUD"';
  if (key === "primarycolor") return '"#22d3ee"';
  if (key === "secondarycolor") return '"#fbbf24"';
  if (key === "accentcolor") return '"#4f7cff"';
  if (key === "backgroundcolor") return '"#0b111b"';
  if (key === "chartdata") return DEFAULT_CHART_ITEMS;
  return `"${name}"`;
}

function propType(name) {
  const key = String(name).toLowerCase();
  if (["value", "progress", "maxvalue", "durationinframes"].includes(key)) {
    return "number";
  }
  if (key === "chartdata") {
    return "Array<{ label: string; value: number; color?: string }>";
  }
  return "string";
}

function visualKind(category, subcategory) {
  const sub = subcategory.toLowerCase();
  if (category === "chart-data") {
    if (sub.includes("bar") && !sub.includes("horizontal")) return "bars";
    if (sub.includes("horizontal")) return "horizontal-bars";
    if (sub.includes("line")) return "line";
    if (sub.includes("area")) return "area";
    if (sub.includes("pie")) return "pie";
    if (sub.includes("donut")) return "donut";
    if (sub.includes("comparison")) return "comparison";
    if (sub.includes("counter") || sub.includes("kpi")) return "counter";
    if (sub.includes("gauge")) return "gauge";
    if (sub.includes("circular") || sub.includes("progress bar")) {
      return "circular";
    }
    return "bars";
  }
  if (category === "text") return "text";
  if (category === "background") return "background";
  if (category === "image-media") return "media";
  if (category === "transition") return "transition";
  if (category === "cinematic" || category === "frame") return "cinematic";
  return "panel";
}

function renderVisualBlock(kind) {
  if (kind === "circular") return "";
  if (kind === "bars") {
    return `
      <div style={{ position: "absolute", left: padX, right: padX, top: chartTop, bottom: padY + 28, display: "flex", alignItems: "flex-end", gap: isVertical ? 10 : 16 }}>
        {chartData.map((item, index) => {
          const target = (item.value / maxValue) * 100;
          const heightPct = interpolate(frame, [8 + index * 4, 34 + index * 4], [0, target], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) });
          return (
            <div key={item.label} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8, minWidth: 0 }}>
              <div style={{ height: \`\${heightPct}%\`, minHeight: 8, background: item.color || primaryColor, boxShadow: \`0 0 18px \${item.color || primaryColor}55\`, border: "1px solid rgba(255,255,255,.08)" }} />
              <div style={{ fontSize: labelFontSize, textAlign: "center", color: "#94a3b8", letterSpacing: "0.08em" }}>{item.label}</div>
            </div>
          );
        })}
      </div>`;
  }
  if (kind === "horizontal-bars" || kind === "comparison") {
    return `
      <div style={{ position: "absolute", left: padX, right: padX, top: chartTop, bottom: padY + 20, display: "grid", gap: 14 }}>
        {chartData.map((item, index) => {
          const target = (item.value / maxValue) * 100;
          const widthPct = interpolate(frame, [10 + index * 5, 38 + index * 5], [0, target], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) });
          return (
            <div key={item.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: labelFontSize, color: "#cbd5e1" }}>
                <span>{item.label}</span>
                <span style={{ color: item.color || accentColor }}>{item.value}{unit}</span>
              </div>
              <div style={{ height: 10, background: "rgba(15,23,42,.9)", border: "1px solid rgba(34,211,238,.18)" }}>
                <div style={{ width: \`\${widthPct}%\`, height: "100%", background: item.color || primaryColor, boxShadow: \`0 0 16px \${item.color || primaryColor}44\` }} />
              </div>
            </div>
          );
        })}
      </div>`;
  }
  if (kind === "line" || kind === "area") {
    return `
      <svg style={{ position: "absolute", left: padX, right: padX, top: chartTop, bottom: padY + 24, width: "calc(100% - " + padX * 2 + "px)", height: "calc(100% - " + (chartTop + padY + 24) + "px)" }} viewBox="0 0 400 220" preserveAspectRatio="none">
        <polyline fill="none" stroke="rgba(34,211,238,.18)" strokeWidth="1" points="0,220 400,220" />
        {chartData.map((item, index) => {
          const x = 40 + index * 90;
          const targetY = 200 - (item.value / maxValue) * 160;
          const y = interpolate(frame, [12 + index * 3, 40 + index * 3], [220, targetY], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <circle key={item.label} cx={x} cy={y} r={6} fill={item.color || primaryColor} />;
        })}
        <polyline
          fill={kind === "area" ? "rgba(34,211,238,.12)" : "none"}
          stroke={primaryColor}
          strokeWidth="3"
          points={chartData.map((item, index) => {
            const x = 40 + index * 90;
            const targetY = 200 - (item.value / maxValue) * 160;
            const y = interpolate(frame, [12 + index * 3, 40 + index * 3], [220, targetY], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return \`\${x},\${y}\`;
          }).join(" ")}
        />
      </svg>`;
  }
  if (kind === "pie" || kind === "donut") {
    return `
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <svg width={isVertical ? 220 : 280} height={isVertical ? 220 : 280} viewBox="0 0 220 220">
          {chartData.map((item, index) => {
            const start = (index / chartData.length) * Math.PI * 2;
            const end = ((index + 1) / chartData.length) * Math.PI * 2;
            const large = end - start > Math.PI ? 1 : 0;
            const r = kind === "donut" ? 78 : 92;
            const x1 = 110 + r * Math.cos(start);
            const y1 = 110 + r * Math.sin(start);
            const x2 = 110 + r * Math.cos(end);
            const y2 = 110 + r * Math.sin(end);
            const reveal = interpolate(frame, [10 + index * 4, 34 + index * 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            if (reveal <= 0) return null;
            return (
              <path
                key={item.label}
                d={\`M 110 110 L \${x1} \${y1} A \${r} \${r} 0 \${large} 1 \${x2} \${y2} Z\`}
                fill={item.color || primaryColor}
                opacity={reveal}
              />
            );
          })}
          {kind === "donut" ? <circle cx="110" cy="110" r="44" fill="#0b111b" /> : null}
        </svg>
      </div>`;
  }
  if (kind === "counter" || kind === "gauge") {
    return `
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: isVertical ? 64 : 84, fontWeight: 900, color: primaryColor, lineHeight: 1 }}>
            {Math.round(interpolate(frame, [0, animDuration], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}
            <span style={{ fontSize: isVertical ? 24 : 32, color: accentColor }}>{suffix}</span>
          </div>
          <div style={{ marginTop: 12, fontSize: labelFontSize, letterSpacing: "0.16em", textTransform: "uppercase", color: "#94a3b8" }}>{label}</div>
        </div>
      </div>`;
  }
  if (kind === "text") {
    return `
      <div style={{ position: "absolute", left: padX, right: padX, bottom: padY + 24, padding: "18px 22px", background: "linear-gradient(90deg, rgba(11,17,27,.92), rgba(17,24,39,.72))", borderLeft: \`4px solid \${accentColor}\`, border: "1px solid rgba(34,211,238,.24)", opacity: enter }}>
        <div style={{ fontSize: titleFontSize, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: primaryColor }}>{title}</div>
        <div style={{ marginTop: 8, fontSize: subtitleFontSize, color: "#cbd5e1" }}>{subtitle}</div>
        <div style={{ marginTop: 10, display: "inline-flex", padding: "4px 10px", border: \`1px solid \${secondaryColor}88\`, color: secondaryColor, fontSize: chipFontSize, fontWeight: 800, letterSpacing: "0.14em" }}>{tag || statusText}</div>
      </div>`;
  }
  if (kind === "media") {
    return `
      <div style={{ position: "absolute", right: padX, top: chartTop, width: isVertical ? "58%" : "42%", height: isVertical ? "34%" : "48%", border: \`2px solid \${primaryColor}\`, background: "rgba(15,23,42,.82)", boxShadow: "0 0 28px rgba(34,211,238,.18)", opacity: enter }}>
        <div style={{ position: "absolute", inset: 10, border: "1px dashed rgba(251,191,36,.45)" }} />
        <div style={{ position: "absolute", left: 12, top: 10, fontSize: chipFontSize, fontWeight: 800, letterSpacing: "0.12em", color: accentColor }}>{mediaLabel}</div>
        <div style={{ position: "absolute", left: 12, bottom: 10, fontSize: labelFontSize, color: "#94a3b8" }}>{location}</div>
      </div>`;
  }
  if (kind === "background") {
    return `
      <AbsoluteFill style={{ opacity: 0.5, backgroundImage: "linear-gradient(rgba(34,211,238,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.16) 1px, transparent 1px)", backgroundSize: isVertical ? "28px 28px" : "36px 36px", transform: \`translateY(\${interpolate(frame, [0, animDuration], [12, -12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)\` }} />
      <div style={{ position: "absolute", inset: padY, border: "1px solid rgba(34,211,238,.28)", boxShadow: "inset 0 0 0 1px rgba(251,191,36,.12)", opacity: enter }} />`;
  }
  if (kind === "transition") {
    return `
      <AbsoluteFill style={{ background: accentColor, transform: \`translateX(\${interpolate(frame, [0, 20], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%)\`, opacity: interpolate(frame, [0, 8, 20], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />`;
  }
  return `
      <div style={{ position: "absolute", left: padX, right: padX, top: chartTop, bottom: padY + 20, border: "1px solid rgba(34,211,238,.22)", background: "rgba(15,23,42,.55)", padding: 20, opacity: enter }}>
        <div style={{ fontSize: titleFontSize, fontWeight: 800, color: primaryColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</div>
        <div style={{ marginTop: 10, fontSize: bodyFontSize, color: "#cbd5e1", lineHeight: 1.5 }}>{subtitle}</div>
        <div style={{ marginTop: 18, height: 6, background: "rgba(15,23,42,.9)", border: "1px solid rgba(34,211,238,.18)" }}>
          <div style={{ width: \`\${interpolate(frame, [0, animDuration], [0, 78], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%\`, height: "100%", background: primaryColor }} />
        </div>
      </div>`;
}

function generateEngineeringTemplateSource({
  category,
  subcategory,
  propsList,
}) {
  const kind = visualKind(category, subcategory);
  if (kind === "circular") {
    return generateEngineeringCircularProgressTemplate({
      templateType: subcategory,
      subcategory,
      propsDraft: propsList.join(", "),
    });
  }

  const componentName = `${toPascalCase(subcategory)}Engenharia`;
  const typeLines = propsList
    .map((name) => `  ${name}?: ${propType(name)};`)
    .join("\n");
  const defaults = propsList
    .map((name) => `    ${name} = ${defaultValue(name)},`)
    .join("\n");
  const exampleLines = propsList
    .map((name) => `  ${name}: ${defaultValue(name)},`)
    .join("\n");
  const needsChartData = propsList.includes("chartData");
  const chartDataLine = needsChartData
    ? ""
    : `  const chartData = ${DEFAULT_CHART_ITEMS};\n`;
  const animDurationLine = propsList.includes("durationInFrames")
    ? "const animDuration = durationInFrames ?? Math.round(fps * 2.8);"
    : "const animDuration = Math.round(fps * 2.8);";

  return `"use client";

import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type ${componentName}Props = {
${typeLines}
};

export default function ${componentName}({
${defaults}
}: ${componentName}Props) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const isVertical = height > width;
  ${animDurationLine}
  const enter = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const padX = isVertical ? 36 : 64;
  const padY = isVertical ? 48 : 56;
  const chartTop = isVertical ? 132 : 118;
  const titleFontSize = isVertical ? Math.min(width * 0.13, 116) : Math.min(height * 0.16, 128);
  const subtitleFontSize = isVertical ? Math.max(18, width * 0.038) : Math.max(18, height * 0.035);
  const labelFontSize = isVertical ? Math.max(14, width * 0.03) : Math.max(13, height * 0.026);
  const chipFontSize = isVertical ? Math.max(15, width * 0.034) : Math.max(15, height * 0.03);
  const bodyFontSize = isVertical ? Math.max(16, width * 0.035) : Math.max(15, height * 0.03);
${chartDataLine}
  return (
    <AbsoluteFill
      style={{
        backgroundColor: backgroundColor,
        background:
          "radial-gradient(circle at 18% 12%, rgba(34,211,238,.12), transparent 34%), linear-gradient(180deg, #0b111b 0%, #111827 52%, #0a1018 100%)",
        color: "#e2f6ff",
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.34,
          backgroundImage:
            "linear-gradient(rgba(34,211,238,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.16) 1px, transparent 1px)",
          backgroundSize: isVertical ? "28px 28px" : "36px 36px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: padX,
          top: padY + 8,
          right: padX,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: enter,
        }}
      >
        <div>
          <div style={{ fontSize: titleFontSize * 0.72, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: primaryColor }}>
            {title}
          </div>
          <div style={{ marginTop: 6, fontSize: labelFontSize, color: "#94a3b8" }}>{subtitle}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: chipFontSize, color: "#94a3b8" }}>
          <div style={{ color: accentColor, fontWeight: 800 }}>{statusText}</div>
          <div>{projectCode}</div>
          <div>{location}</div>
        </div>
      </div>
      ${renderVisualBlock(kind)}
    </AbsoluteFill>
  );
}

export const exampleProps: ${componentName}Props = {
${exampleLines}
};
`;
}

function previewFor(category, subcategory) {
  const sub = subcategory.toLowerCase();
  if (category === "chart-data") {
    if (sub.includes("line")) return { short: "line", long: "line" };
    if (sub.includes("area")) return { short: "area", long: "area" };
    if (sub.includes("pie")) return { short: "pie", long: "pie" };
    if (sub.includes("donut")) return { short: "donut", long: "donut" };
    if (sub.includes("circular") || sub.includes("progress bar")) {
      return { short: "circular-progress", long: "circular-progress" };
    }
    if (sub.includes("counter")) return { short: "counter", long: "counter" };
    if (sub.includes("comparison") || sub.includes("horizontal")) {
      return { short: "progress-bars", long: "progress-bars" };
    }
    return { short: "bars", long: "bars" };
  }
  if (category === "text") return { short: "title", long: "title" };
  if (category === "cinematic")
    return { short: "cinematic", long: "cinematic" };
  if (category === "image-media") return { short: "media", long: "media" };
  if (category === "content-animation" || category === "transition") {
    return { short: "media", long: "bars" };
  }
  return { short: "media", long: "media" };
}

export function buildEngenhariaSeedTemplates(niche = "Engenharia") {
  const templates = [];
  for (const cat of ENGENHARIA_SEED_CATEGORIES) {
    for (const subcategory of cat.subcategories) {
      const propsList = propsForEntry(cat.id, subcategory);
      const code = generateEngineeringTemplateSource({
        category: cat.id,
        subcategory,
        propsList,
      });
      const validation = validateFinalTemplateCode(code);
      if (!validation.ok) {
        throw new Error(
          `Seed invalido ${cat.id}/${subcategory}: ${validation.errors.join("; ")}`
        );
      }
      const id = `eng-${slugify(cat.id)}-${slugify(subcategory)}`;
      const preview = previewFor(cat.id, subcategory);
      const entry = {
        id,
        name: `${niche} ${subcategory} Draft`,
        category: cat.id,
        subcategory,
        niche,
        status: "approved",
        description: `Template importado para ${cat.label} / ${subcategory}.`,
        dataSlots: propsList,
        shortPreview: preview.short,
        longPreview: preview.long,
        sourceCode: { short: code, long: code },
      };
      entry.motion_template_id = mapStudioTemplateToMotionId(entry);
      entry.orchestration_ready = Boolean(entry.motion_template_id);
      templates.push(entry);
    }
  }
  return { categories: ENGENHARIA_SEED_CATEGORIES, templates };
}

export function buildEngenhariaCatalogExport(niche = "Engenharia") {
  const { templates } = buildEngenhariaSeedTemplates(niche);
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    source: "lumiera-engenharia-seed",
    niches: {
      [niche]: {
        templates,
        updated_at: new Date().toISOString(),
      },
    },
  };
}
