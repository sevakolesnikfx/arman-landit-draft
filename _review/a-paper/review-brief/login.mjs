import { chromium, open } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const { ctx, page } = await open(browser, 'desktop', '?demo=1#/settings');
await page.click('#s-account [data-act=sign-out]'); await page.waitForTimeout(400);
await page.fill('#login-email', 'amara@example.co'); await page.fill('#login-pass', 'x');
await page.click('form[data-form=login] button[type=submit]'); await page.waitForTimeout(500);
console.log('after typo login:', await page.evaluate(() => JSON.stringify({ hash: location.hash, user: PAPER.state.user, tracked: PAPER.state.tracked.length, profile: PAPER.state.profile, ack: PAPER.state.ack })));
await page.screenshot({ path: '/Users/armanbayatmaku/Desktop/landit-test/_review/a-paper/review-brief/shots/typo-login-desktop.png' });
// can the old account be recovered?
await page.click('[data-act=acct-menu]'); await page.waitForTimeout(200);
await page.click('#acct-menu [data-act=sign-out]'); await page.waitForTimeout(300);
await page.fill('#login-email', 'amara@example.com'); await page.fill('#login-pass', 'x');
await page.click('form[data-form=login] button[type=submit]'); await page.waitForTimeout(500);
console.log('after correct login:', await page.evaluate(() => JSON.stringify({ hash: location.hash, user: PAPER.state.user, tracked: PAPER.state.tracked.length, profile: PAPER.state.profile })));
// reduced motion css + focus style
const css = await page.evaluate(() => { let rm = 0, rt = 0; for (const s of document.styleSheets) { try { for (const r of s.cssRules) { if (r.conditionText && /reduced-motion/.test(r.conditionText)) rm++; if (r.conditionText && /reduced-transparency/.test(r.conditionText)) rt++; } } catch (e) {} } return { rm, rt }; });
console.log('css media', css);
await ctx.close(); await browser.close();
