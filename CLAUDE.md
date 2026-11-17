# ai-tools: conventions

A collection of single-page browser tools. See README.md for the index.

## Structure
- One folder per tool: `<tool>/<tool>.html`, `<tool>/NOTES.md`, `<tool>/test/`.
- Add each new tool to the table in README.md.
- Before changing an existing tool, read its NOTES.md; it records decisions the user made and gotchas.
- After a meaningful change, update that tool's NOTES.md (decisions, gotchas, change history).

## How tools are built
- **One self-contained HTML file** that works when opened from `file://`. No build step, no server.
- Libraries from cdnjs (preferred) or jsDelivr, **pinned to exact versions**. UMD/classic-script
  builds, because ES modules are awkward from `file://`. Load heavy, rarely needed libraries lazily.
- Process files **in the browser only**; never upload user files anywhere.
- UI: drop zone (also click-to-choose, keyboard accessible), a status log, light/dark via
  `prefers-color-scheme`. Results are saved with a `download` link (lands in ~/Downloads).
- Keep the conversion logic pure and between `// CORE-START` and `// CORE-END` markers, with
  libraries passed in as parameters, so a Node harness can run it without a browser.

## Testing
- `test/run.js`: loads the CORE block in Node with npm copies of the same library versions; fast.
- `test/e2e.js`: drives the real page in headless Chrome via `puppeteer-core` and the installed
  Chrome (`/Applications/Google Chrome.app`), capturing downloads. Covers CDN loading, workers, downloads.
- Test with the user's real sample files (they live outside the repo, e.g. ~/Downloads, and must
  not be committed). Commit only small synthetic fixtures or the scripts that generate them.
- Regression habit: dump outputs to text before and after a change and `diff` them.
