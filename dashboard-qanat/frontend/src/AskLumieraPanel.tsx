import React, { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { formatStudioTime } from "./timelineStudioTypes";

type Message = { role: "user" | "assistant"; text: string };

type Props = {
  playhead: number;
  nichePack: string;
  onPlaceholderAction?: (prompt: string) => void;
};

const SUGGESTIONS = [
  "Adiciona um pictograma de população aqui",
  "Busca stock de floresta no Pexels",
  "Aplica pacote Jornalismo de Dados",
  "Ajusta legendas deste trecho",
];

export function AskLumieraPanel({
  playhead,
  nichePack,
  onPlaceholderAction,
}: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Sou o assistente da timeline. Arraste e redimensione clips, edite legendas no inspetor. Na Fase 4 vou inserir overlays, buscar stock e aplicar pacotes de nicho via IA.",
    },
  ]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      {
        role: "assistant",
        text: `Recebi o pedido em ${formatStudioTime(playhead)} (pacote: ${nichePack}). A integração IA completa chega na Fase 4.`,
      },
    ]);
    setInput("");
    onPlaceholderAction?.(trimmed);
  };

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/60 bg-gradient-to-r from-indigo-950/40 to-zinc-900/40">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-bold text-white">Ask Lumiera</span>
        <span className="ml-auto text-[9px] text-zinc-500 uppercase">
          {nichePack}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
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
      </div>

      <div className="px-2 pb-2 flex flex-wrap gap-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="text-[9px] px-2 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:border-indigo-500/40 hover:text-indigo-200 transition cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="p-2 border-t border-zinc-800/60 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Peça um template, stock ou ajuste…"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
        />
        <button
          type="button"
          onClick={() => send(input)}
          className="shrink-0 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
          title="Enviar"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
