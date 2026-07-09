import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { NicheTemplatePalette } from "./NicheTemplatePalette";
import { formatStudioTime } from "./timelineStudioTypes";
import type { AskLumieraAction, NichePackInfo } from "./timelineStudioAskTypes";

type Message = { role: "user" | "assistant"; text: string };

type Props = {
  playhead: number;
  nichePack: string;
  catalogNiche?: string;
  aspectRatio?: string;
  getProjectUrl: (path: string) => string;
  onActions: (actions: AskLumieraAction[]) => void;
  onInsertTemplate: (
    templateId: string,
    options?: { label?: string; props?: Record<string, unknown> }
  ) => void;
  onSelectPack: (packId: string) => void;
};

const SUGGESTIONS = [
  'Muda essa legenda para "Como tudo comecou"',
  "Deixa esse clip com 4s",
  "Move esse clip para 0:20",
  "Fecha os gaps",
  "Adiciona um pictograma de população aqui",
  "Busca stock de floresta no Pexels",
  "Aplica pacote Jornalismo de Dados",
  "Intro de local em Tóquio",
];

export function AskLumieraPanel({
  playhead,
  nichePack,
  catalogNiche,
  aspectRatio = "16:9",
  getProjectUrl,
  onActions,
  onInsertTemplate,
  onSelectPack,
}: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [packs, setPacks] = useState<NichePackInfo[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Sou o Ask Lumiera. Peça templates, stock ou troca de pacote — ou use os botões + abaixo.",
    },
  ]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          getProjectUrl("/api/timeline-studio/niche-packs")
        );
        if (!res.ok) return;
        const data = await res.json();
        setPacks((data.packs || []) as NichePackInfo[]);
      } catch {
        /* catalogo opcional */
      }
    })();
  }, [getProjectUrl]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch(getProjectUrl("/api/timeline-studio/ask"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            playhead,
            niche_pack: nichePack,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const reply = String(data.reply || "Pronto.").replace(/\*\*/g, "");

        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);

        const actions = (data.actions || []) as AskLumieraAction[];
        if (actions.length) {
          onActions(actions);
        }
      } catch (err) {
        const msg = (err as Error).message;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Erro: ${msg}` },
        ]);
        toast.error(`Ask Lumiera: ${msg}`);
      } finally {
        setLoading(false);
      }
    },
    [getProjectUrl, loading, nichePack, onActions, playhead]
  );

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/60 bg-gradient-to-r from-indigo-950/40 to-zinc-900/40">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-bold text-white">Ask Lumiera</span>
        <span className="ml-auto text-[9px] text-zinc-500 font-mono">
          {formatStudioTime(playhead)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[80px]">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-[11px] leading-relaxed rounded-xl px-3 py-2 ${
              m.role === "user"
                ? "bg-indigo-500/15 border border-indigo-500/25 text-indigo-100 ml-4"
                : "bg-zinc-900/80 border border-zinc-800 text-zinc-300 mr-2"
            }`}
          >
            {m.role === "assistant" ? (
              <Bot className="w-3 h-3 inline mr-1 text-indigo-400" />
            ) : null}
            {m.text}
          </div>
        ))}
        {loading ? (
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 px-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Pensando…
          </div>
        ) : null}
      </div>

      <div className="px-2 pb-1 flex flex-wrap gap-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={loading}
            onClick={() => void send(s)}
            className="text-[9px] px-2 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:border-indigo-500/40 hover:text-indigo-200 transition cursor-pointer disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <NicheTemplatePalette
        activePackId={nichePack}
        packs={packs}
        playhead={playhead}
        catalogNiche={catalogNiche}
        aspectRatio={aspectRatio}
        getProjectUrl={getProjectUrl}
        onInsertTemplate={onInsertTemplate}
        onSelectPack={onSelectPack}
      />

      <div className="p-2 border-t border-zinc-800/60 flex gap-2">
        <input
          type="text"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send(input)}
          placeholder="Peça um template, stock ou ajuste…"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void send(input)}
          className="shrink-0 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer disabled:opacity-50"
          title="Enviar"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
