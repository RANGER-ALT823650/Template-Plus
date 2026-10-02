# Agent usage

This directory is a local avatar template with a GUI and a deterministic CLI.

- Read `README.md` for commands and `avatar.schema.json` for the recipe contract.
- Discover supported options with `node cli.mjs list --json`.
- Generate with `node cli.mjs render --config recipe.json --out output/avatar.png --json`.
- Generate all combinations with `node cli.mjs batch --out output/all --formats svg,png --json`.
- Files with the same export names are overwritten; choose a new output path to preserve prior exports.
- Use `src/avatar.js` as the single shared rendering implementation; avoid separate GUI/CLI shape definitions.
- Keep the 8 reference shapes, 11 ICC-corrected colors, and fixed white eyes unless the user requests changing them.
- `references/palette.png` and `references/character.png` are read-only source references.
- Run `npm test` after changing rendering or configuration behavior.
- This project needs no cloud services. Serve the GUI using `npm start` on localhost.

# Template Plus extension

- This is an independent copy. Never write to ../Template or ../iPhone-Air while maintaining Plus unless explicitly requested.
- Default GUI is the sticker workstation on port 4174; original avatar GUI is /avatar.html.
- Use src/design.js for GUI and sticker CLI layout rendering, and src/export-pdf.mjs for all PDF output.
- Preserve the exact Air plateau and three-hole geometry from assets/iphone-air; retain dimensional/source metadata here.
- Use src/phones.js to select model geometry for GUI, CLI, preview and exports. Pro geometry is generated from retained sources in assets/phones; never substitute Air geometry for a Pro layout. Legacy layouts without model remain Air.
- Keep raster imports embedded in the PNG layout contract; src/image-import.mjs decodes supported local formats and normalizes EXIF orientation.
- PDF: 1:1 mm, 2 mm page margins, vector Artwork OCG, separate CutContour OCG, CutContour spot color and PrintState OFF.
- Keep imported vectors in the safe subset supported by src/svg-import.js. Never allow external resources or execute SVG content.
- npm test covers both original features and Plus exports. Browser QA artifacts belong in output/playwright/.

# Sticker Agent / CLI

- Read `STICKER-CLI.md`, `sticker.schema.json` and `sticker-operations.schema.json` for workstation creation and editing.
- Discover commands, model IDs, library assets and operation fields with `node sticker-cli.mjs list --json`.
- Create with `node sticker-cli.mjs create --model iphone-18-pro --out output/layout.json --json`.
- Inspect object IDs with `node sticker-cli.mjs inspect --config output/layout.json --json`; edit by stable ID or run `apply --ops operations.json`.
- Use `--dry-run --json` to inspect a complete proposed layout without writing. Explicit `--out` selects the destination; choose a new version path to retain prior designs.
- CLI layouts round trip through GUI Save / Import Layout. Browser state is not automatically updated by CLI file writes.
- Keep batch editing and file imports in `src/sticker-edit.mjs`; use the shared geometry helpers in `src/design.js` for model switching, centering and covering.
- Preview with `preview --config output/layout.json --out output/preview.png --json`; print with the existing `render` command.
