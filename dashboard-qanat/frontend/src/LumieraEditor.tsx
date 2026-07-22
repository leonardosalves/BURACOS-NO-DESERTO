/**
 * LumieraEditor.tsx — Editor do Lumiera
 * Video editor page inspired by reactvideoeditor.com
 * Layout: left library | center preview | right properties | bottom timeline
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { ShotcraftLivePreview } from "./ShotcraftLivePreview";

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
  const data = await res.json();
  return data.ok ? data.templates : [];
}

async function fetchNiches(): Promise<NicheItem[]> {
  const res = await fetch("/api/templates/niches/list");
  const data = await res.json();
  return data.ok ? data.niches : [];
}

async function fetchCategories(): Promise<CategoryItem[]> {
  const res = await fetch("/api/templates/categories/list");
  const data = await res.json();
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
}: {
  activeProject: string | null;
  projectNiche: string;
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
  const [propDraft, setPropDraft] = useState({
    value: "",
    unit: "",
    label: "",
    prefix: "",
    suffix: "",
  });
  const [dragTemplateId, setDragTemplateId] = useState<string | null>(null);
  const [dragSceneId, setDragSceneId] = useState<string | null>(null);
  const [dropSceneId, setDropSceneId] = useState<string | null>(null);

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
      const data = await res.json();
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
    return {
      ...defaults,
      ...base,
      ...(propDraft.value
        ? { value: Number(propDraft.value) || propDraft.value }
        : {}),
      ...(propDraft.unit ? { unit: propDraft.unit } : {}),
      ...(propDraft.label
        ? { label: propDraft.label, title: propDraft.label }
        : {}),
      ...(propDraft.prefix ? { prefix: propDraft.prefix } : {}),
      ...(propDraft.suffix ? { suffix: propDraft.suffix } : {}),
    };
  }, [selectedScene, propDraft, previewTemplate]);

  /* Assign template to scene */
  const applyDefaultPropsToDraft = useCallback((template: TemplateItem) => {
    const d =
      template.default_props && typeof template.default_props === "object"
        ? template.default_props
        : {};
    setPropDraft({
      value: String((d as any).value ?? (d as any).valor ?? ""),
      unit: String((d as any).unit ?? (d as any).unidade ?? ""),
      label: String((d as any).label ?? (d as any).title ?? ""),
      prefix: String((d as any).prefix ?? ""),
      suffix: String((d as any).suffix ?? ""),
    });
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

    setSaving(true);
    try {
      // Build plan from current scenes
      const plan = {
        niche: activeNiche,
        format: "16:9",
        palette: nichePalette,
        cenas: scenes.map((s) => ({
          scene_ref: s.scene_ref,
          motion_shot: s.template_id
            ? {
                templateId: s.template_id,
                style: s.style,
                props: s.props || {},
                palette: s.palette || nichePalette,
                start_seconds: s.start_seconds,
                duration_seconds: 4,
              }
            : null,
        })),
      };

      // Overrides only for scenes with templates (or explicit null)
      const overrides = {
        cenas: Object.fromEntries(
          scenes.map((s) => [
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
        const reordered = scenes.map((local, i) => {
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
                local.duration_seconds && local.duration_seconds <= 8
                  ? local.duration_seconds
                  : 4,
              palette: local.palette || nichePalette,
              props: local.props || vp.motion_shot?.props || {},
            },
          };
        });
        // Keep any prompts not present in local scenes (appended)
        for (const [key, vp] of byRef) {
          if (!scenes.some((s) => s.scene_ref === key)) {
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

      toast.success("Motion plan salvo no storyboard!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  }, [activeProject, storyboard, scenes, nichePalette, activeNiche]);

  const applyPaletteToAll = useCallback(() => {
    setScenes((prev) =>
      prev.map((s) => (s.template_id ? { ...s, palette: nichePalette } : s))
    );
    toast.success(
      `Paleta ${activeNiche} aplicada a todas as cenas com template`
    );
  }, [nichePalette, activeNiche]);

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
    <div className="flex flex-col h-[calc(100vh-140px)] gap-0 overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a12]">
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
          onChange={(e) => setActiveNiche(e.target.value)}
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
          onClick={() => void saveMotionPlan()}
          disabled={saving || !activeProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Salvando…" : "Salvar Motion Plan"}
        </button>
      </div>

      {/* Main content: 3 panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Template Library */}
        <div className="w-72 border-r border-white/5 flex flex-col overflow-hidden bg-[#0c0c16]">
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
              Arraste um template para a cena na timeline
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
        </div>

        {/* CENTER: Live Remotion Preview */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#080810] relative p-4 gap-3">
          {previewTemplate ? (
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
            <div className="text-center text-gray-500">
              <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                Selecione um template para preview ao vivo
              </p>
              <p className="text-[11px] mt-1 text-gray-600">
                Remotion Player · demos Shotcraft reais
              </p>
            </div>
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
            {selectedTemplate ? (
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
                    {(
                      [
                        ["value", "Valor"],
                        ["unit", "Unidade"],
                        ["label", "Label"],
                        ["prefix", "Prefixo"],
                        ["suffix", "Sufixo"],
                      ] as const
                    ).map(([key, label]) => (
                      <input
                        key={key}
                        value={propDraft[key]}
                        onChange={(e) =>
                          setPropDraft((d) => ({
                            ...d,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder={label}
                        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    ))}
                  </div>
                </div>
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
          </div>
        </div>
      </div>

      {/* BOTTOM: Timeline */}
      <div className="h-40 border-t border-white/5 bg-[#0a0a14] flex flex-col">
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-white/5">
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
        <div className="flex-1 overflow-x-auto px-4 py-2">
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
      </div>
    </div>
  );
}
