// Builds the synthetic test PDFs in fixtures/:
//   Merged Table.pdf  - rowspan/colspan, fills, white-on-dark header, wrapped header text
//                       (rendered by Chrome from fixtures/merged-table.html)
//   Scanned.pdf       - image-only copy of Merged Table.pdf, to exercise OCR
//                       (needs poppler's pdftoppm: `brew install poppler`; uses macOS `sips`)
const puppeteer = require("puppeteer-core");
const { execFileSync } = require("child_process");
const path = require("path"), fs = require("fs");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const fx = path.join(__dirname, "fixtures");

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
  const page = await browser.newPage();
  await page.goto("file://" + path.join(fx, "merged-table.html"));
  await page.pdf({ path: path.join(fx, "Merged Table.pdf"), format: "letter", printBackground: true });
  await browser.close();
  console.log("wrote fixtures/Merged Table.pdf");

  const png = path.join(fx, "scan-page");
  execFileSync("pdftoppm", ["-r", "150", "-png", "-singlefile", path.join(fx, "Merged Table.pdf"), png]);
  execFileSync("sips", ["-s", "format", "pdf", png + ".png", "--out", path.join(fx, "Scanned.pdf")]);
  fs.rmSync(png + ".png");
  console.log("wrote fixtures/Scanned.pdf");
})();
