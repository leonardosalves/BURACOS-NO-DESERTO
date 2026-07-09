import type { Plugin } from "vite";

const BOOT_TAG = '<script src="/lumiera-deploy-boot.js"></script>';

export function lumieraDeployBootPlugin(): Plugin {
  return {
    name: "lumiera-deploy-boot",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (html.includes("lumiera-deploy-boot.js")) {
          return html.replace(
            /(<script src="\/lumiera-deploy-boot\.js"><\/script>\s*)+/,
            `${BOOT_TAG}\n    `
          );
        }
        return html.replace(
          /(\s*)(<script type="module"[^>]*><\/script>|<script type="module"[^>]*><\/script>)/,
          `$1${BOOT_TAG}\n$1$2`
        );
      },
    },
  };
}
