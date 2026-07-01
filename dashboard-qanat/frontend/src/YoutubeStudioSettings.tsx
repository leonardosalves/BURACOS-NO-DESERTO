import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, Loader2, Mail, Settings, Target } from 'lucide-react';

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

type LumieraProject = {
  projectName: string;
  format?: string;
};

type Props = {
  toast: (msg: string) => void;
  periodDays?: number;
  onSaved?: () => void;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function YoutubeStudioSettings({ toast, periodDays = 28, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weeklyEmail, setWeeklyEmail] = useState('');
  const [dailyEmail, setDailyEmail] = useState('');
  const [smtp, setSmtp] = useState<SmtpConfig>({ host: '', port: 587, user: '', pass: '', from: '' });
  const [defaultGoal, setDefaultGoal] = useState(100);
  const [projectGoals, setProjectGoals] = useState<Record<string, { views48h?: number }>>({});
  const [projects, setProjects] = useState<LumieraProject[]>([]);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, lumieraRes] = await Promise.all([
        fetch('/api/youtube/channel/settings'),
        fetch(`/api/youtube/channel/lumiera-videos?days=${periodDays}`),
      ]);
      const settings = await settingsRes.json();
      const lumiera = await lumieraRes.json();
      if (settingsRes.ok) {
        setWeeklyEmail(settings.weeklyReportEmail || '');
        setDailyEmail(settings.dailyReportEmail || '');
        setDefaultGoal(settings.defaultProjectGoalViews48h ?? 100);
        setProjectGoals(settings.projectGoals || {});
        const s = settings.smtp;
        if (s) {
          setSmtp({
            host: s.host || '',
            port: s.port || 587,
            user: s.user || '',
            pass: s.pass || '',
            from: s.from || s.user || '',
          });
        }
      }
      if (lumieraRes.ok) {
        setProjects((lumiera.videos || []).map((v: { projectName: string; format?: string }) => ({
          projectName: v.projectName,
          format: v.format,
        })));
      }
    } catch {
      toast('Erro ao carregar configurações do Studio.');
    } finally {
      setLoading(false);
    }
  }, [periodDays, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone;
    if (standalone) setPwaInstalled(true);
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/youtube/channel/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeklyReportEmail: weeklyEmail,
          dailyReportEmail: dailyEmail,
          defaultProjectGoalViews48h: defaultGoal,
          projectGoals,
          smtp: smtp.host ? smtp : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Falha ao salvar');
      toast('Configurações salvas.');
      load();
      onSaved?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const setProjectGoal = (projectName: string, views48h: number) => {
    setProjectGoals((prev) => ({
      ...prev,
      [projectName]: { views48h: Math.max(1, views48h || defaultGoal) },
    }));
  };

  const installPwa = async () => {
    if (!installPrompt) {
      toast(import.meta.env.PROD
        ? 'Use o menu do navegador → Instalar Lumiera.'
        : 'PWA disponível após npm run build + servidor de produção.');
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setPwaInstalled(true);
      setInstallPrompt(null);
      toast('Lumiera instalado como app.');
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-center gap-2 text-zinc-500 text-[11px]">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando configurações…
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-2xl space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Settings className="w-4 h-4 text-zinc-400" />
        Configurações do canal
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="dash-settings-card rounded-xl space-y-2">
          <p className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" /> Relatórios por e-mail
          </p>
          <label className="block text-[8px] text-zinc-500">Semanal</label>
          <input
            type="email"
            value={weeklyEmail}
            onChange={(e) => setWeeklyEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white"
          />
          <label className="block text-[8px] text-zinc-500">Diário</label>
          <input
            type="email"
            value={dailyEmail}
            onChange={(e) => setDailyEmail(e.target.value)}
            placeholder="opcional — usa o semanal se vazio"
            className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white"
          />
        </div>

        <div className="dash-settings-card rounded-xl space-y-2">
          <p className="text-[10px] font-bold text-zinc-300">SMTP (envio automático)</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={smtp.host}
              onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
              placeholder="smtp.gmail.com"
              className="col-span-2 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white"
            />
            <input
              type="number"
              value={smtp.port}
              onChange={(e) => setSmtp((s) => ({ ...s, port: Number(e.target.value) || 587 }))}
              placeholder="587"
              className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white"
            />
            <input
              value={smtp.from}
              onChange={(e) => setSmtp((s) => ({ ...s, from: e.target.value }))}
              placeholder="remetente@email.com"
              className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white"
            />
            <input
              value={smtp.user}
              onChange={(e) => setSmtp((s) => ({ ...s, user: e.target.value }))}
              placeholder="usuário SMTP"
              className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white"
            />
            <input
              type="password"
              value={smtp.pass}
              onChange={(e) => setSmtp((s) => ({ ...s, pass: e.target.value }))}
              placeholder="senha / app password"
              className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white"
            />
          </div>
          <p className="text-[8px] text-zinc-600">Gmail: use senha de app. Relatórios em Ferramentas → Gerar / Enviar.</p>
        </div>
      </div>

      <div className="dash-settings-card rounded-xl space-y-2">
        <p className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
          <Target className="w-3.5 h-3.5 text-amber-400" /> Metas views 48h
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[9px] text-zinc-500">Padrão para novos projetos</label>
          <input
            type="number"
            min={1}
            value={defaultGoal}
            onChange={(e) => setDefaultGoal(Number(e.target.value) || 100)}
            className="w-20 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-white"
          />
          <span className="text-[8px] text-zinc-600">views em 48h</span>
        </div>
        {projects.length > 0 ? (
          <ul className="space-y-1 max-h-36 overflow-y-auto">
            {projects.map((p) => (
              <li key={p.projectName} className="flex items-center justify-between gap-2 text-[9px]">
                <span className="text-zinc-400 truncate">
                  {p.projectName}
                  {p.format ? <span className="text-zinc-600 ml-1">· {p.format}</span> : null}
                </span>
                <input
                  type="number"
                  min={1}
                  value={projectGoals[p.projectName]?.views48h ?? defaultGoal}
                  onChange={(e) => setProjectGoal(p.projectName, Number(e.target.value))}
                  className="w-16 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-white tabular-nums"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[9px] text-zinc-600">Nenhum projeto Lumiera publicado ainda.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!pwaInstalled ? (
            <button
              type="button"
              onClick={installPwa}
              className="text-[9px] px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 inline-flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Instalar app (PWA)
            </button>
          ) : (
            <span className="text-[9px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> App instalado
            </span>
          )}
          {!import.meta.env.PROD && (
            <span className="text-[8px] text-zinc-600">Build de produção necessária para instalar</span>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="dash-btn-primary text-[10px] px-3 py-1.5 font-bold disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  );
}