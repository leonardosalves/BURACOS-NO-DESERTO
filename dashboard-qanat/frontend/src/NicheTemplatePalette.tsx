import React, { useEffect, useMemo, useState } from "react";
import { Layers } from "lucide-react";
import type { NichePackInfo } from "./timelineStudioAskTypes";
import {
  syncRemotionTemplateCatalog,
  type CatalogTemplate,
} from "./remotionTemplateStudioApi";
import { normalizeNicheLabel } from "@lumiera/shared/remotionTemplateNiches.js";
import {
  countTemplatesInCategory,
  filterTemplatesByCategorySubcategory,
  loadTemplateCategoryCatalog,
  templateMatchesPaletteCategory,
  templateMatchesPaletteSubcategory,
  type TemplateCategoryDefinition,
} from "./remotionTemplateStudioCategories";
import { GEO_PIP_MEDIA_WINDOW_9x16 } from "./geoPipPreview";
import {
  hasRunnableStudioSource,
  isStudioTemplateOrchestrationReady,
  mapStudioTemplateToMotionId,
} from "@lumiera/shared/remotionTemplateStudioCatalog.js";

const TEMPLATE_STORAGE_KEY = "lumiera.remotionTemplateStudio.templates.v1";

type Props = {
  activePackId: string;
  packs: NichePackInfo[];
  playhead: number;
  catalogNiche?: string;
  aspectRatio?: string;
  getProjectUrl: (path: string) => string;
  onInsertTemplate: (
    templateId: string,
    options?: { label?: string; props?: Record<string, unknown> }
  ) => void;
  onSelectPack: (packId: string) => void;
};

type LocalStudioTemplate = {
  id: string;
  name?: string;
  category?: string;
  subcategory?: string;
  niche?: string;
  status?: string;
  description?: string;
  dataSlots?: string[];
  sourceCode?: { short?: string; long?: string };
  shortPreview?: string;
  longPreview?: string;
};

type ShotcraftCatalogItem = {
  template_id: string;
  name: string;
  category: string;
  energy?: string;
  duration_seconds?: number;
  approved?: boolean;
  default_props?: Record<string, unknown> | null;
};

type PaletteMode = "shotcraft" | "studio";

function readLocalStudioTemplates(): LocalStudioTemplate[] {
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function matchesStudioNiche(templateNiche = "", activeNiche = "") {
  const tpl = String(templateNiche || "")
    .trim()
    .toLowerCase();
  const active = String(activeNiche || "")
    .trim()
    .toLowerCase();
  if (!active) return true;
  if (!tpl) return true;
  return tpl === active;
}

function resolveStudioSourceCode(
  tpl: CatalogTemplate,
  aspectRatio = "16:9"
): string {
  const src = tpl.sourceCode;
  if (!src) return "";
  const vertical = aspectRatio === "9:16";
  const primary = vertical ? src.short : src.long;
  const fallback = vertical ? src.long : src.short;
  return String(primary || fallback || "").trim();
}

function localTemplateToCatalog(
  tpl: LocalStudioTemplate,
  niche: string
): CatalogTemplate | null {
  const sourceCode = tpl.sourceCode
    ? {
        short: String(tpl.sourceCode.short || ""),
        long: String(tpl.sourceCode.long || ""),
      }
    : null;
  const motionTemplateId = mapStudioTemplateToMotionId(tpl);
  const catalogTpl: CatalogTemplate = {
    id: String(tpl.id || ""),
    name: String(tpl.name || ""),
    category: String(tpl.category || ""),
    subcategory: String(tpl.subcategory || ""),
    niche: String(tpl.niche || niche),
    status: tpl.status === "approved" ? "approved" : "draft",
    description: String(tpl.description || ""),
    dataSlots: Array.isArray(tpl.dataSlots) ? tpl.dataSlots.map(String) : [],
    motion_template_id: motionTemplateId,
    orchestration_ready: isStudioTemplateOrchestrationReady({
      ...tpl,
      sourceCode,
    }),
    shortPreview: tpl.shortPreview ?? null,
    longPreview: tpl.longPreview ?? null,
    sourceCode,
    has_source_code: hasRunnableStudioSource(sourceCode || undefined),
  };
  return catalogTpl;
}

function loadLocalStudioReady(niche: string): CatalogTemplate[] {
  return readLocalStudioTemplates()
    .filter((tpl) => matchesStudioNiche(tpl.niche, niche))
    .map((tpl) => localTemplateToCatalog(tpl, niche))
    .filter((tpl): tpl is CatalogTemplate =>
      Boolean(
        tpl &&
        tpl.status === "approved" &&
        tpl.has_source_code &&
        tpl.orchestration_ready &&
        tpl.motion_template_id
      )
    );
}

function mergeCatalogTemplates(
  fromApi: CatalogTemplate[],
  fromLocal: CatalogTemplate[]
): CatalogTemplate[] {
  const byId = new Map<string, CatalogTemplate>();
  for (const tpl of [...fromApi, ...fromLocal]) {
    const prev = byId.get(tpl.id);
    const sourceCode = tpl.sourceCode || prev?.sourceCode || null;
    const merged: CatalogTemplate = {
      ...(prev || {}),
      ...tpl,
      sourceCode,
      has_source_code: hasRunnableStudioSource(sourceCode || undefined),
      orchestration_ready: Boolean(
        (tpl.orchestration_ready || prev?.orchestration_ready) &&
        hasRunnableStudioSource(sourceCode || undefined) &&
        (tpl.motion_template_id || prev?.motion_template_id)
      ),
    };
    byId.set(tpl.id, merged);
  }
  return [...byId.values()];
}

function toSyncPayload(templates: CatalogTemplate[], niche: string) {
  return templates.map((tpl) => {
    const sourceCode = tpl.sourceCode;
    const short = String(sourceCode?.short || "").trim();
    const long = String(sourceCode?.long || "").trim();
    return {
      id: tpl.id,
      name: tpl.name,
      category: tpl.category,
      subcategory: tpl.subcategory,
      niche: tpl.niche || niche,
      status: "approved" as const,
      description: tpl.description,
      dataSlots: tpl.dataSlots,
      shortPreview: tpl.shortPreview,
      longPreview: tpl.longPreview,
      ...(short || long ? { sourceCode: { short, long } } : {}),
    };
  });
}

export function NicheTemplatePalette({
  activePackId,
  packs,
  playhead,
  catalogNiche,
  aspectRatio = "16:9",
  getProjectUrl,
  onInsertTemplate,
  onSelectPack,
}: Props) {
  const [createdTemplates, setCreatedTemplates] = useState<CatalogTemplate[]>(
    []
  );
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("shotcraft");
  const [shotcraftTemplates, setShotcraftTemplates] = useState<
    ShotcraftCatalogItem[]
  >([]);
  const [shotcraftCategory, setShotcraftCategory] = useState<string | null>(
    null
  );
  const [selectedShotcraftId, setSelectedShotcraftId] = useState<string | null>(
    null
  );
  const [categoryId, setCategoryId] = useState(() =>
    aspectRatio === "9:16" ? "maps" : "chart-data"
  );
  const [subcategory, setSubcategory] = useState(() =>
    aspectRatio === "9:16" ? "PIP mapa" : "Bar chart"
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const activePack =
    packs.find((p) => p.id === activePackId) || packs[0] || null;
  const niche =
    normalizeNicheLabel(catalogNiche || "") ||
    String(catalogNiche || "").trim();

  const studioReadyTemplates = useMemo(
    () =>
      createdTemplates
        .filter(
          (tpl) =>
            tpl.status === "approved" &&
            tpl.has_source_code &&
            tpl.orchestration_ready &&
            tpl.motion_template_id
        )
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""))
        ),
    [createdTemplates]
  );

  const categories = useMemo(
    () => loadTemplateCategoryCatalog(studioReadyTemplates),
    [studioReadyTemplates]
  );

  const currentCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) || categories[0] || null,
    [categories, categoryId]
  );

  const subcategories = currentCategory?.subcategories || [];

  const categoryTemplates = useMemo(
    () =>
      studioReadyTemplates.filter((tpl) =>
        templateMatchesPaletteCategory(tpl, currentCategory?.id || "")
      ),
    [studioReadyTemplates, currentCategory?.id]
  );

  const visibleTemplates = useMemo(
    () =>
      filterTemplatesByCategorySubcategory(
        studioReadyTemplates,
        currentCategory?.id || "",
        subcategory
      ),
    [studioReadyTemplates, currentCategory?.id, subcategory]
  );

  const showingCategoryFallback = useMemo(() => {
    if (!subcategory || !categoryTemplates.length) return false;
    return !categoryTemplates.some((tpl) =>
      templateMatchesPaletteSubcategory(
        tpl,
        currentCategory?.id || "",
        subcategory
      )
    );
  }, [categoryTemplates, subcategory, currentCategory?.id]);

  useEffect(() => {
    if (!categories.length) return;
    if (!categories.some((c) => c.id === categoryId)) {
      const first = categories[0];
      setCategoryId(first.id);
      setSubcategory(first.subcategories[0] || "");
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (aspectRatio !== "9:16" || !categories.length) return;
    const maps = categories.find((c) => c.id === "maps");
    if (!maps) return;
    setCategoryId("maps");
    if (maps.subcategories.includes("PIP mapa")) {
      setSubcategory("PIP mapa");
    } else if (maps.subcategories[0]) {
      setSubcategory(maps.subcategories[0]);
    }
  }, [aspectRatio, categories]);

  useEffect(() => {
    if (!subcategories.length) return;
    if (!subcategories.includes(subcategory)) {
      setSubcategory(subcategories[0] || "");
    }
  }, [subcategories, subcategory]);

  const selectedTemplate = useMemo(
    () => visibleTemplates.find((tpl) => tpl.id === selectedTemplateId) || null,
    [visibleTemplates, selectedTemplateId]
  );

  useEffect(() => {
    if (!visibleTemplates.length) {
      setSelectedTemplateId(null);
      return;
    }
    if (!visibleTemplates.some((tpl) => tpl.id === selectedTemplateId)) {
      setSelectedTemplateId(visibleTemplates[0].id);
    }
  }, [visibleTemplates, selectedTemplateId]);

  /* Shotcraft catalog (PostgreSQL /api/templates) */
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(getProjectUrl("/api/templates?limit=200"));
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        const list = Array.isArray(data.templates) ? data.templates : [];
        if (list.length === 0) {
          // seed once if empty
          await fetch(getProjectUrl("/api/templates/seed"), { method: "POST" });
          const res2 = await fetch(getProjectUrl("/api/templates?limit=200"));
          const data2 = await res2.json();
          if (alive && Array.isArray(data2.templates)) {
            setShotcraftTemplates(data2.templates);
          }
        } else {
          setShotcraftTemplates(list);
        }
      } catch {
        if (alive) setShotcraftTemplates([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [getProjectUrl]);

  const shotcraftCategories = useMemo(() => {
    const set = new Set<string>();
    for (const t of shotcraftTemplates) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set).sort();
  }, [shotcraftTemplates]);

  const visibleShotcraft = useMemo(() => {
    let list = shotcraftTemplates;
    if (shotcraftCategory) {
      list = list.filter((t) => t.category === shotcraftCategory);
    }
    return list.slice(0, 80);
  }, [shotcraftTemplates, shotcraftCategory]);

  const selectedShotcraft = useMemo(
    () =>
      visibleShotcraft.find((t) => t.template_id === selectedShotcraftId) ||
      null,
    [visibleShotcraft, selectedShotcraftId]
  );

  useEffect(() => {
    if (!visibleShotcraft.length) {
      setSelectedShotcraftId(null);
      return;
    }
    if (!visibleShotcraft.some((t) => t.template_id === selectedShotcraftId)) {
      setSelectedShotcraftId(visibleShotcraft[0].template_id);
    }
  }, [visibleShotcraft, selectedShotcraftId]);

  function insertShotcraftTemplate(tpl: ShotcraftCatalogItem) {
    const shotProps =
      tpl.default_props && typeof tpl.default_props === "object"
        ? { ...tpl.default_props }
        : {};
    onInsertTemplate(tpl.template_id, {
      label: tpl.name || tpl.template_id,
      props: {
        shotcraft: true,
        shotcraft_template_id: tpl.template_id,
        template_name: tpl.name,
        duration_seconds: tpl.duration_seconds || 4,
        shot_props: shotProps,
        motion_shot: {
          templateId: tpl.template_id,
          duration_seconds: tpl.duration_seconds || 4,
          start_seconds: 0,
          props: shotProps,
        },
      },
    });
  }

  useEffect(() => {
    if (!niche) {
      setCreatedTemplates([]);
      return;
    }

    const localReady = loadLocalStudioReady(niche);
    setCreatedTemplates(localReady);

    let alive = true;
    void (async () => {
      try {
        const res = await fetch(
          getProjectUrl(
            `/api/ai/template-studio/catalog?niche=${encodeURIComponent(niche)}`
          )
        );
        const fromApi: CatalogTemplate[] = [];
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.studio_ready)) {
            fromApi.push(...(data.studio_ready as CatalogTemplate[]));
          } else if (Array.isArray(data.orchestration_ready)) {
            fromApi.push(...(data.orchestration_ready as CatalogTemplate[]));
          }
        }

        const merged = mergeCatalogTemplates(
          fromApi,
          loadLocalStudioReady(niche)
        );
        if (!alive) return;
        setCreatedTemplates(merged);

        if (merged.length) {
          void syncRemotionTemplateCatalog({
            niche,
            templates: toSyncPayload(merged, niche),
          });
        }
      } catch {
        if (alive) setCreatedTemplates(loadLocalStudioReady(niche));
      }
    })();

    return () => {
      alive = false;
    };
  }, [getProjectUrl, niche]);

  function isPipGeoStudioTemplate(tpl: CatalogTemplate, motionId: string) {
    if (motionId === "location-intro" || motionId === "geo-map") return true;
    const sub = String(tpl.subcategory || "").toLowerCase();
    const cat = String(tpl.category || "").toLowerCase();
    return cat === "image-media" && /picture|pip/.test(sub);
  }

  function insertStudioTemplate(tpl: CatalogTemplate) {
    const motionId = String(tpl.motion_template_id || "counter");
    const sourceCode = resolveStudioSourceCode(tpl, aspectRatio);
    if (!sourceCode) return;
    const props: Record<string, unknown> = {
      template_studio_id: tpl.id,
      template_studio_name: tpl.name,
      template_studio_category: tpl.category,
      template_studio_subcategory: tpl.subcategory,
      template_studio_motion_template_id: motionId,
      template_studio_data_slots: Array.isArray(tpl.dataSlots)
        ? tpl.dataSlots
        : [],
      studio_source_code: sourceCode,
      motion_scene: true,
      media_mode: "remotion",
      aspect_ratio: aspectRatio,
    };
    if (aspectRatio === "9:16" && isPipGeoStudioTemplate(tpl, motionId)) {
      props.presentation = "pip";
      props.layout = "pip";
      props.geo_pip_composite = true;
      props.geo_pip_mode = "image-media-pip";
      props.geo_pip_window = GEO_PIP_MEDIA_WINDOW_9x16;
    }
    onInsertTemplate(motionId, {
      label: tpl.name,
      props,
    });
  }

  if (!activePack) return null;

  return (
    <div className="border-t border-zinc-800/60 bg-zinc-900/30 px-2 py-2 space-y-2">
      <div className="flex items-center gap-1.5">
        <Layers className="w-3 h-3 text-emerald-400 shrink-0" />
        <select
          value={activePackId}
          onChange={(e) => onSelectPack(e.target.value)}
          className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-300 rounded-lg px-2 py-1 cursor-pointer"
          title="Pacote visual (estilo de encaixe da IA)"
        >
          {packs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPaletteMode("shotcraft")}
          className={`flex-1 text-[9px] font-bold py-1 rounded-lg border transition cursor-pointer ${
            paletteMode === "shotcraft"
              ? "border-amber-400/50 bg-amber-500/15 text-amber-100"
              : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:border-zinc-700"
          }`}
        >
          Shotcraft
        </button>
        <button
          type="button"
          onClick={() => setPaletteMode("studio")}
          className={`text-[8px] font-semibold py-1 px-2 rounded-lg border transition cursor-pointer ${
            paletteMode === "studio"
              ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
              : "border-zinc-800/80 bg-transparent text-zinc-600 hover:text-zinc-400"
          }`}
          title="Legado: templates TSX do Template Studio (em depreciação)"
        >
          TSX†
        </button>
      </div>

      {paletteMode === "shotcraft" ? (
        <div className="border-t border-zinc-800/60 pt-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
              Shotcraft Motion
            </span>
            <span className="text-[8px] text-zinc-600">
              {shotcraftTemplates.length
                ? `${shotcraftTemplates.length} cards`
                : "vazio"}
            </span>
          </div>
          {shotcraftCategories.length ? (
            <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
              <button
                type="button"
                onClick={() => setShotcraftCategory(null)}
                className={`text-[9px] px-2 py-1 rounded-full border transition cursor-pointer ${
                  !shotcraftCategory
                    ? "border-amber-400/50 bg-amber-400/12 text-amber-100"
                    : "border-zinc-800 bg-zinc-950/70 text-zinc-400"
                }`}
              >
                Todos
              </button>
              {shotcraftCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setShotcraftCategory(cat)}
                  className={`text-[9px] px-2 py-1 rounded-full border transition cursor-pointer ${
                    shotcraftCategory === cat
                      ? "border-amber-400/50 bg-amber-400/12 text-amber-100"
                      : "border-zinc-800 bg-zinc-950/70 text-zinc-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : null}
          <div className="max-h-28 overflow-y-auto space-y-1 pr-0.5">
            {visibleShotcraft.map((tpl) => {
              const active = tpl.template_id === selectedShotcraftId;
              return (
                <button
                  key={tpl.template_id}
                  type="button"
                  onClick={() => setSelectedShotcraftId(tpl.template_id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left transition cursor-pointer ${
                    active
                      ? "border-amber-400/60 bg-amber-500/12 text-amber-50"
                      : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
                  }`}
                  title={tpl.template_id}
                >
                  <span className="text-[9px] font-medium truncate">
                    {tpl.name || tpl.template_id}
                  </span>
                  <span className="text-[8px] text-zinc-600 shrink-0 ml-2">
                    {tpl.category}
                  </span>
                </button>
              );
            })}
            {!visibleShotcraft.length ? (
              <p className="text-[8px] text-zinc-600 px-1">
                Nenhum template Shotcraft. Abra o Editor do Lumiera para seed.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={!selectedShotcraft}
            onClick={() =>
              selectedShotcraft && insertShotcraftTemplate(selectedShotcraft)
            }
            className="w-full text-[10px] font-bold py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 disabled:opacity-40 text-white transition cursor-pointer"
          >
            Inserir Shotcraft no playhead
          </button>
          <p className="text-[8px] text-zinc-600 leading-relaxed">
            Overlay motion (video-shotcraft) · mesmo pipeline do Editor do
            Lumiera
          </p>
        </div>
      ) : null}

      {paletteMode === "studio" ? (
        <div className="border-t border-zinc-800/60 pt-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
              Templates Studio
            </span>
            <span className="text-[8px] text-zinc-600">
              {studioReadyTemplates.length
                ? `${studioReadyTemplates.length} prontos`
                : "nenhum aprovado com TSX"}
            </span>
          </div>

          {niche ? (
            <p className="text-[8px] text-zinc-500 leading-relaxed">
              Catalogo Studio: <span className="text-zinc-300">{niche}</span>
              {studioReadyTemplates.length
                ? ` · ${studioReadyTemplates.length} com TSX`
                : " · sem templates prontos no navegador/servidor"}
            </p>
          ) : null}

          {studioReadyTemplates.length ? (
            <>
              <div className="space-y-1">
                <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                  Categorias
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-0.5">
                  {categories.map((cat: TemplateCategoryDefinition) => {
                    const count = countTemplatesInCategory(
                      studioReadyTemplates,
                      cat.id
                    );
                    const active = cat.id === currentCategory?.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(cat.id);
                          setSubcategory(cat.subcategories[0] || "");
                        }}
                        className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left transition cursor-pointer ${
                          active
                            ? "border-blue-400/60 bg-blue-500/12 text-white"
                            : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <span className="text-[9px] font-bold truncate">
                          {cat.label}
                        </span>
                        <span className="text-[8px] text-zinc-600 shrink-0 ml-2">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {subcategories.length ? (
                <div className="space-y-1">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                    {currentCategory?.label || "Subcategorias"}
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {subcategories.map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSubcategory(sub)}
                        className={`text-[9px] px-2 py-1 rounded-full border transition cursor-pointer ${
                          subcategory === sub
                            ? "border-amber-400/50 bg-amber-400/12 text-amber-100"
                            : "border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {showingCategoryFallback ? (
                <p className="text-[8px] text-amber-200/80 leading-relaxed">
                  Nenhum template em &quot;{subcategory}&quot;. Mostrando os{" "}
                  {categoryTemplates.length} da categoria{" "}
                  {currentCategory?.label}.
                </p>
              ) : null}

              <div className="space-y-1">
                <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                  Templates
                </p>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-0.5">
                  {visibleTemplates.map((tpl) => {
                    const active = tpl.id === selectedTemplateId;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left transition cursor-pointer ${
                          active
                            ? "border-violet-400/60 bg-violet-500/15 text-violet-100"
                            : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
                        }`}
                        title={tpl.name}
                      >
                        <span className="text-[9px] font-medium truncate">
                          {shortTemplateName(tpl.name)}
                        </span>
                        {active ? (
                          <span className="text-[8px] text-violet-300 shrink-0 ml-2">
                            selecionado
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={!selectedTemplate}
                onClick={() =>
                  selectedTemplate && insertStudioTemplate(selectedTemplate)
                }
                className="w-full rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-2 text-[9px] font-bold text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                title={
                  selectedTemplate
                    ? `Adicionar "${selectedTemplate.name}" em ${formatShort(playhead)}`
                    : "Selecione um template"
                }
              >
                Adicionar na timeline · {formatShort(playhead)}
              </button>
            </>
          ) : (
            <p className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-2 py-1.5 text-[9px] leading-relaxed text-zinc-500">
              Nenhum template aprovado com TSX neste nicho. Prefira a aba
              Shotcraft (video-shotcraft) ou o Editor do Lumiera.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function shortTemplateName(name = ""): string {
  return String(name || "Template")
    .replace(/^Engenharia\s+/i, "")
    .replace(/\s+Draft$/i, "")
    .slice(0, 42);
}

function formatShort(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
