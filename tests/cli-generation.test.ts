import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { cancel, outro, spinner } from '@clack/prompts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateFavicons } from '../src/generate.js';

const spinners: ReturnType<typeof spinner>[] = [];

vi.mock('@clack/prompts', async (importOriginal) => {
  const prompts = await importOriginal<typeof import('@clack/prompts')>();
  return {
    ...prompts,
    intro: vi.fn(),
    note: vi.fn(),
    outro: vi.fn(),
    cancel: vi.fn(),
    confirm: vi.fn(async (options: { initialValue?: boolean }) => options.initialValue),
    select: vi.fn(async (options: { options: { value: string }[] }) => options.options[0].value),
    text: vi.fn(async (options: { initialValue?: string }) => options.initialValue),
    spinner: () => {
      const instance = prompts.spinner({ output: new PassThrough() });
      spinners.push(instance);
      return instance;
    },
  };
});

vi.mock('../src/generate.js', () => ({ generateFavicons: vi.fn() }));
vi.mock('../src/preview.js', () => ({ renderSourcePreview: vi.fn(), shouldUseItermPreview: vi.fn() }));

describe('CLI generation', () => {
  let tmp: string;
  let previousArgv: string[];
  let previousExitCode: typeof process.exitCode;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'statamic-favicons-cli-'));
    await fs.writeFile(path.join(tmp, 'composer.json'), JSON.stringify({ require: { 'statamic/cms': '^6.0' } }));
    await fs.mkdir(path.join(tmp, 'resources/images'), { recursive: true });
    await fs.writeFile(path.join(tmp, 'resources/images/favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    previousArgv = process.argv;
    previousExitCode = process.exitCode;
    process.argv = ['node', 'statamic-favicons', 'generate', '--cwd', tmp];
    process.exitCode = undefined;
    vi.useFakeTimers();
  });

  afterEach(async () => {
    for (const instance of spinners.splice(0)) {
      instance.clear();
    }
    vi.clearAllTimers();
    vi.useRealTimers();
    process.argv = previousArgv;
    process.exitCode = previousExitCode;
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('reports generation errors and leaves no spinner timer keeping the process alive', async () => {
    vi.mocked(generateFavicons).mockRejectedValue(new Error('Invalid State Error'));

    await import('../src/cli.js');
    await vi.waitFor(() => expect(cancel).toHaveBeenCalledWith('Invalid State Error'));

    expect(generateFavicons).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(outro).not.toHaveBeenCalled();
  });

  it('stops the spinner and finishes after successful generation', async () => {
    vi.mocked(generateFavicons).mockResolvedValue({
      files: ['public/assets/favicons/favicon.svg'],
      data: 'resources/favicons.json',
      partial: 'resources/views/partials/favicons.antlers.html',
      markup: { markups: [], cssSelectors: [] },
    });

    await import('../src/cli.js');
    await vi.waitFor(() => expect(outro).toHaveBeenCalledWith('Done.'));

    expect(generateFavicons).toHaveBeenCalledOnce();
    expect(cancel).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});
