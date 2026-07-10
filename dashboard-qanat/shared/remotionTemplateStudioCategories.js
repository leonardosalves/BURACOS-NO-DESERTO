/** Categorias padrão do Template Studio (compartilhado Studio + Timeline). */

export const DEFAULT_TEMPLATE_CATEGORIES = [
  {
    id: "maps",
    label: "Mapas",
    subcategories: ["PIP mapa", "Flyover", "Mapa antigo", "Pin regional"],
  },
  {
    id: "chart-data",
    label: "Chart Data",
    subcategories: [
      "Counter",
      "Bar chart",
      "Line chart",
      "Area chart",
      "Pie chart",
      "Donut chart",
      "KPI",
      "Circular Progress",
    ],
  },
  {
    id: "text",
    label: "Text",
    subcategories: ["Lower third", "Title", "Quote", "Callout"],
  },
  {
    id: "content-animation",
    label: "Content Animation",
    subcategories: ["Processo", "Timeline", "Comparacao", "Explainer"],
  },
  {
    id: "background",
    label: "Background",
    subcategories: ["Grid", "HUD", "Blueprint", "Texture"],
  },
  {
    id: "cinematic",
    label: "Cinematic",
    subcategories: ["Reveal", "Lens", "Depth", "Frame"],
  },
  {
    id: "transition",
    label: "Transition",
    subcategories: ["Swipe", "Map zoom", "Match cut", "Glitch"],
  },
  {
    id: "logo-branding",
    label: "Logo e Branding",
    subcategories: ["Bug", "Ident", "Watermark", "Sponsor"],
  },
  {
    id: "intro-outro",
    label: "Intro e Outro",
    subcategories: ["Hook", "Chapter", "CTA", "Recap"],
  },
  {
    id: "image-media",
    label: "Image e Media",
    subcategories: ["PIP media", "Before after", "Stack", "Gallery"],
  },
];

export const TEMPLATE_CATEGORY_STORAGE_KEY =
  "lumiera.remotionTemplateStudio.categories.v1";

export function subcategoryKey(name = "") {
  return String(name || "")
    .trim()
    .toLowerCase();
}

export function subcategoryExists(subcategories = [], name = "") {
  const key = subcategoryKey(name);
  return subcategories.some((item) => subcategoryKey(item) === key);
}

export function mergeCategoryCatalog(
  stored = [],
  seed = DEFAULT_TEMPLATE_CATEGORIES
) {
  const byId = new Map();

  for (const item of seed) {
    byId.set(item.id, {
      ...item,
      subcategories: [...(item.subcategories || [])],
    });
  }

  for (const item of Array.isArray(stored) ? stored : []) {
    if (!item?.id) continue;
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, {
        ...item,
        subcategories: [...(item.subcategories || [])],
      });
      continue;
    }
    const mergedSubs = [...existing.subcategories];
    for (const sub of item.subcategories || []) {
      if (!subcategoryExists(mergedSubs, sub)) mergedSubs.push(sub);
    }
    byId.set(item.id, {
      ...existing,
      label: existing.label || item.label,
      subcategories: mergedSubs,
    });
  }

  return [...byId.values()];
}

export function syncCategoriesFromTemplates(categories = [], templates = []) {
  const byId = new Map(
    (Array.isArray(categories) ? categories : []).map((item) => [
      item.id,
      { ...item, subcategories: [...(item.subcategories || [])] },
    ])
  );

  for (const template of Array.isArray(templates) ? templates : []) {
    const cleanSubcategory = String(template?.subcategory || "").trim();
    const categoryId = String(template?.category || "").trim();
    if (!categoryId || !cleanSubcategory) continue;

    let categoryDef = byId.get(categoryId);
    if (!categoryDef) {
      const seed = DEFAULT_TEMPLATE_CATEGORIES.find((c) => c.id === categoryId);
      categoryDef = seed
        ? { ...seed, subcategories: [...seed.subcategories] }
        : {
            id: categoryId,
            label: categoryId,
            subcategories: [],
          };
      byId.set(categoryId, categoryDef);
    }
    if (!subcategoryExists(categoryDef.subcategories, cleanSubcategory)) {
      categoryDef.subcategories.push(cleanSubcategory);
    }
  }

  return [...byId.values()];
}

export function readStoredTemplateCategories(
  storageKey = TEMPLATE_CATEGORY_STORAGE_KEY
) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadTemplateCategoryCatalog(
  templates = [],
  storageKey = TEMPLATE_CATEGORY_STORAGE_KEY
) {
  const stored = readStoredTemplateCategories(storageKey);
  const merged = mergeCategoryCatalog(stored, DEFAULT_TEMPLATE_CATEGORIES);
  return syncCategoriesFromTemplates(merged, templates);
}

const MAPS_MOTION_TEMPLATE_IDS = new Set([
  "location-intro",
  "flyover",
  "map-zoom",
  "regional-pin",
]);

const PALETTE_SUBCATEGORY_ALIASES = {
  maps: {
    "pip mapa": ["picture in picture", "pip media", "pip mapa"],
    flyover: ["flyover", "map zoom"],
    "mapa antigo": ["mapa antigo", "historic map"],
    "pin regional": ["pin regional", "regional pin"],
  },
};

function templateHaystack(template = {}) {
  return [
    template.category,
    template.subcategory,
    template.name,
    template.motion_template_id,
  ]
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

export function templateMatchesPaletteCategory(template = {}, paletteCategoryId = "") {
  const paletteId = String(paletteCategoryId || "").trim().toLowerCase();
  const templateCategory = String(template?.category || "").trim().toLowerCase();
  if (!paletteId) return false;
  if (paletteId === templateCategory) return true;

  if (paletteId === "maps") {
    const motionId = String(template?.motion_template_id || "")
      .trim()
      .toLowerCase();
    if (MAPS_MOTION_TEMPLATE_IDS.has(motionId)) return true;

    const haystack = templateHaystack(template);
    if (templateCategory === "image-media" && haystack.includes("picture in picture")) {
      return true;
    }
    if (haystack.includes("flyover") || haystack.includes("pip mapa")) {
      return true;
    }
  }

  return false;
}

export function templateMatchesPaletteSubcategory(
  template = {},
  paletteCategoryId = "",
  subcategoryName = ""
) {
  const paletteSub = subcategoryKey(subcategoryName);
  const templateSub = subcategoryKey(template?.subcategory || "");
  if (!paletteSub) return true;
  if (paletteSub === templateSub) return true;

  const aliases =
    PALETTE_SUBCATEGORY_ALIASES[String(paletteCategoryId || "").trim().toLowerCase()] ||
    {};
  const accepted = aliases[paletteSub] || [];
  const haystack = templateHaystack(template);
  return accepted.some((alias) => haystack.includes(subcategoryKey(alias)));
}

export function countTemplatesInCategory(templates = [], categoryId = "") {
  return templates.filter((tpl) =>
    templateMatchesPaletteCategory(tpl, categoryId)
  ).length;
}

export function filterTemplatesByCategorySubcategory(
  templates = [],
  categoryId = "",
  subcategoryName = ""
) {
  const inCategory = templates.filter((tpl) =>
    templateMatchesPaletteCategory(tpl, categoryId)
  );
  if (!subcategoryName) return inCategory;
  const matched = inCategory.filter((tpl) =>
    templateMatchesPaletteSubcategory(tpl, categoryId, subcategoryName)
  );
  return matched.length ? matched : inCategory;
}
