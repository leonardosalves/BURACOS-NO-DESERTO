import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface Project {
  id: string;
  title: string;
  format: string;
  status: string;
  nicheId: string;
  language: string;
  createdAt: string;
  scenes?: { id: string }[];
}

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/v1/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fadeInUp">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title">Projetos</h1>
          <p className="page-subtitle">Gerencie seus projetos de vídeo</p>
        </div>
        <Link to="/new" className="btn btn-primary">
          ✨ Novo Projeto
        </Link>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "var(--text-muted)",
          }}
        >
          <div className="animate-pulse" style={{ fontSize: 24 }}>
            ⏳
          </div>
          <p style={{ marginTop: 8 }}>Carregando projetos...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
          <h3 style={{ marginBottom: 8 }}>Nenhum projeto ainda</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
            Crie seu primeiro vídeo com IA
          </p>
          <Link to="/new" className="btn btn-primary">
            ✨ Criar Projeto
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {projects.map((p, i) => (
            <Link
              key={p.id}
              to={`/project/${p.id}`}
              style={{ textDecoration: "none", animationDelay: `${i * 50}ms` }}
              className="animate-fadeInUp"
            >
              <div className="card">
                <div className="card-header">
                  <span className="card-title">{p.title}</span>
                  <span className={`badge ${statusBadge(p.status)}`}>
                    {p.status}
                  </span>
                </div>
                <div className="beat-card-meta" style={{ marginTop: 8 }}>
                  <span>🎯 {p.nicheId}</span>
                  <span>📐 {p.format}</span>
                  <span>🌍 {p.language}</span>
                </div>
                {p.scenes && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    {p.scenes.length} cenas
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "badge-amber",
    generating: "badge-cyan",
    completed: "badge-green",
    failed: "badge-red",
  };
  return map[status] || "badge-purple";
}
