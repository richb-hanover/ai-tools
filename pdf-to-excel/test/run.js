// Fast test: runs the page's conversion core in Node (no browser) and dumps the resulting sheet.
//   node run.js <file.pdf> [more.pdf ...] [--rows 60]
// Writes out/<name>.pdf.xlsx and prints one line per row:
//   #123.45 = number   [RRGGBB] = cell fill   {RRGGBB} = font colour   >>2 = indent
//   <lb> = horizontal/vertical alignment (l/c/r, t/m/b)   ⏎ = line break inside a cell
// OCR is not available here (it needs a browser canvas); use e2e.js for scanned PDFs.
const fs = require("fs"), vm = require("vm"), path = require("path");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const ExcelJS = require("exceljs");

const args = process.argv.slice(2);
const ri = args.indexOf("--rows");
const maxRows = ri >= 0 ? +args.splice(ri, 2)[1] : 60;

// Load the code between the CORE-START / CORE-END markers of the page.
const html = fs.readFileSync(path.join(__dirname, "..", "pdf-to-excel.html"), "utf8");
const core = html.split("// CORE-START")[1].replace(/^.*\n/, "").split("// CORE-END")[0];
const ctx = { pdfjsLib, ExcelJS, console };
vm.createContext(ctx);
vm.runInContext(core + "\nthis.convertPdf = convertPdf;", ctx);

(async () => {
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  for (const f of args) {
    const name = path.basename(f);
    const res = await ctx.convertPdf(fs.readFileSync(f), name, { pdfjsLib, ExcelJS, log: m => console.log("log:", m) });
    const out = path.join(__dirname, "out", name + ".xlsx");
    fs.writeFileSync(out, Buffer.from(res.buffer));
    await dump(out, maxRows);
  }
})();

async function dump(file, max) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  console.log("== " + file);
  console.log("widths: " + ws.columns.map(c => (c.width || 0).toFixed(0)).join(","));
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    if (n > max) return;
    const v = [];
    for (let i = 1; i <= ws.columnCount; i++) {
      const c = row.getCell(i);
      let s = c.value == null ? "" : typeof c.value === "number" ? "#" + c.value : String(c.value).replace(/\n/g, "⏎");
      if (c.fill && c.fill.fgColor) s += "[" + c.fill.fgColor.argb.slice(2) + "]";
      if (c.font && c.font.color && c.font.color.argb) s += "{" + c.font.color.argb.slice(2) + "}";
      if (c.alignment && c.value != null) {
        s += (c.alignment.indent ? ">>" + c.alignment.indent : "") +
             "<" + (c.alignment.horizontal || "")[0] + (c.alignment.vertical || "")[0] + ">";
      }
      v.push(s);
    }
    console.log(String(n).padStart(3), v.join(" | "));
  });
  console.log("merges: " + ws.model.merges.join(" "));
}
