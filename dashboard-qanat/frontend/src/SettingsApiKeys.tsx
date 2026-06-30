import React from 'react';
import { KeyRound, RefreshCw, Save } from 'lucide-react';
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
    <span
      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
        ok ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-400' : 'bg-red-950/80 border border-red-800 text-red-400'
      }`}
    >
      {ok ? okLabel : failLabel}
    </span>
  );

  return (
    <div className="glass-panel p-4 sm:p-6 rounded-3xl space-y-5 min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <SectionHeader
          title="CHAVES DE API & MÍDIA"
          helpId="settings-apis"
          icon={<KeyRound className="w-4 h-4 text-gold-500" />}
          subtitle={(
            <>
              Trilhas, efeitos sonoros e download automático de B-roll. Use o <span className="text-gold-400/90">?</span> em cada campo para detalhes.
            </>
          )}
        />
        <div className="flex flex-wrap gap-2 text-[10px] text-zinc-400">
          <span className="px-2.5 py-1 rounded-lg border border-zinc-850 bg-zinc-950">
            Epidemic: {hasEpidemicKey ? 'ok' : 'vazio'}
          </span>
          <span className="px-2.5 py-1 rounded-lg border border-zinc-850 bg-zinc-950">
            Pexels: {hasPexelsKey ? 'ok' : 'vazio'}
          </span>
          <span className="px-2.5 py-1 rounded-lg border border-zinc-850 bg-zinc-950">
            Pixabay: {hasPixabayKey ? 'ok' : 'vazio'}
          </span>
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
            className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white"
          />
          <p className="text-[10px] text-zinc-500 leading-relaxed">
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
              {badge(hasPexelsKey, 'Configurada', 'Opcional')}
            </div>
            <input
              type="password"
              value={pexelsKeyInput}
              onChange={(e) => setPexelsKeyInput(e.target.value)}
              placeholder="Chave em pexels.com/api"
              className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white"
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
              {badge(hasPixabayKey, 'Configurada', 'Opcional')}
            </div>
            <input
              type="password"
              value={pixabayKeyInput}
              onChange={(e) => setPixabayKeyInput(e.target.value)}
              placeholder="Chave em pixabay.com/api/docs"
              className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white"
            />
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Pelo menos uma chave de stock habilita o buscador automático de B-roll no Creator.
          </p>
        </div>
      </div>

      <div className="flex justify-end border-t border-zinc-900 pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Salvando...' : 'Salvar Chaves de API'}</span>
        </button>
      </div>
    </div>
  );
}