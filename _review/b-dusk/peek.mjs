#!/usr/bin/env node
/* Viewport screenshots of design B for review (not part of the design).
   Usage: node peek.mjs <out-name> <phone|desktop|WxH> "<query>" "<hash>" [scrollY] [js to run first] */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';

const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, '../../b-dusk');
const [name, size = 'desktop', query = 'demo=1', hash = '/chat', scrollY = '0', js = ''] = process.argv.slice(2);
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
let opts = SIZES[size];
if (!opts) { const [w, h] = size.split('x').map(Number); opts = { viewport: { width: w, height: h }, deviceScaleFactor: 1 }; }
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext(opts);
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto(pathToFileURL(path.join(DIR, 'index.html')).href + '?' + query + '#' + hash, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
if (js) { await page.evaluate(js); await page.waitForTimeout(700); }
if (+scrollY) { await page.evaluate(y => window.scrollTo(0, y), +scrollY); await page.waitForTimeout(200); }
await page.screenshot({ path: path.join(HERE, 'peek', name + '.png') });
if (errs.length) console.log(errs.join('\n'));
await browser.close();
