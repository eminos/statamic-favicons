import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import termImg from 'term-img';
import terminalImage from 'terminal-image';
import { toAbsolute } from './paths.js';

const rasterExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const previewOptions = {
  width: 32,
  height: 16,
  preserveAspectRatio: true,
  preferNativeRender: false,
};

export type SourcePreview = {
  output: string;
  renderer: 'ansi' | 'iterm';
};

export async function renderSourcePreview(cwd: string, source: string): Promise<SourcePreview | undefined> {
  const extension = path.extname(source).toLowerCase();

  if (extension === '.svg') {
    return renderSvgPreview(cwd, source);
  }

  if (!rasterExtensions.has(extension)) {
    return undefined;
  }

  try {
    return renderPreviewFile(toAbsolute(cwd, source));
  } catch {
    return undefined;
  }
}

async function renderSvgPreview(cwd: string, source: string): Promise<SourcePreview | undefined> {
  const sourcePath = toAbsolute(cwd, source);
  const previewDir = await fs.mkdtemp(path.join(os.tmpdir(), 'statamic-favicons-preview-'));
  const previewPath = path.join(previewDir, 'preview.png');

  try {
    await sharp(sourcePath)
      .resize({
        width: 256,
        height: 256,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toFile(previewPath);

    return await renderPreviewFile(previewPath);
  } catch {
    return undefined;
  } finally {
    await fs.rm(previewDir, { recursive: true, force: true });
  }
}

async function renderPreviewFile(filePath: string): Promise<SourcePreview> {
  if (shouldUseItermPreview()) {
    try {
      const output = termImg(filePath, {
        width: 32,
        height: 16,
        preserveAspectRatio: true,
        fallback: () => '',
      });

      if (!output) {
        throw new Error('Native image preview returned no output.');
      }

      return {
        output,
        renderer: 'iterm',
      };
    } catch {
      // Fall through to ANSI below.
    }
  }

  return {
    output: await terminalImage.file(filePath, previewOptions),
    renderer: 'ansi',
  };
}

export function shouldUseItermPreview(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.STATAMIC_FAVICONS_NATIVE_PREVIEW === '0') {
    return false;
  }

  if (env.STATAMIC_FAVICONS_NATIVE_PREVIEW === '1') {
    return true;
  }

  return env.TERM_PROGRAM === 'vscode' && versionAtLeast(env.TERM_PROGRAM_VERSION, '1.80.0');
}

function versionAtLeast(actual: string | undefined, minimum: string): boolean {
  if (!actual) {
    return false;
  }

  const actualParts = actual.split('.').map((part) => Number.parseInt(part, 10));
  const minimumParts = minimum.split('.').map((part) => Number.parseInt(part, 10));

  for (let index = 0; index < minimumParts.length; index += 1) {
    const actualPart = Number.isNaN(actualParts[index]) ? 0 : actualParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;

    if (actualPart > minimumPart) {
      return true;
    }

    if (actualPart < minimumPart) {
      return false;
    }
  }

  return true;
}
