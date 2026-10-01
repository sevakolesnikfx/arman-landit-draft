/* Chat sweep: typed questions, starters, suggestions (breadth first, 2 levels).
   Checks reply text, cards (amount + qualifier), disclaimer placement and
   visibility after cards, read aloud and voice typing controls. */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
import { findBanned } from '../../../tools/content-rules.mjs';
import { loadLandit } from './load.mjs';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-brief';
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const L = loadLandit();
const sizeArg = process.argv[2] || 'desktop';
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce' },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' },
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext(SIZES[sizeArg]);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto(BASE + '?demo=1#/chat', { waitUntil: 'load' });
await page.waitForSelector('#chat-input');

const typed = ['What can I claim?', 'railcard', 'oyster', 'hardship fund', 'GP', 'council tax reduction', 'food bank', 'which documents do I need',
  'travel', 'health', 'bills', 'childcare', 'food', 'council tax', 'no recourse to public funds', 'how does tracking work', 'I am in danger', 'abuse', 'emergency',
  'hello', 'thanks', 'what can you do', 'policy', 'asdf qwerty', 'universal credit', 'how much money can I get', 'am I entitled to PIP'];

const findings = [];
const seenSug = new Set();
const queue = [];
async function ask(text) {
  const before = await page.locator('.msg-bot').count();
  await page.fill('#chat-input', text);
  await page.click('.send-btn');
  await page.waitForFunction(n => document.querySelectorAll('.msg-bot').length > n, before, { timeout: 6000 });
  const bot = page.locator('.msg-bot').last();
  const info = await bot.evaluate(el => {
    const sug = el.nextElementSibling && el.nextElementSibling.classList.contains('suggest') ? [...el.nextElementSibling.querySelectorAll('.suggest-btn')].map(b => b.getAttribute('data-text')) : [];
    const cards = [...el.querySelectorAll('.ccard')].map(c => ({ name: c.querySelector('.ccard-name').innerText, val: c.querySelector('.ccard-val').innerText.replace(/\s+/g, ' '), actions: [...c.querySelectorAll('.ccard-actions .btn')].map(b => b.innerText.trim()) }));
    return { text: el.querySelector('.msg-body').innerText, cards, sug, read: !!el.querySelector('.read-btn'), help: !!el.querySelector('.help-now-btn') };
  });
  return info;
}
const log = [];
for (const t of typed) {
  const r = await ask(t);
  log.push({ q: t, ...r });
  r.sug.forEach(s => { if (!seenSug.has(s)) { seenSug.add(s); queue.push(s); } });
}
let n = 0;
while (queue.length && n < 40) {
  const s = queue.shift(); n++;
  // click the suggestion button if visible, else type it
  const btn = page.locator('.suggest').last().locator(`.suggest-btn[data-text="${s.replace(/"/g, '\\"')}"]`);
  let r;
  if (await btn.count()) {
    const before = await page.locator('.msg-bot').count();
    await btn.click();
    await page.waitForFunction(x => document.querySelectorAll('.msg-bot').length > x, before, { timeout: 6000 });
    const bot = page.locator('.msg-bot').last();
    r = await bot.evaluate(el => {
      const sug = el.nextElementSibling && el.nextElementSibling.classList.contains('suggest') ? [...el.nextElementSibling.querySelectorAll('.suggest-btn')].map(b => b.getAttribute('data-text')) : [];
      const cards = [...el.querySelectorAll('.ccard')].map(c => ({ name: c.querySelector('.ccard-name').innerText, val: c.querySelector('.ccard-val').innerText.replace(/\s+/g, ' '), actions: [...c.querySelectorAll('.ccard-actions .btn')].map(b => b.innerText.trim()) }));
      return { text: el.querySelector('.msg-body').innerText, cards, sug, read: !!el.querySelector('.read-btn'), help: !!el.querySelector('.help-now-btn') };
    });
  } else r = await ask(s);
  log.push({ q: s, viaSuggestion: true, ...r });
  r.sug.forEach(x => { if (!seenSug.has(x)) { seenSug.add(x); queue.push(x); } });
}

// checks
for (const e of log) {
  const all = e.text + ' ' + e.cards.map(c => c.name + ' ' + c.val).join(' ') + ' ' + e.sug.join(' ');
  if (/[–—]/.test(all)) findings.push(['dash', e.q]);
  const b = findBanned(all); if (b.length) findings.push(['banned', e.q, b.map(x => x.term).join(',')]);
  if (/\byou (will|can|are entitled|qualify)\b/i.test(e.text)) findings.push(['promise?', e.q, e.text.match(/.{0,60}\byou (will|can|are entitled|qualify)\b.{0,60}/i)[0]]);
  for (const c of e.cards) {
    if (/£\s?[\d,.]+/.test(c.val) && c.val.trim().match(/^£[\d,.]+$/)) findings.push(['bare amount on card', e.q, c.name, c.val]);
    if (c.actions.join('|') !== 'Open|Track|Share' && c.actions.join('|') !== 'Open|Tracking|Share') findings.push(['card actions', e.q, c.name, c.actions.join('|')]);
    // compare to data
    const bb = L.benefits.find(x => x.name === c.name);
    if (!bb) findings.push(['card name not in data', c.name]);
    else {
      const v = L.valueParts(bb);
      const want = v.amount ? (v.amount + (v.label ? ' ' + v.label : '')) : (v.label || 'No set amount');
      if (c.val.trim() !== want) findings.push(['card value mismatch', c.name, c.val, want]);
    }
  }
  if (/£\s?[\d,]+/.test(e.text)) {
    const amts = e.text.match(/.{0,60}£\s?[\d,.]+.{0,60}/g);
    findings.push(['amount in text (check qualifier)', e.q, amts.join(' || ')]);
  }
  if (!e.read) findings.push(['no read aloud on reply', e.q]);
}

// disclaimer placement after many messages
const disc = await page.evaluate(d => {
  const els = [...document.querySelectorAll('p')].filter(p => p.textContent.trim() === d);
  return els.map(p => { const r = p.getBoundingClientRect(); const cs = getComputedStyle(p); return { cls: p.className, top: r.top + scrollY, h: r.height, vis: cs.visibility, disp: cs.display, fs: cs.fontSize, docH: document.documentElement.scrollHeight, vh: innerHeight }; });
}, L.disclaimer);
await page.screenshot({ path: `${OUT}/chat-after-sweep-${sizeArg}.png`, fullPage: false });
fs.writeFileSync(`${OUT}/chat-sweep-${sizeArg}.json`, JSON.stringify({ log, findings, disc, errs }, null, 1));
console.log('messages', log.length, 'suggestions explored', n);
for (const f of findings) console.log(JSON.stringify(f).slice(0, 400));
console.log('disclaimer', JSON.stringify(disc));
console.log('errors', errs);
await browser.close();
