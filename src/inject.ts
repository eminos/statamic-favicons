import fs from 'node:fs/promises';
import type { GenerationPlan } from './types.js';
import { partialReference } from './render.js';
import { toAbsolute } from './paths.js';

export type InjectResult = {
  changed: boolean;
  layout: string;
  reference: string;
};

export async function injectPartial(plan: GenerationPlan): Promise<InjectResult> {
  if (!plan.layout) {
    throw new Error('No layout file found. Pass --layout or add the partial manually.');
  }

  if (!plan.partial) {
    throw new Error('No partial file configured.');
  }

  const layoutPath = toAbsolute(plan.cwd, plan.layout);
  const reference = partialReference(plan.partial);
  const html = await fs.readFile(layoutPath, 'utf8');

  if (html.includes(reference)) {
    return {
      changed: false,
      layout: plan.layout,
      reference,
    };
  }

  const injected = injectIntoHead(html, reference);
  await fs.writeFile(layoutPath, injected);

  return {
    changed: true,
    layout: plan.layout,
    reference,
  };
}

export function injectIntoHead(html: string, reference: string): string {
  if (html.includes('</head>')) {
    return html.replace('</head>', `    ${reference}\n</head>`);
  }

  if (html.includes('{{ vite')) {
    return html.replace(/(\{\{\s*vite[^}]+}})/, `$1\n    ${reference}`);
  }

  return `${reference}\n${html}`;
}
