import { IconTransformationType } from '@realfavicongenerator/generate-favicon';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { createFaviconSettings, renderIcoFrame } from '../src/generate.js';
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
