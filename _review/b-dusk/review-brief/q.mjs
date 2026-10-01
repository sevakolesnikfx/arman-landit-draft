import fs from 'fs'; import vm from 'vm';
const root = '/Users/armanbayatmaku/Desktop/landit-test/shared/';
const ctx = { window: {}, console, Intl }; vm.createContext(ctx);
for (const f of ['data.js','match.js','content.js','chat.js']) vm.runInContext('var window = this.window;\n'+fs.readFileSync(root+f,'utf8'), ctx);
const L = ctx.window.LANDIT;
globalThis.L = L;
const code = process.argv[2];
console.log(eval(code));
