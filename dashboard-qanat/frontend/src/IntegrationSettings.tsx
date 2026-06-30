import React from 'react';
import { Plug } from 'lucide-react';
import { SettingHelpTip } from './SettingHelpTip';
import { SectionHeader } from './SectionHeader';

type UploadStatus = {
  youtube: any;
  canva?: any;
  instagram: any;
  tiktok: any;
  kwai: any;
};

type Props = {
  uploadStatus: UploadStatus;
  toast: (msg: string) => void;
  fetchUploadStatus: () => void;
  onRelinkYoutube: () => void;
  canvaClientId: string;
  setCanvaClientId: (v: string) => void;
  canvaClientSecret: string;
  setCanvaClientSecret: (v: string) => void;
  ytClientId: string;
  setYtClientId: (v: string) => void;
  ytClientSecret: string;
  setYtClientSecret: (v: string) => void;
  igAppId: string;
  setIgAppId: (v: string) => void;
  igAppSecret: string;
  setIgAppSecret: (v: string) => void;
  igAccountId: string;
  setIgAccountId: (v: string) => void;
  igAccessToken: string;
  setIgAccessToken: (v: string) => void;
};

export function IntegrationSettings({
  uploadStatus,
  toast,
  fetchUploadStatus,
  onRelinkYoutube,
  canvaClientId,
  setCanvaClientId,
  canvaClientSecret,
  setCanvaClientSecret,
  ytClientId,
  setYtClientId,
  ytClientSecret,
  setYtClientSecret,
  igAppId,
  setIgAppId,
  igAppSecret,
  setIgAppSecret,
  igAccountId,
  setIgAccountId,
  igAccessToken,
  setIgAccessToken,
}: Props) {
  return (
    <div className="glass-panel p-6 rounded-3xl space-y-5">
      <div className="border-b border-zinc-900 pb-4">
        <SectionHeader
          title="INTEGRAÇÕES DE PUBLICAÇÃO"
          helpId="settings-integracoes"
          icon={<Plug className="w-4 h-4 text-gold-500" />}
          subtitle={(
            <>
              OAuth e credenciais para publicar e exportar. Toque no <span className="text-gold-400/90">?</span> de cada plataforma.
            </>
          )}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Canva */}
        <div className="space-y-3 p-4 bg-zinc-950 rounded-2xl border border-zinc-900/60 text-xs">
          <div className="flex justify-between items-center gap-2">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              Canva Connect
              <SettingHelpTip title="Canva" align="start">
                Conecta sua conta Canva para exportar thumbnails e artes do vídeo direto do Lumiera, sem baixar e reenviar manualmente.
              </SettingHelpTip>
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${uploadStatus.canva?.connected ? 'bg-cyan-500/10 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>
              {uploadStatus.canva?.connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <p className="text-[9px] text-zinc-500 leading-relaxed">
            Redirect: <code className="text-cyan-300">http://127.0.0.1:3005/api/canva/callback</code>
          </p>
          {!uploadStatus.canva?.hasSecrets ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Canva Client ID"
                value={canvaClientId}
                onChange={(e) => setCanvaClientId(e.target.value)}
                className="w-full bg-black border border-zinc-850 focus:border-cyan-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-white"
              />
              <input
                type="password"
                placeholder="Canva Client Secret"
                value={canvaClientSecret}
                onChange={(e) => setCanvaClientSecret(e.target.value)}
                className="w-full bg-black border border-zinc-850 focus:border-cyan-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-white"
              />
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch('/api/canva/save-credentials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      client_id: canvaClientId.trim(),
                      client_secret: canvaClientSecret.trim(),
                    }),
                  });
                  if (res.ok) {
                    toast('Credenciais do Canva salvas!');
                    fetchUploadStatus();
                  }
                }}
                className="w-full bg-zinc-900 hover:bg-zinc-850 text-white font-bold py-1.5 rounded-lg text-[10px]"
              >
                Salvar Chaves Canva
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-400">Credenciais configuradas.</p>
              {!uploadStatus.canva?.connected && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch('/api/canva/auth-url');
                    if (res.ok) {
                      const data = await res.json();
                      window.open(data.url, '_blank');
                      toast('Autorize o Canva na nova aba.');
                    }
                  }}
                  className="w-full bg-cyan-500 text-zinc-950 font-bold py-1.5 rounded-lg text-[10px]"
                >
                  Vincular Conta Canva
                </button>
              )}
            </div>
          )}
        </div>

        {/* YouTube */}
        <div className="space-y-3 p-4 bg-zinc-950 rounded-2xl border border-zinc-900/60 text-xs">
          <span className="font-bold text-zinc-300 flex items-center gap-1.5">
            YouTube (upload + analytics)
            <SettingHelpTip title="YouTube" align="start">
              Upload direto, metadados, teste A/B de títulos e analytics. Exige OAuth Google com as permissões de canal e YouTube Data API.
            </SettingHelpTip>
          </span>
          <p className="text-[9px] text-zinc-500 leading-relaxed">
            Redirect: <code className="text-gold-400">http://127.0.0.1:3005/api/upload/youtube/callback</code>
          </p>
          {!uploadStatus.youtube?.has_secrets ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Client ID"
                value={ytClientId}
                onChange={(e) => setYtClientId(e.target.value)}
                className="w-full bg-black border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-white"
              />
              <input
                type="password"
                placeholder="Client Secret"
                value={ytClientSecret}
                onChange={(e) => setYtClientSecret(e.target.value)}
                className="w-full bg-black border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-white"
              />
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch('/api/upload/youtube/save-credentials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ client_id: ytClientId.trim(), client_secret: ytClientSecret.trim() }),
                  });
                  if (res.ok) {
                    toast('Credenciais do YouTube salvas!');
                    fetchUploadStatus();
                  }
                }}
                className="w-full bg-zinc-900 hover:bg-zinc-850 text-white font-bold py-1.5 rounded-lg text-[10px]"
              >
                Salvar Chaves YouTube
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-400">
                {uploadStatus.youtube?.connected
                  ? uploadStatus.youtube?.titleTestReady
                    ? 'Conectado com upload + títulos + analytics.'
                    : 'Conectado, mas faltam permissões para teste A/B.'
                  : 'Credenciais configuradas.'}
              </p>
              {!uploadStatus.youtube?.connected ? (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch('/api/upload/youtube/auth-url');
                    if (res.ok) {
                      const data = await res.json();
                      window.open(data.url, '_blank');
                      toast('Autorize todas as permissões solicitadas.');
                    }
                  }}
                  className="w-full bg-gold-500 text-zinc-950 font-bold py-1.5 rounded-lg text-[10px]"
                >
                  Vincular Conta Google
                </button>
              ) : !uploadStatus.youtube?.titleTestReady ? (
                <button type="button" onClick={onRelinkYoutube} className="w-full bg-amber-500 text-zinc-950 font-bold py-1.5 rounded-lg text-[10px]">
                  Revincular (ativar teste A/B)
                </button>
              ) : (
                <button type="button" onClick={onRelinkYoutube} className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-bold py-1.5 rounded-lg text-[10px]">
                  Reconectar conta
                </button>
              )}
            </div>
          )}
        </div>

        {/* Instagram */}
        <div className="space-y-3 p-4 bg-zinc-950 rounded-2xl border border-zinc-900/60 text-xs">
          <span className="font-bold text-zinc-300 flex items-center gap-1.5">
            Instagram
            <SettingHelpTip title="Instagram" align="start">
              Publicação via Meta Graph API. OAuth com App ID/Secret ou token manual da conta Business/Creator vinculada.
            </SettingHelpTip>
          </span>
          <p className="text-[9px] text-zinc-500">OAuth Meta ou token manual.</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Meta App ID"
              value={igAppId}
              onChange={(e) => setIgAppId(e.target.value)}
              className="bg-black border border-zinc-850 rounded-lg px-2 py-1.5 text-[11px] text-white"
            />
            <input
              type="password"
              placeholder="Meta App Secret"
              value={igAppSecret}
              onChange={(e) => setIgAppSecret(e.target.value)}
              className="bg-black border border-zinc-850 rounded-lg px-2 py-1.5 text-[11px] text-white"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/upload/instagram/save-app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_id: igAppId.trim(), app_secret: igAppSecret.trim() }),
              });
              const res = await fetch('/api/upload/instagram/oauth-url');
              if (res.ok) {
                const data = await res.json();
                window.open(data.url, '_blank');
                toast('Autorize o Instagram no Meta e volte ao painel.');
              } else toast('Configure App ID/Secret primeiro.');
            }}
            className="w-full bg-pink-500/10 border border-pink-500/30 text-pink-300 font-bold py-1.5 rounded-lg text-[10px]"
          >
            Conectar Instagram (OAuth)
          </button>
          <div className="space-y-2 border-t border-zinc-800 pt-2">
            <input
              type="text"
              placeholder="ID da Conta Business"
              value={igAccountId}
              onChange={(e) => setIgAccountId(e.target.value)}
              className="w-full bg-black border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] text-white"
            />
            <input
              type="password"
              placeholder="Token de Acesso Graph API"
              value={igAccessToken}
              onChange={(e) => setIgAccessToken(e.target.value)}
              className="w-full bg-black border border-zinc-850 rounded-lg px-2.5 py-1.5 text-[11px] text-white"
            />
            <button
              type="button"
              onClick={async () => {
                const res = await fetch('/api/upload/instagram/save-credentials', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    instagram_business_account_id: igAccountId.trim(),
                    access_token: igAccessToken.trim(),
                  }),
                });
                if (res.ok) {
                  toast('Credenciais do Instagram salvas!');
                  fetchUploadStatus();
                }
              }}
              className="w-full bg-zinc-900 hover:bg-zinc-850 text-white font-bold py-1.5 rounded-lg text-[10px]"
            >
              Salvar Token Manual
            </button>
          </div>
        </div>

        {/* TikTok + Kwai */}
        <div className="space-y-3">
          <div className="space-y-2 p-4 bg-zinc-950 rounded-2xl border border-zinc-900/60 text-xs">
            <div className="flex justify-between items-center gap-2">
              <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                TikTok Session
                <SettingHelpTip title="TikTok" align="start">
                  Abre um navegador controlado para você fazer login no TikTok. A sessão fica salva para upload automático de Shorts.
                </SettingHelpTip>
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${uploadStatus.tiktok?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                {uploadStatus.tiktok?.connected ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                const res = await fetch('/api/upload/launch-login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ platform: 'tiktok' }),
                });
                if (res.ok) toast('Navegador de login aberto. Faça login e feche a janela.');
              }}
              className="w-full bg-zinc-900 hover:bg-zinc-850 text-white font-bold py-1.5 rounded-lg text-[10px]"
            >
              Iniciar Login no TikTok
            </button>
          </div>
          <div className="space-y-2 p-4 bg-zinc-950 rounded-2xl border border-zinc-900/60 text-xs">
            <div className="flex justify-between items-center gap-2">
              <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                Kwai Session
                <SettingHelpTip title="Kwai" align="end">
                  Mesmo fluxo do TikTok: login via navegador automatizado e sessão persistida para publicar no Kwai.
                </SettingHelpTip>
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${uploadStatus.kwai?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                {uploadStatus.kwai?.connected ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                const res = await fetch('/api/upload/launch-login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ platform: 'kwai' }),
                });
                if (res.ok) toast('Navegador de login aberto. Faça login e feche a janela.');
              }}
              className="w-full bg-zinc-900 hover:bg-zinc-850 text-white font-bold py-1.5 rounded-lg text-[10px]"
            >
              Iniciar Login no Kwai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}