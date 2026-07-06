export type StockSearchItem = {
  id: string;
  sourceId: string;
  provider: "pexels" | "pixabay";
  type: "video" | "image";
  previewUrl: string;
  downloadUrl: string;
  width?: number;
  height?: number;
  duration?: number;
  photographer?: string;
  query: string;
};

export type StockKeysStatus = {
  pexels: boolean;
  pixabay: boolean;
};
