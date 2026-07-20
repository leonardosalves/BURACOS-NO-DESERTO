/** Navegação global — única fonte de verdade (App.tsx + AppShell.tsx). */
export type AppTab =
  | "home"
  | "status"
  | "workflow"
  | "timeline"
  | "music"
  | "terminal"
  | "ai"
  | "creator"
  | "humor-facts"
  | "collage-broll"
  | "video-reverse-engineering"
  | "project-health"
  | "editor"
  | "flow-lab"
  | "settings"
  | "upload"
  | "agents"
  | "youtube-studio"
  | "video-resurrector"
  | "trend-forecast"
  | "agent-reach"
  | "templates"
  | "docs"
  | "projects"
  | "tools"
  | "graphify"
  | "whiteboard-creator"
  | "video-monitor";

export const RESTORABLE_APP_TABS: AppTab[] = [
  "home",
  "status",
  "workflow",
  "timeline",
  "music",
  "terminal",
  "ai",
  "creator",
  "humor-facts",
  "collage-broll",
  "video-reverse-engineering",
  "project-health",
  "editor",
  "flow-lab",
  "settings",
  "upload",
  "agents",
  "youtube-studio",
  "video-resurrector",
  "trend-forecast",
  "agent-reach",
  "templates",
  "docs",
  "projects",
  "tools",
  "graphify",
  "whiteboard-creator",
  "video-monitor",
];

export const GLOBAL_VIEW_TABS: AppTab[] = [
  "home",
  "settings",
  "creator",
  "humor-facts",
  "collage-broll",
  "video-reverse-engineering",
  "project-health",
  "agents",
  "flow-lab",
  "youtube-studio",
  "video-resurrector",
  "trend-forecast",
  "agent-reach",
  "templates",
  "docs",
  "projects",
  "tools",
  "whiteboard-creator",
  "video-monitor",
];

export function isGlobalViewTab(tab: AppTab): boolean {
  return GLOBAL_VIEW_TABS.includes(tab);
}

/** Abas com edição intensa — pausar polling/fetch em background. */
export function isEditorHeavyTab(tab: AppTab): boolean {
  return tab === "editor" || tab === "flow-lab";
}
