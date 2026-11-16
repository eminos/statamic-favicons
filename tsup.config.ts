import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  shims: true,
  // The bundled CommonJS adapter still loads native Sharp at runtime.
  banner: {
    js: "import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);",
  },
  // Keep the image pipeline together so svgdom resolves our declared runtime version.
  noExternal: [
    '@realfavicongenerator/generate-favicon',
    '@realfavicongenerator/image-adapter-node',
    '@svgdotjs/svg.js',
  ],
  external: [
    'sharp',
  ],
});
