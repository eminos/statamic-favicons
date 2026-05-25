import fs from 'node:fs/promises';
import fg from 'fast-glob';
import type { ProjectDetection } from './types.js';
import { toAbsolute, toRelative } from './paths.js';
import { detectThemeColors } from './theme-colors.js';

const sourceCandidates = [
  'resources/images/favicon.svg',
  'resources/images/favicon.png',
  'resources/assets/favicon.svg',
  'resources/assets/favicon.png',
  'resources/svg/favicon.svg',
  'public/favicon.svg',
  'public/favicon.png',
  'public/assets/favicons/favicon.svg',
  'public/assets/favicons/favicon.png',
];

const layoutCandidates = [
  'resources/views/layout.antlers.html',
  'resources/views/layouts/default.antlers.html',
  'resources/views/layouts/app.antlers.html',
  'resources/views/layouts/base.antlers.html',
];

async function exists(file: string): Promise<boolean> {
  try {
    const stat = await fs.stat(file);
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function detectProject(cwd: string): Promise<ProjectDetection> {
  const [sources, partial, layouts, appName, isStatamic, themeColors] = await Promise.all([
    detectSources(cwd),
    detectPartial(cwd),
    detectLayouts(cwd),
    detectEnvAppName(cwd),
    detectStatamic(cwd),
    detectThemeColors(cwd),
  ]);

  return {
    cwd,
    sources,
    source: sources[0],
    partial,
    layouts,
    themeColors,
    layout: layouts[0],
    appName,
    isStatamic,
  };
}

export async function detectSource(cwd: string): Promise<string | undefined> {
  return (await detectSources(cwd))[0];
}

export async function detectSources(cwd: string): Promise<string[]> {
  const matches: string[] = [];

  for (const candidate of sourceCandidates) {
    if (await exists(toAbsolute(cwd, candidate))) {
      matches.push(candidate);
    }
  }

  const fallbackMatches = await fg([
    'resources/**/favicon.{svg,png,jpg,jpeg,webp}',
    'public/**/favicon.{svg,png,jpg,jpeg,webp}',
  ], {
    cwd,
    onlyFiles: true,
    ignore: [
      '**/node_modules/**',
      '**/vendor/**',
      'public/build/**',
    ],
  });

  return unique([...matches, ...fallbackMatches]);
}

export async function detectLayout(cwd: string): Promise<string | undefined> {
  return (await detectLayouts(cwd))[0];
}

export async function detectLayouts(cwd: string): Promise<string[]> {
  const matches: string[] = [];

  for (const candidate of layoutCandidates) {
    if (await exists(toAbsolute(cwd, candidate))) {
      matches.push(candidate);
    }
  }

  const fallbackMatches = await fg([
    'resources/views/**/layout.antlers.html',
    'resources/views/layouts/**/*.antlers.html',
  ], {
    cwd,
    onlyFiles: true,
    ignore: [
      'resources/views/_*.antlers.html',
      'resources/views/partials/**',
      'resources/views/components/**',
    ],
  });

  return unique([...matches, ...fallbackMatches]);
}

export async function detectPartial(cwd: string): Promise<string> {
  const rootUnderscorePartials = await fg('resources/views/_*.antlers.html', {
    cwd,
    onlyFiles: true,
  });

  return rootUnderscorePartials.length > 0
    ? 'resources/views/_favicons.antlers.html'
    : 'resources/views/partials/favicons.antlers.html';
}

export async function detectEnvAppName(cwd: string): Promise<string | undefined> {
  const envPath = toAbsolute(cwd, '.env');

  if (!await exists(envPath)) {
    return undefined;
  }

  const contents = await fs.readFile(envPath, 'utf8');
  const match = contents.match(/^APP_NAME=(.*)$/m);

  if (!match) {
    return undefined;
  }

  return parseEnvValue(match[1]);
}

export async function detectStatamic(cwd: string): Promise<boolean> {
  const composerPath = toAbsolute(cwd, 'composer.json');

  if (!await exists(composerPath)) {
    return false;
  }

  try {
    const composer = JSON.parse(await fs.readFile(composerPath, 'utf8')) as {
      require?: Record<string, string>;
      ['require-dev']?: Record<string, string>;
    };

    return Boolean(composer.require?.['statamic/cms'] || composer['require-dev']?.['statamic/cms']);
  } catch {
    return false;
  }
}

export function describeDetection(detection: ProjectDetection): string[] {
  const lines = [`Project: ${detection.cwd}`];
  lines.push(`Statamic: ${detection.isStatamic ? 'yes' : 'not detected'}`);
  lines.push(`Sources: ${detection.sources.length > 0 ? detection.sources.join(', ') : 'not found'}`);
  lines.push(`Partial: ${detection.partial ?? 'not found'}`);
  lines.push(`Layouts: ${detection.layouts.length > 0 ? detection.layouts.join(', ') : 'not found'}`);
  lines.push(`Theme colors: ${detection.themeColors.length > 0 ? detection.themeColors.map((color) => `${color.name} ${color.value}`).join(', ') : 'not found'}`);
  lines.push(`App name: ${detection.appName ?? 'not found'}`);
  return lines;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function parseEnvValue(value: string): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const unquoted = ((trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'")))
    ? trimmed.slice(1, -1)
    : trimmed;

  return unquoted.replaceAll('\\n', '\n').trim() || undefined;
}
