export type StockAspectRatio = "9:16" | "16:9";

export type StockAssetSearchContext = {
  aspectRatio: StockAspectRatio;
  dimensions: "1080×1920" | "1920×1080";
  orientationLabel: "vertical" | "horizontal";
  mediaLabel: "VÍDEO" | "FOTO";
  enrichedQuery: string;
  productionBrief: string;
  links: {
    pexels: string;
    pixabay: string;
    bing: string;
    canva: string;
  };
};

function compactSearchTerms(value = "", maxLength = 120): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[|<>]/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function buildStockAssetSearchContext({
  query,
  prompt,
  isVideo,
  aspectRatio,
  durationSeconds,
}: {
  query: string;
  prompt?: string;
  isVideo: boolean;
  aspectRatio: StockAspectRatio;
  durationSeconds?: number | null;
}): StockAssetSearchContext {
  const vertical = aspectRatio === "9:16";
  const dimensions = vertical ? "1080×1920" : "1920×1080";
  const orientationLabel = vertical ? "vertical" : "horizontal";
  const pexelsOrientation = vertical ? "portrait" : "landscape";
  const pixabayOrientation = vertical ? "vertical" : "horizontal";
  const bingAspect = vertical ? "tall" : "wide";
  // Preserve the scene/narration query exactly as resolved by stockSearchQuery.
  // Aspect ratio belongs in each provider's filters, not in the search words:
  // adding generic terms here makes the results drift away from the narration.
  const enrichedQuery = compactSearchTerms(query);
  const encodedQuery = encodeURIComponent(enrichedQuery);
  const pexelsPath = isVideo ? "search/videos" : "search";
  const pixabayPath = isVideo ? "videos/search" : "images/search";
  const bingPath = isVideo ? "videos/search" : "images/search";
  const bingFilters = isVideo
    ? `+filterui:aspect-${bingAspect}`
    : `+filterui:aspect-${bingAspect}+filterui:imagesize-large+filterui:photo-photo`;
  const canva = vertical
    ? isVideo
      ? "https://www.canva.com/create/instagram-videos/"
      : "https://www.canva.com/create/instagram-stories/"
    : isVideo
      ? "https://www.canva.com/create/youtube-videos/"
      : "https://www.canva.com/create/youtube-thumbnails/";
  const duration =
    isVideo && Number(durationSeconds) > 0
      ? ` Duração útil aproximada: ${Number(durationSeconds).toFixed(1)} segundos.`
      : "";
  const productionBrief = [
    compactSearchTerms(prompt || query, 500),
    `Formato obrigatório: ${aspectRatio} ${orientationLabel}, ${dimensions}px.`,
    isVideo
      ? "Criar vídeo cinematográfico sem textos, marcas, logos ou letterbox; manter o assunto principal dentro da área segura."
      : "Criar imagem fotográfica em alta resolução, sem textos, marcas ou logos; manter o assunto principal dentro da área segura.",
    duration,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    aspectRatio,
    dimensions,
    orientationLabel,
    mediaLabel: isVideo ? "VÍDEO" : "FOTO",
    enrichedQuery,
    productionBrief,
    links: {
      pexels: `https://www.pexels.com/${pexelsPath}/${encodedQuery}/?orientation=${pexelsOrientation}&size=large&locale=pt-BR`,
      pixabay: `https://pixabay.com/${pixabayPath}/${encodedQuery}/?orientation=${pixabayOrientation}&order=popular${isVideo ? "&video_type=film" : "&image_type=photo"}`,
      bing: `https://www.bing.com/${bingPath}?q=${encodedQuery}&qft=${encodeURIComponent(bingFilters)}&FORM=IRFLTR`,
      canva,
    },
  };
}
