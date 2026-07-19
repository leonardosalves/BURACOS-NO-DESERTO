import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
} from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { NewProject } from "./pages/NewProject";
import { ProjectEditor } from "./pages/ProjectEditor";

export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<NewProject />} />
            <Route path="/project/:id" element={<ProjectEditor />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="logo">V</div>
        <span>Video Suite</span>
      </div>
      <nav>
        <ul className="sidebar-nav">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <span className="icon">📁</span> Projetos
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/new"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <span className="icon">✨</span> Novo Projeto
            </NavLink>
          </li>
        </ul>
      </nav>
      <div
        style={{
          marginTop: "auto",
          padding: "16px 20px",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Video Suite Studio v0.1
        </div>
      </div>
    </aside>
  );
}

function Header() {
  const location = useLocation();
  const titles: Record<string, string> = {
    "/": "Projetos",
    "/new": "Novo Projeto",
  };
  const title = location.pathname.startsWith("/project/")
    ? "Editor de Projeto"
    : titles[location.pathname] || "Video Suite";

  return (
    <header className="app-header">
      <h2>{title}</h2>
      <div className="flex items-center gap-2">
        <button className="btn-icon" title="Engine Health">
          ⚙️
        </button>
        <button className="btn-icon" title="Undo">
          ↩️
        </button>
        <button className="btn-icon" title="Redo">
          ↪️
        </button>
      </div>
    </header>
  );
}
