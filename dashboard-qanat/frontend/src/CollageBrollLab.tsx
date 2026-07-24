import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe2,
  History,
  Layers,
  Loader2,
  Map as MapIcon,
  MapPin,
  Palette,
  RefreshCw,
  Shuffle,
  Scissors,
  Square,
  Wand2,
  X,
  Film,
  Github,
  Image as ImageIcon,
  AlertTriangle,
  ArrowRight,
  Download,
  Eye,
  CheckCircle2,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";

type ScriptAnalysis = {
  domain?: string;
  subdomain?: string;
  mainTopic?: string;
  thesis?: string;
  educationalGoal?: string;
  geographicScale?: string;
  locations?: string[];
  phenomena?: string[];
  recurringVisualElements?: string[];
  tone?: string;
  factualSensitivity?: string;
};

type LineAnalysis = {
  plainMeaning?: string;
  requiredVisualAnchors?: string[];
  geographicEntities?: string[];
  recommendedVisualMode?: string;
  visualIntent?: string;
};

type VisualProposal = {
  visualMode?: string;
  primarySubject?: string;
  semanticAnchors?: string[];
  supportingMetaphor?: string;
  composition?: string;
  objects?: string[];
  geographicRelationships?: string[];
  assemblySteps?: string[];
};

type Validation = {
  semanticAlignment?: number;
  entityCoverage?: number;
  geographicRelevance?: number;
  factualRisk?: number;
  fiveSecondClarity?: number;
  decision?: string;
  revisionInstruction?: string;
  missingAnchors?: string[];
  irrelevantObjects?: string[];
};

type CardStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "editing"
  | "regenerating"
  | "candidate_ready"
  | "needs_review"
  | "error";

type ScoreDiff = {
  metric: string;
  label: string;
  before: number | null;
  after: number | null;
};

/** Campos de proposta serializáveis no histórico (sem candidata/recursão). */
type CollageProposalFields = {
  id?: string;
  line?: string;
  mode?: string;
  core_meaning?: string;
  emotion?: string;
  visual_proposition?: string;
  place_name?: string;
  region?: string;
  country?: string;
  map_type?: string;
  era?: string;
  key_objects?: string[];
  background_color?: { name: string; hex: string };
  accent_colors?: string[];
  assembly_order?: string[];
  action_verb?: string;
  lineAnalysis?: LineAnalysis;
  visualProposal?: VisualProposal;
  validation?: Validation;
};

type CardVersionSnapshot = {
  version: number;
  createdAt: string;
  regenerationInstruction?: string;
  quickFixes?: string[];
  rejectionReasons?: string[];
  proposal: CollageProposalFields;
  validation?: Validation | null;
};

type CollageItem = CollageProposalFields & {
  id: string;
  line: string;
  core_meaning: string;
  emotion: string;
  visual_proposition: string;
  key_objects: string[];
  background_color: { name: string; hex: string };
  accent_colors: string[];
  assembly_order: string[];
  action_verb: string;
  status: CardStatus;
  gate: number;
  rejectionNote?: string;
  isModifiedSpec?: boolean;
  generationRunId?: string;
  layers?: any;
  composition?: any;
  rejectedAt?: string;
  visual_spec?: Record<string, unknown>;
  imagegen_prompt?: string;
  omni_prompt?: string;
  still_note?: string;
  still_url?: string;
  still_path?: string;
  first_frame_url?: string;
  last_frame_url?: string;
  first_frame_path?: string;
  last_frame_path?: string;
  still_approved?: boolean;
  still_status?: string;
  still_model?: string;
  video_url?: string;
  video_path?: string;
  video_status?: string;
  video_note?: string;
  video_mode?: string;
  /** Dual-frame pipeline (Fase 1) */
  animationMode?: string;
  startFrame?: {
    description?: string;
    imagePrompt?: string;
    imageUrl?: string;
    imagePath?: string;
    status?: string;
    approved?: boolean;
    fromEndFrame?: boolean;
    model?: string;
  };
  endFrame?: {
    description?: string;
    imagePrompt?: string;
    imageUrl?: string;
    imagePath?: string;
    status?: string;
    approved?: boolean;
    model?: string;
  };
  motion?: {
    description?: string;
    videoPrompt?: string;
    durationSeconds?: number;
    preset?: string;
  };
  frameConsistency?: {
    lockedElements?: string[];
    movingElements?: string[];
    appearingElements?: string[];
    disappearingElements?: string[];
    forbiddenChanges?: string[];
    staticElements?: string[];
  };
  approvalStatus?: string;
  activeVersion?: number;
  versions?: CardVersionSnapshot[];
  candidate?: CollageItem | null;
  candidateMeta?: {
    changes?: string[];
    scoreDiffs?: ScoreDiff[];
    warnings?: string[];
  } | null;
  lastError?: string;
  rejectionReason?: string;
  rejectionReasons?: string[];
};

function isGeoItem(item: any) {
  return (
    String(item?.mode || "")
      .trim()
      .toLowerCase() === "geo"
  );
}

const STUDIO_LIGHTING =
  "top-down macro tabletop studio lighting, single large diffused softbox from upper-left, gentle fill card on the right, soft contact shadows anchoring every paper piece to the surface, subtle ambient occlusion where layers overlap";

const PAPER_MATERIALS =
  "matte uncoated paper stock, visible cotton fiber and deckle grain, hand-scissor-cut and razor-cut edges with tiny frayed micro-burrs, warm-cream 1–2px keyline halos, layered cut-outs casting soft low-opacity drop shadows at consistent angle, faint fingerprint-free tactile surface";

const HALFTONE_LOOK =
  "black-and-white photographic cut-outs printed in coarse newspaper halftone dot screen (vintage book/risograph feel), high-contrast grayscale, slight ink misregistration";

const CAMERA_RIG =
  "locked orthographic overhead camera, no lens distortion, shallow but flat tabletop depth, everything tack-sharp and in plane";

const HARD_NEGATIVES_BASE =
  "no typography, no readable letters, no numerals, no logos, no watermark, no UI chrome, no subtitles, no captions, no glossy 3D render, no plastic sheen, no photoreal environment, no CGI gloss, no clutter, no busy background";

function buildImagegenPrompt(item: any) {
  const geo = isGeoItem(item);
  const hex = item?.background_color?.hex || (geo ? "#0B3D5C" : "#3D2463");
  const name =
    item?.background_color?.name || (geo ? "ocean ink" : "deep purple");
  const prop =
    item?.visual_proposition || item?.core_meaning || "editorial metaphor";
  const accents = (item?.accent_colors || ["cream", "teal"]).join(", ");
  const place = [item?.place_name, item?.region, item?.country]
    .filter(Boolean)
    .join(", ");
  const mapType = item?.map_type || "territory_outline";
  const era = item?.era ? ` Historical map era cue: ${item.era}.` : "";

  if (geo) {
    return `Use case: ads-marketing
Asset type: final still frame for a 9:16 image-to-video geographic B-roll clip
Primary request: Create a finished, museum-quality editorial paper-collage MAP composition expressing ${prop}.${place ? ` Place focus: ${place}.` : ""}${era}
Map type: ${mapType}.
Scene/backdrop: perfectly flat, evenly lit ${name} paper field ${hex} with subtle parchment / atlas-paper fiber grain; wide clean negative space.
Style/medium: premium editorial stop-motion paper collage of classic cartography — ${HALFTONE_LOOK}; country/city silhouettes as solid flat-color cardstock shapes; hand-punched dotted paper travel routes; folded map creases; paper push-pins and torn-corner flags; optional compass-rose and legend cardstock accents in ${accents}.
Lighting: ${STUDIO_LIGHTING}.
Camera: ${CAMERA_RIG}.
Composition/framing: vertical 9:16 locked poster frame; primary territory/route sits within the safe central 70 percent, away from all four edges; strong asymmetric editorial balance; 3–6 large, clearly separable paper map layers designed for an assemble-from-empty animation.
Materials/textures: ${PAPER_MATERIALS}; crisp cut continental coastlines; printed map grain; tactile folded-atlas feel.
Constraints: the geographic relationship must read at a glance — ${item?.core_meaning || prop}. Silhouettes must feel accurate for named real places; use abstract cartography only when the concept is non-literal.
Avoid: ${HARD_NEGATIVES_BASE}, no readable street names, no Google/Apple Maps UI, no GPS HUD, no photoreal 3D city flythrough, no satellite-photo realism.`;
  }

  const conceptStr = place ? ` Key visual concept/subject: ${place}.` : "";
  const styleStr =
    item?.region || item?.country
      ? ` Style/Tone focus: ${[item.region, item.country].filter(Boolean).join(", ")}.`
      : "";
  const moodStr = item?.era ? ` Mood/Era cue: ${item.era}.` : "";

  return `Use case: ads-marketing
Asset type: final still frame for a 9:16 image-to-video B-roll clip
Primary request: Create a finished, museum-quality editorial paper-collage composition expressing ${prop}.${conceptStr}${styleStr}${moodStr}
Scene/backdrop: perfectly flat, evenly lit ${name} paper field ${hex} with subtle uncoated paper fiber grain; wide clean negative space.
Style/medium: premium editorial stop-motion paper collage; ${HALFTONE_LOOK} combined with selective solid flat-color cardstock accents in ${accents}.
Lighting: ${STUDIO_LIGHTING}.
Camera: ${CAMERA_RIG}.
Composition/framing: vertical 9:16 locked poster frame; central subject held within the safe central 70 percent, clear of all four edges; strong asymmetric editorial balance; 3–6 large, clearly separable paper groups designed for an assemble-from-empty animation.
Materials/textures: ${PAPER_MATERIALS}; visible coarse halftone dots; thin warm-cream keylines.
Constraints: the visual metaphor must be readable at a glance — ${item?.core_meaning || prop}.
Avoid: ${HARD_NEGATIVES_BASE}.`;
}

function buildEndFrameImagePrompt(item: any) {
  return (
    buildImagegenPrompt(item) +
    `

END FRAME REQUIREMENTS (source of truth for the entire clip):
- This is the FINAL, fully-assembled state of the paper collage.
- Every intended paper cut-out is completely visible and physically settled in its final resting position, each casting its own soft contact shadow.
- Centered, balanced, finished assembly that reads clearly within 5 seconds.
- Vertical 9:16 locked poster; nothing cropped, nothing bleeding off-frame.
- Absolutely no text, labels, letters, numerals, logos, or watermark.
- This exact image will be the LAST frame of the video — lock lighting, palette, shadow direction and paper texture as the canonical reference.`
  );
}

function buildStartFrameImagePrompt(item: any) {
  const geo = isGeoItem(item);
  const hex = item?.background_color?.hex || (geo ? "#0B3D5C" : "#3D2463");
  const name =
    item?.background_color?.name || (geo ? "ocean ink" : "deep purple");
  const objects = (item.visualProposal?.objects || item.key_objects || []).map(
    String
  );
  const moving = objects.slice(0, 4);

  const offscreenPlan =
    moving.length >= 2
      ? `Move the exact cut-out "${moving[0]}" fully off-frame past the upper-left edge (only a hint of its shadow may remain). Move the exact cut-out "${moving[1]}" fully off-frame past the lower-right edge. Any remaining background/structure pieces stay EXACTLY where they are in the end frame. Keep the central 70 percent essentially empty — only the bare paper field.`
      : moving.length === 1
        ? `Move the exact cut-out "${moving[0]}" fully off-frame past the nearest edge, staged and ready to slide in. Keep the central 70 percent essentially empty — only the bare paper field.`
        : `Show only the bare, flat paper field with all foreground cut-outs removed; the surface is clean and ready for assembly.`;

  return `Use case: ads-marketing
Asset type: START FRAME (empty / pre-assembly state) for a 9:16 paper-collage image-to-video clip
Primary request: Recreate the INITIAL, pre-assembly state of the SAME editorial paper collage that resolves into the already-approved end composition. This is an image-to-image continuity task, NOT a new design.
Scene/backdrop: the IDENTICAL flat ${name} paper field ${hex} — same exact hue, same fiber grain / parchment texture, same ${STUDIO_LIGHTING}.
Style/medium: premium editorial stop-motion paper collage${geo ? " of cartography" : ""}; ${HALFTONE_LOOK}; solid flat-color cardstock accents — all matching the end frame precisely.
Camera: ${CAMERA_RIG} — IDENTICAL framing, focal plane and crop to the end frame.
Staging: ${offscreenPlan}
STRICT CONSISTENCY (must match end frame pixel-for-pixel where unchanged): background color and texture, lighting direction and softness, shadow angle, halftone dot scale, cardstock colors, cut-edge style, keyline color, object identity, silhouette and scale of every retained piece.
Constraints: fromEndFrame=true — do NOT redesign, recolor, rescale, or restyle anything. ONLY reposition or remove the moving foreground pieces to represent the "before assembly" moment. Removed pieces are simply off-frame, not altered.
Avoid: ${geo ? "no morphing or reshaping of geographic silhouettes, " : ""}no new objects, no new background, no lighting change, no palette shift, no texture change, no text, no labels, no letters, no logos, no watermark.`;
}

function buildConsistencyBlock(consistency: any) {
  if (!consistency || typeof consistency !== "object") return "";

  const c = consistency;
  const lines = [];

  const palette = c.palette || c.colors || c.locked_palette;
  if (palette) {
    const flat = Array.isArray(palette)
      ? palette
          .map((p) =>
            typeof p === "string"
              ? p
              : [p?.name, p?.hex].filter(Boolean).join(" ")
          )
          .filter(Boolean)
          .join(", ")
      : String(palette);
    if (flat) lines.push(`- Locked palette (do not shift): ${flat}.`);
  }

  const bg = c.background_hex || c.background_color?.hex || c.bg_hex;
  if (bg) lines.push(`- Locked background field: exactly ${bg}.`);

  if (c.shadow_angle || c.shadow_direction) {
    lines.push(
      `- Locked shadow direction: ${c.shadow_angle || c.shadow_direction} (keep identical on every frame).`
    );
  }

  if (c.halftone_scale || c.halftone) {
    lines.push(
      `- Locked halftone dot scale: ${c.halftone_scale || c.halftone} (no re-screening, no resampling).`
    );
  }
  if (c.paper_texture || c.texture_id || c.texture_seed) {
    lines.push(
      `- Locked paper texture reference: ${c.paper_texture || c.texture_id || c.texture_seed} (same fiber grain throughout).`
    );
  }

  if (c.lighting) lines.push(`- Locked lighting setup: ${c.lighting}.`);

  if (c.seed !== undefined && c.seed !== null) {
    lines.push(`- Reference generation seed: ${c.seed}.`);
  }

  const staticEls = c.static_elements || c.locked_elements || c.do_not_move;
  if (Array.isArray(staticEls) && staticEls.length) {
    lines.push(
      `- These elements are already placed and MUST stay perfectly still: ${staticEls
        .map(String)
        .join("; ")}.`
    );
  }

  if (c.start_frame_ref || c.startFrame) {
    lines.push(
      `- Canonical START frame reference: ${c.start_frame_ref || c.startFrame}.`
    );
  }
  if (c.end_frame_ref || c.endFrame) {
    lines.push(
      `- Canonical END frame reference (must land exactly here): ${c.end_frame_ref || c.endFrame}.`
    );
  }

  if (c.notes) lines.push(`- Art-director note: ${c.notes}.`);

  if (!lines.length) return "";

  return `

CANONICAL CONSISTENCY ANCHORS (inherited from the approved still frames — treat as immutable ground truth):
${lines.join("\n")}`;
}

function buildMotionPrompt(item: any, consistency: any = null) {
  const objects = (item.visualProposal?.objects || item.key_objects || []).map(
    String
  );
  const moving = objects.slice(0, 4);
  const order = (item.assembly_order || moving).map(String).join("; ");
  const geo = isGeoItem(item);

  const moveLine =
    moving.length >= 2
      ? `Animate the exact paper cut-out "${moving[0]}" sliding in rigidly from beyond the upper-left edge while the exact paper cut-out "${moving[1]}" slides in rigidly from beyond the lower-right edge. Any further pieces drop into place one at a time in this order: ${order}.`
      : moving.length === 1
        ? `Animate the exact paper cut-out "${moving[0]}" sliding rigidly into its final resting position with restrained, handcrafted stop-motion steps.`
        : `Assemble the collage one flat piece at a time with crisp physical stop-motion timing in this order: ${order || "background structure, subjects, accent result"}.`;

  const consistencyBlock = buildConsistencyBlock(consistency);

  return `TASK: Interpolate ONLY between the supplied start frame and end frame. The end frame is the exact, locked final image — land on it precisely.

MOTION: ${moveLine}

STOP-MOTION PHYSICS (tactile paper on a tabletop — this is the priority):
- Each piece is a RIGID flat paper cut-out. It translates and rotates as a solid shape; it never bends, stretches, melts, or dissolves.
- Move on 2s/3s stop-motion cadence: small stepped increments, ~8–12 fps stutter feel, tiny easing-in before each piece settles.
- On landing, each piece shows a subtle micro-bounce and a 1–2 frame settle jitter (physical vibration against the table), then locks still.
- Contact drop-shadows shift and soften in sync with each piece as it lowers onto the surface.
- Slight in-plane paper friction: pieces may nudge a hair on arrival, then rest.

HARD CONSISTENCY LOCK:
- Preserve the exact silhouettes${geo ? " of every geographic shape" : ""}, colors, scale, halftone dot size, paper fiber texture, cardstock hues, keylines, background field and 9:16 framing from the supplied frames.
- Static elements (background, folds, grid, texture, already-placed pieces) must remain perfectly still — zero drift.${consistencyBlock}

FORBIDDEN (critical — reject these behaviors):
- NO morphing, NO gel/liquid warp, NO one object transforming into another, NO cross-fade blending between shapes.
- NO new objects, NO object removal after landing, NO shape distortion, NO scale pumping.
- NO scene cuts, NO flicker of the background, NO relighting.
- NO text, letters, numerals, logos or watermark appearing at any frame.
- NO camera movement whatsoever: no zoom, no pan, no tilt, no parallax, no dolly. The overhead camera is fully locked.`;
}

const LS_SESSION_KEY = "lumiera-collage-broll-session-v1";

type PipelineStepState =
  | "pending"
  | "ready"
  | "waiting"
  | "running"
  | "done"
  | "approved"
  | "rejected"
  | "error"
  | "skipped";

type PipelineStatus = {
  gate1: { label: string; state: PipelineStepState };
  gate2: { label: string; state: PipelineStepState };
  image: { label: string; state: PipelineStepState };
  still: { label: string; state: PipelineStepState };
  gate3: { label: string; state: PipelineStepState };
  video: { label: string; state: PipelineStepState };
};

/**
 * Deriva status legível e coerente do pipeline (evita still aprovado sem imagem, etc.).
 */
function derivePipelineStatus(
  item: CollageItem | null | undefined,
  opts: { mediaBusyKind?: "still" | "video" | null; isMediaBusy?: boolean } = {}
): PipelineStatus {
  const empty: PipelineStatus = {
    gate1: { label: "aguardando", state: "pending" },
    gate2: { label: "aguardando", state: "pending" },
    image: { label: "aguardando geração", state: "waiting" },
    still: { label: "—", state: "pending" },
    gate3: { label: "aguardando", state: "waiting" },
    video: { label: "aguardando", state: "waiting" },
  };
  if (!item) return empty;

  const endUrl =
    item.endFrame?.imageUrl || item.still_url || item.last_frame_url;
  const startUrl = item.startFrame?.imageUrl || item.first_frame_url;
  const hasImage = Boolean(
    endUrl || item.still_path || item.endFrame?.imagePath
  );
  const hasStart = Boolean(
    startUrl || item.startFrame?.imagePath || item.first_frame_path
  );
  const hasPrompt = Boolean(
    item.imagegen_prompt || item.visual_spec || item.endFrame?.imagePrompt
  );
  // End frame aprovado = still_approved legado ou endFrame.approved
  const stillApproved =
    hasImage && Boolean(item.endFrame?.approved || item.still_approved);
  const startApproved = hasStart && Boolean(item.startFrame?.approved);
  const hasVideo = Boolean(item.video_url || item.video_path);
  const gen1Ok =
    item.status === "approved" ||
    item.status === "needs_review" ||
    stillApproved ||
    hasVideo;
  const gen1Rejected = item.status === "rejected";
  const gen1Running =
    item.status === "regenerating" || item.status === "candidate_ready";

  // Gate 1
  let gate1: PipelineStatus["gate1"];
  if (gen1Rejected) gate1 = { label: "rejeitado", state: "rejected" };
  else if (item.status === "error") gate1 = { label: "erro", state: "error" };
  else if (gen1Running) gate1 = { label: "em revisão", state: "running" };
  else if (gen1Ok) gate1 = { label: "aprovado", state: "approved" };
  else gate1 = { label: "pendente", state: "pending" };

  // Gate 2 (specs/prompt)
  let gate2: PipelineStatus["gate2"];
  if (hasPrompt || hasImage) gate2 = { label: "prompt pronto", state: "ready" };
  else if (gen1Ok) gate2 = { label: "aguardando specs", state: "waiting" };
  else gate2 = { label: "aguardando Gate 1", state: "pending" };

  // End Frame (imagem final)
  let image: PipelineStatus["image"];
  if (opts.isMediaBusy && opts.mediaBusyKind === "still")
    image = { label: "gerando end frame…", state: "running" };
  else if (hasImage) image = { label: "end frame gerado", state: "done" };
  else if (gen1Ok) image = { label: "aguardando end frame", state: "waiting" };
  else image = { label: "aguardando Gate 1", state: "pending" };

  // Still = End Frame approval
  let still: PipelineStatus["still"];
  if (!hasImage) still = { label: "—", state: "pending" };
  else if (stillApproved && startApproved)
    still = { label: "end+start aprovados", state: "approved" };
  else if (stillApproved)
    still = { label: "end ok · falta start", state: "waiting" };
  else still = { label: "end pendente", state: "waiting" };

  // Gate 3: precisa dos dois frames
  let gate3: PipelineStatus["gate3"];
  if (hasVideo) gate3 = { label: "concluído", state: "done" };
  else if (stillApproved && startApproved)
    gate3 = { label: "pronto para gerar", state: "ready" };
  else if (stillApproved && !hasStart)
    gate3 = { label: "aguardando start frame", state: "waiting" };
  else if (stillApproved)
    gate3 = { label: "aguardando aprovação start", state: "waiting" };
  else if (hasImage)
    gate3 = { label: "aguardando end frame", state: "waiting" };
  else gate3 = { label: "aguardando", state: "waiting" };

  // Vídeo
  let video: PipelineStatus["video"];
  if (opts.isMediaBusy && opts.mediaBusyKind === "video")
    video = { label: "gerando…", state: "running" };
  else if (hasVideo) video = { label: "concluído", state: "done" };
  else if (stillApproved && startApproved)
    video = { label: "aguardando geração", state: "waiting" };
  else video = { label: "aguardando frames", state: "waiting" };

  return { gate1, gate2, image, still, gate3, video };
}

/**
 * Próxima ação única do card — conduz o usuário pelo pipeline sem que ele
 * precise adivinhar por que um botão está bloqueado. Derivada do estado real.
 */
function computeNextAction(item: CollageItem | null | undefined): {
  label: string;
  hint: string;
  tone: "action" | "running" | "done" | "error" | "muted";
} {
  if (!item)
    return {
      label: "Selecione uma cena",
      hint: "Escolha um card à esquerda para ver a próxima etapa.",
      tone: "muted",
    };

  const endUrl =
    item.endFrame?.imageUrl || item.still_url || item.last_frame_url;
  const startUrl = item.startFrame?.imageUrl || item.first_frame_url;
  const hasEnd = Boolean(endUrl || item.still_path || item.endFrame?.imagePath);
  const hasStart = Boolean(
    startUrl || item.startFrame?.imagePath || item.first_frame_path
  );
  const endApproved =
    hasEnd && Boolean(item.endFrame?.approved || item.still_approved);
  const startApproved = hasStart && Boolean(item.startFrame?.approved);
  const hasVideo = Boolean(item.video_url || item.video_path);

  // Gate 1 — proposta visual
  if (item.status === "rejected")
    return {
      label: "Proposta rejeitada",
      hint: "Regenere com outra direção visual.",
      tone: "error",
    };
  if (item.status === "error")
    return {
      label: "Erro na proposta",
      hint: "Tente regenerar a proposta.",
      tone: "error",
    };
  if (item.status === "regenerating" || item.status === "candidate_ready")
    return {
      label: "Gerando proposta…",
      hint: "Aguarde a nova versão para comparar.",
      tone: "running",
    };
  if (
    item.status !== "approved" &&
    item.status !== "needs_review" &&
    !endApproved &&
    !hasVideo
  )
    return {
      label: "Aprovar a proposta visual",
      hint: "Revise a composição e aprove para liberar os frames.",
      tone: "action",
    };

  // Gate 2A — frame final (fonte de verdade)
  if (!hasEnd)
    return {
      label: "Gerar o frame final",
      hint: "Crie a composição definitiva — ela é a fonte de verdade da cena.",
      tone: "action",
    };
  if (!endApproved)
    return {
      label: "Aprovar o frame final",
      hint: "Confira a composição e aprove para derivar o frame inicial.",
      tone: "action",
    };

  // Gate 2B — frame inicial (derivado do final)
  if (!hasStart)
    return {
      label: "Gerar o frame inicial",
      hint: "Derive o estado ainda não montado a partir do frame final.",
      tone: "action",
    };
  if (!startApproved)
    return {
      label: "Aprovar o frame inicial",
      hint: "Confira e aprove para liberar a geração do vídeo.",
      tone: "action",
    };

  // Gate 3 — vídeo
  if (!hasVideo)
    return {
      label: "Gerar o vídeo",
      hint: "Interpole o movimento do frame inicial ao final.",
      tone: "action",
    };

  return {
    label: "Cena concluída",
    hint: "Vídeo pronto para entrega.",
    tone: "done",
  };
}

/** Remove contradições ao carregar/salvar card. */
function normalizePipelineItem(item: CollageItem): CollageItem {
  const hasImage = Boolean(item.still_url || item.still_path);
  const hasVideo = Boolean(item.video_url || item.video_path);
  let still_approved = item.still_approved;
  let still_status = item.still_status;
  let still_note = item.still_note;
  let gate = Number(item.gate) || 1;

  if (!hasImage) {
    still_approved = false;
    if (still_status === "approved") still_status = undefined;
    if (
      still_note === "Still aprovado" ||
      still_note === "Still aprovado (local)"
    )
      still_note = hasImage ? still_note : "Aguardando still";
  }
  if (hasVideo) gate = Math.max(gate, 3);
  else if (hasImage) gate = Math.max(gate, 2);

  return {
    ...item,
    still_approved,
    still_status,
    still_note,
    gate,
  };
}

function pipelineTone(state: PipelineStepState): string {
  switch (state) {
    case "approved":
    case "done":
      return "text-emerald-300";
    case "ready":
      return "text-sky-300";
    case "running":
      return "text-violet-300";
    case "waiting":
      return "text-amber-200";
    case "rejected":
    case "error":
      return "text-red-300";
    default:
      return "text-zinc-500";
  }
}

const QUICK_FIXES = [
  { id: "more_literal", label: "Mais literal" },
  { id: "more_geographic", label: "Mais geográfico" },
  { id: "use_map", label: "Usar mapa" },
  { id: "show_location", label: "Mostrar localização" },
  { id: "preserve_entities", label: "Preservar entidades" },
  { id: "fix_precision", label: "Corrigir precisão" },
  { id: "simplify", label: "Simplificar composição" },
  { id: "improve_continuity", label: "Melhorar continuidade" },
  { id: "remove_random", label: "Remover objetos aleatórios" },
  { id: "no_image_text", label: "Sem texto na imagem" },
  { id: "fix_scale", label: "Corrigir escala" },
  { id: "fix_direction", label: "Corrigir direção" },
  { id: "fix_era", label: "Corrigir período histórico" },
  { id: "keep_style", label: "Manter estilo atual" },
] as const;

const REJECTION_REASONS = [
  { id: "not_narration", label: "Não representa a narração" },
  { id: "too_abstract", label: "Muito abstrato" },
  { id: "geo_error", label: "Erro geográfico" },
  { id: "history_error", label: "Erro histórico" },
  { id: "missing_entities", label: "Entidades ausentes" },
  { id: "confusing", label: "Composição confusa" },
  { id: "five_sec", label: "Impossível entender em 5 segundos" },
  { id: "random_objects", label: "Objetos aleatórios" },
  { id: "unwanted_text", label: "Texto indesejado" },
  { id: "wrong_style", label: "Estilo incorreto" },
  { id: "other", label: "Outro" },
] as const;

function snapshotFromItem(
  item: CollageItem,
  meta: Partial<CardVersionSnapshot> = {}
): CardVersionSnapshot {
  return {
    version: meta.version ?? item.activeVersion ?? 1,
    createdAt: meta.createdAt || new Date().toISOString(),
    regenerationInstruction: meta.regenerationInstruction || "",
    quickFixes: meta.quickFixes || [],
    rejectionReasons: meta.rejectionReasons || [],
    proposal: {
      id: item.id,
      line: item.line,
      mode: item.mode,
      core_meaning: item.core_meaning,
      emotion: item.emotion,
      visual_proposition: item.visual_proposition,
      place_name: item.place_name,
      region: item.region,
      country: item.country,
      map_type: item.map_type,
      era: item.era,
      key_objects: [...(item.key_objects || [])],
      background_color: item.background_color,
      accent_colors: [...(item.accent_colors || [])],
      assembly_order: [...(item.assembly_order || [])],
      action_verb: item.action_verb,
      lineAnalysis: item.lineAnalysis,
      visualProposal: item.visualProposal,
      validation: item.validation,
    },
    validation: item.validation || null,
  };
}

function listPreservableFromItem(item: CollageItem): string[] {
  const set = new Set<string>();
  for (const x of item.lineAnalysis?.geographicEntities || [])
    set.add(String(x));
  for (const x of item.lineAnalysis?.requiredVisualAnchors || [])
    set.add(String(x));
  for (const x of item.visualProposal?.semanticAnchors || [])
    set.add(String(x));
  for (const x of item.visualProposal?.objects || item.key_objects || [])
    set.add(String(x));
  if (item.place_name) set.add(item.place_name);
  if (item.country) set.add(item.country);
  return [...set].filter((s) => s.length > 1).slice(0, 16);
}

function applyProposalFields(
  base: CollageItem,
  proposal: Partial<CollageItem>
): CollageItem {
  return {
    ...base,
    ...proposal,
    id: base.id,
    line: base.line,
    key_objects: (proposal.key_objects || base.key_objects || []).map(String),
    assembly_order: (proposal.assembly_order || base.assembly_order || []).map(
      String
    ),
    accent_colors: (proposal.accent_colors || base.accent_colors || []).map(
      String
    ),
    candidate: null,
    candidateMeta: null,
  };
}

type CollageMode = "editorial" | "geo";

type PalettePreset = {
  id: string;
  label: string;
  hex: string;
  mood: string;
  accentColors: string[];
};

const GEO_PALETTES: PalettePreset[] = [
  {
    id: "ocean-ink",
    label: "Oceano",
    hex: "#0B3D5C",
    mood: "mapa náutico, mar, rotas",
    accentColors: ["#E8D5A3", "#C45C26"],
  },
  {
    id: "parchment",
    label: "Pergaminho",
    hex: "#E8D5A3",
    mood: "atlas antigo, império, história",
    accentColors: ["#0B3D5C", "#8B1E3F"],
  },
  {
    id: "military-green",
    label: "Militar",
    hex: "#3D4F2F",
    mood: "campanha, fronteira, estratégia",
    accentColors: ["#C4A574", "#E8D5A3"],
  },
  {
    id: "desert-sand",
    label: "Areia",
    hex: "#C4A574",
    mood: "deserto, caravana, rota terrestre",
    accentColors: ["#0B3D5C", "#3D4F2F"],
  },
  {
    id: "arctic-slate",
    label: "Ardósia polar",
    hex: "#4A5568",
    mood: "expedição, gelo, latitude alta",
    accentColors: ["#E8D5A3", "#0B3D5C"],
  },
  {
    id: "crimson-border",
    label: "Fronteira",
    hex: "#8B1E3F",
    mood: "conflito, divisão, tratado",
    accentColors: ["#E8D5A3", "#C4A574"],
  },
  {
    id: "forest-canopy",
    label: "Floresta",
    hex: "#1B4332",
    mood: "bacia, selva, bioma",
    accentColors: ["#C4A574", "#E8D5A3"],
  },
];

const EDITORIAL_PALETTES: PalettePreset[] = [
  {
    id: "deep-purple",
    label: "Roxo",
    hex: "#3D2463",
    mood: "norma, memória, longo prazo",
    accentColors: ["#F5E6C8", "#E85D04"],
  },
  {
    id: "mustard",
    label: "Mostarda",
    hex: "#D4A017",
    mood: "alerta, ferramenta, vazamento",
    accentColors: ["#3D2463", "#0D7377"],
  },
  {
    id: "crimson",
    label: "Carmesim",
    hex: "#9B1B30",
    mood: "tensão, risco, corte",
    accentColors: ["#F5E6C8", "#D4A017"],
  },
  {
    id: "teal",
    label: "Teal",
    hex: "#0D7377",
    mood: "julgamento, colaboração, execução",
    accentColors: ["#F5E6C8", "#D4A017"],
  },
  {
    id: "burnt-orange",
    label: "Laranja",
    hex: "#C45C26",
    mood: "tempo, labor, urgência",
    accentColors: ["#F5E6C8", "#3D2463"],
  },
  {
    id: "deep-green",
    label: "Verde-musgo",
    hex: "#1F4D3A",
    mood: "cognição, reset, sistema",
    accentColors: ["#F5E6C8", "#D4A017"],
  },
  {
    id: "cream",
    label: "Creme",
    hex: "#F5E6C8",
    mood: "arquivo, papel, neutral",
    accentColors: ["#3D2463", "#9B1B30"],
  },
];

/** id especial para sorteio aleatório */
const RANDOM_PALETTE_ID = "__random__";

function pickRandomPalette(palettes: PalettePreset[]): PalettePreset {
  return palettes[Math.floor(Math.random() * palettes.length)];
}

type Props = {
  getProjectUrl: (path: string) => string;
  initialSessionId?: string | null;
  onSendToWizard?: (sessionId: string, narration: string) => void;
};

const DEMO_LINES_EDITORIAL = `Muita gente acha que IA veio para pensar no seu lugar — na verdade ela é um espelho que amplia os buracos da pergunta.
Quando o processo só vive na cabeça de uma pessoa, cada entrega reinicia o relógio do zero.
Normas bem escritas viram trilha: humanos julgam, máquinas executam o repetitivo.
Uma ideia sem execução é como uma engrenagem girando no vácuo: consome energia mas não move a máquina.
O fluxo de trabalho ideal funciona como uma ampulheta de precisão: a informação flui sem engarrafar no gargalo.
Desenhar um software sem arquitetura clara é empilhar cartas de baralho sob o sopro do vento.
O aprendizado contínuo opera como círculos concêntricos na água: cada nova habilidade expande a área de impacto.
Decisões baseadas em achismos são como navegar no nevoeiro sem bússola, confiando apenas no instinto do capitão.
A automação de processos não substitui a criatividade humana; ela apenas pavimenta a estrada para a mente correr livre.`;

const DEMO_LINES_GEO = `No deserto do Atacama, as caravanas marcavam o caminho só pela sombra das montanhas.
A fronteira do Império Romano no Reno era uma linha viva de fortes e mercadores.
Do estuário do Tâmisa ao mar do Norte, o comércio ingles expandia rotas como veias de um mapa.`;

const GATES = [
  {
    id: 1,
    title: "Gate 1 · Proposta visual",
    hint: "Análise semântica + direção visual (não só metáfora).",
  },
  {
    id: 2,
    title: "Gate 2 · Quietude",
    hint: "Spec + prompt de still. Confirme antes do vídeo.",
  },
  {
    id: 3,
    title: "Gate 3 · Vídeo",
    hint: "Omni Flash first/last frame · 9:16 · 5s",
  },
] as const;

/**
 * Fluxo visual de 5 etapas — substitui a noção ambígua de "Gate 2/Quietude".
 * Cada etapa deriva seu estado do card selecionado.
 */
const PIPELINE_STAGES = [
  {
    id: "proposta",
    label: "Proposta",
    gate: 1,
    desc: "Composição, objetos, mapa e paleta",
  },
  {
    id: "frame_final",
    label: "Frame final",
    gate: 2,
    desc: "Composição definitiva · fonte de verdade",
  },
  {
    id: "frame_inicial",
    label: "Frame inicial",
    gate: 2,
    desc: "Estado ainda não montado, derivado do final",
  },
  {
    id: "movimento",
    label: "Movimento",
    gate: 3,
    desc: "O que aparece, desloca, gira ou cresce",
  },
  {
    id: "video",
    label: "Vídeo",
    gate: 3,
    desc: "Interpolação start→end e validação",
  },
] as const;

type StageState =
  "pending" | "ready" | "running" | "review" | "approved" | "done" | "error";

function derivePipelineStages(item: CollageItem | null | undefined): {
  id: string;
  label: string;
  gate: number;
  desc: string;
  state: StageState;
  note: string;
}[] {
  const base = PIPELINE_STAGES.map((s) => ({
    ...s,
    state: "pending" as StageState,
    note: "aguardando",
  }));
  if (!item) return base;

  const endUrl =
    item.endFrame?.imageUrl || item.still_url || item.last_frame_url;
  const startUrl = item.startFrame?.imageUrl || item.first_frame_url;
  const hasEnd = Boolean(endUrl || item.still_path || item.endFrame?.imagePath);
  const hasStart = Boolean(
    startUrl || item.startFrame?.imagePath || item.first_frame_path
  );
  const endApproved =
    hasEnd && Boolean(item.endFrame?.approved || item.still_approved);
  const startApproved = hasStart && Boolean(item.startFrame?.approved);
  const hasVideo = Boolean(item.video_url || item.video_path);
  const hasMotion = Boolean(item.motion?.videoPrompt);
  const proposalOk =
    item.status === "approved" ||
    item.status === "needs_review" ||
    endApproved ||
    hasVideo;

  return base.map((s) => {
    switch (s.id) {
      case "proposta":
        if (item.status === "rejected")
          return { ...s, state: "error", note: "rejeitada" };
        if (item.status === "error")
          return { ...s, state: "error", note: "erro" };
        if (item.status === "regenerating" || item.status === "candidate_ready")
          return { ...s, state: "running", note: "gerando…" };
        if (proposalOk) return { ...s, state: "approved", note: "aprovada" };
        return { ...s, state: "review", note: "requer aprovação" };
      case "frame_final":
        if (!proposalOk)
          return { ...s, state: "pending", note: "aguardando proposta" };
        if (endApproved) return { ...s, state: "approved", note: "aprovado" };
        if (hasEnd) return { ...s, state: "review", note: "requer aprovação" };
        return { ...s, state: "ready", note: "pronto para gerar" };
      case "frame_inicial":
        if (!endApproved)
          return { ...s, state: "pending", note: "aguardando frame final" };
        if (startApproved) return { ...s, state: "approved", note: "aprovado" };
        if (hasStart)
          return { ...s, state: "review", note: "requer aprovação" };
        return { ...s, state: "ready", note: "pronto para derivar" };
      case "movimento":
        if (!startApproved)
          return { ...s, state: "pending", note: "aguardando frames" };
        if (hasMotion) return { ...s, state: "done", note: "definido" };
        return { ...s, state: "ready", note: "pronto para definir" };
      case "video":
        if (hasVideo) return { ...s, state: "done", note: "concluído" };
        if (startApproved)
          return { ...s, state: "ready", note: "pronto para gerar" };
        return { ...s, state: "pending", note: "aguardando frames" };
      default:
        return s;
    }
  });
}

const STAGE_STATE_META: Record<
  StageState,
  { dot: string; text: string; ring: string }
> = {
  pending: {
    dot: "bg-zinc-600",
    text: "text-zinc-500",
    ring: "border-zinc-800",
  },
  ready: { dot: "bg-sky-400", text: "text-sky-300", ring: "border-sky-400/40" },
  running: {
    dot: "bg-amber-400 animate-pulse",
    text: "text-amber-300",
    ring: "border-amber-400/40",
  },
  review: {
    dot: "bg-orange-400",
    text: "text-orange-300",
    ring: "border-orange-400/40",
  },
  approved: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    ring: "border-emerald-400/40",
  },
  done: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    ring: "border-emerald-400/40",
  },
  error: {
    dot: "bg-rose-400",
    text: "text-rose-300",
    ring: "border-rose-400/40",
  },
};

/**
 * Ficha geográfica por card — deriva tipo, escala, elementos e alerta de
 * fronteira histórica a partir dos campos do card.
 */
function buildGeoFiche(item: CollageItem | null | undefined): {
  local: string;
  tipo: string;
  pais: string;
  escala: string;
  elementos: string[];
  direcaoRota: string;
  periodo: string;
  historicalBorderWarning: string | null;
} | null {
  if (!item) return null;
  const local = [item.place_name, item.region].filter(Boolean).join(", ");
  if (!local && !item.country) return null;

  const text = [
    item.place_name,
    item.region,
    item.country,
    ...(item.lineAnalysis?.geographicEntities || []),
    ...(item.visualProposal?.geographicRelationships || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Tipo inferido por palavras-chave
  let tipo = "região geográfica";
  if (/\b(rio|river|rio |tejo|tamisa|reno|nile|danube)\b/.test(text))
    tipo = "rio / corpo d'água";
  else if (/\b(mar|sea|ocean|oceano|norte|mediterr)\b/.test(text))
    tipo = "corpo d'água";
  else if (/\b(deserto|desert|atacama|saara|gobi)\b/.test(text))
    tipo = "deserto / região natural";
  else if (/\b(montanha|mountain|cordilheira|andes|alps|serra)\b/.test(text))
    tipo = "cordilheira / relevo";
  else if (/\b(cidade|city|londres|roma|paris|town)\b/.test(text))
    tipo = "cidade / assentamento";
  else if (/\b(forte|fort|fortaleza|fronteira|border|limes|wall)\b/.test(text))
    tipo = "fronteira / fortificação";
  else if (/\b(ilha|island)\b/.test(text)) tipo = "ilha";

  // Escala inferida do map_type
  const escala =
    item.map_type === "city" || item.map_type === "poi"
      ? "local / urbana"
      : item.map_type === "country"
        ? "nacional"
        : item.map_type === "continent" || item.map_type === "world"
          ? "continental / global"
          : "regional";

  const elementos = Array.from(
    new Set([
      ...(item.lineAnalysis?.geographicEntities || []),
      ...(item.key_objects || []),
    ])
  ).slice(0, 6);

  const direcaoRota =
    (item.visualProposal?.geographicRelationships || []).join("; ") ||
    "ainda não confirmada";

  const periodo = item.era || "não informado";

  // Alerta de fronteira histórica: se a época é antiga/histórica, a fronteira
  // moderna provavelmente não existia.
  const eraLower = (item.era || "").toLowerCase();
  const isHistorical =
    /\b(a\.?c\.?|bc|bce|antig|mediev|romano|romana|império|século|century|dinastia|colônia|colonial)\b/.test(
      eraLower
    );
  const historicalBorderWarning = isHistorical
    ? `A época "${item.era}" é anterior às fronteiras atuais. Use a fronteira/território histórico, não o país moderno, e indique o período no mapa.`
    : null;

  return {
    local: local || item.country || "—",
    tipo,
    pais: item.country || "—",
    escala,
    elementos,
    direcaoRota,
    periodo,
    historicalBorderWarning,
  };
}

/**
 * Comparação Start×End Frame — calcula diferença estrutural (via canvas) e
 * avalia continuidade de identidade + caminho de montagem.
 */
function FrameComparison({
  startUrl,
  endUrl,
  assemblySteps,
}: {
  startUrl?: string;
  endUrl?: string;
  assemblySteps?: string[];
}) {
  const [diff, setDiff] = React.useState<number | null>(null);
  const [computing, setComputing] = React.useState(false);

  React.useEffect(() => {
    if (!startUrl || !endUrl) {
      setDiff(null);
      return;
    }
    let cancelled = false;
    setComputing(true);
    const size = 64;
    const loadImage = (url: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    Promise.all([loadImage(startUrl), loadImage(endUrl)])
      .then(([s, e]) => {
        const c1 = document.createElement("canvas");
        const c2 = document.createElement("canvas");
        c1.width = c2.width = size;
        c1.height = c2.height = size;
        const x1 = c1.getContext("2d");
        const x2 = c2.getContext("2d");
        if (!x1 || !x2) return;
        x1.drawImage(s, 0, 0, size, size);
        x2.drawImage(e, 0, 0, size, size);
        const d1 = x1.getImageData(0, 0, size, size).data;
        const d2 = x2.getImageData(0, 0, size, size).data;
        let sum = 0;
        const pixels = size * size;
        for (let i = 0; i < d1.length; i += 4) {
          sum +=
            (Math.abs(d1[i] - d2[i]) +
              Math.abs(d1[i + 1] - d2[i + 1]) +
              Math.abs(d1[i + 2] - d2[i + 2])) /
            (3 * 255);
        }
        if (!cancelled) setDiff(Math.round((sum / pixels) * 100));
      })
      .catch(() => {
        if (!cancelled) setDiff(null);
      })
      .finally(() => {
        if (!cancelled) setComputing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [startUrl, endUrl]);

  if (!startUrl || !endUrl) return null;

  const assessment =
    diff == null
      ? null
      : diff < 8
        ? {
            tone: "text-amber-300",
            border: "border-amber-500/30 bg-amber-500/[0.07]",
            text: "Frames quase idênticos — o movimento pode ficar imperceptível. Aumente a diferença entre start e end.",
          }
        : diff > 60
          ? {
              tone: "text-rose-300",
              border: "border-rose-500/30 bg-rose-500/[0.07]",
              text: "Diferença alta — risco de perda de identidade dos objetos. Verifique cor, escala e orientação.",
            }
          : {
              tone: "text-emerald-300",
              border: "border-emerald-500/30 bg-emerald-500/[0.07]",
              text: "Diferença adequada para montagem progressiva com continuidade de identidade.",
            };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5 space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400 flex items-center gap-1.5">
        <GitBranch className="w-3 h-3" /> Comparação Start × End
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-zinc-500">Diferença estrutural</span>
        <span className="font-mono text-sm font-bold text-zinc-100">
          {computing ? "…" : diff == null ? "—" : `${diff}%`}
        </span>
      </div>
      {diff != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400"
            style={{ width: `${Math.min(100, diff)}%` }}
          />
        </div>
      )}
      {assessment && (
        <p
          className={`rounded-md border px-2 py-1.5 text-[10px] leading-4 ${assessment.border} ${assessment.tone}`}
        >
          {assessment.text}
        </p>
      )}
      {(assemblySteps || []).length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">
            Caminho de montagem
          </p>
          <ol className="space-y-0.5">
            {(assemblySteps || []).map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-[10px] text-zinc-400"
              >
                <span className="text-zinc-600 font-mono">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/**
 * Explica o "porquê" de cada métrica de validação e separa a recomendação
 * automática da IA da decisão humana.
 */
function buildValidationExplanations(
  v: CollageItem["validation"],
  item: CollageItem
): { metric: string; score: number | string; explanation: string }[] {
  if (!v) return [];
  const missing = (v.missingAnchors || []).join(", ");
  const score = (n?: number) => (typeof n === "number" ? n : "—");

  const semExplain =
    typeof v.semanticAlignment === "number"
      ? v.semanticAlignment >= 90
        ? `A proposta representa bem os elementos da narração.${missing ? ` "${missing}" foi simplificado.` : ""}`
        : v.semanticAlignment >= 70
          ? `Cobre a maioria dos elementos${missing ? `, mas "${missing}" foi simplificado` : ""}.`
          : `Não representa adequadamente${missing ? `: ${missing}` : " os elementos da narração"}.`
      : "Sem avaliação.";

  const entExplain =
    typeof v.entityCoverage === "number"
      ? v.entityCoverage >= 90
        ? "Todas as entidades obrigatórias foram preservadas."
        : v.entityCoverage >= 70
          ? `A maioria das entidades foi preservada${missing ? `; faltando: ${missing}` : ""}.`
          : `Entidades importantes ausentes${missing ? `: ${missing}` : ""}.`
      : "Sem avaliação.";

  const geoExplain =
    typeof v.geographicRelevance === "number"
      ? v.geographicRelevance >= 90
        ? "Local e relações geográficas identificados corretamente."
        : v.geographicRelevance >= 70
          ? "Local identificado, mas direção/escala da rota não confirmada."
          : "Relações geográficas imprecisas ou ausentes."
      : "Sem avaliação.";

  const clarityExplain =
    typeof v.fiveSecondClarity === "number"
      ? v.fiveSecondClarity >= 90
        ? "Composição legível em 5 segundos."
        : v.fiveSecondClarity >= 70
          ? "Legível, mas rótulos/elementos podem estar pequenos."
          : "Pouco legível em 5 segundos — simplifique a composição."
      : "Sem avaliação.";

  return [
    {
      metric: "Alinhamento semântico",
      score: score(v.semanticAlignment),
      explanation: semExplain,
    },
    {
      metric: "Entidades",
      score: score(v.entityCoverage),
      explanation: entExplain,
    },
    {
      metric: "Geografia",
      score: score(v.geographicRelevance),
      explanation: geoExplain,
    },
    {
      metric: "Clareza em 5s",
      score: score(v.fiveSecondClarity),
      explanation: clarityExplain,
    },
  ];
}

/**
 * Prévia barata de movimento — simula a interpolação start→end em canvas
 * (cross-fade + Ken Burns) e estima continuidade, legibilidade e risco de
 * deformação ANTES de gastar geração de vídeo.
 */
function MotionPreview({
  startUrl,
  endUrl,
  hasRouteDirection,
}: {
  startUrl?: string;
  endUrl?: string;
  hasRouteDirection?: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [tested, setTested] = React.useState(false);
  const [diff, setDiff] = React.useState<number | null>(null);
  const startImgRef = React.useRef<HTMLImageElement | null>(null);
  const endImgRef = React.useRef<HTMLImageElement | null>(null);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!startUrl || !endUrl) return;
    let cancelled = false;
    const load = (url: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = url;
      });
    Promise.all([load(startUrl), load(endUrl)])
      .then(([s, e]) => {
        if (cancelled) return;
        startImgRef.current = s;
        endImgRef.current = e;
        // calcula diferença estrutural para as métricas
        const size = 64;
        const c1 = document.createElement("canvas");
        const c2 = document.createElement("canvas");
        c1.width = c2.width = size;
        c1.height = c2.height = size;
        const x1 = c1.getContext("2d");
        const x2 = c2.getContext("2d");
        if (!x1 || !x2) return;
        x1.drawImage(s, 0, 0, size, size);
        x2.drawImage(e, 0, 0, size, size);
        const d1 = x1.getImageData(0, 0, size, size).data;
        const d2 = x2.getImageData(0, 0, size, size).data;
        let sum = 0;
        for (let i = 0; i < d1.length; i += 4) {
          sum +=
            (Math.abs(d1[i] - d2[i]) +
              Math.abs(d1[i + 1] - d2[i + 1]) +
              Math.abs(d1[i + 2] - d2[i + 2])) /
            (3 * 255);
        }
        setDiff(Math.round((sum / (size * size)) * 100));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [startUrl, endUrl]);

  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const play = () => {
    const canvas = canvasRef.current;
    const s = startImgRef.current;
    const e = endImgRef.current;
    if (!canvas || !s || !e) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    setPlaying(true);
    setTested(true);
    const duration = 1500;
    const t0 = performance.now();
    const drawImg = (img: HTMLImageElement, alpha: number, scale: number) => {
      ctx.globalAlpha = alpha;
      const base = Math.max(W / img.width, H / img.height) * scale;
      const dw = img.width * base;
      const dh = img.height * base;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    };
    const frame = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      ctx.clearRect(0, 0, W, H);
      drawImg(s, 1 - ease, 1.15 - 0.15 * ease);
      drawImg(e, ease, 1 + 0.15 * ease);
      ctx.globalAlpha = 1;
      if (p < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setPlaying(false);
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  if (!startUrl || !endUrl) return null;

  const d = diff ?? 0;
  const continuidade = Math.max(40, Math.min(99, Math.round(100 - d * 0.8)));
  const movimento =
    d < 8 ? 45 : d > 60 ? 55 : Math.round(70 + (50 - Math.abs(d - 30)) * 0.5);
  const risco = d > 50 ? "Alto" : d > 25 ? "Médio" : "Baixo";
  const riscoTone =
    d > 50 ? "text-rose-300" : d > 25 ? "text-amber-300" : "text-emerald-300";
  const direcao = hasRouteDirection ? "Confirmada" : "A confirmar";

  return (
    <div className="rounded-lg border border-cyan-500/20 bg-zinc-950/50 p-2.5 space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-300 flex items-center gap-1.5">
        <Play className="w-3 h-3" /> Prévia de movimento (simulação)
      </p>
      <canvas
        ref={canvasRef}
        width={270}
        height={480}
        className="w-full aspect-[9/16] rounded-lg bg-zinc-900 border border-zinc-800"
      />
      <button
        type="button"
        onClick={play}
        disabled={playing}
        className="w-full rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-3 py-2 text-[10px] font-bold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-50"
      >
        {playing
          ? "Simulando…"
          : tested
            ? "Testar novamente"
            : "Testar movimento"}
      </button>
      {tested && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-wider text-zinc-500">
              Continuidade
            </p>
            <p className="font-mono text-[11px] font-bold text-zinc-100">
              {continuidade}%
            </p>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-wider text-zinc-500">
              Movimento legível
            </p>
            <p className="font-mono text-[11px] font-bold text-zinc-100">
              {movimento}%
            </p>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-wider text-zinc-500">
              Risco de deformar
            </p>
            <p className={`font-mono text-[11px] font-bold ${riscoTone}`}>
              {risco}
            </p>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-wider text-zinc-500">
              Direção geográfica
            </p>
            <p className="font-mono text-[11px] font-bold text-zinc-100">
              {direcao}
            </p>
          </div>
        </div>
      )}
      <p className="text-[9px] text-zinc-600 leading-4">
        Simulação técnica (cross-fade + Ken Burns) — não é o vídeo final. Serve
        para validar continuidade e direção antes de gastar geração.
      </p>
    </div>
  );
}

/**
 * Detecta se um card tem algum alerta (geo histórico, clareza baixa ou
 * entidades faltando) — usado no preflight da aprovação em lote.
 */
function itemHasAlert(item: CollageItem): boolean {
  const fiche = buildGeoFiche(item);
  if (fiche?.historicalBorderWarning) return true;
  if (
    typeof item.validation?.fiveSecondClarity === "number" &&
    item.validation.fiveSecondClarity < 90
  )
    return true;
  if ((item.validation?.missingAnchors || []).length > 0) return true;
  return false;
}

function copyText(label: string, text: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copiado`),
    () => toast.error("Falha ao copiar")
  );
}

function calculateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function getNormalizedLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 12);
}

export function validateEditorialContinuity(cardSpec: any): string[] {
  const errors: string[] = [];
  if (!cardSpec) {
    errors.push("cardSpec está nulo ou indefinido.");
    return errors;
  }

  const backdrop = cardSpec.backdrop || {};
  const layers = cardSpec.layers || [];
  const motionSequence = cardSpec.motionSequence || [];
  const composition = cardSpec.composition || {};

  if (backdrop.static !== true) {
    errors.push("B0_BACKGROUND deve estar marcado como estático.");
  }

  const bgAnim = motionSequence.find(
    (step: any) => step.layerId === "B0_BACKGROUND" && step.type !== "static"
  );
  if (bgAnim) {
    errors.push(
      "B0_BACKGROUND não pode fazer parte da sequência de movimento."
    );
  }

  const layerIds = new Set(layers.map((l: any) => l.id));
  for (const step of motionSequence) {
    if (step.layerId !== "B0_BACKGROUND" && !layerIds.has(step.layerId)) {
      errors.push(
        `${step.layerId} aparece no prompt de vídeo, mas não existe no manifesto de camadas.`
      );
    }
  }

  for (const l of layers) {
    if (l.isAnimated) {
      if (!l.startTransform || !l.endTransform) {
        errors.push(
          `O layer animado "${l.id}" deve possuir startTransform e endTransform.`
        );
        continue;
      }

      const st = l.startTransform;
      const et = l.endTransform;
      const samePos =
        st.x === et.x &&
        st.y === et.y &&
        st.width === et.width &&
        st.height === et.height &&
        st.rotation === et.rotation &&
        st.scale === et.scale;

      if (samePos && st.visibility !== "off-frame") {
        errors.push(
          `"${l.id}" está sendo animado, mas ocupa a mesma posição no Start e no End.`
        );
      }
    }
  }

  if (layers.length < 3 || layers.length > 6) {
    errors.push(
      `O número de grupos principais deve estar entre 3 e 6 (atual: ${layers.length}).`
    );
  }

  if (
    typeof composition.safeZonePercent !== "number" ||
    composition.safeZonePercent < 5
  ) {
    errors.push(
      "A composição deve respeitar a zona segura (safeZonePercent >= 5)."
    );
  }

  const lateStep = motionSequence.find(
    (step: any) =>
      step.layerId !== "B0_BACKGROUND" &&
      step.type !== "static" &&
      step.endNormalizedTime > 4.2
  );
  if (lateStep) {
    errors.push(
      `O layer animado "${lateStep.layerId}" termina muito tarde (${lateStep.endNormalizedTime}s). O vídeo deve terminar em repouso.`
    );
  }

  return errors;
}

export function CollageBrollLab({
  getProjectUrl,
  initialSessionId,
  onSendToWizard,
}: Props) {
  const [mode, setMode] = useState<CollageMode>("geo");
  const [rawLines, setRawLines] = useState(DEMO_LINES_GEO);
  const [placeHint, setPlaceHint] = useState("");
  const [countryHint, setCountryHint] = useState("");
  const [eraHint, setEraHint] = useState("");
  const [fidelity, setFidelity] = useState<"literal" | "balanced" | "creative">(
    "balanced"
  );
  const [selectedPaletteId, setSelectedPaletteId] =
    useState<string>(RANDOM_PALETTE_ID);
  const [items, setItems] = useState<CollageItem[]>([]);
  const [scriptAnalysis, setScriptAnalysis] = useState<ScriptAnalysis | null>(
    null
  );
  const [activeGate, setActiveGate] = useState<1 | 2 | 3>(1);
  const [viewMode, setViewMode] = useState<"criador" | "tecnico">("criador");
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [generatedFromHash, setGeneratedFromHash] = useState<string>("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const activeRunIdRef = useRef<string | null>(null);

  const currentNormalizedLines = useMemo(() => {
    return getNormalizedLines(rawLines);
  }, [rawLines]);

  const currentHash = useMemo(() => {
    return calculateHash(currentNormalizedLines.join("\n"));
  }, [currentNormalizedLines]);

  const isOutOfSync = useMemo(() => {
    if (!items || items.length === 0) return false;
    return currentHash !== generatedFromHash;
  }, [currentHash, generatedFromHash, items]);

  // Painel de revisão individual
  const [reviewPanel, setReviewPanel] = useState<"none" | "regen" | "reject">(
    "none"
  );
  const [previewFrameMode, setPreviewFrameMode] = useState<
    "end" | "start" | "motion"
  >("end");
  const [regenInstruction, setRegenInstruction] = useState("");
  const [selectedQuickFixes, setSelectedQuickFixes] = useState<string[]>([]);
  const [preserveChecked, setPreserveChecked] = useState<string[]>([]);
  const [replaceChecked, setReplaceChecked] = useState<string[]>([]);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectNote, setRejectNote] = useState("");
  const [regenBusyId, setRegenBusyId] = useState<string | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);
  const [mediaBusyId, setMediaBusyId] = useState<string | null>(null);
  const [mediaBusyKind, setMediaBusyKind] = useState<"still" | "video" | null>(
    null
  );
  const [previewMedia, setPreviewMedia] = useState<{
    type: "image" | "video";
    url: string;
    title: string;
  } | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => {
    if (initialSessionId) return initialSessionId;
    try {
      const raw = localStorage.getItem(LS_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.sessionId) return String(parsed.sessionId);
      }
    } catch {
      /* ignore */
    }
    return `collage_${Date.now().toString(36)}`;
  });

  useEffect(() => {
    if (initialSessionId && initialSessionId !== sessionId) {
      setSessionId(initialSessionId);
    }
  }, [initialSessionId, sessionId]);

  const [hydrated, setHydrated] = useState(false);
  const regenLockRef = useRef(false);
  const rejectLockRef = useRef(false);
  const rejectModalRef = useRef<HTMLDivElement | null>(null);

  const activePalettes = mode === "geo" ? GEO_PALETTES : EDITORIAL_PALETTES;
  const resolvedPalette = useMemo(() => {
    if (selectedPaletteId === RANDOM_PALETTE_ID) return null;
    return activePalettes.find((p) => p.id === selectedPaletteId) || null;
  }, [selectedPaletteId, activePalettes]);

  const switchMode = async (next: CollageMode) => {
    setMode(next);
    setItems([]);
    setScriptAnalysis(null);
    setSelectedId(null);
    setActiveGate(1);
    setReviewPanel("none");
    setSelectedPaletteId(RANDOM_PALETTE_ID);

    let nextRawLines = "";
    if (next === "geo") {
      setRawLines(DEMO_LINES_GEO);
      setFidelity("balanced");
      nextRawLines = DEMO_LINES_GEO;
    } else {
      setRawLines(DEMO_LINES_EDITORIAL);
      setPlaceHint("");
      setCountryHint("");
      setEraHint("");
      nextRawLines = DEMO_LINES_EDITORIAL;
    }

    const payload = {
      sessionId,
      mode: next,
      fidelity: next === "geo" ? "balanced" : fidelity,
      rawLines: nextRawLines,
      placeHint: next === "geo" ? placeHint : "",
      countryHint: next === "geo" ? countryHint : "",
      eraHint: next === "geo" ? eraHint : "",
      scriptAnalysis: null,
      selectedId: null,
      items: [],
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(LS_SESSION_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }

    try {
      await postJson("/api/collage-broll/session", payload);
    } catch (err) {
      console.warn(
        "[CollageBroll] switchMode: falha ao salvar no backend",
        err
      );
    }
  };

  const handleResetAll = async () => {
    setItems([]);
    setScriptAnalysis(null);
    setSelectedId(null);
    setActiveGate(1);
    setReviewPanel("none");
    setSelectedPaletteId(RANDOM_PALETTE_ID);
    setRawLines("");
    setPlaceHint("");
    setCountryHint("");
    setEraHint("");
    setGeneratedFromHash("");
    setActiveRunId(null);
    activeRunIdRef.current = null;

    const payload = {
      sessionId,
      mode,
      fidelity: "balanced",
      rawLines: "",
      placeHint: "",
      countryHint: "",
      eraHint: "",
      scriptAnalysis: null,
      selectedId: null,
      items: [],
      updatedAt: new Date().toISOString(),
      generatedFromHash: "",
      activeRunId: null,
    };

    try {
      localStorage.setItem(LS_SESSION_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }

    try {
      await postJson("/api/collage-broll/session", payload);
    } catch (err) {
      console.warn(
        "[CollageBroll] Limpar tudo: falha ao limpar no backend",
        err
      );
    }
  };

  const handleRestoreDemo = () => {
    setRawLines(isGeo ? DEMO_LINES_GEO : DEMO_LINES_EDITORIAL);
    setGeneratedFromHash("");
    setItems([]);
  };

  const postJson = useCallback(
    async (path: string, body: unknown) => {
      const res = await fetch(getProjectUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          String(data.error || data.message || `HTTP ${res.status}`)
        );
      return data;
    },
    [getProjectUrl]
  );

  const handleSyncToProject = async () => {
    if (!sessionId) {
      toast.error("Nenhuma sessão ativa para sincronizar.");
      return;
    }
    setSyncing(true);
    toast.loading("Sincronizando mídias e roteiro com a pasta do projeto...", {
      id: "sync-project",
    });
    try {
      const payload = {
        mode,
        fidelity,
        rawLines,
        placeHint,
        countryHint,
        eraHint,
        scriptAnalysis,
        items,
        sessionId,
      };
      await postJson("/api/collage-broll/session", payload);

      const result = await postJson("/api/collage-broll/send-to-project", {
        sessionId,
        projectName: sessionId,
      });

      toast.success(
        `Sincronizado! ${result.copiedFilesCount} arquivos enviados para o projeto.`,
        { id: "sync-project" }
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao sincronizar com o projeto.", {
        id: "sync-project",
      });
    } finally {
      setSyncing(false);
    }
  };

  /** Hidrata sessão do localStorage (reload da página). */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_SESSION_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed?.sessionId) setSessionId(String(parsed.sessionId));
      if (parsed?.mode === "geo" || parsed?.mode === "editorial") {
        setMode(parsed.mode);
      }
      if (typeof parsed?.rawLines === "string" && parsed.rawLines.trim()) {
        setRawLines(parsed.rawLines);
      }
      if (typeof parsed?.placeHint === "string") setPlaceHint(parsed.placeHint);
      if (typeof parsed?.countryHint === "string")
        setCountryHint(parsed.countryHint);
      if (typeof parsed?.eraHint === "string") setEraHint(parsed.eraHint);
      if (
        parsed?.fidelity === "literal" ||
        parsed?.fidelity === "balanced" ||
        parsed?.fidelity === "creative"
      ) {
        setFidelity(parsed.fidelity);
      }
      if (parsed?.scriptAnalysis) {
        setScriptAnalysis(parsed.scriptAnalysis as ScriptAnalysis);
      }
      if (Array.isArray(parsed?.items) && parsed.items.length) {
        setItems(
          (parsed.items as CollageItem[]).map((i) => normalizePipelineItem(i))
        );
        setSelectedId(
          String(parsed.selectedId || parsed.items[0]?.id || "") || null
        );
        setActiveGate(1);
      }
    } catch (err) {
      console.warn("[CollageBroll] falha ao hidratar sessão", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  /** Hidrata sessão a partir do servidor quando o sessionId muda */
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const loadSessionFromServer = async () => {
      try {
        const res = await fetch(
          `/api/collage-broll/session/${encodeURIComponent(sessionId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.ok && data?.session && active) {
          const s = data.session;
          if (s.mode) setMode(s.mode);
          if (s.fidelity) setFidelity(s.fidelity);
          if (s.rawLines) setRawLines(s.rawLines);
          if (s.placeHint) setPlaceHint(s.placeHint);
          if (s.countryHint) setCountryHint(s.countryHint);
          if (s.eraHint) setEraHint(s.eraHint);
          if (s.scriptAnalysis) setScriptAnalysis(s.scriptAnalysis);
          if (Array.isArray(s.items) && s.items.length) {
            setItems(s.items.map((i: any) => normalizePipelineItem(i)));
            setSelectedId(s.selectedId || s.items[0]?.id || null);
            setActiveGate(1);
          }
        }
      } catch (err) {
        console.warn("[CollageBroll] Erro ao carregar sessão do servidor", err);
      }
    };
    loadSessionFromServer();
    return () => {
      active = false;
    };
  }, [sessionId]);

  /** Persiste sessão local + espelho no backend (best-effort). */
  const persistSession = useCallback(
    async (nextItems: CollageItem[], opts: { silent?: boolean } = {}) => {
      const payload = {
        sessionId,
        mode,
        fidelity,
        rawLines,
        placeHint,
        countryHint,
        eraHint,
        scriptAnalysis,
        selectedId,
        items: nextItems,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(LS_SESSION_KEY, JSON.stringify(payload));
      } catch (err) {
        console.warn("[CollageBroll] localStorage cheio/indisponível", err);
      }
      try {
        await postJson("/api/collage-broll/session", payload);
      } catch (err) {
        if (!opts.silent) {
          console.warn("[CollageBroll] persist backend falhou", err);
        }
      }
    },
    [
      sessionId,
      mode,
      fidelity,
      rawLines,
      placeHint,
      countryHint,
      eraHint,
      scriptAnalysis,
      selectedId,
      postJson,
    ]
  );

  useEffect(() => {
    if (!hydrated || !items.length) return;
    const t = window.setTimeout(() => {
      void persistSession(items, { silent: true });
    }, 400);
    return () => window.clearTimeout(t);
  }, [items, hydrated, persistSession]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || items[0] || null,
    [items, selectedId]
  );

  const approved = useMemo(
    () => items.filter((i) => i.status === "approved"),
    [items]
  );

  const runGate1 = async () => {
    setBusy(true);
    const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    activeRunIdRef.current = runId;
    setActiveRunId(runId);
    const targetHash = currentHash;
    const targetLines = currentNormalizedLines;

    try {
      const data = await postJson("/api/collage-broll/metaphors", {
        text: targetLines.join("\n"),
        mode,
        place: placeHint,
        country: countryHint,
        era: eraHint,
        fidelity: mode === "geo" ? fidelity : "balanced",
        semantic_director: mode === "geo",
        generationRunId: runId,
        inputHash: targetHash,
      });

      if (activeRunIdRef.current !== runId) {
        console.warn(
          "[CollageBroll] Ignorando resposta assíncrona de execução antiga."
        );
        return;
      }

      const list = (data.items || []) as CollageItem[];
      if (!list.length) throw new Error("Nenhuma proposta visual retornada.");

      setGeneratedFromHash(targetHash);
      setScriptAnalysis((data.scriptAnalysis as ScriptAnalysis) || null);
      const nextSid = `collage_${Date.now().toString(36)}`;
      setSessionId(nextSid);

      const mapped = list.map((i) => {
        let paletteForCard: PalettePreset | null = resolvedPalette;
        if (selectedPaletteId === RANDOM_PALETTE_ID) {
          paletteForCard = pickRandomPalette(activePalettes);
        }
        const base: CollageItem = {
          ...i,
          mode: i.mode || mode,
          status: "pending" as const,
          gate: 1,
          activeVersion: 1,
          versions: [],
          candidate: null,
          candidateMeta: null,
          rejectionReason: undefined,
          rejectionNote: undefined,
          rejectionReasons: undefined,
          ...(paletteForCard
            ? {
                background_color: {
                  name: paletteForCard.label,
                  hex: paletteForCard.hex,
                },
                accent_colors: paletteForCard.accentColors,
              }
            : {}),
        };
        base.versions = [snapshotFromItem(base, { version: 1 })];
        return base;
      });

      setItems(mapped);
      setSelectedId(list[0]?.id || null);
      setActiveGate(1);
      setReviewPanel("none");

      const gate1Payload = {
        sessionId: nextSid,
        mode,
        fidelity,
        rawLines,
        placeHint,
        countryHint,
        eraHint,
        scriptAnalysis: (data.scriptAnalysis as ScriptAnalysis) || null,
        selectedId: list[0]?.id || null,
        items: mapped,
        updatedAt: new Date().toISOString(),
        generatedFromHash: targetHash,
        activeRunId: runId,
      };
      try {
        localStorage.setItem(LS_SESSION_KEY, JSON.stringify(gate1Payload));
      } catch {
        /* ignore */
      }
      void postJson("/api/collage-broll/session", gate1Payload).catch(() => {
        /* best-effort */
      });
      toast.success(
        mode === "geo"
          ? `${list.length} proposta(s) geo · Semantic Director`
          : `${list.length} proposta(s) · confirme no Gate 1`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no Gate 1");
    } finally {
      if (activeRunIdRef.current === runId) {
        setBusy(false);
      }
    }
  };

  const patchItem = (id: string, patch: Partial<CollageItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const openRegenPanel = (item: CollageItem) => {
    setReviewPanel("regen");
    setRegenInstruction("");
    setSelectedQuickFixes([]);
    const preservable = listPreservableFromItem(item);
    setPreserveChecked(preservable);
    setReplaceChecked([]);
  };

  const openRejectPanel = (item?: CollageItem | null) => {
    const target = item || selected;
    if (!target) {
      toast.error("Selecione um card antes de rejeitar.");
      return;
    }
    setSelectedId(target.id);
    setRejectReasons([]);
    setRejectNote("");
    setReviewPanel("reject");
    toast("Escolha o motivo da rejeição", { icon: "⛔", duration: 2500 });
    // Garante foco visual no modal
    window.setTimeout(() => {
      rejectModalRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      rejectModalRef.current?.focus?.();
    }, 30);
  };

  const scriptLines = useMemo(
    () =>
      rawLines
        .split(/\r?\n+/)
        .map((l) => l.replace(/^[\s\-*•\d.)]+/, "").trim())
        .filter((l) => l.length >= 8),
    [rawLines]
  );

  const regenerateCard = async (
    item: CollageItem,
    opts: {
      instruction?: string;
      quickFixes?: string[];
      rejectionReasons?: string[];
      preserveElements?: string[];
      replaceElements?: string[];
    } = {}
  ) => {
    if (regenLockRef.current) return;
    regenLockRef.current = true;
    setRegenBusyId(item.id);
    patchItem(item.id, { status: "regenerating", lastError: undefined });

    const idx = items.findIndex((i) => i.id === item.id);
    const previousLine = idx > 0 ? items[idx - 1].line : "";
    const nextLine =
      idx >= 0 && idx < items.length - 1 ? items[idx + 1].line : "";
    const idempotencyKey = `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      toast("Esta ação gerará uma nova proposta para apenas 1 card.", {
        icon: "ℹ️",
        duration: 3500,
      });
      const data = await postJson("/api/collage-broll/metaphors/regenerate", {
        cardId: item.id,
        currentItem: item,
        fullScript: scriptLines.length ? scriptLines : items.map((i) => i.line),
        previousLine,
        currentLine: item.line,
        nextLine,
        instruction: opts.instruction ?? regenInstruction,
        quickFixes: opts.quickFixes ?? selectedQuickFixes,
        rejectionReasons: opts.rejectionReasons ?? [],
        preserveElements: opts.preserveElements ?? preserveChecked,
        replaceElements: opts.replaceElements ?? replaceChecked,
        editScope: "all",
        mode: item.mode || mode,
        fidelity: mode === "geo" ? fidelity : "balanced",
        place: placeHint,
        country: countryHint,
        era: eraHint,
        scriptAnalysis,
        idempotencyKey,
      });

      const candidate = data.candidateVersion as CollageItem;
      if (!candidate?.visual_proposition && !candidate?.key_objects?.length) {
        throw new Error("Candidata vazia retornada pelo servidor.");
      }

      // Só este card muda — demais intactos (incluindo approved)
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== item.id) return i;
          return {
            ...i,
            status: "candidate_ready",
            candidate: {
              ...candidate,
              id: i.id,
              line: i.line,
              mode: candidate.mode || i.mode,
            },
            candidateMeta: {
              changes: data.changes || [],
              scoreDiffs: data.scoreDiffs || [],
              warnings: data.warnings || [],
            },
            lastError: undefined,
          };
        })
      );
      setReviewPanel("none");
      toast.success("Nova versão pronta — compare e escolha");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao regenerar";
      patchItem(item.id, {
        status: item.status === "approved" ? "approved" : "error",
        lastError: msg,
      });
      toast.error(msg);
    } finally {
      setRegenBusyId(null);
      regenLockRef.current = false;
    }
  };

  const acceptCandidate = (item: CollageItem) => {
    if (!item.candidate) return;
    const nextVersion = (item.activeVersion || 1) + 1;
    const history = [...(item.versions || [])];
    // garante snapshot da versão atual antes de trocar
    if (!history.some((v) => v.version === (item.activeVersion || 1))) {
      history.push(
        snapshotFromItem(item, { version: item.activeVersion || 1 })
      );
    }
    const applied = applyProposalFields(item, item.candidate);
    const withVersion: CollageItem = {
      ...applied,
      status: "needs_review",
      activeVersion: nextVersion,
      versions: [
        ...history,
        snapshotFromItem(
          { ...applied, activeVersion: nextVersion },
          {
            version: nextVersion,
            regenerationInstruction: regenInstruction,
            quickFixes: selectedQuickFixes,
          }
        ),
      ],
      candidate: null,
      candidateMeta: null,
      isModifiedSpec: true,
    };
    setItems((prev) => prev.map((i) => (i.id === item.id ? withVersion : i)));
    toast.success(`v${nextVersion} aplicada — ainda precisa de aprovação`);
  };

  const discardCandidate = (item: CollageItem) => {
    patchItem(item.id, {
      candidate: null,
      candidateMeta: null,
      status:
        item.status === "candidate_ready"
          ? item.versions && item.versions.length
            ? "pending"
            : "pending"
          : item.status === "regenerating"
            ? "pending"
            : item.status,
    });
    // restaura pending se não era approved/rejected
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== item.id) return i;
        const wasApproved = i.versions?.some(() => false);
        void wasApproved;
        return {
          ...i,
          candidate: null,
          candidateMeta: null,
          status:
            i.status === "approved" || i.status === "rejected"
              ? i.status
              : "pending",
        };
      })
    );
    toast.success("Candidata descartada — versão atual mantida");
  };

  const restoreVersion = (item: CollageItem, version: number) => {
    const snap = (item.versions || []).find((v) => v.version === version);
    if (!snap?.proposal) {
      toast.error("Versão não encontrada");
      return;
    }
    const restored = applyProposalFields(item, snap.proposal as CollageItem);
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...restored,
              activeVersion: version,
              status: "needs_review",
              candidate: null,
              candidateMeta: null,
              versions: i.versions,
              isModifiedSpec: version !== 1,
            }
          : i
      )
    );
    toast.success(`Restaurada v${version}`);
  };

  const approveSelected = (status: "approved" | "rejected") => {
    if (!selected) {
      toast.error("Nenhum card selecionado.");
      return;
    }
    if (status === "rejected") {
      openRejectPanel(selected);
      return;
    }
    setItems((prev) => {
      const next = prev.map((i) =>
        i.id === selected.id
          ? {
              ...i,
              status: "approved" as const,
              approvalStatus: "approved",
              rejectionReason: undefined,
              rejectionNote: undefined,
              rejectionReasons: undefined,
            }
          : i
      );
      void persistSession(next, { silent: true });
      return next;
    });
    toast.success(`Card ${selected.id} aprovado`);
  };

  /**
   * Confirma rejeição do card selecionado.
   * - Rejeitar apenas: status rejected + API + persistência
   * - Rejeitar e regenerar: rejected → regenerating → candidate_ready
   */
  const confirmReject = async (andRegen: boolean) => {
    if (!selected) {
      toast.error("Nenhum card selecionado.");
      return;
    }
    if (rejectLockRef.current || rejectBusy) return;
    rejectLockRef.current = true;
    setRejectBusy(true);

    const cardId = selected.id;
    const reasonIds = [...rejectReasons];
    const reasonLabels = reasonIds.map(
      (id) => REJECTION_REASONS.find((r) => r.id === id)?.label || id
    );
    const note = rejectNote.trim();
    const primaryReason = reasonIds[0] || (note ? "other" : "other");

    const rejectedPatch: Partial<CollageItem> = {
      status: "rejected",
      approvalStatus: "rejected",
      rejectionReason: primaryReason,
      rejectionReasons: reasonIds.length ? reasonIds : [primaryReason],
      rejectionNote: note,
      rejectedAt: new Date().toISOString(),
      lastError: undefined,
    };

    try {
      // 1) Atualização local imediata (imutável) — nunca falha silenciosa
      let nextItems: CollageItem[] = [];
      setItems((prev) => {
        nextItems = prev.map((card) =>
          card.id === cardId ? { ...card, ...rejectedPatch } : card
        );
        return nextItems;
      });

      // 2) Persistência local (sobrevive a F5)
      try {
        localStorage.setItem(
          LS_SESSION_KEY,
          JSON.stringify({
            sessionId,
            mode,
            fidelity,
            rawLines,
            placeHint,
            countryHint,
            eraHint,
            scriptAnalysis,
            selectedId: cardId,
            items: nextItems,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (lsErr) {
        console.warn("[CollageBroll] localStorage", lsErr);
      }

      // 3) API de rejeição (best-effort — se 404/offline, UI já está rejected)
      let apiOk = false;
      let apiErrMsg = "";
      try {
        await postJson(
          `/api/collage-broll/metaphors/${encodeURIComponent(cardId)}/reject`,
          {
            cardId,
            sessionId,
            reason: primaryReason,
            reasons: reasonIds,
            note,
            regenerate: andRegen,
            mode: selected.mode || mode,
            currentItem: { ...selected, ...rejectedPatch },
          }
        );
        apiOk = true;
      } catch (apiErr) {
        apiErrMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
        console.warn("[CollageBroll] reject API:", apiErrMsg);
        // tenta rota alternativa sem :cardId
        try {
          await postJson("/api/collage-broll/metaphors/reject", {
            cardId,
            sessionId,
            reason: primaryReason,
            reasons: reasonIds,
            note,
            regenerate: andRegen,
            mode: selected.mode || mode,
            currentItem: { ...selected, ...rejectedPatch },
          });
          apiOk = true;
          apiErrMsg = "";
        } catch (apiErr2) {
          apiErrMsg =
            apiErr2 instanceof Error ? apiErr2.message : String(apiErr2);
        }
      }

      // espelho de sessão no backend
      void postJson("/api/collage-broll/session", {
        sessionId,
        mode,
        fidelity,
        rawLines,
        placeHint,
        countryHint,
        eraHint,
        scriptAnalysis,
        selectedId: cardId,
        items: nextItems,
      }).catch(() => {
        /* ignore */
      });

      setReviewPanel("none");
      if (apiOk) {
        toast.success(`Card ${cardId} rejeitado`);
      } else {
        toast.success(`Card ${cardId} rejeitado (salvo localmente)`, {
          duration: 4000,
        });
        if (apiErrMsg) {
          toast(
            `Backend ainda sem rota reject — reinicie o serviço. (${apiErrMsg.slice(0, 80)})`,
            { icon: "⚠️", duration: 5000 }
          );
        }
      }

      if (andRegen) {
        const instruction =
          note ||
          (reasonLabels.length
            ? `Corrigir: ${reasonLabels.join("; ")}`
            : "Gerar versão melhor alinhada à narração");
        const quick =
          selectedQuickFixes.length > 0
            ? selectedQuickFixes
            : reasonIds.includes("too_abstract")
              ? ["more_literal", "preserve_entities"]
              : reasonIds.includes("geo_error")
                ? ["more_geographic", "fix_precision", "preserve_entities"]
                : reasonIds.includes("missing_entities")
                  ? ["preserve_entities", "more_geographic"]
                  : ["preserve_entities", "more_literal"];

        const itemForRegen: CollageItem = {
          ...selected,
          ...rejectedPatch,
          status: "rejected",
        };
        setReviewPanel("none");
        await regenerateCard(itemForRegen, {
          rejectionReasons: reasonLabels,
          instruction,
          quickFixes: quick,
          preserveElements: listPreservableFromItem(itemForRegen),
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Falha ao rejeitar o card";
      console.error("[CollageBroll] reject failed", err);
      setItems((prev) =>
        prev.map((card) =>
          card.id === cardId
            ? {
                ...card,
                status: "error" as const,
                lastError: msg,
              }
            : card
        )
      );
      toast.error(msg);
    } finally {
      setRejectBusy(false);
      rejectLockRef.current = false;
    }
  };

  const approveAllPending = (mode: "all" | "clean" = "all") => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.status !== "pending") return i;
        if (mode === "clean" && itemHasAlert(i)) return i;
        return { ...i, status: "approved" as const };
      })
    );
    setPreflightOpen(false);
    toast.success(
      mode === "clean"
        ? "Aprovadas somente as propostas sem alertas"
        : "Todas as pendentes aprovadas"
    );
  };

  /** Estatísticas de preflight para a aprovação em lote. */
  const preflightStats = useMemo(() => {
    const pending = items.filter((i) => i.status === "pending");
    let geoAlerts = 0;
    let lowClarity = 0;
    let missingEntities = 0;
    for (const i of pending) {
      const fiche = buildGeoFiche(i);
      if (fiche?.historicalBorderWarning) geoAlerts++;
      if (
        typeof i.validation?.fiveSecondClarity === "number" &&
        i.validation.fiveSecondClarity < 90
      )
        lowClarity++;
      if ((i.validation?.missingAnchors || []).length > 0) missingEntities++;
    }
    return {
      total: pending.length,
      geoAlerts,
      lowClarity,
      missingEntities,
      withAlerts: pending.filter((i) => itemHasAlert(i)).length,
    };
  }, [items]);

  const mediaSrc = useCallback(
    (url?: string) => {
      if (!url) return "";
      if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
      return getProjectUrl(url);
    },
    [getProjectUrl]
  );

  const framesReady = (item: CollageItem) => {
    const endOk =
      Boolean(item.endFrame?.approved || item.still_approved) &&
      Boolean(
        item.endFrame?.imageUrl ||
        item.still_url ||
        item.endFrame?.imagePath ||
        item.still_path
      );
    const startOk =
      Boolean(item.startFrame?.approved) &&
      Boolean(
        item.startFrame?.imageUrl ||
        item.first_frame_url ||
        item.startFrame?.imagePath ||
        item.first_frame_path
      );
    return endOk && startOk;
  };

  /** Gate 2A — End Frame (fonte de verdade) */
  const generateEndFrameForCard = async (item: CollageItem) => {
    if (item.status !== "approved" && item.status !== "needs_review") {
      toast.error("Aprove a proposta no Gate 1 antes do End Frame.");
      return;
    }
    setMediaBusyId(item.id);
    setMediaBusyKind("still");
    setBusy(true);
    try {
      let working = item;
      if (!item.visual_spec) {
        const specs = await postJson("/api/collage-broll/specs", {
          items: [item],
        });
        const e = (specs.items || [])[0] as CollageItem | undefined;
        if (e) working = { ...item, ...e };
      }
      const data = await postJson("/api/collage-broll/frames/end", {
        sessionId,
        item: working,
      });
      const out = (data.item || data.items?.[0]) as CollageItem;
      if (!out?.endFrame?.imageUrl && !out?.still_url) {
        throw new Error("End Frame não retornado pelo servidor.");
      }
      setItems((prev) => {
        const next = prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                ...out,
                id: i.id,
                line: i.line,
                status: "approved" as const,
                gate: 2,
                still_approved: false,
                endFrame: {
                  ...(out.endFrame || {}),
                  approved: false,
                },
              }
            : i
        );
        void persistSession(next, { silent: true });
        return next;
      });
      setActiveGate(2);
      toast.success(`End Frame gerado · ${item.id}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Falha ao gerar End Frame";
      toast.error(msg);
      patchItem(item.id, { lastError: msg });
    } finally {
      setMediaBusyId(null);
      setMediaBusyKind(null);
      setBusy(false);
    }
  };

  /** Gate 2B — Start Frame a partir do End Frame */
  const generateStartFrameForCard = async (item: CollageItem) => {
    if (!(item.endFrame?.approved || item.still_approved)) {
      toast.error("Aprove o End Frame (Gate 2A) antes do Start Frame.");
      return;
    }
    setMediaBusyId(item.id);
    setMediaBusyKind("still");
    setBusy(true);
    try {
      const data = await postJson("/api/collage-broll/frames/start", {
        sessionId,
        item,
      });
      const out = (data.item || data.items?.[0]) as CollageItem;
      if (!out?.startFrame?.imageUrl && !out?.first_frame_url) {
        throw new Error("Start Frame não retornado.");
      }
      setItems((prev) => {
        const next = prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                ...out,
                id: i.id,
                line: i.line,
                startFrame: {
                  ...(out.startFrame || {}),
                  approved: false,
                },
              }
            : i
        );
        void persistSession(next, { silent: true });
        return next;
      });
      toast.success(`Start Frame gerado · ${item.id}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Falha ao gerar Start Frame";
      toast.error(msg);
      patchItem(item.id, { lastError: msg });
    } finally {
      setMediaBusyId(null);
      setMediaBusyKind(null);
      setBusy(false);
    }
  };

  const handleUploadFrame = async (
    item: CollageItem,
    which: "end" | "start" | "video",
    file: File
  ) => {
    if (!file) return;

    if (which === "video" && !file.type.startsWith("video/")) {
      toast.error("Por favor, selecione um arquivo de vídeo válido.");
      return;
    }
    if (which !== "video" && !file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const rawRes = reader.result as string;
      const base64 = rawRes.split(",")[1];
      if (!base64) {
        toast.error("Erro ao ler arquivo.");
        return;
      }

      setMediaBusyId(item.id);
      setMediaBusyKind(which === "video" ? "video" : "still");
      setBusy(true);

      try {
        const data = await postJson("/api/collage-broll/media/upload", {
          sessionId,
          id: item.id,
          frame: which,
          fileBase64: base64,
          fileName: file.name,
        });

        const out = data.item as Partial<CollageItem>;
        setItems((prev) => {
          const next = prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  ...out,
                  id: i.id,
                  line: i.line,
                }
              : i
          );
          void persistSession(next, { silent: true });
          return next;
        });

        toast.success(
          which === "video"
            ? "Vídeo manual carregado com sucesso!"
            : which === "start"
              ? "Start Frame manual carregado!"
              : "End Frame manual carregado!"
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Falha ao realizar upload"
        );
      } finally {
        setMediaBusyId(null);
        setMediaBusyKind(null);
        setBusy(false);
      }
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo local.");
    };
    reader.readAsDataURL(file);
  };

  const approveFrame = async (item: CollageItem, which: "end" | "start") => {
    if (which === "end") {
      if (!item.endFrame?.imageUrl && !item.still_url) {
        toast.error("Gere o End Frame primeiro.");
        return;
      }
    } else if (!item.startFrame?.imageUrl && !item.first_frame_url) {
      toast.error("Gere o Start Frame primeiro.");
      return;
    }
    setMediaBusyId(item.id);
    try {
      const data = await postJson("/api/collage-broll/frames/approve", {
        cardId: item.id,
        sessionId,
        frame: which,
        item,
      });
      const out = (data.item || {}) as CollageItem;
      setItems((prev) => {
        const next = prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                ...out,
                id: i.id,
                line: i.line,
              }
            : i
        );
        void persistSession(next, { silent: true });
        return next;
      });
      toast.success(
        which === "end"
          ? `End Frame ${item.id} aprovado`
          : `Start Frame ${item.id} aprovado`
      );
      if (data.canRunGate3) {
        toast("Gate 3 liberado — os dois frames estão aprovados", {
          icon: "✅",
        });
      }
    } catch (err) {
      // local fallback
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== item.id) return i;
          if (which === "end") {
            return {
              ...i,
              endFrame: {
                ...(i.endFrame || {}),
                approved: true,
                status: "approved",
              },
              still_approved: true,
              still_status: "approved",
            };
          }
          return {
            ...i,
            startFrame: {
              ...(i.startFrame || {}),
              approved: true,
              status: "approved",
            },
          };
        })
      );
      toast.success(
        which === "end" ? "End Frame aprovado" : "Start Frame aprovado"
      );
      if (err instanceof Error) console.warn(err.message);
    } finally {
      setMediaBusyId(null);
    }
  };

  /** Legado: generateStill = End Frame */
  const generateStillForCard = generateEndFrameForCard;
  const approveStillForCard = (item: CollageItem) => approveFrame(item, "end");

  const generateVideoForCard = async (item: CollageItem) => {
    if (!framesReady(item)) {
      toast.error(
        "Aprove End Frame e Start Frame antes do vídeo (Gate 2A + 2B)."
      );
      return;
    }
    setMediaBusyId(item.id);
    setMediaBusyKind("video");
    setBusy(true);
    try {
      const data = await postJson("/api/collage-broll/videos", {
        sessionId,
        item,
      });
      const out = (data.item || data.items?.[0]) as CollageItem;
      if (!out?.video_url)
        throw new Error("Vídeo não retornado pelo servidor.");
      setItems((prev) => {
        const next = prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                ...out,
                id: i.id,
                line: i.line,
                status: "approved" as const,
                gate: 3,
              }
            : i
        );
        void persistSession(next, { silent: true });
        return next;
      });
      setActiveGate(3);
      toast.success(`Vídeo Gate 3 gerado · ${item.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao gerar vídeo";
      toast.error(msg);
      patchItem(item.id, { lastError: msg });
    } finally {
      setMediaBusyId(null);
      setMediaBusyKind(null);
      setBusy(false);
    }
  };

  const buildGate2 = async () => {
    const targets = items.filter(
      (i) => i.status === "approved" || i.status === "needs_review"
    );
    if (!targets.length) {
      toast.error("Aprove ao menos uma proposta no Gate 1.");
      return;
    }
    for (const t of targets) {
      await generateEndFrameForCard(t);
    }
  };

  const buildGate3 = async () => {
    const targets = items.filter((i) => framesReady(i));
    if (!targets.length) {
      toast.error(
        "Aprove End Frame + Start Frame em cada card antes do vídeo."
      );
      return;
    }
    for (const t of targets) {
      const spec = t.visual_spec || t;
      const errors = validateEditorialContinuity(spec);
      if (errors.length > 0) {
        toast.error(`Card ${t.id} possui erros de continuidade: ${errors[0]}`);
        return;
      }
    }
    for (const t of targets) {
      await generateVideoForCard(t);
    }
  };

  const exportGoogleFlow = async (item: CollageItem) => {
    try {
      const data = await postJson("/api/collage-broll/export-flow", {
        sessionId,
        item,
      });
      const pack = data.packages?.[0] || data;
      copyText("Google Flow package", JSON.stringify(pack, null, 2));
      toast.success("Pacote Google Flow copiado (JSON)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no export Flow");
    }
  };

  const downloadMedia = (url: string, filename: string) => {
    const href = mediaSrc(url);
    if (!href) {
      toast.error("Arquivo indisponível");
      return;
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const exportPackage = () => {
    const payload = {
      source: "lumiera-collage-broll",
      repo: "https://github.com/pyang5166/gbro-collage-broll",
      model: "gemini-omni-flash-preview",
      mode,
      place_hint: placeHint || undefined,
      country_hint: countryHint || undefined,
      era_hint: eraHint || undefined,
      aspect_ratio: "9:16",
      duration: 5,
      items: items.filter((i) => i.status === "approved"),
      generated_at: new Date().toISOString(),
    };
    copyText("Pacote JSON", JSON.stringify(payload, null, 2));
  };

  const isGeo = mode === "geo";

  return (
    <div className="space-y-6 max-w-[1680px] mx-auto">
      {/* Hero strip */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${
          isGeo
            ? "border-sky-500/30 bg-gradient-to-br from-sky-950/90 via-zinc-950 to-emerald-950/50"
            : "border-violet-500/25 bg-gradient-to-br from-violet-950/80 via-zinc-950 to-amber-950/40"
        }`}
      >
        <div
          className={`absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl ${isGeo ? "bg-sky-500/15" : "bg-violet-500/10"}`}
        />
        <div
          className={`absolute -left-10 bottom-0 h-32 w-32 rounded-full blur-3xl ${isGeo ? "bg-emerald-500/10" : "bg-amber-500/10"}`}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-5 justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  isGeo
                    ? "border-sky-400/30 bg-sky-500/15 text-sky-200"
                    : "border-violet-400/30 bg-violet-500/15 text-violet-200"
                }`}
              >
                {isGeo ? (
                  <MapIcon className="w-3 h-3" />
                ) : (
                  <Scissors className="w-3 h-3" />
                )}
                {isGeo ? "Geo collage · mapas" : "Paper-collage B-roll"}
              </span>
              {/* Toggle Criador / Diagnóstico técnico */}
              <span className="inline-flex overflow-hidden rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode("criador")}
                  className={`px-2.5 py-1 text-[10px] font-bold transition ${
                    viewMode === "criador"
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Criador
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("tecnico")}
                  className={`px-2.5 py-1 text-[10px] font-bold transition ${
                    viewMode === "tecnico"
                      ? "bg-sky-400/15 text-sky-200"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Diagnóstico
                </button>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {isGeo ? "Cartografia em papel" : "Halftone collage B-roll"}
            </h2>
            <p className="text-[12px] text-zinc-400 max-w-2xl leading-relaxed">
              {isGeo
                ? "Trechos de narração viram B-roll de mapa em colagem: silhuetas de países, rotas pontilhadas, pinos de papel, bússolas e satélite em meio-tom — sem UI de Google Maps."
                : "Transforme trechos de ~5s de narração em B-roll editorial de papel: cor de fundo plana, recortes P&B em meio-tom, cartolina colorida e montagem stop-motion — com um fluxo guiado para não queimar API de vídeo."}
            </p>
            {viewMode === "tecnico" && (
              <a
                href="https://github.com/pyang5166/gbro-collage-broll"
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1.5 text-[11px] ${isGeo ? "text-sky-300 hover:text-sky-100" : "text-violet-300 hover:text-violet-100"}`}
              >
                <Github className="w-3.5 h-3.5" />
                pyang5166/gbro-collage-broll · assemble-from-empty
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {/* Opção aleatória */}
            <button
              type="button"
              onClick={() => setSelectedPaletteId(RANDOM_PALETTE_ID)}
              className={`rounded-xl border overflow-hidden shadow-lg shadow-black/40 transition-all cursor-pointer ${
                selectedPaletteId === RANDOM_PALETTE_ID
                  ? "border-amber-400/70 ring-2 ring-amber-400/40 scale-105"
                  : "border-white/10 hover:border-white/30 hover:scale-[1.03]"
              }`}
              title="Paleta aleatória — cada card recebe uma cor diferente"
            >
              <div
                className="h-14 w-16 sm:w-20 relative flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #3D2463 0%, #0B3D5C 35%, #D4A017 65%, #8B1E3F 100%)",
                }}
              >
                <Shuffle className="w-5 h-5 text-white/90 drop-shadow-md" />
              </div>
              <p
                className={`text-[8px] text-center py-1 bg-zinc-950/80 font-bold ${
                  selectedPaletteId === RANDOM_PALETTE_ID
                    ? "text-amber-300"
                    : "text-zinc-500"
                }`}
              >
                🎲 Aleatório
              </p>
            </button>
            {/* Paletas do modo ativo */}
            {activePalettes.slice(0, 6).map((sw) => {
              const isActive = selectedPaletteId === sw.id;
              return (
                <button
                  key={sw.id}
                  type="button"
                  onClick={() => setSelectedPaletteId(sw.id)}
                  title={`${sw.label} — ${sw.mood}`}
                  className={`rounded-xl border overflow-hidden shadow-lg shadow-black/40 transition-all cursor-pointer ${
                    isActive
                      ? `border-white/60 ring-2 ${
                          isGeo ? "ring-sky-400/50" : "ring-violet-400/50"
                        } scale-105`
                      : "border-white/10 hover:border-white/30 hover:scale-[1.03]"
                  }`}
                >
                  <div
                    className="h-14 w-16 sm:w-20 relative"
                    style={{ backgroundColor: sw.hex }}
                  >
                    {isGeo ? (
                      <>
                        <div className="absolute left-2 top-3 h-7 w-9 rounded-[40%_60%_55%_45%] bg-zinc-200/85 shadow border border-stone-300/40" />
                        <div className="absolute right-2 bottom-3 h-0.5 w-8 bg-amber-300/90 rotate-[-20deg]" />
                        <div className="absolute right-3 top-4 h-2 w-2 rounded-full bg-red-500/90 border border-white/40" />
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-2 border border-white/20 rounded-sm opacity-70" />
                        <div className="absolute bottom-1.5 right-1.5 h-3 w-4 bg-zinc-200/90 rotate-6 rounded-[1px] shadow" />
                        <div className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full bg-black/40" />
                      </>
                    )}
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <Check className="w-5 h-5 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-[8px] text-center py-1 bg-zinc-950/80 ${
                      isActive
                        ? isGeo
                          ? "text-sky-300 font-bold"
                          : "text-violet-300 font-bold"
                        : "text-zinc-500"
                    }`}
                  >
                    {sw.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mode switch */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchMode("editorial")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold transition ${
            !isGeo
              ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
              : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          Editorial
        </button>
        <button
          type="button"
          onClick={() => switchMode("geo")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold transition ${
            isGeo
              ? "border-sky-400/50 bg-sky-500/20 text-sky-100"
              : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          Geo / Mapas
        </button>
        <span className="self-center text-[10px] text-zinc-600">
          {isGeo
            ? "Territórios, rotas, contornos, atlas em colagem"
            : "Metáforas abstratas de processo / ideia"}
        </span>
      </div>

      {/* Fluxo visual de 5 etapas — derive do card selecionado */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {derivePipelineStages(selected).map((stage, idx) => {
            const meta = STAGE_STATE_META[stage.state];
            const active = activeGate === stage.gate;
            return (
              <React.Fragment key={stage.id}>
                {idx > 0 && (
                  <div className="mx-0.5 h-px w-4 shrink-0 bg-zinc-700 sm:w-6" />
                )}
                <button
                  type="button"
                  onClick={() => setActiveGate(stage.gate as 1 | 2 | 3)}
                  title={stage.desc}
                  className={`flex min-w-[104px] shrink-0 flex-col gap-1 rounded-xl border px-2.5 py-2 text-left transition ${
                    active
                      ? "border-violet-400/50 bg-violet-500/10"
                      : `${meta.ring} bg-zinc-950/60 hover:bg-zinc-900/60`
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
                    />
                    <span
                      className={`text-[10px] font-bold ${active ? "text-violet-200" : "text-zinc-200"}`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  <span className={`text-[9px] leading-tight ${meta.text}`}>
                    {stage.note}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
        {!selected && (
          <p className="mt-2 text-[10px] text-zinc-600">
            Selecione um card para ver o estado de cada etapa do fluxo.
          </p>
        )}
      </div>

      {/* Timeline de produção — visão geral de onde o pipeline está parado */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3 overflow-x-auto">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500 flex items-center gap-1.5">
            <Layers className="w-3 h-3" /> Timeline de produção
          </p>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Cena
                </th>
                {[
                  "Proposta",
                  "Frame final",
                  "Frame inicial",
                  "Movimento",
                  "Vídeo",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const stages = derivePipelineStages(item);
                const isSel = selected?.id === item.id;
                const label =
                  item.place_name ||
                  item.line?.slice(0, 28) ||
                  `C${String(idx + 1).padStart(2, "0")}`;
                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                    }}
                    className={`cursor-pointer border-t border-zinc-800/60 transition ${
                      isSel ? "bg-violet-500/10" : "hover:bg-zinc-900/50"
                    }`}
                  >
                    <td className="px-2 py-1.5 text-[10px] font-medium text-zinc-300 whitespace-nowrap max-w-[160px] truncate">
                      C{String(idx + 1).padStart(2, "0")} · {label}
                    </td>
                    {stages.map((s) => {
                      const meta = STAGE_STATE_META[s.state];
                      return (
                        <td key={s.id} className="px-2 py-1.5">
                          <span
                            title={s.note}
                            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold whitespace-nowrap ${meta.ring} ${meta.text}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                            />
                            {s.note}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] gap-5">
        {/* Left: input + list */}
        <div className="space-y-4 min-w-0">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Layers
                  className={`w-3.5 h-3.5 ${isGeo ? "text-sky-300" : "text-violet-300"}`}
                />
                Linhas de narração (~5s cada)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-[10px] text-zinc-400 hover:text-zinc-100 cursor-pointer bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 rounded-md px-2 py-0.5 transition"
                  onClick={handleResetAll}
                >
                  Limpar tudo
                </button>
                <button
                  type="button"
                  className="text-[10px] text-zinc-400 hover:text-zinc-100 cursor-pointer bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 rounded-md px-2 py-0.5 transition"
                  onClick={handleRestoreDemo}
                >
                  Restaurar demo
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[8px] uppercase text-zinc-600 font-bold">
                Fidelidade ao texto
              </span>
              {(
                [
                  ["literal", "Literal"],
                  ["balanced", "Equilibrada"],
                  ["creative", "Criativa"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFidelity(id)}
                  className={`rounded-md border px-2 py-1 text-[10px] font-bold ${
                    fidelity === id
                      ? isGeo
                        ? "border-sky-400/50 bg-sky-500/20 text-sky-100"
                        : "border-violet-400/50 bg-violet-500/20 text-violet-100"
                      : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="space-y-1">
                <span className="text-[8px] uppercase text-zinc-600 font-bold flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{" "}
                  {isGeo ? "Local / POI" : "Objeto / Elemento"}
                </span>
                <input
                  value={placeHint}
                  onChange={(e) => setPlaceHint(e.target.value)}
                  placeholder={
                    isGeo
                      ? "ex.: Atacama, Reno, Tâmisa"
                      : "ex.: ampulheta, engrenagem, nevoeiro"
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-1.5 text-[11px] text-zinc-200"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[8px] uppercase text-zinc-600 font-bold">
                  {isGeo ? "País / região" : "Ambiente / Contexto"}
                </span>
                <input
                  value={countryHint}
                  onChange={(e) => setCountryHint(e.target.value)}
                  placeholder={
                    isGeo
                      ? "ex.: Chile, Império Romano"
                      : "ex.: corporativo, minimalista, surrealista"
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-1.5 text-[11px] text-zinc-200"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[8px] uppercase text-zinc-600 font-bold">
                  {isGeo ? "Época" : "Estilo / Época"}
                </span>
                <input
                  value={eraHint}
                  onChange={(e) => setEraHint(e.target.value)}
                  placeholder={
                    isGeo
                      ? "ex.: séc. I, 1800s"
                      : "ex.: colagem manual, halftone, moderno"
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-1.5 text-[11px] text-zinc-200"
                />
              </label>
            </div>
            <textarea
              value={rawLines}
              onChange={(e) => setRawLines(e.target.value)}
              rows={6}
              placeholder={
                isGeo
                  ? "Uma linha por trecho — cite lugares quando possível…"
                  : "Uma linha por trecho de ~5 segundos…"
              }
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-[12px] text-zinc-200 font-mono leading-relaxed"
            />
            {items.length > 0 && (
              <div
                className={`text-[11px] font-medium rounded-lg p-2.5 border ${
                  isOutOfSync
                    ? "bg-red-500/10 border-red-500/30 text-red-200"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                }`}
              >
                {isOutOfSync
                  ? "⚠️ A narração foi alterada. Gere novamente o Gate 1."
                  : `✅ ${items.length} cards gerados a partir da versão atual da narração.`}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || rawLines.trim().length < 12}
                onClick={() => void runGate1()}
                className={`inline-flex items-center gap-1.5 rounded-lg disabled:opacity-50 text-zinc-950 text-[11px] font-bold px-3 py-2 ${
                  isGeo
                    ? "bg-sky-500 hover:bg-sky-400"
                    : "bg-violet-500 hover:bg-violet-400"
                }`}
              >
                {busy && activeGate === 1 ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                {isGeo
                  ? "Propostas visuais (Gate 1)"
                  : "Gerar metáforas (Gate 1)"}
              </button>
              <button
                type="button"
                disabled={busy || !approved.length || isOutOfSync}
                onClick={() => void buildGate2()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-100 text-[11px] font-bold px-3 py-2 disabled:opacity-50"
                title="Gera imagens reais (Gemini) para todos os cards aprovados"
              >
                {busy && mediaBusyKind === "still" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                Gerar End Frames (2A)
              </button>
              <button
                type="button"
                disabled={
                  busy || !items.some((i) => framesReady(i)) || isOutOfSync
                }
                onClick={() => void buildGate3()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 text-[11px] font-bold px-3 py-2 disabled:opacity-50"
                title="Gera vídeos 5s com Start+End frames aprovados"
              >
                {busy && mediaBusyKind === "video" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Film className="w-3.5 h-3.5" />
                )}
                Gerar vídeos (Gate 3)
              </button>
              <button
                type="button"
                disabled={!approved.length}
                onClick={exportPackage}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-[11px] font-bold px-3 py-2 disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                Exportar JSON
              </button>
              {sessionId && (
                <button
                  type="button"
                  disabled={syncing || !items.length}
                  onClick={() => void handleSyncToProject()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 text-[11px] font-bold px-3 py-2 disabled:opacity-50 hover:bg-emerald-500/20 transition cursor-pointer"
                  title="Salvar e copiar vídeos e imagens diretamente para a pasta do projeto ativo no disco"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Sincronizar com o Projeto
                </button>
              )}
              {onSendToWizard && (
                <button
                  type="button"
                  disabled={!items.length}
                  onClick={() => onSendToWizard(sessionId, rawLines)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 text-[11px] font-bold px-3 py-2 disabled:opacity-50 hover:bg-emerald-500/20 transition cursor-pointer"
                  title="Enviar sessão atual para o Wizard Creator como projeto collage-broll"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Enviar para Wizard
                </button>
              )}
            </div>
          </div>

          {scriptAnalysis && (
            <div
              className={`rounded-xl border p-3 space-y-1.5 ${
                isGeo
                  ? "border-sky-500/25 bg-sky-950/30"
                  : "border-violet-500/25 bg-violet-950/30"
              }`}
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  isGeo ? "text-sky-200" : "text-violet-200"
                }`}
              >
                Análise global do roteiro
              </p>
              <p className="text-[11px] text-zinc-300">
                <span className="text-zinc-500">Tópico:</span>{" "}
                {scriptAnalysis.mainTopic || "—"}
              </p>
              {scriptAnalysis.thesis && (
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {scriptAnalysis.thesis}
                </p>
              )}
              <p className="text-[10px] text-zinc-500">
                Subdomínio: {scriptAnalysis.subdomain || "—"}
                {isGeo && ` · Escala: ${scriptAnalysis.geographicScale || "—"}`}
              </p>
              {isGeo && (scriptAnalysis.locations || []).length > 0 && (
                <p className="text-[10px] text-sky-300/90">
                  Locais: {(scriptAnalysis.locations || []).join(" · ")}
                </p>
              )}
              {isGeo && (scriptAnalysis.locations || []).length >= 3 && (
                <p className="mt-1 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-2 py-1.5 text-[10px] leading-4 text-amber-200/90">
                  {(scriptAnalysis.locations || []).length} locais sem relação
                  espacial direta detectados. Cada linha será tratada como uma
                  cena independente — elementos de um local não vazam para o
                  outro.
                </p>
              )}
            </div>
          )}

          {/* Item cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-bold">
                Itens ({items.length}) · aprovados {approved.length}
              </p>
              {items.some((i) => i.status === "pending") && (
                <button
                  type="button"
                  onClick={() => setPreflightOpen(true)}
                  className="text-[10px] text-violet-300 hover:text-violet-100"
                >
                  Aprovar todas pendentes
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-[12px] text-zinc-500">
                Cole as linhas e rode o Gate 1 para ver as metáforas em cards
                com prévia de color field.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1">
                {items.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                        if (item.id !== selectedId) {
                          setReviewPanel("none");
                        }
                      }}
                      className={`text-left rounded-xl border overflow-hidden transition ${
                        active
                          ? item.status === "candidate_ready"
                            ? "border-amber-400/50 ring-1 ring-amber-400/30"
                            : item.status === "regenerating"
                              ? "border-violet-400/50 ring-1 ring-violet-400/30"
                              : item.status === "rejected"
                                ? "border-red-400/60 ring-1 ring-red-400/40"
                                : item.status === "approved"
                                  ? "border-emerald-400/40 ring-1 ring-emerald-400/20"
                                  : "border-violet-400/50 ring-1 ring-violet-400/30"
                          : item.status === "approved"
                            ? "border-emerald-900/60 hover:border-emerald-700/50"
                            : item.status === "rejected"
                              ? "border-red-800/70 hover:border-red-600/50"
                              : "border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div
                        className="h-20 relative"
                        style={{
                          backgroundColor: item.background_color?.hex || "#222",
                        }}
                      >
                        {item.mode === "geo" || isGeo ? (
                          <>
                            <div className="absolute left-3 top-4 h-9 w-11 rounded-[40%_60%_50%_50%] bg-zinc-200/90 shadow border border-stone-300/40" />
                            <div className="absolute right-4 bottom-3 h-0.5 w-10 bg-amber-300/90 rotate-[-18deg]" />
                            <div className="absolute right-5 top-5 h-2 w-2 rounded-full bg-red-500 border border-white/50" />
                          </>
                        ) : (
                          <>
                            <div className="absolute left-3 top-3 h-8 w-10 bg-zinc-300/90 rotate-[-6deg] shadow-md border border-stone-200" />
                            <div className="absolute right-4 bottom-2 h-6 w-8 bg-black/50 rotate-3" />
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-amber-400/80" />
                          </>
                        )}
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono bg-black/50 text-white px-1.5 py-0.5 rounded">
                          {item.id}
                        </span>
                      </div>
                      <div className="p-2.5 bg-zinc-950 space-y-1">
                        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-snug">
                          {item.line}
                        </p>
                        <p className="text-[11px] font-semibold text-white line-clamp-2">
                          {item.visual_proposition || "—"}
                        </p>
                        {(item.place_name || item.country) && (
                          <p className="text-[9px] text-sky-400/90 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {[item.place_name, item.country]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                        {item.status === "rejected" &&
                          (item.rejectionNote || item.rejectionReason) && (
                            <p className="text-[9px] text-red-300/90 line-clamp-2">
                              {item.rejectionNote ||
                                REJECTION_REASONS.find(
                                  (r) => r.id === item.rejectionReason
                                )?.label ||
                                item.rejectionReason}
                            </p>
                          )}
                        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                          <span
                            className={`text-[8px] px-1.5 py-0.5 rounded border ${
                              item.status === "approved"
                                ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                                : item.status === "rejected"
                                  ? "border-red-500/40 text-red-300 bg-red-500/10"
                                  : item.status === "regenerating"
                                    ? "border-violet-500/40 text-violet-300 animate-pulse"
                                    : item.status === "candidate_ready"
                                      ? "border-amber-400/50 text-amber-200 bg-amber-500/10"
                                      : item.status === "error"
                                        ? "border-red-400/50 text-red-200"
                                        : item.status === "needs_review"
                                          ? "border-sky-500/40 text-sky-300"
                                          : "border-zinc-700 text-zinc-500"
                            }`}
                          >
                            {item.status === "regenerating"
                              ? "gerando…"
                              : item.status === "candidate_ready"
                                ? "nova versão"
                                : item.status}
                          </span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 font-mono">
                            v{item.activeVersion || 1}
                          </span>
                          {viewMode === "tecnico" &&
                            (!activeRunId ||
                              item.generationRunId !== activeRunId ||
                              item.isModifiedSpec) && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded border border-red-500/50 text-red-300 bg-red-500/10 font-semibold">
                                dessincronizado
                              </span>
                            )}
                          {(() => {
                            const spec = item.visual_spec || item;
                            const errors = validateEditorialContinuity(spec);
                            if (errors.length > 0) {
                              return (
                                <span
                                  className="text-[8px] px-1.5 py-0.5 rounded border border-amber-500/50 text-amber-300 bg-amber-500/10 font-semibold"
                                  title={errors.join("\n")}
                                >
                                  ⚠️ {errors.length} erro(s) de continuidade
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {(item.mode === "geo" || isGeo) && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded border border-sky-500/30 text-sky-300">
                              {item.visualProposal?.visualMode || "geo"}
                            </span>
                          )}
                          {viewMode === "tecnico" &&
                            typeof item.validation?.semanticAlignment ===
                              "number" && (
                              <span className="text-[8px] text-zinc-500">
                                sem {item.validation.semanticAlignment}
                                {typeof item.validation.geographicRelevance ===
                                "number"
                                  ? ` · geo ${item.validation.geographicRelevance}`
                                  : ""}
                              </span>
                            )}
                          {(item.versions?.length || 0) > 1 && (
                            <History className="w-3 h-3 text-zinc-600" />
                          )}
                        </div>
                        {viewMode === "tecnico" &&
                          (() => {
                            const p = derivePipelineStatus(item, {
                              mediaBusyKind:
                                mediaBusyId === item.id ? mediaBusyKind : null,
                              isMediaBusy: mediaBusyId === item.id,
                            });
                            return (
                              <p className="text-[8px] text-zinc-600 pt-0.5 leading-snug">
                                G1 {p.gate1.label} · img {p.image.label} · still{" "}
                                {p.still.label} · vid {p.video.label}
                              </p>
                            );
                          })()}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: detail / preview */}
        <div className="space-y-3 min-w-0">
          {!selected ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-8 text-center text-zinc-500 text-sm">
              Selecione um item para inspecionar.
            </div>
          ) : (
            <>
              {/* Próxima ação única — conduz o usuário pelo pipeline */}
              {(() => {
                const next = computeNextAction(selected);
                const toneCls =
                  next.tone === "action"
                    ? "border-emerald-400/40 bg-emerald-400/[0.07]"
                    : next.tone === "running"
                      ? "border-sky-400/40 bg-sky-400/[0.07]"
                      : next.tone === "done"
                        ? "border-zinc-700 bg-zinc-900/50"
                        : next.tone === "error"
                          ? "border-rose-400/40 bg-rose-400/[0.07]"
                          : "border-zinc-800 bg-zinc-950/50";
                const labelCls =
                  next.tone === "action"
                    ? "text-emerald-200"
                    : next.tone === "running"
                      ? "text-sky-200"
                      : next.tone === "done"
                        ? "text-zinc-300"
                        : next.tone === "error"
                          ? "text-rose-200"
                          : "text-zinc-400";
                return (
                  <div className={`rounded-2xl border px-4 py-3 ${toneCls}`}>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500 font-bold">
                      Próxima etapa
                    </p>
                    <p className={`mt-0.5 text-sm font-bold ${labelCls}`}>
                      {next.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-zinc-400">
                      {next.hint}
                    </p>
                  </div>
                );
              })()}
              {/* Phone-like 9:16 preview */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <p className="text-[9px] uppercase tracking-wide text-zinc-500 font-bold mb-2 flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  Visualizador do Card · {selected.id}
                </p>
                {/* Toggles for Preview Mode */}
                <div className="flex items-center justify-between gap-1 mb-2 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800">
                  {(
                    [
                      ["start", "Start Frame"],
                      ["end", "End Frame"],
                      ["motion", "Motion Path"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPreviewFrameMode(id)}
                      className={`text-[9px] px-2 py-1 rounded font-bold transition flex-1 text-center cursor-pointer ${
                        previewFrameMode === id
                          ? "bg-zinc-800 text-white shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mx-auto w-full max-w-[220px]">
                  <div className="relative aspect-[9/16] rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-zinc-950">
                    <svg
                      viewBox="0 0 100 177.8"
                      className="w-full h-full"
                      style={{
                        backgroundColor:
                          (selected.visual_spec?.backdrop as any)?.colorHex ||
                          selected.background_color?.hex ||
                          "#1a1a1a",
                      }}
                    >
                      <defs>
                        <marker
                          id="arrow"
                          viewBox="0 0 10 10"
                          refX="6"
                          refY="5"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 2 L 8 5 L 0 8 z" fill="#f5e6c8" />
                        </marker>
                      </defs>

                      {/* Render layers */}
                      {(() => {
                        const spec = selected.visual_spec || selected;
                        const layersList = spec.layers || [];
                        const sorted = [...layersList].sort(
                          (a: any, b: any) =>
                            (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0)
                        );

                        return sorted.map((l: any, lIdx: number) => {
                          const start = l.startTransform || {};
                          const end = l.endTransform || {};
                          const color =
                            l.colorHex ||
                            selected.accent_colors?.[
                              lIdx % (selected.accent_colors?.length || 1)
                            ] ||
                            "#cccccc";

                          const drawLayerRect = (
                            tx: number,
                            ty: number,
                            tw: number,
                            th: number,
                            rot: number,
                            sc: number,
                            opacity: number,
                            borderStyle: string,
                            isStartRep: boolean
                          ) => {
                            const w = tw || 50;
                            const h = th || 50;
                            return (
                              <g
                                key={`${l.id}-${isStartRep ? "start" : "end"}`}
                                transform={`translate(${tx}, ${ty}) rotate(${rot}) scale(${sc})`}
                              >
                                <rect
                                  x={-w / 2}
                                  y={-h / 2}
                                  width={w}
                                  height={h}
                                  fill={color}
                                  fillOpacity={opacity * 0.75}
                                  stroke={l.keyline ? "#ffffff" : color}
                                  strokeWidth={l.keyline ? "1" : "0.5"}
                                  strokeDasharray={borderStyle}
                                  rx="2"
                                />
                                {l.halftone && (
                                  <pattern
                                    id={`half-${l.id}`}
                                    width="4"
                                    height="4"
                                    patternUnits="userSpaceOnUse"
                                  >
                                    <circle
                                      cx="2"
                                      cy="2"
                                      r="1"
                                      fill="#000000"
                                      fillOpacity="0.15"
                                    />
                                  </pattern>
                                )}
                                {l.halftone && (
                                  <rect
                                    x={-w / 2}
                                    y={-h / 2}
                                    width={w}
                                    height={h}
                                    fill={`url(#half-${l.id})`}
                                    rx="2"
                                  />
                                )}
                                <text
                                  x="0"
                                  y="2"
                                  textAnchor="middle"
                                  fontSize="4"
                                  fill="#000000"
                                  fontWeight="bold"
                                  stroke="#ffffff"
                                  strokeWidth="0.5"
                                  paintOrder="stroke"
                                >
                                  {l.id}
                                </text>
                              </g>
                            );
                          };

                          if (previewFrameMode === "start") {
                            const opacity =
                              start.visibility === "off-frame" ? 0.35 : 1.0;
                            const border =
                              start.visibility === "off-frame" ? "2,2" : "none";
                            return drawLayerRect(
                              start.x ?? 50,
                              start.y ?? 50,
                              start.width ?? 50,
                              start.height ?? 50,
                              start.rotation ?? 0,
                              start.scale ?? 1.0,
                              opacity,
                              border,
                              true
                            );
                          } else if (previewFrameMode === "end") {
                            return drawLayerRect(
                              end.x ?? 50,
                              end.y ?? 88.9,
                              end.width ?? 50,
                              end.height ?? 50,
                              end.rotation ?? 0,
                              end.scale ?? 1.0,
                              1.0,
                              "none",
                              false
                            );
                          } else {
                            const isAnimated = l.isAnimated;
                            const startX = start.x ?? 50;
                            const startY = start.y ?? -100;
                            const endX = end.x ?? 50;
                            const endY = end.y ?? 88.9;

                            return (
                              <g key={`motion-group-${l.id}`}>
                                {isAnimated && (
                                  <line
                                    x1={startX}
                                    y1={startY}
                                    x2={endX}
                                    y2={endY}
                                    stroke="#f5e6c8"
                                    strokeWidth="1.5"
                                    strokeDasharray="2,2"
                                    markerEnd="url(#arrow)"
                                  />
                                )}
                                {isAnimated &&
                                  drawLayerRect(
                                    startX,
                                    startY,
                                    start.width ?? 50,
                                    start.height ?? 50,
                                    start.rotation ?? 0,
                                    start.scale ?? 1.0,
                                    0.25,
                                    "2,2",
                                    true
                                  )}
                                {drawLayerRect(
                                  endX,
                                  endY,
                                  end.width ?? 50,
                                  end.height ?? 50,
                                  end.rotation ?? 0,
                                  end.scale ?? 1.0,
                                  1.0,
                                  "none",
                                  false
                                )}
                              </g>
                            );
                          }
                        });
                      })()}

                      {/* Safe Zone Boundary Overlay */}
                      {(() => {
                        const spec = selected.visual_spec || selected;
                        const safeZonePct =
                          typeof spec.composition?.safeZonePercent === "number"
                            ? spec.composition.safeZonePercent
                            : 10;
                        return (
                          <rect
                            x={safeZonePct}
                            y={safeZonePct * 1.778}
                            width={100 - safeZonePct * 2}
                            height={177.8 - safeZonePct * 2 * 1.778}
                            fill="none"
                            stroke="#ff0055"
                            strokeWidth="0.75"
                            strokeDasharray="3,3"
                            strokeOpacity="0.6"
                          />
                        );
                      })()}

                      {/* Focal Point Reticle */}
                      {(() => {
                        const spec = selected.visual_spec || selected;
                        const fX =
                          typeof spec.composition?.focalPointX === "number"
                            ? spec.composition.focalPointX
                            : 50;
                        const fY =
                          typeof spec.composition?.focalPointY === "number"
                            ? spec.composition.focalPointY
                            : 88.9;
                        return (
                          <g transform={`translate(${fX}, ${fY})`}>
                            <circle
                              r="2"
                              fill="none"
                              stroke="#00ffff"
                              strokeWidth="0.5"
                              strokeOpacity="0.8"
                            />
                            <line
                              x1="-4"
                              y1="0"
                              x2="4"
                              y2="0"
                              stroke="#00ffff"
                              strokeWidth="0.5"
                              strokeOpacity="0.8"
                            />
                            <line
                              x1="0"
                              y1="-4"
                              x2="0"
                              y2="4"
                              stroke="#00ffff"
                              strokeWidth="0.5"
                              strokeOpacity="0.8"
                            />
                          </g>
                        );
                      })()}
                    </svg>

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-[8px] text-white/90 font-medium line-clamp-2">
                        {selected.visual_proposition}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                  <span
                    className="h-5 w-5 rounded-full border border-white/20"
                    style={{
                      backgroundColor: selected.background_color?.hex,
                    }}
                    title={selected.background_color?.name}
                  />
                  {(selected.accent_colors || []).map((c) => (
                    <span
                      key={c}
                      className="h-5 w-5 rounded-full border border-white/15"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {selected.id} · v{selected.activeVersion || 1}
                  </span>
                  {regenBusyId === selected.id && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-violet-300">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Gerando nova versão…
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => approveSelected("approved")}
                    disabled={
                      !!regenBusyId || selected.status === "regenerating"
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40"
                  >
                    <Check className="w-3 h-3" /> Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openRejectPanel(selected);
                    }}
                    disabled={!!regenBusyId || rejectBusy}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40"
                    data-testid="collage-reject-btn"
                  >
                    {rejectBusy ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                    {rejectBusy ? "Rejeitando…" : "Rejeitar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openRegenPanel(selected)}
                    disabled={!!regenBusyId}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-200 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerar
                  </button>
                  {(selected.versions?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const prev = (selected.activeVersion || 1) - 1;
                        if (prev >= 1) restoreVersion(selected, prev);
                        else toast.error("Já está na versão mais antiga");
                      }}
                      disabled={
                        !!regenBusyId || (selected.activeVersion || 1) <= 1
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-800/60 text-zinc-200 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-3 h-3" /> Versão anterior
                    </button>
                  )}
                </div>

                <p className="text-[9px] text-zinc-500">
                  Regenerar afeta{" "}
                  <strong className="text-zinc-400">somente este card</strong>.
                  Cards aprovados permanecem intactos.
                </p>

                {/* Pipeline dual-frame: End → Start → Video */}
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-amber-100/90">
                    Produção dual-frame · {selected.id}
                  </p>
                  {(() => {
                    const pipe = derivePipelineStatus(selected, {
                      mediaBusyKind:
                        mediaBusyId === selected.id ? mediaBusyKind : null,
                      isMediaBusy: mediaBusyId === selected.id,
                    });
                    const rows: {
                      key: string;
                      title: string;
                      step: { label: string; state: PipelineStepState };
                    }[] = [
                      { key: "g1", title: "Gate 1", step: pipe.gate1 },
                      { key: "end", title: "End Frame", step: pipe.image },
                      { key: "st", title: "Frames", step: pipe.still },
                      { key: "g3", title: "Gate 3", step: pipe.gate3 },
                      { key: "vid", title: "Vídeo", step: pipe.video },
                    ];
                    return (
                      <div
                        className="rounded-lg border border-zinc-800/80 bg-zinc-950/70 p-2 space-y-1"
                        data-testid="collage-pipeline-status"
                      >
                        {rows.map((r) => (
                          <div
                            key={r.key}
                            className="flex items-center justify-between gap-2 text-[10px]"
                          >
                            <span className="text-zinc-500 font-medium">
                              {r.title}
                            </span>
                            <span
                              className={`font-bold ${pipelineTone(r.step.state)}`}
                            >
                              {r.step.state === "running" && (
                                <Loader2 className="w-3 h-3 inline animate-spin mr-1 -mt-0.5" />
                              )}
                              {r.step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* GATE 2A — END FRAME */}
                  <div className="rounded-lg border border-emerald-500/20 bg-zinc-950/50 p-2 space-y-1.5">
                    <p className="text-[9px] font-bold text-emerald-200/90 uppercase">
                      Gate 2A · End Frame (fonte de verdade)
                    </p>

                    {/* Prompt de Imagem End Frame */}
                    <div className="rounded border border-zinc-800 bg-zinc-900/50 p-1.5 space-y-1 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-zinc-500 font-bold uppercase">
                          Prompt de Imagem (End)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              "Prompt End Frame",
                              selected.endFrame?.imagePrompt ||
                                selected.imagegen_prompt ||
                                buildEndFrameImagePrompt(selected)
                            )
                          }
                          className="text-[8px] text-amber-300 hover:text-amber-200 font-bold cursor-pointer"
                        >
                          Copiar Prompt
                        </button>
                      </div>
                      <p className="text-[9px] text-zinc-400 line-clamp-2 select-all font-mono leading-tight">
                        {selected.endFrame?.imagePrompt ||
                          selected.imagegen_prompt ||
                          buildEndFrameImagePrompt(selected)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={
                          !!mediaBusyId ||
                          (selected.status !== "approved" &&
                            selected.status !== "needs_review")
                        }
                        onClick={() => void generateEndFrameForCard(selected)}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-50 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        {mediaBusyId === selected.id &&
                        mediaBusyKind === "still" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ImageIcon className="w-3 h-3" />
                        )}
                        Gerar End Frame
                      </button>

                      {/* Upload manual para End Frame */}
                      <label className="inline-flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-800/40 text-zinc-200 hover:bg-zinc-800 hover:text-white text-[10px] font-bold px-2.5 py-1.5 cursor-pointer transition">
                        <Upload className="w-3 h-3" />
                        <span>Fazer Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              void handleUploadFrame(selected, "end", file);
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        disabled={
                          !(selected.endFrame?.imageUrl || selected.still_url)
                        }
                        onClick={() =>
                          setPreviewMedia({
                            type: "image",
                            url: mediaSrc(
                              selected.endFrame?.imageUrl || selected.still_url
                            ),
                            title: `End Frame ${selected.id}`,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-600 text-zinc-200 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Visualizar
                      </button>
                      <button
                        type="button"
                        disabled={
                          !(
                            selected.endFrame?.imageUrl || selected.still_url
                          ) || !!mediaBusyId
                        }
                        onClick={() => void approveFrame(selected, "end")}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Aprovar End Frame
                      </button>
                    </div>
                  </div>

                  {/* GATE 2B — START FRAME */}
                  <div className="rounded-lg border border-sky-500/20 bg-zinc-950/50 p-2 space-y-1.5">
                    <p className="text-[9px] font-bold text-sky-200/90 uppercase">
                      Gate 2B · Start Frame (derivado do End)
                    </p>

                    {/* Prompt de Imagem Start Frame */}
                    <div className="rounded border border-zinc-800 bg-zinc-900/50 p-1.5 space-y-1 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-zinc-500 font-bold uppercase">
                          Prompt de Imagem (Start)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              "Prompt Start Frame",
                              selected.startFrame?.imagePrompt ||
                                buildStartFrameImagePrompt(selected)
                            )
                          }
                          className="text-[8px] text-amber-300 hover:text-amber-200 font-bold cursor-pointer"
                        >
                          Copiar Prompt
                        </button>
                      </div>
                      <p className="text-[9px] text-zinc-400 line-clamp-2 select-all font-mono leading-tight">
                        {selected.startFrame?.imagePrompt ||
                          buildStartFrameImagePrompt(selected)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={
                          !!mediaBusyId ||
                          !(
                            selected.endFrame?.approved ||
                            selected.still_approved
                          )
                        }
                        onClick={() => void generateStartFrameForCard(selected)}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/15 text-sky-50 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        {mediaBusyId === selected.id &&
                        mediaBusyKind === "still" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ImageIcon className="w-3 h-3" />
                        )}
                        Gerar Start Frame a partir do End
                      </button>

                      {/* Upload manual para Start Frame */}
                      <label className="inline-flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-800/40 text-zinc-200 hover:bg-zinc-800 hover:text-white text-[10px] font-bold px-2.5 py-1.5 cursor-pointer transition">
                        <Upload className="w-3 h-3" />
                        <span>Fazer Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              void handleUploadFrame(selected, "start", file);
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        disabled={
                          !(
                            selected.startFrame?.imageUrl ||
                            selected.first_frame_url
                          )
                        }
                        onClick={() =>
                          setPreviewMedia({
                            type: "image",
                            url: mediaSrc(
                              selected.startFrame?.imageUrl ||
                                selected.first_frame_url
                            ),
                            title: `Start Frame ${selected.id}`,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-600 text-zinc-200 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Visualizar
                      </button>
                      <button
                        type="button"
                        disabled={
                          !(
                            selected.startFrame?.imageUrl ||
                            selected.first_frame_url
                          ) || !!mediaBusyId
                        }
                        onClick={() => void approveFrame(selected, "start")}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-100 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Aprovar Start Frame
                      </button>
                    </div>
                  </div>

                  {/* Comparador START | END */}
                  {(selected.endFrame?.imageUrl ||
                    selected.still_url ||
                    selected.startFrame?.imageUrl ||
                    selected.first_frame_url) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-[8px] font-bold text-sky-300 uppercase text-center">
                          Start Frame
                        </p>
                        {selected.startFrame?.imageUrl ||
                        selected.first_frame_url ? (
                          <button
                            type="button"
                            className="block w-full rounded-lg overflow-hidden border border-sky-500/30 cursor-pointer"
                            onClick={() =>
                              setPreviewMedia({
                                type: "image",
                                url: mediaSrc(
                                  selected.startFrame?.imageUrl ||
                                    selected.first_frame_url
                                ),
                                title: `Start ${selected.id}`,
                              })
                            }
                          >
                            <img
                              src={mediaSrc(
                                selected.startFrame?.imageUrl ||
                                  selected.first_frame_url
                              )}
                              alt="start"
                              className="w-full aspect-[9/16] object-cover bg-zinc-900"
                            />
                          </button>
                        ) : (
                          <div className="aspect-[9/16] rounded-lg border border-dashed border-zinc-700 flex items-center justify-center text-[9px] text-zinc-600">
                            aguardando
                          </div>
                        )}
                        <p className="text-[8px] text-center text-zinc-500">
                          {selected.startFrame?.approved
                            ? "aprovado"
                            : "pendente"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-bold text-emerald-300 uppercase text-center">
                          End Frame
                        </p>
                        {selected.endFrame?.imageUrl || selected.still_url ? (
                          <button
                            type="button"
                            className="block w-full rounded-lg overflow-hidden border border-emerald-500/30 cursor-pointer"
                            onClick={() =>
                              setPreviewMedia({
                                type: "image",
                                url: mediaSrc(
                                  selected.endFrame?.imageUrl ||
                                    selected.still_url
                                ),
                                title: `End ${selected.id}`,
                              })
                            }
                          >
                            <img
                              src={mediaSrc(
                                selected.endFrame?.imageUrl ||
                                  selected.still_url
                              )}
                              alt="end"
                              className="w-full aspect-[9/16] object-cover bg-zinc-900"
                            />
                          </button>
                        ) : (
                          <div className="aspect-[9/16] rounded-lg border border-dashed border-zinc-700 flex items-center justify-center text-[9px] text-zinc-600">
                            aguardando
                          </div>
                        )}
                        <p className="text-[8px] text-center text-zinc-500">
                          {selected.endFrame?.approved ||
                          selected.still_approved
                            ? "aprovado"
                            : "pendente"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Comparação Start×End: diferença estrutural + caminho de montagem */}
                  <FrameComparison
                    startUrl={
                      selected.startFrame?.imageUrl || selected.first_frame_url
                        ? mediaSrc(
                            selected.startFrame?.imageUrl ||
                              selected.first_frame_url
                          )
                        : undefined
                    }
                    endUrl={
                      selected.endFrame?.imageUrl || selected.still_url
                        ? mediaSrc(
                            selected.endFrame?.imageUrl || selected.still_url
                          )
                        : undefined
                    }
                    assemblySteps={
                      selected.visualProposal?.assemblySteps ||
                      selected.assembly_order
                    }
                  />

                  {/* Prévia barata de movimento — valida antes de gastar geração */}
                  <MotionPreview
                    startUrl={
                      selected.startFrame?.imageUrl || selected.first_frame_url
                        ? mediaSrc(
                            selected.startFrame?.imageUrl ||
                              selected.first_frame_url
                          )
                        : undefined
                    }
                    endUrl={
                      selected.endFrame?.imageUrl || selected.still_url
                        ? mediaSrc(
                            selected.endFrame?.imageUrl || selected.still_url
                          )
                        : undefined
                    }
                    hasRouteDirection={
                      (selected.visualProposal?.geographicRelationships || [])
                        .length > 0
                    }
                  />

                  {/* GATE 3 */}
                  <div className="rounded-lg border border-cyan-500/20 bg-zinc-950/50 p-2 space-y-1.5">
                    <p className="text-[9px] font-bold text-cyan-200/90 uppercase">
                      Gate 3 · Vídeo (start → end)
                    </p>

                    {/* Prompt de Vídeo / Motion */}
                    <div className="rounded border border-zinc-800 bg-zinc-900/50 p-1.5 space-y-1 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-zinc-500 font-bold uppercase">
                          Prompt de Vídeo (Omni/Luma)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              "Prompt Vídeo",
                              selected.motion?.videoPrompt ||
                                selected.omni_prompt ||
                                buildMotionPrompt(selected)
                            )
                          }
                          className="text-[8px] text-amber-300 hover:text-amber-200 font-bold cursor-pointer"
                        >
                          Copiar Prompt
                        </button>
                      </div>
                      <p className="text-[9px] text-zinc-400 line-clamp-2 select-all font-mono leading-tight">
                        {selected.motion?.videoPrompt ||
                          selected.omni_prompt ||
                          buildMotionPrompt(selected)}
                      </p>
                    </div>

                    {!framesReady(selected) && (
                      <p className="text-[9px] text-amber-200/80">
                        Geração automática bloqueada: aprove End Frame e Start
                        Frame primeiro (ou faça upload do vídeo final abaixo).
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {/* Upload manual para Vídeo */}
                      <label className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/20 hover:text-white text-[10px] font-bold px-2.5 py-1.5 cursor-pointer transition">
                        <Upload className="w-3 h-3" />
                        <span>Enviar Vídeo</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              void handleUploadFrame(selected, "video", file);
                          }}
                        />
                      </label>

                      {selected.video_url && (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-[10px] font-bold px-2.5 py-1.5">
                          <Check className="w-3 h-3" /> Vídeo enviado
                        </span>
                      )}
                    </div>
                    {selected.motion?.videoPrompt && (
                      <details className="text-[9px] text-zinc-500">
                        <summary className="cursor-pointer text-zinc-400 font-bold">
                          Motion prompt
                        </summary>
                        <pre className="mt-1 whitespace-pre-wrap font-mono text-[8px] text-zinc-500 max-h-24 overflow-y-auto">
                          {selected.motion.videoPrompt}
                        </pre>
                      </details>
                    )}
                  </div>

                  {selected.video_note && (
                    <p className="text-[9px] text-zinc-500 leading-snug">
                      {selected.video_note}
                    </p>
                  )}
                </div>

                {/* Comparação candidata */}
                {selected.candidate && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-2.5 space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Comparar versões — escolha antes de substituir
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-2 space-y-1">
                        <p className="text-[8px] font-bold text-zinc-500 uppercase">
                          Atual v{selected.activeVersion || 1}
                        </p>
                        <p className="text-[10px] text-zinc-200 leading-snug">
                          {selected.visual_proposition}
                        </p>
                        <p className="text-[9px] text-zinc-500">
                          {(selected.key_objects || []).join(" · ")}
                        </p>
                        {selected.validation && (
                          <p className="text-[8px] text-zinc-500">
                            sem {selected.validation.semanticAlignment ?? "—"} ·
                            ent {selected.validation.entityCoverage ?? "—"} ·
                            geo {selected.validation.geographicRelevance ?? "—"}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-2 space-y-1">
                        <p className="text-[8px] font-bold text-violet-300 uppercase">
                          Nova versão
                        </p>
                        <p className="text-[10px] text-zinc-100 leading-snug">
                          {selected.candidate.visual_proposition}
                        </p>
                        <p className="text-[9px] text-zinc-400">
                          {(
                            selected.candidate.visualProposal?.objects ||
                            selected.candidate.key_objects ||
                            []
                          ).join(" · ")}
                        </p>
                        {selected.candidate.validation && (
                          <p className="text-[8px] text-violet-200/80">
                            sem{" "}
                            {selected.candidate.validation.semanticAlignment ??
                              "—"}{" "}
                            · ent{" "}
                            {selected.candidate.validation.entityCoverage ??
                              "—"}{" "}
                            · geo{" "}
                            {selected.candidate.validation
                              .geographicRelevance ?? "—"}
                          </p>
                        )}
                      </div>
                    </div>
                    {(selected.candidateMeta?.scoreDiffs || []).length > 0 && (
                      <div className="space-y-0.5">
                        {(selected.candidateMeta?.scoreDiffs || []).map((d) => (
                          <p
                            key={d.metric}
                            className="text-[9px] text-zinc-400 flex justify-between gap-2"
                          >
                            <span>{d.label}</span>
                            <span className="font-mono text-zinc-300">
                              {d.before ?? "—"} →{" "}
                              <span
                                className={
                                  (d.after ?? 0) > (d.before ?? 0)
                                    ? "text-emerald-300"
                                    : (d.after ?? 0) < (d.before ?? 0)
                                      ? "text-amber-300"
                                      : ""
                                }
                              >
                                {d.after ?? "—"}
                              </span>
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                    {(selected.candidateMeta?.changes || []).length > 0 && (
                      <p className="text-[9px] text-zinc-500">
                        Mudanças:{" "}
                        {(selected.candidateMeta?.changes || []).join(" · ")}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => discardCandidate(selected)}
                        className="rounded-lg border border-zinc-600 text-zinc-300 text-[10px] font-bold px-2.5 py-1.5"
                      >
                        Manter atual
                      </button>
                      <button
                        type="button"
                        onClick={() => acceptCandidate(selected)}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-200 text-[10px] font-bold px-2.5 py-1.5"
                      >
                        Usar nova versão
                      </button>
                      <button
                        type="button"
                        onClick={() => regenerateCard(selected)}
                        disabled={!!regenBusyId}
                        className="rounded-lg border border-violet-500/40 text-violet-200 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40"
                      >
                        Gerar outra
                      </button>
                    </div>
                  </div>
                )}

                {/* Painel Regenerar */}
                {reviewPanel === "regen" && !selected.candidate && (
                  <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-2.5 space-y-2">
                    <p className="text-[9px] font-bold uppercase text-violet-200">
                      Regenerar este card
                    </p>
                    <p className="text-[9px] text-zinc-500">
                      Gera 1 proposta candidata. Não altera os outros cards.
                    </p>
                    <label className="block space-y-1">
                      <span className="text-[8px] uppercase font-bold text-zinc-500">
                        Instrução para regenerar este card
                      </span>
                      <textarea
                        value={regenInstruction}
                        onChange={(e) => setRegenInstruction(e.target.value)}
                        rows={3}
                        placeholder="Ex.: preserve o mapa e os países citados, corrija a posição da Linha do Equador e torne a cena mais literal."
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 text-[11px] text-zinc-200 p-2 resize-y min-h-[64px]"
                      />
                    </label>
                    <div>
                      <p className="text-[8px] uppercase font-bold text-zinc-500 mb-1">
                        Ajustes rápidos
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {QUICK_FIXES.map((fx) => {
                          const on = selectedQuickFixes.includes(fx.id);
                          return (
                            <button
                              key={fx.id}
                              type="button"
                              onClick={() =>
                                setSelectedQuickFixes((prev) =>
                                  on
                                    ? prev.filter((x) => x !== fx.id)
                                    : [...prev, fx.id]
                                )
                              }
                              className={`text-[9px] px-2 py-1 rounded-full border transition ${
                                on
                                  ? "border-violet-400/60 bg-violet-500/20 text-violet-100"
                                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                              }`}
                            >
                              {fx.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {preserveChecked.length > 0 && (
                      <div>
                        <p className="text-[8px] uppercase font-bold text-zinc-500 mb-1">
                          Preservar nesta nova versão
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {listPreservableFromItem(selected).map((el) => {
                            const on = preserveChecked.includes(el);
                            return (
                              <label
                                key={el}
                                className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border cursor-pointer ${
                                  on
                                    ? "border-emerald-500/40 text-emerald-200"
                                    : "border-zinc-700 text-zinc-500 line-through"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="accent-emerald-500"
                                  checked={on}
                                  onChange={() => {
                                    setPreserveChecked((prev) =>
                                      on
                                        ? prev.filter((x) => x !== el)
                                        : [...prev, el]
                                    );
                                    setReplaceChecked((prev) =>
                                      on
                                        ? [...new Set([...prev, el])]
                                        : prev.filter((x) => x !== el)
                                    );
                                  }}
                                />
                                {el}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setReviewPanel("none")}
                        className="rounded-lg border border-zinc-600 text-zinc-300 text-[10px] font-bold px-2.5 py-1.5"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!!regenBusyId}
                        onClick={() => regenerateCard(selected)}
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-400/50 bg-violet-500/20 text-violet-100 text-[10px] font-bold px-2.5 py-1.5 disabled:opacity-40"
                      >
                        {regenBusyId === selected.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3" />
                        )}
                        Gerar nova versão
                      </button>
                    </div>
                  </div>
                )}

                {selected.status === "rejected" && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 space-y-1">
                    <p className="text-[9px] font-bold text-red-200 uppercase">
                      Rejeitado
                    </p>
                    {(selected.rejectionReasons ||
                      selected.rejectionReason) && (
                      <p className="text-[10px] text-red-100/90">
                        Motivo:{" "}
                        {(selected.rejectionReasons || [])
                          .map(
                            (id) =>
                              REJECTION_REASONS.find((r) => r.id === id)
                                ?.label || id
                          )
                          .join(" · ") || selected.rejectionReason}
                      </p>
                    )}
                    {selected.rejectionNote && (
                      <p className="text-[10px] text-zinc-300">
                        {selected.rejectionNote}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => openRegenPanel(selected)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-200 border border-violet-500/40 rounded-lg px-2 py-1 mt-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerar
                    </button>
                  </div>
                )}

                {/* Histórico compacto */}
                {(selected.versions?.length || 0) > 1 && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 space-y-1">
                    <p className="text-[8px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                      <History className="w-3 h-3" /> Histórico
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(selected.versions || []).map((v) => (
                        <button
                          key={v.version}
                          type="button"
                          onClick={() => restoreVersion(selected, v.version)}
                          className={`text-[9px] px-2 py-0.5 rounded border font-mono ${
                            v.version === (selected.activeVersion || 1)
                              ? "border-sky-500/50 text-sky-200"
                              : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                          }`}
                          title={v.regenerationInstruction || v.createdAt}
                        >
                          v{v.version}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selected.lastError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-300 shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <p className="text-[10px] text-red-200">
                        {selected.lastError}
                      </p>
                      <button
                        type="button"
                        onClick={() => regenerateCard(selected)}
                        className="text-[9px] text-violet-300 font-bold"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                )}

                <Field label="Linha" value={selected.line} />
                <Field
                  label="Significado plano"
                  value={
                    selected.lineAnalysis?.plainMeaning || selected.core_meaning
                  }
                />
                <Field label="Emoção" value={selected.emotion} />
                <Field
                  label="Proposta visual"
                  value={
                    selected.visualProposal?.composition ||
                    selected.visual_proposition
                  }
                />
                {selected.visualProposal?.visualMode && (
                  <Field
                    label="Modo visual"
                    value={selected.visualProposal.visualMode}
                  />
                )}
                {selected.visualProposal?.primarySubject && (
                  <Field
                    label="Sujeito principal"
                    value={selected.visualProposal.primarySubject}
                  />
                )}
                {(selected.lineAnalysis?.requiredVisualAnchors || []).length >
                  0 && (
                  <Field
                    label="Âncoras semânticas"
                    value={(
                      selected.lineAnalysis?.requiredVisualAnchors || []
                    ).join(" · ")}
                  />
                )}
                {selected.visualProposal?.supportingMetaphor && (
                  <Field
                    label="Metáfora de apoio (opcional)"
                    value={selected.visualProposal.supportingMetaphor}
                  />
                )}
                {(() => {
                  const fiche = buildGeoFiche(selected);
                  if (!fiche) return null;
                  return (
                    <div className="rounded-lg border border-sky-500/25 bg-sky-950/20 p-3 space-y-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-sky-300 flex items-center gap-1.5">
                        <MapIcon className="w-3 h-3" /> Ficha geográfica
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        <div className="col-span-2">
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                            Local principal
                          </p>
                          <p className="text-[11px] text-zinc-200">
                            {fiche.local}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                            Tipo
                          </p>
                          <p className="text-[11px] text-zinc-200">
                            {fiche.tipo}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                            País atual
                          </p>
                          <p className="text-[11px] text-zinc-200">
                            {fiche.pais}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                            Escala
                          </p>
                          <p className="text-[11px] text-zinc-200">
                            {fiche.escala}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                            Período
                          </p>
                          <p className="text-[11px] text-zinc-200">
                            {fiche.periodo}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                            Direção da rota
                          </p>
                          <p className="text-[11px] text-zinc-200">
                            {fiche.direcaoRota}
                          </p>
                        </div>
                        {fiche.elementos.length > 0 && (
                          <div className="col-span-2">
                            <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                              Elementos permitidos
                            </p>
                            <p className="text-[11px] text-zinc-300">
                              {fiche.elementos.join(" · ")}
                            </p>
                          </div>
                        )}
                      </div>
                      {fiche.historicalBorderWarning && (
                        <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.07] px-2 py-1.5 text-[10px] leading-4 text-amber-200/90 flex gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          {fiche.historicalBorderWarning}
                        </p>
                      )}
                    </div>
                  );
                })()}
                <Field
                  label="Objetos"
                  value={(
                    selected.visualProposal?.objects ||
                    selected.key_objects ||
                    []
                  ).join(" · ")}
                />
                <Field
                  label="Montagem"
                  value={(
                    selected.visualProposal?.assemblySteps ||
                    selected.assembly_order ||
                    []
                  ).join(" → ")}
                />
                {selected.validation && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-2">
                    <p className="text-[8px] uppercase font-bold text-zinc-500">
                      Validação semântica
                    </p>
                    <div className="space-y-1.5">
                      {buildValidationExplanations(
                        selected.validation,
                        selected
                      ).map((row) => {
                        const num =
                          typeof row.score === "number" ? row.score : null;
                        const tone =
                          num == null
                            ? "text-zinc-400"
                            : num >= 90
                              ? "text-emerald-300"
                              : num >= 70
                                ? "text-amber-300"
                                : "text-rose-300";
                        return (
                          <div
                            key={row.metric}
                            className="flex items-start gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                  {row.metric}
                                </span>
                                <span
                                  className={`font-mono text-[10px] font-bold ${tone}`}
                                >
                                  {row.score}
                                  {num != null ? "%" : ""}
                                </span>
                              </div>
                              <p className="text-[10px] leading-4 text-zinc-400">
                                {row.explanation}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-zinc-800 pt-2 space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                        Recomendação da IA
                      </p>
                      <p
                        className={`text-[10px] font-bold ${
                          selected.validation.decision === "approve"
                            ? "text-emerald-300"
                            : "text-amber-300"
                        }`}
                      >
                        {selected.validation.decision === "approve"
                          ? "Aprovar"
                          : "Aprovar com correção"}
                        {selected.validation.revisionInstruction
                          ? ` — ${selected.validation.revisionInstruction}`
                          : ""}
                      </p>
                      <p className="text-[9px] text-zinc-600">
                        A decisão final é humana — a recomendação acima é
                        automática.
                      </p>
                    </div>
                    {(selected.validation.missingAnchors || []).length > 0 && (
                      <p className="text-[9px] text-amber-200/80">
                        Âncoras faltando:{" "}
                        {(selected.validation.missingAnchors || []).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {viewMode === "tecnico" && selected.imagegen_prompt && (
                  <PromptBlock
                    title="Imagegen prompt (Gate 2)"
                    text={selected.imagegen_prompt}
                  />
                )}
                {viewMode === "tecnico" && selected.omni_prompt && (
                  <PromptBlock
                    title="Omni Flash prompt (Gate 3)"
                    text={selected.omni_prompt}
                  />
                )}
                {viewMode === "tecnico" && selected.visual_spec && (
                  <PromptBlock
                    title="visual-spec.json"
                    text={JSON.stringify(selected.visual_spec, null, 2)}
                  />
                )}
              </div>

              {viewMode === "tecnico" && (
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 text-[10px] text-zinc-500 leading-relaxed space-y-1">
                  <p className="font-bold text-zinc-400 flex items-center gap-1">
                    <Square className="w-3 h-3" />
                    Entrega padrão
                  </p>
                  <p>
                    9:16 · 5s · 720×1280 · 24fps · MP4 sem áudio ·
                    assemble-from-empty (não fade/zoom).
                  </p>
                  {isGeo && (
                    <p className="text-sky-400/80">
                      Modo geo: silhuetas e rotas em papel — sem UI de mapas
                      digitais. Complementa a skill{" "}
                      <code className="text-[9px]">geo-video-prompts</code> (T2V
                      satélite) com estética collage.
                    </p>
                  )}
                  <p>
                    Gate 2/3 no agent usam{" "}
                    <code className="text-zinc-400">image_gen</code> +{" "}
                    <code className="text-zinc-400">
                      scripts/generate_video.py
                    </code>{" "}
                    do repo. Esta página gera metáforas, specs e prompts;
                    exporta o pacote para o pipeline.
                  </p>
                  <p
                    className={`flex items-center gap-1 ${isGeo ? "text-sky-300/80" : "text-violet-300/80"}`}
                  >
                    Skill:{" "}
                    <code className="text-[9px]">
                      .agents/skills/gbro-collage-broll
                    </code>
                    <ChevronRight className="w-3 h-3" />
                    trigger <em>collage b-roll</em>
                    {isGeo ? " / geo map collage" : ""}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preflight de aprovação em lote */}
      {preflightOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreflightOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-zinc-100">
              Aprovar propostas pendentes
            </p>
            <div className="space-y-1.5 text-[11px]">
              <p className="text-zinc-300">
                <span className="font-mono font-bold text-zinc-100">
                  {preflightStats.total}
                </span>{" "}
                proposta{preflightStats.total !== 1 ? "s" : ""} será
                {preflightStats.total !== 1 ? "ão" : ""} aprovada
                {preflightStats.total !== 1 ? "s" : ""}
              </p>
              <p
                className={
                  preflightStats.geoAlerts > 0
                    ? "text-amber-300"
                    : "text-zinc-500"
                }
              >
                <span className="font-mono font-bold">
                  {preflightStats.geoAlerts}
                </span>{" "}
                com alerta geográfico (fronteira histórica)
              </p>
              <p
                className={
                  preflightStats.lowClarity > 0
                    ? "text-amber-300"
                    : "text-zinc-500"
                }
              >
                <span className="font-mono font-bold">
                  {preflightStats.lowClarity}
                </span>{" "}
                com clareza abaixo de 90%
              </p>
              <p
                className={
                  preflightStats.missingEntities > 0
                    ? "text-rose-300"
                    : "text-zinc-500"
                }
              >
                <span className="font-mono font-bold">
                  {preflightStats.missingEntities}
                </span>{" "}
                com entidades ausentes
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => approveAllPending("clean")}
                disabled={preflightStats.total === 0}
                className="w-full rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-[11px] font-bold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-40"
              >
                Aprovar somente as sem alertas (
                {preflightStats.total - preflightStats.withAlerts})
              </button>
              <button
                type="button"
                onClick={() => setPreflightOpen(false)}
                className="w-full rounded-lg bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-[11px] font-bold text-zinc-300 transition hover:bg-zinc-800"
              >
                Revisar problemas antes
              </button>
              <button
                type="button"
                onClick={() => approveAllPending("all")}
                disabled={preflightStats.total === 0}
                className="w-full rounded-lg bg-violet-500/15 border border-violet-500/30 px-3 py-2 text-[11px] font-bold text-violet-200 transition hover:bg-violet-500/25 disabled:opacity-40"
              >
                Aprovar todas mesmo assim ({preflightStats.total})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview de still / vídeo */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewMedia(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-zinc-100">
                {previewMedia.title}
              </p>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="text-zinc-500 hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {previewMedia.type === "image" ? (
              <img
                src={previewMedia.url}
                alt={previewMedia.title}
                className="w-full max-h-[70vh] object-contain rounded-xl bg-black"
              />
            ) : (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[70vh] rounded-xl bg-black"
              />
            )}
            <button
              type="button"
              onClick={() =>
                downloadMedia(
                  previewMedia.url,
                  previewMedia.type === "video"
                    ? "collage-result.mp4"
                    : "collage-still.png"
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 text-violet-100 text-[11px] font-bold px-3 py-2"
            >
              <Download className="w-3.5 h-3.5" /> Baixar
            </button>
          </div>
        </div>
      )}

      {/* Modal de rejeição — sempre no topo, nunca “silencioso” */}
      {reviewPanel === "reject" && selected && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="collage-reject-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !rejectBusy) {
              setReviewPanel("none");
            }
          }}
        >
          <div
            ref={rejectModalRef}
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-red-500/40 bg-zinc-950 shadow-2xl shadow-black/60 p-4 space-y-3 outline-none"
            data-testid="collage-reject-modal"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p
                  id="collage-reject-title"
                  className="text-sm font-bold text-red-100"
                >
                  Rejeitar {selected.id}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                  {selected.line}
                </p>
              </div>
              <button
                type="button"
                disabled={rejectBusy}
                onClick={() => setReviewPanel("none")}
                className="text-zinc-500 hover:text-zinc-200 p-1"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1.5">
                Motivo da rejeição
              </p>
              <div className="flex flex-wrap gap-1.5">
                {REJECTION_REASONS.map((r) => {
                  const on = rejectReasons.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={rejectBusy}
                      onClick={() =>
                        setRejectReasons((prev) =>
                          on ? prev.filter((x) => x !== r.id) : [...prev, r.id]
                        )
                      }
                      className={`text-[10px] px-2.5 py-1.5 rounded-full border transition ${
                        on
                          ? "border-red-400/70 bg-red-500/25 text-red-50"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">
                Explique o que deve ser corrigido (opcional)
              </span>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                disabled={rejectBusy}
                placeholder="Ex.: as regiões polares precisam aparecer esticadas na projeção."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-[12px] text-zinc-100 p-2.5 resize-y min-h-[72px] disabled:opacity-50"
              />
            </label>

            <p className="text-[10px] text-zinc-500">
              A rejeição altera somente este card. Cards aprovados não são
              afetados.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={rejectBusy}
                onClick={() => setReviewPanel("none")}
                className="rounded-lg border border-zinc-600 text-zinc-300 text-[11px] font-bold px-3 py-2 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={rejectBusy}
                onClick={() => void confirmReject(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-500/15 text-red-100 text-[11px] font-bold px-3 py-2 disabled:opacity-40"
                data-testid="collage-reject-only"
              >
                {rejectBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                {rejectBusy ? "Rejeitando…" : "Rejeitar apenas"}
              </button>
              <button
                type="button"
                disabled={rejectBusy || !!regenBusyId}
                onClick={() => void confirmReject(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/50 bg-violet-500/15 text-violet-100 text-[11px] font-bold px-3 py-2 disabled:opacity-40"
                data-testid="collage-reject-and-regen"
              >
                {rejectBusy || regenBusyId === selected.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Rejeitar e regenerar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[8px] uppercase tracking-wide text-zinc-600 font-bold">
        {label}
      </p>
      <p className="text-[11px] text-zinc-300 leading-snug mt-0.5">{value}</p>
    </div>
  );
}

function PromptBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold text-zinc-400 uppercase">{title}</p>
        <button
          type="button"
          onClick={() => copyText(title, text)}
          className="text-[9px] text-violet-300 hover:text-violet-100 inline-flex items-center gap-0.5"
        >
          <Copy className="w-3 h-3" /> copiar
        </button>
      </div>
      <pre className="text-[9px] text-zinc-500 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
        {text}
      </pre>
    </div>
  );
}
