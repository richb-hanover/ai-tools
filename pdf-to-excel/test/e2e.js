// Full test in real (headless) Chrome: loads the page from file://, feeds it PDFs through the
// file input, and collects the downloads in out/browser/. Exercises CDN loading, the PDF.js
// worker, OCR (Tesseract) and the download itself.
//   node e2e.js <file.pdf> [more.pdf ...]
const puppeteer = require("puppeteer-core");
const fs = require("fs"), path = require("path");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const page_url = "file://" + path.resolve(__dirname, "..", "pdf-to-excel.html");
const dl = path.join(__dirname, "out", "browser");

(async () => {
  const files = process.argv.slice(2).map(f => path.resolve(f));
  fs.rmSync(dl, { recursive: true, force: true });
  fs.mkdirSync(dl, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("pageerror:", e.message));
  const cdp = await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dl });
  await page.goto(page_url, { waitUntil: "networkidle0" });
  await (await page.$("#file")).uploadFile(...files);
  await page.waitForFunction(n => document.querySelectorAll("#log .ok, #log .err").length >= n,
    { timeout: 300000 }, files.length);
  await new Promise(r => setTimeout(r, 1500)); // let the last download land
  console.log(await page.$eval("#log", e => e.innerText));
  await page.screenshot({ path: path.join(dl, "page.png") });
  await browser.close();
  console.log("downloads:", fs.readdirSync(dl).filter(f => f.endsWith(".xlsx")));
})();
