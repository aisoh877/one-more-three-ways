import test from 'node:test';
import {request} from 'node:http';
import assert from 'node:assert/strict';
import {TaskStore} from '../server/store.mjs';
import {TaskManager} from '../server/manager.mjs';
import {MockAdapter} from '../server/adapters.mjs';
import {createApp} from '../server/http.mjs';
test('local HTTP API handles reload/cache, origin guards and private file isolation',async()=>{
 const store=new TaskStore(':memory:'),manager=new TaskManager(store,new MockAdapter({latency:1}));const app=createApp(manager);
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${app.address().port}`;
 try{
 const post=()=>fetch(base+'/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({outfitId:'denim',topId:'sage'})}).then(r=>r.json());
 const [a,b]=await Promise.all([post(),post()]);assert.equal(a.id,b.id);await manager.idle();
 const data=await fetch(base+'/api/tasks').then(r=>r.json());assert.equal(data.mode,'mock');assert.equal(data.liveEnabled,false);assert.equal(data.tasks.length,1);assert.equal(data.tasks[0].id,a.id);assert.equal(data.tasks[0].status,'succeeded');assert.equal('remoteId'in data.tasks[0],false);
 for(const path of ['/server/adapters.mjs','/.env','/.data/tasks.sqlite','/package.json'])assert.equal((await fetch(base+path)).status,404);
 assert.equal((await fetch(base+'/api/tasks',{headers:{Origin:'https://evil.invalid'}})).status,403);
 const badHost=await new Promise((resolve,reject)=>{const req=request(base+'/api/tasks',{headers:{Host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(badHost,403);
 assert.equal((await fetch(base+'/api/tasks',{method:'POST',body:'{}'})).status,415);
 assert.equal((await fetch(base+'/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad'})).status,400);
 assert.equal((await fetch(base+'/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:'"'+ 'a'.repeat(2100)+'"'})).status,413);
 const page=await fetch(base+'/');assert.equal(page.status,200);assert.ok(page.headers.get('content-security-policy').includes("connect-src 'self'"));assert.equal((await fetch(base+'/assets/denim-sage.svg')).status,200);
 }finally{await manager.stop();await new Promise(resolve=>app.close(resolve));store.close();}
});

test('malformed absolute request targets return 400 and the server keeps serving',async()=>{
 const store=new TaskStore(':memory:'),manager=new TaskManager(store,new MockAdapter()),app=createApp(manager);
 await new Promise(r=>app.listen(0,'127.0.0.1',r));const port=app.address().port;
 try{
  const status=await new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path:'http://[',headers:{Host:`127.0.0.1:${port}`}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
  assert.equal(status,400);assert.equal((await fetch(`http://127.0.0.1:${port}/api/tasks`)).status,200);
 }finally{await manager.stop();await new Promise(r=>app.close(r));store.close();}
});

test('paused fixture runtime exposes pause state and rejects a new pair without transport',async()=>{
 const store=new TaskStore(':memory:');let posts=0;
 const manager=new TaskManager(store,{mode:'fixture',submit:async()=>{posts++;throw Error('private');}},{maxActive:1});
 manager.create({outfitId:'denim',topId:'sage'});await manager.idle();
 const app=createApp(manager,{presentation:{mode:'fixture',liveEnabled:false}});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;
 try{
  const state=await fetch(base+'/api/tasks').then(r=>r.json());assert.equal(state.submissionsPaused,true);
  const response=await fetch(base+'/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({outfitId:'tailored',topId:'sage'})});
  assert.equal(response.status,409);assert.equal(posts,1);assert.equal(store.list().length,1);assert.ok(!(await response.text()).includes('private'));
 }finally{await manager.stop();await new Promise(r=>app.close(r));store.close();}
});
