import React from 'react';
import { FileText, RefreshCw, Save } from 'lucide-react';
import { DashminProjectTabLayout } from './DashminProjectTabLayout';
import { SectionHeader } from './SectionHeader';
import type { ConfigData } from './appTypes';

export type AppTimelineTabProps = {
  activeProject: string;
  config: ConfigData | null;
  projectDataLoading: boolean;
  fetchData: () => void | Promise<void>;
  newKeyword: string;
  setNewKeyword: (v: string) => void;
  addKeyword: () => void;
  removeKeyword: (kw: string) => void;
  editingImpact: { index: number; text: string } | null;
  setEditingImpact: (v: { index: number; text: string } | null) => void;
  handleSaveImpactText: (idx: number) => void;
};

export function AppTimelineTab({
  activeProject,
  config,
  projectDataLoading,
  fetchData,
  newKeyword,
  setNewKeyword,
  addKeyword,
  removeKeyword,
  editingImpact,
  setEditingImpact,
  handleSaveImpactText,
}: AppTimelineTabProps) {
  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-zinc-400 font-sans">
        <RefreshCw className={`w-8 h-8 text-gold-500 ${projectDataLoading ? 'animate-spin' : ''}`} />
        <p className="text-sm">
          {projectDataLoading
            ? 'Carregando roteiro e tags do projeto...'
            : 'Não foi possível carregar a configuração do projeto.'}
        </p>
        {!projectDataLoading && (
          <button
            type="button"
            onClick={() => fetchData()}
            className="text-xs text-gold-400 hover:text-gold-300 border border-gold-500/30 px-3 py-1.5 rounded-lg cursor-pointer"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return (
    <DashminProjectTabLayout tab="timeline" activeProject={activeProject}>
      <div className="lumiera-panel-stack">
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div>
            <SectionHeader
              title="PALAVRAS-CHAVE EM DESTAQUE (HIGHLIGHT)"
              helpId="timeline-highlights"
              subtitle="Palavras nesta lista serão destacadas na cor Ouro/Amarelo no vídeo final."
            />
          </div>

          <div className="flex flex-wrap gap-2 p-4 bg-zinc-950 border border-zinc-900 rounded-2xl min-h-[80px] font-sans">
            {(config.highlight_keywords || []).map((kw) => (
              <span
                key={kw}
                className="bg-gold-500/10 border border-gold-500/20 text-gold-500 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <span>{kw}</span>
                <button
                  onClick={() => removeKeyword(kw)}
                  className="hover:text-red-400 text-gold-500/60 font-bold transition font-mono leading-none cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-3 max-w-md font-sans">
            <input
              type="text"
              placeholder="Adicionar nova palavra..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white flex-1"
            />
            <button
              onClick={addKeyword}
              className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
            >
              Adicionar
            </button>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <SectionHeader title="TEXTOS DE IMPACTO DA LINHA DO TEMPO (12 BLOCOS)" helpId="timeline-impact" />

          <div className="divide-y divide-zinc-900 border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/20 font-sans">
            {(config.impact_texts || []).map((impact, idx) => (
              <div
                key={idx}
                className="p-4 hover:bg-zinc-900/10 transition grid grid-cols-1 md:grid-cols-4 gap-4 items-center"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-zinc-500 text-xs font-bold bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-lg">
                    Bloco {impact.block}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    Offset: {impact.start_offset}s → {impact.end_offset}s
                  </span>
                </div>

                <div className="col-span-2">
                  {editingImpact?.index === idx ? (
                    <input
                      type="text"
                      value={editingImpact.text}
                      onChange={(e) => setEditingImpact({ ...editingImpact, text: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveImpactText(idx)}
                      className="bg-zinc-950 border border-gold-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-gold-500 font-bold uppercase w-full"
                    />
                  ) : (
                    <span className="text-xs font-bold text-gold-500 tracking-wide uppercase font-cinzel">
                      {impact.text}
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  {editingImpact?.index === idx ? (
                    <>
                      <button
                        onClick={() => handleSaveImpactText(idx)}
                        className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Salvar
                      </button>
                      <button
                        onClick={() => setEditingImpact(null)}
                        className="text-[11px] font-bold text-gray-500 hover:text-gray-400 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingImpact({ index: idx, text: impact.text })}
                      className="text-[11px] font-semibold text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> Editar Texto
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashminProjectTabLayout>
  );
}