# PDF → Excel: how we got here

Notes for future me (and future Claude sessions) on why this tool is built the way it is.
Built with Claude Code, November 2026.

## What it does

Drop one or more PDFs on `pdf-to-excel.html` (opened straight from disk, `file://`). Each PDF
becomes `<original name>.pdf.xlsx` in the browser's download folder. Nothing is uploaded; all
work happens in the browser.

## Decisions (and why)

| Decision | Why |
|---|---|
| One self-contained HTML file, libraries from CDN | Runs by double-clicking; easy to drop into WordPress via an `<iframe>`. Needs internet. |
| PDF.js **3.11.174** (cdnjs) | Last version with a classic `<script>` (UMD) build; 4.x is ES-module only. Its worker loads cross-origin from `file://` fine. |
| ExcelJS **4.4.0** (cdnjs) | Writes styled xlsx (fonts, fills, merges, number formats). SheetJS community can't style. |
| Tesseract.js **5.1.1** (jsDelivr), loaded only when needed | OCR for pages with no text layer. v5 needs `recognize(img, {}, {blocks: true})` to get word boxes. |
| All pages stacked on **one sheet**, with a gray **"Page N"** row before each page (multi-page only) | User's choice; the marker rows keep pages traceable. |
| Repeated page headers dropped (page 1's kept); repeated footers dropped on **all** pages | One continuous table. Page 1's footer would otherwise sit in the middle of the data. |
| `$` amounts → numbers, currency format `"$"#,##0.00_);("$"#,##0.00)`; `%` → real percents | User's choice: usable in formulas. Plain numbers are converted only with commas or decimals (IDs and account numbers stay text). |
| All cells **Calibri 12**; bold/italic and text colour kept from the PDF | User's choice (the PDF's own fonts/sizes were tried first). |
| PDF borders **not** copied | User's choice: Excel gridlines do the job. Ruling lines are still *read*, to find cells and columns. |
| Output name `name.pdf.xlsx` (not `name.xlsx`) | User's choice. |
| Last row of every workbook: gray disclaimer with the blog link and version (`DISCLAIMER`) | User's choice. The whole cell is a hyperlink to the blog post (Excel links are per cell), styled as plain text. Added after column sizing so it doesn't widen column A. |
| Version kept in `APP_VERSION` (CORE) | One place to bump; the page label and the disclaimer row read it. |

## Pipeline (all inside `// CORE-START … // CORE-END` in the HTML)

1. **extractPages**: PDF.js `getTextContent()` gives text items with positions. Pages with < 5
   characters of text go to OCR instead (`ocrPage`, outside CORE: needs canvas + Tesseract).
2. **fontFor**: bold/italic. Generic names like `CIDFont+F1` (Microsoft Print-to-PDF) hide the
   style, so it reads the embedded font's TrueType `name` table (`fontExtraProperties: true`).
3. **extractGraphics**: walks the operator list (tracking the transform matrix) to collect:
   - filled rectangles = cell backgrounds (thin ones ≤ 2.5pt = ruling lines)
   - stroked segments = ruling lines
   - text runs + fill colour = **text colour** (PDF.js text content has no colour)
4. **groupLines**: items → visual lines (by baseline) → phrases (joined when the gap is < 0.45em;
   never two numbers; a lone `$` joins the number after it).
5. **applyCellBoxes**: finds each phrase's PDF cell (the nearest ruling line on all 4 sides,
   else the smallest coloured box). Text wrapped inside one cell → one cell with `\n`. A label
   centred between rows is moved onto a row its cell covers.
6. **buildGrid**:
   - drops headers/footers (line "signatures" with digits normalised, in the top 25% or bottom 15%)
   - stacks the pages; a gap > 1.75 × the median line gap becomes a blank row
   - **columns** = runs of horizontal text coverage (a run needs > 3% of rows), plus leftovers;
     split at vertical ruling lines; split where two numbers keep sharing a column
   - places chunks (several in one column → joined with a space); prunes empty columns
   - **merges**: boxed cells covering several rows/columns, if the other cells are empty;
     centred text spanning columns without a box
   - **alignment**: numbers by per-column majority; text by position inside its PDF box, or
     left if several cells of *different widths* share a left edge (+ Excel indent)
   - **fills**: samples the topmost filled rect under each cell
7. **buildWorkbook**: ExcelJS. Column width ≈ max(PDF width / 5.25, text length).
   Merges, fills, font colour, wrap and indent.

## Gotchas learned the hard way

- PDF.js text items may include leading/trailing spaces; trim them **and move x0/x1**.
- "Shares a left edge" alone isn't enough: centred short labels (SB/TM/OS) share one too.
  Require ≥ 3 cells with widths differing by > 6pt.
- Wide titles/notes bridge the coverage gap between narrow columns in small tables, which is
  why columns are split at vertical ruling lines.
- OCR: grid lines are read as `|` / `[` characters, which break number detection. `eraseRules()`
  whitens thin lines (not solid fills) before OCR, and stray bracket glyphs are stripped.
- OCR word boxes are padded, so adjacent number columns touch. That's what the
  "two numbers in one column → split" pass is for.
- Header/footer "signatures" replace digits with `#`, so different total rows can look identical.
  Lines containing $ or % values are therefore never treated as headers/footers.
- Don't use `Math.max(...array)` on per-chunk lists: it throws past roughly 100k elements.
- ExcelJS reading back a default font reports `{theme: 1}` as its colour; that isn't white text.
- Only the **top-left** cell of a merge carries the value and style.

## Known limits

- **Merges:** found only where the PDF draws cells (lines on 4 sides, or a coloured box). Tables
  laid out with spacing alone can't reveal their spans.
- **Empty rows:** rows with no text don't appear (empty rows of a grid are skipped).
- **Fills:** gradient/pattern fills are ignored.
- **OCR quality:** text on coloured or dark backgrounds comes out garbled. OCR pages get no
  colours, merges or bold.
- **Bold:** if a font has no usable name, bold can't be detected.

## Testing

```
cd pdf-to-excel/test
npm install                 # pdfjs-dist, exceljs, puppeteer-core (uses installed Chrome)
node make-fixtures.js       # builds fixtures/Merged Table.pdf + fixtures/Scanned.pdf
node run.js <pdf> [--rows N]   # fast: CORE in Node, dumps the sheet (no OCR)
node e2e.js <pdf> [...]        # real headless Chrome from file://, includes OCR + download
```

`run.js` dump legend: `#123` = number, `[RRGGBB]` = fill, `{RRGGBB}` = font colour,
`>>2` = indent, `<cm>` = horizontal/vertical alignment, `⏎` = line break, then a `merges:` line.

**Real-world samples used during development** (in ~/Downloads, not in the repo):
- `Expenditure Report 11-10-2026.pdf`: Microsoft Print-to-PDF; centred numbers, a summary block
  on page 2, CID fonts (bold via the name table)
- `ERP Pro Expenditure Report 11-10-26.pdf`: 13 pages; repeated headers/footers, two-line records
- `13-2025-2026 Town-To CRF .pdf`: Excel export; full ruling grid, fills, merged headers, red
  text, indented labels

**Regression habit:** before changing layout code, dump each sample with `run.js` to a text file;
after the change, dump again and `diff`. Every change in this tool was checked that way.

## Change history

1. Basic converter: text positions → grid, money/percent numbers, header/footer removal, OCR fallback
2. OCR fixes: phrase joining for OCR words; split columns where numbers collide
3. All cells Calibri 12
4. Row/column merges from PDF cell boxes, background fills, wrapped cells
5. Real text colour, indent detection, box-relative alignment, the trim-offset fix
6. "Page N" marker rows (light gray `#D9D9D9`) for multi-page PDFs
7. Erase grid lines before OCR
8. **Version 1.0.0**: version on the page, disclaimer text on the page and as the last workbook row (first public release)
9. **Version 1.0.1**: disclaimer row is a clickable hyperlink to the blog post
10. **Version 1.0.2**: code-review fixes: lines with $/% values are never dropped as headers/footers
    (two pages ending in similar "Fund N Total:" rows used to lose both); no `Math.max(...hugeArray)`
    in column detection (crashed on very large PDFs)
