/* People-lens review: find long sentences in visible text on each route. */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = pathToFileURL(path.resolve(HERE, '../../../a-paper/index.html')).href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const routes = ['?reset=1#/login', '?reset=1#/register', '?reset=1#/questions', '?reset=1#/ack', '?demo=1#/chat', '?demo=1#/benefits', '?demo=1#/benefit/council-tax-student', '?demo=1#/benefit/uni-hardship-fund', '?demo=1#/community', '?demo=1#/community/ratings', '?demo=1#/settings'];
const seen = new Set();
for (const r of routes) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage();
  await p.goto(INDEX + r, { waitUntil: 'load' }); await p.waitForTimeout(500);
  await p.evaluate(() => { document.querySelectorAll('details').forEach(d => d.open = true); });
  const text = await p.evaluate(() => document.getElementById('root').innerText);
  const sents = text.split(/\n+/).flatMap(l => l.split(/(?<=[.!?:;])\s+(?=[A-Z"])/));
  const long = sents.map(s => s.trim()).filter(s => s.split(/\s+/).length > 20 && !seen.has(s));
  long.forEach(s => seen.add(s));
  console.log('\n== ' + r);
  long.forEach(s => console.log('  [' + s.split(/\s+/).length + 'w] ' + s));
  await c.close();
}
await browser.close();
