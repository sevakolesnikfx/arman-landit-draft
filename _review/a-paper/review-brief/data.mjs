import fs from 'node:fs';
import vm from 'node:vm';
const S = '/Users/armanbayatmaku/Desktop/landit-test/shared/';
const ctx = { window: {}, console };
ctx.window.window = ctx.window;
vm.createContext(ctx);
for (const f of ['data.js', 'match.js', 'content.js', 'chat.js']) vm.runInContext(fs.readFileSync(S + f, 'utf8'), ctx, { filename: f });
const L = ctx.window.LANDIT;
export default L;
