import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectEnvAppName,
  detectLayout,
  detectLayouts,
  detectPartial,
  detectProject,
  detectSource,
  detectSources,
} from '../src/detect.js';

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'statamic-favicons-'));
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

async function write(relative: string, contents = ''): Promise<void> {
  const absolute = path.join(tmp, relative);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, contents);
}

describe('detectProject', () => {
  it('finds common Statamic favicon and layout paths', async () => {
    await write('composer.json', JSON.stringify({ require: { 'statamic/cms': '^6.0' } }));
    await write('resources/images/favicon.svg', '<svg />');
    await write('resources/views/layout.antlers.html', '<html></html>');

    await expect(detectProject(tmp)).resolves.toMatchObject({
      sources: ['resources/images/favicon.svg'],
      source: 'resources/images/favicon.svg',
      partial: 'resources/views/partials/favicons.antlers.html',
      layouts: ['resources/views/layout.antlers.html'],
      layout: 'resources/views/layout.antlers.html',
      themeColors: [],
      isStatamic: true,
    });
  });

  it('returns all detected favicon files in priority order', async () => {
    await write('public/favicon.png', 'png');
    await write('resources/images/favicon.svg', '<svg />');
    await write('resources/site/icons/favicon.webp', 'webp');

    await expect(detectSources(tmp)).resolves.toEqual([
      'resources/images/favicon.svg',
      'public/favicon.png',
      'resources/site/icons/favicon.webp',
    ]);
  });

  it('falls back to nested favicon files', async () => {
    await write('resources/site/icons/favicon.svg', '<svg />');

    await expect(detectSource(tmp)).resolves.toBe('resources/site/icons/favicon.svg');
  });

  it('includes default output favicon files as source candidates', async () => {
    await write('public/assets/favicons/favicon.svg', '<svg />');
    await write('resources/images/favicon.png', 'png');

    await expect(detectSources(tmp)).resolves.toEqual([
      'resources/images/favicon.png',
      'public/assets/favicons/favicon.svg',
    ]);
  });

  it('does not treat partials as layout candidates', async () => {
    await write('resources/views/partials/layout.antlers.html', 'partial');
    await write('resources/views/_nav.antlers.html', 'partial');
    await write('resources/views/pages/home.antlers.html', 'page');

    await expect(detectLayout(tmp)).resolves.toBeUndefined();
  });

  it('returns layout candidates in priority order', async () => {
    await write('resources/views/layouts/app.antlers.html', 'app');
    await write('resources/views/pages/layout-special.antlers.html', 'page');
    await write('resources/views/pages/layout.antlers.html', 'nested layout');
    await write('resources/views/pages/home.antlers.html', 'home');

    await expect(detectLayouts(tmp)).resolves.toEqual([
      'resources/views/layouts/app.antlers.html',
      'resources/views/pages/layout.antlers.html',
    ]);
  });

  it('uses root underscore partial convention when it exists', async () => {
    await write('resources/views/_nav.antlers.html', 'partial');

    await expect(detectPartial(tmp)).resolves.toBe('resources/views/_favicons.antlers.html');
  });

  it('detects the app name from .env', async () => {
    await write('.env', 'APP_NAME="Kiwi Site"\n');

    await expect(detectEnvAppName(tmp)).resolves.toBe('Kiwi Site');
  });

  it('detects Tailwind v4 theme colors from CSS', async () => {
    await write('resources/css/site.css', [
      '@import "tailwindcss";',
      '@theme {',
      '  --color-brand: #ff6633;',
      '  --color-muted-surface: oklch(0.97 0.02 88);',
      '}',
    ].join('\n'));

    await expect(detectProject(tmp)).resolves.toMatchObject({
      themeColors: [
        { name: 'brand', value: '#ff6633', source: 'resources/css/site.css' },
        { name: 'muted-surface', value: 'oklch(0.97 0.02 88)', source: 'resources/css/site.css' },
      ],
    });
  });
});
