/* Headings outline and accessible-name problems per route. */
import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const routes = [
  ['login', 'reset=1', '/login'], ['chat', 'demo=1', '/chat'], ['benefits', 'demo=1', '/benefits'],
  ['benefit', 'demo=1', '/benefit/railcard-16-25'], ['community', 'demo=1', '/community'], ['settings', 'demo=1', '/settings'],
];
for (const size of ['desktop', 'phone']) {
  for (const [name, q, h] of routes) {
    const { ctx, page } = await open(browser, size, q, h);
    const r = await page.evaluate(() => {
      const vis = el => !el.closest('[hidden], [inert]') && el.getClientRects().length;
      const heads = [...document.querySelectorAll('h1,h2,h3,h4,[role=heading]')].filter(vis).map(e => e.tagName[1] + ':' + e.textContent.trim().replace(/\s+/g, ' ').slice(0, 45));
      const noName = [];
      document.querySelectorAll('button, a[href], input, select, textarea, [role=switch], [role=tab]').forEach(el => {
        if (!vis(el)) return;
        const lab = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') && el.getAttribute('aria-labelledby').split(' ').map(i => (document.getElementById(i) || {}).textContent || '').join(' ') || (el.labels && [...el.labels].map(l => l.textContent).join(' ')) || el.textContent || el.getAttribute('title') || el.getAttribute('placeholder');
        if (!lab || !lab.trim()) noName.push(el.outerHTML.slice(0, 100));
      });
      // landmarks
      const lms = [...document.querySelectorAll('main, nav, aside, header, footer, [role=region], section[aria-labelledby]')].filter(vis).map(e => e.tagName.toLowerCase() + (e.getAttribute('aria-label') ? '(' + e.getAttribute('aria-label') + ')' : ''));
      const mains = document.querySelectorAll('main').length;
      return { heads, noName, mains, lms: lms.slice(0, 12) };
    });
    console.log(`\n== ${size} ${name}: main x${r.mains}`);
    console.log('  headings: ' + r.heads.join(' | '));
    if (r.noName.length) console.log('  NO NAME: ' + r.noName.join('\n           '));
    if (size === 'desktop' && name === 'benefits') console.log('  landmarks: ' + r.lms.join(', '));
    await ctx.close();
  }
}
await browser.close();
