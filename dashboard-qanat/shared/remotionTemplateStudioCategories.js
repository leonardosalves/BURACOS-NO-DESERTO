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

export function countTemplatesInCategory(templates = [], categoryId = "") {
  return templates.filter((tpl) => tpl.category === categoryId).length;
}

export function filterTemplatesByCategorySubcategory(
  templates = [],
  categoryId = "",
  subcategoryName = ""
) {
  const inCategory = templates.filter((tpl) => tpl.category === categoryId);
  if (!subcategoryName) return inCategory;
  const matched = inCategory.filter(
    (tpl) => tpl.subcategory === subcategoryName
  );
  return matched.length ? matched : inCategory;
}
