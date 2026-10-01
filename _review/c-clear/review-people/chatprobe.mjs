/* Chat: where is the disclaimer and composer once a conversation exists; how much reading room is left. */
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-people/';
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 } },
  xl360: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true },
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop', 'xl360']) {
  const ctx = await browser.newContext({ ...SIZES[size], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '?demo=1' + (size === 'xl360' ? '&text=xlarge' : '') + '#/chat', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const empty = await page.evaluate(() => {
    const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
    return { starters: r('.starters'), firstStarter: r('.starter'), disc: r('.composer-disclaimer'), vh: innerHeight };
  });
  console.log(size, 'EMPTY', JSON.stringify(empty));
  await page.fill('#chat-input', 'What can I claim?');
  await page.click('.send-btn');
  await page.waitForTimeout(500);
  const info = async label => {
    const v = await page.evaluate(() => {
      const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
      return { wrap: r('.composer-wrap'), box: r('.composer-box'), disc: r('.composer-disclaimer'), tabbar: r('.tabbar'), vh: innerHeight, scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight };
    });
    console.log(size, label, JSON.stringify(v));
  };
  await info('after-reply');
  await page.screenshot({ path: OUT + 'chatprobe-' + size + '-reply.png' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await page.waitForTimeout(200);
  await info('mid-scroll');
  await page.screenshot({ path: OUT + 'chatprobe-' + size + '-mid.png' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(200);
  await info('bottom');
  await page.screenshot({ path: OUT + 'chatprobe-' + size + '-bottom.png' });
  await ctx.close();
}
await browser.close();
