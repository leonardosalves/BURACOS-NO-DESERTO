import type { Plugin } from "vite";

const BUILD_STAMP = String(Date.now());

export function lumieraBuildStampPlugin(): Plugin {
  return {
    name: "lumiera-build-stamp",
    transformIndexHtml(html) {
      return html.replace(
        /(src="\/assets\/index-[^"]+\.js)"/g,
        `$1?v=${BUILD_STAMP}"`
      );
    },
  };
}
