# ai-tools

Small single-page browser tools, built with Claude Code. Each tool is one HTML file you can
open straight from disk (or embed in WordPress with an `<iframe>`). Files you give a tool
stay on your computer.

## Tools

| Tool | What it does | Notes |
|---|---|---|
| [pdf-to-excel](pdf-to-excel/pdf-to-excel.html) | Drop a PDF → `.xlsx` that follows the PDF's layout (columns, merged cells, fills, colours, OCR for scans) | [NOTES](pdf-to-excel/NOTES.md) |

## Layout

```
ai-tools/
  README.md          this index: add a row per tool
  CLAUDE.md          conventions Claude Code loads automatically in this folder
  <tool-name>/
    <tool-name>.html the tool: self-contained, opens from file://
    NOTES.md         how we got here: decisions + why, algorithm, gotchas, limits, history
    test/            harness (package.json, scripts, small synthetic fixtures)
```

## Starting a new tool

1. Open Claude Code in this folder and describe the tool. Claude reads `CLAUDE.md` and follows
   the same conventions.
2. Give it real sample files early. They expose problems that made-up tests don't.
3. When it works, ask Claude to write `<tool>/NOTES.md` and add a row to the table above.

## Using a tool in WordPress

Upload `<tool>.html` to your site (SFTP/file manager, e.g. `/tools/`), then add a Custom HTML block:

```html
<iframe src="/tools/pdf-to-excel.html" style="width:100%;height:820px;border:0" title="PDF to Excel"></iframe>
```
