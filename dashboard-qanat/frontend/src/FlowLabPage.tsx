import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Clapperboard, Loader2, Sparkles, Star, Wand2 } from 'lucide-react';
import { FlowStudioPage } from './FlowStudioPage';
import { FLOW_LAB_PROJECT } from './flowLabConstants';
import {
  fetchFlowLabConfig,
  fetchFlowLabStoryboard,
  generateFlowLabPipeline,
  runFlowLabVisualPro,
  uploadFlowLabSceneAsset,
  flowLabAssetUrl,
  type FlowLabAiContext,
  type FlowLabVpeMeta,
} from './flowLabApi';
import type { ConfigData } from './appTypes';

type Props = FlowLabAiContext & {
  hasApiKey: boolean;
};

export function FlowLabPage({
  geminiBrowserMode,
  aiProvider,
  resolveBrowserResponse,
  hasApiKey,
}: Props) {
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<'LONGO' | 'SHORTS'>('SHORTS');
  const [niche, setNiche] = useState('Geral');
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [storyboard, setStoryboard] = useState<{ visual_prompts?: any[]; _vpe_checklist?: { quality_score?: number } } | null>(null);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [vpeMeta, setVpeMeta] = useState<FlowLabVpeMeta | null>(null);

  const aiCtx: FlowLabAiContext = { geminiBrowserMode, aiProvider, resolveBrowserResponse };

  const reloadSandbox = useCallback(async () => {
    const [sb, cfg] = await Promise.all([fetchFlowLabStoryboard(), fetchFlowLabConfig()]);
    if (sb?.visual_prompts?.length) {
      setStoryboard(sb);
      const checklist = sb._vpe_checklist as { quality_score?: number; nicho_detectado?: string } | undefined;
      setVpeMeta(checklist ? {
        enhanced: true,
        qualityScore: checklist.quality_score,
        nicheDetected: checklist.nicho_detectado,
      } : null);
    }
    if (cfg) setConfig(cfg);
  }, []);

  useEffect(() => {
    void reloadSandbox();
  }, [reloadSandbox]);

  const handleAutoGenerate = async () => {
    if (!title.trim()) {
      toast.error('Digite o tema ou titulo do video.');
      return;
    }
    if (!hasApiKey) {
      toast.error('Configure um provedor de IA em Configuracoes.');
      return;
    }
    setBusy(true);
    setPipelineStep('Iniciando...');
    try {
      const result = await generateFlowLabPipeline(
        aiCtx,
        { title: title.trim(), format, niche: niche.trim() || 'Geral' },
        setPipelineStep,
      );
      if (!result.ok || !result.storyboard) {
        toast.error(result.error || 'Pipeline falhou.');
        return;
      }
      setStoryboard(result.storyboard);
      setVpeMeta(result.vpe || { enhanced: true });
      const cfg = await fetchFlowLabConfig();
      if (cfg) setConfig(cfg);
      const n = (result.storyboard.visual_prompts as unknown[])?.length || 0;
      const score = result.vpe?.qualityScore;
      toast.success(
        `Engenharia Visual PRO concluida — ${n} cenas${score != null ? ` · score ${score}` : ''}. Copie no Flow e suba os arquivos.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro no pipeline.');
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
              Pagina fora do projeto ativo. A IA gera roteiro e prompts automaticamente no sandbox{' '}
              <code className="text-violet-300/90">{FLOW_LAB_PROJECT}</code>. Voce so gera imagem/video no Google Flow e faz upload aqui.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[var(--dash-muted)]">Tema do video</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Como os romanos construiram aquedutos"
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

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || !hasApiKey}
            onClick={() => void handleAutoGenerate()}
            className="dash-btn-primary text-sm px-5 py-2.5 flex items-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {busy ? 'Gerando...' : 'Gerar roteiro + prompts (automatico)'}
          </button>
          <button
            type="button"
            disabled={busy || !storyboard?.visual_prompts?.length || !hasApiKey}
            onClick={() => void handleVisualProOnly()}
            className="dash-btn-secondary text-sm px-4 py-2.5 flex items-center gap-2 border-violet-500/30 text-violet-200"
          >
            <Star className="w-4 h-4 text-amber-300" />
            Engenharia Visual PRO
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void reloadSandbox()}
            className="dash-btn-secondary text-xs px-4 py-2"
          >
            Recarregar sandbox
          </button>
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
          Pipeline automatico: narracao → roteiro → <strong className="text-violet-300">Engenharia Visual PRO</strong> → so entao os prompts aparecem para copiar no Flow.
          Manual: gerar pixels no Google Flow e enviar o arquivo aprovado.
        </p>
      </div>

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