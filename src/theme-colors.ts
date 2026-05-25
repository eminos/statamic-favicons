import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { toAbsolute } from './paths.js';
import type { ThemeColor } from './types.js';

const cssColorPattern = /--color-([a-z0-9-_]+)\s*:\s*([^;]+);/gi;
const jsColorPattern = /['"]?([a-z0-9-_]+)['"]?\s*:\s*['"](#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgb\([^)]+\)|hsl\([^)]+\)|oklch\([^)]+\))['"]/gi;

export async function detectThemeColors(cwd: string): Promise<ThemeColor[]> {
  const files = await fg([
    'resources/css/**/*.css',
    'resources/**/*.css',
    'tailwind.config.{js,cjs,mjs,ts}',
    'vite.config.{js,ts,mjs}',
  ], {
    cwd,
    onlyFiles: true,
    ignore: [
      '**/node_modules/**',
      '**/vendor/**',
      'public/build/**',
    ],
  });

  const colors: ThemeColor[] = [];

  for (const file of files) {
    const contents = await fs.readFile(toAbsolute(cwd, file), 'utf8');

    if (file.endsWith('.css')) {
      colors.push(...parseCssThemeColors(contents, file));
    } else {
      colors.push(...parseJsThemeColors(contents, file));
    }
  }

  return uniqueThemeColors(colors);
}

export function parseCssThemeColors(contents: string, source: string): ThemeColor[] {
  const colors: ThemeColor[] = [];

  for (const match of contents.matchAll(cssColorPattern)) {
    const name = match[1].replaceAll('_', '-');
    const value = normalizeCssColor(match[2]);

    if (value) {
      colors.push({ name, value, source });
    }
  }

  return colors;
}

export function parseJsThemeColors(contents: string, source: string): ThemeColor[] {
  const themeSection = extractThemeSection(contents) ?? contents;
  const colors: ThemeColor[] = [];

  for (const match of themeSection.matchAll(jsColorPattern)) {
    const name = match[1].replaceAll('_', '-');
    const value = normalizeCssColor(match[2]);

    if (value && !['content', 'font', 'font-family'].includes(name)) {
      colors.push({ name, value, source });
    }
  }

  return colors;
}

function extractThemeSection(contents: string): string | undefined {
  const themeIndex = contents.search(/\btheme\s*:/);

  if (themeIndex === -1) {
    return undefined;
  }

  const openingBrace = contents.indexOf('{', themeIndex);

  if (openingBrace === -1) {
    return undefined;
  }

  let depth = 0;

  for (let index = openingBrace; index < contents.length; index += 1) {
    const char = contents[index];

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    }

    if (depth === 0) {
      return contents.slice(openingBrace, index + 1);
    }
  }

  return undefined;
}

function normalizeCssColor(value: string): string | undefined {
  const trimmed = value.trim();

  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)
    || /^rgb\([^)]+\)$/i.test(trimmed)
    || /^hsl\([^)]+\)$/i.test(trimmed)
    || /^oklch\([^)]+\)$/i.test(trimmed)) {
    return trimmed;
  }

  return undefined;
}

function uniqueThemeColors(colors: ThemeColor[]): ThemeColor[] {
  const seen = new Set<string>();
  const unique: ThemeColor[] = [];

  for (const color of colors) {
    const key = `${color.name}:${color.value}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push({
        ...color,
        source: path.posix.normalize(color.source),
      });
    }
  }

  return unique;
}
