import React, { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  ArrowLeft,
  BadgeCheck,
  Braces,
  Check,
  Code2,
  Copy,
  Eye,
  Film,
  Layers3,
  PencilRuler,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

type TemplateCategory =
  | "maps"
  | "chart-data"
  | "text"
  | "content-animation"
  | "background"
  | "cinematic"
  | "transition"
  | "logo-branding"
  | "intro-outro"
  | "image-media";

type TemplateItem = {
  id: string;
  name: string;
  category: TemplateCategory;
  subcategory: string;
  niche: string;
  status: "approved" | "draft";
  description: string;
  dataSlots: string[];
  sourceCode: {
    short: string;
    long: string;
  };
  shortPreview: "ring" | "map" | "bars" | "title" | "media";
  longPreview: "line" | "map" | "bars" | "cinematic" | "media";
};

const CATEGORIES: Array<{
  id: TemplateCategory;
  label: string;
  subcategories: string[];
}> = [
  {
    id: "maps",
    label: "Mapas",
    subcategories: ["PIP mapa", "Flyover", "Mapa antigo", "Pin regional"],
  },
  {
    id: "chart-data",
    label: "Chart Data",
    subcategories: ["Counter", "Bar chart", "Line chart", "KPI"],
  },
  {
    id: "text",
    label: "Text",
    subcategories: ["Lower third", "Title", "Quote", "Callout"],
  },
  {
    id: "content-animation",
    label: "Content Animation",
    subcategories: ["Processo", "Timeline", "Comparacao", "Explainer"],
  },
  {
    id: "background",
    label: "Background",
    subcategories: ["Grid", "HUD", "Blueprint", "Texture"],
  },
  {
    id: "cinematic",
    label: "Cinematic",
    subcategories: ["Reveal", "Lens", "Depth", "Frame"],
  },
  {
    id: "transition",
    label: "Transition",
    subcategories: ["Swipe", "Map zoom", "Match cut", "Glitch"],
  },
  {
    id: "logo-branding",
    label: "Logo e Branding",
    subcategories: ["Bug", "Ident", "Watermark", "Sponsor"],
  },
  {
    id: "intro-outro",
    label: "Intro e Outro",
    subcategories: ["Hook", "Chapter", "CTA", "Recap"],
  },
  {
    id: "image-media",
    label: "Image e Media",
    subcategories: ["PIP media", "Before after", "Stack", "Gallery"],
  },
];

const NICHES = [
  "Engenharia",
  "Historia",
  "Financas",
  "Tecnologia",
  "Misterio",
  "Natureza",
];

const TEMPLATES: TemplateItem[] = [
  {
    id: "eng-map-pip-tactical",
    name: "Engineering Tactical Map PIP",
    category: "maps",
    subcategory: "PIP mapa",
    niche: "Engenharia",
    status: "approved",
    description: "Mapa em janela tecnica para shorts, fora da area de legenda.",
    dataSlots: ["locationName", "coordinates", "siteRef", "map"],
    sourceCode: {
      short:
        'export function EngineeringTacticalMapPipShort({locationName, coordinates, siteRef, map}) {\n  return <EngineeringMapPipOverlay format="9:16" pipRect={{x:535,y:420,width:450,height:245}} locationName={locationName} coordinates={coordinates} siteRef={siteRef} map={map} />;\n}',
      long: 'export function EngineeringTacticalMapFullscreen({locationName, coordinates, siteRef, map}) {\n  return <EngineeringMapFullscreen format="16:9" locationName={locationName} coordinates={coordinates} siteRef={siteRef} map={map} />;\n}',
    },
    shortPreview: "map",
    longPreview: "map",
  },
  {
    id: "geo-continuous-flyover",
    name: "Continuous Geo Flyover",
    category: "maps",
    subcategory: "Flyover",
    niche: "Engenharia",
    status: "approved",
    description:
      "Zoom continuo regiao, pais, cidade e alvo com orbit 360 para POI.",
    dataSlots: ["lat", "lng", "place_type", "flyover_video"],
    sourceCode: {
      short:
        'export function ContinuousGeoFlyoverShort({lat, lng, place_type, flyover_video}) {\n  return <GeoFlyoverPip format="9:16" lat={lat} lng={lng} placeType={place_type} video={flyover_video} maxDuration={10} />;\n}',
      long: 'export function ContinuousGeoFlyoverLong({lat, lng, place_type, flyover_video}) {\n  return <GeoFlyoverScene format="16:9" lat={lat} lng={lng} placeType={place_type} video={flyover_video} maxDuration={20} />;\n}',
    },
    shortPreview: "map",
    longPreview: "cinematic",
  },
  {
    id: "industrial-kpi-ring",
    name: "Industrial KPI Ring",
    category: "chart-data",
    subcategory: "Counter",
    niche: "Engenharia",
    status: "approved",
    description: "Indicador circular com leitura tecnica para metricas curtas.",
    dataSlots: ["value", "label", "suffix"],
    sourceCode: {
      short:
        "export function IndustrialKpiRingShort({value = 78, label = 'Completion Rate', suffix = '%'}) {\n  return <KpiRingCompact format=\"9:16\" value={value} label={label} suffix={suffix} />;\n}",
      long: "export function IndustrialKpiRingLong({value = 78, label = 'Completion Rate', suffix = '%'}) {\n  return <KpiRingDashboard format=\"16:9\" value={value} label={label} suffix={suffix} />;\n}",
    },
    shortPreview: "ring",
    longPreview: "line",
  },
  {
    id: "engineering-bar-grid",
    name: "Engineering Bar Grid",
    category: "chart-data",
    subcategory: "Bar chart",
    niche: "Engenharia",
    status: "approved",
    description: "Barras SVG com grid tecnico e cores por serie.",
    dataSlots: ["title", "items", "source"],
    sourceCode: {
      short:
        'export function EngineeringBarGridShort({title, items, source}) {\n  return <AnimatedBarGrid format="9:16" title={title} items={items.slice(0, 4)} source={source} />;\n}',
      long: 'export function EngineeringBarGridLong({title, items, source}) {\n  return <AnimatedBarGrid format="16:9" title={title} items={items} source={source} />;\n}',
    },
    shortPreview: "bars",
    longPreview: "bars",
  },
  {
    id: "blueprint-lower-third",
    name: "Blueprint Lower Third",
    category: "text",
    subcategory: "Lower third",
    niche: "Engenharia",
    status: "draft",
    description: "Texto ancorado em placa CAD, nunca solto sobre o video.",
    dataSlots: ["title", "subtitle", "tag"],
    sourceCode: {
      short:
        'export function BlueprintLowerThirdShort({title, subtitle, tag}) {\n  return <CadLowerThird format="9:16" safeZone="captions-clear" title={title} subtitle={subtitle} tag={tag} />;\n}',
      long: 'export function BlueprintLowerThirdLong({title, subtitle, tag}) {\n  return <CadLowerThird format="16:9" title={title} subtitle={subtitle} tag={tag} />;\n}',
    },
    shortPreview: "title",
    longPreview: "media",
  },
  {
    id: "structural-process",
    name: "Structural Process Steps",
    category: "content-animation",
    subcategory: "Processo",
    niche: "Engenharia",
    status: "draft",
    description: "Sequencia de processo com linhas, etapas e marcadores.",
    dataSlots: ["steps", "currentStep", "caption"],
    sourceCode: {
      short:
        'export function StructuralProcessStepsShort({steps, currentStep, caption}) {\n  return <ProcessTimelineStack format="9:16" steps={steps} currentStep={currentStep} caption={caption} />;\n}',
      long: 'export function StructuralProcessStepsLong({steps, currentStep, caption}) {\n  return <ProcessTimelineWide format="16:9" steps={steps} currentStep={currentStep} caption={caption} />;\n}',
    },
    shortPreview: "media",
    longPreview: "bars",
  },
];

type DetailTab = "preview" | "source";
type DetailFormat = "short" | "long";

type PreviewVariant =
  TemplateItem["shortPreview"] | TemplateItem["longPreview"];

function RemotionTemplatePreview({
  format,
  variant,
}: {
  format: "9:16" | "16:9";
  variant: PreviewVariant;
}) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const progress = interpolate(frame % (fps * 3), [0, fps * 3 - 1], [0, 1]);
  const enter = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const isVertical = format === "9:16";
  const palette = ["#4f7cff", "#7c2dff", "#22d3ee", "#ff2f8f"];
  const bars = [42, 80, 34, 72, 56, 92];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0b111b",
        color: "white",
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.28,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.13) 1px, transparent 1px)",
          backgroundSize: `${Math.round(width / 9)}px ${Math.round(width / 9)}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(34,211,238,.22), transparent 28%), linear-gradient(135deg, rgba(14,165,233,.08), transparent 55%)",
          transform: `translateY(${interpolate(progress, [0, 1], [-height * 0.12, height * 0.12])}px)`,
        }}
      />

      {variant === "ring" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg
            width={isVertical ? 120 : 170}
            height={isVertical ? 120 : 170}
            viewBox="0 0 180 180"
          >
            <circle
              cx="90"
              cy="90"
              r="64"
              fill="none"
              stroke="#1f2a44"
              strokeWidth="18"
            />
            <circle
              cx="90"
              cy="90"
              r="64"
              fill="none"
              stroke="#4f7cff"
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray="402"
              strokeDashoffset={
                402 - 402 * interpolate(progress, [0, 1], [0.18, 0.78])
              }
              transform="rotate(-90 90 90)"
            />
            <circle
              cx="90"
              cy="90"
              r="64"
              fill="none"
              stroke="#ff2f8f"
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray="402"
              strokeDashoffset={
                402 - 402 * interpolate(progress, [0, 1], [0.06, 0.22])
              }
              transform="rotate(170 90 90)"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              textAlign: "center",
              scale: enter,
            }}
          >
            <div style={{ fontSize: isVertical ? 23 : 38, fontWeight: 900 }}>
              78%
            </div>
            <div style={{ color: "#a7b0c2", fontSize: isVertical ? 8 : 13 }}>
              Completion Rate
            </div>
          </div>
        </div>
      )}

      {variant === "bars" && (
        <div
          style={{
            position: "absolute",
            left: width * 0.1,
            right: width * 0.1,
            bottom: height * 0.14,
            height: height * 0.54,
            display: "flex",
            alignItems: "end",
            gap: isVertical ? 5 : 12,
          }}
        >
          {bars.map((bar, index) => {
            const barProgress = interpolate(
              frame,
              [index * 5, index * 5 + 24],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }
            );
            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: `${bar * barProgress}%`,
                  backgroundColor: palette[index % palette.length],
                  borderRadius: "4px 4px 0 0",
                  boxShadow: `0 0 18px ${palette[index % palette.length]}55`,
                }}
              />
            );
          })}
        </div>
      )}

      {variant === "line" && (
        <svg
          viewBox="0 0 520 260"
          style={{
            position: "absolute",
            inset: isVertical ? "28% 6% 14%" : "18% 8% 12%",
            width: "auto",
            height: "auto",
          }}
        >
          <path
            d="M20 210 L95 145 L160 165 L250 75 L340 105 L490 35"
            fill="none"
            stroke="#5d7cff"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="640"
            strokeDashoffset={640 - 640 * enter}
          />
          <path
            d="M20 210 L95 145 L160 165 L250 75 L340 105 L490 35 L490 235 L20 235 Z"
            fill="rgba(66,103,255,.22)"
            opacity={enter}
          />
        </svg>
      )}

      {variant === "map" && (
        <div
          style={{
            position: "absolute",
            inset: isVertical ? "18% 12% 16%" : "14% 10%",
            border: "2px solid rgba(34,211,238,.68)",
            borderRadius: 10,
            backgroundColor: "rgba(8,47,73,.44)",
            transform: `scale(${interpolate(progress, [0, 1], [1, 1.18])}) translate(${interpolate(progress, [0, 1], [0, -width * 0.018])}px, ${interpolate(progress, [0, 1], [0, height * 0.018])}px)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "48%",
              top: "45%",
              width: isVertical ? 14 : 20,
              height: isVertical ? 14 : 20,
              borderRadius: 999,
              backgroundColor: "#67e8f9",
              boxShadow: "0 0 28px #22d3ee",
              scale: interpolate(progress, [0, 0.5, 1], [0.78, 1.35, 0.78]),
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 14,
              height: 4,
              backgroundColor: "#fbbf24",
              borderRadius: 999,
            }}
          />
        </div>
      )}

      {variant === "title" && (
        <div
          style={{
            position: "absolute",
            left: width * 0.12,
            right: width * 0.12,
            top: "50%",
            borderLeft: "4px solid #67e8f9",
            paddingLeft: isVertical ? 12 : 22,
            translate: `${interpolate(enter, [0, 1], [-40, 0])}px -50%`,
            opacity: enter,
          }}
        >
          <div
            style={{
              height: isVertical ? 12 : 20,
              width: "76%",
              borderRadius: 999,
              backgroundColor: "white",
            }}
          />
          <div
            style={{
              marginTop: 12,
              height: isVertical ? 8 : 14,
              width: "48%",
              borderRadius: 999,
              backgroundColor: "#22d3ee",
            }}
          />
        </div>
      )}

      {(variant === "cinematic" || variant === "media") && (
        <div
          style={{
            position: "absolute",
            inset: isVertical ? "18% 11%" : "14% 11%",
            borderRadius: 10,
            border: "1px solid rgba(251,191,36,.45)",
            background:
              "linear-gradient(135deg, rgba(113,113,122,.9), rgba(9,9,11,.95) 48%, rgba(8,47,73,.86))",
            transform: `scale(${interpolate(progress, [0, 1], [1.02, 1.14])}) translateX(${interpolate(progress, [0, 1], [0, -width * 0.018])}px)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "10%",
              bottom: "12%",
              width: "42%",
              height: "28%",
              border: "1px solid rgba(255,255,255,.35)",
              borderRadius: 4,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "12%",
              top: "12%",
              width: isVertical ? 32 : 52,
              height: isVertical ? 32 : 52,
              borderRadius: 999,
              backgroundColor: "rgba(251,191,36,.7)",
              filter: "blur(8px)",
            }}
          />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 10,
          top: 10,
          borderRadius: 4,
          backgroundColor: "rgba(0,0,0,.68)",
          padding: "4px 7px",
          fontSize: isVertical ? 10 : 13,
          fontWeight: 800,
        }}
      >
        {format === "9:16" ? "Shorts" : "Longos"}
      </div>
    </AbsoluteFill>
  );
}

function PreviewFrame({
  format,
  variant,
  size = "card",
}: {
  format: "9:16" | "16:9";
  variant: PreviewVariant;
  size?: "card" | "detail";
}) {
  const vertical = format === "9:16";
  const dimensions =
    size === "detail"
      ? vertical
        ? { width: 270, height: 480, className: "w-[154px] sm:w-[190px]" }
        : {
            width: 640,
            height: 360,
            className: "w-[280px] sm:w-[430px] lg:w-[520px]",
          }
      : vertical
        ? { width: 162, height: 288, className: "w-[92px]" }
        : { width: 304, height: 171, className: "w-[190px]" };

  return (
    <div
      className={`overflow-hidden rounded-[6px] border border-white/10 bg-[#0b111b] shadow-lg shadow-black/30 ${dimensions.className}`}
    >
      <Player
        component={RemotionTemplatePreview}
        inputProps={{ format, variant }}
        durationInFrames={90}
        fps={30}
        compositionWidth={dimensions.width}
        compositionHeight={dimensions.height}
        style={{ width: "100%" }}
        controls
        loop
        autoPlay
        clickToPlay
        spaceKeyToPlayOrPause
      />
    </div>
  );
}

function TemplateDetailPanel({
  template,
  activeTab,
  activeFormat,
  copied,
  onTabChange,
  onFormatChange,
  onCopy,
  onBack,
}: {
  template: TemplateItem;
  activeTab: DetailTab;
  activeFormat: DetailFormat;
  copied: boolean;
  onTabChange: (tab: DetailTab) => void;
  onFormatChange: (format: DetailFormat) => void;
  onCopy: () => void;
  onBack: () => void;
}) {
  const activeSource = template.sourceCode[activeFormat];
  const activePreview =
    activeFormat === "short" ? template.shortPreview : template.longPreview;
  const activeAspectRatio = activeFormat === "short" ? "9:16" : "16:9";

  return (
    <section className="bg-[#0e1522]">
      <div className="border-b border-white/10 px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-zinc-300 hover:border-cyan-300/50 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para Templates
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-white">{template.name}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-300">
              {template.description}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase ${
              template.status === "approved"
                ? "bg-emerald-400/12 text-emerald-300"
                : "bg-amber-300/12 text-amber-200"
            }`}
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            {template.status === "approved" ? "Aprovado" : "Rascunho"}
          </span>
        </div>
      </div>

      <div className="px-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg border border-b-0 border-white/10 bg-[#111827]">
          <div className="flex">
            <button
              type="button"
              onClick={() => onTabChange("preview")}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${
                activeTab === "preview"
                  ? "border-blue-400 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => onTabChange("source")}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${
                activeTab === "source"
                  ? "border-blue-400 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Code2 className="h-4 w-4" />
              Source Code
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => onFormatChange("short")}
                className={`rounded px-2.5 py-1 text-xs font-black ${
                  activeFormat === "short"
                    ? "bg-cyan-300 text-slate-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                9:16 Shorts
              </button>
              <button
                type="button"
                onClick={() => onFormatChange("long")}
                className={`rounded px-2.5 py-1 text-xs font-black ${
                  activeFormat === "long"
                    ? "bg-cyan-300 text-slate-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                16:9 Longos
              </button>
            </div>
            <button
              type="button"
              onClick={onCopy}
              className="mr-2 inline-flex items-center gap-2 rounded-md bg-black/30 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-black/50 hover:text-white"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-300" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="min-h-[430px] overflow-hidden rounded-b-lg border border-white/10 bg-[#162030]">
          {activeTab === "preview" ? (
            <div className="grid min-h-[430px] place-items-center px-4 py-5">
              <div className="flex flex-wrap items-center justify-center gap-8">
                <div className="space-y-2">
                  <p className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    {activeFormat === "short" ? "Shorts 9:16" : "Longos 16:9"}
                  </p>
                  <PreviewFrame
                    format={activeAspectRatio}
                    variant={activePreview}
                    size="detail"
                  />
                </div>
              </div>
            </div>
          ) : (
            <pre className="min-h-[430px] overflow-auto p-5 text-left font-mono text-xs leading-relaxed text-cyan-50">
              <code>{activeSource}</code>
            </pre>
          )}
        </div>
      </div>
      <div className="grid gap-4 border-t border-white/10 p-4 lg:grid-cols-[1fr_280px]">
        <section>
          <h4 className="text-sm font-black text-white">Description</h4>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Template Remotion com preview executado pelo Player oficial, props
            declaradas e codigo separado para Shorts 9:16 e Longos 16:9.
          </p>
        </section>
        <section>
          <h4 className="text-sm font-black text-white">Data slots</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {template.dataSlots.map((slot) => (
              <span
                key={slot}
                className="rounded bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-zinc-300"
              >
                {slot}
              </span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export function RemotionTemplateStudio({
  projectNiche,
}: {
  activeProject: string;
  projectNiche: string;
}) {
  const initialNiche = NICHES.includes(projectNiche)
    ? projectNiche
    : "Engenharia";
  const [niche, setNiche] = useState(initialNiche);
  const [category, setCategory] = useState<TemplateCategory>("maps");
  const [subcategory, setSubcategory] = useState("PIP mapa");
  const [selectedId, setSelectedId] = useState("eng-map-pip-tactical");
  const [detailTemplateId, setDetailTemplateId] = useState("");
  const [templates, setTemplates] = useState<TemplateItem[]>(TEMPLATES);
  const [detailTab, setDetailTab] = useState<DetailTab>("preview");
  const [detailFormat, setDetailFormat] = useState<DetailFormat>("short");
  const [copiedTemplateId, setCopiedTemplateId] = useState("");
  const [codeDraft, setCodeDraft] = useState(
    "export function MyTemplate(props) {\n  return <AbsoluteFill>{/* cole seu template aqui */}</AbsoluteFill>;\n}"
  );
  const [aiBrief, setAiBrief] = useState(
    "Adaptar para Engenharia, com versao 9:16 e 16:9, sem texto solto e com props editaveis."
  );

  const subcategories =
    CATEGORIES.find((c) => c.id === category)?.subcategories || [];
  const visibleTemplates = useMemo(
    () =>
      templates.filter(
        (t) =>
          t.niche === niche &&
          t.category === category &&
          (!subcategory || t.subcategory === subcategory)
      ),
    [category, niche, subcategory, templates]
  );
  const detailTemplate = visibleTemplates.find(
    (t) => t.id === detailTemplateId
  );
  const selected =
    visibleTemplates.find((t) => t.id === selectedId) ||
    visibleTemplates[0] ||
    null;

  useEffect(() => {
    setDetailTemplateId("");
    setDetailTab("preview");
    setDetailFormat("short");
    setSelectedId(visibleTemplates[0]?.id || "");
  }, [category, niche, subcategory, visibleTemplates]);

  function deleteTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    const shouldDelete = window.confirm(
      `Excluir o template "${template.name}"?`
    );
    if (!shouldDelete) return;
    setTemplates((current) => current.filter((item) => item.id !== templateId));
    if (detailTemplateId === templateId) {
      setDetailTemplateId("");
    }
    if (selectedId === templateId) {
      const nextTemplate = visibleTemplates.find(
        (item) => item.id !== templateId
      );
      setSelectedId(nextTemplate?.id || "");
    }
  }

  async function copyTemplateSource(template?: TemplateItem) {
    if (!template) return;
    try {
      await navigator.clipboard.writeText(template.sourceCode[detailFormat]);
      setCopiedTemplateId(`${template.id}:${detailFormat}`);
      window.setTimeout(() => setCopiedTemplateId(""), 1600);
    } catch {
      window.alert("Nao foi possivel copiar o codigo automaticamente.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[280px_1fr_360px]">
        <aside className="rounded-lg border border-white/10 bg-[#0b0f17] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-cyan-300" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Nicho
              </p>
              <p className="text-sm font-bold text-white">Catalogo global</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {NICHES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setNiche(item)}
                className={`rounded-md border px-3 py-2 text-left text-xs font-bold ${
                  niche === item
                    ? "border-cyan-300 bg-cyan-300/12 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-400"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Categorias
            </p>
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCategory(item.id);
                  setSubcategory(item.subcategories[0] || "");
                }}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs font-bold ${
                  category === item.id
                    ? "border-blue-400 bg-blue-500/12 text-white"
                    : "border-white/10 bg-white/[0.025] text-zinc-400"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] text-zinc-600">
                  {item.subcategories.length}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="rounded-lg border border-white/10 bg-[#101622]">
          <div className="border-b border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                  Showcase
                </p>
                <h2 className="text-xl font-black text-white">
                  {niche} / {CATEGORIES.find((c) => c.id === category)?.label}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {subcategories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSubcategory(item)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                      subcategory === item
                        ? "border-amber-300 bg-amber-300/14 text-amber-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-400"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {detailTemplate ? (
            <TemplateDetailPanel
              template={detailTemplate}
              activeTab={detailTab}
              activeFormat={detailFormat}
              copied={
                copiedTemplateId === `${detailTemplate.id}:${detailFormat}`
              }
              onTabChange={setDetailTab}
              onFormatChange={setDetailFormat}
              onCopy={() => copyTemplateSource(detailTemplate)}
              onBack={() => setDetailTemplateId("")}
            />
          ) : (
            <div className="grid gap-4 p-4 2xl:grid-cols-2">
              {visibleTemplates.map((template) => (
                <article
                  key={template.id}
                  onClick={() => {
                    setSelectedId(template.id);
                    setDetailTemplateId(template.id);
                    setDetailTab("preview");
                    setDetailFormat("short");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(template.id);
                      setDetailTemplateId(template.id);
                      setDetailTab("preview");
                      setDetailFormat("short");
                    }
                  }}
                  tabIndex={0}
                  className={`overflow-hidden rounded-lg border bg-[#111722] text-left shadow-xl shadow-black/20 ${
                    selected?.id === template.id
                      ? "border-cyan-300/70"
                      : "border-white/10"
                  }`}
                >
                  <div className="flex gap-3 border-b border-white/10 bg-[#0c121d] p-3">
                    <PreviewFrame
                      format="9:16"
                      variant={template.shortPreview}
                    />
                    <PreviewFrame
                      format="16:9"
                      variant={template.longPreview}
                    />
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="text-base font-black text-white">
                        {template.name}
                      </h3>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                            template.status === "approved"
                              ? "bg-emerald-400/12 text-emerald-300"
                              : "bg-amber-300/12 text-amber-200"
                          }`}
                        >
                          <BadgeCheck className="h-3 w-3" />
                          {template.status === "approved"
                            ? "Aprovado"
                            : "Rascunho"}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteTemplate(template.id);
                          }}
                          className="grid h-7 w-7 place-items-center rounded-md border border-red-400/20 bg-red-500/10 text-red-200 hover:border-red-300/60 hover:bg-red-500/20"
                          title="Excluir template"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="min-h-[38px] text-sm leading-relaxed text-zinc-400">
                      {template.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {template.dataSlots.map((slot) => (
                        <span
                          key={slot}
                          className="rounded bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-zinc-300"
                        >
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
              {!visibleTemplates.length && (
                <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">
                  Nenhum template aprovado nessa combinacao ainda.
                </div>
              )}
            </div>
          )}
        </main>

        <aside className="space-y-4">
          <section className="rounded-lg border border-white/10 bg-[#0b0f17] p-4">
            <div className="mb-3 flex items-center gap-2">
              <PencilRuler className="h-4 w-4 text-amber-300" />
              <h3 className="text-sm font-black text-white">
                Criar / editar com IA
              </h3>
            </div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              Briefing de modificacao
            </label>
            <textarea
              value={aiBrief}
              onChange={(e) => setAiBrief(e.target.value)}
              className="min-h-[104px] w-full resize-y rounded-md border border-white/10 bg-black/30 p-3 text-xs text-zinc-200 outline-none focus:border-cyan-300"
            />
            <label className="mb-2 mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              Template code
            </label>
            <textarea
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              className="min-h-[210px] w-full resize-y rounded-md border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-zinc-200 outline-none focus:border-cyan-300"
              spellCheck={false}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Assistir IA
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200"
              >
                <Plus className="h-3.5 w-3.5" />
                Salvar draft
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-[#0b0f17] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Braces className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-black text-white">
                Contrato do template
              </h3>
            </div>
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-white">
                    {selected.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(selected.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-400/20 bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-200 hover:border-red-300/60 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Todo template aprovado precisa ter preview 9:16 e 16:9, props
                  declaradas e safe zones de legenda.
                </p>
                <div className="mt-3 space-y-2">
                  {selected.dataSlots.map((slot) => (
                    <div
                      key={slot}
                      className="flex items-center justify-between rounded border border-white/10 px-3 py-2 text-xs"
                    >
                      <span className="font-mono text-zinc-300">{slot}</span>
                      <Copy className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                Nenhum template selecionado.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-red-400/20 bg-red-950/10 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Film className="h-4 w-4 text-red-300" />
              <h3 className="text-sm font-black text-red-100">
                Regra de orquestracao
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-red-100/70">
              Shorts usam no maximo 1 template Remotion. Longos usam ate 8.
              Texto solto sem template aprovado nao entra automaticamente.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
