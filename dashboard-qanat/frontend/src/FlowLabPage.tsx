import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  Clapperboard,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { FlowStudioPage } from './FlowStudioPage';
import { FLOW_LAB_PROJECT } from './flowLabConstants';
import {
  deleteFlowLabSandbox,
  fetchFlowLabConfig,
  fetchFlowLabStoryboard,
  generateFlowLabIdeas,
  generateFlowLabPipeline,
  runFlowLabVisualPro,
  uploadFlowLabSceneAsset,
  flowLabAssetUrl,
  type FlowLabAiContext,
  type FlowLabIdeasResult,
  type FlowLabVpeMeta,
} from './flowLabApi';
import type { ConfigData } from './appTypes';

type Props = FlowLabAiContext & {
  hasApiKey: boolean;
};

function parseAvoidTopics(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function FlowLabPage({
  geminiBrowserMode,
  aiProvider,
  resolveBrowserResponse,
  hasApiKey,
}: Props) {
  const [title, setTitle] = useState('');
  const [avoidTopics, setAvoidTopics] = useState('');
  const [format, setFormat] = useState<'LONGO' | 'SHORTS'>('SHORTS');
  const [niche, setNiche] = useState('Geral');
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ideasData, setIdeasData] = useState<FlowLabIdeasResult | null>(null);
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState(-1);
  const [storyboard, setStoryboard] = useState<{
    visual_prompts?: any[];
    _vpe_checklist?: { quality_score?: number };
  } | null>(null);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [vpeMeta, setVpeMeta] = useState<FlowLabVpeMeta | null>(null);
  const [sandboxExists, setSandboxExists] = useState(false);

  const aiCtx: FlowLabAiContext = { geminiBrowserMode, aiProvider, resolveBrowserResponse };

  const excludeTitles = useMemo(() => {
    const manual = parseAvoidTopics(avoidTopics);
    const previous = (ideasData?.ideas || []).map((idea) => idea.title || '').filter(Boolean);
    return [...new Set([...manual, ...previous])];
  }, [avoidTopics, ideasData]);

  const reloadSandbox = useCallback(async () => {
    const [sb, cfg] = await Promise.all([fetchFlowLabStoryboard(), fetchFlowLabConfig()]);
    const prompts = sb?.visual_prompts;
    const hasPrompts = Array.isArray(prompts) && prompts.length > 0;
    setSandboxExists(hasPrompts);
    if (hasPrompts) {
      setStoryboard(sb as typeof storyboard);
      const checklist = sb?._vpe_checklist as { quality_score?: number; nicho_detectado?: string } | undefined;
      setVpeMeta(checklist ? {
        enhanced: true,
        qualityScore: checklist.quality_score,
        nicheDetected: checklist.nicho_detectado,
      } : null);
    } else {
      setStoryboard(null);
      setVpeMeta(null);
    }
    if (cfg) setConfig(cfg);
  }, []);

  useEffect(() => {
    void reloadSandbox();
  }, [reloadSandbox]);

  const handleGenerateIdeas = async (forceVariety = false) => {
    if (!title.trim()) {
      toast.error('Digite o tema ou nicho do video.');
      return;
    }
    if (!hasApiKey) {
      toast.error('Configure um provedor de IA em Configuracoes.');
      return;
    }
    setBusy(true);
    setPipelineStep(forceVariety ? 'Gerando outras ideias...' : 'Gerando ideias...');
    try {
      const result = await generateFlowLabIdeas(aiCtx, {
        niche: title.trim(),
        format,
        excludeTitles: forceVariety ? excludeTitles : parseAvoidTopics(avoidTopics),
        forceVariety,
      });
      if (!result.ok || !result.data) {
        toast.error(result.error || 'Falha ao gerar ideias.');
        return;
      }
      setIdeasData(result.data);
      setSelectedIdeaIndex(result.data.best_idea_index);
      const meta = result.data._ideas_meta;
      if (forceVariety) {
        toast.success(`Nova leva de ideias${meta?.excludedCount ? ` (${meta.excludedCount} assuntos bloqueados)` : ''}.`);
      } else if (meta?.usedDeepResearch) {
        toast.success('10 ideias geradas com pesquisa profunda.');
      } else {
        toast.success('10 ideias geradas — escolha uma antes de continuar.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar ideias.');
    } finally {
      setBusy(false);
      setPipelineStep(null);
    }
  };

  const handleApproveAndGenerate = async () => {
    const idea = ideasData?.ideas[selectedIdeaIndex];
    if (!idea?.title?.trim()) {
      toast.error('Selecione uma ideia para aprovar.');
      return;
    }
    if (!hasApiKey) {
      toast.error('Configure um provedor de IA em Configuracoes.');
      return;
    }
    setBusy(true);
    setPipelineStep('Iniciando pipeline...');
    try {
      const result = await generateFlowLabPipeline(
        aiCtx,
        { idea, format, niche: niche.trim() || title.trim() || 'Geral' },
        setPipelineStep,
      );
      if (!result.ok || !result.storyboard) {
        toast.error(result.error || 'Pipeline falhou.');
        return;
      }
      setStoryboard(result.storyboard);
      setSandboxExists(true);
      setVpeMeta(result.vpe || { enhanced: true });
      setIdeasData(null);
      setSelectedIdeaIndex(-1);
      const cfg = await fetchFlowLabConfig();
      if (cfg) setConfig(cfg);
      const n = (result.storyboard.visual_prompts as unknown[])?.length || 0;
      const score = result.vpe?.qualityScore;
      toast.success(
        `Ideia aprovada — ${n} cenas${score != null ? ` · VPE ${score}` : ''}. Copie no Flow e suba os arquivos.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro no pipeline.');
    } finally {
      setBusy(false);
      setPipelineStep(null);
    }
  };

  const handleRejectIdeas = () => {
    setIdeasData(null);
    setSelectedIdeaIndex(-1);
    toast('Ideias descartadas — ajuste o tema ou assuntos a evitar e gere de novo.');
  };

  const handleDeleteSandbox = async () => {
    if (!window.confirm(
      `Excluir o sandbox "${FLOW_LAB_PROJECT}"? Roteiro, prompts, assets e uploads serao apagados.`,
    )) {
      return;
    }
    setBusy(true);
    setPipelineStep('Excluindo sandbox...');
    try {
      const result = await deleteFlowLabSandbox();
      if (!result.ok) {
        toast.error(result.error || 'Falha ao excluir sandbox.');
        return;
      }
      setStoryboard(null);
      setConfig(null);
      setVpeMeta(null);
      setIdeasData(null);
      setSelectedIdeaIndex(-1);
      setSandboxExists(false);
      toast.success('Sandbox excluido. Gere novas ideias quando quiser.');
    } finally {
      setBusy(false);
      setPipelineStep(null);
    }
  };

  const handleVisualProOnly = async () => {
    if (!storyboard?.visual_prompts?.length) {
      toast.error('Gere o roteiro primeiro.');
      return;
    }
    if (!hasApiKey) {
      toast.error('Configure um provedor de IA em Configuracoes.');
      return;
    }
    setBusy(true);
    setPipelineStep('Engenharia Visual PRO...');
    try {
      const result = await runFlowLabVisualPro(aiCtx);
      if (!result.ok || !result.storyboard) {
        toast.error(result.error || 'Engenharia Visual PRO falhou.');
        return;
      }
      setStoryboard(result.storyboard);
      setVpeMeta(result.meta || { enhanced: true });
      const score = result.meta?.qualityScore;
      toast.success(`Engenharia Visual PRO concluida${score != null ? ` · score ${score}` : ''}.`);
    } finally {
      setBusy(false);
      setPipelineStep(null);
    }
  };

  const handleUpload = async (
    blockNum: number,
    type: 'video' | 'image',
    file: File,
    assetIdx: number,
  ) => {
    if (!storyboard) return;
    const result = await uploadFlowLabSceneAsset(blockNum, type, file, assetIdx, storyboard);
    if (!result.ok) {
      toast.error(result.error || 'Falha no upload');
      return;
    }
    if (result.storyboard) {
      setStoryboard(result.storyboard);
      const cfg = await fetchFlowLabConfig();
      if (cfg) setConfig(cfg);
    }
    toast.success('Asset vinculado a cena.');
  };

  const selectedIdea = selectedIdeaIndex >= 0 ? ideasData?.ideas[selectedIdeaIndex] : null;

  return (
    <div className="space-y-6 min-w-0">
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-violet-500/20">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <Clapperboard className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Flow Lab (teste global)</h3>
            <p className="text-xs text-[var(--dash-muted)] leading-relaxed mt-1">
              Pagina fora do projeto ativo. A IA propoe ideias para voce aprovar, depois gera roteiro e prompts no sandbox{' '}
              <code className="text-violet-300/90">{FLOW_LAB_PROJECT}</code>. Voce so gera imagem/video no Google Flow e faz upload aqui.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[var(--dash-muted)]">Tema ou nicho</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Engenharia romana, castelos medievais..."
              className="dash-input w-full text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[var(--dash-muted)]">Formato</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'LONGO' | 'SHORTS')}
              className="dash-select w-full"
            >
              <option value="SHORTS">Shorts (9:16)</option>
              <option value="LONGO">Longo (16:9)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[var(--dash-muted)]">Nicho</label>
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Geral"
              className="dash-input w-full text-sm"
            />
          </div>
        </div>

        <div className="mb-4 space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--dash-muted)]">
            Assuntos a evitar (opcional — um titulo por linha)
          </label>
          <textarea
            value={avoidTopics}
            onChange={(e) => setAvoidTopics(e.target.value)}
            placeholder={'Ex: Como os romanos construiram aquedutos\nPor que as escadas dos castelos eram tortas'}
            className="dash-input w-full text-sm min-h-[72px] resize-y"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || !hasApiKey}
            onClick={() => void handleGenerateIdeas(false)}
            className="dash-btn-primary text-sm px-5 py-2.5 flex items-center gap-2"
          >
            {busy && !ideasData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {busy && !ideasData ? 'Gerando...' : 'Gerar ideias'}
          </button>
          {ideasData && (
            <>
              <button
                type="button"
                disabled={busy || selectedIdeaIndex < 0}
                onClick={() => void handleApproveAndGenerate()}
                className="dash-btn-primary text-sm px-5 py-2.5 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {busy ? 'Gerando...' : 'Aprovar ideia e gerar roteiro'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleGenerateIdeas(true)}
                className="dash-btn-secondary text-sm px-4 py-2.5 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Outras ideias
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleRejectIdeas}
                className="dash-btn-secondary text-sm px-4 py-2.5 flex items-center gap-2 text-rose-300 border-rose-500/30"
              >
                <X className="w-4 h-4" />
                Descartar
              </button>
            </>
          )}
          {storyboard?.visual_prompts?.length ? (
            <button
              type="button"
              disabled={busy || !hasApiKey}
              onClick={() => void handleVisualProOnly()}
              className="dash-btn-secondary text-sm px-4 py-2.5 flex items-center gap-2 border-violet-500/30 text-violet-200"
            >
              <Star className="w-4 h-4 text-amber-300" />
              Engenharia Visual PRO
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void reloadSandbox()}
            className="dash-btn-secondary text-xs px-4 py-2"
          >
            Recarregar sandbox
          </button>
          {sandboxExists && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDeleteSandbox()}
              className="dash-btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 text-rose-300 border-rose-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir sandbox
            </button>
          )}
          {vpeMeta?.enhanced && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-200">
              VPE PRO{vpeMeta.qualityScore != null ? ` · ${vpeMeta.qualityScore}` : ''}
            </span>
          )}
          {pipelineStep && (
            <span className="text-[11px] text-violet-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {pipelineStep}
            </span>
          )}
        </div>

        <p className="text-[10px] text-[var(--dash-muted)] mt-3 leading-relaxed">
          Fluxo: tema → <strong className="text-violet-300">aprovar ideia</strong> → narracao → roteiro → Engenharia Visual PRO → copiar prompts no Flow.
          Use &quot;Assuntos a evitar&quot; para bloquear videos que voce ja publicou.
        </p>
      </div>

      {ideasData && (
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-violet-500/25 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-white">Escolha a ideia antes de gerar</h4>
            <span className="text-[10px] uppercase tracking-wider text-violet-300/80 font-bold">
              {ideasData.ideas.length} opcoes
            </span>
          </div>

          {ideasData.diagnostic?.strong_angle && (
            <p className="text-[11px] text-[var(--dash-muted)] leading-relaxed border-l-2 border-violet-500/40 pl-3">
              <span className="text-violet-300 font-semibold">Angulo forte: </span>
              {ideasData.diagnostic.strong_angle}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {ideasData.ideas.map((idea, index) => {
              const isSelected = selectedIdeaIndex === index;
              const isBest = ideasData.best_idea_index === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedIdeaIndex(index)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-violet-500/10 border-violet-400/50 shadow-lg shadow-violet-500/5'
                      : 'bg-[var(--dash-surface)]/40 border-[var(--dash-border)] hover:border-violet-500/30'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <span className="text-[10px] font-mono text-[var(--dash-muted)]">Ideia {index + 1}</span>
                    {isBest && (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                        Recomendada
                      </span>
                    )}
                  </div>
                  <h5 className={`text-xs font-bold leading-snug ${isSelected ? 'text-violet-200' : 'text-white'}`}>
                    {idea.title}
                  </h5>
                  {idea.promise && (
                    <p className="text-[11px] text-[var(--dash-muted)] mt-1.5 leading-relaxed line-clamp-3">
                      {idea.promise}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {selectedIdea && (
            <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-violet-300 font-bold">Preview da ideia selecionada</p>
              <p className="text-sm font-semibold text-white">{selectedIdea.title}</p>
              {selectedIdea.promise && (
                <p className="text-xs text-[var(--dash-muted)] leading-relaxed">{selectedIdea.promise}</p>
              )}
              {selectedIdeaIndex === ideasData.best_idea_index && ideasData.best_idea_reason && (
                <p className="text-[11px] text-violet-200/90 leading-relaxed border-t border-violet-500/20 pt-2 mt-2">
                  {ideasData.best_idea_reason}
                </p>
              )}
              <p className="text-[10px] text-[var(--dash-muted)]">
                Nao gostou? Clique em &quot;Outras ideias&quot; ou adicione titulos em &quot;Assuntos a evitar&quot;.
              </p>
            </div>
          )}
        </div>
      )}

      <FlowStudioPage
        activeProject={FLOW_LAB_PROJECT}
        config={config}
        storyboardData={storyboard}
        status={null}
        wordTranscripts={[]}
        getAssetUrl={flowLabAssetUrl}
        onUpload={handleUpload}
        standalone
      />
    </div>
  );
}