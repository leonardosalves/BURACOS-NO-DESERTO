import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");
const body = fs.readFileSync(path.join(srcDir, "_music_tab_body.txt"), "utf8");

const header = `import toast from 'react-hot-toast';
import React from 'react';
import { Copy, Download, Music, Pause, Play, RefreshCw, Search, Sparkles, Trash2, Upload } from 'lucide-react';
import { DashminProjectTabLayout } from './DashminProjectTabLayout';
import { SectionHeader } from './SectionHeader';
import type { ConfigData } from './appTypes';

export type MusicFile = { name: string; sizeBytes: number };

export type AppMusicTabProps = {
  config: ConfigData;
  activeProject: string;
  mixing: boolean;
  mixBGM: (fromWizard?: boolean) => void | Promise<void>;
  globalMusicVolume: number;
  activeBgmMode: string;
  isShortVideo: boolean;
  saveConfig: (cfg: ConfigData) => void | Promise<void>;
  planningBgmEmotions: boolean;
  hasApiKey: boolean;
  handlePlanBgmEmotions: () => void | Promise<void>;
  bgmEmotionRows: any[];
  safeMusicFiles: MusicFile[];
  handleEmotionMusicChange: (segmentId: string, fileName: string, segMeta: any) => void | Promise<void>;
  playingMusic: string | null;
  togglePlayMusic: (nameOrUrl: string) => void;
  bgmSuggestions: any;
  bgmBlockRows: Array<{ block: number; file: string }>;
  handleMusicChange: (blockNum: number, fileName: string) => void;
  searchMusic: string;
  setSearchMusic: (v: string) => void;
  handleDeleteAllMusic: () => void;
  getProjectUrl: (path: string) => string;
  fetchData: () => void | Promise<void>;
  suggestingBGM: boolean;
  handleSuggestBGM: () => void | Promise<void>;
  handleDeleteMusic: (name: string) => void;
  getFormatBytes: (n: number) => string;
  hasEpidemicKey: boolean;
  autoSoundtracking: boolean;
  handleAutoSoundtrack: () => void | Promise<void>;
  epidemicSearchType: 'bgm' | 'sfx';
  setEpidemicSearchType: (t: 'bgm' | 'sfx') => void;
  setEpidemicSearchResults: (r: any[]) => void;
  epidemicSearchQuery: string;
  setEpidemicSearchQuery: (q: string) => void;
  handleSearchEpidemic: () => void | Promise<void>;
  searchingEpidemic: boolean;
  safeEpidemicResults: any[];
  downloadingEpidemicId: string | null;
  handleDownloadEpidemic: (track: any, blockNumber?: number) => void | Promise<void>;
  storyboardData: any;
};

export function AppMusicTab({
  config,
  activeProject,
  mixing,
  mixBGM,
  globalMusicVolume,
  activeBgmMode,
  isShortVideo,
  saveConfig,
  planningBgmEmotions,
  hasApiKey,
  handlePlanBgmEmotions,
  bgmEmotionRows,
  safeMusicFiles,
  handleEmotionMusicChange,
  playingMusic,
  togglePlayMusic,
  bgmSuggestions,
  bgmBlockRows,
  handleMusicChange,
  searchMusic,
  setSearchMusic,
  handleDeleteAllMusic,
  getProjectUrl,
  fetchData,
  suggestingBGM,
  handleSuggestBGM,
  handleDeleteMusic,
  getFormatBytes,
  hasEpidemicKey,
  autoSoundtracking,
  handleAutoSoundtrack,
  epidemicSearchType,
  setEpidemicSearchType,
  setEpidemicSearchResults,
  epidemicSearchQuery,
  setEpidemicSearchQuery,
  handleSearchEpidemic,
  searchingEpidemic,
  safeEpidemicResults,
  downloadingEpidemicId,
  handleDownloadEpidemic,
  storyboardData,
}: AppMusicTabProps) {
  return (
`;

const footer = `  );
}
`;

fs.writeFileSync(path.join(srcDir, "AppMusicTab.tsx"), header + body + footer);
console.log("AppMusicTab.tsx written");