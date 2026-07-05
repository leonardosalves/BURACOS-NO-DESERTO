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
  | 'flow-lab'
  | 'settings'
  | 'upload'
  | 'agents'
  | 'youtube-studio'
  | 'video-resurrector'
  | 'comfy-mcp'
  | 'trend-forecast'
  | 'agent-reach'
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
  'flow-lab',
  'settings',
  'upload',
  'agents',
  'youtube-studio',
  'video-resurrector',
  'comfy-mcp',
  'trend-forecast',
  'agent-reach',
  'projects',
];

export const GLOBAL_VIEW_TABS: AppTab[] = [
  'home',
  'settings',
  'creator',
  'agents',
  'flow-lab',
  'youtube-studio',
  'video-resurrector',
  'comfy-mcp',
  'trend-forecast',
  'agent-reach',
  'projects',
];

export function isGlobalViewTab(tab: AppTab): boolean {
  return GLOBAL_VIEW_TABS.includes(tab);
}