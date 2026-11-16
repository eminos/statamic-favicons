import { IconTransformationType } from '@realfavicongenerator/generate-favicon';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFaviconSettings, generateFavicons, renderIcoFrame } from '../src/generate.js';
import type { GenerationPlan } from '../src/types.js';

const basePlan: GenerationPlan = {
  cwd: '/site',
  source: 'resources/images/favicon.svg',
  outDir: 'public/assets/favicons',
  publicPath: '/assets/favicons/',
  partial: 'resources/views/partials/favicons.antlers.html',
  writePartial: true,
  data: 'resources/favicons.json',
  appName: 'Site',
  shortName: 'Site',
  themeColor: '#ffffff',
  backgroundColor: '#ffffff',
  iconBackgroundColor: 'transparent',
  iconBackgroundRadius: 0,
  iconScale: 1,
  skipMetadataInjection: true,
};

describe('generateFavicons', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'statamic-favicons-generation-'));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it.each(['svg', 'png'])('generates a complete favicon package from %s artwork', async (format) => {
    const artwork = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ff6633"/></svg>');
    const source = `favicon.${format}`;
    await fs.writeFile(path.join(tmp, source), format === 'svg' ? artwork : await sharp(artwork).png().toBuffer());
    const plan = { ...basePlan, cwd: tmp, source, partial: 'resources/views/partials/favicons.antlers.html' };

    const result = await generateFavicons(plan);

    for (const name of ['favicon.ico', 'favicon.svg', 'favicon-96x96.png', 'apple-touch-icon.png', 'site.webmanifest']) {
      const relativePath = path.posix.join(plan.outDir, name);
      expect(result.files).toContain(relativePath);
      expect((await fs.stat(path.join(tmp, relativePath))).size).toBeGreaterThan(0);
    }
    await expect(sharp(path.join(tmp, plan.outDir, 'favicon-96x96.png')).metadata())
      .resolves.toMatchObject({ format: 'png', width: 96, height: 96 });
    const manifest = JSON.parse(await fs.readFile(path.join(tmp, plan.outDir, 'site.webmanifest'), 'utf8'));
    expect(manifest).toMatchObject({ name: plan.appName, short_name: plan.shortName });
    const partial = await fs.readFile(path.join(tmp, plan.partial), 'utf8');
    expect(partial).toContain(`${plan.publicPath}favicon.svg`);
    expect(partial).toContain(`${plan.publicPath}site.webmanifest`);
    const data = JSON.parse(await fs.readFile(path.join(tmp, plan.data), 'utf8'));
    expect(data).toMatchObject({ source, publicPath: plan.publicPath, markup: result.markup.markups });
    expect(data.assets).toEqual(result.files);
  });
});

describe('createFaviconSettings', () => {
  it('uses a transparent background transformation for transparent backgrounds', () => {
    const settings = createFaviconSettings(basePlan);

    expect(settings.icon.touch.transformation.type).toBe(IconTransformationType.Background);
    expect(settings.icon.touch.transformation.backgroundColor).toBe('rgba(255, 255, 255, 0)');
    expect(settings.icon.touch.transformation.imageScale).toBe(1);
    expect(settings.icon.webAppManifest.transformation.type).toBe(IconTransformationType.Background);
  });

  it('uses background transformation when an icon background color is selected', () => {
    const settings = createFaviconSettings({
      ...basePlan,
      iconBackgroundColor: '#ff6633',
    });

    expect(settings.icon.touch.transformation.type).toBe(IconTransformationType.Background);
    expect(settings.icon.touch.transformation.backgroundColor).toBe('#ff6633');
  });
});

describe('renderIcoFrame', () => {
  it('contain-fits tall artwork without extra padding', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'statamic-favicons-ico-'));
    const source = path.join(tmp, 'favicon.svg');

    await fs.writeFile(source, [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 141 173">',
      '<rect width="141" height="173" fill="black"/>',
      '</svg>',
    ].join(''));

    const frame = await renderIcoFrame(source, 48);
    const { data, info } = await sharp(frame).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const bounds = alphaBounds(data, info.width, info.height, info.channels);

    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(47);
    expect(bounds.maxX - bounds.minX + 1).toBeGreaterThanOrEqual(39);
  });
});

function alphaBounds(data: Buffer, width: number, height: number, channels: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + channels - 1];
      if (alpha === 0) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return { minX, minY, maxX, maxY };
}
