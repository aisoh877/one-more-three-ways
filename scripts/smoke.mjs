// Local-only entry-point smoke test. Start npm run dev first.
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {writeFile} from 'node:fs/promises';
import {outfits,tops} from '../shared/catalog.mjs';
const base='http://127.0.0.1:4173',began=performance.now();
const page=await fetch(base);assert.equal(page.status,200);
const create=(outfitId,topId)=>fetch(base+'/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({outfitId,topId})}).then(r=>{assert.equal(r.status,200);return r.json();});
const [first,duplicate]=await Promise.all([create('denim','sage'),create('denim','sage')]);assert.equal(first.id,duplicate.id);
const results=await Promise.all(outfits.flatMap(o=>tops.map(t=>create(o.id,t.id))));assert.equal(new Set(results.map(t=>t.id)).size,9);
let data,peak=0;
for(let i=0;i<40;i++){
 data=await fetch(base+'/api/tasks').then(r=>r.json());const active=data.tasks.filter(t=>t.status==='running').length;peak=Math.max(peak,active);assert.ok(active<=2);
 if(data.tasks.filter(t=>t.scenario==='success'&&t.status==='succeeded').length===9)break;
 await delay(100);
}
assert.equal(data.mode,'mock');assert.equal(data.liveEnabled,false);assert.equal(data.tasks.filter(t=>t.scenario==='success'&&t.status==='succeeded').length,9);
// Failure-lab receipts have no result image; validate only successful comparisons.
for(const task of data.tasks.filter(t=>t.scenario==='success'&&t.status==='succeeded')){const asset=await fetch(base+task.resultURL);assert.equal(asset.status,200);assert.ok((await asset.text()).includes('MOCK'));}
const reload=await fetch(base+'/api/tasks').then(r=>r.json());assert.equal(reload.tasks.find(t=>t.id===first.id).id,first.id);
const evidence={measuredAt:new Date().toISOString(),runtime:process.version,base,elapsedMs:Math.round(performance.now()-began),htmlStatus:page.status,successfulCombinations:9,duplicateRequestsSameId:true,reloadReceiptSameId:true,observedPeakRunning:peak,localSvgResponses:9,mode:data.mode,liveEnabled:data.liveEnabled,realYouCamCalls:0,browserInteractionMeasured:false};
await writeFile(process.argv[2]??'evidence/local-smoke.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
