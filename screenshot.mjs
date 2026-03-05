import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const screenshotDir = join(__dirname, 'temporary screenshots');

if (!existsSync(screenshotDir)) {
  mkdirSync(screenshotDir, { recursive: true });
}

// Auto-increment screenshot number
function getNextScreenshotNumber(label) {
  const files = existsSync(screenshotDir) ? readdirSync(screenshotDir) : [];
  const pattern = label ? new RegExp(`^screenshot-(\\d+)-${label}\\.png$`) : /^screenshot-(\d+)\.png$/;
  let max = 0;
  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  // Also check all screenshots to get global max
  const allFiles = files.filter(f => /^screenshot-(\d+)/.test(f));
  for (const file of allFiles) {
    const m = file.match(/^screenshot-(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3];

const n = getNextScreenshotNumber(label);
const filename = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
const outputPath = join(screenshotDir, filename);

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

// Wait for fonts and images
await new Promise(r => setTimeout(r, 1500));

const fullPage = process.argv[4] !== 'viewport';
await page.screenshot({ path: outputPath, fullPage });
await browser.close();

console.log(`Screenshot saved: ${outputPath}`);
