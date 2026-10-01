import fs from 'fs'; import vm from 'vm';
const root = '/Users/armanbayatmaku/Desktop/landit-test/shared/';
const ctx = { window: {}, console, Intl };
vm.createContext(ctx);
for (const f of ['data.js','match.js','content.js','chat.js']) vm.runInContext('var window = this.window;\n'+fs.readFileSync(root+f,'utf8'), ctx);
const L = ctx.window.LANDIT;
const cx = { profile: L.demo.profile, name: 'Amara', lang: 'en', tracked: L.demo.tracked };
for (const q of [...L.chatStarters(L.demo.profile), 'which documents do I need', 'railcard', 'help with health', 'how does tracking work', 'I am in danger', 'hello', 'what can you do', 'food', 'childcare', 'blah blah']) {
  const r = L.chatReply(q, cx);
  console.log('\n## '+q); console.log(r.paragraphs.join('\n')); console.log('cards:', r.benefitIds.join(', ')); console.log('sugg:', r.suggestions.join(' | '), r.action||'');
}
