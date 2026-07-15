import toast from "react-hot-toast";
import React from "react";
import {
  Copy,
  Download,
  Music,
  Pause,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { DashminProjectTabLayout } from "./DashminProjectTabLayout";
import { SectionHeader } from "./SectionHeader";
import type { ConfigData } from "./appTypes";

export type MusicFile = { name: string; sizeBytes: number };

export type AppMusicTabProps = {
  config: ConfigData;
  activeProject: string;
  mixing: boolean;
  mixBGM: (fromWizard?: boolean) => void | Promise<void>;
  globalMusicVolume: number;
  activeBgmMode: string;
  isShortVideo: boolean;
  saveConfig: (
    cfg: ConfigData,
    opts?: { skipRefresh?: boolean }
  ) => void | Promise<void> | Promise<ConfigData | null>;
  planningBgmEmotions: boolean;
  hasApiKey: boolean;
  handlePlanBgmEmotions: () => void | Promise<void>;
  bgmEmotionRows: any[];
  safeMusicFiles: MusicFile[];
  handleEmotionMusicChange: (
    segmentId: string,
    fileName: string,
    segMeta: any
  ) => void | Promise<void>;
  playingMusic: string | null;
  togglePlayMusic: (nameOrUrl: string) => void;
  bgmSuggestions: any;
  bgmBlockRows: Array<{ block: number; file: string }>;
  handleMusicChange: (blockNum: number, fileName: string) => void;
  searchMusic: string;
  setSearchMusic: (v: string) => void;
  handleDeleteAllMusic: () => void;
  getProjectUrl: (path: string) => string;
  fetchData: () => void | Promise<void>;
  suggestingBGM: boolean;
  handleSuggestBGM: () => void | Promise<void>;
  handleDeleteMusic: (name: string) => void;
  getFormatBytes: (n: number) => string;
  hasEpidemicKey: boolean;
  autoSoundtracking: boolean;
  handleAutoSoundtrack: () => void | Promise<void>;
  epidemicSearchType: "bgm" | "sfx";
  setEpidemicSearchType: (t: "bgm" | "sfx") => void;
  setEpidemicSearchResults: (r: any[]) => void;
  epidemicSearchQuery: string;
  setEpidemicSearchQuery: (q: string) => void;
  handleSearchEpidemic: () => void | Promise<void>;
  searchingEpidemic: boolean;
  safeEpidemicResults: any[];
  downloadingEpidemicId: string | null;
  handleDownloadEpidemic: (
    track: any,
    blockNumber?: number
  ) => void | Promise<void>;
  storyboardData: any;
  planningProfessionalSfx: boolean;
  handlePlanProfessionalSfx: () => void | Promise<void>;
  professionalSfxEvents: any[];
};

export function AppMusicTab({
  config,
  activeProject,
  mixing,
  mixBGM,
  globalMusicVolume,
  activeBgmMode,
  isShortVideo,
  saveConfig,
  planningBgmEmotions,
  hasApiKey,
  handlePlanBgmEmotions,
  bgmEmotionRows,
  safeMusicFiles,
  handleEmotionMusicChange,
  playingMusic,
  togglePlayMusic,
  bgmSuggestions,
  bgmBlockRows,
  handleMusicChange,
  searchMusic,
  setSearchMusic,
  handleDeleteAllMusic,
  getProjectUrl,
  fetchData,
  suggestingBGM,
  handleSuggestBGM,
  handleDeleteMusic,
  getFormatBytes,
  hasEpidemicKey,
  autoSoundtracking,
  handleAutoSoundtrack,
  epidemicSearchType,
  setEpidemicSearchType,
  setEpidemicSearchResults,
  epidemicSearchQuery,
  setEpidemicSearchQuery,
  handleSearchEpidemic,
  searchingEpidemic,
  safeEpidemicResults,
  downloadingEpidemicId,
  handleDownloadEpidemic,
  storyboardData,
  planningProfessionalSfx,
  handlePlanProfessionalSfx,
  professionalSfxEvents,
}: AppMusicTabProps) {
  return (
    <DashminProjectTabLayout
      tab="music"
      activeProject={activeProject}
      actions={
        <button
          disabled={mixing}
          onClick={() => mixBGM(true)}
          className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3.5 rounded-xl transition flex items-center gap-2 shrink-0 shadow-lg shadow-gold-500/10 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${mixing ? "animate-spin" : ""}`} />
          <span>
            {mixing ? "Misturando Trilhas..." : "Regenerar Trilha Sonora"}
          </span>
        </button>
      }
    >
      <div className="lumiera-panel-stack font-sans">
        {config._bgm_production_hints && (
          <div className="glass-panel p-4 rounded-xl border border-gold-500/20 bg-gold-500/5 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-400">
              Padrão Lumiera · {config._bgm_production_hints.mode}
              {config._bgm_production_hints.segments
                ? ` · ${config._bgm_production_hints.segments} segmentos`
                : ""}
              {" · "}volume{" "}
              {Math.round(
                (config.project_music_volume ?? globalMusicVolume) * 100
              )}
              % ({config.project_music_volume != null ? "projeto" : "global"})
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {config._bgm_production_hints.tip}
              {activeBgmMode === "emotion" && !isShortVideo
                ? " Fluxo: planejar emoções → mapear faixas → Regenerar Trilha → Render."
                : ""}
            </p>
          </div>
        )}

        {/* Music mappings grid */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mappings */}

          <div className="glass-panel p-4 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900 pb-3 gap-2">
              <SectionHeader
                title="Configuração de Trilha"
                helpId="music-mapping"
                size="sm"
                titleClassName="tracking-widest uppercase text-xs"
              />

              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-900 gap-1 flex-wrap">
                {!isShortVideo && (
                  <button
                    onClick={() =>
                      saveConfig({
                        ...config,
                        bgm_mode: "emotion",
                        use_single_bgm: false,
                        single_bgm: "",
                      })
                    }

                    className={`text-[9px] font-bold px-2 py-1 rounded transition cursor-pointer ${
                      activeBgmMode === "emotion"
                        ? "bg-gold-500 text-zinc-950 font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Por Emoção (IA)
                  </button>
                )}

                {!isShortVideo && (
                  <button
                    onClick={() =>
                      saveConfig({
                        ...config,
                        bgm_mode: "block",
                        use_single_bgm: false,
                        single_bgm: "",
                      })
                    }

                    className={`text-[9px] font-bold px-2 py-1 rounded transition cursor-pointer ${
                      activeBgmMode === "block"
                        ? "bg-gold-500 text-zinc-950 font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Por Bloco
                  </button>
                )}

                <button
                  onClick={() =>
                    saveConfig({
                      ...config,
                      use_single_bgm: true,
                      bgm_mode: "block",
                    })
                  }

                  className={`text-[9px] font-bold px-2 py-1 rounded transition cursor-pointer ${
                    activeBgmMode === "single"
                      ? "bg-gold-500 text-zinc-950 font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Trilha Única
                </button>
              </div>
            </div>

            {activeBgmMode === "emotion" ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 animate-fade-in">
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Trilha por emoção/temática
                  </span>

                  <p className="text-[11px] text-gray-500 leading-normal">
                    A IA planeja segmentos temporais pela narração — emoções
                    iguais adjacentes são fundidas automaticamente. Cada
                    segmento pode cobrir vários blocos.
                  </p>

                  <button
                    disabled={planningBgmEmotions || !hasApiKey}

                    onClick={handlePlanBgmEmotions}

                    className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-[10px] font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {planningBgmEmotions ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}

                    <span>
                      {planningBgmEmotions
                        ? "Planejando..."
                        : "Planejar trilhas por emoção (IA)"}
                    </span>
                  </button>
                </div>

                {bgmEmotionRows.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic px-1">
                    Nenhum segmento planejado. Clique no botão acima para gerar
                    o plano emocional.
                  </p>
                ) : (
                  bgmEmotionRows.map((seg: any) => (
                    <div key={seg.id} className="space-y-1">
                      <div className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-900 rounded-xl gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-white font-mono block truncate">
                            {seg.id} · {seg.emotion}
                          </span>

                          <span className="text-[10px] text-zinc-500 block">
                            {Number(seg.start).toFixed(1)}s →{" "}
                            {Number(seg.end).toFixed(1)}s
                            {seg.mood_label ? ` · ${seg.mood_label}` : ""}
                          </span>
                        </div>

                        <div className="flex gap-2 items-center shrink-0">
                          <select
                            value={seg.file}

                            onChange={(e) =>
                              handleEmotionMusicChange(
                                seg.id,
                                e.target.value,
                                seg
                              )
                            }

                            className="bg-zinc-900 border border-zinc-800 text-gray-300 hover:border-zinc-700 focus:outline-none rounded-lg px-2 py-1.5 text-xs cursor-pointer max-w-[180px] truncate"
                          >
                            <option value="">-- Nenhuma --</option>

                            {safeMusicFiles.map((file) => (
                              <option key={file.name} value={file.name}>
                                {file.name}
                              </option>
                            ))}
                          </select>

                          {seg.file && (
                            <button
                              onClick={() => togglePlayMusic(seg.file)}

                              className="text-gold-500 hover:text-gold-400 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 cursor-pointer shrink-0 transition"

                              title="Ouvir trilha"
                            >
                              {playingMusic === seg.file ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-gold-500" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {seg.search_theme && (
                        <div className="ml-2 px-3 py-1.5 text-[9px] text-zinc-500 border-l-2 border-gold-500/30">
                          🔍 {seg.search_theme}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : activeBgmMode === "single" ? (
              <div className="space-y-4 py-2 animate-fade-in">
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Trilha Sonora Única (Vídeo Inteiro)
                  </span>

                  <p className="text-[11px] text-gray-500 leading-normal">
                    Esta música tocará do início ao fim do vídeo, repetindo se
                    for menor do que a duração total. Recomendado para Shorts e
                    vídeos curtos. Arquivos{" "}
                    <span className="font-mono text-zinc-400">4.mp3</span>,{" "}
                    <span className="font-mono text-zinc-400">5.mp3</span>… na
                    pasta do projeto são trechos da{" "}
                    <strong className="text-zinc-400">narração</strong>, não BGM
                    — use Epidemic ou «Add Música».
                  </p>
                </div>

                {bgmSuggestions?.recommendation && (
                  <div className="bg-zinc-950 border border-gold-500/30 rounded-xl p-4 space-y-2 animate-fade-in relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-gold-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        ✨ Sugestão da IA
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              bgmSuggestions.recommendation || ""
                            );

                            toast.success("Ideia copiada!");
                          }}

                          className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded transition flex items-center gap-1 font-sans cursor-pointer"

                          title="Copiar sugestão"
                        >
                          <Copy className="w-3 h-3" /> Copiar Ideia
                        </button>

                        {(bgmSuggestions as any).search_theme && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                (bgmSuggestions as any).search_theme || ""
                              );

                              toast.success("Termo de busca copiado!");
                            }}

                            className="text-[10px] text-gold-500 hover:text-gold-400 px-2 py-0.5 bg-gold-950/20 border border-gold-500/30 hover:border-gold-500/50 rounded transition flex items-center gap-1 font-sans cursor-pointer"

                            title="Copiar termo de busca"
                          >
                            <Search className="w-3 h-3" /> Copiar Busca
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-300 leading-relaxed italic">
                      {bgmSuggestions.recommendation}
                    </p>

                    {(bgmSuggestions as any).search_theme && (
                      <div className="text-[10px] text-zinc-400 font-sans border-t border-zinc-900 pt-2 flex items-center gap-1.5">
                        <span className="font-bold text-gold-500">
                          🔍 Buscar por:
                        </span>

                        <code className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-zinc-300 select-all">
                          {(bgmSuggestions as any).search_theme}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">
                    Selecione a Trilha:
                  </label>

                  <div className="flex gap-2">
                    <select
                      value={config.single_bgm || ""}

                      onChange={(e) =>
                        saveConfig({
                          ...config,
                          single_bgm: e.target.value,
                          use_single_bgm: true,
                          bgm_mode: "block",
                        })
                      }

                      className="flex-1 bg-zinc-900 border border-zinc-800 text-gray-300 hover:border-zinc-700 focus:outline-none rounded-xl px-3 py-2 text-xs cursor-pointer"
                    >
                      <option value="">-- Nenhuma Selecionada --</option>

                      {safeMusicFiles.map((file) => (
                        <option key={file.name} value={file.name}>
                          {file.name}
                        </option>
                      ))}
                    </select>

                    {config.single_bgm && (
                      <button
                        onClick={() => togglePlayMusic(config.single_bgm!)}

                        className="text-gold-500 hover:text-gold-400 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 cursor-pointer transition flex items-center justify-center shrink-0 w-9 h-9"

                        title="Ouvir trilha"
                      >
                        {playingMusic === config.single_bgm ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 text-gold-500" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 animate-fade-in">
                {bgmBlockRows.map((bgm) => (
                  <div key={bgm.block} className="space-y-1">
                    <div className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-900 rounded-xl gap-4">
                      <span className="text-xs font-bold text-white font-mono shrink-0">
                        Bloco {bgm.block}
                      </span>

                      <div className="flex gap-2 items-center flex-1 justify-end min-w-0">
                        <select
                          value={bgm.file}

                          onChange={(e) =>
                            handleMusicChange(bgm.block, e.target.value)
                          }

                          className="bg-zinc-900 border border-zinc-800 text-gray-300 hover:border-zinc-700 focus:outline-none rounded-lg px-2 py-1.5 text-xs cursor-pointer max-w-[200px] truncate"
                        >
                          <option value="">-- Nenhuma --</option>

                          {safeMusicFiles.map((file) => (
                            <option key={file.name} value={file.name}>
                              {file.name}
                            </option>
                          ))}
                        </select>

                        {bgm.file && (
                          <button
                            onClick={() => togglePlayMusic(bgm.file)}

                            className="text-gold-500 hover:text-gold-400 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 cursor-pointer shrink-0 transition"

                            title="Ouvir trilha"
                          >
                            {playingMusic === bgm.file ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-gold-500" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const suggestion = bgmSuggestions?.suggestions?.find(
                        (s: any) => s.block === bgm.block
                      );

                      if (!suggestion) return null;

                      return (
                        <div className="ml-2 px-3 py-2 border-l-2 border-gold-500/40 bg-zinc-950/40 rounded-r space-y-1.5 animate-fade-in">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] text-gold-500 font-bold uppercase tracking-wider">
                              ✨ Sugestão da IA (Bloco {bgm.block})
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    suggestion.recommendation || ""
                                  );

                                  toast.success("Ideia do bloco copiada!");
                                }}

                                className="text-[9px] text-zinc-400 hover:text-white px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded transition flex items-center gap-1 font-sans cursor-pointer"

                                title="Copiar sugestão"
                              >
                                <Copy className="w-2.5 h-2.5" /> Copiar Ideia
                              </button>

                              {suggestion.search_theme && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      suggestion.search_theme || ""
                                    );

                                    toast.success("Busca do bloco copiada!");
                                  }}

                                  className="text-[9px] text-gold-500 hover:text-gold-400 px-1.5 py-0.5 bg-gold-950/20 border border-gold-500/30 rounded transition flex items-center gap-1 font-sans cursor-pointer"

                                  title="Copiar busca"
                                >
                                  <Search className="w-2.5 h-2.5" /> Copiar
                                  Busca
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-[10px] text-zinc-300 leading-relaxed italic">
                            {suggestion.recommendation}
                          </p>

                          {suggestion.search_theme && (
                            <div className="text-[9px] text-zinc-400 font-sans pt-1.5 border-t border-zinc-900 flex items-center gap-1.5">
                              <span className="font-bold text-gold-500">
                                🔍 Buscar:
                              </span>

                              <code className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-zinc-300 select-all">
                                {suggestion.search_theme}
                              </code>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available songs list */}

          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <SectionHeader
                title="Músicas Disponíveis"
                helpId="music-available"
                size="sm"
                titleClassName="tracking-widest uppercase text-xs"
              />

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {safeMusicFiles.length} música(s) BGM
                </span>

                <button
                  disabled={!safeMusicFiles.length}

                  onClick={handleDeleteAllMusic}

                  title="Excluir todas as trilhas deste projeto mantendo a narração"

                  className="bg-red-950/40 border border-red-900/60 hover:border-red-500/70 text-red-300 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpar Trilhas
                </button>

                <input
                  type="file"

                  accept="audio/mpeg,audio/mp3,audio/wav"

                  className="hidden"

                  id="general-bgm-upload"

                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];

                      try {
                        const res = await fetch(
                          getProjectUrl(
                            `/api/upload-bgm?filename=${encodeURIComponent(file.name)}`
                          ),
                          {
                            method: "POST",

                            headers: {
                              "Content-Type": file.type || "audio/mpeg",
                            },

                            body: file,
                          }
                        );

                        if (res.ok) {
                          toast.success(
                            `Música ${file.name} enviada com sucesso!`
                          );

                          fetchData();
                        } else {
                          toast.error("Erro ao enviar música.");
                        }
                      } catch (err) {
                        toast.error("Falha de conexão ao enviar música.");
                      }
                    }
                  }}
                />

                <label
                  htmlFor="general-bgm-upload"

                  className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Add Música
                </label>

                <button
                  disabled={suggestingBGM || !hasApiKey}

                  onClick={handleSuggestBGM}

                  title="Gera apenas ideias de trilha. A escolha do arquivo continua manual em Por Bloco ou Trilha Única."

                  className="bg-zinc-900 border border-zinc-800 hover:border-gold-500/50 text-gold-500 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {suggestingBGM ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}

                  <span>
                    {suggestingBGM ? "Analisando..." : "Ideias de BGM com IA"}
                  </span>
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />

              <input
                type="text"

                placeholder="Pesquisar música..."

                value={searchMusic}

                onChange={(e) => setSearchMusic(e.target.value)}

                className="w-full bg-zinc-950 border border-zinc-855 focus:outline-none focus:border-gold-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white"
              />
            </div>

            {safeMusicFiles

              .filter((m) =>
                m.name.toLowerCase().includes(searchMusic.toLowerCase())
              )

              .map((file) => (
                <div
                  key={file.name}
                  className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl flex justify-between items-center gap-4"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      onClick={() => togglePlayMusic(file.name)}

                      className="text-gold-500 hover:text-gold-400 p-1.5 rounded-lg bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 cursor-pointer shrink-0 transition"

                      title="Ouvir música"
                    >
                      {playingMusic === file.name ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-gold-500" />
                      )}
                    </button>

                    <span
                      className="text-xs text-gray-300 truncate font-medium"
                      title={file.name}
                    >
                      {file.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-zinc-500">
                      {getFormatBytes(file.sizeBytes)}
                    </span>

                    <button
                      onClick={() => handleDeleteMusic(file.name)}

                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg bg-red-950/25 border border-red-900/40 hover:bg-red-950/50 cursor-pointer transition"

                      title="Excluir trilha"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Integração Epidemic Sound */}

        <div className="glass-panel p-6 rounded-3xl space-y-6 mt-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
            <div>
              <SectionHeader
                title="API EPIDEMIC SOUND (MCP SSE)"
                helpId="epidemic-sound"
                icon={<Music className="w-5 h-5 text-gold-500" />}
                subtitle="Busque faixas e efeitos sonoros livres de copyright diretamente do catálogo da Epidemic Sound ou gere uma trilha sonora inteligente automática baseada no seu roteiro."
              />
            </div>

            {hasEpidemicKey ? (
              <div className="flex gap-2.5 flex-wrap">
                <button
                  disabled={autoSoundtracking}
                  onClick={handleAutoSoundtrack}
                  className="bg-gradient-to-r from-dash-primary to-dash-primary-dark hover:from-dash-primary-dark hover:to-dash-primary disabled:opacity-50 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition shadow-lg shadow-dash-primary/15 cursor-pointer flex items-center gap-2"
                  title="Detecta sentimentos e monta a trilha sonora (BGM) por bloco ou emoção automaticamente"
                >
                  {autoSoundtracking ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {autoSoundtracking
                      ? "Processando BGM..."
                      : "Sonoplastia IA Inteligente (BGM)"}
                  </span>
                </button>

                <button
                  disabled={planningProfessionalSfx}
                  onClick={handlePlanProfessionalSfx}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/15 cursor-pointer flex items-center gap-2"
                  title="Analisa o storyboard e a narração para desenhar, baixar e posicionar efeitos sonoros (SFX) profissionais"
                >
                  {planningProfessionalSfx ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {planningProfessionalSfx
                      ? "Planejando SFX..."
                      : "Sonoplastia SFX Profissional"}
                  </span>
                </button>
              </div>
            ) : (
              <span className="text-xs bg-red-950/40 border border-red-800 text-red-400 px-3 py-1.5 rounded-xl font-bold font-sans">
                ⚠️ Configure a Chave da API nas Configurações para habilitar a
                busca e automação
              </span>
            )}
          </div>

          {hasEpidemicKey && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Search and Filters Column */}

              <div className="lg:col-span-1 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">
                    Tipo de Busca
                  </label>

                  <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-900">
                    <button
                      onClick={() => {
                        setEpidemicSearchType("bgm");
                        setEpidemicSearchResults([]);
                      }}

                      className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${epidemicSearchType === "bgm" ? "bg-gold-500 text-zinc-950" : "text-zinc-400 hover:text-white"}`}
                    >
                      Músicas (BGM)
                    </button>

                    <button
                      onClick={() => {
                        setEpidemicSearchType("sfx");
                        setEpidemicSearchResults([]);
                      }}

                      className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${epidemicSearchType === "sfx" ? "bg-gold-500 text-zinc-950" : "text-zinc-400 hover:text-white"}`}
                    >
                      Efeitos (SFX)
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">
                    Buscar por Termo
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"

                      value={epidemicSearchQuery}

                      onChange={(e) => setEpidemicSearchQuery(e.target.value)}

                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearchEpidemic();
                      }}

                      placeholder={
                        epidemicSearchType === "bgm"
                          ? "Ex: cinematic ancient tension..."
                          : "Ex: whoosh, desert wind..."
                      }

                      className="flex-1 bg-zinc-950 border border-zinc-850 focus:outline-none focus:border-gold-500 rounded-xl px-4 py-2.5 text-xs text-white"
                    />

                    <button
                      onClick={handleSearchEpidemic}

                      disabled={searchingEpidemic}

                      className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center"
                    >
                      {searchingEpidemic ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-4 space-y-3">
                  <h5 className="text-xs font-bold text-white tracking-wide">
                    Como Funciona?
                  </h5>

                  <ul className="text-[10px] text-zinc-400 space-y-2 leading-relaxed list-disc list-inside font-sans">
                    <li>
                      <strong>Músicas (BGM)</strong>: Quando baixadas, são
                      salvas no projeto e associadas ao bloco desejado ou como
                      trilha sonora única.
                    </li>

                    <li>
                      <strong>Efeitos (SFX)</strong>: São salvos diretamente na
                      pasta <code>ASSETS/</code> como <code>sfx_*.mp3</code>{" "}
                      para uso em cortes de vídeo.
                    </li>

                    <li>
                      <strong>Sonoplastia IA Inteligente</strong>: Analisa o
                      roteiro do vídeo e temas recomendados para baixar e mapear
                      automaticamente todas as faixas.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Results Column */}

              <div className="lg:col-span-2 space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">
                    Resultados da Busca
                  </label>

                  <span className="text-[10px] text-zinc-500 font-mono">
                    {safeEpidemicResults.length} encontrados
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2">
                  {safeEpidemicResults.length === 0 ? (
                    <div className="h-[200px] border border-dashed border-zinc-850 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                      <Music className="w-8 h-8 text-zinc-700 mb-2" />

                      <p className="text-xs text-zinc-500">
                        Nenhum resultado para exibir. Faça uma busca no painel
                        ao lado.
                      </p>
                    </div>
                  ) : (
                    safeEpidemicResults.map((track) => (
                      <div
                        key={track.id}
                        className="p-3 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-xl flex items-center justify-between gap-4 transition group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {track.previewUrl && (
                            <button
                              onClick={() => togglePlayMusic(track.previewUrl)}

                              className="text-gold-500 hover:text-gold-400 p-2 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 cursor-pointer shrink-0 transition"

                              title="Ouvir demonstração"
                            >
                              {playingMusic === track.previewUrl ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-gold-500" />
                              )}
                            </button>
                          )}

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {track.title}
                            </p>

                            <p className="text-[10px] text-zinc-400 font-sans mt-0.5 truncate">
                              {track.artist && <span>{track.artist}</span>}

                              {track.bpm && (
                                <span className="ml-2 px-1 py-0.5 bg-zinc-900 rounded text-zinc-500 text-[9px] font-mono">
                                  {track.bpm} BPM
                                </span>
                              )}

                              {track.duration && (
                                <span className="ml-2 font-mono text-[9px] text-zinc-500">
                                  {Math.round(track.duration / 1000)}s
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {epidemicSearchType === "bgm" ? (
                            <>
                              {/* Mapear para bloco específico */}

                              <div className="hidden group-hover:flex items-center gap-1 animate-fade-in">
                                <select
                                  onChange={(e) => {
                                    const block = Number(e.target.value);

                                    if (block > 0) {
                                      handleDownloadEpidemic(track, block);

                                      e.target.value = ""; // reset dropdown
                                    }
                                  }}

                                  disabled={downloadingEpidemicId !== null}

                                  className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 hover:border-zinc-700 rounded px-1.5 py-1 cursor-pointer focus:outline-none"
                                >
                                  <option value="">Map Bloco...</option>

                                  {Array.from(
                                    {
                                      length: Math.max(
                                        1,
                                        (config.bgm_mappings || []).length ||
                                          (
                                            storyboardData?.bgm_recommendations ||
                                            []
                                          ).length ||
                                          10
                                      ),
                                    },
                                    (_, i) => i + 1
                                  ).map((num) => (
                                    <option key={num} value={num}>
                                      Bloco {num}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <button
                                disabled={downloadingEpidemicId !== null}

                                onClick={() => handleDownloadEpidemic(track)}

                                className="bg-zinc-900 border border-zinc-800 hover:border-gold-500/50 hover:bg-gold-500/10 text-gold-500 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                              >
                                {downloadingEpidemicId === track.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}

                                <span>Trilha Única</span>
                              </button>
                            </>
                          ) : (
                            <button
                              disabled={downloadingEpidemicId !== null}

                              onClick={() => handleDownloadEpidemic(track)}

                              className="bg-zinc-900 border border-zinc-800 hover:border-gold-500/50 hover:bg-gold-500/10 text-gold-500 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              {downloadingEpidemicId === track.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}

                              <span>Baixar SFX</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashminProjectTabLayout>
  );
}
