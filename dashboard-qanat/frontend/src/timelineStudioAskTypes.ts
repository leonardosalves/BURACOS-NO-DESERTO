import type { StudioClip } from "./timelineStudioTypes";

export type AskLumieraAction =
  | { type: "add_overlay"; clip: StudioClip }
  | { type: "set_niche_pack"; niche_pack: string }
  | { type: "search_stock"; query: string; mediaType: "video" | "image" }
  | { type: "seek_to"; time: number }
  | { type: "tighten_gaps" }
  | { type: "set_caption_text"; text: string; clipId?: string }
  | {
      type: "update_clip";
      clipId?: string;
      targetTrack?: string;
      patch: Partial<StudioClip>;
    }
  | {
      type: "update_clip_props";
      clipId?: string;
      targetTrack?: string;
      props: Record<string, unknown>;
    }
  | { type: "delete_clip"; clipId?: string; targetTrack?: string };

export type NichePackTemplate = {
  templateId: string;
  label: string;
  color?: string;
  duration?: number;
  defaultProps?: Record<string, unknown>;
};

export type NichePackInfo = {
  id: string;
  label: string;
  description?: string;
  templateIds?: string[];
  templates: NichePackTemplate[];
};

export type StockSearchTrigger = {
  query: string;
  mediaType: "video" | "image";
  nonce: number;
};
