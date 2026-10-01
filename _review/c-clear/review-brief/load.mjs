/* Load the shared LANDIT layer in Node (vm) for data checks. */
import fs from 'node:fs';
import vm from 'node:vm';
const ROOT = '/Users/armanbayatmaku/Desktop/landit-test/shared/';
export function loadLandit() {
  const ctx = { window: {}, console };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  for (const f of ['data.js', 'match.js', 'content.js', 'chat.js']) {
    vm.runInContext(fs.readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
  }
  return ctx.window.LANDIT;
}
