# Changelog

All notable changes to this project will be documented in this file.

## 1.0.0 - 2026-05-25

Initial stable release.

### Added

- Interactive `statamic-favicons generate` wizard for Statamic projects.
- Statamic detection through `composer.json`.
- Source favicon detection for common `resources` and `public` paths, including generated favicon folders with overwrite warnings.
- SVG, PNG, JPG, JPEG, and WebP source support through RealFaviconGenerator and Sharp.
- Terminal source previews with reliable ANSI output by default and optional native image previews.
- `statamic-favicons doctor` terminal preview diagnostics.
- Tailwind theme color detection from CSS theme variables and simple config values.
- Browser theme color, manifest background color, and icon background color prompts.
- Transparent icon background default.
- Generated favicon assets, web manifest metadata, browser metadata, and `resources/favicons.json`.
- Antlers partial generation with root-partial or `partials/` conventions.
- Optional generated markup snippet when skipping partial output.
- Optional layout injection with conservative Statamic layout detection and custom path support.
- ICO generation with contain-fit 48, 32, and 16 pixel frames so non-square artwork is not cropped.

### Changed

- Package metadata, license, changelog, README, and npm packing settings are ready for a public 1.0 release.
