/** Navegação global — única fonte de verdade (App.tsx + AppShell.tsx). */
export type AppTab =
  | 'home'
  | 'status'
  | 'workflow'
  | 'timeline'
  | 'music'
  | 'terminal'
  | 'ai'
  | 'creator'
  | 'editor'
  | 'settings'
  | 'upload'
  | 'agents'
  | 'youtube-studio'
  | 'comfy-mcp'
  | 'trend-forecast'
  | 'agent-reach'
  | 'projects'
  | 'dash-ui'
  | 'dash-extensions';

export const RESTORABLE_APP_TABS: AppTab[] = [
  'home',
  'status',
  'workflow',
  'timeline',
  'music',
  'terminal',
  'ai',
  'creator',
  'editor',
  'settings',
  'upload',
  'agents',
  'youtube-studio',
  'comfy-mcp',
  'trend-forecast',
  'agent-reach',
  'projects',
  'dash-ui',
  'dash-extensions',
];

export const GLOBAL_VIEW_TABS: AppTab[] = [
  'home',
  'settings',
  'creator',
  'agents',
  'youtube-studio',
  'comfy-mcp',
  'trend-forecast',
  'agent-reach',
  'projects',
  'dash-ui',
  'dash-extensions',
];

export function isGlobalViewTab(tab: AppTab): boolean {
  return GLOBAL_VIEW_TABS.includes(tab);
}