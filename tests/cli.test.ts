import { describe, expect, it } from 'vitest';
import { colorSwatch } from '../src/color.js';

describe('colorSwatch', () => {
  it('renders a truecolor swatch for OKLCH values', () => {
    expect(colorSwatch('oklch(0.97 0.02 88)', {})).toContain('\u001B[48;2;');
  });

  it('renders a truecolor swatch for hex values', () => {
    expect(colorSwatch('#ff6633', {})).toContain('\u001B[48;2;255;102;51m');
  });

  it('resets prompt styling before rendering the swatch', () => {
    expect(colorSwatch('#ff6633', {}).startsWith('\u001B[0m')).toBe(true);
  });

  it('renders a transparent swatch without color escapes', () => {
    expect(colorSwatch('transparent', {})).toBe('□ ');
  });
});
