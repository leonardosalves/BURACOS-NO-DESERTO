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
  openrouterModel: string;
  openrouterModelOptions: Array<{ id: string; label: string; hint?: string }>;
  nvidiaModel: string;
  nvidiaModelOptions: Array<{ id: string; label: string; hint?: string }>;
  alibabaModel: string;
  alibabaModelOptions: Array<{ id: string; label: string; hint?: string }>;
  alibabaBaseUrlInput: string;
  tokenrouterModel: string;
  tokenrouterModelOptions: Array<{ id: string; label: string; hint?: string }>;
  tokenrouterBaseUrlInput: string;
  tokenrouterKeyInput: string;
  opencodeModel: string;
  opencodeModelOptions: Array<{ id: string; label: string; hint?: string }>;
  opencodeBaseUrlInput: string;
  opencodeKeyInput: string;
  airforceModel: string;
  airforceModelOptions: Array<{ id: string; label: string; hint?: string }>;
  airforceBaseUrlInput: string;
  airforceKeyInput: string;
  moonaiModel: string;
  moonaiModelOptions: Array<{ id: string; label: string; hint?: string }>;
  moonaiBaseUrlInput: string;
  moonaiKeyInput: string;
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
  hasNvidiaKey: boolean;
  hasAlibabaKey: boolean;
  hasTokenrouterKey: boolean;
  hasOpencodeKey: boolean;
  hasAirforceKey: boolean;
  hasMoonaiKey: boolean;
  hasOpenRouterKey: boolean;
  hasPexelsKey: boolean;
  hasPixabayKey: boolean;
  hasSupermemoryKey: boolean;
  hasXaiKey: boolean;
  igAccessToken: string;
  igAccountId: string;
  igAppId: string;
  igAppSecret: string;
  nvidiaKeyInput: string;
  alibabaKeyInput: string;
  openrouterKeyInput: string;
  pexelsKeyInput: string;
  pickProductionConfig: (cfg: ConfigData) => any;
  pickVisualConfig: (cfg: ConfigData) => any;
  pixabayKeyInput: string;
  productionDraftToApiPatch: (draft: any, previous?: any) => any;
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
  setOpenrouterModel: (v: string) => void;
  setNvidiaModel: (v: string) => void;
  setAlibabaModel: (v: string) => void;
  setAlibabaBaseUrlInput: (v: string) => void;
  setTokenrouterModel: (v: string) => void;
  setTokenrouterBaseUrlInput: (v: string) => void;
  setTokenrouterKeyInput: (v: string) => void;
  setOpencodeModel: (v: string) => void;
  setOpencodeBaseUrlInput: (v: string) => void;
  setOpencodeKeyInput: (v: string) => void;
  setAirforceModel: (v: string) => void;
  setAirforceBaseUrlInput: (v: string) => void;
  setAirforceKeyInput: (v: string) => void;
  setMoonaiModel: (v: string) => void;
  setMoonaiBaseUrlInput: (v: string) => void;
  setMoonaiKeyInput: (v: string) => void;
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
  setNvidiaKeyInput: (v: string) => void;
  setAlibabaKeyInput: (v: string) => void;
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
  visualDraftToApiPatch: (draft: any, previous?: any) => any;
  xaiKeyInput: string;
  ytClientId: string;
  ytClientSecret: string;
  localLlmUrlInput: string;
  setLocalLlmUrlInput: (v: string) => void;
  localLlmModelInput: string;
  setLocalLlmModelInput: (v: string) => void;
  omnirouteModel: string;
  setOmnirouteModel: (v: string) => void;
  omnirouteModelOptions: Array<{ id: string; label: string; hint?: string }>;
  setOmnirouteModelOptions: (
    v: Array<{ id: string; label: string; hint?: string }>
  ) => void;
  omnirouteBaseUrlInput: string;
  setOmnirouteBaseUrlInput: (v: string) => void;
  omnirouteKeyInput: string;
  setOmnirouteKeyInput: (v: string) => void;
  hasOmnirouteKey: boolean;
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
  openrouterModel,
  openrouterModelOptions,
  nvidiaModel,
  nvidiaModelOptions,
  alibabaModel,
  alibabaModelOptions,
  alibabaBaseUrlInput,
  tokenrouterModel,
  tokenrouterModelOptions,
  tokenrouterBaseUrlInput,
  tokenrouterKeyInput,
  opencodeModel,
  opencodeModelOptions,
  opencodeBaseUrlInput,
  opencodeKeyInput,
  hasOpencodeKey,
  airforceModel,
  airforceModelOptions,
  airforceBaseUrlInput,
  airforceKeyInput,
  hasAirforceKey,
  moonaiModel,
  moonaiModelOptions,
  moonaiBaseUrlInput,
  moonaiKeyInput,
  hasMoonaiKey,
  hasTokenrouterKey,
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
  hasNvidiaKey,
  hasAlibabaKey,
  hasOpenRouterKey,
  hasPexelsKey,
  hasPixabayKey,
  hasSupermemoryKey,
  hasXaiKey,
  igAccessToken,
  igAccountId,
  igAppId,
  igAppSecret,
  nvidiaKeyInput,
  alibabaKeyInput,
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
  setOpenrouterModel,
  setNvidiaModel,
  setAlibabaModel,
  setAlibabaBaseUrlInput,
  setTokenrouterModel,
  setTokenrouterBaseUrlInput,
  setTokenrouterKeyInput,
  setOpencodeModel,
  setOpencodeBaseUrlInput,
  setOpencodeKeyInput,
  setAirforceModel,
  setAirforceBaseUrlInput,
  setAirforceKeyInput,
  setMoonaiModel,
  setMoonaiBaseUrlInput,
  setMoonaiKeyInput,
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
  setNvidiaKeyInput,
  setAlibabaKeyInput,
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
  localLlmUrlInput,
  setLocalLlmUrlInput,
  localLlmModelInput,
  setLocalLlmModelInput,
  omnirouteModel,
  setOmnirouteModel,
  omnirouteModelOptions,
  setOmnirouteModelOptions,
  omnirouteBaseUrlInput,
  setOmnirouteBaseUrlInput,
  omnirouteKeyInput,
  setOmnirouteKeyInput,
  hasOmnirouteKey,
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
                  Alibaba: {hasAlibabaKey ? "configurado" : "vazio"}
                </span>
                <span className="dash-kpi-pill">
                  TokenRouter: {hasTokenrouterKey ? "configurado" : "vazio"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                type="button"
                onClick={() => setAiProvider("tokenrouter")}
                className={`dash-provider-card ${aiProvider === "tokenrouter" ? "dash-provider-card-active" : ""}`}
                data-testid="provider-tokenrouter"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    TokenRouter
                    <SettingHelpTip title="TokenRouter" align="start">
                      Gateway OpenAI-compatible (api.tokenrouter.com/v1). Modelo
                      padrão z-ai/glm-5.2-free.
                    </SettingHelpTip>
                  </span>
                  {aiProvider === "tokenrouter" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  https://api.tokenrouter.com/v1 · GLM free / GPT / Qwen
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAiProvider("opencode")}
                className={`dash-provider-card ${aiProvider === "opencode" ? "dash-provider-card-active" : ""}`}
                data-testid="provider-opencode"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    OpenCode
                    <SettingHelpTip
                      title="OpenCode / Forge Gateway"
                      align="start"
                    >
                      Forge Gateway API — 32 modelos premium (DeepSeek, GPT-5,
                      Claude, Grok, Kimi, Gemini). Chave padrão embutida, sem
                      configuração extra.
                    </SettingHelpTip>
                  </span>
                  {aiProvider === "opencode" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  forge-gateway-api.fly.dev · DeepSeek / GPT-5 / Claude / Grok
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAiProvider("airforce")}
                className={`dash-provider-card ${aiProvider === "airforce" ? "dash-provider-card-active" : ""}`}
                data-testid="provider-airforce"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    AirForce
                    <SettingHelpTip title="AirForce API" align="start">
                      Catálogo gigante com 209 modelos (DeepSeek V3, Claude
                      Sonnet 4.6, Grok 4.1, Gemini 2.5 Pro). Provedor flexível e
                      livre de moderação.
                    </SettingHelpTip>
                  </span>
                  {aiProvider === "airforce" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  api.airforce/v1 · 209 Modelos premium/livres
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAiProvider("moonai")}
                className={`dash-provider-card ${aiProvider === "moonai" ? "dash-provider-card-active" : ""}`}
                data-testid="provider-moonai"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    Moon-AI
                    <SettingHelpTip title="Moon-AI API" align="start">
                      Gateway polonês premium. Suporta GPT-5.4, Claude Sonnet 5,
                      Grok 3, Kimi K2.5 e Llama 3.3.
                    </SettingHelpTip>
                  </span>
                  {aiProvider === "moonai" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  www.moon-ai.pl/api · GPT-5 / Claude 5 / Grok 3 / Kimi
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
                onClick={() => setAiProvider("alibaba")}
                className={`dash-provider-card ${aiProvider === "alibaba" ? "dash-provider-card-active" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    Alibaba
                    <SettingHelpTip title="Alibaba Model Studio" align="start">
                      Qwen via DashScope / Model Studio (endpoint OpenAI
                      compatible do workspace). Use a chave sk-ws-… e ative o
                      modelo no console Alibaba se aparecer Unpurchased.
                    </SettingHelpTip>
                  </span>

                  {aiProvider === "alibaba" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>

                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  Model Studio China (ws-…cn-beijing.maas.aliyuncs.com) — Qwen
                  Plus/Turbo/Max.
                </p>
              </button>

              <button
                onClick={() => setAiProvider("local")}
                className={`dash-provider-card ${aiProvider === "local" ? "dash-provider-card-active" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    LLM Local (Bonsai)
                    <SettingHelpTip title="LLM Local (Bonsai)" align="start">
                      Conecta com um servidor compatível com OpenAI rodando
                      localmente no seu PC (ex.: Ollama ou LM Studio). Ideal
                      para rodar o Bonsai 27B ou outros modelos locais.
                    </SettingHelpTip>
                  </span>

                  {aiProvider === "local" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>

                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  Usa uma API de IA local rodando no seu computador (porta 11434
                  por padrão).
                </p>
              </button>

              <button
                onClick={() => setAiProvider("omniroute")}
                className={`dash-provider-card ${aiProvider === "omniroute" ? "dash-provider-card-active" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                    OmniRoute Gateway
                    <SettingHelpTip title="OmniRoute Gateway" align="start">
                      Use a local API gateway
                      (https://github.com/diegosouzapw/OmniRoute) to
                      automatically route calls between your API providers and
                      manage fallback/keys.
                    </SettingHelpTip>
                  </span>

                  {aiProvider === "omniroute" && (
                    <CheckCircle className="w-4 h-4 text-[var(--dash-primary)]" />
                  )}
                </div>

                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  Local smart routing and API key/provider manager for custom
                  endpoints.
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

                {aiProvider === "openrouter" && (
                  <div className="space-y-2">
                    <SettingLabel
                      helpTitle="Modelo OpenRouter"
                      help="Modelo free do OpenRouter usado como preferência. Se falhar (quota, 404 ou indisponível), o sistema tenta os outros free da lista em sequência."
                      align="start"
                    >
                      Modelo OpenRouter
                    </SettingLabel>

                    <select
                      value={openrouterModel}
                      onChange={(e) => setOpenrouterModel(e.target.value)}
                      className="dash-select"
                    >
                      {openrouterModelOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      {openrouterModelOptions.find(
                        (option) => option.id === openrouterModel
                      )?.hint || "Modelo free disponível no OpenRouter."}{" "}
                      ID:{" "}
                      <span className="text-zinc-300 font-mono text-[9px]">
                        {openrouterModel}
                      </span>
                    </p>
                  </div>
                )}

                {aiProvider === "nvidia" && (
                  <div className="space-y-2">
                    <SettingLabel
                      helpTitle="Modelo NVIDIA API"
                      help="Modelo NVIDIA preferido nas chamadas de IA. Se falhar, o sistema tenta os outros modelos da lista como fallback."
                      align="start"
                    >
                      Modelo NVIDIA API
                    </SettingLabel>

                    <select
                      value={nvidiaModel}
                      onChange={(e) => setNvidiaModel(e.target.value)}
                      className="dash-select"
                    >
                      {nvidiaModelOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      {nvidiaModelOptions.find(
                        (option) => option.id === nvidiaModel
                      )?.hint || "Modelo via integrate.api.nvidia.com."}{" "}
                      ID:{" "}
                      <span className="text-zinc-300 font-mono text-[9px]">
                        {nvidiaModel}
                      </span>
                    </p>
                  </div>
                )}

                {aiProvider === "alibaba" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Modelo Alibaba (Qwen)"
                        help="Modelo Qwen no Model Studio. Precisa estar habilitado na conta (erro Unpurchased = ative no console)."
                        align="start"
                      >
                        Modelo Alibaba (Qwen)
                      </SettingLabel>
                      <select
                        value={alibabaModel}
                        onChange={(e) => setAlibabaModel(e.target.value)}
                        className="dash-select"
                      >
                        {alibabaModelOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        {alibabaModelOptions.find(
                          (option) => option.id === alibabaModel
                        )?.hint || "Qwen via DashScope."}{" "}
                        ID:{" "}
                        <span className="text-zinc-300 font-mono text-[9px]">
                          {alibabaModel}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Endpoint OpenAI Compatible"
                        help="URL do workspace Model Studio, normalmente …/compatible-mode/v1"
                        align="start"
                      >
                        Endpoint OpenAI Compatible
                      </SettingLabel>
                      <input
                        type="text"
                        value={alibabaBaseUrlInput}
                        onChange={(e) => setAlibabaBaseUrlInput(e.target.value)}
                        placeholder="https://ws-….cn-beijing.maas.aliyuncs.com/compatible-mode/v1"
                        className="dash-input font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {aiProvider === "tokenrouter" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Modelo TokenRouter"
                        help="ID do modelo no catálogo TokenRouter (ex.: z-ai/glm-5.2-free). Você também pode colar um ID livre."
                        align="start"
                      >
                        Modelo TokenRouter
                      </SettingLabel>
                      <select
                        value={tokenrouterModel}
                        onChange={(e) => setTokenrouterModel(e.target.value)}
                        className="dash-select"
                      >
                        {tokenrouterModelOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={tokenrouterModel}
                        onChange={(e) => setTokenrouterModel(e.target.value)}
                        placeholder="ou cole um model id livre, ex.: z-ai/glm-5.2-free"
                        className="dash-input font-mono text-[11px]"
                      />
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        {tokenrouterModelOptions.find(
                          (option) => option.id === tokenrouterModel
                        )?.hint || "OpenAI-compatible via TokenRouter."}{" "}
                        ID:{" "}
                        <span className="text-zinc-300 font-mono text-[9px]">
                          {tokenrouterModel}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Base URL TokenRouter"
                        help="Padrão: https://api.tokenrouter.com/v1 — mesmo uso do OpenAI SDK (base_url)."
                        align="start"
                      >
                        Base URL (OpenAI compatible)
                      </SettingLabel>
                      <input
                        type="text"
                        value={tokenrouterBaseUrlInput}
                        onChange={(e) =>
                          setTokenrouterBaseUrlInput(e.target.value)
                        }
                        placeholder="https://api.tokenrouter.com/v1"
                        className="dash-input font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {aiProvider === "opencode" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Modelo OpenCode"
                        help="Escolha um dos 32 modelos do Forge Gateway API ou cole um ID livre."
                        align="start"
                      >
                        Modelo OpenCode
                      </SettingLabel>
                      <select
                        value={opencodeModel}
                        onChange={(e) => setOpencodeModel(e.target.value)}
                        className="dash-select"
                      >
                        {opencodeModelOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={opencodeModel}
                        onChange={(e) => setOpencodeModel(e.target.value)}
                        placeholder="ex.: deepseek-v3, claude-sonnet-5, grok-4.5"
                        className="dash-input font-mono text-[11px]"
                      />
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        {opencodeModelOptions.find(
                          (option) => option.id === opencodeModel
                        )?.hint || "OpenAI-compatible via Forge Gateway."}{" "}
                        ID:{" "}
                        <span className="text-zinc-300 font-mono text-[9px]">
                          {opencodeModel}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Base URL OpenCode"
                        help="Padrão: https://forge-gateway-api.fly.dev/v1"
                        align="start"
                      >
                        Base URL (OpenAI compatible)
                      </SettingLabel>
                      <input
                        type="text"
                        value={opencodeBaseUrlInput}
                        onChange={(e) =>
                          setOpencodeBaseUrlInput(e.target.value)
                        }
                        placeholder="https://forge-gateway-api.fly.dev/v1"
                        className="dash-input font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {aiProvider === "airforce" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Modelo AirForce"
                        help="Escolha um dos modelos do AirForce ou cole um ID de modelo livre."
                        align="start"
                      >
                        Modelo AirForce
                      </SettingLabel>
                      <select
                        value={airforceModel}
                        onChange={(e) => setAirforceModel(e.target.value)}
                        className="dash-select"
                      >
                        {airforceModelOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={airforceModel}
                        onChange={(e) => setAirforceModel(e.target.value)}
                        placeholder="ex.: deepseek-v3, claude-sonnet-4.6-rp, grok-4.1-fast-reasoning"
                        className="dash-input font-mono text-[11px]"
                      />
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        {airforceModelOptions.find(
                          (option) => option.id === airforceModel
                        )?.hint || "OpenAI-compatible via AirForce API."}{" "}
                        ID:{" "}
                        <span className="text-zinc-300 font-mono text-[9px]">
                          {airforceModel}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Base URL AirForce"
                        help="Padrão: https://api.airforce/v1"
                        align="start"
                      >
                        Base URL (OpenAI compatible)
                      </SettingLabel>
                      <input
                        type="text"
                        value={airforceBaseUrlInput}
                        onChange={(e) =>
                          setAirforceBaseUrlInput(e.target.value)
                        }
                        placeholder="https://api.airforce/v1"
                        className="dash-input font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {aiProvider === "moonai" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Modelo Moon-AI"
                        help="Escolha um dos modelos do Moon-AI ou cole um ID de modelo livre."
                        align="start"
                      >
                        Modelo Moon-AI
                      </SettingLabel>
                      <select
                        value={moonaiModel}
                        onChange={(e) => setMoonaiModel(e.target.value)}
                        className="dash-select"
                      >
                        {moonaiModelOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={moonaiModel}
                        onChange={(e) => setMoonaiModel(e.target.value)}
                        placeholder="ex.: gpt-5-4, claude-sonnet-5, grok-3, llama-3-3-70b-instruct"
                        className="dash-input font-mono text-[11px]"
                      />
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        {moonaiModelOptions.find(
                          (option) => option.id === moonaiModel
                        )?.hint || "OpenAI-compatible via Moon-AI API."}{" "}
                        ID:{" "}
                        <span className="text-zinc-300 font-mono text-[9px]">
                          {moonaiModel}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Base URL Moon-AI"
                        help="Padrão: https://www.moon-ai.pl/api"
                        align="start"
                      >
                        Base URL (OpenAI compatible)
                      </SettingLabel>
                      <input
                        type="text"
                        value={moonaiBaseUrlInput}
                        onChange={(e) => setMoonaiBaseUrlInput(e.target.value)}
                        placeholder="https://www.moon-ai.pl/api"
                        className="dash-input font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {aiProvider === "omniroute" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Modelo OmniRoute"
                        help="Escolha o modelo principal para enviar via OmniRoute ou digite um livre."
                        align="start"
                      >
                        Modelo OmniRoute
                      </SettingLabel>
                      <select
                        value={omnirouteModel}
                        onChange={(e) => setOmnirouteModel(e.target.value)}
                        className="dash-select"
                      >
                        {omnirouteModelOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={omnirouteModel}
                        onChange={(e) => setOmnirouteModel(e.target.value)}
                        placeholder="ex.: gpt-4o, claude-3-5-sonnet, deepseek-coder"
                        className="dash-input font-mono text-[11px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Base URL OmniRoute"
                        help="Endereço local onde o servidor OmniRoute está rodando. Padrão: http://localhost:20128/v1"
                        align="start"
                      >
                        Base URL (OpenAI compatible gateway)
                      </SettingLabel>
                      <input
                        type="text"
                        value={omnirouteBaseUrlInput}
                        onChange={(e) =>
                          setOmnirouteBaseUrlInput(e.target.value)
                        }
                        placeholder="http://localhost:20128/v1"
                        className="dash-input font-mono text-[11px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Chave Admin OmniRoute"
                        help="Token/Chave de autenticação configurada no OmniRoute para chamadas seguras (opcional)."
                        align="start"
                      >
                        Chave/Token OmniRoute
                      </SettingLabel>
                      <input
                        type="password"
                        value={omnirouteKeyInput}
                        onChange={(e) => setOmnirouteKeyInput(e.target.value)}
                        placeholder="Token de segurança do OmniRoute"
                        className="dash-input"
                      />
                    </div>

                    {/* OmniRoute Live Admin Management Panel */}
                    <OmniRouteManagerPanel />
                  </div>
                )}

                {aiProvider === "local" && (
                  <>
                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="URL do Servidor Local"
                        help="Endpoint compatível com chat completions do OpenAI. Ex.: http://127.0.0.1:11434/v1/chat/completions (Ollama) ou http://127.0.0.1:1234/v1/chat/completions (LM Studio)."
                        align="start"
                      >
                        URL da API Local
                      </SettingLabel>

                      <input
                        type="text"
                        value={localLlmUrlInput}
                        onChange={(e) => setLocalLlmUrlInput(e.target.value)}
                        placeholder="http://127.0.0.1:11434/v1/chat/completions"
                        className="dash-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <SettingLabel
                        helpTitle="Modelo Local"
                        help="Nome do modelo local que foi carregado no seu servidor (ex.: bonsai-27b, qwen3.6-27b, llama3, etc.)."
                        align="start"
                      >
                        Modelo Local
                      </SettingLabel>

                      <input
                        type="text"
                        value={localLlmModelInput}
                        onChange={(e) => setLocalLlmModelInput(e.target.value)}
                        placeholder="bonsai-27b"
                        className="dash-input"
                      />
                    </div>

                    <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-4 text-[10px] text-zinc-400 space-y-2 leading-relaxed mt-2">
                      <p className="font-bold text-violet-300">
                        💡 Instruções para Uso do LLM Local / Bonsai:
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>
                          Certifique-se de que o seu servidor local está rodando
                          (Ollama, LM Studio, vLLM ou similar).
                        </li>
                        <li>
                          <b>Ollama:</b> Por padrão, use a URL{" "}
                          <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded font-mono">
                            http://127.0.0.1:11434/v1/chat/completions
                          </code>
                          . Certifique-se de baixar o modelo (ex:{" "}
                          <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded font-mono">
                            ollama run bonsai-27b
                          </code>
                          ).
                        </li>
                        <li>
                          <b>LM Studio:</b> Certifique-se de ativar o servidor
                          local (Local Server) na porta indicada, e use a URL{" "}
                          <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded font-mono">
                            http://127.0.0.1:1234/v1/chat/completions
                          </code>
                          .
                        </li>
                        <li>
                          Na sua RTX 4060 Ti (8GB), limite o contexto para
                          conversas normais (~4k-8k) para evitar estouro de
                          VRAM. Se for a versão de 16GB, pode usar sem
                          restrições.
                        </li>
                      </ul>
                    </div>
                  </>
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
                      help="Opcional: cole sua chave sk-or-v1-… do openrouter.ai. Se deixar vazio, usa a chave embutida do Lumiera (continua funcionando)."
                      align="start"
                    >
                      Chave OpenRouter
                    </SettingLabel>

                    {hasOpenRouterKey ? (
                      <span className="dash-ui-badge dash-ui-badge-success dash-ui-badge-pill">
                        Ativa
                      </span>
                    ) : (
                      <span className="dash-ui-badge dash-ui-badge-danger dash-ui-badge-pill">
                        Sem chave
                      </span>
                    )}
                  </div>

                  <input
                    type="password"
                    value={openrouterKeyInput}
                    onChange={(e) => setOpenRouterKeyInput(e.target.value)}
                    placeholder="Opcional: cole sua chave sk-or-v1-… (vazio = mantém embutida)"
                    className="dash-input"
                  />

                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Deixe vazio para manter a chave embutida do Lumiera ou a que
                    você já salvou. Cole a sua se quiser usar a própria conta.
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
                      helpTitle="Chave Alibaba (DashScope)"
                      help="Chave sk-ws-… do Model Studio / DashScope. Endpoint e modelo ficam acima quando Alibaba está selecionado."
                      align="start"
                    >
                      Chave Alibaba (DashScope)
                    </SettingLabel>
                    {hasAlibabaKey ? (
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
                    value={alibabaKeyInput}
                    onChange={(e) => setAlibabaKeyInput(e.target.value)}
                    placeholder="Cole a chave sk-ws-… Deixe vazio para manter a atual."
                    className="dash-input"
                  />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Workspace: ws-7pwlysxpwyxkd7j2.cn-beijing.maas.aliyuncs.com
                    · Ative Qwen-Plus/Turbo no console se aparecer
                    AccessDenied.Unpurchased.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <SettingLabel
                      helpTitle="Chave TokenRouter"
                      help="Chave sk-… do TokenRouter. Usada com base_url https://api.tokenrouter.com/v1 (OpenAI SDK)."
                      align="start"
                    >
                      Chave TokenRouter
                    </SettingLabel>
                    {hasTokenrouterKey ? (
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
                    value={tokenrouterKeyInput}
                    onChange={(e) => setTokenrouterKeyInput(e.target.value)}
                    placeholder="Cole a chave sk-… Deixe vazio para manter a atual."
                    className="dash-input"
                  />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Equivalente a:{" "}
                    <code className="text-[9px] text-zinc-400">
                      OpenAI(base_url=&quot;https://api.tokenrouter.com/v1&quot;,
                      api_key=&quot;sk-…&quot;)
                    </code>
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <SettingLabel
                      helpTitle="Chave OpenCode (Forge Gateway)"
                      help="Chave fg-… do Forge Gateway API. Deixe vazio para usar a chave padrão embutida."
                      align="start"
                    >
                      Chave OpenCode
                    </SettingLabel>
                    {hasOpencodeKey ? (
                      <span className="dash-ui-badge dash-ui-badge-success dash-ui-badge-pill">
                        Ativa
                      </span>
                    ) : (
                      <span className="dash-ui-badge dash-ui-badge-muted dash-ui-badge-pill">
                        Embutida
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    value={opencodeKeyInput}
                    onChange={(e) => setOpencodeKeyInput(e.target.value)}
                    placeholder="Cole fg-… para substituir. Vazio = chave padrão."
                    className="dash-input"
                  />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Forge Gateway API · 32 modelos (DeepSeek, GPT-5, Claude,
                    Grok…).{" "}
                    <code className="text-[9px] text-zinc-400">
                      base_url=&quot;https://forge-gateway-api.fly.dev/v1&quot;
                    </code>
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <SettingLabel
                      helpTitle="Chave AirForce API"
                      help="Chave sk-air-… do AirForce API. Deixe vazio para usar a chave padrão embutida."
                      align="start"
                    >
                      Chave AirForce
                    </SettingLabel>
                    {hasAirforceKey ? (
                      <span className="dash-ui-badge dash-ui-badge-success dash-ui-badge-pill">
                        Ativa
                      </span>
                    ) : (
                      <span className="dash-ui-badge dash-ui-badge-muted dash-ui-badge-pill">
                        Embutida
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    value={airforceKeyInput}
                    onChange={(e) => setAirforceKeyInput(e.target.value)}
                    placeholder="Cole sk-air-… para substituir. Vazio = chave padrão."
                    className="dash-input"
                  />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    AirForce API · 209 modelos (DeepSeek, Claude 4.6, Grok
                    4.1…).{" "}
                    <code className="text-[9px] text-zinc-400">
                      base_url=&quot;https://api.airforce/v1&quot;
                    </code>
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <SettingLabel
                      helpTitle="Chave Moon-AI API"
                      help="Chave moon-ai-… da Moon-AI API. Deixe vazio para usar a chave padrão embutida."
                      align="start"
                    >
                      Chave Moon-AI
                    </SettingLabel>
                    {hasMoonaiKey ? (
                      <span className="dash-ui-badge dash-ui-badge-success dash-ui-badge-pill">
                        Ativa
                      </span>
                    ) : (
                      <span className="dash-ui-badge dash-ui-badge-muted dash-ui-badge-pill">
                        Embutida
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    value={moonaiKeyInput}
                    onChange={(e) => setMoonaiKeyInput(e.target.value)}
                    placeholder="Cole moon-ai-… para substituir. Vazio = chave padrão."
                    className="dash-input"
                  />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Moon-AI API · GPT-5, Claude 5, Grok 3, Kimi…{" "}
                    <code className="text-[9px] text-zinc-400">
                      base_url=&quot;https://www.moon-ai.pl/api&quot;
                    </code>
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
                const patch = visualDraftToApiPatch(
                  draft as any,
                  globalStudioVisual
                );
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
                  draft as any,
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

function OmniRouteManagerPanel() {
  const [status, setStatus] = React.useState<{
    online: boolean;
    url: string;
    error?: string;
  } | null>(null);
  const [providers, setProviders] = React.useState<any[]>([]);
  const [keys, setKeys] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  // New Provider Form
  const [newProvName, setNewProvName] = React.useState("");
  const [newProvBaseUrl, setNewProvBaseUrl] = React.useState("");
  const [newProvApiKey, setNewProvApiKey] = React.useState("");
  const [newProvModels, setNewProvModels] = React.useState("");
  const [newProvWeight, setNewProvWeight] = React.useState(1);

  // New Key Form
  const [newKeyName, setNewKeyName] = React.useState("");
  const [newKeyExpires, setNewKeyExpires] = React.useState("");

  const refreshAll = async () => {
    setLoading(true);
    try {
      const statusRes = await fetch("/api/omniroute/status");
      const statusData = await statusRes.json();
      setStatus(statusData);

      if (statusData.online) {
        const provsRes = await fetch("/api/omniroute/providers");
        if (provsRes.ok) {
          const provsData = await provsRes.json();
          setProviders(
            Array.isArray(provsData) ? provsData : provsData.providers || []
          );
        }

        const keysRes = await fetch("/api/omniroute/keys");
        if (keysRes.ok) {
          const keysData = await keysRes.json();
          setKeys(Array.isArray(keysData) ? keysData : keysData.keys || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    refreshAll();
  }, []);

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvName || !newProvBaseUrl) {
      toast.error("Nome e Base URL são obrigatórios");
      return;
    }
    try {
      const resp = await fetch("/api/omniroute/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProvName,
          base_url: newProvBaseUrl,
          api_key: newProvApiKey,
          models: newProvModels
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean),
          weight: Number(newProvWeight) || 1,
        }),
      });
      if (resp.ok) {
        toast.success("Provedor adicionado no OmniRoute");
        setNewProvName("");
        setNewProvBaseUrl("");
        setNewProvApiKey("");
        setNewProvModels("");
        refreshAll();
      } else {
        const errText = await resp.text();
        toast.error("Erro: " + errText);
      }
    } catch (err: any) {
      toast.error("Falha ao adicionar: " + err.message);
    }
  };

  const handleDeleteProvider = async (id: string | number) => {
    if (!confirm("Deseja mesmo remover este provedor do OmniRoute?")) return;
    try {
      const resp = await fetch(`/api/omniroute/providers/${id}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        toast.success("Provedor removido");
        refreshAll();
      } else {
        const errText = await resp.text();
        toast.error("Erro: " + errText);
      }
    } catch (err: any) {
      toast.error("Falha ao remover: " + err.message);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) {
      toast.error("Nome da chave é obrigatório");
      return;
    }
    try {
      const resp = await fetch("/api/omniroute/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          expires_at: newKeyExpires || null,
        }),
      });
      if (resp.ok) {
        toast.success("Chave criada no OmniRoute");
        setNewKeyName("");
        setNewKeyExpires("");
        refreshAll();
      } else {
        const errText = await resp.text();
        toast.error("Erro: " + errText);
      }
    } catch (err: any) {
      toast.error("Falha ao criar chave: " + err.message);
    }
  };

  const handleDeleteKey = async (id: string | number) => {
    if (!confirm("Deseja mesmo revogar esta chave do OmniRoute?")) return;
    try {
      const resp = await fetch(`/api/omniroute/keys/${id}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        toast.success("Chave revogada");
        refreshAll();
      } else {
        const errText = await resp.text();
        toast.error("Erro: " + errText);
      }
    } catch (err: any) {
      toast.error("Falha ao revogar: " + err.message);
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-5 mt-4 text-left">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Gerenciador OmniRoute Local
          </h4>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Gerencie provedores e chaves de API integradas no seu gateway local.
          </p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            refreshAll();
          }}
          disabled={loading}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition disabled:opacity-50"
          title="Recarregar dados"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {status && (
        <div
          className={`p-3 rounded-xl text-[10px] flex items-center justify-between ${status.online ? "bg-emerald-950/20 border border-emerald-500/20 text-emerald-400" : "bg-rose-950/20 border border-rose-500/20 text-rose-400"}`}
        >
          <span>
            <b>Status:</b>{" "}
            {status.online
              ? `Online (${status.url})`
              : `Offline ou Inacessível`}
            {!status.online && status.error && (
              <span className="block text-zinc-500 mt-0.5">
                Erro: {status.error}
              </span>
            )}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${status.online ? "bg-emerald-500/20" : "bg-rose-500/20"}`}
          >
            {status.online ? "CONECTADO" : "DESCONECTADO"}
          </span>
        </div>
      )}

      {status?.online && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3 bg-zinc-950/30 p-4 border border-zinc-850 rounded-xl">
            <h5 className="text-[11px] font-bold text-zinc-200">
              Provedores Configurados
            </h5>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {providers.length === 0 ? (
                <p className="text-[10px] text-zinc-500 italic">
                  Nenhum provedor configurado no OmniRoute.
                </p>
              ) : (
                providers.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between text-[10px]"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {p.name}
                        <span className="text-[8px] bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">
                          Peso: {p.weight || 1}
                        </span>
                      </div>
                      <div className="text-zinc-550 font-mono text-[9px] truncate max-w-[180px]">
                        {p.base_url}
                      </div>
                      {p.models && p.models.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.models.map((m: string) => (
                            <span
                              key={m}
                              className="bg-violet-950/40 text-violet-300 border border-violet-900/50 rounded px-1 text-[8px]"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteProvider(p.id);
                      }}
                      className="text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 p-1 rounded transition text-[9px]"
                    >
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-zinc-850">
              <span className="text-[10px] font-semibold text-zinc-400 block">
                Adicionar Provedor
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nome (ex: OpenRouter)"
                  value={newProvName}
                  onChange={(e) => setNewProvName(e.target.value)}
                  className="dash-input text-[10px] py-1 px-2"
                />
                <input
                  type="text"
                  placeholder="Base URL"
                  value={newProvBaseUrl}
                  onChange={(e) => setNewProvBaseUrl(e.target.value)}
                  className="dash-input text-[10px] py-1 px-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="password"
                  placeholder="API Key (opcional)"
                  value={newProvApiKey}
                  onChange={(e) => setNewProvApiKey(e.target.value)}
                  className="dash-input text-[10px] py-1 px-2"
                />
                <input
                  type="number"
                  placeholder="Peso"
                  value={newProvWeight}
                  onChange={(e) => setNewProvWeight(Number(e.target.value))}
                  className="dash-input text-[10px] py-1 px-2"
                />
              </div>
              <input
                type="text"
                placeholder="Modelos (ex: gpt-4o, claude-3-5)"
                value={newProvModels}
                onChange={(e) => setNewProvModels(e.target.value)}
                className="dash-input text-[10px] py-1 px-2"
              />
              <button
                type="button"
                onClick={handleAddProvider}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded py-1 text-[10px] font-medium transition"
              >
                Adicionar Provedor
              </button>
            </div>
          </div>

          <div className="space-y-3 bg-zinc-950/30 p-4 border border-zinc-850 rounded-xl">
            <h5 className="text-[11px] font-bold text-zinc-200">
              Chaves de API do Gateway
            </h5>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {keys.length === 0 ? (
                <p className="text-[10px] text-zinc-500 italic">
                  Nenhuma chave de API gerada no OmniRoute.
                </p>
              ) : (
                keys.map((k) => (
                  <div
                    key={k.id}
                    className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between text-[10px]"
                  >
                    <div>
                      <div className="font-bold text-white">{k.name}</div>
                      <div className="text-zinc-500 font-mono text-[9px] mt-0.5">
                        {k.key_hint || k.token || k.id}
                      </div>
                      {k.expires_at && (
                        <div className="text-[8px] text-zinc-500">
                          Expira: {new Date(k.expires_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteKey(k.id);
                      }}
                      className="text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 p-1 rounded transition text-[9px]"
                    >
                      Revogar
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-zinc-850">
              <span className="text-[10px] font-semibold text-zinc-400 block">
                Gerar Nova Chave
              </span>
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="text"
                  placeholder="Nome/Descrição (ex: Lumiera Prod)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="dash-input text-[10px] py-1 px-2"
                />
                <input
                  type="date"
                  placeholder="Expira em"
                  value={newKeyExpires}
                  onChange={(e) => setNewKeyExpires(e.target.value)}
                  className="dash-input text-[10px] py-1 px-2 text-zinc-400"
                />
              </div>
              <button
                type="button"
                onClick={handleAddKey}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded py-1 text-[10px] font-medium transition"
              >
                Gerar Chave de API
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
