// Offline failure/GUI review. All responses are invented; there is no network fallback.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fixtureConfig,fixtureTransport} from '../test/live-fixture.mjs';
import {createLiveRuntime} from '../server/live-runtime.mjs';
import {createApp} from '../server/http.mjs';
const args=process.argv.slice(2);
if(args.some(x=>!['--full-demo','--failure','--missing-result'].includes(x)))throw Error('Unknown fixture option');
const failure=args.includes('--failure'),missing=args.includes('--missing-result');
const directory=resolve('.data/review-fixture',failure?'failure':'success');await mkdir(directory,{recursive:true});
const config=await fixtureConfig(directory,args.includes('--full-demo')?'full-demo':'quality-gate');
config.revision=failure?'review-failure-v1':'review-success-v1';
const calls=[],transport=fixtureTransport(calls);
const runtime=await createLiveRuntime({enabled:true,config,baseDir:directory,dataDir:resolve(directory,'store'),apiKey:'TEST_ONLY_NOT_A_REAL_SECRET',mode:'fixture',pollMs:1,fetchImpl:async(url,init)=>{
 if(failure&&init.method==='POST'){calls.push({method:'POST'});return new Response('{}',{status:401});}
 return transport(url,init);
}});
const app=createApp(runtime.manager,{...runtime,assetReader:path=>missing&&path.startsWith('/results/')?null:runtime.assetReader(path)});
app.listen(4185,'127.0.0.1',()=>console.log('Offline review fixture: http://127.0.0.1:4185; no external requests.'));
let closing=false;
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{
 if(closing)return;closing=true;app.close();await runtime.close();
 await writeFile(resolve(directory,'transport-counts.json'),JSON.stringify({providerRequests:0,fixturePosts:calls.filter(c=>c.method==='POST').length,fixtureGets:calls.filter(c=>c.method==='GET').length},null,2)+'\n');
});
