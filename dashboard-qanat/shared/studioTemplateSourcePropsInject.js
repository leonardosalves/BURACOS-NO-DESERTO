/**
 * Injeta uso de props em sources Studio com literais de demo.
 * Conservador: só adiciona param props e troca strings conhecidas.
 */

import { repairCorruptedTemplateStringLiterals } from "./remotionTemplateSourceRepair.js";

const QUOTED_DEMO_STRINGS = [
  ["Main Content", "${props.title || props.mainTitle || 'Cena'}"],
  ["Speaker", "${props.subtitle || props.pipTitle || 'Detalhe'}"],
  ["After", "${props.afterLabel || props.title || 'Depois'}"],
  ["Before", "${props.beforeLabel || props.subtitle || 'Antes'}"],
  ["Mountain", "${props.images?.[0]?.label || props.title || 'Imagem 1'}"],
  ["Ocean", "${props.images?.[1]?.label || props.subtitle || 'Imagem 2'}"],
  ["Forest", "${props.images?.[2]?.label || 'Imagem 3'}"],
  ["Photo 1", "${props.images?.[0]?.label || 'Foto 1'}"],
  ["Photo 2", "${props.images?.[1]?.label || 'Foto 2'}"],
  ["Photo 3", "${props.images?.[2]?.label || 'Foto 3'}"],
  ["Jane Smith", "${props.attribution || props.name || props.title || ''}"],
  ["John Doe", "${props.subtitle || props.name || ''}"],
  ["Your quote goes here.", "${props.quote || props.text || ''}"],
  ["Your quote goes here", "${props.quote || props.text || ''}"],
];

/**
 * Garante que o componente default aceite props e mapeie campos comuns.
 */
export function injectStudioPropsContract(sourceCode = "") {
  let src = repairCorruptedTemplateStringLiterals(String(sourceCode || ""));
  if (!src.trim()) return src;

  // export default function Name() → Name(props = {})
  src = src.replace(
    /export\s+default\s+function\s+(\w+)\s*\(\s*\)/,
    "export default function $1(props = {})"
  );

  // export default function Name({ ... }) already has props-like — leave
  // export default function Name( something without props
  if (!/export\s+default\s+function\s+\w+\s*\(\s*props\b/.test(src)) {
    src = src.replace(
      /export\s+default\s+function\s+(\w+)\s*\(\s*\{/,
      "export default function $1(props = {}, {"
    );
  }

  for (const [literal, expr] of QUOTED_DEMO_STRINGS) {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    src = src.replace(new RegExp(`"${escaped}"`, "g"), `{\`${expr}\`}`);
    src = src.replace(new RegExp(`'${escaped}'`, "g"), `{\`${expr}\`}`);
  }

  // Fundo escuro: tenta usar sceneAsset como background-image
  if (
    /backgroundColor:\s*["']#111827["']/.test(src) &&
    !/props\.sceneAsset|props\.imageUrl|props\.backgroundImage/.test(src)
  ) {
    src = src.replace(
      /backgroundColor:\s*["']#111827["']/,
      'backgroundColor: (props && props.backgroundColor) || "#111827", backgroundImage: (props && (props.sceneAsset || props.imageUrl || props.backgroundImage)) ? `url(${props.sceneAsset || props.imageUrl || props.backgroundImage})` : undefined, backgroundSize: "cover", backgroundPosition: "center"'
    );
  }

  return src;
}

/**
 * Aplica inject em sourceCode short/long de um template de catálogo.
 */
export function injectCatalogTemplateSources(template = {}) {
  const src = template.sourceCode;
  if (!src || typeof src !== "object") return template;
  return {
    ...template,
    sourceCode: {
      short: src.short ? injectStudioPropsContract(src.short) : src.short,
      long: src.long ? injectStudioPropsContract(src.long) : src.long,
    },
  };
}
