/* node montage.mjs out.png a.png b.png ... : side-by-side montage via Chrome. */
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const DIR = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-people/';
const [out, ...ins] = process.argv.slice(2);
const html = '<html><body style="margin:0;display:flex;gap:6px;background:#888">' + ins.map(f => '<img src="' + pathToFileURL(DIR + f).href + '">').join('') + '</body></html>';
writeFileSync(DIR + '_m.html', html);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 400 * ins.length, height: 844 } });
await page.goto(pathToFileURL(DIR + '_m.html').href);
await page.waitForTimeout(300);
await page.screenshot({ path: DIR + out, fullPage: true });
await browser.close();
