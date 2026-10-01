import { chromium, open, scan, DISC, SHOTS } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const out = [];
const log = (k, v) => { out.push(k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v))); };
for (const size of ['phone', 'desktop']) {
  const { ctx, page, errs } = await open(browser, size, '?demo=1#/settings');
  await page.screenshot({ path: SHOTS + 'settings-' + size + '.png' });
  const s0 = await page.evaluate(() => ({ sections: [...document.querySelectorAll('.set-sec h2')].map(h => h.innerText), answers: [...document.querySelectorAll('#s-answers .set-row')].map(r => r.innerText.replace(/\n+/g, ' / ')), details: [...document.querySelectorAll('#s-details .set-row')].map(r => r.innerText.replace(/\n+/g, ' / ')), themes: [...document.querySelectorAll('.theme-opt')].map(t => t.innerText.replace(/\n+/g, ' ')), about: document.querySelector('#s-about')?.innerText }));
  log(size + ' settings', s0);
  // edit name
  await page.click('[data-act=edit-detail][data-key=name]'); await page.waitForTimeout(200);
  await page.fill('#ed-name', 'Amara K'); await page.click('form[data-key=name] button[type=submit]'); await page.waitForTimeout(300);
  log(size + ' name edited', await page.evaluate(() => PAPER.state.user.name + ' / acct=' + document.querySelector('.acct-name')?.innerText));
  // edit status to refugee
  await page.click('[data-act=edit-answer][data-q=status]'); await page.waitForTimeout(400);
  const dlgInfo = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return { title: d.querySelector('.dlg-title').innerText, focus: document.activeElement.value, n: d.querySelectorAll('input[type=radio]').length }; });
  log(size + ' edit dialog', dlgInfo);
  await page.click('dialog[open] .opt:has-text("Refugee or humanitarian protection")');
  await page.click('dialog[open] button[type=submit]'); await page.waitForTimeout(400);
  log(size + ' after status edit toast', await page.evaluate(() => document.getElementById('toast').innerText));
  await page.evaluate(() => { location.hash = '#/benefits'; }); await page.waitForTimeout(500);
  log(size + ' benefits after refugee', await page.evaluate(() => ({ h1: document.querySelector('h1').innerText, nrpf: document.querySelector('.nrpf-line')?.innerText, total: document.querySelector('.total-card')?.innerText.replace(/\n+/g, ' / '), blocked: !!document.getElementById('blocked'), m: (() => { const m = LANDIT.match(PAPER.state.profile); return [m.open.length, m.blocked.length, m.total]; })() })));
  await page.screenshot({ path: SHOTS + 'benefits-refugee-' + size + '.png' });
  // clear status (unknown)
  await page.evaluate(() => { location.hash = '#/settings'; }); await page.waitForTimeout(400);
  await page.click('[data-act=edit-answer][data-q=status]'); await page.waitForTimeout(300);
  await page.click('dialog[open] [data-clear-answer]'); await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/benefits'; }); await page.waitForTimeout(500);
  log(size + ' benefits no status', await page.evaluate(() => ({ h1: document.querySelector('h1').innerText, note: document.querySelector('.soft-note')?.innerText, total: document.querySelector('.total-card')?.innerText.replace(/\n+/g, ' / ') })));
  // theme
  await page.evaluate(() => { location.hash = '#/settings'; }); await page.waitForTimeout(400);
  await page.click('.theme-opt:has-text("Evening")'); await page.waitForTimeout(300);
  log(size + ' theme', await page.evaluate(() => [document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor]));
  await page.screenshot({ path: SHOTS + 'settings-evening-' + size + '.png' });
  await page.click('.theme-opt:has-text("Paper")');
  // text size
  await page.click('.text-opt:has-text("Extra large")'); await page.waitForTimeout(300);
  log(size + ' text', await page.evaluate(() => [document.documentElement.style.fontSize, getComputedStyle(document.querySelector('.set-intro')).fontSize, getComputedStyle(document.querySelector('.d-muted, .lede')).fontSize]));
  await page.click('.text-opt:has-text("Normal")');
  // read aloud off
  await page.click('.switch-row'); await page.waitForTimeout(200);
  log(size + ' readAloud', await page.evaluate(() => PAPER.state.prefs.readAloud));
  await page.evaluate(() => { location.hash = '#/benefit/council-tax-student'; }); await page.waitForTimeout(400);
  log(size + ' speak btn on detail with read aloud off', await page.locator('[data-act=speak]').count());
  await page.evaluate(() => { location.hash = '#/settings'; }); await page.waitForTimeout(400);
  await page.click('.switch-row'); await page.waitForTimeout(200);
  // help section
  log(size + ' help in settings', await page.evaluate(() => ({ groups: [...document.querySelectorAll('#s-help .help-group summary')].map(s => s.innerText.trim()), calls: document.querySelectorAll('#s-help a.call').length, scamQuiz: /quiz/i.test(document.body.innerText) })));
  // language ar
  await page.click('.radio-grid .opt:has-text("العربية")'); await page.waitForTimeout(600);
  log(size + ' lang ar', await page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, nav: [...document.querySelectorAll('.sb-nav a')].map(a => a.innerText.trim()), h1: document.querySelector('h1').innerText, sbLeft: document.getElementById('sidebar').getBoundingClientRect().left, sbRight: document.getElementById('sidebar').getBoundingClientRect().right })));
  await page.screenshot({ path: SHOTS + 'settings-ar-' + size + '.png' });
  await page.evaluate(() => { location.hash = '#/benefits'; }); await page.waitForTimeout(500);
  await page.screenshot({ path: SHOTS + 'benefits-ar-' + size + '.png' });
  await page.evaluate(() => { location.hash = '#/chat'; }); await page.waitForTimeout(500);
  await page.screenshot({ path: SHOTS + 'chat-ar-' + size + '.png' });
  log(size + ' chat ar', await page.evaluate(() => ({ dir: document.documentElement.dir, ph: document.getElementById('chat-input').placeholder, disc: document.querySelector('.dock-disc').innerText.slice(0, 40), sendRect: document.querySelector('.send').getBoundingClientRect().left, inputRect: document.getElementById('chat-input').getBoundingClientRect().left })));
  await page.evaluate(() => { location.hash = '#/settings'; }); await page.waitForTimeout(400);
  await page.click('.radio-grid .opt:has-text("English")'); await page.waitForTimeout(400);
  // sign out
  await page.click('#s-account [data-act=sign-out]'); await page.waitForTimeout(400);
  log(size + ' sign out', await page.evaluate(() => location.hash + ' session=' + PAPER.state.session + ' toast=' + document.getElementById('toast').innerText));
  // protected route after sign out
  await page.evaluate(() => { location.hash = '#/benefits'; }); await page.waitForTimeout(400);
  log(size + ' protected after signout', await page.evaluate(() => location.hash));
  // sign back in
  await page.fill('#login-email', 'amara@example.com'); await page.fill('#login-pass', 'x');
  await page.click('form[data-form=login] button[type=submit]'); await page.waitForTimeout(500);
  log(size + ' sign in back', await page.evaluate(() => location.hash + ' tracked=' + PAPER.state.tracked.length + ' name=' + PAPER.state.user.name));
  // delete account
  await page.evaluate(() => { location.hash = '#/settings'; }); await page.waitForTimeout(400);
  await page.click('[data-act=delete-account]'); await page.waitForTimeout(300);
  const del = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return { text: d.innerText, focus: document.activeElement.innerText }; });
  log(size + ' delete dialog', del);
  await page.screenshot({ path: SHOTS + 'delete-' + size + '.png' });
  await page.click('dialog[open] [data-confirm-yes]'); await page.waitForTimeout(500);
  log(size + ' after delete', await page.evaluate(() => ({ hash: location.hash, ls: Object.keys(localStorage).filter(k => k.startsWith('landit-a')).map(k => localStorage.getItem(k).slice(0, 120)), toast: document.getElementById('toast').innerText })));
  log(size + ' errs', errs);
  await ctx.close();
}
console.log(out.join('\n'));
await browser.close();
