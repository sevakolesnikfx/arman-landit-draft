/* Plain language pass: long sentences and jargon on every screen (visible text only). */
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
await page.goto(BASE + '?demo=1#/chat', { waitUntil: 'load' });
await page.waitForTimeout(300);
const JARGON = /recourse|public fund|condition|eligib|verify|qualified|means-tested|disregard|occupant|dependant|exemption|band\b|non-repayable|circumstance|paragraph|Immigration Rules|set aside|potential|regulated|threshold|entitle|tenancy|enrolment|backdate|discretion|statutory|signpost|prepayment|liable|levy|via\b|N\/A|e\.g\.|i\.e\./i;
const seen = new Set();
const routes = ['chat', 'chat#reply', 'chat#nrpf', 'benefits', 'benefits#blocked', 'benefits/all', 'benefit/council-tax-student', 'benefit/universal-credit', 'community', 'community/ratings', 'settings', 'settings/help', 'settings/answer/status', 'chat#drawer', 'login', 'register', 'ack'];
for (const rr of routes) {
  const [r, extra] = rr.split('#');
  await page.evaluate(h => { location.hash = h; }, '#/' + r);
  await page.waitForTimeout(250);
  if (extra === 'reply') { await page.fill('#chat-input', 'What can I claim?'); await page.keyboard.press('Enter'); await page.waitForTimeout(300); }
  if (extra === 'nrpf') { await page.fill('#chat-input', 'What does no recourse to public funds mean?'); await page.keyboard.press('Enter'); await page.waitForTimeout(300); }
  if (extra === 'blocked') await page.click('[data-action=blocked-toggle]');
  if (extra === 'drawer') await page.locator('#sidebar .app-toggle').first().click();
  const text = await page.evaluate(() => {
    const parts = [];
    document.querySelectorAll('p, li, h1, h2, h3, dd, legend, label, button, a, .val-q, .sum-q, span.tile-count').forEach(el => {
      if (el.closest('[hidden], .sr-only')) return;
      const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return;
      if (el.querySelector('p, li')) return;
      const t = el.innerText.replace(/\s+/g, ' ').trim();
      if (t) parts.push(t);
    });
    return parts;
  });
  const out = [];
  for (const t of text) {
    for (const s of t.split(/(?<=[.!?])\s+(?=[A-Z0-9"])/)) {
      const w = s.split(/\s+/).filter(Boolean).length;
      const j = s.match(JARGON);
      if ((w > 20 || j) && !seen.has(s)) { seen.add(s); out.push(`[${w}w${j ? ' jargon:' + j[0] : ''}] ${s}`); }
    }
  }
  console.log('\n== ' + rr); out.forEach(o => console.log('  ' + o.slice(0, 330)));
}
await browser.close();
