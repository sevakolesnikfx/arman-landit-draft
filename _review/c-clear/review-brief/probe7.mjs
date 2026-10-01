import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-brief';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const text of ['normal', 'xlarge']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '?demo=1&text=' + text + '#/chat', { waitUntil: 'load' });
  await page.fill('#chat-input', 'Help with bills'); await page.keyboard.press('Enter'); await page.waitForSelector('.msg-bot');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const comp = document.querySelector('.composer').getBoundingClientRect();
    const tab = document.querySelector('.tabbar').getBoundingClientRect();
    const top = document.querySelector('.topbar') ? document.querySelector('.topbar').getBoundingClientRect() : null;
    return { composerTop: Math.round(comp.top), composerH: Math.round(comp.height), tabTop: Math.round(tab.top), vh: innerHeight, readable: Math.round(comp.top - (top && top.bottom > 0 ? top.bottom : 0)) };
  });
  console.log(text, JSON.stringify(r));
  await page.screenshot({ path: `${OUT}/chat-${text}-reply-phone.png` });
  await ctx.close();
}
await browser.close();
