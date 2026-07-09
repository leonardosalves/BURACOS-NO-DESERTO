export {
  DEFAULT_TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_STORAGE_KEY,
  countTemplatesInCategory,
  filterTemplatesByCategorySubcategory,
  loadTemplateCategoryCatalog,
  mergeCategoryCatalog,
  readStoredTemplateCategories,
  subcategoryExists,
  subcategoryKey,
  syncCategoriesFromTemplates,
  templateMatchesPaletteCategory,
  templateMatchesPaletteSubcategory,
} from "@lumiera/shared/remotionTemplateStudioCategories.js";

export type TemplateCategoryDefinition = {
  id: string;
  label: string;
  subcategories: string[];
};
