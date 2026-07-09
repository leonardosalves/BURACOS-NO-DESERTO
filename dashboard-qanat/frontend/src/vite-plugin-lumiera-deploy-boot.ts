import type { Plugin } from "vite";

const BOOT_TAG = '<script src="/lumiera-deploy-boot.js"></script>';
const PROD_ENTRY_RE =
  /\s*<script type="module"[^>]*src="\/assets\/index-[^"]+\.js"[^>]*><\/script>/g;
const ENTRY_META_RE = /\s*<meta name="lumiera-entry" content="[^"]*"\s*\/?>/g;

function findProdEntry(ctx: {
  bundle?: Record<string, { type?: string; isEntry?: boolean }>;
}) {
  const bundle = ctx.bundle;
  if (!bundle) return "";
  for (const [fileName, chunk] of Object.entries(bundle)) {
    if (chunk.type === "chunk" && chunk.isEntry) {
      return fileName.startsWith("/")
        ? fileName
        : `/${fileName.replace(/\\/g, "/")}`;
    }
  }
  return "";
}

export function lumieraDeployBootPlugin(): Plugin {
  return {
    name: "lumiera-deploy-boot",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        let result = html.replace(ENTRY_META_RE, "");
        const entry = findProdEntry(ctx);
        const entryMeta = entry
          ? `\n    <meta name="lumiera-entry" content="${entry}" />`
          : "";

        if (!result.includes("lumiera-deploy-boot.js")) {
          result = result.replace(
            /<script src="https:\/\/js\.puter\.com\/v2\/"><\/script>/,
            `${BOOT_TAG}\n    <script src="https://js.puter.com/v2/"></script>`
          );
        }

        if (entryMeta) {
          result = result.replace("</head>", `${entryMeta}\n  </head>`);
        }

        result = result.replace(PROD_ENTRY_RE, "");
        return result;
      },
    },
  };
}
