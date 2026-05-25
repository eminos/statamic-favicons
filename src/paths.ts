import path from 'node:path';

export function normalizePublicPath(publicPath: string): string {
  let normalized = publicPath.trim();

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  if (!normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }

  return normalized;
}

export function toAbsolute(cwd: string, value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(cwd, value);
}

export function toRelative(cwd: string, value: string): string {
  return path.relative(cwd, value).split(path.sep).join('/');
}

export function withoutTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
