/** Navegação global — única fonte de verdade (App.tsx + AppShell.tsx). */
export type AppTab =
  | 'home'
  | 'status'
  | 'workflow'
  | 'timeline'
  | 'scene-timing'
  | 'music'
  | 'terminal'
  | 'ai'
  | 'creator'
  | 'editor'
  | 'settings'
  | 'upload'
  | 'agents'
  | 'youtube-studio'
  | 'video-resurrector'
  | 'comfy-mcp'
  | 'trend-forecast'
  | 'agent-reach'
  | 'n8n-orchestrator'
  | 'projects';

export const RESTORABLE_APP_TABS: AppTab[] = [
  'home',
  'status',
  'workflow',
  'timeline',
  'scene-timing',
  'music',
  'terminal',
  'ai',
  'creator',
  'editor',
  'settings',
  'upload',
  'agents',
  'youtube-studio',
  'video-resurrector',
  'comfy-mcp',
  'trend-forecast',
  'agent-reach',
  'n8n-orchestrator',
  'projects',
];

export const GLOBAL_VIEW_TABS: AppTab[] = [
  'home',
  'settings',
  'creator',
  'agents',
  'youtube-studio',
  'video-resurrector',
  'comfy-mcp',
  'trend-forecast',
  'agent-reach',
  'n8n-orchestrator',
  'projects',
];

export function isGlobalViewTab(tab: AppTab): boolean {
  return GLOBAL_VIEW_TABS.includes(tab);
}