import type { StudioClip } from "./timelineStudioTypes";

export type AskLumieraAction =
  | { type: "add_overlay"; clip: StudioClip }
  | { type: "set_niche_pack"; niche_pack: string }
  | { type: "search_stock"; query: string; mediaType: "video" | "image" };

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
