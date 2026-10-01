import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
export const { chromium } = require('playwright');
export const INDEX = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/a-paper/index.html').href;
export const SHOTS = '/Users/armanbayatmaku/Desktop/landit-test/_review/a-paper/review-brief/shots/';
export const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
export async function open(browser, size, url, extra = {}) {
  const ctx = await browser.newContext({ ...SIZES[size], ...extra });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  for (let i = 0; i < 3; i++) {
    try { await page.goto(INDEX + url, { waitUntil: 'load' }); await page.waitForFunction(() => window.LANDIT && window.PAPER, null, { timeout: 4000 }); break; }
    catch (e) { await page.waitForTimeout(800); }
  }
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}
export const DISC = 'Landit provides information only, not legal or financial advice. Eligibility varies by individual circumstance and immigration status. Always verify with official sources or a qualified adviser before applying.';
export const BANNED = ['win','wins','won','winning','prize','play','playing','quest','level','levels','pot','stars','score','scores','reward','rewards','unlock','unlocks','seamless','seamlessly','leverage','revolutionary','game-changing','owed','Landed','Kasdena','Russia','Russian'];
export function scan(text) {
  const out = [];
  if (/[–—]/.test(text)) out.push('DASH: ' + (text.match(/.{0,40}[–—].{0,40}/g) || []).join(' || '));
  const masked = text.replace(/\bA-levels?\b/gi, x => ' '.repeat(x.length)).replace(/\blevels? \d+\b/gi, x => ' '.repeat(x.length));
  for (const w of BANNED) {
    const re = new RegExp('(?<![A-Za-z0-9_-])' + w.replace(/[-]/g, '\\-') + '(?![A-Za-z0-9_-])', 'gi');
    let m; while ((m = re.exec(masked))) out.push('BANNED ' + w + ': ' + masked.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, ' '));
  }
  if (/tier\s+4/i.test(text)) out.push('Tier 4');
  for (const j of ['NRPF', 'means-tested', 'means tested', 'composition', 'UC-gated', 'gated', 'nrpfNote', 'passported', 'undefined', 'null', 'NaN', '[object']) {
    const re = new RegExp('(?<![A-Za-z])' + j.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z])', 'g');
    let m; while ((m = re.exec(text))) out.push('JARGON/LEAK ' + j + ': ' + text.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\n/g, ' '));
  }
  for (const p of ['you will get', 'you are entitled', 'entitled to', 'you qualify', 'guaranteed', 'you can get', 'you will receive', 'eligible for']) {
    const re = new RegExp(p, 'gi'); let m; while ((m = re.exec(text))) out.push('PROMISE? ' + p + ': ' + text.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\n/g, ' '));
  }
  return out;
}
