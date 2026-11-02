import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadReplay} from '../server/replay-runtime.mjs';
import {createApp} from '../server/http.mjs';
test('recorded API replay serves three saved results and rejects generation',async()=>{
 const runtime=await loadReplay();assert.equal('create'in runtime.manager,false);
 const app=createApp(runtime.manager,runtime);await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;
 try{
  const state=await fetch(base+'/api/tasks').then(r=>r.json());
  assert.equal(state.mode,'replay');assert.equal(state.liveEnabled,false);assert.equal(state.readOnly,true);assert.equal(state.tasks.length,3);assert.equal(state.catalog.tops.length,1);
  assert.equal(/remoteId|file_id|Bearer|https:/.test(JSON.stringify(state)),false);
  for(const path of [...Object.values(state.images),...state.tasks.map(t=>t.resultURL)]){const r=await fetch(base+path);assert.equal(r.status,200);assert.ok((await r.arrayBuffer()).byteLength>1000);}
  assert.equal((await fetch(base+'/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,405);
  assert.equal((await fetch(base+'/inputs/checksums.json')).status,404);
  assert.equal((await fetch(base+'/results/unknown.jpg')).status,404);
  assert.equal((await fetch(base+'/api/tasks',{headers:{origin:'https://example.invalid'}})).status,403);
  assert.equal(runtime.manager.store.list().length,3);
 }finally{await new Promise(r=>app.close(r));}
});
test('replay refuses altered saved assets before serving',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'three-ways-replay-'));
 try{await cp('public/replay',directory,{recursive:true});await writeFile(join(directory,'01-denim-ivory.jpg'),'altered');await assert.rejects(loadReplay(directory),/asset mismatch/);}finally{await rm(directory,{recursive:true,force:true});}
});
