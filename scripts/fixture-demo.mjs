// Offline integration QA only: fabricated credentials/responses, no network fallback.
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fixtureConfig,fixtureTransport} from '../test/live-fixture.mjs';
import {createLiveRuntime} from '../server/live-runtime.mjs';
import {createApp} from '../server/http.mjs';
const directory=resolve('.data/fixture');await mkdir(directory,{recursive:true});
const config=await fixtureConfig(directory,process.argv.includes('--full-demo')?'full-demo':'quality-gate');
const runtime=await createLiveRuntime({enabled:true,config,baseDir:directory,dataDir:resolve(directory,'store'),apiKey:'TEST_ONLY_NOT_A_REAL_SECRET',fetchImpl:fixtureTransport(),mode:'fixture',pollMs:1});
const app=createApp(runtime.manager,runtime);app.listen(4175,'127.0.0.1',()=>console.log('Offline integration fixture: http://127.0.0.1:4175 (no external requests)'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{app.close();await runtime.close();});
