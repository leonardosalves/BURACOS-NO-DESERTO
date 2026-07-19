import {
  buildSceneOptions,
  formatOverlayTime,
  isSceneId,
  resolveSceneSeconds,
} from "./overlayEditorConfig";

export type MotionSceneDraft = {
  id: string;
  scene_ref?: string;
  block?: number;
  start_hint?: number;
  duration_seconds?: number;
  template_id: string;
  trigger?: string;
  layout?: string;
  narration_text?: string;
  props?: Record<string, unknown>;
  media_mode?: string;
  research_backed?: boolean;
};

export const MOTION_TEMPLATE_LABELS: Record<string, string> = {
  "location-intro": "Mapa / local",
  "geo-map": "Pin regional",
  counter: "Contador",
  "bar-chart": "Gráfico barras",
  "pictogram-chart": "Pictograma",
  timeline: "Cronologia",
  "lower-third": "Lower third",
  "kinetic-text": "Texto cinético",
};

export const MOTION_TEMPLATE_OPTIONS = [
  "counter",
  "bar-chart",
  "timeline",
  "lower-third",
  "location-intro",
  "geo-map",
  "pictogram-chart",
] as const;

type ContentField = {
  key: string;
  label: string;
  kind: "text" | "number" | "textarea";
  placeholder?: string;
};

const COMMON_PROPS: ContentField[] = [
  { key: "title", label: "Título", kind: "text" },
  { key: "subtitle", label: "Subtítulo", kind: "textarea" },
  { key: "source", label: "Fonte", kind: "text" },
];

export const MOTION_CONTENT_FIELDS: Record<string, ContentField[]> = {
  counter: [
    { key: "value", label: "Valor", kind: "number" },
    { key: "suffix", label: "Sufixo", kind: "text", placeholder: "%" },
    { key: "label", label: "Rótulo", kind: "text" },
    ...COMMON_PROPS.filter((f) => f.key !== "title"),
  ],
  "bar-chart": [
    { key: "title", label: "Título do gráfico", kind: "text" },
    { key: "source", label: "Fonte", kind: "text" },
  ],
  timeline: [
    { key: "title", label: "Título", kind: "text" },
    { key: "source", label: "Fonte", kind: "text" },
  ],
  "lower-third": [
    { key: "title", label: "Título", kind: "text" },
    { key: "subtitle", label: "Fato técnico", kind: "textarea" },
    { key: "source", label: "Fonte", kind: "text" },
  ],
  "location-intro": [
    { key: "location", label: "Local", kind: "text" },
    { key: "region", label: "Região", kind: "text" },
    { key: "country", label: "País", kind: "text" },
    { key: "subtitle", label: "Legenda", kind: "textarea" },
    {
      key: "ai_video_prompt",
      label: "Prompt IA Geo (T2V)",
      kind: "textarea",
      placeholder:
        "Zoom Terra→alvo, destaque territorial, órbita 360° — gere com Seedance",
    },
  ],
  "geo-map": [
    { key: "location", label: "Local", kind: "text" },
    { key: "region", label: "Região", kind: "text" },
    {
      key: "ai_video_prompt",
      label: "Prompt IA Geo (T2V)",
      kind: "textarea",
    },
  ],
  "pictogram-chart": [
    { key: "title", label: "Título", kind: "text" },
    { key: "source", label: "Fonte", kind: "text" },
  ],
};

export function normalizeMotionScenes(
  raw: unknown,
  starts: number[] = []
): MotionSceneDraft[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((s) => s && typeof s === "object")
    .map((s, index) => {
      const scene = s as MotionSceneDraft;
      const ref = String(scene.scene_ref || "").trim();
      let start = Number(scene.start_hint);
      if (!Number.isFinite(start) && ref && isSceneId(ref)) {
        const resolved = resolveSceneSeconds(ref, starts);
        if (resolved != null) start = resolved;
      }
      return {
        ...scene,
        id: String(scene.id || `ms-${index + 1}`),
        template_id: String(scene.template_id || "lower-third"),
        media_mode: scene.media_mode || "remotion",
        start_hint: Number.isFinite(start) ? start : 0,
        duration_seconds: Math.max(0.5, Number(scene.duration_seconds) || 4),
        props: { ...(scene.props || {}) },
      };
    });
}

export function motionSceneSummary(scene: MotionSceneDraft): string {
  const props = scene.props || {};
  const bits = [
    props.label,
    props.title,
    props.subtitle,
    props.location,
    props.value != null ? String(props.value) : "",
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return bits[0] || scene.narration_text?.slice(0, 60) || "—";
}

export function sceneOptionsFromStoryboard(
  visualPrompts: Array<{
    scene?: string;
    block?: number;
    narration_text?: string;
  }>,
  starts: number[]
) {
  return buildSceneOptions(visualPrompts).map((opt) => ({
    ...opt,
    seconds: resolveSceneSeconds(opt.id, starts),
  }));
}

export { formatOverlayTime, isSceneId, resolveSceneSeconds };
