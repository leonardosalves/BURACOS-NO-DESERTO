import React, { useMemo, useState } from "react";
import {
  MessageCircleQuestion,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export type NotebooklmTurn = {
  role: "assistant" | "user";
  content: string;
  questions?: string[];
  at?: string;
};

export type NotebooklmPipelineStep = {
  id: string;
  label: string;
};

export type NotebooklmBriefInfo = {
  path?: string;
  status?: string;
  skip_web_research?: boolean;
  fact_count?: number;
  location_count?: number;
  char_count?: number;
  markdown_preview?: string;
  checklist?: Record<string, boolean | number>;
  pipeline_steps?: NotebooklmPipelineStep[];
};

export type NotebooklmSession = {
  niche?: string;
  format?: string;
  purpose?: string;
  status?: string;
  awaitingUser?: boolean;
  questions?: string[];
  turns?: NotebooklmTurn[];
  accumulatedSummary?: string;
  notebooklm_brief_path?: string;
  readiness?: {
    ready?: boolean;
    reason?: string;
    confidence?: number;
  };
};

type Props = {
  session: NotebooklmSession | null;
  brief?: NotebooklmBriefInfo | null;
  loading?: boolean;
  onReply: (reply: string) => Promise<void>;
  onProceed: () => Promise<void>;
};

export function NotebooklmEnrichmentPanel({
  session,
  brief = null,
  loading = false,
  onReply,
  onProceed,
}: Props) {
  const [reply, setReply] = useState("");
  const [proceeding, setProceeding] = useState(false);

  const latestAssistant = useMemo(() => {
    const turns = session?.turns || [];
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      if (turns[i]?.role === "assistant") return turns[i];
    }
    return null;
  }, [session?.turns]);

  if (!session) return null;

  const questions =
    session.questions?.length > 0
      ? session.questions
      : latestAssistant?.questions || [];
  const readiness = session.readiness;
  const userTurns = (session.turns || []).filter(
    (t) => t.role === "user"
  ).length;
  const ready =
    (Boolean(readiness?.ready) && !session.awaitingUser) || userTurns >= 2;

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25">
          <MessageCircleQuestion className="w-4 h-4 text-indigo-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">
            NotebookLM — enriquecimento interativo
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            O NotebookLM fez perguntas para aprofundar o assunto. Responda
            abaixo — tudo é salvo em{" "}
            <code className="text-indigo-200/90">
              {brief?.path ||
                session?.notebooklm_brief_path ||
                "notebooklm_research_brief.md"}
            </code>{" "}
            e usado para roteiro, narração e templates Remotion (sem repetir
            buscas na web quando o brief estiver completo).
          </p>
        </div>
        {ready ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2 py-1">
            <CheckCircle2 className="w-3 h-3" />
            Pronto
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2 py-1">
            <AlertCircle className="w-3 h-3" />
            Aguardando
          </span>
        )}
      </div>

      {latestAssistant?.content && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
          {latestAssistant.content}
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300/90">
            Perguntas do NotebookLM
          </p>
          {questions.map((q) => (
            <div
              key={q}
              className="rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100"
            >
              {q}
            </div>
          ))}
        </div>
      )}

      {readiness?.reason && (
        <p className="text-[10px] text-zinc-500">{readiness.reason}</p>
      )}

      {(brief?.pipeline_steps?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Checklist do brief MD
          </p>
          <ul className="space-y-1.5">
            {brief?.pipeline_steps?.map((step) => {
              const done = Boolean(brief?.checklist?.[step.id]);
              const turnNote =
                step.id === "editor_respondeu" &&
                Number(brief?.checklist?.editor_turns) > 0
                  ? ` (${brief?.checklist?.editor_turns})`
                  : "";
              return (
                <li
                  key={step.id}
                  className={`flex items-center gap-2 text-[11px] ${
                    done ? "text-emerald-300" : "text-zinc-500"
                  }`}
                >
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[9px] font-bold ${
                      done
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                        : "border-zinc-700 bg-zinc-900 text-zinc-600"
                    }`}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span>
                    {step.label}
                    {turnNote}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {(brief?.fact_count ?? 0) > 0 && (
        <p className="text-[10px] text-emerald-400/90">
          Brief MD: {brief?.fact_count ?? 0} fatos
          {(brief?.location_count ?? 0) > 0
            ? ` · ${brief?.location_count} locais/POIs`
            : ""}
          {brief?.skip_web_research ? " · busca web dispensada" : ""}
        </p>
      )}

      {brief?.markdown_preview?.trim() && (
        <details className="text-[10px] text-zinc-500">
          <summary className="cursor-pointer hover:text-zinc-400 font-bold uppercase tracking-wider">
            Prévia do brief MD ({brief.char_count ?? 0} chars)
          </summary>
          <pre className="mt-2 p-3 bg-zinc-950/80 border border-zinc-900 rounded-lg whitespace-pre-wrap text-zinc-400 max-h-40 overflow-y-auto text-[11px]">
            {brief.markdown_preview}
          </pre>
        </details>
      )}

      {session.accumulatedSummary?.trim() && (
        <details className="text-[10px] text-zinc-500">
          <summary className="cursor-pointer hover:text-zinc-400 font-bold uppercase tracking-wider">
            Material acumulado ({session.accumulatedSummary.length} chars)
          </summary>
          <pre className="mt-2 p-3 bg-zinc-950/80 border border-zinc-900 rounded-lg whitespace-pre-wrap text-zinc-400 max-h-40 overflow-y-auto text-[11px]">
            {session.accumulatedSummary}
          </pre>
        </details>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <textarea
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          disabled={loading || proceeding}
          placeholder='Ex.: "Sim, faça a pesquisa na web sobre os túneis de Củ Chi e traga números reais."'
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white resize-y min-h-[72px] focus:outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          disabled={loading || proceeding || !reply.trim()}
          onClick={() => {
            const text = reply.trim();
            if (!text) return;
            setReply("");
            void onReply(text);
          }}
          className="sm:self-end inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-3 rounded-xl border border-indigo-500/30"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Enviar resposta
        </button>
      </div>

      {userTurns >= 1 && (
        <p className="text-[10px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Quando tiver material suficiente, clique em{" "}
          <strong>Prosseguir</strong> — não use &quot;Consultar NotebookLM&quot;
          de novo (isso reinicia o painel).
        </p>
      )}

      <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-zinc-900/60">
        <button
          type="button"
          disabled={loading || proceeding}
          onClick={() => {
            setProceeding(true);
            void onProceed().finally(() => setProceeding(false));
          }}
          className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-gold-500/20"
        >
          {proceeding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Prosseguir com roteiro / narração
        </button>
      </div>
    </div>
  );
}
