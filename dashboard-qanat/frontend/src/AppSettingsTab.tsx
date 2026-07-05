import toast from "react-hot-toast";
import React from "react";
import { CheckCircle, Chrome, RefreshCw, Save, Settings } from "lucide-react";
import { DashminPageLayout } from "./DashminPageLayout";
import { SectionHeader } from "./SectionHeader";
import { SettingsSectionNav, type SettingsSection } from "./SettingsSectionNav";
import { SettingHelpTip, SettingLabel } from "./SettingHelpTip";
import { SettingsApiKeys } from "./SettingsApiKeys";
import { VisualSettings } from "./VisualSettings";
import { SettingsProduction } from "./SettingsProduction";
import { IntegrationSettings } from "./IntegrationSettings";
import type { ConfigData } from "./appTypes";
import type { ProductionConfig } from "./productionConfig";
import type { VisualConfig } from "./VisualSettings";

export type AppSettingsTabProps = {
  activeProject: string;
  aiProvider: string;
  applyProductionPatchToConfig: (cfg: ConfigData, patch: any) => ConfigData;
  applyVisualPatchToConfig: (cfg: ConfigData, patch: any) => ConfigData;
  canvaClientId: string;
  canvaClientSecret: string;
  config: ConfigData | null;
  epidemicKeyInput: string;
  formatSelector: "LONGO" | "SHORTS";
  fetchUploadStatus: () => void | Promise<void>;
  geminiBrowserMode: boolean;
  geminiExtensionDiag: string;
  geminiExtensionReady: boolean | null;
  geminiExtensionTesting: boolean;
  geminiKeyCount: number;
  geminiKeysInput: string;
  geminiModel: string;
  geminiModelOptions: Array<{ id: string; label: string; hint?: string }>;
  inferenceModel: string;
  inferenceModelOptions: Array<{ id: string; label: string; hint?: string }>;
  globalBlockGap: number;
  globalDebugOverlay: boolean;
  globalFps: number;
  globalMusicVolume: number;
  globalRenderResolution: string;
  globalStudioProduction: ProductionConfig;
  globalStudioVisual: VisualConfig;
  globalUseRemotion: boolean;
  saveGlobalStudioDefaults: (patch: {
    visual?: Record<string, unknown>;
    production?: Record<string, unknown>;
  }) => Promise<unknown>;
  handleClearProjectRenderResolution: () => void | Promise<void>;
  handleRelinkYoutube: () => void | Promise<void>;
  handleSaveAiSettings: () => void | Promise<void>;
  handleSaveApiKeys: () => void | Promise<void>;
  handleSaveGlobalRenderConfig: () => void | Promise<void>;
  handleSaveProjectRenderResolution: () => void | Promise<void>;
  handleTestSupermemory: () => void | Promise<void>;
  hasEpidemicKey: boolean;
  hasInferenceKey: boolean;
  hasNvidiaKey: boolean;
  hasOpenRouterKey: boolean;
  hasPexelsKey: boolean;
  hasPixabayKey: boolean;
  hasSupermemoryKey: boolean;
  hasXaiKey: boolean;
  igAccessToken: string;
  igAccountId: string;
  igAppId: string;
  igAppSecret: string;
  inferenceKeyInput: string;
  nvidiaKeyInput: string;
  openrouterKeyInput: string;
  pexelsKeyInput: string;
  pickProductionConfig: (cfg: ConfigData) => any;
  pickVisualConfig: (cfg: ConfigData) => any;
  pixabayKeyInput: string;
  productionDraftToApiPatch: (draft: any) => any;
  projectDataLoading: boolean;
  projectRenderResolution: string;
  refreshGeminiExtensionStatus: () => Promise<any>;
  resolutionConfigScope: "global" | "project";
  saveConfigPatch: (
    patch: Partial<ConfigData>,
    opts?: { skipRefresh?: boolean }
  ) => void | Promise<void>;
  savingAiSettings: boolean;
  savingApiKeys: boolean;
  savingGlobalConfig: boolean;
  savingProductionConfig: boolean;
  savingProjectResolution: boolean;
  savingVisualConfig: boolean;
  setAiProvider: (v: string) => void;
  setCanvaClientId: (v: string) => void;
  setCanvaClientSecret: (v: string) => void;
  setConfig: React.Dispatch<React.SetStateAction<ConfigData | null>>;
  setEpidemicKeyInput: (v: string) => void;
  setGeminiBrowserMode: (v: boolean) => void;
  setGeminiExtensionTesting: (v: boolean) => void;
  setGeminiKeysInput: (v: string) => void;
  setGeminiModel: (v: string) => void;
  setInferenceModel: (v: string) => void;
  setGlobalBlockGap: (v: number) => void;
  setGlobalDebugOverlay: (v: boolean) => void;
  setGlobalFps: (v: number) => void;
  setGlobalMusicVolume: (v: number) => void;
  setGlobalRenderResolution: (v: string) => void;
  setGlobalUseRemotion: (v: boolean) => void;
  setIgAccessToken: (v: string) => void;
  setIgAccountId: (v: string) => void;
  setIgAppId: (v: string) => void;
  setIgAppSecret: (v: string) => void;
  setInferenceKeyInput: (v: string) => void;
  setNvidiaKeyInput: (v: string) => void;
  setOpenRouterKeyInput: (v: string) => void;
  setPexelsKeyInput: (v: string) => void;
  setPixabayKeyInput: (v: string) => void;
  setProjectRenderResolution: (v: string) => void;
  setResolutionConfigScope: (v: "global" | "project") => void;
  setSavingProductionConfig: (v: boolean) => void;
  setSavingVisualConfig: (v: boolean) => void;
  setSettingsSection: (s: SettingsSection) => void;
  setSupermemoryBaseUrlInput: (v: string) => void;
  setSupermemoryEnabled: (v: boolean) => void;
  setSupermemoryKeyInput: (v: string) => void;
  setXaiKeyInput: (v: string) => void;
  setYtClientId: (v: string) => void;
  setYtClientSecret: (v: string) => void;
  settingsSection: SettingsSection;
  supermemoryBaseUrlInput: string;
  supermemoryEnabled: boolean;
  supermemoryKeyInput: string;
  testingSupermemory: boolean;
  uploadStatus: any;
  visualDraftToApiPatch: (draft: any) => any;
  xaiKeyInput: string;
  ytClientId: string;
  ytClientSecret: string;
};

export function AppSettingsTab({
  activeProject,
  aiProvider,
  applyProductionPatchToConfig,
  applyVisualPatchToConfig,
  canvaClientId,
  canvaClientSecret,
  config,
  epidemicKeyInput,
  formatSelector,
  fetchUploadStatus,
  geminiBrowserMode,
  geminiExtensionDiag,
  geminiExtensionReady,
  geminiExtensionTesting,
  geminiKeyCount,
  geminiKeysInput,
  geminiModel,
  geminiModelOptions,
  inferenceModel,
  inferenceModelOptions,
  globalBlockGap,
  globalDebugOverlay,
  globalFps,
  globalMusicVolume,
  globalRenderResolution,
  globalStudioProduction,
  globalStudioVisual,
  globalUseRemotion,
  saveGlobalStudioDefaults,
  handleClearProjectRenderResolution,
  handleRelinkYoutube,
  handleSaveAiSettings,
  handleSaveApiKeys,
  handleSaveGlobalRenderConfig,
  handleSaveProjectRenderResolution,
  handleTestSupermemory,
  hasEpidemicKey,
  hasInferenceKey,
  hasNvidiaKey,
  hasOpenRouterKey,
  hasPexelsKey,
  hasPixabayKey,
  hasSupermemoryKey,
  hasXaiKey,
  igAccessToken,
  igAccountId,
  igAppId,
  igAppSecret,
  inferenceKeyInput,
  nvidiaKeyInput,
  openrouterKeyInput,
  pexelsKeyInput,
  pickProductionConfig,
  pickVisualConfig,
  pixabayKeyInput,
  productionDraftToApiPatch,
  projectDataLoading,
  projectRenderResolution,
  refreshGeminiExtensionStatus,
  resolutionConfigScope,
  saveConfigPatch,
  savingAiSettings,
  savingApiKeys,
  savingGlobalConfig,
  savingProductionConfig,
  savingProjectResolution,
  savingVisualConfig,
  setAiProvider,
  setCanvaClientId,
  setCanvaClientSecret,
  setConfig,
  setEpidemicKeyInput,
  setGeminiBrowserMode,
  setGeminiExtensionTesting,
  setGeminiKeysInput,
  setGeminiModel,
  setInferenceModel,
  setGlobalBlockGap,
  setGlobalDebugOverlay,
  setGlobalFps,
  setGlobalMusicVolume,
  setGlobalRenderResolution,
  setGlobalUseRemotion,
  setIgAccessToken,
  setIgAccountId,
  setIgAppId,
  setIgAppSecret,
  setInferenceKeyInput,
  setNvidiaKeyInput,
  setOpenRouterKeyInput,
  setPexelsKeyInput,
  setPixabayKeyInput,
  setProjectRenderResolution,
  setResolutionConfigScope,
  setSavingProductionConfig,
  setSavingVisualConfig,
  setSettingsSection,
  setSupermemoryBaseUrlInput,
  setSupermemoryEnabled,
  setSupermemoryKeyInput,
  setXaiKeyInput,
  setYtClientId,
  setYtClientSecret,
  settingsSection,
  supermemoryBaseUrlInput,
  supermemoryEnabled,
  supermemoryKeyInput,
  testingSupermemory,
  uploadStatus,
  visualDraftToApiPatch,
  xaiKeyInput,
  ytClientId,
  ytClientSecret,
}: AppSettingsTabProps) {
  return (
    <DashminPageLayout
      title="Configurações"
      subtitle="IA, APIs, render global, visual, produção e integrações do estúdio."
      breadcrumb={["Dashboard", "Configurações"]}
      icon={<Settings className="w-5 h-5" />}
    >
      <SettingsSectionNav
        active={settingsSection}
        onChange={setSettingsSection}
      />
      <div className="lumiera-panel-stack font-sans min-w-0">
        {settingsSection === "ia" && (
          <div className="glass-panel p-6 rounded-3xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--dash-border)] pb-4">
              <div>
                <SectionHeader
                  title="CONFIGURAÇÕES DE IA"
                  helpId="settings-ia"
                  icon={
                    <Settings className="w-4 h-4 text-[var(--dash-primary)]" />
                  }
                  subtitle={
                    <>
                      Provedor e chaves de IA. Use o{" "}
                      <span className="text-[var(--dash-primary)]">?</span> ao
                      lado de cada opção para entender o efeito.
                    </>
                  }
                />
              </div>

              <div className="flex items-center gap-2 text-[10px]">
                <span className="dash-kpi-pill">
                  Gemini: {geminiKeyCount} chave(s)
                </span>

                <span className="dash-kpi-pill">
                  xAI: {hasXaiKey ? "configurado" : "vazio"}
                </span>
                <span className="dash-kpi-pill">
                  NVIDIA API: {hasNvidiaKey ? "configurado" : "vazio"}
                </span>
                <span className="dash-kpi-pill">
                  Inference.net: {hasInferenceKey ? "configurado" : "vazio"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <button
                onClick={() => setAiProvider("gemini")}
                className={`dash-provider-card ${aiProvider === "gemini" ? "dash-provider-card-active" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    Gemini
                    <SettingHelpTip title="Gemini" align="start">
                      Google AI Studio (gratuito). Roteiro, overlays, metadados
                      e ideias. Suporta rotação de várias chaves.
                    </SettingHelpTip>
                  </span>

                  {aiProvider === "gemini" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>

                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  Google AI Studio gratuito (ex.: Gemini 2.5 Flash). Chaves em
                  rotação; xAI/Grok como fallback.
                </p>
              </button>

              <button
                onClick={() => setAiProvider("xai")}
                className={`dash-provider-card ${aiProvider === "xai" ? "dash-provider-card-active" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    Grok / xAI
                    <SettingHelpTip title="Grok / xAI" align="start">
                      API da xAI como provedor principal. Útil quando preferir
                      Grok ou como fallback após esgotar chaves Gemini.
                    </SettingHelpTip>
                  </span>

                  {aiProvider === "xai" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>

                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  Usa a API da xAI como provedor principal para metadados quando
                  selecionado.
                </p>
              </button>

              <button
                onClick={() => setAiProvider("openrouter")}
                className={`dash-provider-card ${aiProvider === "openrouter" ? "dash-provider-card-active" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    OpenRouter
                    <SettingHelpTip title="OpenRouter" align="start">
                      Agregador com modelos free (Gemini, Llama, Qwen).
                      Alternativa quando quiser variar modelos sem múltiplas
                      contas.
                    </SettingHelpTip>
                  </span>

                  {aiProvider === "openrouter" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>

                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  Usa a API do OpenRouter com rotação de modelos free do Gemini,
                  Llama e Qwen.
                </p>
              </button>

              <button
                onClick={() => setAiProvider("nvidia")}
                className={`dash-provider-card ${aiProvider === "nvidia" ? "dash-provider-card-active" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    NVIDIA API
                    <SettingHelpTip title="NVIDIA API" align="start">
                      Chamadas de IA de alto desempenho via NVIDIA API com
                      múltiplos modelos (Minimax, Qwen, Kimi, GLM, Deepseek).
                    </SettingHelpTip>
                  </span>

                  {aiProvider === "nvidia" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>

                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  Usa a API da NVIDIA com múltiplos modelos integrados e
                  rotação/fallback.
                </p>
              </button>

              <button
                onClick={() => setAiProvider("inference")}
                className={`dash-provider-card ${aiProvider === "inference" ? "dash-provider-card-active" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    Inference.net
                    <SettingHelpTip title="Inference.net" align="start">
                      API OpenAI-compatible com modelos open-source hospedados
                      (Gemma, Qwen, Llama). Observabilidade via Catalyst no
                      dashboard inference.net.
                    </SettingHelpTip>
                  </span>

                  {aiProvider === "inference" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>

                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  Modelos open-source hospedados na Inference.net com rotação
                  automática de fallback.
                </p>
              </button>
            </div>

            <div
              className={`dash-settings-card transition ${geminiBrowserMode ? "border-[rgba(130,128,253,0.4)]" : ""}`}
              style={
                geminiBrowserMode
                  ? { background: "rgba(130, 128, 253, 0.08)" }
                  : undefined
              }
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white font-sans flex items-center gap-2">
                    <Chrome className="w-4 h-4 text-violet-400" />
                    Gemini no Chrome (extensão)
                    <SettingHelpTip title="Extensão Chrome" align="start">
                      Envia prompts pelo gemini.google.com na sua sessão Google,
                      sem API key. Requer a extensão Lumiera Gemini Bridge
                      instalada no Chrome.
                    </SettingHelpTip>
                  </p>
                  <p className="text-[10px] text-zinc-400 leading-relaxed max-w-xl">
                    Ativa todas as chamadas de IA via Gemini no Chrome, de forma
                    autônoma (sem copiar/colar). Requer a extensão Lumiera em
                    tools/lumiera-gemini-bridge — ela controla gemini.google.com
                    na sua sessão Google. Quando ativo, tem prioridade sobre
                    NVIDIA/xAI/OpenRouter. Desligado, usa o provedor selecionado
                    acima.
                  </p>
                  {geminiBrowserMode && (
                    <div className="space-y-1.5">
                      <p
                        className={`text-[9px] ${geminiExtensionReady ? "text-emerald-300/90" : "text-amber-300/90"}`}
                      >
                        Extensão:{" "}
                        {geminiExtensionReady === null
                          ? "verificando…"
                          : geminiExtensionReady
                            ? `ativa — ${geminiExtensionDiag || "automação OK"}`
                            : "não conectada"}
                      </p>
                      {geminiExtensionDiag && !geminiExtensionReady && (
                        <p className="text-[9px] text-amber-200/80 leading-relaxed max-w-xl">
                          {geminiExtensionDiag}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={geminiExtensionTesting}
                        onClick={async () => {
                          setGeminiExtensionTesting(true);
                          try {
                            const d = await refreshGeminiExtensionStatus();
                            if (d.pingOk)
                              toast.success(
                                `Extensão OK ${d.version ? `(v${d.version})` : ""}`
                              );
                            else {
                              const err = d.error || "Extensão não conectada";
                              toast.error(
                                /recarregada|F5/i.test(err)
                                  ? `${err} Pressione F5 agora.`
                                  : err,
                                { duration: 10000 }
                              );
                            }
                          } finally {
                            setGeminiExtensionTesting(false);
                          }
                        }}
                        className="text-[9px] text-violet-300 hover:text-violet-100 border border-violet-500/30 px-2 py-1 rounded-lg transition disabled:opacity-50"
                      >
                        {geminiExtensionTesting
                          ? "Testando…"
                          : "Testar extensão"}
                      </button>
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <span className="text-[10px] text-zinc-400">
                    {geminiBrowserMode ? "Ativo" : "Desligado"}
                  </span>
                  <input
                    type="checkbox"
                    checked={geminiBrowserMode}
                    onChange={(e) => setGeminiBrowserMode(e.target.checked)}
                    className="dash-checkbox"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <SettingLabel
                    helpTitle="Modelo Gemini"
                    help="Versão do modelo usada nas chamadas de IA. Flash é rápido e econômico; Pro tem mais raciocínio. Afeta roteiro, overlays e metadados."
                    align="start"
                  >
                    Modelo Gemini
                  </SettingLabel>

                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="dash-select"
                  >
                    {geminiModelOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    {geminiModelOptions.find(
                      (option) => option.id === geminiModel
                    )?.hint ||
                      "Gratuito no Google AI Studio com chave de API."}{" "}
                    Recomendado:{" "}
                    <span className="text-zinc-300">Gemini 2.5 Flash</span>{" "}
                    (rápido, contexto 1M).
                  </p>
                </div>

                {aiProvider === "inference" && (
                  <div className="space-y-2">
                    <SettingLabel
                      helpTitle="Modelo Inference.net"
                      help="Modelo hospedado na Inference.net usado nas chamadas de IA. Se falhar, o sistema tenta os outros modelos da lista como fallback."
                      align="start"
                    >
                      Modelo Inference.net
                    </SettingLabel>

                    <select
                      value={inferenceModel}
                      onChange={(e) => setInferenceModel(e.target.value)}
                      className="dash-select"
                    >
                      {inferenceModelOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      {inferenceModelOptions.find(
                        (option) => option.id === inferenceModel
                      )?.hint ||
                        "Modelo open-source hospedado em inference.net."}{" "}
                      ID:{" "}
                      <span className="text-zinc-300 font-mono text-[9px]">
                        {inferenceModel}
                      </span>
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <SettingLabel
                    helpTitle="Chaves Gemini"
                    help="Uma chave por linha. O sistema rotaciona automaticamente quando uma atinge limite de quota. Deixe vazio para manter as chaves já salvas."
                    align="start"
                  >
                    Chaves Gemini
                  </SettingLabel>

                  <textarea
                    value={geminiKeysInput}
                    onChange={(e) => setGeminiKeysInput(e.target.value)}
                    placeholder="Cole uma ou várias chaves Gemini, uma por linha. Deixe vazio para manter as atuais."
                    className="dash-textarea h-32"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <SettingLabel
                      helpTitle="Chave OpenRouter"
                      help="Opcional. Chave personalizada do openrouter.ai. Se vazia, usa a chave padrão do sistema para modelos free."
                      align="start"
                    >
                      Chave OpenRouter
                    </SettingLabel>

                    {hasOpenRouterKey ? (
                      <span className="dash-ui-badge dash-ui-badge-success dash-ui-badge-pill">
                        Ativa (Personalizada)
                      </span>
                    ) : (
                      <span className="dash-ui-badge dash-ui-badge-warning dash-ui-badge-pill">
                        Ativa (Padrão do Sistema)
                      </span>
                    )}
                  </div>

                  <input
                    type="password"
                    value={openrouterKeyInput}
                    onChange={(e) => setOpenRouterKeyInput(e.target.value)}
                    placeholder="Deixe vazio para usar a padrão ou cole uma chave personalizada."
                    className="dash-input"
                  />

                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Opcional. Se não fornecida, o sistema usará a chave privada
                    pré-configurada.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <SettingLabel
                      helpTitle="Chave NVIDIA API"
                      help="Chave da API da NVIDIA. Necessária para usar os modelos de IA da NVIDIA."
                      align="start"
                    >
                      Chave NVIDIA API
                    </SettingLabel>

                    {hasNvidiaKey ? (
                      <span className="dash-ui-badge dash-ui-badge-success dash-ui-badge-pill">
                        Configurada
                      </span>
                    ) : (
                      <span className="dash-ui-badge dash-ui-badge-danger dash-ui-badge-pill">
                        Não Configurada
                      </span>
                    )}
                  </div>

                  <input
                    type="password"
                    value={nvidiaKeyInput}
                    onChange={(e) => setNvidiaKeyInput(e.target.value)}
                    placeholder="Cole a chave NVIDIA API. Deixe vazio para manter a atual."
                    className="dash-input"
                  />

                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    A chave da NVIDIA será usada quando você selecionar NVIDIA
                    API como provedor.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <SettingLabel
                      helpTitle="Chave Inference.net"
                      help="Chave sk-inference-... do dashboard inference.net. Necessária para usar modelos hospedados na plataforma."
                      align="start"
                    >
                      Chave Inference.net
                    </SettingLabel>

                    {hasInferenceKey ? (
                      <span className="dash-ui-badge dash-ui-badge-success dash-ui-badge-pill">
                        Configurada
                      </span>
                    ) : (
                      <span className="dash-ui-badge dash-ui-badge-danger dash-ui-badge-pill">
                        Não Configurada
                      </span>
                    )}
                  </div>

                  <input
                    type="password"
                    value={inferenceKeyInput}
                    onChange={(e) => setInferenceKeyInput(e.target.value)}
                    placeholder="Cole a chave sk-inference-.... Deixe vazio para manter a atual."
                    className="dash-input"
                  />

                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Obtenha em inference.net → API Keys. Usada quando
                    Inference.net estiver selecionado como provedor.
                  </p>
                </div>

                <div className="space-y-2">
                  <SettingLabel
                    helpTitle="Chave xAI / Grok"
                    help="Chave da API xAI. Usada como provedor principal se Grok estiver selecionado, ou como fallback quando todas as chaves Gemini falharem."
                    align="start"
                  >
                    Chave xAI / Grok
                  </SettingLabel>

                  <input
                    type="password"
                    value={xaiKeyInput}
                    onChange={(e) => setXaiKeyInput(e.target.value)}
                    placeholder="Cole a chave xAI. Deixe vazio para manter a atual."
                    className="dash-input"
                  />

                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    A xAI será usada como fallback quando o Gemini esgotar todas
                    as chaves ou como principal se você selecionar Grok / xAI.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveAiSettings}
                disabled={savingAiSettings}
                className="dash-btn-primary text-xs px-5 py-2.5 flex items-center gap-2"
              >
                {savingAiSettings ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}

                <span>
                  {savingAiSettings ? "Salvando..." : "Salvar Configurações"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* SEÇÃO LOGOTIPO DO VÍDEO */}

        {settingsSection === "apis" && (
          <SettingsApiKeys
            epidemicKeyInput={epidemicKeyInput}
            setEpidemicKeyInput={setEpidemicKeyInput}
            hasEpidemicKey={hasEpidemicKey}
            pexelsKeyInput={pexelsKeyInput}
            setPexelsKeyInput={setPexelsKeyInput}
            pixabayKeyInput={pixabayKeyInput}
            setPixabayKeyInput={setPixabayKeyInput}
            hasPexelsKey={hasPexelsKey}
            hasPixabayKey={hasPixabayKey}
            supermemoryKeyInput={supermemoryKeyInput}
            setSupermemoryKeyInput={setSupermemoryKeyInput}
            hasSupermemoryKey={hasSupermemoryKey}
            supermemoryEnabled={supermemoryEnabled}
            setSupermemoryEnabled={setSupermemoryEnabled}
            supermemoryBaseUrlInput={supermemoryBaseUrlInput}
            setSupermemoryBaseUrlInput={setSupermemoryBaseUrlInput}
            testingSupermemory={testingSupermemory}
            onTestSupermemory={handleTestSupermemory}
            saving={savingApiKeys}
            onSave={handleSaveApiKeys}
          />
        )}

        {/* CONFIGURAÇÕES GLOBAIS DE RENDERIZAÇÃO */}

        {settingsSection === "render" && (
          <div className="glass-panel p-6 rounded-3xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--dash-border)] pb-4">
              <div>
                <SectionHeader
                  title="CONFIGURAÇÕES GLOBAIS DE RENDERIZAÇÃO"
                  helpId="settings-render"
                  icon={
                    <Settings className="w-4 h-4 text-[var(--dash-primary)]" />
                  }
                  subtitle={
                    <>
                      Parâmetros de render e áudio. Use o{" "}
                      <span className="text-[var(--dash-primary)]">?</span> em
                      cada campo para detalhes.
                    </>
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                {/* Volume da Música */}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <SettingLabel
                      helpTitle="Volume BGM"
                      help="Volume da música de fundo no mix final. 15% é o padrão recomendado para a trilha não competir com a narração."
                      align="start"
                    >
                      Volume da Trilha Sonora (BGM)
                    </SettingLabel>

                    <span className="text-xs text-white font-mono font-bold">
                      {(globalMusicVolume * 100).toFixed(0)}%
                    </span>
                  </div>

                  <input
                    type="range"

                    min="0.01"

                    max="0.5"

                    step="0.01"

                    value={globalMusicVolume}

                    onChange={(e) =>
                      setGlobalMusicVolume(parseFloat(e.target.value))
                    }

                    className="dash-range"
                  />

                  <p className="text-[9px] text-[var(--dash-muted)]">
                    Volume atenuado padrão (15% recomendado) para evitar que a
                    música encubra a narração.
                  </p>
                </div>

                {/* Espaçamento entre Blocos (Gap) */}

                <div className="space-y-2">
                  <SettingLabel
                    helpTitle="Gap entre blocos"
                    help="Segundos extras no fim de cada bloco de cenas antes do próximo. Dá respiro à narração e evita cortes abruptos entre capítulos."
                    align="start"
                  >
                    Espaçamento entre Blocos (Gap)
                  </SettingLabel>

                  <div className="dash-input-group">
                    <input
                      type="number"

                      step="0.5"

                      min="0"

                      value={globalBlockGap}

                      onChange={(e) =>
                        setGlobalBlockGap(parseFloat(e.target.value) || 0)
                      }

                      className="dash-input text-xs font-mono"
                    />

                    <span className="dash-input-suffix">segundos</span>
                  </div>

                  <p className="text-[9px] text-zinc-500">
                    Segundos extras adicionados ao final de cada bloco de cenas
                    (2.0s padrão) para respiro da locução.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Taxa de Quadros (FPS) */}

                <div className="space-y-2">
                  <SettingLabel
                    helpTitle="FPS"
                    help="Quadros por segundo na renderização Remotion. 30 FPS é padrão web; 24 FPS é mais cinematográfico; 60 FPS é mais fluido porém mais pesado."
                    align="start"
                  >
                    Taxa de Quadros (FPS)
                  </SettingLabel>

                  <select
                    value={globalFps}

                    onChange={(e) =>
                      setGlobalFps(parseInt(e.target.value) || 30)
                    }

                    className="dash-select"
                  >
                    <option value={24}>24 FPS (Cinematográfico)</option>

                    <option value={30}>30 FPS (Padrão Web)</option>

                    <option value={60}>60 FPS (Super Fluido)</option>
                  </select>

                  <p className="text-[9px] text-zinc-500">
                    Taxa de quadros para renderização Remotion.
                  </p>
                </div>

                <div className="space-y-3">
                  <SettingLabel
                    helpTitle="Resolução"
                    help="1080p para entrega rápida; 2K para mais nitidez. Global vale para todos os projetos; Personalizado sobrescreve só o projeto aberto."
                    align="start"
                  >
                    Resolução de Saída
                  </SettingLabel>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResolutionConfigScope("global")}
                      className={`dash-scope-tab ${resolutionConfigScope === "global" ? "dash-scope-tab-active" : ""}`}
                    >
                      Padrão Global
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolutionConfigScope("project")}
                      className={`dash-scope-tab ${resolutionConfigScope === "project" ? "dash-scope-tab-active" : ""}`}
                    >
                      Personalizado do Projeto
                    </button>
                  </div>
                  {resolutionConfigScope === "global" ? (
                    <>
                      <select
                        value={globalRenderResolution}
                        onChange={(e) =>
                          setGlobalRenderResolution(
                            e.target.value === "2k" ? "2k" : "1080p"
                          )
                        }
                        className="dash-select"
                      >
                        <option value="1080p">
                          1080p — 1920×1080 (16:9) / 1080×1920 (9:16)
                        </option>
                        <option value="2k">
                          2K — 2560×1440 (16:9) / 1440×2560 (9:16)
                        </option>
                      </select>
                      <p className="text-[9px] text-[var(--dash-muted)]">
                        Salve com o botão abaixo. Vale para todos os projetos
                        sem override.
                      </p>
                    </>
                  ) : (
                    <>
                      <select
                        value={projectRenderResolution}
                        onChange={(e) =>
                          setProjectRenderResolution(
                            e.target.value === "2k" ? "2k" : "1080p"
                          )
                        }
                        className="dash-select"
                      >
                        <option value="1080p">
                          1080p — 1920×1080 (16:9) / 1080×1920 (9:16)
                        </option>
                        <option value="2k">
                          2K — 2560×1440 (16:9) / 1440×2560 (9:16)
                        </option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveProjectRenderResolution}
                          disabled={savingProjectResolution}
                          className="dash-scope-tab dash-scope-tab-active flex-1 disabled:opacity-50"
                        >
                          {savingProjectResolution
                            ? "Salvando..."
                            : "Salvar do Projeto"}
                        </button>
                        {config?.render_resolution && (
                          <button
                            type="button"
                            onClick={handleClearProjectRenderResolution}
                            disabled={savingProjectResolution}
                            className="dash-scope-tab px-3 disabled:opacity-50"
                          >
                            Usar Global
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-500">
                        Sobrescreve a resolução global só neste projeto.
                      </p>
                    </>
                  )}
                </div>

                {/* Checkboxes for Remotion & Debug */}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"

                      id="use-remotion-chk"

                      checked={globalUseRemotion}

                      onChange={(e) => setGlobalUseRemotion(e.target.checked)}

                      className="dash-checkbox"
                    />

                    <label
                      htmlFor="use-remotion-chk"
                      className="text-xs text-zinc-300 font-medium cursor-pointer select-none flex items-center gap-1.5"
                    >
                      Remotion por Padrão
                      <SettingHelpTip title="Remotion" align="start">
                        Usa o motor Remotion (React) para compilar vídeos com
                        overlays, legendas e efeitos. Desligado pode usar
                        pipeline legado se disponível.
                      </SettingHelpTip>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"

                      id="debug-overlay-chk"

                      checked={globalDebugOverlay}

                      onChange={(e) => setGlobalDebugOverlay(e.target.checked)}

                      className="dash-checkbox"
                    />

                    <label
                      htmlFor="debug-overlay-chk"
                      className="text-xs text-zinc-300 font-medium cursor-pointer select-none flex items-center gap-1.5"
                    >
                      Debug Overlay
                      <SettingHelpTip title="Debug" align="end">
                        Mostra informações técnicas dos overlays na
                        prévia/render para diagnosticar timing e posicionamento.
                        Desligue na entrega final.
                      </SettingHelpTip>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-[var(--dash-border)] pt-4">
              <button
                onClick={handleSaveGlobalRenderConfig}

                disabled={savingGlobalConfig}

                className="dash-btn-primary text-xs px-5 py-2.5 flex items-center gap-2"
              >
                <span>
                  {savingGlobalConfig
                    ? "Salvando..."
                    : "Salvar Configurações de Renderização"}
                </span>
              </button>
            </div>
          </div>
        )}

        {settingsSection === "visual" && (
          <VisualSettings
            config={globalStudioVisual}
            projectKey="__global__"
            isShortFormat={formatSelector === "SHORTS"}
            isListicle={
              config?.content_mode === "LISTICLE" ||
              Number((config as { rank_count?: number })?.rank_count) >= 3
            }
            saving={savingVisualConfig}
            onSave={async (draft) => {
              setSavingVisualConfig(true);
              try {
                const patch = visualDraftToApiPatch(draft, globalStudioVisual);
                if (Object.keys(patch).length === 0) {
                  toast.success("Nenhuma alteração visual para salvar.");
                  return;
                }
                const saved = await saveGlobalStudioDefaults({ visual: patch });
                if (!saved) return;
                toast.success(
                  "Configurações visuais salvas globalmente (todos os projetos)."
                );
              } finally {
                setSavingVisualConfig(false);
              }
            }}
          />
        )}

        {settingsSection === "producao" && (
          <SettingsProduction
            config={globalStudioProduction}
            projectKey="__global__"
            globalMusicVolume={globalMusicVolume}
            isShortFormat={formatSelector === "SHORTS"}
            saving={savingProductionConfig}
            onSave={async (draft) => {
              setSavingProductionConfig(true);
              try {
                const patch = productionDraftToApiPatch(
                  draft,
                  globalStudioProduction
                );
                if (Object.keys(patch).length === 0) {
                  toast.success("Nenhuma alteração de produção para salvar.");
                  return;
                }
                const saved = await saveGlobalStudioDefaults({
                  production: patch,
                });
                if (!saved) return;
                toast.success(
                  "Configurações de produção salvas globalmente (todos os projetos)."
                );
              } finally {
                setSavingProductionConfig(false);
              }
            }}
          />
        )}

        {settingsSection === "integracoes" && (
          <IntegrationSettings
            uploadStatus={uploadStatus}
            toast={(msg) => toast(msg)}
            fetchUploadStatus={fetchUploadStatus}
            onRelinkYoutube={handleRelinkYoutube}
            canvaClientId={canvaClientId}
            setCanvaClientId={setCanvaClientId}
            canvaClientSecret={canvaClientSecret}
            setCanvaClientSecret={setCanvaClientSecret}
            ytClientId={ytClientId}
            setYtClientId={setYtClientId}
            ytClientSecret={ytClientSecret}
            setYtClientSecret={setYtClientSecret}
            igAppId={igAppId}
            setIgAppId={setIgAppId}
            igAppSecret={igAppSecret}
            setIgAppSecret={setIgAppSecret}
            igAccountId={igAccountId}
            setIgAccountId={setIgAccountId}
            igAccessToken={igAccessToken}
            setIgAccessToken={setIgAccessToken}
          />
        )}
      </div>
    </DashminPageLayout>
  );
}
