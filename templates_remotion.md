# 🎨 Redesign Completo — Lumiera Studio

Vou refazer o visual inteiro do programa com um conceito coeso: **"Lumiera" vem de luz** — então o design gira em torno de um estúdio escuro (como uma suíte de edição) iluminado por um **dourado tungstênio** quente, superfícies de vidro, sombras suaves e micro-interações. Clean, moderno, cinematográfico.

---

## 💡 Conceito do Design

| Pilar           | Decisão                                                              |
| --------------- | -------------------------------------------------------------------- |
| **Metáfora**    | Estúdio de cinema escuro + luz de tungstênio (dourado quente)        |
| **Fundo**       | Quase-preto com leve tom azulado (não preto puro)                    |
| **Acento**      | Dourado-âmbar (luz de estúdio) + violeta como secundária             |
| **Superfícies** | Vidro fosco (glassmorphism sutil) com bordas de 1px quase invisíveis |
| **Sombras**     | Em camadas, difusas — nunca duras                                    |
| **Movimento**   | Easing suave (`cubic-bezier`), hover com elevação, glow no foco      |
| **Tipografia**  | Sora (display) + Inter (corpo) + JetBrains Mono (dados)              |

---

## ✨ 1. O Logo

Conceito: um **diafragma de câmera** (abertura) feito de 6 lâminas de luz que giram em torno de um núcleo brilhante — une **cinema** (abertura) + **luz** (Lumiera).

### `logo.svg` (versão primária)

```svg
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lm-blade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFDF8E"/>
      <stop offset="55%" stop-color="#FFB224"/>
      <stop offset="100%" stop-color="#E88A1A"/>
    </linearGradient>
    <radialGradient id="lm-core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFF3D6" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#FFD166" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#FFB224" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="lm-ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFD166" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#7C6CFF" stop-opacity="0.45"/>
    </linearGradient>
  </defs>

  <!-- brilho externo suave -->
  <circle cx="32" cy="32" r="27" fill="url(#lm-core)" opacity="0.45"/>

  <!-- anel do diafragma -->
  <circle cx="32" cy="32" r="25" stroke="url(#lm-ring)" stroke-width="1.4" opacity="0.6"/>

  <!-- 6 lâminas de luz (abertura) -->
  <g>
    <path id="lm-b" d="M32 8 C 40.5 9.5, 46.8 15.6, 47.4 24.6 L 34.6 32.8 C 32.7 24.6, 32.1 16, 32 8 Z" fill="url(#lm-blade)"/>
    <use href="#lm-b" transform="rotate(60 32 32)"/>
    <use href="#lm-b" transform="rotate(120 32 32)"/>
    <use href="#lm-b" transform="rotate(180 32 32)"/>
    <use href="#lm-b" transform="rotate(240 32 32)"/>
    <use href="#lm-b" transform="rotate(300 32 32)"/>
  </g>

  <!-- núcleo de luz -->
  <circle cx="32" cy="32" r="7.5" fill="url(#lm-core)"/>
  <circle cx="32" cy="32" r="3.2" fill="#FFF7E6"/>
</svg>
```

### `Logo.jsx` (componente com variantes)

```jsx
export default function Logo({ size = 40, variant = "mark", glow = true }) {
  const id = `lm-${Math.random().toString(36).slice(2, 8)}`; // evita conflito de IDs SVG

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{
        filter: glow ? "drop-shadow(0 0 12px rgba(255,178,36,0.35))" : "none",
      }}
    >
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFDF8E" />
          <stop offset="55%" stopColor="#FFB224" />
          <stop offset="100%" stopColor="#E88A1A" />
        </linearGradient>
        <radialGradient id={`${id}-c`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3D6" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#FFD166" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFB224" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="27" fill={`url(#${id}-c)`} opacity="0.45" />
      <circle
        cx="32"
        cy="32"
        r="25"
        stroke="#FFD166"
        strokeOpacity="0.4"
        strokeWidth="1.4"
      />
      <g>
        <path
          id={`${id}-p`}
          d="M32 8 C 40.5 9.5, 46.8 15.6, 47.4 24.6 L 34.6 32.8 C 32.7 24.6, 32.1 16, 32 8 Z"
          fill={`url(#${id}-b)`}
        />
        {[60, 120, 180, 240, 300].map((r) => (
          <use key={r} href={`#${id}-p`} transform={`rotate(${r} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="7.5" fill={`url(#${id}-c)`} />
      <circle cx="32" cy="32" r="3.2" fill="#FFF7E6" />
    </svg>
  );

  if (variant === "mark") return mark;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {mark}
      <div style={{ lineHeight: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: size * 0.5,
            letterSpacing: "-0.02em",
            background:
              "linear-gradient(120deg, #FFF3D6 0%, #FFB224 60%, #E88A1A 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Lumiera
        </div>
        {variant === "full" && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: size * 0.22,
              color: "var(--text-4)",
              letterSpacing: "0.18em",
              marginTop: 4,
            }}
          >
            VIDEO STUDIO
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🎨 2. Design System — `design-system.css`

Este é o **coração** do redesign. Substitui as variáveis antigas e define toda a linguagem visual.

```css
@import url("https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap");

/* ════════════════════════════════════════════
   LUMIERA DESIGN SYSTEM — tokens
   ════════════════════════════════════════════ */
:root {
  /* ── Fundos (camadas) ── */
  --bg-0: #08090d;
  --bg-1: #0c0e14;
  --bg-2: #12141d;
  --bg-3: #181b26;
  --bg-4: #1f2330;
  --bg-5: #262b3b;

  /* ── Bordas ── */
  --border-subtle: rgba(255, 255, 255, 0.05);
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);

  /* ── Texto ── */
  --text-1: #f7f8fc;
  --text-2: #c3c8d8;
  --text-3: #8b91a7;
  --text-4: #5c6278;

  /* ── Acento: ouro Lumiera ── */
  --gold-1: #ffe8b8;
  --gold-2: #ffd166;
  --gold-3: #ffb224;
  --gold-4: #f59e2b;
  --gold-5: #d97f1e;
  --accent: var(--gold-3);
  --accent-soft: rgba(255, 178, 36, 0.12);
  --accent-glow: rgba(255, 178, 36, 0.28);

  /* ── Secundária: violeta ── */
  --violet-2: #b4a6ff;
  --violet-3: #8f7bff;
  --violet-4: #7c6cff;
  --violet-soft: rgba(124, 108, 255, 0.14);

  /* ── Semânticas ── */
  --success: #3dd68c;
  --success-soft: rgba(61, 214, 140, 0.13);
  --warning: #ffb224;
  --warning-soft: rgba(255, 178, 36, 0.13);
  --danger: #ff6b6b;
  --danger-soft: rgba(255, 107, 107, 0.13);
  --info: #6e8bff;
  --info-soft: rgba(110, 139, 255, 0.13);

  /* ── Gradientes ── */
  --grad-accent: linear-gradient(135deg, #ffd166 0%, #f59e2b 100%);
  --grad-hero: linear-gradient(135deg, #ffd166 0%, #ffb224 45%, #7c6cff 130%);
  --grad-surface: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.035) 0%,
    rgba(255, 255, 255, 0) 100%
  );

  /* ── Tipografia ── */
  --font-display: "Sora", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* ── Espaçamento (base 4px) ── */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 20px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-10: 40px;
  --sp-12: 48px;

  /* ── Raio ── */
  --r-sm: 8px;
  --r-md: 12px;
  --r-lg: 16px;
  --r-xl: 20px;
  --r-full: 999px;

  /* ── Sombras (suaves, em camadas) ── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.35), 0 16px 48px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 0 1px var(--accent-soft), 0 4px 20px var(--accent-glow);

  /* ── Movimento ── */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --dur-fast: 150ms;
  --dur-base: 250ms;
  --dur-slow: 400ms;

  /* ── Vidro ── */
  --glass: rgba(18, 20, 29, 0.72);
  --glass-blur: blur(16px) saturate(1.4);
}

/* ════════════════════════════════════════════
   BASE
   ════════════════════════════════════════════ */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#root {
  height: 100%;
}

body {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-2);
  background:
    radial-gradient(
      1200px 700px at 85% -10%,
      rgba(255, 178, 36, 0.05),
      transparent 60%
    ),
    radial-gradient(
      900px 600px at -5% 110%,
      rgba(124, 108, 255, 0.05),
      transparent 60%
    ),
    var(--bg-1);
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

::selection {
  background: var(--accent-soft);
  color: var(--gold-1);
}

/* Scrollbar discreta */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--bg-5);
  border-radius: var(--r-full);
  border: 2px solid var(--bg-1);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-4);
}

/* Foco acessível com glow */
:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--bg-1),
    0 0 0 4px var(--accent);
  border-radius: var(--r-sm);
}

/* ════════════════════════════════════════════
   TIPOGRAFIA
   ════════════════════════════════════════════ */
h1,
h2,
h3,
h4 {
  font-family: var(--font-display);
  color: var(--text-1);
  letter-spacing: -0.02em;
}
h1 {
  font-size: 28px;
  font-weight: 800;
}
h2 {
  font-size: 21px;
  font-weight: 700;
}
h3 {
  font-size: 16px;
  font-weight: 700;
}
h4 {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-3);
}

.mono {
  font-family: var(--font-mono);
}
.text-muted {
  color: var(--text-3);
}
.text-faint {
  color: var(--text-4);
}

/* ════════════════════════════════════════════
   COMPONENTES
   ════════════════════════════════════════════ */

/* ── Botões ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 13px;
  padding: 9px 16px;
  border-radius: var(--r-md);
  border: 1px solid var(--border-strong);
  background: var(--bg-4);
  color: var(--text-1);
  cursor: pointer;
  white-space: nowrap;
  transition:
    transform var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}
.btn:hover {
  transform: translateY(-1px);
  background: var(--bg-5);
  border-color: rgba(255, 255, 255, 0.2);
}
.btn:active {
  transform: translateY(0) scale(0.98);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.btn--primary {
  background: var(--grad-accent);
  border-color: transparent;
  color: #241503;
  box-shadow: 0 2px 12px var(--accent-glow);
}
.btn--primary:hover {
  background: var(--grad-accent);
  box-shadow: 0 4px 20px var(--accent-glow);
  filter: brightness(1.06);
}

.btn--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-3);
}
.btn--ghost:hover {
  background: var(--bg-4);
  color: var(--text-1);
  border-color: transparent;
}

.btn--danger {
  background: var(--danger-soft);
  border-color: rgba(255, 107, 107, 0.35);
  color: #ffa3a3;
}
.btn--danger:hover {
  background: rgba(255, 107, 107, 0.22);
  border-color: var(--danger);
}

.btn--icon {
  padding: 8px;
  width: 34px;
  height: 34px;
}

/* ── Cards / superfícies ── */
.card {
  background: var(--grad-surface), var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}
.card--hover:hover {
  transform: translateY(-3px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}

/* ── Inputs ── */
.input,
.select,
textarea.input {
  width: 100%;
  background: var(--bg-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-md);
  color: var(--text-1);
  font-family: var(--font-body);
  font-size: 13.5px;
  padding: 10px 13px;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}
.input::placeholder {
  color: var(--text-4);
}
.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

/* ── Badges / tags ── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--r-full);
  background: var(--bg-4);
  color: var(--text-3);
  border: 1px solid var(--border);
}
.badge--gold {
  background: var(--accent-soft);
  color: var(--gold-2);
  border-color: rgba(255, 178, 36, 0.3);
}
.badge--violet {
  background: var(--violet-soft);
  color: var(--violet-2);
  border-color: rgba(124, 108, 255, 0.3);
}
.badge--green {
  background: var(--success-soft);
  color: var(--success);
  border-color: rgba(61, 214, 140, 0.3);
}
.badge--red {
  background: var(--danger-soft);
  color: #ffa3a3;
  border-color: rgba(255, 107, 107, 0.3);
}

/* ── Separadores ── */
.divider {
  height: 1px;
  background: var(--border);
  border: none;
  margin: var(--sp-4) 0;
}

/* ── Glass (topbar / modais) ── */
.glass {
  background: var(--glass);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

/* ════════════════════════════════════════════
   ANIMAÇÕES (entrada suave)
   ════════════════════════════════════════════ */
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 var(--accent-glow);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(255, 178, 36, 0);
  }
}

.anim-fade-up {
  animation: fade-up var(--dur-slow) var(--ease-out) both;
}
.anim-fade-in {
  animation: fade-in var(--dur-base) var(--ease-out) both;
}
.anim-scale-in {
  animation: scale-in var(--dur-base) var(--ease-spring) both;
}

/* stagger para listas */
.stagger > * {
  animation: fade-up var(--dur-slow) var(--ease-out) both;
}
.stagger > *:nth-child(1) {
  animation-delay: 0ms;
}
.stagger > *:nth-child(2) {
  animation-delay: 40ms;
}
.stagger > *:nth-child(3) {
  animation-delay: 80ms;
}
.stagger > *:nth-child(4) {
  animation-delay: 120ms;
}
.stagger > *:nth-child(5) {
  animation-delay: 160ms;
}
.stagger > *:nth-child(6) {
  animation-delay: 200ms;
}
.stagger > *:nth-child(n + 7) {
  animation-delay: 240ms;
}
```

---

## 🖼️ 3. Novo Layout — App Shell

Estrutura: **sidebar de vidro** (esquerda) + **topbar flutuante** + **área de conteúdo** com padding generoso.

### `AppShell.jsx`

```jsx
import { useState } from "react";
import Logo from "./Logo";
import ChannelSwitcher from "./components/channels/ChannelSwitcher";

const NAV = [
  {
    section: "Criadores",
    items: [{ id: "criadores", label: "Criadores", icon: "🎬" }],
  },
  {
    section: "Canais & Publicação",
    items: [
      { id: "canal-youtube", label: "Canal YouTube", icon: "📺" },
      { id: "ressuscitador", label: "Ressuscitador", icon: "⚰️" },
      { id: "radar", label: "Radar de Tendências", icon: "🎯" },
      { id: "monitor", label: "Monitor de Vídeos", icon: "🔥" },
    ],
  },
  {
    section: "Ferramentas & Automação",
    items: [
      { id: "pesquisar-web", label: "Pesquisar Web", icon: "🔍" },
      { id: "motion", label: "Motion Plan", icon: "🎞️" },
    ],
  },
  {
    section: "Análise & Gestão",
    items: [
      { id: "saude", label: "Saúde do Sistema", icon: "💚" },
      { id: "agents", label: "Studio Agents", icon: "🤖" },
      { id: "templates", label: "Templates", icon: "📐" },
      { id: "flow-lab", label: "Flow Lab", icon: "🧪" },
    ],
  },
];

export default function AppShell({ active, onNavigate, children, pageTitle }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="shell">
      {/* ── SIDEBAR ── */}
      <aside
        className={`sidebar glass ${collapsed ? "sidebar--collapsed" : ""}`}
      >
        <div className="sidebar__brand">
          <Logo size={34} variant={collapsed ? "mark" : "wordmark"} />
          <button
            className="btn btn--ghost btn--icon sidebar__toggle"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV.map((group) => (
            <div key={group.section} className="sidebar__group">
              {!collapsed && (
                <div className="sidebar__section">{group.section}</div>
              )}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar__item ${active === item.id ? "sidebar__item--active" : ""}`}
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                >
                  <span className="sidebar__icon">{item.icon}</span>
                  {!collapsed && (
                    <span className="sidebar__label">{item.label}</span>
                  )}
                  {active === item.id && <span className="sidebar__bar" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__status">
            <span className="dot dot--live" />
            {!collapsed && (
              <span className="mono text-faint">sistema online</span>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="shell__main">
        {/* TOPBAR */}
        <header className="topbar glass">
          <h1 className="topbar__title">{pageTitle}</h1>
          <div className="topbar__spacer" />
          <ChannelSwitcher />
          <button className="btn btn--ghost btn--icon" title="Notificações">
            🔔
          </button>
          <div className="topbar__avatar">L</div>
        </header>

        {/* CONTEÚDO */}
        <main className="content">
          <div key={active} className="anim-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

### `app-shell.css`

```css
/* ════════════════════════════════════════════
   APP SHELL — Lumiera
   ════════════════════════════════════════════ */
.shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ── Sidebar ── */
.sidebar {
  width: 248px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-subtle);
  transition: width var(--dur-base) var(--ease-out);
  z-index: 20;
}
.sidebar--collapsed {
  width: 72px;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-5) var(--sp-4);
  border-bottom: 1px solid var(--border-subtle);
  min-height: 76px;
}
.sidebar--collapsed .sidebar__brand {
  justify-content: center;
}
.sidebar__toggle {
  opacity: 0.5;
}
.sidebar__toggle:hover {
  opacity: 1;
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-4) var(--sp-3);
}

.sidebar__group {
  margin-bottom: var(--sp-5);
}
.sidebar__section {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-4);
  padding: 0 var(--sp-3);
  margin-bottom: var(--sp-2);
}

.sidebar__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 9px 12px;
  background: transparent;
  border: none;
  border-radius: var(--r-md);
  color: var(--text-3);
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition:
    background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}
.sidebar__item:hover {
  background: var(--bg-4);
  color: var(--text-1);
}
.sidebar__item--active {
  background: var(--accent-soft);
  color: var(--gold-1);
}
.sidebar__item--active .sidebar__icon {
  filter: drop-shadow(0 0 6px var(--accent-glow));
}

.sidebar__icon {
  font-size: 17px;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}
.sidebar--collapsed .sidebar__item {
  justify-content: center;
  padding: 10px;
}

/* barra de destaque do item ativo */
.sidebar__bar {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  border-radius: var(--r-full);
  background: var(--grad-accent);
  box-shadow: 0 0 8px var(--accent-glow);
  animation: scale-in var(--dur-base) var(--ease-spring) both;
}

.sidebar__footer {
  padding: var(--sp-4);
  border-top: 1px solid var(--border-subtle);
}
.sidebar__status {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dot--live {
  background: var(--success);
  animation: pulse-glow 2s infinite;
}

/* ── Main ── */
.shell__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ── Topbar ── */
.topbar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-6);
  border-bottom: 1px solid var(--border-subtle);
  min-height: 64px;
  z-index: 10;
}
.topbar__title {
  font-size: 19px;
  font-weight: 700;
}
.topbar__spacer {
  flex: 1;
}
.topbar__avatar {
  width: 34px;
  height: 34px;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--grad-accent);
  color: #241503;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 14px;
  box-shadow: 0 2px 10px var(--accent-glow);
  cursor: pointer;
}

/* ── Conteúdo ── */
.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-8) var(--sp-8) var(--sp-12);
}
.content > * {
  max-width: 1200px;
  margin: 0 auto;
}
```

---

## 📋 4. Guia de Aplicação (para o agente)

```
ORDEM DE MIGRAÇÃO DO DESIGN:

1. ADICIONAR design-system.css e app-shell.css
   → importar no main.jsx ANTES dos CSS antigos:
     import "./styles/design-system.css";
     import "./styles/app-shell.css";

2. SUBSTITUIR variáveis antigas
   → mapear: --bg-card → --bg-2, --text → --text-1, --amber → --gold-3, etc.
   → o agente deve fazer busca-e-substituição das variáveis legadas

3. ADOTAR o AppShell
   → trocar o layout atual por <AppShell active={...} onNavigate={...}>

4. INSTALAR o Logo
   → sidebar, topbar, favicon (converter o SVG para .ico/.png)
   → tela de loading/splash com Logo variant="full"

5. MIGRAR componentes aos poucos
   → botões: className "ch-btn" → "btn" / "btn btn--primary"
   → cards: adicionar "card card--hover"
   → inputs: className "input"
   → badges: "badge badge--gold" etc.

6. REMOVER CSS legado após migração completa
```

### Mapa de conversão de classes (antigo → novo)

| Antigo               | Novo                 |
| -------------------- | -------------------- |
| `.ch-btn`            | `.btn`               |
| `.ch-btn--primary`   | `.btn .btn--primary` |
| `.ch-btn--ghost`     | `.btn .btn--ghost`   |
| `.ch-btn--danger`    | `.btn .btn--danger`  |
| `.ch-card`           | `.card .card--hover` |
| `.ch-tag`            | `.badge`             |
| `.tool-shell`        | `.card`              |
| `.tool-head__titulo` | `h3`                 |
| inputs soltos        | `.input` / `.select` |

---

## 🎯 Resultado

- **Logo**: diafragma de luz dourado — icônico, escalável, com glow (SVG + React)
- **Visual**: estúdio escuro clean, dourado tungstênio, vidro, sombras suaves
- **Movimento**: entradas com `fade-up` + stagger, hover com elevação, glow no foco
- **Layout**: sidebar colapsável de vidro + topbar flutuante + conteúdo respirável
- **Sistema**: tokens centralizados — mudar uma variável muda o app todo

O design system é **totalmente baseado em variáveis**, então se quiser testar outro acento (ex: trocar dourado por ciano), é só mudar `--gold-*` e `--accent` — tudo se adapta.

# 🎬 Os Dois: Splash Animado + Light Mode

Perfeito! Vou implementar os dois com o mesmo cuidado do design system: a **tela de splash** com o logo animado (lâminas do diafragma abrindo) e o **modo claro** completo com toggle.

---

# ✨ PARTE 1: Splash Screen com Logo Animado

## 1.1 — `AnimatedLogo.jsx` (logo com animação de abertura)

**CRIAR** `dashboard-qanat/frontend/src/components/AnimatedLogo.jsx`:

```jsx
/**
 * AnimatedLogo.jsx
 * Logo Lumiera com animação de "abertura do diafragma":
 * anel se desenha → lâminas giram e abrem (stagger) → núcleo floresce.
 */

const BLADE_PATH =
  "M32 8 C 40.5 9.5, 46.8 15.6, 47.4 24.6 L 34.6 32.8 C 32.7 24.6, 32.1 16, 32 8 Z";

export default function AnimatedLogo({ size = 132 }) {
  const id = "splash-lm";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className="splash-logo"
    >
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFDF8E" />
          <stop offset="55%" stopColor="#FFB224" />
          <stop offset="100%" stopColor="#E88A1A" />
        </linearGradient>
        <radialGradient id={`${id}-c`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3D6" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#FFD166" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFB224" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* halo externo (surge primeiro) */}
      <circle
        cx="32"
        cy="32"
        r="27"
        fill={`url(#${id}-c)`}
        className="splash-halo"
      />

      {/* anel que se desenha (stroke draw) */}
      <circle
        cx="32"
        cy="32"
        r="25"
        stroke="#FFD166"
        strokeOpacity="0.55"
        strokeWidth="1.4"
        pathLength="100"
        strokeDasharray="100"
        className="splash-ring"
      />

      {/* 6 lâminas — giram e abrem em stagger */}
      <g className="splash-aperture">
        {[0, 60, 120, 180, 240, 300].map((rot, i) => (
          <g key={rot} transform={`rotate(${rot} 32 32)`}>
            <g
              className="splash-blade"
              style={{ animationDelay: `${420 + i * 90}ms` }}
            >
              <path d={BLADE_PATH} fill={`url(#${id}-b)`} />
            </g>
          </g>
        ))}
      </g>

      {/* núcleo de luz (floresce por último) */}
      <g className="splash-core">
        <circle cx="32" cy="32" r="7.5" fill={`url(#${id}-c)`} />
        <circle cx="32" cy="32" r="3.2" fill="#FFF7E6" />
      </g>
    </svg>
  );
}
```

## 1.2 — `SplashScreen.jsx`

**CRIAR** `dashboard-qanat/frontend/src/components/SplashScreen.jsx`:

```jsx
import { useEffect, useState, useCallback } from "react";
import AnimatedLogo from "./AnimatedLogo";

/**
 * SplashScreen.jsx
 * Abertura cinematográfica do Lumiera (~2.6s).
 * Clique para pular. Chama onDone ao terminar.
 */
export default function SplashScreen({ onDone, minDuration = 2600 }) {
  const [leaving, setLeaving] = useState(false);

  const finish = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDone?.(), 550); // espera o fade-out
  }, [onDone]);

  useEffect(() => {
    const t = setTimeout(finish, minDuration);
    return () => clearTimeout(t);
  }, [minDuration, finish]);

  return (
    <div
      className={`splash ${leaving ? "splash--leaving" : ""}`}
      onClick={finish}
      role="presentation"
    >
      <AnimatedLogo size={132} />
      <div className="splash-wordmark">Lumiera</div>
      <div className="splash-tagline">VIDEO STUDIO</div>
      <div className="splash-progress">
        <span className="splash-progress__fill" />
      </div>
      <div className="splash-hint mono">clique para pular</div>
    </div>
  );
}
```

## 1.3 — `splash.css`

**CRIAR** `dashboard-qanat/frontend/src/styles/splash.css`:

```css
/* ════════════════════════════════════════════
   SPLASH SCREEN — Lumiera
   Momento de marca: sempre cinematográfico (escuro),
   independente do tema ativo.
   ════════════════════════════════════════════ */
.splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(
      900px 600px at 50% 35%,
      rgba(255, 178, 36, 0.08),
      transparent 65%
    ),
    radial-gradient(
      700px 500px at 82% 92%,
      rgba(124, 108, 255, 0.06),
      transparent 60%
    ),
    #08090d;
  cursor: pointer;
  transition:
    opacity 0.55s var(--ease-out),
    transform 0.55s var(--ease-out);
}
.splash--leaving {
  opacity: 0;
  transform: scale(1.045);
  pointer-events: none;
}

/* ── Logo animado ── */
.splash-logo {
  filter: drop-shadow(0 0 26px rgba(255, 178, 36, 0.35));
}

.splash-halo {
  opacity: 0;
  animation: splash-halo-in 0.9s ease-out 0.15s both;
}
@keyframes splash-halo-in {
  to {
    opacity: 0.5;
  }
}

.splash-ring {
  stroke-dashoffset: 100;
  transform-box: view-box;
  transform-origin: 32px 32px;
  animation: splash-ring-draw 0.9s var(--ease-out) 0.25s both;
}
@keyframes splash-ring-draw {
  to {
    stroke-dashoffset: 0;
  }
}

/* grupo inteiro gira levemente (sensação de íris abrindo) */
.splash-aperture {
  transform-box: view-box;
  transform-origin: 32px 32px;
  animation: splash-aperture-spin 1.1s var(--ease-spring) 0.3s both;
}
@keyframes splash-aperture-spin {
  from {
    transform: rotate(-80deg);
  }
  to {
    transform: rotate(0deg);
  }
}

/* cada lâmina abre em stagger */
.splash-blade {
  transform-box: view-box;
  transform-origin: 32px 32px;
  opacity: 0;
  animation: splash-blade-in 0.7s var(--ease-spring) both;
}
@keyframes splash-blade-in {
  from {
    opacity: 0;
    transform: rotate(75deg) scale(0.45);
  }
  to {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
}

.splash-core {
  transform-box: view-box;
  transform-origin: 32px 32px;
  opacity: 0;
  animation: splash-core-bloom 0.8s var(--ease-spring) 0.95s both;
}
@keyframes splash-core-bloom {
  0% {
    opacity: 0;
    transform: scale(0.2);
  }
  60% {
    opacity: 1;
    transform: scale(1.22);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* ── Wordmark com varredura de luz ── */
.splash-wordmark {
  margin-top: 28px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 42px;
  letter-spacing: -0.02em;
  background: linear-gradient(
    120deg,
    #8a6a2f 0%,
    #ffd166 30%,
    #fff3d6 50%,
    #ffd166 70%,
    #8a6a2f 100%
  );
  background-size: 250% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: splash-wordmark 1.4s var(--ease-out) 1.05s both;
}
@keyframes splash-wordmark {
  from {
    background-position: 200% center;
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    background-position: -100% center;
    opacity: 1;
    transform: none;
  }
}

/* ── Tagline (letter-spacing contrai) ── */
.splash-tagline {
  margin-top: 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: rgba(255, 209, 102, 0.7);
  letter-spacing: 0.5em;
  text-indent: 0.5em;
  animation: splash-tagline 0.9s var(--ease-out) 1.45s both;
}
@keyframes splash-tagline {
  from {
    opacity: 0;
    letter-spacing: 0.95em;
  }
  to {
    opacity: 1;
    letter-spacing: 0.5em;
  }
}

/* ── Barra de progresso ── */
.splash-progress {
  width: 180px;
  height: 2px;
  margin-top: 30px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--r-full);
  overflow: hidden;
}
.splash-progress__fill {
  display: block;
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, #ffd166, #f59e2b);
  animation: splash-load 1.4s var(--ease-out) 1.2s both;
}
@keyframes splash-load {
  to {
    width: 100%;
  }
}

/* ── Dica de pular ── */
.splash-hint {
  position: absolute;
  bottom: 30px;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.3);
  opacity: 0;
  animation: splash-hint-in 0.6s ease 2.1s both;
}
@keyframes splash-hint-in {
  to {
    opacity: 1;
  }
}

/* ── Acessibilidade: reduz movimento ── */
@media (prefers-reduced-motion: reduce) {
  .splash * {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
  }
}
```

---

# ☀️ PARTE 2: Light Mode

## 2.1 — `design-system-light.css` (tokens do tema claro)

**CRIAR** `dashboard-qanat/frontend/src/styles/design-system-light.css`:

```css
/* ════════════════════════════════════════════
   LUMIERA — LIGHT MODE
   Sobrescreve os tokens do design-system quando
   <html data-theme="light">. Papel quente, não
   branco puro — mantém a sensação de estúdio.
   ════════════════════════════════════════════ */
:root[data-theme="light"] {
  /* ── Fundos (papel quente) ── */
  --bg-0: #efece5;
  --bg-1: #f6f4ee;
  --bg-2: #fdfcf9;
  --bg-3: #f0ede6;
  --bg-4: #e9e5dc;
  --bg-5: #ddd8cc;

  /* ── Bordas ── */
  --border-subtle: rgba(28, 24, 16, 0.06);
  --border: rgba(28, 24, 16, 0.1);
  --border-strong: rgba(28, 24, 16, 0.18);

  /* ── Texto ── */
  --text-1: #1e1b15;
  --text-2: #474237;
  --text-3: #6f6a5c;
  --text-4: #a09a8b;

  /* ── Ouro (escurecido p/ contraste no claro) ── */
  --gold-1: #946200;
  --gold-2: #b57a06;
  --gold-3: #e08c08;
  --gold-4: #f59e2b;
  --gold-5: #ffb224;
  --accent: var(--gold-3);
  --accent-soft: rgba(224, 140, 8, 0.12);
  --accent-glow: rgba(224, 140, 8, 0.2);

  /* ── Violeta ── */
  --violet-2: #6b55e8;
  --violet-3: #7c6cff;
  --violet-4: #8f7bff;
  --violet-soft: rgba(124, 108, 255, 0.1);

  /* ── Semânticas (mais escuras p/ contraste) ── */
  --success: #1f9d63;
  --success-soft: rgba(31, 157, 99, 0.12);
  --warning: #c97f08;
  --warning-soft: rgba(201, 127, 8, 0.12);
  --danger: #d94f4f;
  --danger-soft: rgba(217, 79, 79, 0.12);
  --info: #4a68e0;
  --info-soft: rgba(74, 104, 224, 0.12);

  /* ── Gradientes ── */
  --grad-accent: linear-gradient(135deg, #f5a623 0%, #e08c08 100%);
  --grad-hero: linear-gradient(135deg, #f5a623 0%, #e08c08 45%, #7c6cff 130%);
  --grad-surface: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.85) 0%,
    rgba(255, 255, 255, 0) 100%
  );

  /* ── Sombras (difusas, claras) ── */
  --shadow-sm:
    0 1px 2px rgba(28, 24, 16, 0.05), 0 2px 8px rgba(28, 24, 16, 0.05);
  --shadow-md:
    0 2px 4px rgba(28, 24, 16, 0.06), 0 8px 24px rgba(28, 24, 16, 0.08);
  --shadow-lg:
    0 4px 8px rgba(28, 24, 16, 0.07), 0 16px 48px rgba(28, 24, 16, 0.12);
  --shadow-glow: 0 0 0 1px var(--accent-soft), 0 4px 20px var(--accent-glow);

  /* ── Vidro ── */
  --glass: rgba(253, 252, 249, 0.78);
}

/* Fundo da página no claro */
:root[data-theme="light"] body {
  background:
    radial-gradient(
      1200px 700px at 85% -10%,
      rgba(224, 140, 8, 0.06),
      transparent 60%
    ),
    radial-gradient(
      900px 600px at -5% 110%,
      rgba(124, 108, 255, 0.05),
      transparent 60%
    ),
    var(--bg-1);
}

/* Scrollbar clara */
:root[data-theme="light"] ::-webkit-scrollbar-thumb {
  background: var(--bg-5);
  border-color: var(--bg-1);
}
:root[data-theme="light"] ::-webkit-scrollbar-thumb:hover {
  background: var(--text-4);
}

/* Transição suave ao trocar de tema */
body,
.card,
.sidebar,
.topbar,
.btn,
.input,
.select,
.badge {
  transition:
    background-color 0.3s var(--ease-out),
    color 0.3s var(--ease-out),
    border-color 0.3s var(--ease-out);
}
```

## 2.2 — `themeStore.js` (fonte única de verdade)

**CRIAR** `dashboard-qanat/frontend/src/hooks/themeStore.js`:

```javascript
/**
 * themeStore.js
 * Store minimalista de tema — todos os componentes que usam
 * useTheme() ficam sincronizados (evita estados divergentes).
 */

const STORAGE_KEY = "lumiera-theme";

let current = "dark";
try {
  current = localStorage.getItem(STORAGE_KEY) || "dark";
} catch {
  /* SSR / storage indisponível */
}

const listeners = new Set();

function apply() {
  document.documentElement.setAttribute("data-theme", current);
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {}
}

export function getTheme() {
  return current;
}

export function setTheme(theme) {
  current = theme === "light" ? "light" : "dark";
  apply();
  listeners.forEach((fn) => fn(current));
}

export function toggleTheme() {
  setTheme(current === "dark" ? "light" : "dark");
}

export function subscribeTheme(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Aplica o tema inicial imediatamente
if (typeof document !== "undefined") apply();
```

## 2.3 — `useTheme.js` (hook React)

**CRIAR** `dashboard-qanat/frontend/src/hooks/useTheme.js`:

```javascript
import { useEffect, useState } from "react";
import { getTheme, toggleTheme, setTheme, subscribeTheme } from "./themeStore";

export function useTheme() {
  const [theme, setThemeState] = useState(getTheme());

  useEffect(() => subscribeTheme(setThemeState), []);

  return { theme, toggle: toggleTheme, setTheme };
}
```

## 2.4 — `ThemeToggle.jsx` (botão sol/lua)

**CRIAR** `dashboard-qanat/frontend/src/components/ThemeToggle.jsx`:

```jsx
import { useTheme } from "../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      className="btn btn--ghost btn--icon theme-toggle"
      onClick={toggle}
      title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      aria-label="Alternar tema"
    >
      <span className="theme-toggle__icon">
        {isDark ? (
          /* lua */
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          /* sol */
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        )}
      </span>
    </button>
  );
}
```

Adicione ao `app-shell.css`:

```css
/* ── Theme toggle ── */
.theme-toggle__icon {
  display: inline-flex;
  transition: transform 0.4s var(--ease-spring);
}
.theme-toggle:hover .theme-toggle__icon {
  transform: rotate(35deg) scale(1.1);
}
```

---

# 🔌 PARTE 3: Integração

## 3.1 — `main.jsx` (importar os novos CSS)

```diff
  import "./styles/design-system.css";
+ import "./styles/design-system-light.css";
  import "./styles/app-shell.css";
+ import "./styles/splash.css";
```

> ⚠️ Ordem importa: `design-system-light.css` deve vir **depois** do `design-system.css` para os overrides funcionarem.

## 3.2 — `App.jsx` (splash + tema)

```jsx
import { useState } from "react";
import SplashScreen from "./components/SplashScreen";
import AppShell from "./AppShell";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const [ready, setReady] = useState(false);
  useTheme(); // aplica data-theme no <html>

  return (
    <>
      {!ready && <SplashScreen onDone={() => setReady(true)} />}
      <div
        style={{ opacity: ready ? 1 : 0 }}
        className={ready ? "anim-fade-in" : ""}
      >
        <AppShell active={activePage} onNavigate={setActivePage}>
          {/* ... conteúdo das páginas ... */}
        </AppShell>
      </div>
    </>
  );
}
```

## 3.3 — Topbar do `AppShell.jsx` (adicionar o toggle)

```diff
+ import ThemeToggle from "./ThemeToggle";

  <header className="topbar glass">
    <h1 className="topbar__title">{pageTitle}</h1>
    <div className="topbar__spacer" />
    <ChannelSwitcher />
+   <ThemeToggle />
    <button className="btn btn--ghost btn--icon" title="Notificações">🔔</button>
    <div className="topbar__avatar">L</div>
  </header>
```

---

# ✅ Validação

```
SPLASH
□ Splash aparece ao abrir o app (~2.6s)
□ Anel se desenha → lâminas abrem em stagger → núcleo floresce
□ "Lumiera" entra com varredura de luz + "VIDEO STUDIO"
□ Barra de progresso enche
□ Clique pula o splash
□ Fade-out suave → app aparece com fade-in
□ prefers-reduced-motion respeitado (sem animações)

LIGHT MODE
□ Botão sol/lua na topbar
□ Clicar troca o tema instantaneamente (transição suave)
□ Tema persiste após recarregar (localStorage)
□ Fundo vira papel quente, texto escuro, ouro com contraste
□ Cards, inputs, sidebar, topbar todos adaptados
□ Splash continua cinematográfico (escuro) em ambos os temas
```

---

# 🎯 Resumo

| Entrega            | Arquivos                                                                        | Resultado                                     |
| ------------------ | ------------------------------------------------------------------------------- | --------------------------------------------- |
| **Splash animado** | `AnimatedLogo.jsx` + `SplashScreen.jsx` + `splash.css`                          | Abertura de marca com diafragma abrindo       |
| **Light mode**     | `design-system-light.css` + `themeStore.js` + `useTheme.js` + `ThemeToggle.jsx` | Tema claro completo, persistido, sincronizado |

**Detalhes de qualidade incluídos:**

- 🎬 Splash com sequência coreografada (anel → lâminas → núcleo → texto → progresso)
- ⏭️ Clicável para pular + respeita `prefers-reduced-motion`
- 🌗 Toggle sol/lua com micro-animação de rotação
- 💾 Tema persiste no `localStorage`
- 🔄 Store compartilhado evita estados de tema divergentes entre componentes
- 🎨 Light mode usa "papel quente" (não branco puro) para manter a identidade de estúdio
- ✨ Transição suave entre temas

O splash é **intencionalmente escuro** mesmo no light mode — é um momento cinematográfico de marca (como uma intro de estúdio de cinema), e a transição para o app claro funciona como "as luzes do estúdio acendendo".

Com isso o redesign está **completo**: design system + layout + logo + splash + light mode.

# 🔍 Revisão Final de Consistência — Lumiera

Analisei todos os componentes que construímos ao longo do projeto. O diagnóstico: temos **dois sistemas visuais convivendo** — o antigo (classes `ch-*`, `tool-*`, `mpe-*` com tokens `--amber`, `--bg-card`, fontes Archivo Black/Space Grotesk) e o novo (`.btn`, `.card`, tokens `--gold-*`, `--bg-0..5`, fontes Sora/Inter).

A boa notícia: resolvo isso com uma **camada de compatibilidade** que faz todos os componentes antigos herdarem o novo design **automaticamente** — inclusive o light mode — sem reescrever cada arquivo.

---

## 📋 Diagnóstico: onde está o visual antigo

| Arquivo                                                  | Tokens/classes antigos usados                                                                                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `channels.css`                                           | `:root` próprio (`--amber`, `--bg-card`, `--radius`, Archivo Black…) + classes `ch-*`, `tool-*`, `conn-*`, `mem-*`, `ab-*`, `cal-*`, `revive-*`, `radar-*`, `monitor-*`, `diag-*`, `yt-insights` |
| `motionPlanEditor.css`                                   | `--bg-base`, `--amber`, `--font-display`… + usa `.ch-btn` no JSX                                                                                                                                 |
| `ChannelSwitcher/Manager/Form/Card/Badge`                | classes `ch-*`                                                                                                                                                                                   |
| `ConnectionTest.jsx`                                     | classes `conn-*`                                                                                                                                                                                 |
| `CanalYouTube/Ressuscitador/Radar/Monitor` + `pecas.jsx` | classes `tool-*` + cores hexadecimais inline (`#2ecc71`, `#4a7dff`, `#e74c3c`, `#ff4d4d`)                                                                                                        |
| `MemoryPanel/TitleAB/EditorialCalendar`                  | classes `mem-*`, `ab-*`, `cal-*`                                                                                                                                                                 |
| `MotionPlanEditor.jsx`                                   | classes `mpe-*` + `.ch-btn`                                                                                                                                                                      |

---

## ✨ A solução: `legacy-compat.css`

Este arquivo mapeia **cada token antigo** para o token novo equivalente. Como todo o CSS antigo usa `var(--amber)`, `var(--bg-card)` etc., ao redefinir essas variáveis como _aliases_ dos novos tokens, **tudo passa a usar o novo design de uma vez** — e automaticamente respeita o `data-theme="light"`.

**CRIAR** `dashboard-qanat/frontend/src/styles/legacy-compat.css`:

```css
/* ══════════════════════════════════════════════════════════════
   LEGACY-COMPAT.CSS — Camada de compatibilidade Lumiera
   Mapeia os tokens ANTIGOS (channels.css) para os NOVOS tokens
   do Design System.

   Efeito: todos os componentes legados (ch-*, tool-*, mpe-*,
   conn-*, mem-*, ab-*, cal-*, revive-*, radar-*, monitor-*)
   passam a usar as cores, fontes, raios e sombras do novo design
   — e ganham LIGHT MODE de graça, pois os novos tokens mudam
   com [data-theme="light"].

   ⚠️ REQUISITO OBRIGATÓRIO: remover o bloco `:root { ... }` do
   channels.css. Senão as definições antigas sobrescrevem estes
   aliases (cascade).
   ══════════════════════════════════════════════════════════════ */

:root {
  /* ── Fundos ── */
  --bg-deep: var(--bg-0);
  --bg-base: var(--bg-1);
  --bg-card: var(--bg-2);
  --bg-card-hover: var(--bg-3);
  --bg-elevated: var(--bg-4);

  /* ── Texto ── */
  --text: var(--text-1);
  --text-dim: var(--text-3);
  --text-faint: var(--text-4);

  /* ── Cores de destaque ── */
  --amber: var(--gold-3);
  --amber-soft: var(--accent-soft);
  --red: var(--danger);
  --red-soft: var(--danger-soft);
  --green: var(--success);
  --green-soft: var(--success-soft);
  --blue: var(--info);
  --blue-soft: var(--info-soft);

  /* ── Raios ── */
  --radius: var(--r-md);
  --radius-lg: var(--r-lg);

  /* ── Tipografia unificada ── */
  --font-display: "Sora", sans-serif; /* era Archivo Black */
  --font-body: "Inter", sans-serif; /* era Space Grotesk */
  /* --font-mono já é JetBrains Mono nos dois sistemas */
}
```

---

## 🔧 Passo a passo da aplicação

### 1. Remover o `:root` antigo do `channels.css`

**MODIFICAR** `channels.css` — apagar o bloco `:root { ... }` inteiro (as ~30 linhas que definem `--bg-deep`, `--amber`, `--font-display: "Archivo Black"` etc.). **Manter todo o resto** (os estilos dos componentes `ch-*`, `tool-*`, etc.) — eles continuarão funcionando, agora alimentados pelos aliases.

### 2. Ordem de imports no `main.jsx`

```jsx
// 1º — Design system novo (define os tokens reais)
import "./styles/design-system.css";
import "./styles/design-system-light.css";

// 2º — Compatibilidade (mapeia tokens antigos → novos)
import "./styles/legacy-compat.css";

// 3º — Layout e componentes
import "./styles/app-shell.css";
import "./styles/splash.css";
import "./styles/channels.css"; // agora SEM o :root
import "./styles/motionPlanEditor.css";
```

> A ordem é crítica: `design-system.css` define os tokens → `legacy-compat.css` cria os aliases → os CSS antigos consomem os aliases.

---

## 🎨 Correções de cores hardcoded (inline styles)

O compat layer resolve as variáveis CSS, mas alguns JSX usam **hex direto em inline styles** — esses não mudam no light mode. Trocar por `var(--token)`:

| Arquivo                                | Antes                                          | Depois                                                          |
| -------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| `pecas.jsx` → `TIER_CORES`             | `{ A: "#2ecc71", B: "#4a7dff", C: "#e74c3c" }` | `{ A: "var(--success)", B: "var(--info)", C: "var(--danger)" }` |
| `CanalYouTube.jsx` → cor do health     | `insights.health >= 75 ? "#2ecc71" : ...`      | `? "var(--success)" : "var(--warning)" : "var(--danger)"`       |
| `RadarTendencias.jsx` → `corFit()`     | `#2ecc71 / #f5a623 / #e74c3c`                  | `var(--success) / var(--warning) / var(--danger)`               |
| `MonitorVideos.jsx` → `ALERTA` cores   | hex inline                                     | `var(--success)` / `var(--danger)`                              |
| `pecas.jsx` → `StatCard cor="#ff4d4d"` | `#ff4d4d`                                      | `var(--danger)` (ou manter como cor de marca do YouTube)        |

**Exemplo** (`pecas.jsx`):

```diff
- const TIER_CORES = { A: "#2ecc71", B: "#4a7dff", C: "#e74c3c" };
+ const TIER_CORES = { A: "var(--success)", B: "var(--info)", C: "var(--danger)" };
```

> ✅ **Manter hardcoded:** os `SWATCHES` do `ChannelForm.jsx` (`["#f5a623", "#e74c3c", ...]`) — são **cores de marca do canal** (escolha do usuário), não cores de tema. E o `canal.channelColor` vem do canal, não do tema.

### Cores de ferramenta (`--tool-cor`)

Cada ferramenta define um acento próprio inline (`style={{ "--tool-cor": "#ff4d4d" }}`). Essas são cores saturadas que funcionam nos dois temas — **podem ficar**, mas se quiser harmonizar com o ouro Lumiera, troque as menos importantes para `var(--accent)`.

---

## 🔄 Tabela de migração de classes (unificação opcional)

Com o compat layer, **já não há visual misto** — as classes antigas ficam idênticas às novas. Esta tabela é para o agente **unificar os nomes** gradualmente (recomendo fazer por arquivo, com testes):

| Classe antiga        | Classe nova                                       | Observação                              |
| -------------------- | ------------------------------------------------- | --------------------------------------- |
| `.ch-btn`            | `.btn`                                            |                                         |
| `.ch-btn--primary`   | `.btn--primary`                                   |                                         |
| `.ch-btn--ghost`     | `.btn--ghost`                                     |                                         |
| `.ch-btn--danger`    | `.btn--danger`                                    |                                         |
| `.ch-card`           | `.card`                                           | adicionar `.card--hover` se tiver hover |
| `.ch-tag`            | `.badge`                                          |                                         |
| `.ch-tag` colorida   | `.badge--gold` / `--violet` / `--green` / `--red` |                                         |
| `.tool-shell`        | `.card`                                           |                                         |
| `.tool-head__titulo` | `h3`                                              |                                         |
| inputs soltos        | `.input` / `.select`                              |                                         |

> 💡 O `MotionPlanEditor.jsx` usa `.ch-btn` no footer — após migrar as classes do `channels.css`, trocar para `.btn`. Enquanto isso, o compat layer já garante o visual correto.

---

## ✅ Checklist de Consistência

```
COMPAT LAYER
□ legacy-compat.css criado
□ :root antigo removido do channels.css (mantidos os estilos de componentes)
□ Imports no main.jsx na ordem correta
□ App abre sem erros de CSS

VERIFICAÇÃO VISUAL (modo escuro)
□ ChannelSwitcher/Manager/Form usam ouro Lumiera + fonte Sora/Inter
□ As 4 ferramentas (CanalYouTube/Ressuscitador/Radar/Monitor) consistentes
□ MotionPlanEditor consistente
□ MemoryPanel/TitleAB/Calendário consistentes
□ Botões antigos (ch-btn) idênticos aos novos (btn)

VERIFICAÇÃO VISUAL (modo claro)
□ Alternar tema → TODOS os componentes antigos também mudam
□ Nenhum componente fica "preso" no escuro
□ Cores semânticas (verde/vermelho/azul) legíveis no claro

CORES INLINE
□ TIER_CORES → var(--success/info/danger)
□ corFit() do Radar → var()
□ cores de health/anomalias → var()
□ SWATCHES do canal mantidos (cores de marca)

OPCIONAL (unificação de classes)
□ ch-btn → btn nos arquivos migrados
□ ch-card → card
□ ch-tag → badge
```

---

## 🎯 Resultado

Com o `legacy-compat.css`:

- ✅ **Zero visual misto** — todos os componentes (antigos e novos) usam a mesma paleta, tipografia, raios e sombras
- ✅ **Light mode universal** — até o componente mais antigo reage ao tema, porque os tokens antigos agora apontam para os novos
- ✅ **Baixo risco** — nenhuma reescrita em massa; apenas um arquivo novo + remoção de um bloco `:root`
- ✅ **Caminho de migração claro** — a tabela de classes permite unificar os nomes aos poucos, sem pressa

O projeto está agora **visualmente coeso da splash ao render**, nos dois temas.

# 🔧 Script de Migração de Classes (com segurança)

Perfeito! Vou gerar o script de busca-e-substituição que unifica as classes antigas (`ch-btn`, `ch-tag`) nas novas (`btn`, `badge`) em todos os JSX/TSX — com **dry-run**, **backup automático** e **relatório de CSS morto**.

---

## 📄 `scripts/migrateClasses.mjs`

**CRIAR** `dashboard-qanat/frontend/scripts/migrateClasses.mjs`:

```javascript
#!/usr/bin/env node
/**
 * migrateClasses.mjs
 * Migra classes legadas (ch-btn, ch-tag) para o novo Design System (btn, badge)
 * em todos os arquivos JSX/TSX do frontend.
 *
 * SEGURANÇA:
 *  - Dry-run por padrão (não altera nada sem --apply)
 *  - Backup .bak antes de sobrescrever (apenas com --apply)
 *  - Substitui SOMENTE tokens dentro de string literals (className="...", `...`)
 *  - NÃO toca em: ch-card (estrutura BEM complexa), ch-badge (canal), ch-field, etc.
 *
 * USO:
 *   node scripts/migrateClasses.mjs            # dry-run (só mostra o que mudaria)
 *   node scripts/migrateClasses.mjs --apply    # aplica com backup
 *   node scripts/migrateClasses.mjs --apply --no-backup
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "../src");

const APPLY = process.argv.includes("--apply");
const BACKUP = !process.argv.includes("--no-backup");

// ── Mapeamento (ordem: mais específico primeiro) ──
// Só classes com correspondência 1:1 limpa no Design System.
const CLASS_MAP = {
  "ch-btn--primary": "btn--primary",
  "ch-btn--ghost": "btn--ghost",
  "ch-btn--danger": "btn--danger",
  "ch-btn": "btn",
  "ch-tag": "badge",
};

// Classes que NÃO migramos (intencionalmente) — mantêm estilos próprios:
//  ch-card, ch-card--*, ch-card__*  → estrutura BEM complexa (já unificada via legacy-compat)
//  ch-badge                          → badge de canal (não é a tag .badge)
//  ch-field, ch-form, ch-head, ch-switcher, ch-avatar, ch-status, ch-conn, ch-error
//  tool-*, mpe-*, conn-*, mem-*, ab-*, cal-*, revive-*, radar-*, monitor-*, diag-*

const EXTENSIONS = new Set([".jsx", ".tsx", ".js", ".ts"]);

// ── Substitui tokens de classe DENTRO de string literals ──
function replaceTokensInString(str) {
  // Token = sequência de chars de classe; substitui só os que estão no mapa
  return str.replace(/[A-Za-z0-9_-]+/g, (token) => CLASS_MAP[token] || token);
}

function migrateContent(src) {
  let changed = false;
  // Casa string literals: "..." '...' `...` (com escapes)
  const out = src.replace(
    /(["'`])((?:\\.|(?!\1).)*)\1/g,
    (match, quote, inner) => {
      const replaced = replaceTokensInString(inner);
      if (replaced !== inner) changed = true;
      return quote + replaced + quote;
    }
  );
  return { out, changed };
}

// ── Varre recursivamente ──
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(path.extname(entry.name))) yield full;
  }
}

// ── Detecta seletores CSS que ficarão mortos no channels.css ──
function reportDeadCss() {
  const cssPath = path.resolve(__dirname, "../src/styles/channels.css");
  if (!fs.existsSync(cssPath)) return;
  const css = fs.readFileSync(cssPath, "utf8");
  const deadSelectors = Object.keys(CLASS_MAP).map((c) => `.${c}`);
  const found = deadSelectors.filter((sel) => css.includes(sel));
  if (found.length) {
    console.log(
      "\n📋 CSS agora sem uso em channels.css (remover manualmente, se desejar):"
    );
    found.forEach((sel) => console.log(`   ${sel}`));
    console.log(
      "   (Opcional — é inofensivo manter; o legacy-compat já garante o visual.)"
    );
  }
}

// ── Main ──
let filesChanged = 0;
let totalReplacements = 0;

console.log(
  `${APPLY ? "🔧 APLICANDO" : "🔍 DRY-RUN"} — migração de classes em ${SRC_DIR}\n`
);

for (const file of walk(SRC_DIR)) {
  const original = fs.readFileSync(file, "utf8");
  const { out, changed } = migrateContent(original);
  if (!changed) continue;

  filesChanged++;
  // Conta substituições (aproximado, por diff de ocorrências)
  const before = (original.match(/ch-btn|ch-tag/g) || []).length;
  const after = (out.match(/ch-btn|ch-tag/g) || []).length;
  totalReplacements += before - after;

  const rel = path.relative(process.cwd(), file);
  console.log(
    `  ${APPLY ? "✏️ " : "• "}${rel}  (${before - after} substituições)`
  );

  if (APPLY) {
    if (BACKUP) fs.copyFileSync(file, `${file}.bak`);
    fs.writeFileSync(file, out, "utf8");
  }
}

console.log(`\n── Resumo ──`);
console.log(
  `Arquivos ${APPLY ? "modificados" : "que mudariam"}: ${filesChanged}`
);
console.log(`Substituições: ${totalReplacements}`);
if (!APPLY && filesChanged > 0) {
  console.log(
    `\n⚠️  Nada foi alterado. Rode com --apply para efetivar (com backup).`
  );
}
if (APPLY) {
  reportDeadCss();
}
```

---

## ▶️ Como rodar

```bash
cd dashboard-qanat/frontend

# 1º — SEMPRE dry-run primeiro (não muda nada)
node scripts/migrateClasses.mjs

# 2º — Conferir a lista de arquivos e substituições

# 3º — Aplicar (cria .bak de cada arquivo alterado)
node scripts/migrateClasses.mjs --apply
```

---

## 🗺️ O que o script migra (e o que NÃO migra)

### ✅ Migra (correspondência 1:1 limpa)

| Antes             | Depois         |
| ----------------- | -------------- |
| `ch-btn`          | `btn`          |
| `ch-btn--primary` | `btn--primary` |
| `ch-btn--ghost`   | `btn--ghost`   |
| `ch-btn--danger`  | `btn--danger`  |
| `ch-tag`          | `badge`        |

### ⛔ NÃO migra (intencional — e por quê)

| Classe                                                                                              | Motivo                                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ch-card`, `ch-card--*`, `ch-card__*`                                                               | Estrutura BEM complexa (topo, nome, ações). Migrar só a base quebraria os filhos. **Já está visualmente unificada via `legacy-compat.css`.** |
| `ch-badge`                                                                                          | É o **badge de canal** (ChannelBadge) — não é a tag `.badge`. Migrar causaria conflito.                                                      |
| `ch-field`, `ch-form`, `ch-head`, `ch-switcher`, `ch-avatar`, `ch-status`, `ch-conn`, `ch-error`    | Estruturais/específicos de componente — não têm equivalente direto no Design System.                                                         |
| `tool-*`, `mpe-*`, `conn-*`, `mem-*`, `ab-*`, `cal-*`, `revive-*`, `radar-*`, `monitor-*`, `diag-*` | Específicos de cada ferramenta — já unificados visualmente via `legacy-compat.css`.                                                          |

> 💡 **Por que isso é seguro:** o `legacy-compat.css` já faz `ch-btn` e `btn` renderizarem **idênticos** (mesmos tokens). A migração dos nomes é para **limpeza de código**, não para mudar visual. Então mesmo os arquivos não migrados continuam perfeitos.

---

## 🧹 Depois de aplicar: CSS morto (opcional)

Após o `--apply`, o script lista os seletores que ficaram sem uso no `channels.css` (`.ch-btn`, `.ch-btn--primary`, `.ch-btn--ghost`, `.ch-btn--danger`, `.ch-tag`). Você pode removê-los manualmente — **mas é opcional e inofensivo manter**, já que não há mais JSX referenciando-os.

Se quiser limpar, remova estes blocos do `channels.css`:

- `.ch-btn { ... }` e seus `:hover`, `:active`, `:disabled`
- `.ch-btn--primary`, `.ch-btn--ghost`, `.ch-btn--danger`
- `.ch-tag`

---

## ✅ Checklist de Validação

```
□ Dry-run rodado — lista de arquivos conferida
□ --apply rodado — backups .bak criados
□ App abre sem erros
□ Botões (ex-Criadores, canais, ferramentas) idênticos ao novo .btn
□ Tags/badges idênticos ao novo .badge
□ Light mode continua funcionando nos botões migrados
□ Nenhum ch-card / ch-badge foi alterado (buscar por "ch-card" ainda retorna resultados)
□ (Opcional) CSS morto removido do channels.css
□ (Depois de validar) Arquivos .bak removidos
```

---

## 🎯 Resultado

- ✅ **Código unificado** — botões e tags usam as classes do Design System
- ✅ **Zero risco visual** — `legacy-compat.css` garante que tudo continue idêntico
- ✅ **Seguro** — dry-run + backup + substituição apenas em strings
- ✅ **Reversível** — basta restaurar os `.bak`

Com isso o projeto fica com **uma única linguagem de classes** para os elementos mais comuns (botões e tags), enquanto os componentes complexos permanecem estáveis.

# 🔧 Os Dois: Script de Inputs + Validação da Migração

Perfeito! Vou entregar o **script para unificar os inputs** e o **script de validação** que confirma se toda a migração (classes + inputs + CSS) ficou correta.

---

## 📄 Script 1 — `migrateInputs.mjs` (unificar inputs)

Adiciona `className="input"` / `"select"` nos campos que ainda não têm classe, para herdarem o visual do Design System.

**CRIAR** `dashboard-qanat/frontend/scripts/migrateInputs.mjs`:

```javascript
#!/usr/bin/env node
/**
 * migrateInputs.mjs
 * Adiciona className="input" (ou "select") em <input>/<select>/<textarea>
 * que ainda NÃO têm className, para usar o Design System.
 *
 * SEGURANÇA:
 *  - Dry-run por padrão (não altera sem --apply)
 *  - Backup .bak antes de sobrescrever
 *  - NÃO toca em campos que já têm className
 *  - PULA tipos especiais (checkbox, radio, range, color, hidden, file…)
 *
 * NOTA: inputs dentro de containers como .ch-field/.search-bar/.mpe-field
 *  já são estilizados por seletores descendentes (mais específicos), então
 *  adicionar .input neles é inócuo — só padroniza os que estão "soltos".
 *
 * USO:
 *   node scripts/migrateInputs.mjs            # dry-run
 *   node scripts/migrateInputs.mjs --apply    # aplica com backup
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "../src");

const APPLY = process.argv.includes("--apply");
const BACKUP = !process.argv.includes("--no-backup");

const EXTENSIONS = new Set([".jsx", ".tsx"]);
const SKIP_INPUT_TYPES = new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "hidden",
  "file",
  "button",
  "submit",
  "image",
]);

// Casa a tag de abertura de input/select/textarea, capturando os atributos.
// Suporta: valores entre aspas, expressões JSX {…} de 1 nível, quebras de linha.
const TAG_RE =
  /<(input|select|textarea)\b((?:[^>"'{]|"[^"]*"|'[^']*'|\{[^}]*\})*?)(\/?>)/gs;

function processContent(src) {
  const changes = [];
  const out = src.replace(TAG_RE, (match, tag, attrs, close) => {
    // Já tem className → não mexe
    if (/\bclassName\s*=/.test(attrs)) return match;

    // Pula tipos especiais de input
    const typeMatch = attrs.match(/type\s*=\s*["']([^"']+)["']/);
    const type = typeMatch ? typeMatch[1].toLowerCase() : "";
    if (tag === "input" && SKIP_INPUT_TYPES.has(type)) return match;

    const cls = tag === "select" ? "select" : "input";
    changes.push({ tag, cls });
    return `<${tag} className="${cls}"${attrs}${close}`;
  });
  return { out, changes };
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(path.extname(entry.name))) yield full;
  }
}

let filesChanged = 0;
let totalAdded = 0;

console.log(
  `${APPLY ? "🔧 APLICANDO" : "🔍 DRY-RUN"} — unificação de inputs em ${SRC_DIR}\n`
);

for (const file of walk(SRC_DIR)) {
  const original = fs.readFileSync(file, "utf8");
  const { out, changes } = processContent(original);
  if (!changes.length) continue;

  filesChanged++;
  totalAdded += changes.length;
  const rel = path.relative(process.cwd(), file);
  const resumo = changes
    .map((c) => c.cls)
    .reduce((a, c) => ((a[c] = (a[c] || 0) + 1), a), {});
  const desc = Object.entries(resumo)
    .map(([k, v]) => `${v}× .${k}`)
    .join(", ");
  console.log(`  ${APPLY ? "✏️ " : "• "}${rel}  (+${changes.length}: ${desc})`);

  if (APPLY) {
    if (BACKUP) fs.copyFileSync(file, `${file}.bak`);
    fs.writeFileSync(file, out, "utf8");
  }
}

console.log(`\n── Resumo ──`);
console.log(
  `Arquivos ${APPLY ? "modificados" : "que mudariam"}: ${filesChanged}`
);
console.log(`Classes adicionadas: ${totalAdded}`);
if (!APPLY && filesChanged > 0) {
  console.log(
    `\n⚠️  Nada foi alterado. Rode com --apply para efetivar (com backup).`
  );
}
```

---

## 📄 Script 2 — `validateMigration.mjs` (validar TUDO)

Confere se a migração de classes, inputs e a configuração de CSS estão corretas.

**CRIAR** `dashboard-qanat/frontend/scripts/validateMigration.mjs`:

```javascript
#!/usr/bin/env node
/**
 * validateMigration.mjs
 * Valida se a migração para o Design System ficou consistente.
 * USO: node scripts/validateMigration.mjs
 * Exit code 0 = tudo ok · 1 = algo falhou
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");

const checks = [];
const check = (name, pass, detail = "") => checks.push({ name, pass, detail });

function* walk(dir, exts) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full, exts);
    else if (exts.includes(path.extname(e.name))) yield full;
  }
}

const jsxFiles = [...walk(SRC, [".jsx", ".tsx"])];
const allJsx = jsxFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

// ── 1. Classes legadas removidas dos JSX ──
const legacyBtn = (allJsx.match(/ch-btn/g) || []).length;
const legacyTag = (allJsx.match(/ch-tag/g) || []).length;
check(
  "Sem 'ch-btn' nos JSX/TSX",
  legacyBtn === 0,
  `${legacyBtn} ocorrência(s)`
);
check(
  "Sem 'ch-tag' nos JSX/TSX",
  legacyTag === 0,
  `${legacyTag} ocorrência(s)`
);

// ── 2. Classes novas presentes ──
check("Classe 'btn' em uso", /["'`\s]btn["'`\s]/.test(allJsx));
check("Classe 'badge' em uso", /badge/.test(allJsx));

// ── 3. legacy-compat.css configurado ──
const compatPath = path.join(SRC, "styles/legacy-compat.css");
const compatExists = fs.existsSync(compatPath);
check("legacy-compat.css existe", compatExists);
if (compatExists) {
  const compat = fs.readFileSync(compatPath, "utf8");
  check("legacy-compat mapeia --amber", compat.includes("--amber:"));
  check("legacy-compat mapeia --bg-card", compat.includes("--bg-card:"));
  check(
    "legacy-compat mapeia --font-display",
    compat.includes("--font-display:")
  );
}

// ── 4. channels.css sem tokens antigos ──
const channelsPath = path.join(SRC, "styles/channels.css");
if (fs.existsSync(channelsPath)) {
  const channels = fs.readFileSync(channelsPath, "utf8");
  const hasOldAmber = /--amber:\s*#[0-9a-fA-F]/.test(channels);
  check(
    "channels.css sem --amber antigo (hex)",
    !hasOldAmber,
    hasOldAmber ? "ainda define --amber com hex" : "ok"
  );
  const hasOldFont = /Archivo Black/.test(channels);
  check(
    "channels.css sem fonte antiga (Archivo Black)",
    !hasOldFont,
    hasOldFont ? "ainda referencia Archivo Black" : "ok"
  );
} else {
  check("channels.css existe", false, "arquivo não encontrado");
}

// ── 5. Ordem de imports no main ──
const mainPath = ["main.jsx", "main.tsx", "index.jsx", "index.tsx"]
  .map((f) => path.join(SRC, f))
  .find((p) => fs.existsSync(p));
if (mainPath) {
  const main = fs.readFileSync(mainPath, "utf8");
  const dsIdx = main.indexOf("design-system.css");
  const lcIdx = main.indexOf("legacy-compat.css");
  const chIdx = main.indexOf("channels.css");
  check("main importa design-system.css", dsIdx !== -1);
  check("main importa legacy-compat.css", lcIdx !== -1);
  check(
    "ordem: design-system → legacy-compat",
    dsIdx !== -1 && lcIdx !== -1 && dsIdx < lcIdx
  );
  check(
    "ordem: legacy-compat → channels",
    lcIdx !== -1 && chIdx !== -1 && lcIdx < chIdx
  );
} else {
  check("main.jsx encontrado", false);
}

// ── Resultado ──
let passCount = 0;
console.log("\n── Validação da Migração ──\n");
for (const c of checks) {
  console.log(
    `${c.pass ? "✅" : "❌"} ${c.name}${c.detail ? `  (${c.detail})` : ""}`
  );
  if (c.pass) passCount++;
}
console.log(`\n${passCount}/${checks.length} verificações passaram.`);
process.exit(passCount === checks.length ? 0 : 1);
```

---

## ▶️ Ordem de execução

```bash
cd dashboard-qanat/frontend

# 1º — Migração de classes (já entregue antes)
node scripts/migrateClasses.mjs            # dry-run
node scripts/migrateClasses.mjs --apply    # aplica

# 2º — Migração de inputs (nova)
node scripts/migrateInputs.mjs             # dry-run
node scripts/migrateInputs.mjs --apply     # aplica

# 3º — Valida TUDO
node scripts/validateMigration.mjs         # deve terminar com ✅ e exit 0
```

---

## ⚠️ Nota importante sobre os inputs

Muitos inputs estão dentro de containers que **já os estilizam** via seletores descendentes (`.ch-field input`, `.search-bar input`, `.mpe-field input`, `.ab-campos input`). Como esses seletores têm **especificidade maior** que `.input`, adicionar a classe neles é **inócuo** — não muda o visual (eles já estão corretos via `legacy-compat.css`).

O ganho real é nos inputs **"soltos"** (fora desses containers), que passarão a usar o Design System automaticamente. Por isso o script é seguro de rodar em tudo.

---

## ✅ Checklist Final

```
MIGRAÇÃO DE CLASSES
□ migrateClasses.mjs --apply rodado (ch-btn→btn, ch-tag→badge)

MIGRAÇÃO DE INPUTS
□ migrateInputs.mjs dry-run conferido
□ migrateInputs.mjs --apply rodado
□ Inputs soltos agora usam .input/.select
□ Inputs especiais (checkbox/range/etc.) NÃO foram tocados

VALIDAÇÃO
□ validateMigration.mjs → todas as verificações ✅ (exit 0)
□ Sem ch-btn/ch-tag nos JSX
□ legacy-compat.css mapeia os tokens
□ channels.css sem :root antigo
□ Ordem de imports correta no main

VISUAL (manual)
□ App abre sem erros
□ Botões, tags e inputs consistentes
□ Light mode funciona em tudo
□ (Depois de validar) Remover os arquivos .bak
```

---

## 🎯 Resultado

Com os dois scripts + validação, a migração fica **completa, verificável e reversível**:

- ✅ **Classes unificadas** (`btn`, `badge`)
- ✅ **Inputs padronizados** (`input`, `select`)
- ✅ **Validação automática** que garante a consistência (roda a qualquer momento, inclusive no CI)
- ✅ **Seguro** — dry-run + backup + pulo de casos especiais

O projeto agora tem uma **única linguagem de componentes** e um **verificador** que você pode rodar sempre que quiser confirmar que nada regrediu.
