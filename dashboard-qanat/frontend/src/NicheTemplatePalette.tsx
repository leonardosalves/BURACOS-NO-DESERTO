import React, { useEffect, useMemo, useState } from "react";
import { Layers } from "lucide-react";
import type { NichePackInfo } from "./timelineStudioAskTypes";
import {
  syncRemotionTemplateCatalog,
  type CatalogTemplate,
} from "./remotionTemplateStudioApi";
import { normalizeNicheLabel } from "@lumiera/shared/remotionTemplateNiches.js";
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
  const [selectedCreatedId, setSelectedCreatedId] = useState("");
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

  const selectedCreatedTemplate =
    studioReadyTemplates.find((tpl) => tpl.id === selectedCreatedId) ||
    studioReadyTemplates[0] ||
    null;

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

  useEffect(() => {
    if (
      selectedCreatedId &&
      !studioReadyTemplates.some((tpl) => tpl.id === selectedCreatedId)
    ) {
      setSelectedCreatedId(studioReadyTemplates[0]?.id || "");
    }
  }, [selectedCreatedId, studioReadyTemplates]);

  function insertStudioTemplate(tpl: CatalogTemplate) {
    const motionId = String(tpl.motion_template_id || "counter");
    const sourceCode = resolveStudioSourceCode(tpl, aspectRatio);
    if (!sourceCode) return;
    onInsertTemplate(motionId, {
      label: tpl.name,
      props: {
        template_studio_id: tpl.id,
        template_studio_name: tpl.name,
        template_studio_category: tpl.category,
        template_studio_subcategory: tpl.subcategory,
        template_studio_motion_template_id: motionId,
        studio_source_code: sourceCode,
        motion_scene: true,
        media_mode: "remotion",
        aspect_ratio: aspectRatio,
      },
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

      {niche ? (
        <p className="text-[8px] text-zinc-500 leading-relaxed">
          Catalogo Studio: <span className="text-zinc-300">{niche}</span>
          {studioReadyTemplates.length
            ? ` · ${studioReadyTemplates.length} com TSX`
            : " · sem templates prontos no navegador/servidor"}
        </p>
      ) : null}

      <div className="border-t border-zinc-800/60 pt-2 space-y-1.5">
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

        {studioReadyTemplates.length ? (
          <>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {studioReadyTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => insertStudioTemplate(tpl)}
                  className="text-[9px] px-2 py-1 rounded-full border border-violet-500/35 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 transition cursor-pointer"
                  title={`Inserir "${tpl.name}" em ${formatShort(playhead)}`}
                >
                  + {shortTemplateName(tpl.name)}
                </button>
              ))}
            </div>

            <div className="flex gap-1">
              <select
                value={selectedCreatedTemplate?.id || ""}
                onChange={(e) => setSelectedCreatedId(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[9px] text-zinc-300"
                title="Escolher template Studio com TSX salvo"
              >
                {studioReadyTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {shortTemplateName(tpl.name)} · {tpl.category}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedCreatedTemplate}
                onClick={() => {
                  if (selectedCreatedTemplate) {
                    insertStudioTemplate(selectedCreatedTemplate);
                  }
                }}
                className="shrink-0 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[9px] font-bold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-40"
                title={`Inserir em ${formatShort(playhead)}`}
              >
                + Usar
              </button>
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-2 py-1.5 text-[9px] leading-relaxed text-zinc-500">
            Nenhum template aprovado com TSX neste nicho. No Template Studio,
            abra o draft, confirme o codigo Remotion e clique em Aprovar.
          </p>
        )}
      </div>
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
