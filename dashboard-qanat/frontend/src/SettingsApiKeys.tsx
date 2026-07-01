import React from 'react';
import { KeyRound, RefreshCw, Save } from 'lucide-react';
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
              Trilhas, efeitos sonoros e download automático de B-roll. Use o <span className="text-[var(--dash-primary)]">?</span> em cada campo para detalhes.
            </>
          )}
        />
        <div className="flex flex-wrap gap-2">
          <span className="dash-kpi-pill">Epidemic: {hasEpidemicKey ? 'ok' : 'vazio'}</span>
          <span className="dash-kpi-pill">Pexels: {hasPexelsKey ? 'ok' : 'vazio'}</span>
          <span className="dash-kpi-pill">Pixabay: {hasPixabayKey ? 'ok' : 'vazio'}</span>
        </div>
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