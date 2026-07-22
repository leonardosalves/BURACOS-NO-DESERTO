/**
 * NicheTemplatePalette — Shotcraft motion templates for Timeline / Ask Lumiera.
 * Studio TSX path removed (use Editor do Lumiera for full catalog).
 */
import React, { useEffect, useMemo, useState } from "react";
import { Layers } from "lucide-react";
import type { NichePackInfo } from "./timelineStudioAskTypes";

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

type ShotcraftCatalogItem = {
  template_id: string;
  name: string;
  category: string;
  energy?: string;
  duration_seconds?: number;
  approved?: boolean;
  default_props?: Record<string, unknown> | null;
};

function formatShort(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function NicheTemplatePalette({
  activePackId,
  packs,
  playhead,
  catalogNiche,
  getProjectUrl,
  onInsertTemplate,
  onSelectPack,
}: Props) {
  const [shotcraftTemplates, setShotcraftTemplates] = useState<
    ShotcraftCatalogItem[]
  >([]);
  const [shotcraftCategory, setShotcraftCategory] = useState<string | null>(
    null
  );
  const [selectedShotcraftId, setSelectedShotcraftId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const activePack =
    packs.find((p) => p.id === activePackId) || packs[0] || null;

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(getProjectUrl("/api/templates?limit=200"));
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        let list: ShotcraftCatalogItem[] = Array.isArray(data.templates)
          ? data.templates
          : [];
        if (list.length === 0) {
          await fetch(getProjectUrl("/api/templates/seed"), { method: "POST" });
          const res2 = await fetch(getProjectUrl("/api/templates?limit=200"));
          const data2 = await res2.json();
          if (alive && Array.isArray(data2.templates)) list = data2.templates;
        }
        if (alive) setShotcraftTemplates(list);
      } catch {
        if (alive) setShotcraftTemplates([]);
      } finally {
        if (alive) setLoading(false);
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
    return list.slice(0, 100);
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

  if (!activePack) return null;

  return (
    <div className="border-t border-zinc-800/60 bg-zinc-900/30 px-2 py-2 space-y-2">
      <div className="flex items-center gap-1.5">
        <Layers className="w-3 h-3 text-amber-400 shrink-0" />
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

      {catalogNiche ? (
        <p className="text-[8px] text-zinc-500 leading-relaxed">
          Nicho: <span className="text-zinc-300">{catalogNiche}</span>
          {" · "}
          Shotcraft Motion
          {loading ? " · carregando…" : ` · ${shotcraftTemplates.length} cards`}
        </p>
      ) : null}

      <div className="border-t border-zinc-800/60 pt-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
            Shotcraft Motion
          </span>
          <span className="text-[8px] text-zinc-600">
            @{formatShort(playhead)}
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

        <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
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
          {!loading && !visibleShotcraft.length ? (
            <p className="text-[8px] text-zinc-600 px-1">
              Nenhum template. Abra o Editor do Lumiera para seed.
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
          Inserir no playhead · {formatShort(playhead)}
        </button>
        <p className="text-[8px] text-zinc-600 leading-relaxed">
          Overlay video-shotcraft · Editor do Lumiera para edição completa
        </p>
      </div>
    </div>
  );
}
