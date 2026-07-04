import type { PreRenderAdvice } from "./PreRenderAdvice";
import type { BgmProductionHints } from "./productionConfig";

export interface BGM {
  block: number;
  file: string;
}

export interface BgmEmotionMapping {
  segment_id: string;
  file: string;
  start: number;
  duration: number;
  emotion?: string;
  climax_mode?: string;
  duck_strength?: string;
  search_theme?: string;
}

export interface ImpactText {
  block: number;
  start_offset: number;
  end_offset: number;
  text: string;
}

export interface ConfigData {
  highlight_keywords: string[];
  bgm_mappings: BGM[];
  impact_texts: ImpactText[];
  timeline_assets?: Record<string, any[]>;
  block_phrases?: { block: number; phrase: string }[];
  aspect_ratio?: "16:9" | "9:16";
  video_format?: "SHORTS" | "LONGO" | string;
  render_resolution?: "1080p" | "2k";
  design_preset?: string;
  caption_style?: string;
  caption_mode_short?: string;
  caption_mode_long?: string;
  caption_style_short?: "shorts-viral" | "documentary";
  caption_style_long?: "shorts-viral" | "documentary";
  caption_effect_short?: string;
  caption_effect_long?: string;
  grain_overlay?: boolean;
  vignette?: boolean;
  progress_bar?: boolean;
  chapter_stingers?: boolean;
  source_cards?: boolean;
  overlay_sfx_sync?: boolean;
  listicle_hud_style?: "auto" | "full" | "compact";
  shorts_zoom_intensity?: "normal" | "aggressive" | "cinematic";
  shorts_hook_flash?: boolean;
  shorts_edge_glow?: boolean;
  shorts_caption_bgm_pulse?: boolean;
  shorts_portal_transition?: boolean;
  shorts_portal_every?: number;
  social_proof_cards?: boolean;
  geo_map_overlays?: boolean;
  accent_color?: string;
  secondary_color?: string;
  canvas_background?: string;
  listicle_hud_theme?: "ancient" | "mysterious" | "nature" | "classic" | "tech" | "industrial";
  long_zoom_intensity?: "normal" | "aggressive" | "cinematic";
  overlay_intensity?: "light" | "normal" | "rich";
  project_music_volume?: number;
  overlay_min_gap?: "tight" | "normal" | "relaxed";
  overlay_max_duration?: number;
  bgm_duck_strength?: "light" | "normal" | "strong";
  overlay_sfx_volume?: number;
  content_mode?: string;
  use_single_bgm?: boolean;
  single_bgm?: string;
  bgm_mode?: "emotion" | "block";
  narration_mode?: "chunked" | "master";
  bgm_emotion_mappings?: BgmEmotionMapping[];
  _bgm_production_hints?: BgmProductionHints;
  upload_metadata?: any;
  youtube_channel?: {
    channel_url?: string;
    channel_name?: string;
    subscriber_count?: string;
  };
}

export interface WorkspaceStatus {
  workspace: string;
  assets_count: number;
  has_narration: boolean;
  has_soundtrack: boolean;
  has_highlight_clip: boolean;
  has_config: boolean;
  block_timings?: { starts: number[]; durations: number[]; total_duration: number } | null;
}

export interface OutputVideo {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
  renderEngine?: "remotion" | "standard";
  renderEngineLabel?: string;
}

export interface MusicFile {
  name: string;
  sizeBytes: number;
}

export interface HeaderWeather {
  temperature: number | null;
}

export interface VideoQualityIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
}

export interface OverlayTimingEntry {
  id: string;
  type?: string;
  plannedScene?: string | null;
  block?: number | null;
  startSec?: number;
  endSec?: number;
  keywordMatchSec?: number | null;
  status: "ok" | "warning" | "repaired" | "error";
  message?: string;
}

export interface VideoQualityReport {
  ok: boolean;
  score: number;
  issues: VideoQualityIssue[];
  plan?: { format: string; maxOverlays: number; profile: string };
  preset?: string | null;
  epidemicMood?: string | null;
  preRenderAdvice?: PreRenderAdvice;
  slideshow_risk?: {
    average: number;
    verdict: string;
    dimensions?: Record<string, number>;
  };
  sample_approved?: boolean;
  workshop?: {
    staged?: boolean;
    id?: string;
    record?: { summary?: string; skill?: string };
  } | null;
  overlay_timing?: {
    checked?: number;
    repaired?: number;
    okCount?: number;
    warnCount?: number;
    plannedCount?: number;
    source?: "rendered" | "planned" | "none" | "verified";
    entries?: OverlayTimingEntry[];
  };
}

export type PendingRenderJob = {
  mode: "standard" | "highlighted" | "remotion" | "remotion-pro";
  fromWizard: boolean;
  withoutImpactTitles: boolean;
  useHyperframes: boolean;
  isProres: boolean;
  previewSeconds: number;
  resolution: "1080p" | "2k";
  sampleMode?: boolean;
};

export type StudioBundlePreview = {
  task: string;
  format: string;
  bundleSlug: string | null;
  bundleName: string | null;
  skillSlugs: string[];
  maxSkills: number;
  injectedCount: number;
};