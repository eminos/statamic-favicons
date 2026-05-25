import { describe, expect, it } from 'vitest';
import { partialReference, renderAntlersPartial } from '../src/render.js';

describe('render', () => {
  it('renders markup as an Antlers partial', () => {
    expect(renderAntlersPartial({
      markups: ['<link rel="icon" href="/favicon.svg">'],
      cssSelectors: [],
    })).toBe('<link rel="icon" href="/favicon.svg">\n');
  });

  it('adds theme-color metadata when rendering with a plan', () => {
    expect(renderAntlersPartial({
      markups: ['<link rel="icon" href="/favicon.svg">'],
      cssSelectors: [],
    }, {
      cwd: '/site',
      source: 'resources/images/favicon.svg',
      outDir: 'public/assets/favicons',
      publicPath: '/assets/favicons/',
      partial: 'resources/views/partials/favicons.antlers.html',
      writePartial: true,
      data: 'resources/favicons.json',
      appName: 'Site',
      shortName: 'Site',
      themeColor: '#ffa37f',
      backgroundColor: '#ffffff',
      iconBackgroundColor: '#ffffff',
      iconBackgroundRadius: 0,
      iconScale: 1,
      skipMetadataInjection: true,
    })).toContain('<meta name="theme-color" content="#ffa37f">');
  });

  it('converts a partial path to a Statamic partial reference', () => {
    expect(partialReference('resources/views/partials/favicons.antlers.html'))
      .toBe('{{ partial:partials/favicons }}');
  });
});
