export type CreatorScenePlanRow = {
  sceneRef: string;
  block: number;
  kind: "remotion" | "broll";
  label: string;
  templateId?: string;
  trigger?: string;
  narrationPreview: string;
  hasAsset: boolean;
};

export type CreatorProductionPlanSummary = {
  remotionCount: number;
  brollCount: number;
  motionScenes: Array<{
    id: string;
    scene_ref: string;
    template_id: string;
    trigger?: string;
    start_hint?: number;
    label: string;
  }>;
  rows: CreatorScenePlanRow[];
  orchestration?: {
    orchestration_ok?: boolean;
    motion_count?: number;
    quality_score?: number;
    quality_ok?: boolean;
    niche_pack?: string;
    pending_asset_slots?: number;
  };
};

const TEMPLATE_LABELS: Record<string, string> = {
  "location-intro": "Mapa / local",
  counter: "Contador",
  "bar-chart": "Gráfico barras",
  timeline: "Cronologia",
  "kinetic-text": "Texto cinético",
  "lower-third": "Lower third",
  "geo-map": "Pin mapa",
  "pictogram-chart": "Pictograma",
};

function sceneRef(vp: Record<string, unknown>): string {
  return String(vp.scene || vp.scene_ref || "").trim();
}

function blockNum(vp: Record<string, unknown>): number {
  return Number(vp.block) || 1;
}

function narrationPreview(text: string, max = 72): string {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function motionLabel(ms: Record<string, unknown>): string {
  const props = (ms.props || {}) as Record<string, unknown>;
  return String(
    props.location ||
      props.label ||
      props.text ||
      props.title ||
      ms.template_id ||
      ms.id
  );
}

export function buildCreatorProductionPlan(
  storyboard: Record<string, unknown> | null | undefined
): CreatorProductionPlanSummary | null {
  if (!storyboard) return null;

  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  const motionScenes = Array.isArray(storyboard.motion_scenes)
    ? storyboard.motion_scenes
    : [];

  const motionByRef = new Map(
    motionScenes
      .filter((ms) => String(ms.scene_ref || "").trim())
      .map((ms) => [String(ms.scene_ref), ms])
  );

  const rows: CreatorScenePlanRow[] = [];
  let remotionCount = 0;
  let brollCount = 0;

  for (const raw of visualPrompts) {
    const vp = raw as Record<string, unknown>;
    const ref = sceneRef(vp);
    if (!ref) continue;
    const ms = motionByRef.get(ref);
    const isRemotion =
      String(vp.media_mode || "").toLowerCase() === "remotion" || Boolean(ms);
    const nested = vp.asset as { asset?: string } | undefined;
    const hasAsset = Boolean(
      String(vp.asset || "").trim() || String(nested?.asset || "").trim()
    );

    if (isRemotion && ms) {
      remotionCount += 1;
      const tpl = String(ms.template_id || "");
      rows.push({
        sceneRef: ref,
        block: blockNum(vp),
        kind: "remotion",
        label: TEMPLATE_LABELS[tpl] || tpl || "Remotion",
        templateId: tpl,
        trigger: String(ms.trigger || ""),
        narrationPreview: narrationPreview(
          String(vp.narration_text || ms.narration_text || "")
        ),
        hasAsset,
      });
    } else {
      brollCount += 1;
      const type = String(vp.type || "mídia").trim();
      rows.push({
        sceneRef: ref,
        block: blockNum(vp),
        kind: "broll",
        label:
          type.includes("vídeo") || type.includes("video")
            ? "Vídeo B-roll"
            : "Imagem B-roll",
        narrationPreview: narrationPreview(String(vp.narration_text || "")),
        hasAsset,
      });
    }
  }

  rows.sort((a, b) => {
    const [ab, as] = a.sceneRef.split(".").map(Number);
    const [bb, bs] = b.sceneRef.split(".").map(Number);
    return ab !== bb ? ab - bb : as - bs;
  });

  const orch = storyboard.production_orchestration as
    CreatorProductionPlanSummary["orchestration"] | undefined;

  return {
    remotionCount,
    brollCount,
    motionScenes: motionScenes.map((ms) => ({
      id: String(ms.id || ""),
      scene_ref: String(ms.scene_ref || ""),
      template_id: String(ms.template_id || ""),
      trigger: ms.trigger ? String(ms.trigger) : undefined,
      start_hint: Number(ms.start_hint) || 0,
      label: motionLabel(ms as Record<string, unknown>),
    })),
    rows,
    orchestration: orch,
  };
}
