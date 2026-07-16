import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildStockAssetSearchContext } from "./stockAssetLinks.ts";

describe("buildStockAssetSearchContext", () => {
  it("gera busca vertical de vídeo com filtros e briefing 9:16", () => {
    const result = buildStockAssetSearchContext({
      query: "satellite map south america",
      prompt: "Cinematic satellite flight over South America",
      isVideo: true,
      aspectRatio: "9:16",
      durationSeconds: 6.4,
    });

    assert.equal(result.dimensions, "1080×1920");
    assert.match(result.links.pexels, /orientation=portrait/);
    assert.match(result.links.pixabay, /orientation=vertical/);
    assert.match(decodeURIComponent(result.links.bing), /aspect-tall/);
    assert.equal(
      result.links.canva,
      "https://www.canva.com/create/instagram-videos/"
    );
    assert.match(result.productionBrief, /9:16 vertical, 1080×1920px/);
    assert.match(result.productionBrief, /6\.4 segundos/);
  });

  it("gera busca horizontal de foto em alta resolução", () => {
    const result = buildStockAssetSearchContext({
      query: "historic city aerial",
      isVideo: false,
      aspectRatio: "16:9",
    });

    assert.equal(result.mediaLabel, "FOTO");
    assert.match(result.links.pexels, /orientation=landscape/);
    assert.match(result.links.pixabay, /image_type=photo/);
    assert.match(decodeURIComponent(result.links.bing), /aspect-wide/);
    assert.equal(
      result.links.canva,
      "https://www.canva.com/create/youtube-thumbnails/"
    );
  });
});
