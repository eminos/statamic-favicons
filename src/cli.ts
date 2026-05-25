#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import {
  cancel,
  confirm,
  intro,
  isCancel,
  note,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';
import { loadConfig } from './config.js';
import { colorSwatch } from './color.js';
import { detectProject } from './detect.js';
import { generateFavicons } from './generate.js';
import { injectPartial } from './inject.js';
import { normalizePublicPath, toAbsolute, toRelative } from './paths.js';
import { createPlan, describePlan } from './plan.js';
import { renderSourcePreview, shouldUseItermPreview } from './preview.js';
import { partialReference, renderAntlersPartial } from './render.js';
import type { GenerateOptions, ProjectDetection, ThemeColor, UserConfig } from './types.js';

const program = new Command();

program
  .name('statamic-favicons')
  .description('Generate modern favicons for Statamic sites from a single source image.')
  .version('1.0.0');

program
  .command('generate')
  .description('Open the Statamic favicon generator wizard')
  .option('--cwd <path>', 'Project directory', process.cwd())
  .action(async (rawOptions: { cwd: string }) => {
    try {
      await runGenerate(rawOptions);
    } catch (error) {
      cancel(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  });

program
  .command('doctor')
  .description('Print terminal image preview diagnostics')
  .action(() => {
    runDoctor();
  });

program.parse();

function runDoctor(): void {
  const env = process.env;
  const lines = [
    `stdout TTY: ${String(process.stdout.isTTY)}`,
    `columns: ${process.stdout.columns ?? 'unknown'}`,
    `rows: ${process.stdout.rows ?? 'unknown'}`,
    `TERM: ${env.TERM ?? 'not set'}`,
    `TERM_PROGRAM: ${env.TERM_PROGRAM ?? 'not set'}`,
    `TERM_PROGRAM_VERSION: ${env.TERM_PROGRAM_VERSION ?? 'not set'}`,
    `COLORTERM: ${env.COLORTERM ?? 'not set'}`,
    `WT_SESSION: ${env.WT_SESSION ? 'set' : 'not set'}`,
    `WSL_DISTRO_NAME: ${env.WSL_DISTRO_NAME ?? 'not set'}`,
    `VSCODE_INJECTION: ${env.VSCODE_INJECTION ? 'set' : 'not set'}`,
    `STATAMIC_FAVICONS_NATIVE_PREVIEW: ${env.STATAMIC_FAVICONS_NATIVE_PREVIEW ?? 'auto'}`,
    `VS Code iTerm preview path: ${shouldUseItermPreview() ? 'enabled' : 'disabled'}`,
  ];

  console.log(lines.join('\n'));
}

async function runGenerate(rawOptions: { cwd: string }): Promise<void> {
  const cwd = path.resolve(rawOptions.cwd);
  const config = await loadConfig(cwd);
  const detection = await detectProject(cwd);

  intro('Statamic Favicons');

  if (!detection.isStatamic) {
    cancel('No Statamic project detected. Run this inside a project with statamic/cms in composer.json.');
    process.exitCode = 1;
    return;
  }

  note([
    `Project: ${cwd}`,
    `Sources found: ${detection.sources.length}`,
    `Layouts found: ${detection.layouts.length}`,
    `Theme colors found: ${detection.themeColors.length}`,
    `App name: ${detection.appName ?? 'not found'}`,
  ].join('\n'), 'Detected');

  const options = await promptForOptions(cwd, detection, config);
  const plan = createPlan(detection, config, options);

  note([
    ...describePlan(plan),
    ...(plan.partial ? [`Include partial: ${partialReference(plan.partial)}`] : []),
  ].join('\n'), 'Plan');

  const shouldGenerate = await promptConfirm(
    plan.writePartial ? 'Generate favicon assets and partial?' : 'Generate favicon assets and show markup snippet?',
    true,
  );

  if (!shouldGenerate) {
    cancel('Cancelled.');
    return;
  }

  const s = spinner();
  s.start('Generating favicon package');
  const result = await generateFavicons(plan);
  s.stop('Generated favicon package');

  if (options.inject && options.layout && plan.partial) {
    const injected = await injectPartial(plan);
    note(
      injected.changed
        ? `Injected ${injected.reference} into ${injected.layout}`
        : `${injected.layout} already includes ${injected.reference}`,
      'Layout',
    );
  } else if (plan.partial && detection.layouts.length > 0) {
    note(`Add this to your layout:\n${partialReference(plan.partial)}`, 'Next');
  } else if (!plan.writePartial) {
    note(renderAntlersPartial(result.markup, plan), 'Markup Snippet');
  }

  note([
    ...result.files,
    result.partial,
    result.data,
  ].filter(Boolean).join('\n'), 'Generated');

  outro('Done.');
}

async function promptForOptions(
  cwd: string,
  detection: ProjectDetection,
  config: UserConfig,
): Promise<GenerateOptions> {
  const source = await promptSource(cwd, detection.sources, config.source);
  const outDir = await promptText('Assets output directory', config.outDir ?? 'public/assets/favicons');

  if (isInsidePath(toAbsolute(cwd, source), toAbsolute(cwd, outDir))) {
    note([
      `Source: ${source}`,
      `Output directory: ${outDir}`,
      'The generator writes files into this folder, so this source may be overwritten.',
    ].join('\n'), 'Input Is Inside Output');

    const overwriteInput = await promptConfirm('Continue even though generation may overwrite the selected source file?', false);

    if (!overwriteInput) {
      cancel('Cancelled.');
      process.exit(0);
    }
  }

  const partial = await promptPartial(detection.partial ?? 'resources/views/partials/favicons.antlers.html');
  const writePartial = partial !== undefined;
  const publicPath = normalizePublicPath(await promptText('Public path for generated tags', config.publicPath ?? '/assets/favicons/'));
  const appName = await promptText('Website name (used in the web manifest, defaults to APP_NAME from .env)', config.appName ?? detection.appName ?? 'Statamic Site');
  const shortName = await promptText('Short website name (used under app icons when the site is saved to a home screen)', config.shortName ?? appName);
  const themeColor = await promptColor(
    'Browser theme color (used for <meta name="theme-color"> and supported browser UI)',
    config.themeColor ?? '#ffffff',
    detection.themeColors,
  );
  const backgroundColor = await promptColor(
    'Manifest background color (used by installed/PWA launch screens behind the icon)',
    config.backgroundColor ?? themeColor,
    detection.themeColors,
  );
  const iconBackgroundColor = await promptColor(
    'Icon background color (used behind transparent source icons when generating platform icons)',
    config.iconBackgroundColor ?? 'transparent',
    detection.themeColors,
    { includeTransparent: true },
  );
  const inject = writePartial
    ? await promptConfirm(`Inject ${partialReference(partial)} into a layout file?`, false)
    : false;
  const layout = inject
    ? await promptLayout(cwd, detection.layouts, config.layout)
    : undefined;

  return {
    cwd,
    source,
    partial,
    writePartial,
    layout,
    outDir,
    publicPath,
    appName,
    shortName,
    themeColor,
    backgroundColor,
    iconBackgroundColor,
    iconBackgroundRadius: config.iconBackgroundRadius ?? 0,
    iconScale: config.iconScale ?? 1,
    skipMetadataInjection: config.skipMetadataInjection ?? true,
    inject,
  };
}

async function promptSource(
  cwd: string,
  sources: string[],
  configuredSource?: string,
): Promise<string> {
  const options = configuredSource ? unique([configuredSource, ...sources]) : sources;
  const customSource = '__custom_source__';

  while (true) {
    const source = options.length === 0
      ? await promptCustomSource(cwd)
      : await promptSourceSelect(cwd, options, customSource);

    const preview = await renderSourcePreview(cwd, source);

    if (preview) {
      if (preview.renderer === 'iterm') {
        console.log(`\n${source}`);
        process.stdout.write(`${preview.output}\n`);
      } else {
        note(preview.output, source);
      }
    }

    const confirmed = await promptConfirm(`Use ${source}?`, true);

    if (confirmed) {
      return source;
    }
  }
}

async function promptSourceSelect(cwd: string, options: string[], customSource: string): Promise<string> {
  const answer = await select({
    message: 'Select source favicon',
    options: [
      ...options.map((value) => ({ value, label: value })),
      {
        value: customSource,
        label: 'Provide path yourself',
        hint: 'Use an SVG, PNG, JPG, or WebP file',
      },
    ],
  });

  const value = unwrap(answer);

  if (value === customSource) {
    return promptCustomSource(cwd);
  }

  return value;
}

async function promptCustomSource(cwd: string): Promise<string> {
  const answer = await text({
    message: 'Source favicon path',
    placeholder: 'resources/images/favicon.svg',
    validate(value) {
      const source = value?.trim() ?? '';

      if (source.length === 0) {
        return 'Enter a source favicon path.';
      }

      if (!isSourceImagePath(source)) {
        return 'Use an SVG, PNG, JPG, JPEG, or WebP source image.';
      }

      return undefined;
    },
  });

  const source = unwrap(answer).trim();
  const absolute = toAbsolute(cwd, source);

  try {
    const stat = await fs.stat(absolute);

    if (!stat.isFile()) {
      throw new Error('not a file');
    }
  } catch {
    cancel(`Source favicon not found: ${source}`);
    process.exitCode = 1;
    process.exit(1);
  }

  return path.isAbsolute(source) ? toRelative(cwd, absolute) : source;
}

async function promptPartial(defaultPartial: string): Promise<string | undefined> {
  const rootPartial = 'resources/views/_favicons.antlers.html';
  const folderPartial = 'resources/views/partials/favicons.antlers.html';
  const choices = unique([
    defaultPartial,
    defaultPartial === rootPartial ? folderPartial : rootPartial,
  ]);

  const customPartial = '__custom_partial__';
  const noPartial = '__no_partial__';
  const answer = await select({
    message: 'Where should the Antlers partial be written?',
    options: [
      ...choices.map((value) => ({ value, label: value })),
      {
        value: customPartial,
        label: 'Provide a path myself',
        hint: 'Type a custom Antlers partial path',
      },
      {
        value: noPartial,
        label: 'No partial, show snippet',
        hint: 'Print markup to paste into a layout yourself',
      },
    ],
  });

  const value = unwrap(answer);

  if (value === noPartial) {
    return undefined;
  }

  if (value === customPartial) {
    return promptPartialPath();
  }

  return value;
}

async function promptPartialPath(): Promise<string> {
  const answer = await text({
    message: 'Antlers partial path',
    initialValue: 'resources/views/partials/favicons.antlers.html',
    validate(value) {
      const partial = value?.trim() ?? '';

      if (partial.length === 0) {
        return 'Enter an Antlers partial path.';
      }

      if (!partial.endsWith('.antlers.html')) {
        return 'Use an .antlers.html file.';
      }

      return undefined;
    },
  });

  return unwrap(answer).trim();
}

async function promptLayout(cwd: string, layouts: string[], configuredLayout?: string): Promise<string | undefined> {
  const choices = configuredLayout ? unique([configuredLayout, ...layouts]) : layouts;
  const customLayout = '__custom_layout__';

  const answer = await select({
    message: 'Select layout for optional injection',
    options: [
      ...choices.map((value) => ({ value, label: value })),
      {
        value: customLayout,
        label: 'Provide a path myself',
        hint: 'Type a custom layout path',
      },
    ],
  });

  const value = unwrap(answer);

  if (value === customLayout) {
    return promptLayoutPath(cwd);
  }

  return value;
}

async function promptLayoutPath(cwd: string): Promise<string> {
  const answer = await text({
    message: 'Layout file path',
    initialValue: 'resources/views/layout.antlers.html',
    validate(value) {
      const layout = value?.trim() ?? '';

      if (layout.length === 0) {
        return 'Enter a layout file path.';
      }

      if (!layout.endsWith('.antlers.html')) {
        return 'Use an .antlers.html layout file.';
      }

      return undefined;
    },
  });

  const layout = unwrap(answer).trim();

  try {
    const stat = await fs.stat(toAbsolute(cwd, layout));

    if (!stat.isFile()) {
      throw new Error('not a file');
    }
  } catch {
    cancel(`Layout file not found: ${layout}`);
    process.exitCode = 1;
    process.exit(1);
  }

  return layout;
}

async function promptSelect(message: string, options: string[]): Promise<string> {
  const answer = await select({
    message,
    options: options.map((value) => ({ value, label: value })),
  });

  return unwrap(answer);
}

async function promptText(message: string, initialValue: string): Promise<string> {
  const answer = await text({
    message,
    initialValue,
    validate(value) {
      return value?.trim().length === 0 ? 'Enter a value.' : undefined;
    },
  });

  return unwrap(answer).trim();
}

async function promptColor(
  message: string,
  initialValue: string,
  themeColors: ThemeColor[] = [],
  options: { includeTransparent?: boolean } = {},
): Promise<string> {
  const colorChoices = uniqueThemeColors([
    ...(options.includeTransparent ? [{ name: 'transparent', value: 'transparent', source: 'keep source image transparency' }] : []),
    ...themeColors,
    { name: 'current value', value: initialValue, source: 'default' },
  ]);

  if (colorChoices.length > 1) {
    const selected = await select({
      message,
      options: [
        ...colorChoices.map((color) => ({
          value: color.value,
          label: `${colorSwatch(color.value)} ${color.name}: ${color.value}`,
          hint: color.source,
        })),
        {
          value: '__custom__',
          label: 'Custom color',
          hint: 'Type a CSS color manually',
        },
      ],
    });

    const value = unwrap(selected);

    if (value !== '__custom__') {
      return value;
    }
  }

  const answer = await text({
    message,
    initialValue,
    validate(value) {
      return isCssColor(value?.trim() ?? '') ? undefined : 'Use a CSS color, for example #ffffff or rgb(255, 163, 127).';
    },
  });

  return unwrap(answer).trim();
}

async function promptConfirm(message: string, initialValue: boolean): Promise<boolean> {
  const answer = await confirm({ message, initialValue });
  return unwrap(answer);
}

function unwrap<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Cancelled.');
    process.exit(0);
  }

  return value as T;
}

function isCssColor(value: string): boolean {
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value)
    || /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(value)
    || /^hsl\([^)]+\)$/i.test(value)
    || /^oklch\([^)]+\)$/i.test(value)
    || value === 'transparent'
    || /^[a-z]+$/i.test(value);
}

function isInsidePath(file: string, directory: string): boolean {
  const relative = path.relative(directory, file);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isSourceImagePath(value: string): boolean {
  return /\.(svg|png|jpe?g|webp)$/i.test(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function uniqueThemeColors(colors: ThemeColor[]): ThemeColor[] {
  const seen = new Set<string>();
  const uniqueColors: ThemeColor[] = [];

  for (const color of colors) {
    const key = `${color.name}:${color.value}`;

    if (!seen.has(key)) {
      seen.add(key);
      uniqueColors.push(color);
    }
  }

  return uniqueColors;
}
