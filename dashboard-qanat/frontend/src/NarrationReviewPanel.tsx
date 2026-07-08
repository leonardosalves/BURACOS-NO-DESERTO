import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Check, Mic, Sparkles, Layers3 } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import {
  fetchRemotionTemplateCatalog,
  syncRemotionTemplateCatalog,
  type CatalogTemplate,
} from "./remotionTemplateStudioApi";

type BlockPhrase = { block: number; phrase: string };

const TEMPLATE_STORAGE_KEY = "lumiera.remotionTemplateStudio.templates.v1";

type Props = {
  narrativeScript: string;
  narrativeScriptTagged: string;
  strategyHook?: string;
  strategyTitle?: string;
  blockPhrases?: BlockPhrase[];
  blockScript?: string;
  notebooklmEnriched?: boolean;
  notebooklmImproving?: boolean;
  notebooklmAvailable?: boolean;
  loading: boolean;
  loadingMode: "narration" | "full" | "idle";
  niche?: string;
  motionTemplatePackEnabled?: boolean;
  motionTemplateNiche?: string;
  motionTemplateIds?: string[];
  onMotionTemplatePackEnabledChange?: (enabled: boolean) => void;
  onMotionTemplateNicheChange?: (niche: string) => void;
  onMotionTemplateIdsChange?: (ids: string[]) => void;
  onNarrativeChange: (value: string) => void;
  onRegenerate: () => void;
  onApprove: () => void;
  onNotebooklmImprove?: () => void;
};

function splitBlockParagraphs(blockScript?: string) {
  if (!blockScript?.trim()) return [];
  return blockScript
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function readLocalStudioTemplates() {
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function NarrationReviewPanel({
  narrativeScript,
  narrativeScriptTagged,
  strategyHook,
  strategyTitle,
  blockPhrases = [],
  blockScript,
  notebooklmEnriched,
  notebooklmImproving = false,
  notebooklmAvailable = false,
  loading,
  loadingMode,
  niche = "Engenharia",
  motionTemplatePackEnabled = false,
  motionTemplateNiche = "",
  motionTemplateIds = [],
  onMotionTemplatePackEnabledChange,
  onMotionTemplateNicheChange,
  onMotionTemplateIdsChange,
  onNarrativeChange,
  onRegenerate,
  onApprove,
  onNotebooklmImprove,
}: Props) {
  const [catalogTemplates, setCatalogTemplates] = useState<CatalogTemplate[]>(
    []
  );
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const effectiveNiche = (motionTemplateNiche || niche || "Engenharia").trim();
  const wordCount = narrativeScript.trim()
    ? narrativeScript.trim().split(/\s+/).length
    : 0;
  const paragraphs = useMemo(
    () => splitBlockParagraphs(blockScript),
    [blockScript]
  );
  const showBlocks = blockPhrases.length > 0 && paragraphs.length > 0;

  const approvedTemplates = useMemo(
    () => catalogTemplates.filter((tpl) => tpl.status === "approved"),
    [catalogTemplates]
  );

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError(null);

      const localTemplates = readLocalStudioTemplates()
        .filter((tpl: { niche?: string; status?: string }) => {
          const tplNiche = String(tpl?.niche || effectiveNiche).trim();
          return (
            !tplNiche || tplNiche.toLowerCase() === effectiveNiche.toLowerCase()
          );
        })
        .map((tpl: Record<string, unknown>) => ({
          id: String(tpl.id || ""),
          name: String(tpl.name || ""),
          category: String(tpl.category || ""),
          subcategory: String(tpl.subcategory || ""),
          niche: String(tpl.niche || effectiveNiche),
          status: tpl.status === "approved" ? "approved" : "draft",
          description: String(tpl.description || ""),
          dataSlots: Array.isArray(tpl.dataSlots)
            ? tpl.dataSlots.map(String)
            : [],
          shortPreview: (tpl.shortPreview as string) || null,
          longPreview: (tpl.longPreview as string) || null,
        }));

      if (localTemplates.length) {
        await syncRemotionTemplateCatalog({
          niche: effectiveNiche,
          templates: localTemplates,
        });
      }

      const catalog = await fetchRemotionTemplateCatalog(effectiveNiche);
      if (cancelled) return;

      if (!catalog.success && !catalog.templates.length) {
        setCatalogError(
          catalog.error || "Catálogo vazio — modo padrão de overlays."
        );
        setCatalogTemplates([]);
      } else {
        setCatalogTemplates(catalog.templates);
        if (!catalog.templates.length) {
          setCatalogError(
            "Nenhum template no nicho — será usado o modo antigo."
          );
        }
      }
      setCatalogLoading(false);
    };

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [effectiveNiche]);

  const toggleTemplateId = (id: string) => {
    if (!onMotionTemplateIdsChange) return;
    const set = new Set(motionTemplateIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onMotionTemplateIdsChange([...set]);
  };

  return (
    <div className="mt-6 border border-gold-500/25 bg-gold-500/5 rounded-2xl p-5 space-y-4 font-sans">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-gold-500/15 border border-gold-500/20">
          <Mic className="w-4 h-4 text-gold-400" />
        </div>
        <div className="flex-1 min-w-0">
          <SectionHeader
            title="Revise a narração antes do roteiro"
            helpId="narration-review"
            subtitle="Edite o texto até soar natural. Só depois de aprovar a IA monta os blocos, prompts visuais e estratégia completa."
          />
          {notebooklmEnriched && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300/90 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2.5 py-1">
              <Sparkles className="w-3 h-3" />
              Enriquecida com NotebookLM
            </p>
          )}
          {(strategyTitle || strategyHook) && (
            <div className="mt-2 text-[10px] text-zinc-500 space-y-0.5">
              {strategyTitle && (
                <p>
                  <span className="text-zinc-600 uppercase font-bold">
                    Título:
                  </span>{" "}
                  {strategyTitle}
                </p>
              )}
              {strategyHook && (
                <p>
                  <span className="text-zinc-600 uppercase font-bold">
                    Gancho:
                  </span>{" "}
                  {strategyHook}
                </p>
              )}
            </div>
          )}
        </div>
        <span className="text-[10px] text-zinc-500 font-mono shrink-0">
          {wordCount} palavras
        </span>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Layers3 className="w-4 h-4 text-cyan-400" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Templates Remotion do nicho
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={motionTemplatePackEnabled}
            disabled={loading || catalogLoading || !approvedTemplates.length}
            onChange={(e) =>
              onMotionTemplatePackEnabledChange?.(e.target.checked)
            }
            className="rounded border-zinc-700 bg-zinc-900 text-gold-500"
          />
          <span>
            Usar catálogo do Template Studio
            {catalogLoading ? " (carregando…)" : ""}
          </span>
        </label>

        {onMotionTemplateNicheChange && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">
              Nicho
            </span>
            <select
              value={effectiveNiche}
              disabled={loading || catalogLoading}
              onChange={(e) => onMotionTemplateNicheChange(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200"
            >
              <option value={niche || "Engenharia"}>
                {niche || "Engenharia"}
              </option>
              <option value="Engenharia">Engenharia</option>
              <option value="História">História</option>
              <option value="Geografia">Geografia</option>
            </select>
          </div>
        )}

        {catalogError && !approvedTemplates.length && (
          <p className="text-[10px] text-amber-400/90">{catalogError}</p>
        )}

        {approvedTemplates.length > 0 && (
          <div className="grid gap-2 max-h-36 overflow-y-auto pr-1">
            {approvedTemplates.map((tpl) => {
              const checked = motionTemplateIds.includes(tpl.id);
              return (
                <label
                  key={tpl.id}
                  className="flex items-start gap-2 p-2 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!motionTemplatePackEnabled || loading}
                    onChange={() => toggleTemplateId(tpl.id)}
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-gold-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs text-zinc-200 font-medium">
                      {tpl.name}
                    </span>
                    <span className="block text-[10px] text-zinc-500">
                      {tpl.category}
                      {tpl.motion_template_id
                        ? ` · ${tpl.motion_template_id}`
                        : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {motionTemplatePackEnabled &&
          approvedTemplates.length > 0 &&
          !motionTemplateIds.length && (
            <p className="text-[10px] text-zinc-500">
              Nenhum template selecionado — todos os aprovados do nicho serão
              considerados.
            </p>
          )}
      </div>

      {showBlocks && (
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Narração por bloco
          </p>
          <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
            {blockPhrases.map((bp, idx) => (
              <div
                key={bp.block}
                className="flex gap-3 p-3 bg-zinc-950/70 border border-zinc-900 rounded-xl text-xs"
              >
                <span className="shrink-0 w-6 h-6 rounded-lg bg-gold-500/15 text-gold-400 font-bold text-[10px] flex items-center justify-center">
                  {bp.block}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-gold-400/90 font-bold text-[10px] uppercase tracking-wide">
                    {bp.phrase}
                  </p>
                  <p className="text-zinc-300 leading-relaxed">
                    {paragraphs[idx] || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <textarea
        rows={14}
        value={narrativeScript}
        onChange={(e) => onNarrativeChange(e.target.value)}
        disabled={loading || notebooklmImproving}
        className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-sm text-white leading-relaxed resize-y min-h-[200px]"
        placeholder="A narração aparecerá aqui para você revisar..."
      />

      {narrativeScriptTagged.trim() && (
        <details className="text-[10px] text-zinc-500">
          <summary className="cursor-pointer hover:text-zinc-400 font-bold uppercase tracking-wider">
            Ver narração com tags de áudio (TTS)
          </summary>
          <pre className="mt-2 p-3 bg-zinc-950/80 border border-zinc-900 rounded-lg text-zinc-400 whitespace-pre-wrap text-[11px] leading-relaxed max-h-40 overflow-y-auto">
            {narrativeScriptTagged}
          </pre>
        </details>
      )}

      <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-zinc-900/60">
        <button
          type="button"
          disabled={loading || notebooklmImproving}
          onClick={onRegenerate}
          className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 text-xs font-bold px-5 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer border border-zinc-800"
        >
          {loading && loadingMode === "narration" ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>Regenerar narração</span>
        </button>

        {onNotebooklmImprove && (
          <button
            type="button"
            disabled={loading || notebooklmImproving || !narrativeScript.trim()}
            onClick={onNotebooklmImprove}
            className="bg-indigo-600/80 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
            title={
              notebooklmAvailable
                ? "Melhorar narração com pesquisa NotebookLM"
                : "Melhorar narração (NotebookLM offline — usará fallback)"
            }
          >
            {notebooklmImproving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {notebooklmImproving
                ? "Melhorando..."
                : "✨ Melhorar com NotebookLM"}
            </span>
          </button>
        )}

        <button
          type="button"
          disabled={loading || notebooklmImproving || !narrativeScript.trim()}
          onClick={onApprove}
          className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10"
        >
          {loading && loadingMode === "full" ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>Aprovar e gerar roteiro completo</span>
        </button>
      </div>
    </div>
  );
}
