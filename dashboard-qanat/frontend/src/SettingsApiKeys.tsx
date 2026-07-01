import React from 'react';
import { Brain, KeyRound, RefreshCw, Save } from 'lucide-react';
import { DashBadge } from './dashmin/ui/DashBadge';
import { SettingHelpTip, SettingLabel } from './SettingHelpTip';
import { SectionHeader } from './SectionHeader';

type Props = {
  epidemicKeyInput: string;
  setEpidemicKeyInput: (v: string) => void;
  hasEpidemicKey: boolean;
  pexelsKeyInput: string;
  setPexelsKeyInput: (v: string) => void;
  pixabayKeyInput: string;
  setPixabayKeyInput: (v: string) => void;
  hasPexelsKey: boolean;
  hasPixabayKey: boolean;
  supermemoryKeyInput: string;
  setSupermemoryKeyInput: (v: string) => void;
  hasSupermemoryKey: boolean;
  supermemoryEnabled: boolean;
  setSupermemoryEnabled: (v: boolean) => void;
  supermemoryBaseUrlInput: string;
  setSupermemoryBaseUrlInput: (v: string) => void;
  testingSupermemory: boolean;
  onTestSupermemory: () => void;
  saving: boolean;
  onSave: () => void;
};

export function SettingsApiKeys({
  epidemicKeyInput,
  setEpidemicKeyInput,
  hasEpidemicKey,
  pexelsKeyInput,
  setPexelsKeyInput,
  pixabayKeyInput,
  setPixabayKeyInput,
  hasPexelsKey,
  hasPixabayKey,
  supermemoryKeyInput,
  setSupermemoryKeyInput,
  hasSupermemoryKey,
  supermemoryEnabled,
  setSupermemoryEnabled,
  supermemoryBaseUrlInput,
  setSupermemoryBaseUrlInput,
  testingSupermemory,
  onTestSupermemory,
  saving,
  onSave,
}: Props) {
  const badge = (ok: boolean, okLabel: string, failLabel: string) => (
    <DashBadge tone={ok ? 'success' : 'danger'}>{ok ? okLabel : failLabel}</DashBadge>
  );

  const optionalBadge = (ok: boolean) => (
    <DashBadge tone={ok ? 'success' : 'muted'}>{ok ? 'Configurada' : 'Opcional'}</DashBadge>
  );

  return (
    <div className="glass-panel p-4 sm:p-6 rounded-3xl space-y-5 min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--dash-border)] pb-4">
        <SectionHeader
          title="CHAVES DE API & MÍDIA"
          helpId="settings-apis"
          icon={<KeyRound className="w-4 h-4 text-[var(--dash-primary)]" />}
          subtitle={(
            <>
              Trilhas, stock, memória persistente e download de B-roll. Use o <span className="text-[var(--dash-primary)]">?</span> em cada campo.
            </>
          )}
        />
        <div className="flex flex-wrap gap-2">
          <span className="dash-kpi-pill">Epidemic: {hasEpidemicKey ? 'ok' : 'vazio'}</span>
          <span className="dash-kpi-pill">Pexels: {hasPexelsKey ? 'ok' : 'vazio'}</span>
          <span className="dash-kpi-pill">Pixabay: {hasPixabayKey ? 'ok' : 'vazio'}</span>
          <span className="dash-kpi-pill">Supermemory: {hasSupermemoryKey && supermemoryEnabled ? 'ativo' : hasSupermemoryKey ? 'pausado' : 'vazio'}</span>
        </div>
      </div>

      <div className="dash-settings-card space-y-3 border border-violet-500/20 bg-violet-500/5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <SettingLabel
            helpTitle="Supermemory"
            help="Memória persistente entre conversas. O chat do Lumiera injeta perfil e memórias relevantes antes de cada resposta e salva o diálogo automaticamente. No Cursor, use o MCP supermemory (OAuth) para o agente lembrar preferências entre sessões."
            align="start"
          >
            <span className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-violet-400" />
              Supermemory (memória entre sessões)
            </span>
          </SettingLabel>
          {badge(hasSupermemoryKey && supermemoryEnabled, 'Ativo', hasSupermemoryKey ? 'Desativado' : 'Não configurado')}
        </div>
        <p className="text-[10px] text-[var(--dash-muted)] leading-relaxed">
          Chave em{' '}
          <a href="https://console.supermemory.ai" target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">
            console.supermemory.ai
          </a>
          . Cursor: rode <code className="text-violet-300">.\scripts\setup-supermemory.ps1</code> ou use MCP em <code className="text-violet-300">.cursor/mcp.json</code>.
        </p>
        <input
          type="password"
          value={supermemoryKeyInput}
          onChange={(e) => setSupermemoryKeyInput(e.target.value)}
          placeholder="sm_... (vazio = manter atual)"
          className="dash-input"
        />
        <input
          type="text"
          value={supermemoryBaseUrlInput}
          onChange={(e) => setSupermemoryBaseUrlInput(e.target.value)}
          placeholder="Base URL opcional (local: http://localhost:6767)"
          className="dash-input"
        />
        <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={supermemoryEnabled}
            onChange={(e) => setSupermemoryEnabled(e.target.checked)}
            className="rounded border-zinc-600"
          />
          Usar memória no chat do Lumiera
        </label>
        <button
          type="button"
          onClick={onTestSupermemory}
          disabled={testingSupermemory || (!hasSupermemoryKey && !supermemoryKeyInput.trim())}
          className="dash-btn-ghost text-[10px] py-1.5 w-full sm:w-auto"
        >
          {testingSupermemory ? 'Testando...' : 'Testar conexão Supermemory'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <SettingLabel
              helpTitle="Epidemic Sound"
              help="Token JWT da Epidemic Sound. Permite buscar trilhas, efeitos sonoros e usar o autopilot de BGM no workflow de produção."
              align="start"
            >
              Epidemic Sound (MCP)
            </SettingLabel>
            {badge(hasEpidemicKey, 'Configurada', 'Não configurada')}
          </div>
          <input
            type="password"
            value={epidemicKeyInput}
            onChange={(e) => setEpidemicKeyInput(e.target.value)}
            placeholder="Token JWT do Epidemic Sound. Vazio = manter atual."
            className="dash-input"
          />
          <p className="text-[10px] text-[var(--dash-muted)] leading-relaxed">
            Busca de trilhas, SFX e autopilot de BGM no workflow.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <SettingLabel
                helpTitle="Pexels"
                help="Chave gratuita em pexels.com/api. Habilita busca automática de vídeos e fotos stock no Creator quando o roteiro pede B-roll."
                align="start"
              >
                Pexels API Key
              </SettingLabel>
              {optionalBadge(hasPexelsKey)}
            </div>
            <input
              type="password"
              value={pexelsKeyInput}
              onChange={(e) => setPexelsKeyInput(e.target.value)}
              placeholder="Chave em pexels.com/api"
              className="dash-input"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <SettingLabel
                helpTitle="Pixabay"
                help="Chave em pixabay.com/api/docs. Segunda fonte de stock — basta uma das duas (Pexels ou Pixabay) para o buscador automático funcionar."
                align="start"
              >
                Pixabay API Key
              </SettingLabel>
              {optionalBadge(hasPixabayKey)}
            </div>
            <input
              type="password"
              value={pixabayKeyInput}
              onChange={(e) => setPixabayKeyInput(e.target.value)}
              placeholder="Chave em pixabay.com/api/docs"
              className="dash-input"
            />
          </div>
          <p className="text-[10px] text-[var(--dash-muted)] leading-relaxed">
            Pexels ou Pixabay aceleram o B-roll; sem chaves, o Lumiera usa Bing Images (scrap) e Archive.org para imagens.
          </p>
        </div>
      </div>

      <div className="flex justify-end border-t border-[var(--dash-border)] pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="dash-btn-primary text-xs px-5 py-2.5 flex items-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Salvando...' : 'Salvar Chaves de API'}</span>
        </button>
      </div>
    </div>
  );
}