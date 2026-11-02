import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const inputs=JSON.parse(await readFile('evidence/build-inputs.json','utf8'));
assert.ok(inputs.every(p=>!p.startsWith('server/')),'server module bundled');
const js=await readFile('dist/app.js','utf8');
for(const token of ['YOUCAM_API_KEY','Bearer ','yce-api-01.makeupar.com','TEST_ONLY_NOT_A_REAL_SECRET','node:sqlite'])assert.ok(!js.includes(token),`client contains ${token}`);
for(const file of ['server/index.mjs','server/http.mjs','server/manager.mjs','server/adapters.mjs','server/live.mjs','server/live-runtime.mjs']){
 const text=await readFile(file,'utf8');
 for(const line of text.split('\n').filter(l=>/console\./.test(l)))assert.ok(!/apiKey|headers|payload|process\.env|error\)/.test(line),'unsafe logging');
}
console.log('PASS: no server imports or credential identifiers in client; no secret-bearing log statements.');
