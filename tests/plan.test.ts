import { describe, expect, it } from 'vitest';
import { createPlan } from '../src/plan.js';

describe('createPlan', () => {
  it('uses Statamic defaults', () => {
    const plan = createPlan(
      {
        cwd: '/site',
        sources: ['resources/images/favicon.svg'],
        source: 'resources/images/favicon.svg',
        partial: 'resources/views/partials/favicons.antlers.html',
        layouts: ['resources/views/layout.antlers.html'],
        themeColors: [],
        layout: 'resources/views/layout.antlers.html',
        appName: 'Env Name',
        isStatamic: true,
      },
      {},
      { cwd: '/site' },
    );

    expect(plan).toMatchObject({
      source: 'resources/images/favicon.svg',
      outDir: 'public/assets/favicons',
      publicPath: '/assets/favicons/',
      partial: 'resources/views/partials/favicons.antlers.html',
      writePartial: true,
      data: 'resources/favicons.json',
      layout: 'resources/views/layout.antlers.html',
      appName: 'Env Name',
      shortName: 'Env Name',
      iconBackgroundColor: 'transparent',
      iconScale: 1,
    });
  });

  it('allows options to override config and detection', () => {
    const plan = createPlan(
      {
        cwd: '/site',
        sources: ['resources/images/favicon.svg'],
        source: 'resources/images/favicon.svg',
        layouts: [],
        themeColors: [],
        isStatamic: true,
      },
      {
        outDir: 'public/from-config',
        appName: 'Config Name',
      },
      {
        cwd: '/site',
        source: 'custom.svg',
        appName: 'CLI Name',
      },
    );

    expect(plan.source).toBe('custom.svg');
    expect(plan.outDir).toBe('public/from-config');
    expect(plan.appName).toBe('CLI Name');
  });

  it('can skip writing the Antlers partial', () => {
    const plan = createPlan(
      {
        cwd: '/site',
        sources: ['resources/images/favicon.svg'],
        source: 'resources/images/favicon.svg',
        partial: 'resources/views/partials/favicons.antlers.html',
        layouts: [],
        themeColors: [],
        isStatamic: true,
      },
      {},
      {
        cwd: '/site',
        writePartial: false,
      },
    );

    expect(plan.writePartial).toBe(false);
    expect(plan.partial).toBeUndefined();
  });
});
