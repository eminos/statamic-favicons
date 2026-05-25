import { converter, parse } from 'culori';

const toRgb = converter('rgb');

export function colorSwatch(value: string, env: NodeJS.ProcessEnv = process.env): string {
  if (value === 'transparent') {
    return '□ ';
  }

  const rgb = colorToRgb(value);

  if (!rgb || env.NO_COLOR) {
    return '■';
  }

  return `\u001B[0m\u001B[48;2;${rgb.r};${rgb.g};${rgb.b}m  \u001B[0m`;
}

function colorToRgb(value: string): { r: number; g: number; b: number } | undefined {
  const normalized = value.trim();
  const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);

  if (hex) {
    const raw = hex[1];
    const full = raw.length === 3
      ? raw.split('').map((char) => char + char).join('')
      : raw.slice(0, 6);

    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }

  const rgb = normalized.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);

  if (rgb) {
    return {
      r: clampColor(Number.parseInt(rgb[1], 10)),
      g: clampColor(Number.parseInt(rgb[2], 10)),
      b: clampColor(Number.parseInt(rgb[3], 10)),
    };
  }

  const parsed = parse(normalized);
  const converted = parsed ? toRgb(parsed) : undefined;

  if (converted) {
    return {
      r: normalizedColorChannel(converted.r),
      g: normalizedColorChannel(converted.g),
      b: normalizedColorChannel(converted.b),
    };
  }

  return undefined;
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function normalizedColorChannel(value: number | undefined): number {
  return clampColor(Math.round((value ?? 0) * 255));
}
