import React from "react";
import { CheckCircle, RefreshCw, Send } from "lucide-react";

export type DashChatMessage = {
  role: "user" | "assistant" | string;
  content: string;
};

export type DashChatSuggestion = {
  label: string;
  message: string;
};

type DashminAiChatProps = {
  messages: DashChatMessage[];
  loading: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;
  hasApiKey: boolean;
  chatEndRef?: React.RefObject<HTMLDivElement>;
  suggestions?: DashChatSuggestion[];
  inputPlaceholder?: string;
  userLabel?: string;
  assistantLabel?: string;
  loadingLabel?: string;
  compact?: boolean;
  renderMessageExtra?: (msg: DashChatMessage, index: number) => React.ReactNode;
};

export function DashminAiChat({
  messages,
  loading,
  input,
  onInputChange,
  onSend,
  hasApiKey,
  chatEndRef,
  suggestions = [],
  inputPlaceholder,
  userLabel = "Você",
  assistantLabel = "Agente IA",
  loadingLabel = "Escrevendo resposta...",
  compact = false,
  renderMessageExtra,
}: DashminAiChatProps) {
  const bubblePad = compact ? "px-3 py-2" : "px-4 py-3";
  const bubbleText = compact ? "text-[11px]" : "text-xs";
  const labelText = compact ? "text-[8px]" : "text-[9px]";

  return (
    <div
      className={`dash-chat flex flex-col min-h-0 flex-1 ${compact ? "dash-chat-compact" : ""}`}
    >
      <div className="dash-chat-messages flex-1 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`dash-chat-row ${msg.role === "user" ? "dash-chat-row-user" : "dash-chat-row-assistant"}`}
          >
            <div className={`dash-chat-label ${labelText}`}>
              {msg.role === "user" ? userLabel : assistantLabel}
            </div>
            <div
              className={`dash-chat-bubble ${bubblePad} ${bubbleText} ${msg.role === "user" ? "dash-chat-bubble-user" : "dash-chat-bubble-assistant"}`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {renderMessageExtra?.(msg, i)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="dash-chat-row dash-chat-row-assistant">
            <div className={`dash-chat-label ${labelText}`}>
              {assistantLabel}
            </div>
            <div
              className={`dash-chat-bubble dash-chat-bubble-assistant dash-chat-bubble-loading ${bubblePad} ${bubbleText}`}
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>{loadingLabel}</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {suggestions.length > 0 && (
        <div className="dash-chat-chips shrink-0">
          {suggestions.map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={loading || !hasApiKey}
              onClick={() => onSend(chip.message)}
              className="dash-chat-chip"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      <div className="dash-chat-composer shrink-0">
        <input
          disabled={loading || !hasApiKey}
          type="text"
          placeholder={
            inputPlaceholder ??
            (hasApiKey
              ? "Faça uma pergunta sobre o vídeo..."
              : "Configure o provedor de IA em Configurações...")
          }
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          className="dash-chat-input"
        />
        <button
          type="button"
          disabled={loading || !input.trim() || !hasApiKey}
          onClick={() => onSend()}
          className="dash-chat-send"
          aria-label="Enviar mensagem"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function DashminChatApplyButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="dash-chat-apply-btn">
      <CheckCircle className="w-3.5 h-3.5" />
      <span>Aplicar Configuração Sugerida</span>
    </button>
  );
}
