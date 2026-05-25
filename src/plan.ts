import type { GenerateOptions, GenerationPlan, ProjectDetection, UserConfig } from './types.js';
import { normalizePublicPath } from './paths.js';

export function createPlan(
  detection: ProjectDetection,
  config: UserConfig,
  options: GenerateOptions,
): GenerationPlan {
  const source = options.source ?? config.source ?? detection.source;

  if (!source) {
    throw new Error('Could not find a favicon source in this Statamic project.');
  }

  const publicPath = normalizePublicPath(options.publicPath ?? config.publicPath ?? '/assets/favicons/');
  const appName = options.appName ?? config.appName ?? detection.appName ?? 'Statamic Site';
  const writePartial = options.writePartial ?? true;

  return {
    cwd: options.cwd,
    source,
    outDir: options.outDir ?? config.outDir ?? 'public/assets/favicons',
    publicPath,
    partial: writePartial
      ? options.partial ?? config.partial ?? detection.partial ?? 'resources/views/partials/favicons.antlers.html'
      : undefined,
    writePartial,
    data: options.data ?? config.data ?? 'resources/favicons.json',
    layout: options.layout ?? config.layout ?? detection.layout,
    appName,
    shortName: options.shortName ?? config.shortName ?? appName,
    themeColor: options.themeColor ?? config.themeColor ?? '#ffffff',
    backgroundColor: options.backgroundColor ?? config.backgroundColor ?? '#ffffff',
    iconBackgroundColor: options.iconBackgroundColor ?? config.iconBackgroundColor ?? 'transparent',
    iconBackgroundRadius: options.iconBackgroundRadius ?? config.iconBackgroundRadius ?? 0,
    iconScale: options.iconScale ?? config.iconScale ?? 1,
    skipMetadataInjection: options.skipMetadataInjection ?? config.skipMetadataInjection ?? true,
  };
}

export function describePlan(plan: GenerationPlan): string[] {
  const lines = [
    `Source: ${plan.source}`,
    `Assets: ${plan.outDir}`,
    `Public path: ${plan.publicPath}`,
    `Partial: ${plan.partial ?? 'not written'}`,
    `Data: ${plan.data}`,
    `Layout: ${plan.layout ?? 'not found'}`,
    `App name: ${plan.appName}`,
    `Theme color: ${plan.themeColor}`,
  ];

  return lines;
}
