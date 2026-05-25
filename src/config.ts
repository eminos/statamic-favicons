import fs from 'node:fs/promises';
import path from 'node:path';
import type { UserConfig } from './types.js';

const configFiles = [
  'statamic-favicons.config.mjs',
  'statamic-favicons.config.js',
  'statamic-favicons.config.json',
  'favicon.config.mjs',
  'favicon.config.js',
  'favicon.config.json',
];

async function exists(file: string): Promise<boolean> {
  try {
    const stat = await fs.stat(file);
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function loadConfig(cwd: string): Promise<UserConfig> {
  for (const file of configFiles) {
    const absolute = path.resolve(cwd, file);

    if (!await exists(absolute)) {
      continue;
    }

    if (file.endsWith('.json')) {
      return JSON.parse(await fs.readFile(absolute, 'utf8')) as UserConfig;
    }

    const imported = await import(`${absolute}?t=${Date.now()}`) as { default?: UserConfig };
    return imported.default ?? {};
  }

  return {};
}
