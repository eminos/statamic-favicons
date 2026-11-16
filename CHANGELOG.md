# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Changed

- Build and validate the package before invoking npm publish so npm reads the generated CLI entry immediately.

## 2.0.0 - 2026-11-16

### Changed

- Publish stable GitHub releases to npm through a trusted publishing workflow.
- Require Node.js 22.13 or newer.
- Require svgdom 0.1.29 or newer and bundle the JavaScript image pipeline so published installs use the supported SVG serializer.

### Fixed

- Avoid the SVG serialization regression that caused "Invalid State Error" during favicon generation.
- Stop the generation spinner before reporting an error, allowing the CLI to exit instead of remaining stuck at "Generating favicon package".

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
