/**
 * LumieraEditor.tsx — Editor do Lumiera
 * Video editor page inspired by reactvideoeditor.com
 * Layout: left library | center preview | right properties | bottom timeline
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Film,
  Layers,
  Palette,
  Play,
  Save,
  Search,
  Clock,
  Type,
  BarChart3,
  Shuffle,
  Video,
  Layout,
  Star,
  RefreshCw,
  GripVertical,
  Redo2,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { ShotcraftLivePreview } from "./ShotcraftLivePreview";
import {
  LumieraEditorToolRail,
  type LumieraEditorTool,
} from "./LumieraEditorToolRail";
import { LumieraEditorTimeline } from "./LumieraEditorTimeline";
import { LumieraEditorLivePreview } from "./LumieraEditorLivePreview";
import { StockSearchModal, type StockItem } from "./StockSearchModal";
import type { ConfigData } from "./appTypes";
import { repairMojibakeDeep } from "./textEncoding";
import {
  resolveMotionTemplateText,
  updateMotionTemplatePrimaryText,
  updateMotionTemplateSecondaryText,
} from "./motionTemplateText";
import {
  applyLumieraCommand,
  createEmptyLumieraProject,
  findLumieraClip,
  framesToSeconds,
  secondsToFrames,
  validateAIEditPlan,
  type AIEditPlan,
  type LumieraEditCommand,
  type LumieraEditorProject,
  type LumieraTrackType,
} from "./lumieraEditorCore";

/* ─── Types ─── */

type TemplateItem = {
  id: string;
  template_id: string;
  name: string;
  category: string;
  niche: string | null;
  energy: string;
  formats: string[];
  duration_seconds: number;
  approved: boolean;
  palette: Record<string, string> | null;
  default_props?: Record<string, unknown> | null;
};

type TemplatePropSchema = Record<string, "string" | "number" | "array" | "object" | "boolean">;

const TEMPLATE_EDITOR_DEFAULTS: Record<string, Record<string, unknown>> = {
  "type-entrance-moves": { title: "GRAVITY" },
  "particle-sand-fill": {
    title: "PARTICLE SAND FILL",
    columns: [
      { label: "238", value: 238 },
      { label: "336", value: 336 },
      { label: "182", value: 182 },
      { label: "294", value: 294 },
    ],
    maxValue: 336,
  },
};

const PROP_LABELS: Record<string, string> = {
  title: "Texto principal",
  text: "Texto",
  subtitle: "Texto secundário",
  label: "Rótulo",
  value: "Valor",
  unit: "Unidade",
  prefix: "Prefixo",
  suffix: "Sufixo",
  columns: "Colunas do gráfico (JSON)",
  maxValue: "Valor máximo",
  items: "Itens (JSON)",
  words: "Palavras (JSON)",
  rows: "Linhas (JSON)",
  milestones: "Marcos (JSON)",
};

function draftValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
}

function parseDraftValue(value: string, type?: string) {
  if (type === "number") return Number(value) || 0;
  if (type === "boolean") return value === "true";
  if (type === "array" || type === "object") {
    try { return JSON.parse(value); } catch { return type === "array" ? [] : {}; }
  }
  return value;
}

type NicheItem = {
  niche: string;
  label: string;
  palette: Record<string, string>;
};

type CategoryItem = {
  category: string;
  label: string;
  subcategories: string[];
  icon: string;
};

type SceneBlock = {
  id: string;
  scene_ref: string;
  narration: string;
  duration_seconds: number;
  template_id: string | null;
  template_name: string | null;
  props: Record<string, unknown>;
  palette: Record<string, string> | null;
  start_seconds: number;
  style?: string;
};

/* ─── Category Icons ─── */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  dados: <BarChart3 className="w-4 h-4" />,
  comparacao: <Layers className="w-4 h-4" />,
  timeline: <Clock className="w-4 h-4" />,
  lista: <Layout className="w-4 h-4" />,
  texto: <Type className="w-4 h-4" />,
  transicao: <Shuffle className="w-4 h-4" />,
  camera: <Video className="w-4 h-4" />,
  impacto: <Star className="w-4 h-4" />,
  abertura: <Play className="w-4 h-4" />,
  encerramento: <Film className="w-4 h-4" />,
  elemento: <Star className="w-4 h-4" />,
};

/* ─── API helpers ─── */
async function fetchTemplates(category?: string): Promise<TemplateItem[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const res = await fetch(`/api/templates?${params}`);
  const data = repairMojibakeDeep(await res.json());
  return data.ok ? data.templates : [];
}

async function fetchNiches(): Promise<NicheItem[]> {
  const res = await fetch("/api/templates/niches/list");
  const data = repairMojibakeDeep(await res.json());
  return data.ok ? data.niches : [];
}

async function fetchCategories(): Promise<CategoryItem[]> {
  const res = await fetch("/api/templates/categories/list");
  const data = repairMojibakeDeep(await res.json());
  return data.ok ? data.categories : [];
}

async function seedDatabase(): Promise<{ inserted: number; skipped: number }> {
  const res = await fetch("/api/templates/seed", { method: "POST" });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "seed failed");
  return { inserted: data.inserted || 0, skipped: data.skipped || 0 };
}

function mapVisualPromptsToScenes(storyboard: any): SceneBlock[] {
  const prompts = Array.isArray(storyboard?.visual_prompts)
    ? storyboard.visual_prompts
    : Array.isArray(storyboard?.scenes)
      ? storyboard.scenes
      : [];

  return prompts.map((s: any, i: number) => {
    const sceneRef = String(s.scene || s.scene_id || s.id || i + 1);
    const shot = s.motion_shot || null;
    return {
      id: sceneRef,
      scene_ref: sceneRef,
      narration:
        s.narration_text || s.narration || s.texto || s.narration_excerpt || "",
      duration_seconds:
        Number(s.duration_seconds) || Number(shot?.duration_seconds) || 5,
      template_id: shot?.templateId || null,
      template_name: shot?.templateId || null,
      props: shot?.props || {},
      palette: shot?.palette || null,
      start_seconds:
        Number(shot?.start_seconds) >= 0 ? Number(shot.start_seconds) : 1.2,
      style: shot?.style,
    };
  });
}

/* ─── Main Component ─── */

export function LumieraEditor({
  activeProject,
  projectNiche,
  projectConfig,
}: {
  activeProject: string | null;
  projectNiche: string;
  projectConfig?: ConfigData | null;
}) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [niches, setNiches] = useState<NicheItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(
    null
  );
  const [selectedScene, setSelectedScene] = useState<SceneBlock | null>(null);
  const [scenes, setScenes] = useState<SceneBlock[]>([]);
  const [storyboard, setStoryboard] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNiche, setActiveNiche] = useState<string>(projectNiche);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(
    null
  );
  const [propDraft, setPropDraft] = useState<Record<string, string>>({
    value: "",
    unit: "",
    label: "",
    title: "",
    subtitle: "",
    prefix: "",
    suffix: "",
  });
  const [templatePropSchema, setTemplatePropSchema] = useState<TemplatePropSchema>({});
  const [previewMotionOpacity, setPreviewMotionOpacity] = useState(1);
  const [motionTextDraft, setMotionTextDraft] = useState({ primary: "", secondary: "" });
  const [dragTemplateId, setDragTemplateId] = useState<string | null>(null);
  const [dragSceneId, setDragSceneId] = useState<string | null>(null);
  const [dropSceneId, setDropSceneId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<LumieraEditorTool>("motion");
  const [editorProject, setEditorProject] = useState<LumieraEditorProject>(() =>
    createEmptyLumieraProject("16:9")
  );
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playheadFrame, setPlayheadFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [toolText, setToolText] = useState("Novo texto");
  const [stockQuery, setStockQuery] = useState("natureza cinematografica");
  const [stockModal, setStockModal] = useState<{
    open: boolean;
    mediaType: "video" | "image";
  }>({ open: false, mediaType: "video" });
  const detectedVideoFormatsRef = useRef(new Set<string>());
  const undoCommandsRef = useRef<
    Array<{ undo: LumieraEditCommand; redo: LumieraEditCommand }>
  >([]);
  const redoCommandsRef = useRef<
    Array<{ undo: LumieraEditCommand; redo: LumieraEditCommand }>
  >([]);

  useEffect(() => {
    setActiveNiche(projectNiche || "Engenharia");
  }, [projectNiche]);

  /* Load catalog on mount */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let [t, n, c] = await Promise.all([
          fetchTemplates(),
          fetchNiches(),
          fetchCategories(),
        ]);
        if (t.length === 0 || n.length === 0 || c.length === 0) {
          const seed = await seedDatabase();
          toast.success(
            `Seed: ${seed.inserted} templates inseridos, ${seed.skipped} já existiam`
          );
          [t, n, c] = await Promise.all([
            fetchTemplates(),
            fetchNiches(),
            fetchCategories(),
          ]);
        }
        setTemplates(t);
        setNiches(n);
        setCategories(c);
      } catch (err: any) {
        toast.error("Erro ao carregar editor: " + (err?.message || err));
      }
      setLoading(false);
    })();
  }, []);

  /* Load storyboard scenes from project */
  const reloadStoryboard = useCallback(async () => {
    if (!activeProject) {
      setScenes([]);
      setStoryboard(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/projects/storyboard?project=${encodeURIComponent(activeProject)}`
      );
      const data = repairMojibakeDeep(await res.json());
      // API retorna o storyboard no root (não em data.storyboard)
      const sb =
        data?.storyboard && typeof data.storyboard === "object"
          ? data.storyboard
          : data;
      if (
        sb &&
        (sb.visual_prompts || sb.scenes || sb.narrative_script !== undefined)
      ) {
        setStoryboard(sb);
        setScenes(mapVisualPromptsToScenes(sb));
      } else {
        setStoryboard(null);
        setScenes([]);
      }
    } catch {
      setStoryboard(null);
      setScenes([]);
    }
  }, [activeProject]);

  useEffect(() => {
    void reloadStoryboard();
  }, [reloadStoryboard]);

  /* Filtered templates */
  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (selectedCategory) {
      list = list.filter((t) => t.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.template_id.includes(q)
      );
    }
    return list;
  }, [templates, selectedCategory, searchQuery]);

  /* Active niche palette */
  const nichePalette = useMemo(() => {
    const n = niches.find(
      (x) => x.niche.toLowerCase() === String(activeNiche || "").toLowerCase()
    );
    return (
      n?.palette || {
        primary: "#F5A623",
        accent: "#4A9EFF",
        bg: "rgba(10,10,18,0.82)",
        text: "#FFFFFF",
      }
    );
  }, [niches, activeNiche]);

  const previewProps = useMemo(() => {
    const defaults =
      previewTemplate?.default_props &&
      typeof previewTemplate.default_props === "object"
        ? { ...previewTemplate.default_props }
        : {};
    const base =
      selectedScene?.props && typeof selectedScene.props === "object"
        ? { ...selectedScene.props }
        : {};
    const dynamicProps = Object.fromEntries(
      Object.entries(propDraft)
        .filter(([, value]) => value !== "")
        .map(([key, value]) => [key, parseDraftValue(value, templatePropSchema[key])])
    );
    return {
      ...defaults,
      ...base,
      ...dynamicProps,
      ...(propDraft.value
        ? { value: Number(propDraft.value) || propDraft.value }
        : {}),
      ...(propDraft.unit ? { unit: propDraft.unit } : {}),
      ...(propDraft.label
        ? { label: propDraft.label, title: propDraft.label }
        : {}),
      ...(propDraft.title
        ? {
            title: propDraft.title,
            text: propDraft.title,
            label: propDraft.label || propDraft.title,
          }
        : {}),
      ...(propDraft.subtitle ? { subtitle: propDraft.subtitle } : {}),
      ...(propDraft.prefix ? { prefix: propDraft.prefix } : {}),
      ...(propDraft.suffix ? { suffix: propDraft.suffix } : {}),
      opacity: previewMotionOpacity,
      forceTransparent: true,
    };
  }, [selectedScene, propDraft, previewTemplate, previewMotionOpacity, templatePropSchema]);

  useEffect(() => {
    if (!selectedTemplate?.template_id) {
      setTemplatePropSchema({});
      return;
    }
    let cancelled = false;
    fetch(`/api/motion/props-schema/${encodeURIComponent(selectedTemplate.template_id)}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setTemplatePropSchema(data?.schema && typeof data.schema === "object" ? data.schema : {});
      })
      .catch(() => { if (!cancelled) setTemplatePropSchema({}); });
    return () => { cancelled = true; };
  }, [selectedTemplate?.template_id]);

  const selectedTemplateFields = useMemo(() => {
    if (!selectedTemplate) return [] as Array<[string, string]>;
    const defaults = {
      ...(TEMPLATE_EDITOR_DEFAULTS[selectedTemplate.template_id] || {}),
      ...(selectedTemplate.default_props || {}),
    };
    const keys = new Set([...Object.keys(templatePropSchema), ...Object.keys(defaults)]);
    if (selectedTemplate.category === "texto" || !keys.size) keys.add("title");
    if (selectedTemplate.category === "texto") keys.add("subtitle");
    return [...keys]
      .filter((key) => !["palette", "positionX", "positionY", "scale", "opacity", "forceTransparent"].includes(key))
      .map((key) => [key, PROP_LABELS[key] || key.replace(/([A-Z])/g, " $1").trim()] as [string, string]);
  }, [selectedTemplate, templatePropSchema]);

  const selectedClip = useMemo(
    () =>
      selectedClipId
        ? findLumieraClip(editorProject, selectedClipId)?.clip || null
        : null,
    [editorProject, selectedClipId]
  );
  const selectedMotionText = useMemo(
    () =>
      selectedClip?.type === "motion-template"
        ? resolveMotionTemplateText(selectedClip.templateId, selectedClip.props)
        : { primary: "", secondary: "", props: {}, isNumeric: false },
    [selectedClip]
  );
  useEffect(() => {
    setMotionTextDraft({
      primary: selectedMotionText.primary,
      secondary: selectedMotionText.secondary,
    });
    // O rascunho pertence à seleção. Mudanças internas do Player não devem
    // sobrescrever o texto enquanto o usuário está digitando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClipId]);
  const selectedMotionPropEntries = useMemo(() => {
    if (selectedClip?.type !== "motion-template") return [] as Array<[string, unknown]>;
    return Object.entries(selectedClip.props || {}).filter(([key]) =>
      !["palette", "positionX", "positionY", "scale", "opacity", "forceTransparent", "sceneRef", "motion_shot", "title", "text", "subtitle", "label"].includes(key)
    );
  }, [selectedClip]);

  useEffect(() => {
    if (!activeProject) {
      setEditorProject(createEmptyLumieraProject("16:9"));
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/lumiera-editor/project?project=${encodeURIComponent(activeProject)}`);
        const data = repairMojibakeDeep(await response.json());
        if (!cancelled && data?.project?.tracks) {
          setEditorProject(data.project as LumieraEditorProject);
          return;
        }
      } catch { /* local fallback below */ }
      if (cancelled) return;
      try {
        const saved = localStorage.getItem(`lumiera-live-editor:${activeProject}`);
        setEditorProject(
          saved
            ? repairMojibakeDeep(JSON.parse(saved) as LumieraEditorProject)
            : createEmptyLumieraProject("16:9")
        );
      } catch {
        setEditorProject(createEmptyLumieraProject("16:9"));
      }
    };
    void load();
    undoCommandsRef.current = [];
    redoCommandsRef.current = [];
    setSelectedClipId(null);
    setPlayheadFrame(0);
    return () => { cancelled = true; };
  }, [activeProject]);

  useEffect(() => {
    if (!activeProject) return;
    localStorage.setItem(
      `lumiera-live-editor:${activeProject}`,
      JSON.stringify(editorProject)
    );
    const timer = window.setTimeout(() => {
      void fetch(`/api/lumiera-editor/project?project=${encodeURIComponent(activeProject)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: editorProject }),
      }).catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeProject, editorProject]);

  useEffect(() => {
    if (!scenes.length) return;
    setEditorProject((current) => {
      let cursorSeconds = 0;
      const motionClips = scenes.flatMap((scene) => {
        const sceneStart = cursorSeconds;
        cursorSeconds += Math.max(0.1, scene.duration_seconds || 5);
        if (!scene.template_id) return [];
        const duration = Math.min(8, Math.max(0.5, scene.duration_seconds || 4));
        const clipId = `motion-scene-${scene.id}`;
        const existingClip = current.tracks
          .find((track) => track.id === "motion")
          ?.clips.find((clip) => clip.id === clipId);
        return [
          {
            id: clipId,
            trackId: "motion",
            type: "motion-template" as const,
            startFrame:
              existingClip?.templateId === scene.template_id
                ? existingClip.startFrame
                : secondsToFrames(
                    sceneStart + Math.max(0, scene.start_seconds || 0),
                    current.fps
                  ),
            durationInFrames:
              existingClip?.templateId === scene.template_id
                ? existingClip.durationInFrames
                : secondsToFrames(duration, current.fps),
            label: scene.template_name || scene.template_id,
            templateId: scene.template_id,
            props: {
              ...(scene.props || {}),
              ...(existingClip?.templateId === scene.template_id
                ? existingClip.props || {}
                : {}),
              palette: scene.palette || nichePalette,
              sceneRef: scene.scene_ref,
            },
          },
        ];
      });
      return {
        ...current,
        durationInFrames: Math.max(
          current.durationInFrames,
          secondsToFrames(cursorSeconds, current.fps)
        ),
        tracks: current.tracks.map((track) =>
          track.id === "motion"
            ? {
                ...track,
                clips: [
                  ...track.clips.filter(
                    (clip) => !clip.id.startsWith("motion-scene-")
                  ),
                  ...motionClips,
                ],
              }
            : track
        ),
      };
    });
  }, [nichePalette, scenes]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setPlayheadFrame((frame) => {
        if (frame >= editorProject.durationInFrames) {
          setPlaying(false);
          return 0;
        }
        return frame + 1;
      });
    }, 1000 / editorProject.fps);
    return () => window.clearInterval(timer);
  }, [editorProject.durationInFrames, editorProject.fps, playing]);

  const executeEditorCommand = useCallback(
    (
      command: LumieraEditCommand,
      summary: string = command.type,
      actor: "manual" | "ai" | "system" = "manual"
    ) => {
      setEditorProject((current) => {
        const result = applyLumieraCommand(current, command, {
          actor,
          summary,
        });
        if (result.errors.length) {
          toast.error(result.errors[0]);
          return current;
        }
        undoCommandsRef.current = [
          ...undoCommandsRef.current.slice(-99),
          { undo: result.inverse, redo: command },
        ];
        redoCommandsRef.current = [];
        return result.project;
      });
    },
    []
  );

  const updateSelectedMotionProps = useCallback(
    (nextProps: Record<string, unknown>, summary: string) => {
      if (!selectedClip || selectedClip.type !== "motion-template") return;
      executeEditorCommand(
        {
          type: "UPDATE_CLIP",
          clipId: selectedClip.id,
          patch: { props: nextProps },
        },
        summary
      );
      const sceneRef = String(
        nextProps.sceneRef || selectedClip.id.replace(/^motion-scene-/, "")
      );
      setScenes((current) =>
        current.map((scene) =>
          scene.id === sceneRef || scene.scene_ref === sceneRef
            ? {
                ...scene,
                props: { ...(scene.props || {}), ...nextProps },
                ...(nextProps.palette && typeof nextProps.palette === "object"
                  ? { palette: nextProps.palette as Record<string, string> }
                  : {}),
              }
            : scene
        )
      );
      setSelectedScene((scene) =>
        scene && (scene.id === sceneRef || scene.scene_ref === sceneRef)
          ? {
              ...scene,
              props: { ...(scene.props || {}), ...nextProps },
              ...(nextProps.palette && typeof nextProps.palette === "object"
                ? { palette: nextProps.palette as Record<string, string> }
                : {}),
            }
          : scene
      );
    },
    [executeEditorCommand, selectedClip]
  );

  const importAIPlan = useCallback(
    async (file: File) => {
      try {
        const plan = JSON.parse(await file.text()) as AIEditPlan;
        const validation = validateAIEditPlan(editorProject, plan);
        if (!validation.ok) {
          toast.error(`Plano da IA rejeitado: ${validation.errors[0]}`);
          return;
        }
        executeEditorCommand(
          validation.command,
          plan.summary || `Plano IA (${plan.operations.length} operacoes)`,
          "ai"
        );
        toast.success(`Plano da IA validado e aplicado (${plan.operations.length} operacoes)`);
      } catch (error: any) {
        toast.error(`Plano da IA invalido: ${error?.message || error}`);
      }
    },
    [editorProject, executeEditorCommand]
  );

  const undoEditorCommand = useCallback(() => {
    const entry = undoCommandsRef.current.pop();
    if (!entry) return toast("Nada para desfazer");
    setEditorProject((current) => {
      const result = applyLumieraCommand(current, entry.undo, {
        actor: "system",
        summary: "Desfazer",
      });
      redoCommandsRef.current.push(entry);
      return result.project;
    });
  }, []);

  const redoEditorCommand = useCallback(() => {
    const entry = redoCommandsRef.current.pop();
    if (!entry) return toast("Nada para refazer");
    setEditorProject((current) => {
      const result = applyLumieraCommand(current, entry.redo, {
        actor: "system",
        summary: "Refazer",
      });
      undoCommandsRef.current.push({ undo: result.inverse, redo: entry.redo });
      return result.project;
    });
  }, []);

  const addSimpleClip = useCallback(
    (
      type: LumieraTrackType,
      trackId: string,
      label: string,
      props: Record<string, unknown> = {}
    ) => {
      const id = `${type}-${Date.now()}`;
      executeEditorCommand(
        {
          type: "ADD_CLIP",
          clip: {
            id,
            trackId,
            type,
            startFrame: playheadFrame,
            durationInFrames: secondsToFrames(4, editorProject.fps),
            label,
            props,
          },
        },
        `Adicionar ${label}`
      );
      setSelectedClipId(id);
    },
    [editorProject.fps, executeEditorCommand, playheadFrame]
  );

  const applyDetectedVideoFormat = useCallback(
    (assetId: string, width: number, height: number) => {
      if (!width || !height || detectedVideoFormatsRef.current.has(assetId)) return;
      detectedVideoFormatsRef.current.add(assetId);
      const vertical = height > width;
      const nextWidth = vertical ? 1080 : 1920;
      const nextHeight = vertical ? 1920 : 1080;
      if (editorProject.width === nextWidth && editorProject.height === nextHeight) return;
      executeEditorCommand(
        { type: "SET_FORMAT", width: nextWidth, height: nextHeight },
        `Detectar formato ${vertical ? "9:16" : "16:9"} do video`,
        "system"
      );
    },
    [editorProject.height, editorProject.width, executeEditorCommand]
  );

  const addUploadedAsset = useCallback(
    async (file: File, kind: "video" | "audio" | "image" | "lottie") => {
      if (!activeProject) return toast.error("Nenhum projeto ativo");
      const toastId = toast.loading(`Processando ${file.name}...`);
      try {
        const response = await fetch(
          `/api/lumiera-editor/assets?project=${encodeURIComponent(activeProject)}&fps=${editorProject.fps}`,
          {
            method: "POST",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
              "X-File-Name": encodeURIComponent(file.name),
              "X-Media-Kind": kind,
            },
            body: file,
          }
        );
        const data = await response.json();
        if (!response.ok || !data?.asset) throw new Error(data?.error || "Falha na ingestao");
        const asset = data.asset;
      const clipId = `${kind}-${Date.now()}`;
      const trackId =
        kind === "audio" ? "audio" : kind === "image" ? "images" : kind;
        const commands: LumieraEditCommand[] = [
          { type: "ADD_ASSET", asset },
          {
            type: "ADD_CLIP",
            clip: {
              id: clipId,
              trackId,
              type: kind,
              startFrame: playheadFrame,
              durationInFrames: asset.durationInFrames || secondsToFrames(kind === "image" || kind === "lottie" ? 4 : 8, editorProject.fps),
              assetId: asset.id,
              label: file.name,
              ...(kind === "lottie"
                ? { props: { positionX: 0.5, positionY: 0.5, scale: 1 } }
                : {}),
            },
          },
        ];
        if (kind === "video" && asset.width && asset.height) {
          const vertical = asset.height > asset.width;
          commands.push({ type: "SET_FORMAT", width: vertical ? 1080 : 1920, height: vertical ? 1920 : 1080 });
          detectedVideoFormatsRef.current.add(asset.id);
        }
        executeEditorCommand({
          type: "BATCH",
          commands,
        }, `Importar ${file.name}`);
      setSelectedClipId(clipId);
        toast.success(`Midia pronta: original preservado e proxy criado`, { id: toastId });
      } catch (error: any) {
        toast.error(error?.message || "Falha ao importar midia", { id: toastId });
      }
    },
    [activeProject, editorProject.fps, executeEditorCommand, playheadFrame]
  );

  const addStockAsset = useCallback(
    (item: StockItem) => {
      if (!activeProject) return;
      const id = `stock-asset-${Date.now()}`;
      const clipId = `stock-${item.type}-${Date.now()}`;
      const remote = /^(https?:|\/api\/)/i.test(item.downloadUrl || "");
      const source = remote
        ? item.downloadUrl
        : `/api/projects-media/${encodeURIComponent(activeProject)}/ASSETS/${String(item.downloadUrl || "")
            .split("/")
            .map((part) => encodeURIComponent(part))
            .join("/")}`;
      const commands: LumieraEditCommand[] = [
        {
          type: "ADD_ASSET",
          asset: {
            id,
            name: item.photographer || `${item.provider} ${item.type}`,
            kind: item.type,
            originalSource: source,
            proxySource: source,
            width: item.width,
            height: item.height,
            durationInFrames: item.duration ? secondsToFrames(item.duration, editorProject.fps) : undefined,
            status: "ready",
          },
        },
        {
          type: "ADD_CLIP",
          clip: {
            id: clipId,
            trackId: item.type === "video" ? "video" : "images",
            type: item.type,
            startFrame: playheadFrame,
            durationInFrames: item.duration ? secondsToFrames(item.duration, editorProject.fps) : secondsToFrames(item.type === "video" ? 6 : 4, editorProject.fps),
            assetId: id,
            label: item.photographer || `${item.provider} ${item.type}`,
            props: { stockProvider: item.provider, stockSourceId: item.sourceId },
          },
        },
      ];
      if (item.type === "video" && item.width && item.height) {
        const vertical = item.height > item.width;
        commands.push({ type: "SET_FORMAT", width: vertical ? 1080 : 1920, height: vertical ? 1920 : 1080 });
        detectedVideoFormatsRef.current.add(id);
      }
      executeEditorCommand({ type: "BATCH", commands }, `Adicionar stock ${item.provider}`);
      setSelectedClipId(clipId);
      toast.success(`Asset ${item.provider} inserido no playhead`);
    },
    [activeProject, editorProject.fps, executeEditorCommand, playheadFrame]
  );

  /* Assign template to scene */
  const applyDefaultPropsToDraft = useCallback((template: TemplateItem) => {
    const d = {
      ...(TEMPLATE_EDITOR_DEFAULTS[template.template_id] || {}),
      ...(template.default_props && typeof template.default_props === "object"
        ? template.default_props
        : {}),
    };
    const dynamicDraft = Object.fromEntries(
      Object.entries(d).map(([key, value]) => [key, draftValue(value)])
    );
    setPropDraft({
      ...dynamicDraft,
      value: String((d as any).value ?? (d as any).valor ?? ""),
      unit: String((d as any).unit ?? (d as any).unidade ?? ""),
      label: String((d as any).label ?? (d as any).title ?? ""),
      title: String((d as any).title ?? (d as any).text ?? (d as any).label ?? ""),
      subtitle: String((d as any).subtitle ?? ""),
      prefix: String((d as any).prefix ?? ""),
      suffix: String((d as any).suffix ?? ""),
    });
    const configuredOpacity = Number((d as any).opacity ?? 1);
    setPreviewMotionOpacity(
      Math.max(0, Math.min(1, Number.isFinite(configuredOpacity) ? configuredOpacity : 1))
    );
  }, []);

  const assignTemplateToScene = useCallback(
    (template: TemplateItem, scene: SceneBlock) => {
      const defaults =
        template.default_props && typeof template.default_props === "object"
          ? { ...template.default_props }
          : {};
      const nextProps = {
        ...defaults,
        ...scene.props,
        ...(propDraft.value
          ? { value: Number(propDraft.value) || propDraft.value }
          : {}),
        ...(propDraft.unit ? { unit: propDraft.unit } : {}),
        ...(propDraft.label ? { label: propDraft.label } : {}),
        ...(propDraft.title
          ? {
              title: propDraft.title,
              text: propDraft.title,
              label: propDraft.label || propDraft.title,
            }
          : {}),
        ...(propDraft.subtitle ? { subtitle: propDraft.subtitle } : {}),
        ...(propDraft.prefix ? { prefix: propDraft.prefix } : {}),
        ...(propDraft.suffix ? { suffix: propDraft.suffix } : {}),
      };
      setScenes((prev) =>
        prev.map((s) =>
          s.id === scene.id
            ? {
                ...s,
                template_id: template.template_id,
                template_name: template.name,
                palette: nichePalette,
                props: nextProps,
                duration_seconds:
                  template.duration_seconds || s.duration_seconds,
              }
            : s
        )
      );
      setSelectedScene((cur) =>
        cur && cur.id === scene.id
          ? {
              ...cur,
              template_id: template.template_id,
              template_name: template.name,
              palette: nichePalette,
              props: nextProps,
            }
          : cur
      );
      setPreviewTemplate(template);
      setSelectedTemplate(template);
      toast.success(
        `${template.name} → Cena "${(scene.narration || "").slice(0, 30)}…"`
      );
    },
    [nichePalette, propDraft]
  );

  const assignTemplateIdToScene = useCallback(
    (templateId: string, sceneId: string) => {
      const template = templates.find((t) => t.template_id === templateId);
      const scene = scenes.find((s) => s.id === sceneId);
      if (template && scene) assignTemplateToScene(template, scene);
    },
    [templates, scenes, assignTemplateToScene]
  );

  const addMotionTemplateToTimeline = useCallback(
    (templateId: string, startFrame: number) => {
      const template = templates.find((item) => item.template_id === templateId);
      if (!template) {
        toast.error("Motion Template não encontrado");
        return;
      }
      const defaults =
        template.default_props && typeof template.default_props === "object"
          ? { ...template.default_props }
          : {};
      const selectedProperties =
        selectedTemplate?.template_id === templateId ? previewProps : defaults;
      const clipId = `motion-${templateId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      executeEditorCommand(
        {
          type: "ADD_CLIP",
          clip: {
            id: clipId,
            trackId: "motion",
            type: "motion-template",
            startFrame: Math.max(0, Math.round(startFrame)),
            durationInFrames: secondsToFrames(
              Math.max(0.1, template.duration_seconds || 4),
              editorProject.fps
            ),
            label: template.name,
            templateId: template.template_id,
            props: {
              ...selectedProperties,
              opacity: Number(
                (selectedProperties as Record<string, unknown>).opacity ?? 1
              ),
              forceTransparent: true,
              palette: nichePalette,
              positionX: Number(
                (selectedProperties as Record<string, unknown>).positionX ?? 0.5
              ),
              positionY: Number(
                (selectedProperties as Record<string, unknown>).positionY ?? 0.5
              ),
              scale: Number(
                (selectedProperties as Record<string, unknown>).scale ?? 1
              ),
            },
          },
        },
        "Adicionar Motion Template"
      );
      setSelectedClipId(clipId);
      setSelectedTemplate(null);
      setPreviewTemplate(null);
      setPlayheadFrame(Math.max(0, Math.round(startFrame)));
      toast.success(`${template.name} adicionado à trilha Motion`);
    },
    [
      editorProject.fps,
      executeEditorCommand,
      nichePalette,
      previewProps,
      selectedTemplate,
      templates,
    ]
  );

  const reorderScenes = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setScenes((prev) => {
      const fromIdx = prev.findIndex((s) => s.id === fromId);
      const toIdx = prev.findIndex((s) => s.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  /* Save motion plan via /api/motion/plan/override */
  const saveMotionPlan = useCallback(async () => {
    if (!activeProject) return toast.error("Nenhum projeto ativo");
    if (!storyboard) return toast.error("Storyboard não carregado");

    const motionTrack = editorProject.tracks.find((track) => track.id === "motion");
    let sceneCursorSeconds = 0;
    const motionTimingByScene = new Map<string, { start_seconds: number; duration_seconds: number }>();
    const scenesForSave = scenes.map((scene) => {
      const sceneStartSeconds = sceneCursorSeconds;
      sceneCursorSeconds += Math.max(0.1, scene.duration_seconds || 5);
      const clip = motionTrack?.clips.find(
        (candidate) =>
          candidate.id === `motion-scene-${scene.id}` ||
          candidate.props?.sceneRef === scene.scene_ref
      );
      if (!clip || !scene.template_id) return scene;
      const timing = {
        start_seconds: Math.max(
          0,
          framesToSeconds(clip.startFrame, editorProject.fps) - sceneStartSeconds
        ),
        duration_seconds: Math.max(
          0.1,
          framesToSeconds(clip.durationInFrames, editorProject.fps)
        ),
      };
      motionTimingByScene.set(scene.scene_ref, timing);
      return {
        ...scene,
        start_seconds: timing.start_seconds,
        props: { ...(scene.props || {}), ...(clip.props || {}) },
        palette:
          (clip.props?.palette as Record<string, string> | undefined) ||
          scene.palette,
      };
    });

    setSaving(true);
    try {
      const projectSave = await fetch(
        `/api/lumiera-editor/project?project=${encodeURIComponent(activeProject)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: editorProject }),
        }
      );
      if (!projectSave.ok) {
        const projectError = await projectSave.json().catch(() => ({}));
        throw new Error(projectError.error || "Falha ao salvar linha do tempo");
      }
      // Build plan from current scenes
      const plan = {
        niche: activeNiche,
        format: editorProject.height > editorProject.width ? "9:16" : "16:9",
        palette: nichePalette,
        cenas: scenesForSave.map((s) => ({
          scene_ref: s.scene_ref,
          motion_shot: s.template_id
            ? {
                templateId: s.template_id,
                style: s.style,
                props: s.props || {},
                palette: s.palette || nichePalette,
                start_seconds: s.start_seconds,
                duration_seconds:
                  motionTimingByScene.get(s.scene_ref)?.duration_seconds || 4,
              }
            : null,
        })),
      };

      // Overrides only for scenes with templates (or explicit null)
      const overrides = {
        cenas: Object.fromEntries(
          scenesForSave.map((s) => [
            s.scene_ref,
            s.template_id
              ? {
                  templateId: s.template_id,
                  style: s.style,
                  props: s.props || {},
                  palette: s.palette || nichePalette,
                }
              : { remover: true },
          ])
        ),
      };

      // Prefer override path with apply so storyboard is written
      const res = await fetch("/api/motion/plan/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          overrides,
          project: activeProject,
          apply: true,
        }),
      });
      const data = await res.json();
      if (!data.ok && data.error) {
        throw new Error(data.error);
      }

      // Merge timing + reorder visual_prompts to match timeline order
      if (data.storyboard?.visual_prompts) {
        const byRef = new Map(
          (data.storyboard.visual_prompts as any[]).map(
            (vp: any, i: number) => [
              String(vp.scene || vp.scene_id || i + 1),
              vp,
            ]
          )
        );
        const reordered = scenesForSave.map((local, i) => {
          const vp = byRef.get(local.scene_ref) || {
            scene: local.scene_ref,
            narration_text: local.narration,
          };
          if (!local.template_id) {
            return {
              ...vp,
              motion_shot: null,
              _editor_order: i,
            };
          }
          return {
            ...vp,
            _editor_order: i,
            motion_shot: {
              ...(vp.motion_shot || {}),
              templateId: local.template_id,
              style: local.style,
              start_seconds: local.start_seconds,
              duration_seconds:
                motionTimingByScene.get(local.scene_ref)?.duration_seconds || 4,
              palette: local.palette || nichePalette,
              props: local.props || vp.motion_shot?.props || {},
            },
          };
        });
        // Keep any prompts not present in local scenes (appended)
        for (const [key, vp] of byRef) {
          if (!scenesForSave.some((s) => s.scene_ref === key)) {
            reordered.push(vp);
          }
        }
        const patched = {
          ...data.storyboard,
          visual_prompts: reordered,
          motion_plan: {
            ...(data.storyboard.motion_plan || plan),
            palette: nichePalette,
            niche: activeNiche,
            cenas: plan.cenas,
          },
        };

        // POST /api/projects/storyboard expects the storyboard body at root
        const saveRes = await fetch(
          `/api/projects/storyboard?project=${encodeURIComponent(activeProject)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patched),
          }
        );
        if (!saveRes.ok) {
          const saveErr = await saveRes.json().catch(() => ({}));
          throw new Error(
            saveErr.error || `Falha ao gravar storyboard (${saveRes.status})`
          );
        }
        setStoryboard(patched);
        setScenes(mapVisualPromptsToScenes(patched));
      }

      toast.success("Projeto, linha do tempo e Motion Plan salvos!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  }, [activeProject, storyboard, scenes, nichePalette, activeNiche, editorProject]);

  const applyPaletteToAll = useCallback(() => {
    setScenes((prev) =>
      prev.map((s) => (s.template_id ? { ...s, palette: nichePalette } : s))
    );
    const commands = editorProject.tracks
      .flatMap((track) => track.clips)
      .filter((clip) => clip.type === "motion-template")
      .map((clip) => ({
        type: "UPDATE_CLIP" as const,
        clipId: clip.id,
        patch: { props: { ...(clip.props || {}), palette: nichePalette } },
      }));
    if (commands.length) {
      executeEditorCommand({ type: "BATCH", commands }, `Aplicar paleta ${activeNiche} aos Motions`);
    }
    toast.success(
      `Paleta ${activeNiche} aplicada a todas as cenas com template`
    );
  }, [nichePalette, activeNiche, editorProject.tracks, executeEditorCommand]);

  const selectNichePalette = useCallback((nicheName: string) => {
    setActiveNiche(nicheName);
    const selectedPalette = niches.find(
      (item) => item.niche.toLowerCase() === nicheName.toLowerCase()
    )?.palette;
    if (!selectedPalette || selectedClip?.type !== "motion-template") return;
    updateSelectedMotionProps(
      { ...(selectedClip.props || {}), palette: selectedPalette },
      `Aplicar paleta ${nicheName} ao Motion selecionado`
    );
  }, [niches, selectedClip, updateSelectedMotionProps]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-gray-400">
          Carregando Editor do Lumiera...
        </span>
      </div>
    );
  }

  return (
    <>
    <div className="flex w-full flex-col min-h-[calc(100vh-100px)] gap-0 overflow-visible rounded-2xl border border-white/5 bg-[#0a0a12]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 bg-[#0d0d18]">
        <Film className="w-5 h-5 text-indigo-400" />
        <h2 className="text-sm font-bold text-white tracking-wide">
          Editor do Lumiera
        </h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
          {activeProject || "sem projeto"}
        </span>
        <div className="flex-1" />
        <select
          value={activeNiche}
          onChange={(e) => selectNichePalette(e.target.value)}
          className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          {niches.length === 0 && (
            <option value={projectNiche}>{projectNiche}</option>
          )}
          {niches.map((n) => (
            <option key={n.niche} value={n.niche}>
              {n.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded-full border border-white/20"
            style={{ background: nichePalette.primary }}
          />
          <div
            className="w-4 h-4 rounded-full border border-white/20"
            style={{ background: nichePalette.accent }}
          />
        </div>
        <button
          type="button"
          onClick={applyPaletteToAll}
          className="text-[10px] px-2 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10"
          title="Aplicar paleta do nicho a todas as cenas"
        >
          Aplicar paleta
        </button>
        <button
          type="button"
          onClick={() => void reloadStoryboard()}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={undoEditorCommand}
          className="rounded-lg bg-white/5 p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          title="Desfazer edição da timeline"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={redoEditorCommand}
          className="rounded-lg bg-white/5 p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          title="Refazer edição da timeline"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
        <label
          className="flex cursor-pointer items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-[10px] text-indigo-200 hover:bg-white/10"
          title="Valida todas as operacoes antes de alterar a timeline"
        >
          Plano IA
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importAIPlan(file);
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => void saveMotionPlan()}
          disabled={saving || !activeProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Salvando…" : "Salvar projeto + Motion Plan"}
        </button>
      </div>

      {/* Main content: 3 panels */}
      <div className="flex h-[clamp(560px,72vh,900px)] min-h-0 flex-none overflow-hidden">
        <LumieraEditorToolRail
          activeTool={activeTool}
          onChange={setActiveTool}
        />
        {/* LEFT: Template Library */}
        <div className="w-72 border-r border-white/5 flex flex-col overflow-hidden bg-[#0c0c16]">
          {activeTool === "motion" ? (
            <>
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar template..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="px-3 py-2 flex flex-wrap gap-1 border-b border-white/5">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                !selectedCategory
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                type="button"
                key={c.category}
                onClick={() =>
                  setSelectedCategory(
                    c.category === selectedCategory ? null : c.category
                  )
                }
                className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                  selectedCategory === c.category
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {CATEGORY_ICONS[c.category]}
                {c.label.split(" ")[0]}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <p className="text-[9px] text-gray-600 px-1 pb-1">
              Clique para pré-visualizar · arraste para a trilha Motion
            </p>
            {filteredTemplates.map((t) => (
              <button
                type="button"
                key={t.template_id}
                draggable
                onDragStart={(e) => {
                  setDragTemplateId(t.template_id);
                  e.dataTransfer.setData(
                    "application/x-lumiera-template",
                    t.template_id
                  );
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onDragEnd={() => {
                  setDragTemplateId(null);
                  setDropSceneId(null);
                }}
                onClick={() => {
                  setSelectedClipId(null);
                  setSelectedTemplate(t);
                  setPreviewTemplate(t);
                  applyDefaultPropsToDraft(t);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-grab active:cursor-grabbing ${
                  selectedTemplate?.template_id === t.template_id
                    ? "bg-indigo-600/20 border border-indigo-400/40 text-white"
                    : dragTemplateId === t.template_id
                      ? "bg-indigo-500/10 border border-indigo-400/30 text-white"
                      : "bg-white/[0.02] border border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3 h-3 opacity-40 shrink-0" />
                  {CATEGORY_ICONS[t.category]}
                  <span className="font-medium truncate">{t.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 pl-5">
                  <span className="px-1.5 py-0.5 rounded bg-white/5">
                    {t.category}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5">
                    {t.energy}
                  </span>
                  <span>{t.duration_seconds}s</span>
                </div>
              </button>
            ))}
            {filteredTemplates.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-8">
                Nenhum template encontrado
              </p>
            )}
          </div>
            </>
          ) : (
            <div className="flex h-full flex-col overflow-y-auto p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300">
                {activeTool}
              </p>
              <p className="mb-4 text-[10px] leading-relaxed text-zinc-600">
                O item será inserido no playhead atual e continuará editável na timeline.
              </p>

              {(activeTool === "media" ||
                activeTool === "audio" ||
                activeTool === "images" ||
                activeTool === "lottie") && (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-indigo-400/30 bg-indigo-500/5 px-3 py-6 text-center text-xs text-indigo-200 hover:bg-indigo-500/10">
                  <Upload className="h-5 w-5" />
                  Importar {activeTool}
                  <span className="text-[9px] text-zinc-600">
                    Original preservado · proxy usado no preview
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept={
                      activeTool === "media"
                        ? "video/*"
                        : activeTool === "audio"
                          ? "audio/*"
                          : activeTool === "images"
                            ? "image/*"
                            : ".json,application/json"
                    }
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void addUploadedAsset(
                        file,
                        activeTool === "media"
                          ? "video"
                          : activeTool === "audio"
                            ? "audio"
                            : activeTool === "images"
                              ? "image"
                              : "lottie"
                      );
                      event.target.value = "";
                    }}
                  />
                </label>
              )}

              {(activeTool === "media" || activeTool === "images") && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    Stock · Pexels · Pixabay · Bing
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={stockQuery}
                      onChange={(event) => setStockQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          setStockModal({ open: true, mediaType: activeTool === "media" ? "video" : "image" });
                        }
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-[10px] text-white outline-none focus:border-cyan-400"
                      placeholder="Buscar assets..."
                    />
                    <button
                      type="button"
                      onClick={() => setStockModal({ open: true, mediaType: activeTool === "media" ? "video" : "image" })}
                      className="rounded-lg bg-cyan-600 px-3 text-[10px] font-bold text-white hover:bg-cyan-500"
                    >
                      Buscar
                    </button>
                  </div>
                  <p className="mt-2 text-[9px] text-zinc-600">
                    Preview antes da escolha · asset salvo no projeto
                  </p>
                </div>
              )}

              {(activeTool === "text" || activeTool === "captions") && (
                <div className="space-y-3">
                  <textarea
                    value={toolText}
                    onChange={(event) => setToolText(event.target.value)}
                    className="h-24 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white outline-none focus:border-indigo-400"
                    placeholder="Digite o texto..."
                  />
                  <button
                    type="button"
                    onClick={() =>
                      addSimpleClip(
                        activeTool === "text" ? "text" : "caption",
                        activeTool === "text" ? "text" : "captions",
                        toolText || "Texto",
                        { text: toolText || "Texto", color: nichePalette.text }
                      )
                    }
                    className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                  >
                    Adicionar ao playhead
                  </button>
                </div>
              )}

              {activeTool === "effects" && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["zoom-in", "Zoom In"],
                    ["zoom-out", "Zoom Out"],
                    ["shake", "Shake"],
                    ["fade", "Fade"],
                  ].map(([effect, label]) => (
                    <button
                      key={effect}
                      type="button"
                      onClick={() =>
                        addSimpleClip("effect", "effects", label, { effect })
                      }
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-5 text-[10px] text-zinc-300 hover:border-indigo-400/50 hover:bg-indigo-500/10"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {activeTool === "background" && (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "#000000",
                    "#0f0f18",
                    "#ffffff",
                    "#312e81",
                    "#0f766e",
                    "#7c2d12",
                    "linear-gradient(135deg,#4f46e5,#ec4899)",
                    "linear-gradient(135deg,#0f172a,#0891b2)",
                  ].map((background) => (
                    <button
                      key={background}
                      type="button"
                      onClick={() =>
                        executeEditorCommand({
                          type: "SET_BACKGROUND",
                          background,
                        })
                      }
                      className="aspect-square rounded-lg border border-white/15"
                      style={{ background }}
                      title={background}
                    />
                  ))}
                </div>
              )}

              {activeTool === "templates" && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      executeEditorCommand(
                        { type: "RESTORE_PROJECT", project: createEmptyLumieraProject("16:9") },
                        "Aplicar projeto horizontal 16:9"
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left text-xs text-white hover:bg-white/5"
                  >
                    Projeto horizontal 16:9
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      executeEditorCommand(
                        { type: "RESTORE_PROJECT", project: createEmptyLumieraProject("9:16") },
                        "Aplicar projeto vertical 9:16"
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left text-xs text-white hover:bg-white/5"
                  >
                    Projeto vertical 9:16
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CENTER: Live Remotion Preview */}
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-[#080810] relative p-1 gap-2">
          {false ? (
            <>
              <ShotcraftLivePreview
                key={`${previewTemplate.template_id}-${activeNiche}-${propDraft.value}-${propDraft.label}`}
                templateId={previewTemplate.template_id}
                palette={selectedScene?.palette || nichePalette}
                props={previewProps}
                durationSeconds={previewTemplate.duration_seconds || 4}
                className="w-full max-w-[720px] aspect-video"
                autoPlay
                loop
              />
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="font-medium text-gray-400">
                  {previewTemplate.name}
                </span>
                <span>·</span>
                <span>{previewTemplate.template_id}</span>
                <span>·</span>
                <span>paleta {activeNiche}</span>
                {propDraft.value ? (
                  <>
                    <span>·</span>
                    <span className="text-indigo-300">
                      value={propDraft.value}
                      {propDraft.unit || propDraft.suffix || ""}
                    </span>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <LumieraEditorLivePreview
              project={editorProject}
              playheadFrame={playheadFrame}
              playing={playing}
              selectedClipId={selectedClipId}
              palette={nichePalette}
              onPlayingChange={setPlaying}
              onPlayheadChange={setPlayheadFrame}
              onVideoMetadata={applyDetectedVideoFormat}
              captionConfig={projectConfig}
              previewMotion={
                activeTool === "motion" && previewTemplate && !selectedClipId
                  ? {
                      templateId: previewTemplate.template_id,
                      label: previewTemplate.name,
                      palette: selectedScene?.palette || nichePalette,
                      props: previewProps,
                      durationInFrames: secondsToFrames(
                        previewTemplate.duration_seconds || 4,
                        editorProject.fps
                      ),
                      previewFrame: secondsToFrames(
                        (previewTemplate.duration_seconds || 4) * 0.35,
                        editorProject.fps
                      ),
                    }
                  : null
              }
              onVisualTransformChange={(clipId, transform) => {
                const motionClip = findLumieraClip(editorProject, clipId)?.clip;
                if (!motionClip) return;
                const nextProps = {
                  ...(motionClip.props || {}),
                  ...transform,
                };
                executeEditorCommand(
                  {
                    type: "UPDATE_CLIP",
                    clipId,
                    patch: { props: nextProps },
                  },
                  "Transformar elemento visual"
                );
                if (motionClip.type !== "motion-template") return;
                const sceneRef = String(
                  motionClip.props?.sceneRef ||
                    motionClip.id.replace(/^motion-scene-/, "")
                );
                setScenes((current) =>
                  current.map((scene) =>
                    scene.id === sceneRef || scene.scene_ref === sceneRef
                      ? {
                          ...scene,
                          props: {
                            ...(scene.props || {}),
                            ...transform,
                          },
                        }
                      : scene
                  )
                );
              }}
            />
          )}
        </div>

        {/* RIGHT: Properties */}
        <div className="w-72 border-l border-white/5 flex flex-col overflow-hidden bg-[#0c0c16]">
          <div className="p-3 border-b border-white/5">
            <h3 className="text-xs font-bold text-gray-300 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              Propriedades
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {selectedClip ? (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Clip selecionado
                  </label>
                  <p className="mt-1 truncate text-sm font-medium text-white">
                    {selectedClip.label || selectedClip.templateId || selectedClip.type}
                  </p>
                  <p className="text-[10px] text-indigo-300">
                    {selectedClip.type} · {selectedClip.id}
                  </p>
                </div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Início (segundos)
                  <input
                    type="number"
                    min={0}
                    step={1 / editorProject.fps}
                    value={framesToSeconds(selectedClip.startFrame, editorProject.fps)}
                    onChange={(event) =>
                      executeEditorCommand({
                        type: "MOVE_CLIP",
                        clipId: selectedClip.id,
                        startFrame: secondsToFrames(Number(event.target.value), editorProject.fps),
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Duração (segundos)
                  <input
                    type="number"
                    min={1 / editorProject.fps}
                    step={1 / editorProject.fps}
                    value={framesToSeconds(selectedClip.durationInFrames, editorProject.fps)}
                    onChange={(event) =>
                      executeEditorCommand({
                        type: "TRIM_CLIP",
                        clipId: selectedClip.id,
                        durationInFrames: secondsToFrames(Number(event.target.value), editorProject.fps),
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
                  />
                </label>
                {(selectedClip.type === "motion-template" || selectedClip.type === "lottie") ? (
                  <div className="space-y-2 rounded-lg border border-indigo-400/15 bg-indigo-400/5 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      Posição no vídeo
                    </p>
                    <p className="text-[10px] leading-relaxed text-gray-500">
                      Arraste no preview ou ajuste com precisão abaixo.
                    </p>
                    {selectedClip.type === "motion-template" ? <label className="block text-[9px] font-bold uppercase text-gray-500">
                      Texto principal
                      <textarea
                        value={motionTextDraft.primary}
                        onChange={(event) => setMotionTextDraft((draft) => ({ ...draft, primary: event.target.value }))}
                        onBlur={() =>
                          updateSelectedMotionProps(
                            updateMotionTemplatePrimaryText(
                              selectedClip.templateId,
                              selectedClip.props,
                              motionTextDraft.primary
                            ),
                            "Editar texto do Motion Template"
                          )
                        }
                        placeholder="Texto exibido no Motion"
                        onKeyDown={(event) => event.stopPropagation()}
                        className="mt-1 h-16 w-full resize-none rounded border border-white/10 bg-black/20 p-2 text-xs normal-case text-white outline-none focus:border-indigo-400"
                      />
                    </label> : null}
                    {selectedClip.type === "motion-template" ? <label className="block text-[9px] font-bold uppercase text-gray-500">
                      Texto secundário
                      <input
                        value={motionTextDraft.secondary}
                        onChange={(event) => setMotionTextDraft((draft) => ({ ...draft, secondary: event.target.value }))}
                        onBlur={() =>
                          updateSelectedMotionProps(
                            updateMotionTemplateSecondaryText(
                              selectedClip.templateId,
                              selectedClip.props,
                              motionTextDraft.secondary
                            ),
                            "Editar subtítulo do Motion Template"
                          )
                        }
                        placeholder="Subtítulo ou complemento"
                        onKeyDown={(event) => event.stopPropagation()}
                        className="mt-1 w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-xs normal-case text-white outline-none focus:border-indigo-400"
                      />
                    </label> : null}
                    {selectedClip.type === "motion-template" && selectedMotionPropEntries.length ? (
                      <div className="space-y-2 border-t border-white/5 pt-2">
                        <p className="text-[9px] font-bold uppercase text-gray-500">Demais dados do template</p>
                        {selectedMotionPropEntries.map(([key, value]) => {
                          const structured = value !== null && typeof value === "object";
                          const inputValue = draftValue(value);
                          const update = (raw: string) => {
                            let parsed: unknown = raw;
                            if (structured) {
                              try { parsed = JSON.parse(raw); } catch { return; }
                            } else if (typeof value === "number") parsed = Number(raw) || 0;
                            updateSelectedMotionProps({ ...(selectedClip.props || {}), [key]: parsed }, `Editar ${key}`);
                          };
                          return (
                            <label key={key} className="block text-[9px] font-bold uppercase text-gray-500">
                              {PROP_LABELS[key] || key}
                              {structured ? (
                                <textarea defaultValue={inputValue} onBlur={(event) => update(event.target.value)} onKeyDown={(event) => event.stopPropagation()} className="mt-1 h-20 w-full resize-y rounded border border-white/10 bg-black/20 p-2 font-mono text-[10px] normal-case text-white" />
                              ) : (
                                <input value={inputValue} onChange={(event) => update(event.target.value)} onKeyDown={(event) => event.stopPropagation()} className="mt-1 w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-xs normal-case text-white" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                    {selectedClip.type === "motion-template" ? <label className="block text-[9px] uppercase text-gray-500">
                      Intensidade / opacidade ({Math.round(Number(selectedClip.props?.opacity ?? 1) * 100)}%)
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={Number(selectedClip.props?.opacity ?? 1)}
                        onChange={(event) =>
                          executeEditorCommand(
                            {
                              type: "UPDATE_CLIP",
                              clipId: selectedClip.id,
                              patch: {
                                props: {
                                  ...(selectedClip.props || {}),
                                  opacity: Number(event.target.value),
                                  forceTransparent: true,
                                },
                              },
                            },
                            "Alterar opacidade do Motion Template"
                          )
                        }
                        className="mt-2 w-full accent-indigo-500"
                      />
                    </label> : null}
                    <label className="block text-[9px] uppercase text-gray-500">
                      Tamanho ({Math.round(Number(selectedClip.props?.scale ?? 1) * 100)}%)
                      <input
                        type="range"
                        min={0.25}
                        max={3}
                        step={0.01}
                        value={Number(selectedClip.props?.scale ?? 1)}
                        onChange={(event) => executeEditorCommand({
                          type: "UPDATE_CLIP",
                          clipId: selectedClip.id,
                          patch: { props: { ...(selectedClip.props || {}), scale: Number(event.target.value) } },
                        }, "Redimensionar elemento visual")}
                        className="mt-2 w-full accent-indigo-500"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["positionX", "positionY"] as const).map((key) => (
                        <label key={key} className="text-[9px] uppercase text-gray-500">
                          {key === "positionX" ? "X (%)" : "Y (%)"}
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round(Number(selectedClip.props?.[key] ?? 0.5) * 100)}
                            onChange={(event) =>
                              executeEditorCommand(
                                {
                                  type: "UPDATE_CLIP",
                                  clipId: selectedClip.id,
                                  patch: {
                                    props: {
                                      ...(selectedClip.props || {}),
                                      [key]: Math.max(0, Math.min(1, Number(event.target.value) / 100)),
                                    },
                                  },
                                },
                                "Posicionar Motion Template"
                              )
                            }
                            className="mt-1 w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white"
                          />
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        executeEditorCommand(
                          {
                            type: "UPDATE_CLIP",
                            clipId: selectedClip.id,
                            patch: {
                              props: {
                                ...(selectedClip.props || {}),
                                positionX: 0.5,
                                positionY: 0.5,
                                scale: 1,
                              },
                            },
                          },
                          "Redefinir transformação visual"
                        )
                      }
                      className="w-full rounded border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-gray-300 hover:bg-white/10"
                    >
                      Centralizar e restaurar tamanho
                    </button>
                  </div>
                ) : null}
                {(selectedClip.type === "text" || selectedClip.type === "caption") && (
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Texto
                    <textarea
                      value={String(selectedClip.props?.text || selectedClip.label || "")}
                      onChange={(event) =>
                        executeEditorCommand({
                          type: "UPDATE_CLIP",
                          clipId: selectedClip.id,
                          patch: {
                            label: event.target.value,
                            props: { ...selectedClip.props, text: event.target.value },
                          },
                        })
                      }
                      className="mt-2 h-24 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-white"
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedClip.type === "motion-template") {
                      const sceneRef = String(
                        selectedClip.props?.sceneRef ||
                          selectedClip.id.replace(/^motion-scene-/, "")
                      );
                      setScenes((current) =>
                        current.map((scene) =>
                          scene.id === sceneRef || scene.scene_ref === sceneRef
                            ? {
                                ...scene,
                                template_id: null,
                                template_name: null,
                                props: {},
                                palette: null,
                              }
                            : scene
                        )
                      );
                      setSelectedScene((scene) =>
                        scene && (scene.id === sceneRef || scene.scene_ref === sceneRef)
                          ? {
                              ...scene,
                              template_id: null,
                              template_name: null,
                              props: {},
                              palette: null,
                            }
                          : scene
                      );
                      setSelectedTemplate(null);
                      setPreviewTemplate(null);
                    }
                    executeEditorCommand({ type: "REMOVE_CLIP", clipId: selectedClip.id });
                    setSelectedClipId(null);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover clip
                </button>
              </>
            ) : selectedTemplate ? (
              <>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    Template
                  </label>
                  <p className="text-sm text-white font-medium mt-1">
                    {selectedTemplate.name}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {selectedTemplate.template_id}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    Dados (props) · atualiza preview
                  </label>
                  <div className="mt-2 space-y-2">
                    {selectedTemplateFields.map(([key, label]) => {
                      const structured = templatePropSchema[key] === "array" || templatePropSchema[key] === "object";
                      const commonProps = {
                        value: propDraft[key] || "",
                        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                          setPropDraft((draft) => ({ ...draft, [key]: event.target.value })),
                        onKeyDown: (event: React.KeyboardEvent) => event.stopPropagation(),
                        placeholder: label,
                        className: "w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400",
                      };
                      return structured ? (
                        <label key={key} className="block text-[9px] font-bold uppercase text-gray-500">
                          {label}
                          <textarea {...commonProps} className={`${commonProps.className} mt-1 h-24 resize-y font-mono`} />
                        </label>
                      ) : (
                        <label key={key} className="block text-[9px] font-bold uppercase text-gray-500">
                          {label}
                          <input {...commonProps} type={templatePropSchema[key] === "number" ? "number" : "text"} className={`${commonProps.className} mt-1`} />
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-lg border border-indigo-400/15 bg-indigo-400/5 p-2.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    Intensidade / opacidade ({Math.round(previewMotionOpacity * 100)}%)
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={previewMotionOpacity}
                      onChange={(event) =>
                        setPreviewMotionOpacity(Number(event.target.value))
                      }
                      className="mt-2 w-full accent-indigo-500"
                    />
                  </label>
                  <p className="mt-1 text-[9px] text-gray-500">
                    Fundo transparente; o controle altera apenas a força visual do Motion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    addMotionTemplateToTimeline(
                      selectedTemplate.template_id,
                      playheadFrame
                    )
                  }
                  className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Adicionar no playhead atual
                </button>
                {selectedScene && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                      Entrada na cena (start_seconds)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={selectedScene.start_seconds}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        const sceneIndex = scenes.findIndex(
                          (scene) => scene.id === selectedScene.id
                        );
                        const sceneStartSeconds = scenes
                          .slice(0, Math.max(0, sceneIndex))
                          .reduce(
                            (total, scene) =>
                              total + Math.max(0.1, scene.duration_seconds || 5),
                            0
                          );
                        const motionClip = editorProject.tracks
                          .find((track) => track.id === "motion")
                          ?.clips.find(
                            (clip) =>
                              clip.id === `motion-scene-${selectedScene.id}` ||
                              clip.props?.sceneRef === selectedScene.scene_ref
                          );
                        if (motionClip) {
                          executeEditorCommand(
                            {
                              type: "MOVE_CLIP",
                              clipId: motionClip.id,
                              startFrame: secondsToFrames(
                                sceneStartSeconds + v,
                                editorProject.fps
                              ),
                            },
                            "Alterar entrada do Motion Template"
                          );
                        }
                        setScenes((prev) =>
                          prev.map((s) =>
                            s.id === selectedScene.id
                              ? { ...s, start_seconds: v }
                              : s
                          )
                        );
                        setSelectedScene((cur) =>
                          cur ? { ...cur, start_seconds: v } : cur
                        );
                      }}
                      className="w-full mt-2 px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    Paleta ({activeNiche})
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(nichePalette).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border border-white/20"
                          style={{ background: val }}
                        />
                        <span className="text-[10px] text-gray-400">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedScene && (
                  <button
                    type="button"
                    onClick={() =>
                      assignTemplateToScene(selectedTemplate, selectedScene)
                    }
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                  >
                    Aplicar à cena selecionada
                  </button>
                )}
                {!selectedScene && (
                  <p className="text-[10px] text-gray-500">
                    Selecione uma cena na timeline abaixo
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-500 text-center py-8">
                Selecione um template
              </p>
            )}
            <div className="border-t border-white/5 pt-3">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-gray-600">
                <span>Historico auditavel</span>
                <span>{editorProject.auditLog.length}</span>
              </div>
              <div className="mt-2 space-y-1">
                {editorProject.auditLog.slice(-5).reverse().map((entry) => (
                  <div key={entry.id} className="rounded bg-white/[0.025] px-2 py-1.5 text-[9px] text-gray-500">
                    <span className={entry.actor === "ai" ? "text-fuchsia-300" : "text-indigo-300"}>{entry.actor}</span>
                    {" · "}{entry.summary}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Timeline */}
      <div className="border-t border-white/5 bg-[#0a0a14] flex flex-col">
        <div className="hidden">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Timeline · {scenes.length} cenas
          </span>
          <span className="text-[10px] text-gray-600">
            {scenes
              .reduce((acc, s) => acc + (s.duration_seconds || 0), 0)
              .toFixed(1)}
            s total
          </span>
          <span className="text-[9px] text-gray-600 ml-2">
            solte template · arraste cenas para reordenar
          </span>
        </div>
        <div className="hidden">
          <div className="flex gap-1 h-full items-stretch min-w-max">
            {scenes.map((scene, i) => (
              <button
                type="button"
                key={scene.id}
                draggable
                onDragStart={(e) => {
                  // Prefer reordering scenes; template drag uses different mime
                  if (dragTemplateId) return;
                  setDragSceneId(scene.id);
                  e.dataTransfer.setData(
                    "application/x-lumiera-scene",
                    scene.id
                  );
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDragSceneId(null);
                  setDropSceneId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  const isTpl = e.dataTransfer.types.includes(
                    "application/x-lumiera-template"
                  );
                  e.dataTransfer.dropEffect = isTpl ? "copy" : "move";
                  setDropSceneId(scene.id);
                }}
                onDragLeave={() => {
                  setDropSceneId((cur) => (cur === scene.id ? null : cur));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const tplId = e.dataTransfer.getData(
                    "application/x-lumiera-template"
                  );
                  const scId = e.dataTransfer.getData(
                    "application/x-lumiera-scene"
                  );
                  if (tplId) {
                    assignTemplateIdToScene(tplId, scene.id);
                  } else if (scId) {
                    reorderScenes(scId, scene.id);
                  }
                  setDropSceneId(null);
                  setDragTemplateId(null);
                  setDragSceneId(null);
                }}
                onClick={() => {
                  setSelectedScene(scene);
                  if (scene.template_id) {
                    const motionClipId = `motion-scene-${scene.id}`;
                    setSelectedClipId(motionClipId);
                    const motionClip = findLumieraClip(
                      editorProject,
                      motionClipId
                    )?.clip;
                    if (motionClip) setPlayheadFrame(motionClip.startFrame);
                  } else {
                    setSelectedClipId(null);
                  }
                  if (scene.template_id) {
                    const t = templates.find(
                      (x) => x.template_id === scene.template_id
                    );
                    if (t) {
                      setSelectedTemplate(t);
                      setPreviewTemplate(t);
                    }
                  }
                  if (scene.props && typeof scene.props === "object") {
                    setPropDraft({
                      value: String(
                        (scene.props as any).value ??
                          (scene.props as any).valor ??
                          ""
                      ),
                      unit: String(
                        (scene.props as any).unit ??
                          (scene.props as any).unidade ??
                          ""
                      ),
                      label: String((scene.props as any).label ?? ""),
                      title: String(
                        (scene.props as any).title ??
                          (scene.props as any).text ??
                          (scene.props as any).label ??
                          ""
                      ),
                      subtitle: String((scene.props as any).subtitle ?? ""),
                      prefix: String((scene.props as any).prefix ?? ""),
                      suffix: String((scene.props as any).suffix ?? ""),
                    });
                  }
                }}
                className={`relative flex flex-col justify-between px-3 py-2 rounded-lg border text-left transition-all cursor-grab active:cursor-grabbing ${
                  selectedScene?.id === scene.id
                    ? "border-indigo-400/60 bg-indigo-500/10"
                    : dropSceneId === scene.id
                      ? "border-emerald-400/70 bg-emerald-500/15 ring-1 ring-emerald-400/40"
                      : dragSceneId === scene.id
                        ? "border-white/20 bg-white/10 opacity-60"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                }`}
                style={{
                  width: Math.max(100, (scene.duration_seconds || 5) * 30),
                }}
              >
                <div className="text-[10px] text-gray-400 truncate font-medium flex items-center gap-1">
                  <GripVertical className="w-3 h-3 opacity-40 shrink-0" />#
                  {i + 1} {scene.narration.slice(0, 40) || "Sem narração"}
                </div>
                <div className="flex items-center gap-1.5">
                  {scene.template_id ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold truncate max-w-[80px]">
                      {scene.template_name}
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
                      solte template
                    </span>
                  )}
                  <span className="text-[9px] text-gray-600">
                    @{scene.start_seconds}s
                  </span>
                </div>
                {scene.palette && (
                  <div className="absolute top-1 right-1 flex gap-0.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: scene.palette.primary }}
                    />
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: scene.palette.accent }}
                    />
                  </div>
                )}
              </button>
            ))}
            {scenes.length === 0 && (
              <div className="flex items-center justify-center w-full text-xs text-gray-600">
                {activeProject
                  ? "Projeto sem visual_prompts no storyboard"
                  : "Selecione um projeto para ver as cenas"}
              </div>
            )}
          </div>
        </div>
        <div
          className="flex-none border-t border-white/5"
          style={{ height: 60 + editorProject.tracks.length * 48 }}
        >
          <LumieraEditorTimeline
            project={editorProject}
            playheadFrame={playheadFrame}
            selectedClipId={selectedClipId}
            onPlayheadChange={setPlayheadFrame}
            onSelectClip={(clipId) => {
              setSelectedClipId(clipId);
              const clip = findLumieraClip(editorProject, clipId)?.clip;
              if (clip) setPlayheadFrame(clip.startFrame);
            }}
            onCommand={executeEditorCommand}
            onAddMotionTemplate={addMotionTemplateToTimeline}
          />
        </div>
      </div>
    </div>
    <StockSearchModal
      open={stockModal.open}
      onClose={() => setStockModal((current) => ({ ...current, open: false }))}
      query={stockQuery}
      mediaType={stockModal.mediaType}
      aspectRatio={editorProject.height > editorProject.width ? "9:16" : "16:9"}
      projectName={activeProject || ""}
      onSelect={addStockAsset}
    />
    </>
  );
}
