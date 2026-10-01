#!/usr/bin/env node
/* Design C review helper: viewport screenshots of states that the full
   page shots in tools/shoot.mjs do not reach (open drawer, a chat with
   replies, dialogs, list views, right to left with content).
   Usage: node _review/c-clear/look.mjs [name-filter] */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';

const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DIR = path.join(ROOT, 'c-clear');
const OUT = path.join(HERE, 'look');
fs.mkdirSync(OUT, { recursive: true });
const filter = process.argv[2] || '';

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const url = (params, route) => pathToFileURL(path.join(DIR, 'index.html')).href + '?' + params + '#' + route;

async function chatWith(page, text) {
  await page.fill('#chat-input', text);
  await page.click('.send-btn');
  await page.waitForSelector('.msg-bot', { timeout: 5000 });
  await page.waitForTimeout(300);
}

const CASES = [
  { name: 'chat-empty', size: 'phone', go: ['demo=1', '/chat'] },
  { name: 'chat-reply', size: 'phone', go: ['demo=1', '/chat'], run: async p => { await chatWith(p, 'What can I claim?'); } },
  { name: 'chat-reply', size: 'desktop', go: ['demo=1', '/chat'], run: async p => { await chatWith(p, 'What can I claim?'); await p.evaluate(() => window.scrollTo(0, 0)); } },
  { name: 'chat-reply-end', size: 'desktop', go: ['demo=1', '/chat'], run: async p => { await chatWith(p, 'help with travel costs'); } },
  { name: 'chat-urgent', size: 'phone', go: ['demo=1', '/chat'], run: async p => { await chatWith(p, 'I am not safe, I need help now'); } },
  { name: 'chat-reply-ar', size: 'desktop', go: ['demo=1&lang=ar', '/chat'], run: async p => { await chatWith(p, 'What can I claim?'); await p.evaluate(() => window.scrollTo(0, 0)); } },
  { name: 'list-all', size: 'phone', go: ['demo=1', '/benefits/all'] },
  { name: 'list-all', size: 'desktop', go: ['demo=1', '/benefits/all'] },
  { name: 'list-all-ar', size: 'desktop', go: ['demo=1&lang=ar', '/benefits/all'] },
  { name: 'list-council-easy', size: 'desktop', go: ['demo=1', '/benefits/council'], run: async p => { await p.click('[data-key="easy"]'); } },
  { name: 'blocked-open', size: 'desktop', go: ['demo=1', '/benefits'], run: async p => { await p.click('.blocked-btn'); await p.evaluate(() => document.querySelector('.blocked').scrollIntoView()); } },
  { name: 'drawer-expanded', size: 'phone', go: ['demo=1', '/benefits'], run: async p => { await p.click('.apps-btn'); await p.waitForTimeout(400); await p.click('[data-action="app-toggle"][data-id="council-tax-student"]'); } },
  { name: 'sidebar-expanded', size: 'desktop', go: ['demo=1', '/chat'], run: async p => { await p.click('[data-action="app-toggle"][data-id="council-tax-student"]'); } },
  { name: 'rail', size: 'desktop', go: ['demo=1', '/benefits'], run: async p => { await p.click('.side-full [data-action="rail"]'); } },
  { name: 'detail-top', size: 'phone', go: ['demo=1', '/benefit/council-tax-student'] },
  { name: 'detail-generic', size: 'desktop', go: ['demo=1', '/benefit/public-libraries'] },
  { name: 'share', size: 'phone', go: ['demo=1', '/benefit/council-tax-student'], run: async p => { await p.click('.detail-actions [data-action="share"]'); await p.waitForTimeout(300); } },
  { name: 'share', size: 'desktop', go: ['demo=1', '/benefits/all'], run: async p => { await p.click('.b-foot [data-action="share"]'); await p.waitForTimeout(300); } },
  { name: 'community-top', size: 'desktop', go: ['demo=1', '/community'] },
  { name: 'community-top', size: 'phone', go: ['demo=1', '/community'] },
  { name: 'community-ratings', size: 'desktop', go: ['demo=1', '/community/ratings'] },
  { name: 'community-ratings', size: 'phone', go: ['demo=1', '/community/ratings'] },
  { name: 'write-post', size: 'phone', go: ['demo=1', '/community'], run: async p => { await p.click('[data-action="write-post"]'); await p.waitForTimeout(300); } },
  { name: 'rate', size: 'desktop', go: ['demo=1', '/community/ratings'], run: async p => { await p.click('.comm-main'); await p.waitForTimeout(300); } },
  { name: 'reply-open', size: 'phone', go: ['demo=1', '/community'], run: async p => { await p.click('[aria-controls="replies-p1"]'); } },
  { name: 'settings-top', size: 'phone', go: ['demo=1', '/settings'] },
  { name: 'settings-colours', size: 'desktop', go: ['demo=1', '/settings'], run: async p => { await p.evaluate(() => document.getElementById('s-colours').scrollIntoView()); } },
  { name: 'answer-edit', size: 'phone', go: ['demo=1', '/settings/answer/status'] },
  { name: 'help-now', size: 'phone', go: ['demo=1', '/settings/help'] },
  { name: 'delete', size: 'desktop', go: ['demo=1', '/settings'], run: async p => { await p.click('[data-action="delete-account"]'); await p.waitForTimeout(300); } },
  { name: 'register', size: 'desktop', go: ['reset=1', '/register'] },
  { name: 'questions', size: 'desktop', go: ['demo=1', '/questions/3'] },
  { name: 'ack', size: 'phone', go: ['demo=1', '/ack'] },
  { name: 'no-status', size: 'phone', go: ['demo=1', '/benefits'], run: async p => {
      await p.evaluate(() => { delete window.LC.state.profile.status; window.LC.save(); window.LC.render(); });
  } },
  { name: 'chat-xlarge', size: 'phone', go: ['demo=1&text=xlarge', '/chat'] },
  { name: 'list-xlarge', size: 'phone', go: ['demo=1&text=xlarge', '/benefits/all'] },
  { name: 'strong-list', size: 'desktop', go: ['demo=1&theme=strong', '/benefits/all'] },
  { name: 'dark-detail', size: 'desktop', go: ['demo=1&theme=soft-dark', '/benefit/council-tax-student'] },
  { name: 'warm-community', size: 'desktop', go: ['demo=1&theme=warm', '/community'] },
  { name: 'sage-settings', size: 'phone', go: ['demo=1&theme=sage', '/settings'] },
  { name: 'tab-focus', size: 'desktop', go: ['demo=1', '/benefits/all'], run: async p => { for (let i = 0; i < 12; i++) await p.keyboard.press('Tab'); } },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
for (const c of CASES) {
  const label = `${c.name}-${c.size}`;
  if (filter && !label.includes(filter)) continue;
  const ctx = await browser.newContext(SIZES[c.size]);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${label}: console ${m.text()}`); });
  try {
    await page.goto(url(c.go[0], c.go[1]), { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    if (c.run) await c.run(page);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, label + '.png') });
  } catch (e) {
    errors.push(`${label}: ${e.message.split('\n')[0]}`);
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no errors');
