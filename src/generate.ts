import fs from 'node:fs/promises';
import path from 'node:path';
import {
  IconTransformationType,
  generateFaviconFiles,
  generateFaviconHtml,
  initFaviconIconSettings,
  type FaviconSettings,
  type MasterIcon,
} from '@realfavicongenerator/generate-favicon';
import { getNodeImageAdapter, loadAndConvertToSvg } from '@realfavicongenerator/image-adapter-node';
import sharp from 'sharp';
import type { GenerateResult, GeneratedMarkup, GenerationPlan } from './types.js';
import { renderAntlersPartial, renderData } from './render.js';
import { toAbsolute } from './paths.js';

export async function generateFavicons(plan: GenerationPlan): Promise<GenerateResult> {
  const imageAdapter = await getNodeImageAdapter();
  const masterIcon: MasterIcon = {
    icon: await loadAndConvertToSvg(toAbsolute(plan.cwd, plan.source)),
  };
  const settings = createFaviconSettings(plan);
  const outDir = toAbsolute(plan.cwd, plan.outDir);

  await fs.mkdir(outDir, { recursive: true });

  const files = await generateFaviconFiles(masterIcon, settings, imageAdapter);
  const writtenFiles: string[] = [];

  for (const [fileName, file] of Object.entries(files)) {
    const filePath = path.join(outDir, fileName);
    const contents = fileName === 'favicon.ico'
      ? await createIcoFile(plan)
      : await toBuffer(file);

    await fs.writeFile(filePath, contents);
    writtenFiles.push(path.posix.join(plan.outDir.replaceAll(path.sep, '/'), fileName));
  }

  const markup = generateFaviconHtml(settings) as GeneratedMarkup;

  if (plan.writePartial && plan.partial) {
    await writeTextFile(plan.cwd, plan.partial, renderAntlersPartial(markup, plan));
  }

  await writeTextFile(plan.cwd, plan.data, renderData(plan, markup, writtenFiles));

  return {
    files: writtenFiles,
    partial: plan.writePartial ? plan.partial : undefined,
    data: plan.data,
    markup,
  };
}

async function createIcoFile(plan: GenerationPlan): Promise<Buffer> {
  const source = toAbsolute(plan.cwd, plan.source);
  const sizes = [48, 32, 16];
  const frames = await Promise.all(sizes.map((size) => renderIcoFrame(source, size)));
  const directorySize = 6 + frames.length * 16;
  let offset = directorySize;
  const header = Buffer.alloc(directorySize);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);

  frames.forEach((frame, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(sizes[index], entry);
    header.writeUInt8(sizes[index], entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });

  return Buffer.concat([header, ...frames]);
}

export async function renderIcoFrame(source: string, size: number): Promise<Buffer> {
  const artwork = await sharp(source)
    .resize({
      width: size,
      height: size,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
  const metadata = await sharp(artwork).metadata();
  const left = Math.floor((size - (metadata.width ?? size)) / 2);
  const top = Math.floor((size - (metadata.height ?? size)) / 2);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: artwork, left, top }])
    .png()
    .toBuffer();
}

export function createFaviconSettings(plan: GenerationPlan): FaviconSettings {
  const icon = initFaviconIconSettings();
  const transparentBackground = 'rgba(255, 255, 255, 0)';
  const transformation = {
    type: IconTransformationType.Background,
    backgroundColor: plan.iconBackgroundColor === 'transparent'
      ? transparentBackground
      : plan.iconBackgroundColor,
    backgroundRadius: plan.iconBackgroundRadius,
    imageScale: plan.iconScale,
    brightness: 1,
  } as const;

  icon.desktop.regularIconTransformation = transformation;
  icon.desktop.darkIconTransformation = transformation;
  icon.touch.transformation = transformation;
  icon.touch.appTitle = plan.appName;
  icon.webAppManifest.transformation = transformation;
  icon.webAppManifest.name = plan.appName;
  icon.webAppManifest.shortName = plan.shortName;
  icon.webAppManifest.themeColor = plan.themeColor;
  icon.webAppManifest.backgroundColor = plan.backgroundColor;

  return {
    icon,
    path: plan.publicPath,
    skipMetadataInjection: plan.skipMetadataInjection,
  };
}

async function writeTextFile(cwd: string, relativePath: string, contents: string): Promise<void> {
  const absolute = toAbsolute(cwd, relativePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, contents, 'utf8');
}

async function toBuffer(data: string | Buffer | Blob): Promise<Uint8Array | string> {
  if (typeof data === 'string') {
    return data;
  }

  if (data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }

  return data;
}
