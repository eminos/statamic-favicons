import type { GeneratedMarkup, GenerationPlan } from './types.js';

export function renderAntlersPartial(markup: GeneratedMarkup, plan?: GenerationPlan): string {
  const markups = [...markup.markups];

  if (plan && !markups.some((line) => /<meta\s+name=["']theme-color["']/i.test(line))) {
    markups.push(`<meta name="theme-color" content="${escapeHtmlAttribute(plan.themeColor)}">`);
  }

  return `${markups.join('\n')}\n`;
}

export function renderData(plan: GenerationPlan, markup: GeneratedMarkup, files: string[]): string {
  return `${JSON.stringify({
    generatedBy: 'statamic-favicons',
    source: plan.source,
    assets: files,
    publicPath: plan.publicPath,
    markup: markup.markups,
    cssSelectors: markup.cssSelectors,
  }, null, 2)}\n`;
}

export function partialReference(partialPath: string): string {
  const normalized = partialPath
    .replace(/^resources\/views\//, '')
    .replace(/\.antlers\.html$/, '')
    .replace(/\.html$/, '')
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.replace(/^_/, ''))
    .join('/');

  return `{{ partial:${normalized} }}`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
