/**
 * Barrel file for scriptQuality module.
 * Re-exports everything from the modular sub-files under backend/scriptQuality/
 * to maintain backward compatibility with zero breaking changes.
 */

export * from "./scriptQuality/index.js";
export { VISUAL_PROMPT_SPECIFICITY_RULES } from "./scenePromptSpecificity.js";
