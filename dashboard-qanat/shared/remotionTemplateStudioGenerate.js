/** Geradores determinísticos de templates Remotion (fallback sem placeholder). */

function toPascalCase(slug) {
  return String(slug || "Template")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function parsePropNames(raw) {
  if (Array.isArray(raw))
    return raw.map((p) => String(p).trim()).filter(Boolean);
  return String(raw || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function defaultValueForProp(name) {
  const key = String(name).toLowerCase();
  if (key === "progress" || key === "value") return 78;
  if (key === "suffix") return '"%"';
  if (key === "label") return '"Completion Rate"';
  if (key === "title") return '"Structural Load Index"';
  if (key === "subtitle") return '"Live telemetry"';
  if (key === "primarycolor") return '"#22d3ee"';
  if (key === "secondarycolor") return '"#fbbf24"';
  if (key === "accentcolor") return '"#4f7cff"';
  if (key === "backgroundcolor") return '"#0b111b"';
  return `"${name}"`;
}

function typeForProp(name) {
  const key = String(name).toLowerCase();
  if (key === "progress" || key === "value") return "number";
  return "string";
}

export function isCircularProgressTemplate(templateType, subcategory) {
  const haystack = `${templateType} ${subcategory}`.toLowerCase();
  return (
    haystack.includes("circular progress") ||
    haystack.includes("circular-progress") ||
    (haystack.includes("circular") && haystack.includes("progress"))
  );
}

export function generateEngineeringCircularProgressTemplate({
  templateType = "Circular Progress",
  subcategory = "Circular Progress",
  propsDraft = "title, subtitle, progress, label, suffix",
} = {}) {
  const componentName = `${toPascalCase(templateType || subcategory)}Engineering`;
  const props = parsePropNames(propsDraft);
  const ensured = new Set(props);
  ["title", "subtitle", "progress", "label", "suffix"].forEach((p) =>
    ensured.add(p)
  );
  const propList = [...ensured];

  const typeLines = propList
    .map((name) => {
      const optional = typeForProp(name) === "number" ? "?" : "?";
      return `  ${name}${optional}: ${typeForProp(name)};`;
    })
    .join("\n");

  const defaults = propList
    .map((name) => `    ${name} = ${defaultValueForProp(name)},`)
    .join("\n");

  const exampleLines = propList
    .map((name) => `  ${name}: ${defaultValueForProp(name)},`)
    .join("\n");

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
  const durationInFrames = Math.round(fps * 2.8);
  const animatedProgress = interpolate(
    frame,
    [0, durationInFrames],
    [0, progress],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    }
  );
  const enter = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelEnter = interpolate(frame, [16, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringRadius = isVertical ? 108 : 132;
  const stroke = isVertical ? 16 : 18;
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = circumference - (circumference * animatedProgress) / 100;
  const padX = isVertical ? 36 : 64;
  const padY = isVertical ? 48 : 56;
  const titleSize = isVertical ? 22 : 30;
  const valueSize = isVertical ? 54 : 72;
  const labelSize = isVertical ? 12 : 16;

  return (
    <AbsoluteFill
      style={{
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
          inset: padY,
          border: "1px solid rgba(34,211,238,.28)",
          boxShadow: "inset 0 0 0 1px rgba(251,191,36,.12)",
          clipPath:
            "polygon(0 14px, 14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px))",
          opacity: enter,
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
          opacity: labelEnter,
        }}
      >
        <div>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#67e8f9",
            }}
          >
            {title}
          </div>
          <div style={{ marginTop: 6, fontSize: labelSize, color: "#94a3b8" }}>
            {subtitle}
          </div>
        </div>
        <div
          style={{
            padding: "6px 10px",
            border: "1px solid rgba(251,191,36,.45)",
            color: "#fbbf24",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
          }}
        >
          HUD
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg
          width={ringRadius * 2 + stroke * 2}
          height={ringRadius * 2 + stroke * 2}
          viewBox={\`0 0 \${ringRadius * 2 + stroke * 2} \${ringRadius * 2 + stroke * 2}\`}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={ringRadius + stroke}
            cy={ringRadius + stroke}
            r={ringRadius}
            fill="none"
            stroke="rgba(15,23,42,.95)"
            strokeWidth={stroke}
          />
          <circle
            cx={ringRadius + stroke}
            cy={ringRadius + stroke}
            r={ringRadius}
            fill="none"
            stroke="rgba(34,211,238,.18)"
            strokeWidth={stroke}
            strokeDasharray={\`\${circumference * 0.08} \${circumference}\`}
          />
          <circle
            cx={ringRadius + stroke}
            cy={ringRadius + stroke}
            r={ringRadius}
            fill="none"
            stroke="#22d3ee"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div style={{ position: "absolute", textAlign: "center" }}>
          <div style={{ fontSize: valueSize, fontWeight: 900, lineHeight: 1 }}>
            {Math.round(animatedProgress)}
            <span style={{ fontSize: valueSize * 0.34, color: "#67e8f9" }}>
              {suffix}
            </span>
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: labelSize,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#94a3b8",
              opacity: labelEnter,
            }}
          >
            {label}
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          bottom: padY,
          height: 6,
          background: "rgba(15,23,42,.9)",
          border: "1px solid rgba(34,211,238,.22)",
        }}
      >
        <div
          style={{
            width: \`\${animatedProgress}%\`,
            height: "100%",
            background: "linear-gradient(90deg, rgba(34,211,238,.25), #22d3ee)",
            boxShadow: "0 0 18px rgba(34,211,238,.35)",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: padX,
          bottom: padY + 18,
          width: isVertical ? 84 : 120,
          height: 1,
          background: "rgba(251,191,36,.75)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: padX,
          bottom: padY + 18,
          width: isVertical ? 84 : 120,
          height: 1,
          background: "rgba(251,191,36,.75)",
        }}
      />
    </AbsoluteFill>
  );
}

export const exampleProps: ${componentName}Props = {
${exampleLines}
};
`;
}

export function generateAdaptedTemplateLocally({
  niche,
  templateType,
  subcategory,
  propsDraft,
}) {
  if (
    niche === "Engenharia" &&
    isCircularProgressTemplate(templateType, subcategory)
  ) {
    return generateEngineeringCircularProgressTemplate({
      templateType,
      subcategory,
      propsDraft,
    });
  }

  if (isCircularProgressTemplate(templateType, subcategory)) {
    return generateEngineeringCircularProgressTemplate({
      templateType,
      subcategory,
      propsDraft,
    });
  }

  return null;
}
