import React, { useState } from "react";
import ChannelBadge from "./ChannelBadge";
import { useActiveChannel } from "../../hooks/useActiveChannel";
import {
  isSubNichoPermitido,
  isTemaProibido,
  CreatorTemplate,
} from "../../config/creatorTemplates";

interface CreatorFormProps {
  template: CreatorTemplate;
  onGenerate: (values: any) => void;
}

export default function CreatorForm({
  template,
  onGenerate,
}: CreatorFormProps) {
  const canal = useActiveChannel();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const setField =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  // Popula opções de sub-nicho a partir do canal ativo
  const resolveOptions = (campo: any) => {
    if (campo.origem === "canal.subNichos") return canal.subNichos;
    return campo.opcoes || [];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canal.channelId) {
      setError("Ative um canal antes de gerar.");
      return;
    }

    // Validações usando as regras do canal
    if (values.sub_nicho && !isSubNichoPermitido(values.sub_nicho, canal)) {
      setError(
        `'${values.sub_nicho}' não é permitido em ${canal.channelName}.`
      );
      return;
    }
    if (values.tema && isTemaProibido(values.tema, canal)) {
      setError(`Este tema é proibido em ${canal.channelName}.`);
      return;
    }

    // Envia junto o contexto do canal para o pipeline
    onGenerate({
      ...values,
      canal: {
        id: canal.channelId,
        nome: canal.channelName,
        nicho: canal.niche,
        titleMaxChars: canal.titleMaxChars,
        prompts: canal.prompts,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selo do canal — substitui o antigo campo "nicho" */}
      <ChannelBadge />

      {error && <div className="ch-error">⚠ {error}</div>}

      {template.campos.map((campo) => (
        <div className="ch-field space-y-2 font-sans" key={campo.key}>
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
            {campo.label} {campo.obrigatorio && <em>*</em>}
          </label>

          {campo.tipo === "select" ? (
            <select
              value={values[campo.key] || ""}
              onChange={setField(campo.key)}
              required={campo.obrigatorio}
              className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-rose-400 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
            >
              <option value="">Selecione…</option>
              {resolveOptions(campo).map((op: string) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={values[campo.key] || ""}
              onChange={setField(campo.key)}
              placeholder={campo.placeholder}
              required={campo.obrigatorio}
              className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-rose-400 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        className="btn btn--primary w-full justify-center py-3 text-sm tracking-wider uppercase"
        disabled={!canal.channelId}
      >
        ▶ Gerar vídeo para {canal.channelName}
      </button>
    </form>
  );
}
