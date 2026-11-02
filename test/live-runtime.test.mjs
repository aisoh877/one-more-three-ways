import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareLiveConfig,createLiveRuntime,ResultCache} from '../server/live-runtime.mjs';
import {TaskStore} from '../server/store.mjs';
import {TaskManager} from '../server/manager.mjs';
import {MockAdapter,LiveAdapter} from '../server/adapters.mjs';
import {createApp} from '../server/http.mjs';
import {fixtureConfig,fixtureTransport,png} from './live-fixture.mjs';
const temp=()=>mkdtemp(join(tmpdir(),'three-ways-live-test-'));
test('live config rejects missing approvals, gate bypass, nonpublic URLs and wrong assets before transport',async()=>{
 const dir=await temp();try{
 const config=await fixtureConfig(dir);let called=0;const fetchImpl=async()=>{called++;assert.fail('network');};
 await assert.rejects(createLiveRuntime({config,fetchImpl}),/LIVE_DISABLED/);
 for(const bad of [{...config,approvedForLive:false},{...config,phase:'full-demo',qualityGatePassed:false},{...config,assets:{}},{...config,resultOrigins:['http://localhost']},{...config,resultOrigins:['https://results.example.invalid/path']},{...config,assets:{...config.assets,'/assets/source-denim.svg':{publicURL:'https://127.0.0.1/x',localFile:'fixture.png'}}}])await assert.rejects(prepareLiveConfig(bad,{baseDir:dir}));
 await assert.rejects(createLiveRuntime({enabled:true,config,baseDir:dir,fetchImpl,dataDir:join(dir,'data')}),/CREDENTIAL/);assert.equal(called,0);
 const first=await prepareLiveConfig(config,{baseDir:dir}),second=await prepareLiveConfig({...config,revision:'changed'},{baseDir:dir});assert.notEqual(first.revision,second.revision);assert.equal(first.allowedPairs.length,3);
 }finally{await rm(dir,{recursive:true});}
});
test('V3 -> cache -> HTTP workflow uses fake transport only, preserves receipts across restart and hides signed URLs',async()=>{
 const dir=await temp();let runtime,app;try{
 const config=await fixtureConfig(dir),calls=[];const options={enabled:true,config,baseDir:dir,dataDir:join(dir,'data'),apiKey:'TEST_ONLY_NOT_A_REAL_SECRET',fetchImpl:fixtureTransport(calls),mode:'fixture',pollMs:1};
 runtime=await createLiveRuntime(options);app=createApp(runtime.manager,runtime);await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;
 const post=(topId='sage')=>fetch(base+'/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({outfitId:'denim',topId})});
 assert.equal((await post('ink')).status,400);
 const a=await (await post()).json(),b=await (await post()).json();assert.equal(a.id,b.id);await runtime.manager.idle();
 const response=await fetch(base+'/api/tasks'),data=await response.json();assert.equal(data.mode,'fixture');assert.equal(data.liveEnabled,false);assert.equal(data.allowedPairs.length,3);assert.equal(data.tasks[0].status,'succeeded');
 const serialized=JSON.stringify(data);for(const secret of ['TEST_ONLY','signature','results.example.invalid','inputs.example.invalid','remoteId'])assert.equal(serialized.includes(secret),false);
 assert.equal((await fetch(base+data.tasks[0].resultURL)).status,200);assert.equal((await fetch(base+data.images['/assets/source-denim.svg'])).headers.get('content-type'),'image/png');assert.equal((await fetch(base+'/results/00000000-0000-0000-0000-000000000000.png')).status,404);
 assert.equal(calls.filter(c=>c.method==='POST').length,1);assert.equal(calls.find(c=>c.url.startsWith('https://results.')).authorization,null);
 await new Promise(r=>app.close(r));app=null;await runtime.close();runtime=null;
 const before=calls.length;runtime=await createLiveRuntime(options);assert.equal(runtime.manager.create({outfitId:'denim',topId:'sage'}).id,a.id);await runtime.manager.idle();assert.equal(calls.length,before);
 assert.ok((await runtime.assetReader(data.tasks[0].resultURL)).body.equals(png));
 }finally{if(app)await new Promise(r=>app.close(r));if(runtime)await runtime.close();await rm(dir,{recursive:true});}
});
test('result cache rejects unapproved origins, credentials, redirects/errors, invalid mime and oversized data',async()=>{
 const dir=await temp(),id='00000000-0000-0000-0000-000000000000';try{
 let calls=0;const cache=new ResultCache(dir,['https://results.example.invalid'],{fetchImpl:async()=>{calls++;return new Response(png,{headers:{'Content-Type':'image/png'}});}});
 for(const url of ['http://results.example.invalid/x','https://evil.invalid/x','https://user:pass@results.example.invalid/x','https://results.example.invalid/x#secret'])await assert.rejects(cache.save(id,url),e=>e.code==='RESULT_DOWNLOAD');assert.equal(calls,0);
 for(const response of [new Response('redirect',{status:302}),new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml'}}),new Response('not a png',{headers:{'Content-Type':'image/png'}}),new Response(png,{headers:{'Content-Type':'image/png','Content-Length':'10485761'}}),new Response(new Uint8Array(10485761),{headers:{'Content-Type':'image/png'}})]){
 const c=new ResultCache(dir,['https://results.example.invalid'],{fetchImpl:async()=>response});await assert.rejects(c.save(id,'https://results.example.invalid/x'),e=>e.code==='RESULT_DOWNLOAD');
 }
 assert.equal(await cache.read('/results/../../private'),null);
 }finally{await rm(dir,{recursive:true});}
});
test('download failure saves remote receipt and never repeats a provider POST',async()=>{
 const dir=await temp();let runtime;try{
 const config=await fixtureConfig(dir),calls=[],transport=fixtureTransport(calls);runtime=await createLiveRuntime({enabled:true,config,baseDir:dir,dataDir:join(dir,'data'),apiKey:'test-only',mode:'fixture',fetchImpl:async(u,i)=>String(u).startsWith('https://results.')?new Response('bad',{status:500}):transport(u,i)});
 const task=runtime.manager.create({outfitId:'denim',topId:'sage'});await runtime.manager.idle();const saved=runtime.manager.store.get(task.id);assert.equal(saved.status,'failed');assert.equal(saved.error.code,'RESULT_DOWNLOAD');assert.ok(saved.remoteId);runtime.manager.create({outfitId:'denim',topId:'sage'});await runtime.manager.idle();assert.equal(calls.filter(c=>c.method==='POST').length,1);
 }finally{if(runtime)await runtime.close();await rm(dir,{recursive:true});}
});
test('mixed mode store fails before queued tasks can run',()=>{
 const store=new TaskStore(':memory:');store.insert({id:'foreign',cacheKey:'foreign',mode:'live',status:'queued'});assert.throws(()=>new TaskManager(store,new MockAdapter()),/STORE_MODE_MISMATCH/);assert.equal(store.get('foreign').status,'queued');store.close();
});
test('documented CreditInsufficiency code maps to balance without exposing raw response',async()=>{
 const adapter=new LiveAdapter({enabled:true,apiKey:'test-only',assets:{'/assets/source-denim.svg':'https://inputs.example.invalid/a.png','/assets/top-sage.svg':'https://inputs.example.invalid/b.png'},fetchImpl:async()=>new Response(JSON.stringify({error_code:'CreditInsufficiency',error:'PRIVATE_RESPONSE'}),{status:400})});
 await assert.rejects(adapter.submit({src:'/assets/source-denim.svg',ref:'/assets/top-sage.svg'}),e=>e.code==='BALANCE'&&!e.message.includes('PRIVATE_RESPONSE'));
});

test('quality gate is sequential; approved full demo reuses first three receipts and caps concurrency at two',async()=>{
 const dir=await temp();let runtime;try{
 const config=await fixtureConfig(dir),calls=[];const options={enabled:true,config,baseDir:dir,dataDir:join(dir,'data'),apiKey:'test-only',fetchImpl:fixtureTransport(calls),mode:'fixture'};
 runtime=await createLiveRuntime(options);
 for(const outfitId of ['denim','tailored','weekend'])runtime.manager.create({outfitId,topId:'sage'});
 await runtime.manager.idle();assert.equal(runtime.manager.peak,1);const ids=runtime.manager.store.list().map(t=>t.id);await runtime.close();runtime=null;
 runtime=await createLiveRuntime({...options,config:{...config,phase:'full-demo',qualityGatePassed:true}});
 for(const outfitId of ['denim','tailored','weekend'])for(const topId of ['sage','ink','clay'])runtime.manager.create({outfitId,topId});
 await runtime.manager.idle();assert.equal(runtime.manager.peak,2);assert.equal(runtime.manager.store.list().length,9);assert.equal(calls.filter(c=>c.method==='POST').length,9);assert.ok(ids.every(id=>runtime.manager.store.get(id).status==='succeeded'));
 }finally{if(runtime)await runtime.close();await rm(dir,{recursive:true});}
});

test('reopening a full-demo queue in gate phase cannot dispatch the other candidate pairs',async()=>{
 const store=new TaskStore(':memory:');store.insert({id:'queued-ink',cacheKey:'ink',outfitId:'denim',topId:'ink',mode:'fixture',status:'queued'});
 let calls=0;const adapter={mode:'fixture',submit:async()=>{calls++;return 'remote';},poll:async()=>({status:'succeeded',resultURL:'/unused'})};
 const manager=new TaskManager(store,adapter,{allowedPairs:['denim:sage'],maxActive:1});await manager.idle();assert.equal(calls,0);assert.equal(store.get('queued-ink').status,'queued');await manager.stop();store.close();
});

test('four private file IDs serve six local images, keep IDs server-only and reuse sequential gate receipts',async()=>{
 const dir=await temp();let runtime,app;try{
 const config=await fixtureConfig(dir),calls=[],payloads=[],fake=fixtureTransport(calls);
 for(const [key,entry] of Object.entries(config.assets)){
  delete entry.publicURL;
  if(!['/assets/top-ink.svg','/assets/top-clay.svg'].includes(key))entry.fileId='TEST_FILE_'+Object.keys(config.assets).indexOf(key)+'/a+=';
 }
 const options={enabled:true,config,baseDir:dir,dataDir:join(dir,'data'),apiKey:'test-only',mode:'fixture',fetchImpl:async(u,i)=>{if(i?.method==='POST')payloads.push(JSON.parse(i.body));return fake(u,i);}};
 runtime=await createLiveRuntime(options);
 for(const outfitId of ['denim','tailored','weekend'])runtime.manager.create({outfitId,topId:'sage'});
 await runtime.manager.idle();assert.equal(runtime.manager.peak,1);assert.equal(payloads.length,3);
 for(const p of payloads){assert.ok(p.src_file_id.startsWith('TEST_FILE_'));assert.equal(p.ref_file_id,config.assets['/assets/top-sage.svg'].fileId);assert.equal(p.garment_category,'upper_body');assert.equal(p.change_shoes,false);assert.equal('src_file_url' in p,false);assert.equal('ref_file_url' in p,false);}
 assert.throws(()=>runtime.manager.create({outfitId:'denim',topId:'ink'}),/PAIR_NOT_APPROVED/);
 app=createApp(runtime.manager,runtime);await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const data=await (await fetch(`http://127.0.0.1:${app.address().port}/api/tasks`)).json();
 assert.equal(JSON.stringify(data).includes('TEST_FILE_'),false);
 assert.deepEqual(data.catalog.tops.map(t=>[t.id,t.name]),[['sage','Ivory shirt'],['ink','Blue knit'],['clay','Rust striped top']]);
 assert.equal(data.catalog.outfits[2].name,'Pleated skirt outfit');assert.equal(Object.keys(data.images).length,6);
 await new Promise(r=>app.close(r));app=null;await runtime.close();runtime=null;
 runtime=await createLiveRuntime(options);runtime.manager.create({outfitId:'denim',topId:'sage'});await runtime.manager.idle();assert.equal(payloads.length,3);
 }finally{if(app)await new Promise(r=>app.close(r));if(runtime)await runtime.close();await rm(dir,{recursive:true});}
});

test('private file config rejects ambiguous, invalid and missing active IDs before transport',async()=>{
 const dir=await temp();try{
 const config=await fixtureConfig(dir),key='/assets/source-denim.svg';
 for(const entry of [{localFile:'fixture.png',fileId:'bad id'},{localFile:'fixture.png',fileId:'valid',publicURL:'https://inputs.example.invalid/a.png'},{localFile:'fixture.png'}])await assert.rejects(prepareLiveConfig({...config,assets:{...config.assets,[key]:entry}},{baseDir:dir}));
 const localOnly={...config,phase:'full-demo',qualityGatePassed:true,assets:{...config.assets,'/assets/top-ink.svg':{localFile:'fixture.png'}}};
 await assert.rejects(prepareLiveConfig(localOnly,{baseDir:dir}),/REMOTE_INPUT_REQUIRED/);
 const first=await prepareLiveConfig({...config,assets:{...config.assets,[key]:{localFile:'fixture.png',fileId:'one'}}},{baseDir:dir});
 const second=await prepareLiveConfig({...config,assets:{...config.assets,[key]:{localFile:'fixture.png',fileId:'two'}}},{baseDir:dir});assert.notEqual(first.revision,second.revision);
 }finally{await rm(dir,{recursive:true});}
});

test('adapter supports each documented URL/file-ID mix and rejects ambiguous references without requests',async()=>{
 const task={src:'/assets/source-denim.svg',ref:'/assets/top-sage.svg'};
 for(const src of ['https://inputs.example.invalid/src.png',{fileId:'src/a+='}])for(const ref of ['https://inputs.example.invalid/ref.png',{fileId:'ref_1'}]){
  let sent;const adapter=new LiveAdapter({enabled:true,apiKey:'test-only',assets:{[task.src]:src,[task.ref]:ref},fetchImpl:async(u,i)=>{sent=JSON.parse(i.body);return new Response(JSON.stringify({data:{task_id:'fake'}}));}});
  await adapter.submit(task);assert.equal(Object.keys(sent).length,4);assert.equal(sent[typeof src==='string'?'src_file_url':'src_file_id'],typeof src==='string'?src:src.fileId);assert.equal(sent[typeof ref==='string'?'ref_file_url':'ref_file_id'],typeof ref==='string'?ref:ref.fileId);
 }
 for(const bad of [{fileId:'bad id'},{fileId:'valid',publicURL:'https://inputs.example.invalid/a'},null]){
  const adapter=new LiveAdapter({enabled:true,apiKey:'test-only',assets:{[task.src]:bad,[task.ref]:{fileId:'ref'}},fetchImpl:()=>assert.fail('transport must not run')});
  await assert.rejects(adapter.submit(task),e=>e.code==='INPUT_NOT_ALLOWLISTED');
 }
});
