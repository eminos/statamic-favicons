# Statamic Favicons

Generate modern favicons for Statamic sites from a single source image.

```bash
npx statamic-favicons generate
```

The CLI opens an interactive setup wizard that generates a complete favicon set in a few seconds. It detects a Statamic project, finds likely source icons, previews them in the terminal, suggests Tailwind theme colors, detects common Antlers partial and layout conventions, writes the generated assets, and can create an Antlers partial with optional layout injection.

This package is Statamic-specific. If `statamic/cms` is not found in `composer.json`, the command stops.

## Requirements

- Node.js 22.13 or newer
- A Statamic project with `statamic/cms` in `composer.json`
- One source favicon image in SVG, PNG, JPG, JPEG, or WebP format

## Usage

Run the wizard from the root of a Statamic project:

```bash
npx statamic-favicons generate
```

For package development or scripted checks, pass a project directory explicitly:

```bash
statamic-favicons generate --cwd /path/to/statamic-site
```

The wizard helps with the parts that usually get fiddly:

- detects Statamic from `composer.json`
- finds common favicon source files and previews them in the terminal
- warns if the selected source lives inside the output folder
- detects root partial versus `partials/` conventions
- detects common layout files for optional injection
- suggests Tailwind theme colors for browser, manifest, and icon background colors
- writes favicon assets, a web manifest, generated metadata, and optional Antlers markup

## CLI preview

A typical run looks like this:

```text
$ npx statamic-favicons generate

Statamic Favicons

Detected
Project: /sites/example
Sources found: 2
Layouts found: 1
Theme colors found: 3
App name: Example Site

Source preview
resources/images/favicon.svg

? Select source favicon
  resources/images/favicon.svg

? Use resources/images/favicon.svg?
  Yes

? Assets output directory
  public/assets/favicons

? Where should the Antlers partial be written?
  resources/views/partials/favicons.antlers.html
  Hint: detected Statamic partial convention

? Public path for generated tags
  /assets/favicons/

? Website name
  Example Site

? Short website name
  Example

? Browser theme color
  brand: #ff6633
  Hint: detected from Tailwind theme colors

? Manifest background color
  white: #ffffff
  Hint: detected from Tailwind theme colors

? Icon background color
  transparent
  Hint: keep source image transparency

? Inject {{ partial:partials/favicons }} into a layout file?
  Yes

? Select layout for optional injection
  resources/views/layout.antlers.html
  Hint: detected layout file

Plan
Source: resources/images/favicon.svg
Assets: public/assets/favicons
Public path: /assets/favicons/
Partial: resources/views/partials/favicons.antlers.html
Data: resources/favicons.json
Layout: resources/views/layout.antlers.html
App name: Example Site
Theme color: #ff6633

? Generate favicon assets and partial?
  Yes

Generated
public/assets/favicons/favicon.ico
public/assets/favicons/favicon.svg
public/assets/favicons/favicon-96x96.png
public/assets/favicons/apple-touch-icon.png
public/assets/favicons/site.webmanifest
resources/views/partials/favicons.antlers.html
resources/favicons.json
```

## Defaults

```bash
statamic-favicons generate
```

By default it writes:

- assets: `public/assets/favicons`
- public path: `/assets/favicons/`
- partial: `resources/views/partials/favicons.antlers.html`
- data: `resources/favicons.json`

If your project uses root underscore partials, for example `resources/views/_nav.antlers.html`, it writes:

- partial: `resources/views/_favicons.antlers.html`
- include tag: `{{ partial:favicons }}`

The wizard can also choose the alternate partial location, accept a custom partial path, or skip writing a partial and print the generated markup snippet for manual pasting.

## Detection

Statamic is detected from `composer.json` when `statamic/cms` exists in `require` or `require-dev`.

Source icon lookup order:

1. `resources/images/favicon.svg`
2. `resources/images/favicon.png`
3. `resources/assets/favicon.svg`
4. `resources/assets/favicon.png`
5. `resources/svg/favicon.svg`
6. `public/favicon.svg`
7. `public/favicon.png`
8. `public/assets/favicons/favicon.svg`
9. `public/assets/favicons/favicon.png`
10. fallback search in `resources/**/favicon.{svg,png,jpg,jpeg,webp}` and `public/**/favicon.{svg,png,jpg,jpeg,webp}`

The source picker always includes a custom path option for icons stored elsewhere. If the selected source is inside the configured output directory, `public/assets/favicons` by default, the wizard warns before generation because the source may be overwritten.

Layout lookup order:

1. `resources/views/layout.antlers.html`
2. `resources/views/layouts/default.antlers.html`
3. `resources/views/layouts/app.antlers.html`
4. `resources/views/layouts/base.antlers.html`
5. fallback search for `resources/views/**/layout.antlers.html` and `resources/views/layouts/**/*.antlers.html`, ignoring partials and components

If no matching layout is detected, the injection step can still accept a custom layout path.

The website name and short website name default to `APP_NAME` from `.env`. They are written to the web manifest as `name` and `short_name`. The wizard lets you change them before generation.

The generated markup includes favicon links, web manifest metadata, and browser UI color metadata such as `theme-color`.

## Theme colors

The wizard asks for three colors:

- Browser theme color: written as `<meta name="theme-color">` and used by supported browsers for UI chrome.
- Manifest background color: written to the web manifest and used by installed/PWA launch screens.
- Icon background color: used behind transparent source artwork when generating platform icons. The default is transparent, which keeps the source artwork as-is. The ICO file is generated with contain-fit square frames so non-square artwork is never cropped.

If the project has Tailwind theme colors, the wizard offers them as choices before falling back to manual CSS color input. It detects Tailwind v4-style CSS custom properties such as:

```css
@theme {
  --color-brand: #ff6633;
  --color-muted-surface: oklch(0.97 0.02 88);
}
```

It also scans simple `tailwind.config.*` theme color values where they can be read safely.

## Terminal previews

Image previews use ANSI block rendering by default because it works reliably in most terminals. SVG sources are rasterized to a temporary PNG before previewing.

In VS Code's integrated terminal, the CLI automatically tries the iTerm inline image protocol when `TERM_PROGRAM=vscode` and the terminal reports VS Code 1.80 or newer. Native image output is written directly to stdout instead of through the prompt renderer, because prompt UIs can escape or print image payloads as raw text.

If your terminal claims native image support but renders raw image data, disable native previews:

```bash
STATAMIC_FAVICONS_NATIVE_PREVIEW=0 statamic-favicons generate
```

If you want to force native previews in another terminal:

```bash
STATAMIC_FAVICONS_NATIVE_PREVIEW=1 statamic-favicons generate
```

To inspect what the CLI detects:

```bash
statamic-favicons doctor
```

## Configuration

Version one is intentionally wizard-first. Run the command in your Statamic project and answer the prompts.

```bash
statamic-favicons generate
```

The only CLI option is `--cwd`, mainly for local package development and testing.

Configuration files are optional. When present, the CLI reads the first matching file:

- `statamic-favicons.config.mjs`
- `statamic-favicons.config.js`
- `statamic-favicons.config.json`
- `favicon.config.mjs`
- `favicon.config.js`
- `favicon.config.json`

Supported config keys match the wizard output: `source`, `outDir`, `publicPath`, `partial`, `data`, `layout`, `appName`, `shortName`, `themeColor`, `backgroundColor`, `iconBackgroundColor`, `iconBackgroundRadius`, `iconScale`, and `skipMetadataInjection`.

## Local testing

From this repo:

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm test:package
pnpm pack --dry-run
```

Then from a Statamic project:

```bash
npx -y -p /path/to/statamic-favicons/statamic-favicons-2.0.0.tgz statamic-favicons generate
```

## Release checklist

Before publishing:

```bash
pnpm test
pnpm typecheck
pnpm test:package
pnpm pack --dry-run
```

`pnpm test:package` builds the published JavaScript and smoke-tests SVG and PNG generation from that output.

`npm publish` also runs the same test, typecheck, and built-package checks through `prepublishOnly`.

Publishing a stable GitHub release triggers `.github/workflows/publish.yml`. The workflow checks that the release tag is `v` followed by the version in `package.json`, installs dependencies from the lockfile, and publishes to npm. Pushing a tag alone does not publish the package.

Configure the package's npm trusted publisher once in npm Settings → Trusted publishing:

- Provider: GitHub Actions
- Organization or user: `eminos`
- Repository: `statamic-favicons`
- Workflow filename: `publish.yml`
- Environment: leave blank
- Allowed actions: enable direct publishing with `npm publish`

The workflow uses OIDC; no npm token or GitHub Actions secret is required. See [npm's trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

For each release, update the version in `package.json` and `src/cli.ts`, add a dated changelog entry, run the checks above, and commit the changes. Push an annotated `vX.Y.Z` tag and publish its GitHub release. Confirm that the publishing workflow succeeds and npm lists the new version before announcing it.

## License

MIT
