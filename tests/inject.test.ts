import { describe, expect, it } from 'vitest';
import { injectIntoHead } from '../src/inject.js';

describe('injectIntoHead', () => {
  it('injects before the closing head tag', () => {
    expect(injectIntoHead('<head>\n</head>', '{{ partial:partials/favicons }}'))
      .toBe('<head>\n    {{ partial:partials/favicons }}\n</head>');
  });

  it('falls back to prepending when no head tag exists', () => {
    expect(injectIntoHead('<main></main>', '{{ partial:partials/favicons }}'))
      .toBe('{{ partial:partials/favicons }}\n<main></main>');
  });
});
