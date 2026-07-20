import React, { useState } from "react";
import { useChannels, Channel } from "../../context/ChannelContext";

const SWATCHES = [
  "#f5a623",
  "#e74c3c",
  "#2ecc71",
  "#4a7dff",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#f39c12",
];

const NICHO_SUGGESTIONS = [
  "engenharia_e_construcao",
  "historia_antiga",
  "tecnologia",
  "ciencia",
  "misterios",
  "financas",
  "saude",
  "games",
];

function slugify(text: string) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

interface ChannelFormProps {
  channel: Channel | null;
  onDone: () => void;
}

export default function ChannelForm({ channel, onDone }: ChannelFormProps) {
  const { createChannel, updateChannel } = useChannels();
  const isEdit = Boolean(channel);

  const [form, setForm] = useState(() =>
    isEdit && channel
      ? {
          nome: channel.nome || "",
          id: channel.id || "",
          youtubeChannelId: channel.youtube_channel_id || "",
          cor: channel.cor || "#f5a623",
          nicho: channel.nicho || "",
          subNichos: (channel.sub_nichos_permitidos || []).join(", "),
          temasProibidos: (channel.temas_proibidos || []).join(", "),
          descricao: channel.descricao || "",
        }
      : {
          nome: "",
          id: "",
          youtubeChannelId: "",
          cor: "#f5a623",
          nicho: "",
          subNichos: "",
          temasProibidos: "",
          descricao: "",
        }
  );

  const [idTouched, setIdTouched] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set =
    (key: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const value = e.target.value;
      setForm((f) => {
        const next = { ...f, [key]: value };
        if (key === "nome" && !idTouched) next.id = slugify(value);
        return next;
      });
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.nome.trim()) {
      setError("O nome do canal é obrigatório.");
      return;
    }
    if (!form.id.trim()) {
      setError("O ID do canal é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && channel) {
        await updateChannel(channel.id, {
          meta: {
            nome: form.nome,
            youtube_channel_id: form.youtubeChannelId,
            descricao: form.descricao,
            cor: form.cor,
          },
          nicho: {
            principal: form.nicho,
            sub_nichos_permitidos: form.subNichos
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            temas_proibidos: form.temasProibidos
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          },
        });
      } else {
        await createChannel({
          id: form.id,
          nome: form.nome,
          youtubeChannelId: form.youtubeChannelId,
          cor: form.cor,
          nicho: form.nicho,
          subNichos: form.subNichos,
          temasProibidos: form.temasProibidos,
          descricao: form.descricao,
        });
      }
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ch-form" onSubmit={handleSubmit}>
      {error && <div className="ch-error">⚠ {error}</div>}

      <div className="ch-form__row">
        <div className="ch-field">
          <label>
            Nome do canal <em>*</em>
          </label>
          <input
            value={form.nome}
            onChange={set("nome")}
            placeholder="Ex: Engenharia Impossível"
            autoFocus
          />
        </div>
        <div className="ch-field">
          <label>
            ID interno <em>*</em>
          </label>
          <input
            value={form.id}
            onChange={(e) => {
              setIdTouched(true);
              set("id")(e);
            }}
            placeholder="gerado-automaticamente"
            disabled={isEdit}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}
          />
          <div className="hint">
            {isEdit ? "ID não pode ser alterado" : "Gerado a partir do nome"}
          </div>
        </div>
      </div>

      <div className="ch-form__row">
        <div className="ch-field">
          <label>YouTube Channel ID</label>
          <input
            value={form.youtubeChannelId}
            onChange={set("youtubeChannelId")}
            placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
            style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}
          />
          <div className="hint">
            Encontre em YouTube Studio → Configurações → Canal → Informações
            avançadas
          </div>
        </div>
        <div className="ch-field">
          <label>Cor de identidade</label>
          <div className="ch-swatches">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                className={`ch-swatch ${form.cor === c ? "ch-swatch--selected" : ""}`}
                style={{ background: c }}
                onClick={() => setForm((f) => ({ ...f, cor: c }))}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="ch-form__row">
        <div className="ch-field">
          <label>Nicho principal</label>
          <input
            value={form.nicho}
            onChange={set("nicho")}
            placeholder="engenharia_e_construcao"
            list="nicho-list"
          />
          <datalist id="nicho-list">
            {NICHO_SUGGESTIONS.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div className="ch-field">
          <label>Sub-nichos permitidos</label>
          <input
            value={form.subNichos}
            onChange={set("subNichos")}
            placeholder="engenharia_historica, megaprojetos, tecnologia_construcao"
          />
          <div className="hint">
            Separados por vírgula — os criadores vão usar esta lista
          </div>
        </div>
      </div>

      <div className="ch-field">
        <label>Temas proibidos</label>
        <input
          value={form.temasProibidos}
          onChange={set("temasProibidos")}
          placeholder="politica, guerra_moderna, biologia"
        />
        <div className="hint">
          Separados por vírgula — vídeos com esses temas serão bloqueados
        </div>
      </div>

      <div className="ch-field">
        <label>Descrição</label>
        <textarea
          value={form.descricao}
          onChange={set("descricao")}
          rows={2}
          placeholder="Sobre o que é este canal?"
        />
      </div>

      <div className="ch-form__footer">
        <button type="button" className="ch-btn ch-btn--ghost" onClick={onDone}>
          Cancelar
        </button>
        <button
          type="submit"
          className="ch-btn ch-btn--primary"
          disabled={saving}
        >
          {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar canal"}
        </button>
      </div>
    </form>
  );
}
