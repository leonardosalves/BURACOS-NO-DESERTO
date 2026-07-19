import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject } from "../api";

export function NewProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    format: "SHORTS",
    nicheId: "tecnologia",
    language: "pt-BR",
    aspectRatio: "9:16",
    targetDurationSec: 60,
  });

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const project = await createProject(form);
      navigate(`/project/${project.id}`);
    } catch (err) {
      alert("Erro ao criar projeto: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fadeInUp" style={{ maxWidth: 640 }}>
      <h1 className="page-title">✨ Novo Projeto</h1>
      <p className="page-subtitle">
        Configure seu vídeo — a IA cuidará do roteiro, narração e montagem
      </p>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="card-title" style={{ marginBottom: 16 }}>
            📋 Informações Básicas
          </h3>

          <div className="form-group">
            <label className="form-label">Título / Assunto</label>
            <input
              className="form-input"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Ex: 10 Fatos Sobre Buracos Negros"
              required
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Formato</label>
              <select
                className="form-select"
                value={form.format}
                onChange={(e) => update("format", e.target.value)}
              >
                <option value="SHORTS">Short (≤60s)</option>
                <option value="LONG">Longo (1–20min)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nicho</label>
              <select
                className="form-select"
                value={form.nicheId}
                onChange={(e) => update("nicheId", e.target.value)}
              >
                <option value="tecnologia">Tecnologia</option>
                <option value="ciencia">Ciência</option>
                <option value="historia">História</option>
                <option value="misterios">Mistérios</option>
                <option value="natureza">Natureza</option>
                <option value="financas">Finanças</option>
                <option value="curiosidades">Curiosidades</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Idioma</label>
              <select
                className="form-select"
                value={form.language}
                onChange={(e) => update("language", e.target.value)}
              >
                <option value="pt-BR">Português (BR)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Proporção</label>
              <select
                className="form-select"
                value={form.aspectRatio}
                onChange={(e) => update("aspectRatio", e.target.value)}
              >
                <option value="9:16">9:16 (Vertical)</option>
                <option value="16:9">16:9 (Horizontal)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Duração alvo (segundos)</label>
            <input
              className="form-input"
              type="number"
              min={15}
              max={1200}
              value={form.targetDurationSec}
              onChange={(e) =>
                update("targetDurationSec", parseInt(e.target.value) || 60)
              }
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", justifyContent: "center", padding: "12px" }}
        >
          {loading ? "⏳ Gerando com IA..." : "🚀 Criar Projeto"}
        </button>
      </form>
    </div>
  );
}
