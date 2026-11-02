import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TaskStore} from '../server/store.mjs';
import {TaskManager,publicTask} from '../server/manager.mjs';
import {MockAdapter,LiveAdapter} from '../server/adapters.mjs';
import {AdapterError,safeError} from '../server/errors.mjs';
import {outfits,tops,sourceURL,referenceURL,validateInputURLs} from '../shared/catalog.mjs';
const fast=()=>new MockAdapter({latency:2});
test('9 unique combinations, maximum two workers, simultaneous double-clicks share one receipt',async()=>{
 const store=new TaskStore(':memory:');let calls=0;const adapter=fast(), submit=adapter.submit.bind(adapter);adapter.submit=async t=>{calls++;return submit(t);};
 const manager=new TaskManager(store,adapter);
 const first=Array.from({length:50},()=>manager.create({outfitId:'denim',topId:'sage'}));assert.equal(new Set(first.map(t=>t.id)).size,1);
 for(const o of outfits)for(const t of tops)manager.create({outfitId:o.id,topId:t.id});
 await manager.idle();assert.equal(store.list().length,9);assert.equal(calls,9);assert.equal(manager.peak,2);
 assert.ok(store.list().every(t=>t.status==='succeeded'&&t.remoteId));store.close();
});
test('durable cache survives close/reopen; completed and failed receipts are not resubmitted',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'three-ways-'));const file=join(dir,'tasks.sqlite');let store=new TaskStore(file),manager=new TaskManager(store,fast());
 const good=manager.create({outfitId:'denim',topId:'sage'}),bad=manager.create({outfitId:'denim',topId:'sage',scenario:'timeout'});await manager.idle();await manager.stop();store.close();
 store=new TaskStore(file);const adapter=fast();adapter.submit=()=>assert.fail('must never resubmit');manager=new TaskManager(store,adapter);
 assert.equal(manager.create({outfitId:'denim',topId:'sage'}).id,good.id);assert.equal(manager.create({outfitId:'denim',topId:'sage',scenario:'timeout'}).id,bad.id);
 assert.equal(store.get(bad.id).error.code,'TIMEOUT');store.close();await rm(dir,{recursive:true});
});
test('all local failure paths are sanitized and retained under the same ID',async()=>{
 const store=new TaskStore(':memory:'),manager=new TaskManager(store,fast());
 const expected={failure:'FAILURE',unauthorized:'UNAUTHORIZED',rate_limit:'RATE_LIMIT',timeout:'TIMEOUT',balance:'BALANCE'};
 for(const scenario of Object.keys(expected))manager.create({outfitId:'denim',topId:'ink',scenario});await manager.idle();
 for(const task of store.list()){assert.equal(task.status,'failed');assert.equal(task.error.code,expected[task.scenario]);assert.equal(manager.create(taskInput(task)).id,task.id);}
 assert.equal(safeError(new Error('secret-sentinel')).message.includes('secret-sentinel'),false);store.close();
});
function taskInput(t){return {outfitId:t.outfitId,topId:t.topId,scenario:t.scenario};}
test('allowlist rejects arbitrary URLs, unknown IDs, mixed fields and unknown scenarios',()=>{
 const store=new TaskStore(':memory:'),manager=new TaskManager(store,fast());
 assert.throws(()=>validateInputURLs('https://evil.invalid/photo.jpg',referenceURL('sage')));
 for(const input of [{outfitId:'other',topId:'sage'},{outfitId:'denim',topId:'sage',src_file_url:'https://evil.invalid'},{outfitId:'denim',topId:'sage',scenario:'retry'}])assert.throws(()=>manager.create(input));
 assert.equal(store.list().length,0);store.close();
});
test('restart never repeats an ambiguous live POST; saved upstream task resumes GET',async()=>{
 const store=new TaskStore(':memory:');const base={outfitId:'denim',topId:'sage',src:sourceURL('denim'),ref:referenceURL('sage'),mode:'live',scenario:'success',status:'running'};
 store.insert({...base,id:'uncertain',cacheKey:'a'});store.insert({...base,id:'known',cacheKey:'b',remoteId:'remote-123'});
 let polls=0;const adapter={mode:'live',submit:()=>assert.fail('POST repeated'),poll:async t=>{polls++;assert.equal(t.remoteId,'remote-123');return {status:'succeeded',resultURL:'https://approved.invalid/result.png'};}};
 const manager=new TaskManager(store,adapter);await manager.idle();assert.equal(store.get('uncertain').error.code,'NEEDS_REVIEW');assert.equal(store.get('known').status,'succeeded');assert.equal(polls,1);store.close();
});
test('bounded polling times out without creating a second provider task',async()=>{
 const store=new TaskStore(':memory:');let calls=0,polls=0;
 const adapter={mode:'mock',submit:async()=>{calls++;return 'remote';},poll:async()=>{polls++;return {status:'running'};}};
 const manager=new TaskManager(store,adapter,{pollMs:1,maxPolls:3});manager.create({outfitId:'denim',topId:'sage'});await manager.idle();assert.equal(calls,1);assert.equal(polls,3);assert.equal(store.list()[0].error.code,'TIMEOUT');store.close();
});
const task={id:'local',outfitId:'denim',topId:'sage',src:sourceURL('denim'),ref:referenceURL('sage'),remoteId:'remote/id?x',scenario:'success'};
const assets={[task.src]:'https://approved.invalid/adult.png',[task.ref]:'https://approved.invalid/top.png'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
test('live adapter is disabled by default; no transport invoked with missing credential or mapping',async()=>{
 let called=0;const fetchImpl=async()=>{called++;return json({});};
 await assert.rejects(new LiveAdapter({fetchImpl}).submit(task),e=>e.code==='LIVE_DISABLED');
 await assert.rejects(new LiveAdapter({enabled:true,apiKey:'',fetchImpl}).submit(task),e=>e.code==='UNAUTHORIZED');
 await assert.rejects(new LiveAdapter({enabled:true,apiKey:'test-only',fetchImpl}).submit(task),e=>e.code==='INPUT_NOT_ALLOWLISTED');assert.equal(called,0);
});
test('fake transport verifies V3 path, exact allowlist, Bearer header, upper_body and encoded GET ID',async()=>{
 const calls=[];const adapter=new LiveAdapter({enabled:true,apiKey:'TEST_ONLY_NOT_A_REAL_SECRET',assets,fetchImpl:async(url,init)=>{calls.push({url,init});return init.method==='POST'?json({data:{task_id:'remote/id?x'}}):json({data:{task_status:'success',results:{url:'https://approved.invalid/result.png'}}});}});
 assert.equal(await adapter.submit(task),'remote/id?x');assert.equal((await adapter.poll(task)).status,'succeeded');
 assert.equal(calls[0].url,'https://yce-api-01.makeupar.com/s2s/v2.0/task/cloth-v3');assert.deepEqual(JSON.parse(calls[0].init.body),{src_file_url:assets[task.src],ref_file_url:assets[task.ref],garment_category:'upper_body',change_shoes:false});assert.equal(calls[0].init.headers.Authorization,'Bearer TEST_ONLY_NOT_A_REAL_SECRET');assert.equal(calls[0].init.redirect,'error');assert.ok(calls[1].url.endsWith('/remote%2Fid%3Fx'));
 assert.equal(JSON.stringify(publicTask({...task,apiKey:'sentinel',cacheKey:'private'})).includes('sentinel'),false);
});
test('live 401,429,balance,timeout,protocol and task failure mapping uses only fake transport',async()=>{
 for(const [response,code]of [[json({},401),'UNAUTHORIZED'],[json({},429),'RATE_LIMIT'],[json({},402),'BALANCE'],[json({error_code:'InsufficientCredit'},400),'BALANCE'],[json({data:{}},200),'PROTOCOL'],[json({},500),'FAILURE']]){
 const adapter=new LiveAdapter({enabled:true,apiKey:'test-only',assets,fetchImpl:async()=>response});await assert.rejects(adapter.submit(task),e=>e instanceof AdapterError&&e.code===code);
 }
 const adapter=new LiveAdapter({enabled:true,apiKey:'test-only',assets,fetchImpl:async()=>{throw Error('token-secret');}});await assert.rejects(adapter.submit(task),e=>e.code==='TIMEOUT'&&!e.message.includes('token-secret'));
 for(const state of ['pending','running','queued','processing']){const a=new LiveAdapter({enabled:true,apiKey:'test-only',assets,fetchImpl:async()=>json({data:{task_status:state}})});assert.equal((await a.poll(task)).status,'running');}
 for(const data of [{task_status:'error'},{task_status:'success',results:{url:'javascript:alert(1)'}},{task_status:'unknown'}]){const a=new LiveAdapter({enabled:true,apiKey:'test-only',assets,fetchImpl:async()=>json({data})});await assert.rejects(a.poll(task));}
});

test('non-mock failures pause new POSTs and survive restart while accepted GETs can finish',async()=>{
 for(const code of ['UNAUTHORIZED','RATE_LIMIT','BALANCE','TIMEOUT','PROTOCOL','RESULT_DOWNLOAD','FAILURE']){
  const dir=await mkdtemp(join(tmpdir(),'three-ways-paused-')),path=join(dir,'tasks.sqlite');let store=new TaskStore(path),manager;
  try{
   let posts=0;const adapter={mode:'fixture',submit:async()=>{posts++;throw new AdapterError(code);},poll:()=>assert.fail('unexpected poll')};
   manager=new TaskManager(store,adapter,{maxActive:1});
   const first=manager.create({outfitId:'denim',topId:'sage'}),queued=manager.create({outfitId:'tailored',topId:'sage'});
   await manager.idle();assert.equal(posts,1,code);assert.equal(manager.paused,true);assert.equal(store.get(queued.id).status,'queued');
   assert.equal(manager.create({outfitId:'denim',topId:'sage'}).id,first.id);
   assert.throws(()=>manager.create({outfitId:'weekend',topId:'sage'}),e=>e.code==='RUNTIME_PAUSED');
   store.insert({id:'accepted',cacheKey:'accepted',mode:'fixture',status:'running',remoteId:'known',outfitId:'weekend',topId:'sage'});
   await manager.stop();store.close();store=new TaskStore(path);
   let gets=0;manager=new TaskManager(store,{...adapter,poll:async()=>{gets++;return {status:'succeeded',resultURL:'/fixture.png'};}});
   await manager.idle();assert.equal(posts,1);assert.equal(gets,1);assert.equal(store.get(queued.id).status,'queued');assert.equal(manager.paused,true);
  }finally{await manager?.stop();store.close();await rm(dir,{recursive:true});}
 }
});

test('invalid provider JSON roots fail with sanitized protocol error',async()=>{
 for(const body of [null,[],42,'PRIVATE_RESPONSE']){
  const adapter=new LiveAdapter({enabled:true,apiKey:'test-only',assets,fetchImpl:async()=>json(body)});
  await assert.rejects(adapter.submit(task),e=>e.code==='PROTOCOL'&&!e.message.includes('PRIVATE_RESPONSE'));
 }
});
