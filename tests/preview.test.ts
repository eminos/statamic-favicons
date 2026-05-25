import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderSourcePreview, shouldUseItermPreview } from '../src/preview.js';

let tmp: string;
let nativePreview: string | undefined;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'statamic-favicons-'));
  nativePreview = process.env.STATAMIC_FAVICONS_NATIVE_PREVIEW;
  process.env.STATAMIC_FAVICONS_NATIVE_PREVIEW = '0';
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });

  if (nativePreview === undefined) {
    delete process.env.STATAMIC_FAVICONS_NATIVE_PREVIEW;
  } else {
    process.env.STATAMIC_FAVICONS_NATIVE_PREVIEW = nativePreview;
  }
});

async function write(relative: string, contents: string): Promise<void> {
  const absolute = path.join(tmp, relative);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, contents);
}

describe('renderSourcePreview', () => {
  it('renders SVG sources through a raster preview', async () => {
    await write(
      'resources/images/favicon.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#ff0000"/></svg>',
    );

    const preview = await renderSourcePreview(tmp, 'resources/images/favicon.svg');

    expect(preview?.output).toEqual(expect.any(String));
    expect(preview?.output.length).toBeGreaterThan(0);
    expect(preview?.renderer).toBe('ansi');
  });

  it('enables the iTerm preview path for modern VS Code terminals', () => {
    expect(shouldUseItermPreview({
      TERM_PROGRAM: 'vscode',
      TERM_PROGRAM_VERSION: '1.80.0',
    })).toBe(true);
  });

  it('does not enable the iTerm preview path for older VS Code terminals', () => {
    expect(shouldUseItermPreview({
      TERM_PROGRAM: 'vscode',
      TERM_PROGRAM_VERSION: '1.79.2',
    })).toBe(false);
  });

  it('allows native previews to be disabled explicitly', () => {
    expect(shouldUseItermPreview({
      TERM_PROGRAM: 'vscode',
      TERM_PROGRAM_VERSION: '1.90.0',
      STATAMIC_FAVICONS_NATIVE_PREVIEW: '0',
    })).toBe(false);
  });
});
