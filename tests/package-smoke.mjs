import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { generateFavicons } from '../dist/index.js';

for (const format of ['svg', 'png']) {
  test(`built package generates favicons from ${format.toUpperCase()}`, async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'statamic-favicons-package-'));
    try {
      const artwork = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ff6633"/></svg>');
      const source = `favicon.${format}`;
      await fs.writeFile(path.join(cwd, source), format === 'svg' ? artwork : await sharp(artwork).png().toBuffer());
      const plan = {
        cwd,
        source,
        outDir: 'public/assets/favicons',
        publicPath: '/assets/favicons/',
        partial: 'resources/views/partials/favicons.antlers.html',
        writePartial: true,
        data: 'resources/favicons.json',
        appName: 'Test',
        shortName: 'Test',
        themeColor: '#ffffff',
        backgroundColor: '#ffffff',
        iconBackgroundColor: 'transparent',
        iconBackgroundRadius: 0,
        iconScale: 1,
        skipMetadataInjection: true,
      };

      const result = await generateFavicons(plan);

      for (const name of ['favicon.ico', 'favicon.svg', 'favicon-96x96.png', 'apple-touch-icon.png', 'site.webmanifest']) {
        assert.ok(result.files.includes(`${plan.outDir}/${name}`));
        assert.ok((await fs.stat(path.join(cwd, plan.outDir, name))).size > 0);
      }
      assert.equal((await sharp(path.join(cwd, plan.outDir, 'favicon-96x96.png')).metadata()).width, 96);
      assert.ok((await fs.readFile(path.join(cwd, plan.partial), 'utf8')).includes(plan.publicPath));
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(cwd, plan.data), 'utf8')).assets, result.files);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });
}
