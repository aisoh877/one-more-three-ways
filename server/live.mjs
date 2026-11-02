// Do not run without separate human authorization for credential access and provider traffic.
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {prepareLiveConfig,createLiveRuntime} from './live-runtime.mjs';
import {createApp} from './http.mjs';
try{
 if(process.argv[2]!=='--enable-live'||!process.argv[3])throw Error('EXPLICIT_LIVE_OPT_IN_REQUIRED');
 const configPath=resolve(process.argv[3]),config=JSON.parse(await readFile(configPath,'utf8'));
 // Validate non-secret approvals/assets before reading any credential.
 await prepareLiveConfig(config,{baseDir:dirname(configPath)});
 const port=Number(process.env.PORT??4174);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('INVALID_PORT');
 const runtime=await createLiveRuntime({enabled:true,config,apiKey:process.env.YOUCAM_API_KEY,baseDir:dirname(configPath),dataDir:resolve('.data/live',config.revision)});
 const server=createApp(runtime.manager,runtime);server.on('error',async()=>{await runtime.close();process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log('Live local runtime started. Saved tasks may resume; new comparisons require explicit actions.'));
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{server.close();await runtime.close();});
}catch{console.error('Live startup blocked. Check the approved config, local inputs and server credential privately.');process.exitCode=1;}
