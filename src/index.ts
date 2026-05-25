export { detectProject, detectSource, detectLayout, detectStatamic } from './detect.js';
export { createPlan, describePlan } from './plan.js';
export { generateFavicons, createFaviconSettings } from './generate.js';
export { renderAntlersPartial, renderData, partialReference } from './render.js';
export { injectIntoHead, injectPartial } from './inject.js';
export type {
  GenerateOptions,
  GenerateResult,
  GeneratedMarkup,
  GenerationPlan,
  ProjectDetection,
  UserConfig,
} from './types.js';
