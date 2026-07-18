import React, { useState } from "react";
import {
  Github,
  Terminal,
  Cpu,
  Wrench,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Sliders,
  Scissors,
  CheckCircle,
} from "lucide-react";
import { DashminPageLayout } from "./DashminPageLayout";

export function AppToolsTab() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const cloneCommands = `# Clonar o repositório OpenShorts
git clone https://github.com/mutonby/openshorts.git
cd openshorts

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env

# Executar a plataforma
python main.py`;

  const handleCopy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <DashminPageLayout
      title="Central de Ferramentas"
      subtitle="Integrações externas e ferramentas de automação no ecossistema Lumiera"
      breadcrumb={["Estúdio", "Ferramentas"]}
      icon={<Wrench className="w-6 h-6 text-amber-400" />}
    >
      <div className="space-y-8 max-w-[1600px] text-balance-safe">
        {/* Banner Principal / Hero do OpenShorts */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-8 shadow-2xl">
          {/* Efeitos de Glow no Background */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-1">
            <div className="space-y-4 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                <Github className="w-3.5 h-3.5" />
                Repositório Recomendado
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-300">
                mutonby / openshorts
              </h1>
              <p className="text-slate-300 text-base leading-relaxed">
                O <strong>OpenShorts</strong> é uma plataforma de automação de
                vídeos com IA, de código aberto e livre de marcas d'água. Ideal
                para geração de clipes virais, legendagem inteligente de Shorts
                (UGC com atores digitais) e integração direta com estúdios de
                conteúdo autônomos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <a
                href="https://github.com/mutonby/openshorts"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-medium transition-all duration-200 border border-slate-700 shadow-md group"
              >
                Ver no GitHub
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </a>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    "https://github.com/mutonby/openshorts.git",
                    "link"
                  )
                }
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all duration-200 shadow-lg shadow-emerald-500/10"
              >
                {copiedText === "link" ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Clone URL
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Grid de Recursos e Instruções */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Principais Recursos do OpenShorts */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 lg:p-8 space-y-6">
              <h2 className="text-lg font-bold text-white tracking-wide border-b border-slate-850 pb-3 flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-emerald-400" />
                Destaques da Plataforma
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4 p-4 rounded-xl bg-slate-950/30 border border-slate-850">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Scissors className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm">
                      Geração de Clipes Inteligente
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Analisa transcrições de vídeos longos usando IA para
                      identificar momentos com alto potencial de retenção e
                      viralização.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-slate-950/30 border border-slate-850">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm">
                      Legendas Dinâmicas
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Aplica corte vertical automático e queima de legendas
                      animadas em lote, otimizando o feed de Shorts e TikToks.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-slate-950/30 border border-slate-850">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Cpu className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm">
                      Atores e UGC com IA
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Suporta workflows de criação de criativos pagos (UGC Ads)
                      com vozes e avatares digitais sem marca d'água.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-slate-950/30 border border-slate-850">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm">
                      Estrutura Auto-Hospedada
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Completamente self-hosted. Rode localmente para ter
                      controle total de seus dados e eliminar os custos
                      recorrentes de SaaS.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status de Integração com o Lumiera */}
              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-indigo-200">
                      Compatibilidade do Sistema
                    </h4>
                    <p className="text-xs text-slate-400">
                      O Lumiera pode integrar-se nativamente com as transcrições
                      do OpenShorts via API local.
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-semibold">
                  API: DISPONÍVEL
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Instruções de Instalação e Execução */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 flex flex-col gap-4 h-full">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2.5">
                  <Terminal className="w-5 h-5 text-amber-400" />
                  Quick Setup
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopy(cloneCommands, "commands")}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Copiar comandos"
                >
                  {copiedText === "commands" ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex-1 font-mono text-[12px] text-slate-300 leading-relaxed bg-slate-950/80 border border-slate-850 rounded-xl p-4 overflow-x-auto select-all shadow-inner whitespace-pre">
                {cloneCommands}
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-850 pt-3">
                💡 Requer <strong>Python 3.10+</strong> e{" "}
                <strong>FFmpeg</strong> instalado no path do sistema operacional
                para processamento de vídeo de alta fidelidade.
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashminPageLayout>
  );
}
