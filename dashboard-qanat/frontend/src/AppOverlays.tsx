import React from 'react';
import toast from 'react-hot-toast';
import {
  Bot,
  CheckCircle,
  Lock,
  Music,
  RefreshCw,
  Settings,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { DashminAiChat } from './DashminAiChat';
import { SectionHeader } from './SectionHeader';
import type { AppTab } from './appTabs';
import type { MusicFile, OutputVideo } from './appTypes';

export type AppOverlaysProps = {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatMessages: unknown[];
  chatLoading: boolean;
  chatInput: string;
  setChatInput: (value: string) => void;
  handleSendChatMessage: () => void | Promise<void>;
  hasApiKey: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  aiProviderBadge: { short: string; detail: string };
  setActiveTab: (tab: AppTab) => void;
  showCreateModal: boolean;
  setShowCreateModal: (open: boolean) => void;
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  newProjectFormat: 'LONGO' | 'SHORTS';
  setNewProjectFormat: (format: 'LONGO' | 'SHORTS') => void;
  newProjectNiche: string;
  setNewProjectNiche: (niche: string) => void;
  handleCreateProject: () => void | Promise<void>;
  pendingMusicDelete: MusicFile | { name: '__all__'; sizeBytes: number } | null;
  setPendingMusicDelete: (
    value: MusicFile | { name: '__all__'; sizeBytes: number } | null,
  ) => void;
  deletingMusic: boolean;
  handleConfirmDeleteMusic: () => void | Promise<void>;
  musicFiles: MusicFile[];
  getFormatBytes: (n: number) => string;
  pendingOutputDelete: OutputVideo | null;
  setPendingOutputDelete: (value: OutputVideo | null) => void;
  deletingOutput: boolean;
  handleDeleteOutputVideo: () => void | Promise<void>;
  previewVideoUrl: string | null;
  setPreviewVideoUrl: (url: string | null) => void;
  renderProgress: { percent: number; phase: string } | null;
  setRenderProgress: (value: { percent: number; phase: string } | null) => void;
};

export function AppOverlays({
  chatOpen,
  setChatOpen,
  chatMessages,
  chatLoading,
  chatInput,
  setChatInput,
  handleSendChatMessage,
  hasApiKey,
  chatEndRef,
  aiProviderBadge,
  setActiveTab,
  showCreateModal,
  setShowCreateModal,
  newProjectName,
  setNewProjectName,
  newProjectFormat,
  setNewProjectFormat,
  newProjectNiche,
  setNewProjectNiche,
  handleCreateProject,
  pendingMusicDelete,
  setPendingMusicDelete,
  deletingMusic,
  handleConfirmDeleteMusic,
  musicFiles,
  getFormatBytes,
  pendingOutputDelete,
  setPendingOutputDelete,
  deletingOutput,
  handleDeleteOutputVideo,
  previewVideoUrl,
  setPreviewVideoUrl,
  renderProgress,
  setRenderProgress,
}: AppOverlaysProps) {
  return (
    <>
      {/* Global Floating Chat Button */}

      {!chatOpen && (

        <button

          onClick={() => setChatOpen(true)}

          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-dash-primary hover:bg-dash-primary-dark text-white rounded-full flex items-center justify-center shadow-2xl shadow-dash-primary/30 transition-all duration-200 hover:scale-110 cursor-pointer"

          title="Abrir Assistente IA"

        >

          <Bot className="w-6 h-6" />

        </button>

      )}

      {/* Global Sliding Chat Panel */}

      {chatOpen && (

        <div className="dash-chat-floating">

          <div className="dash-chat-floating-header">

            <div className="flex items-center gap-2 min-w-0">

              <div className="dash-chat-floating-icon">

                <Bot className="w-4 h-4" />

              </div>

              <div className="min-w-0">

                <SectionHeader title="Lumiera Agent" helpId="lumiera-agent" size="sm" titleClassName="text-xs tracking-wide" />

                <p className="text-[9px] text-dash-muted">Autonomia total sobre o projeto</p>

              </div>

            </div>

            <div className="flex items-center gap-2 shrink-0">

                <div className="flex items-center gap-1">

                  <span
                    className={`text-[9px] flex items-center gap-1 ${hasApiKey ? 'text-emerald-500' : 'text-dash-primary'}`}
                    title={aiProviderBadge.detail}
                  >

                    {hasApiKey ? <CheckCircle className="w-3 h-3" /> : <Lock className="w-3 h-3" />}

                    {aiProviderBadge.short}

                  </span>

                  <button

                    onClick={() => {

                      setChatOpen(false);

                      setActiveTab('settings');

                    }}

                    className="text-dash-muted hover:text-white p-1 rounded-lg hover:bg-dash-card-hover transition cursor-pointer"

                    title="Trocar chave API"

                  >

                    <Settings className="w-3.5 h-3.5" />

                  </button>

                </div>

              <button onClick={() => setChatOpen(false)} className="text-dash-muted hover:text-white p-1 rounded-lg hover:bg-dash-card-hover transition cursor-pointer">

                <X className="w-4 h-4" />

              </button>

            </div>

          </div>

          <div className="dash-chat-floating-body">

            <DashminAiChat
              compact
              messages={chatMessages}
              loading={chatLoading}
              input={chatInput}
              onInputChange={setChatInput}
              onSend={handleSendChatMessage}
              hasApiKey={hasApiKey}
              chatEndRef={chatEndRef}
              assistantLabel="Lumiera Agent"
              loadingLabel="Processando..."
              inputPlaceholder={hasApiKey ? 'Peça qualquer coisa ao agente...' : 'Configure um provedor em Configurações primeiro...'}
              suggestions={[
                { label: '📊 Status', message: 'Mostre o status atual do projeto.' },
                { label: '💡 Keywords', message: 'Sugira palavras-chave para destacar baseadas no roteiro.' },
                { label: '🔥 Impactos', message: 'Melhore os textos de impacto do vídeo.' },
                { label: '🎵 BGM', message: 'Analise e otimize o mapeamento de trilhas sonoras.' },
              ]}
            />

          </div>

        </div>

      )}

      {/* Create Project Modal */}

      {showCreateModal && (

        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in font-sans">

          <div className="bg-[#0c0c0e] border border-zinc-850 rounded-3xl p-6 w-96 max-w-[90%] space-y-4 shadow-2xl">

            <h3 className="font-sans font-bold text-white text-sm tracking-wide">Criar Novo Projeto</h3>

            <p className="text-xs text-gray-400 leading-relaxed font-sans">

              Digite o nome do projeto. Será criada uma pasta correspondente no workspace e inicializados todos os arquivos template necessários.

            </p>

            <div className="space-y-2">

              <label className="ui-micro-label text-gray-500 block text-balance-safe px-1">Nome do Projeto</label>

              <input

                type="text"

                placeholder="Ex: Notre_Dame, Concreto_Romano, etc."

                value={newProjectName}

                onChange={(e) => setNewProjectName(e.target.value)}

                className="w-full bg-zinc-950 border border-zinc-855 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white font-sans"

                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}

                autoFocus

              />

            </div>

            <div className="space-y-2 pt-2">

              <label className="ui-micro-label text-gray-500 block text-balance-safe px-1">Formato / Aspect Ratio</label>

              <div className="grid grid-cols-2 gap-2 font-sans text-xs">

                <button

                  type="button"

                  onClick={() => setNewProjectFormat('LONGO')}

                  className={`py-2 rounded-xl border text-center transition cursor-pointer font-semibold ${

                    newProjectFormat === 'LONGO'

                      ? 'bg-gold-500/10 border-gold-500 text-gold-500'

                      : 'bg-zinc-950 border-zinc-850 text-gray-400 hover:text-white'

                  }`}

                >

                  Longo (16:9)

                </button>

                <button

                  type="button"

                  onClick={() => setNewProjectFormat('SHORTS')}

                  className={`py-2 rounded-xl border text-center transition cursor-pointer font-semibold ${

                    newProjectFormat === 'SHORTS'

                      ? 'bg-gold-500/10 border-gold-500 text-gold-500'

                      : 'bg-zinc-950 border-zinc-850 text-gray-400 hover:text-white'

                  }`}

                >

                  Shorts (9:16)

                </button>

              </div>

            </div>

            <div className="space-y-2 pt-2">
              <label className="ui-micro-label text-gray-500 block text-balance-safe px-1">Nicho do Projeto</label>
              <input
                type="text"
                placeholder="Ex: História, Tecnologia, Geografia, Finanças"
                value={newProjectNiche}
                onChange={(e) => setNewProjectNiche(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-855 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white font-sans"
              />
            </div>

            <div className="flex justify-end gap-3 text-xs font-semibold pt-2 font-sans">

              <button

                onClick={() => {

                  setShowCreateModal(false);

                  setNewProjectName('');

                }}

                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-gray-400 hover:text-white rounded-xl transition cursor-pointer"

              >

                Cancelar

              </button>

              <button

                onClick={handleCreateProject}

                disabled={!newProjectName.trim()}

                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 rounded-xl transition shadow-lg shadow-gold-500/10 cursor-pointer"

              >

                Criar Projeto

              </button>

            </div>

          </div>

        </div>

      )}

      {/* Music Delete Confirmation Modal */}

      {pendingMusicDelete && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in font-sans">

          <div className="bg-[#0c0c0e] border border-red-900/40 rounded-3xl p-6 w-[440px] max-w-[92%] space-y-5 shadow-2xl shadow-red-950/30">

            <div className="flex items-start gap-4">

              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">

                <Trash2 className="w-5 h-5 text-red-400" />

              </div>

              <div className="min-w-0">

                <h3 className="font-sans font-bold text-white text-sm tracking-wide">

                  {pendingMusicDelete.name === "__all__" ? "Limpar trilhas sonoras?" : "Excluir trilha sonora?"}

                </h3>

                <p className="text-xs text-gray-400 leading-relaxed mt-2">

                  {pendingMusicDelete.name === "__all__"

                    ? "Todas as trilhas e efeitos listados serão removidos deste projeto. A narração será preservada."

                    : "O arquivo será removido deste projeto e também sairá do mapeamento de BGM/SFX. Esta ação não pode ser desfeita."}

                </p>

              </div>

            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-3 flex items-center gap-3">

              <Music className="w-4 h-4 text-gold-500 shrink-0" />

              <div className="min-w-0">

                <p className="text-xs text-white font-semibold truncate">

                  {pendingMusicDelete.name === "__all__" ? `${musicFiles.length} arquivos de áudio` : pendingMusicDelete.name}

                </p>

                <p className="text-[10px] text-zinc-500 font-mono">{getFormatBytes(pendingMusicDelete.sizeBytes)}</p>

              </div>

            </div>

            <div className="flex justify-end gap-3 text-xs font-semibold pt-1">

              <button

                onClick={() => setPendingMusicDelete(null)}

                disabled={deletingMusic}

                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-gray-400 hover:text-white rounded-xl transition cursor-pointer disabled:opacity-50"

              >

                Cancelar

              </button>

              <button

                onClick={handleConfirmDeleteMusic}

                disabled={deletingMusic}

                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl transition shadow-lg shadow-red-950/30 cursor-pointer flex items-center gap-2"

              >

                {deletingMusic ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}

                <span>{deletingMusic ? 'Excluindo...' : pendingMusicDelete.name === "__all__" ? 'Limpar trilhas' : 'Excluir trilha'}</span>

              </button>

            </div>

          </div>

        </div>

      )}

      {/* Output Delete Confirmation Modal */}

      {pendingOutputDelete && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in font-sans">

          <div className="bg-[#0c0c0e] border border-red-900/40 rounded-3xl p-6 w-[440px] max-w-[92%] space-y-5 shadow-2xl shadow-red-950/30">

            <div className="flex items-start gap-4">

              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">

                <Trash2 className="w-5 h-5 text-red-400" />

              </div>

              <div className="min-w-0">

                <h3 className="font-sans font-bold text-white text-sm tracking-wide">Excluir vídeo renderizado?</h3>

                <p className="text-xs text-gray-400 leading-relaxed mt-2">

                  O arquivo será removido da pasta OUTPUT. Esta ação não pode ser desfeita.

                </p>

              </div>

            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-3 flex items-center gap-3">

              <Video className="w-4 h-4 text-gold-500 shrink-0" />

              <div className="min-w-0">

                <p className="text-xs text-white font-semibold truncate">{pendingOutputDelete.name}</p>

                <p className="text-[10px] text-zinc-500 font-mono">{getFormatBytes(pendingOutputDelete.sizeBytes)}</p>

              </div>

            </div>

            <div className="flex justify-end gap-3 text-xs font-semibold pt-1">

              <button

                onClick={() => setPendingOutputDelete(null)}

                disabled={deletingOutput}

                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-gray-400 hover:text-white rounded-xl transition cursor-pointer disabled:opacity-50"

              >

                Cancelar

              </button>

              <button

                onClick={handleDeleteOutputVideo}

                disabled={deletingOutput}

                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl transition shadow-lg shadow-red-950/30 cursor-pointer flex items-center gap-2"

              >

                {deletingOutput ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}

                <span>{deletingOutput ? 'Excluindo...' : 'Excluir vídeo'}</span>

              </button>

            </div>

          </div>

        </div>

      )}

      {/* Video Preview Modal */}

      {previewVideoUrl && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in font-sans">

          <div className="bg-[#0c0c0e] border border-zinc-850 rounded-3xl p-6 w-[720px] max-w-[95%] space-y-4 shadow-2xl relative animate-fade-in">

            <div className="flex justify-between items-center pb-2 border-b border-zinc-850">

              <h3 className="font-sans font-bold text-white text-xs tracking-wider">PREVIEW DE VÍDEO COMPILADO</h3>

              <button

                onClick={() => setPreviewVideoUrl(null)}

                className="text-zinc-500 hover:text-white transition cursor-pointer text-xs font-semibold px-2 py-1 rounded hover:bg-zinc-900 border border-zinc-800"

              >

                Fechar

              </button>

            </div>

            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-900 flex items-center justify-center shadow-inner">

              <video 

                src={previewVideoUrl} 

                controls 

                autoPlay 

                className="w-full h-full object-contain"

              />

            </div>

            <div className="text-[10px] text-zinc-500 text-center font-sans">

              Reproduzindo a partir do workspace local via proxy. Caso o player não carregue, certifique-se de que o vídeo foi totalmente renderizado.

            </div>

          </div>

        </div>

      )}

      {/* WIDGET COMPACTO DE PROGRESSO DA RENDERIZAÇÃO */}

      {renderProgress && (

        <div className="fixed bottom-6 right-6 z-[100] w-[340px] font-sans" style={{ animation: 'slideInRight 0.4s ease-out' }}>

          <div className="bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

            {/* Header */}

            <div className="flex items-center justify-between px-4 pt-3 pb-1">

              <div className="flex items-center gap-2.5">

                <div className="relative">

                  {renderProgress.percent >= 100 ? (

                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">

                      <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />

                    </div>

                  ) : (

                    <div className="w-8 h-8 bg-gold-500/15 rounded-full flex items-center justify-center">

                      <svg className="w-4 h-4 text-gold-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />

                      </svg>

                    </div>

                  )}

                </div>

                <div>

                  <span className="text-[11px] font-bold text-white tracking-wide block leading-tight">

                    {renderProgress.percent >= 100 ? 'Renderização Concluída' : 'Renderizando Vídeo'}

                  </span>

                  <span className="text-[9px] text-zinc-500 leading-tight block mt-0.5">{renderProgress.phase}</span>

                </div>

              </div>

              <button

                onClick={() => setRenderProgress(null)}

                className="text-zinc-600 hover:text-zinc-400 transition cursor-pointer p-1"

              >

                <X className="w-3.5 h-3.5" />

              </button>

            </div>

            {/* Progress bar */}

            <div className="px-4 pb-3 pt-1.5">

              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">

                <div

                  className={`h-full rounded-full transition-all duration-500 ease-out ${

                    renderProgress.percent >= 100

                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'

                      : 'bg-gradient-to-r from-gold-600 via-gold-400 to-yellow-300'

                  }`}

                  style={{ width: `${Math.min(renderProgress.percent, 100)}%` }}

                />

              </div>

              <div className="flex justify-between mt-1.5">

                <span className="text-[9px] text-zinc-600 font-mono">PROCESSANDO</span>

                <span className={`text-[11px] font-mono font-bold ${

                  renderProgress.percent >= 100 ? 'text-emerald-400' : 'text-gold-400'

                }`}>{renderProgress.percent}%</span>

              </div>

            </div>

          </div>

        </div>

      )}
    </>
  );
}
