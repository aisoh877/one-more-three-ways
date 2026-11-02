// Future opt-in runtime. Importing this module never reads credentials or makes requests.
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {TaskStore} from './store.mjs';
import {TaskManager} from './manager.mjs';
import {LiveAdapter,validFileId} from './adapters.mjs';
import {AdapterError} from './errors.mjs';
import {outfits,tops,liveOutfits,liveTops,sourceURL,referenceURL} from '../shared/catalog.mjs';
const limit=10*1024*1024;
const keys=[...outfits.map(o=>sourceURL(o.id)),...tops.map(t=>referenceURL(t.id))];
export function imageType(bytes){
 if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'image/webp';
 throw new Error('RASTER_IMAGE_REQUIRED');
}
function publicURL(raw){
 const u=new URL(raw);
 if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search||u.port||!u.hostname.includes('.')||/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)||u.hostname.startsWith('['))throw new Error('APPROVED_PUBLIC_HTTPS_REQUIRED');
 return u;
}
export async function prepareLiveConfig(config,{baseDir=process.cwd()}={}){
 if(config?.approvedForLive!==true||!['quality-gate','full-demo'].includes(config.phase)||!/^[-a-zA-Z0-9_]{1,64}$/.test(config.revision??''))throw new Error('LIVE_CONFIG_NOT_APPROVED');
 if(config.phase==='full-demo'&&config.qualityGatePassed!==true)throw new Error('QUALITY_GATE_REQUIRED');
 if(!config.assets||Object.keys(config.assets).length!==keys.length||keys.some(k=>!Object.hasOwn(config.assets,k)))throw new Error('SIX_APPROVED_INPUTS_REQUIRED');
 if(!Array.isArray(config.resultOrigins)||!config.resultOrigins.length)throw new Error('RESULT_ORIGINS_REQUIRED');
 const origins=config.resultOrigins.map(x=>{const u=publicURL(x);if(u.origin!==x)throw new Error('EXACT_RESULT_ORIGIN_REQUIRED');return x;});
 const files=new Map(),assets={},images={};const hash=createHash('sha256').update(config.revision);
 for(const key of keys){
  const entry=config.assets[key];
  if(!entry||typeof entry!=='object'||Array.isArray(entry))throw new Error('LOCAL_INPUT_REQUIRED');
  const hasURL=Object.hasOwn(entry,'publicURL'),hasId=Object.hasOwn(entry,'fileId');
  if(hasURL&&hasId)throw new Error('EXACTLY_ONE_REMOTE_INPUT_REQUIRED');
  if(hasId){if(!validFileId(entry.fileId))throw new Error('INVALID_FILE_ID');assets[key]=Object.freeze({fileId:entry.fileId});}
  else if(hasURL)assets[key]=publicURL(entry.publicURL).href;
  else if(config.phase!=='quality-gate'||!['/assets/top-ink.svg','/assets/top-clay.svg'].includes(key))throw new Error('REMOTE_INPUT_REQUIRED');
  if(typeof entry.localFile!=='string'||!entry.localFile)throw new Error('LOCAL_INPUT_REQUIRED');
  const bytes=await readFile(resolve(baseDir,entry.localFile));if(bytes.length>limit)throw new Error('IMAGE_TOO_LARGE');
  const type=imageType(bytes);if(type==='image/webp')throw new Error('PNG_OR_JPEG_INPUT_REQUIRED');
  const path='/inputs/'+key.split('/').pop().replace('.svg',type==='image/png'?'.png':'.jpg');
  files.set(path,{body:bytes,type});images[key]=path;hash.update(key).update(typeof assets[key]==='string'?assets[key]:JSON.stringify(assets[key]??null)).update(bytes);
 }
 const allowedPairs=outfits.flatMap(o=>tops.filter(t=>config.phase==='full-demo'||t.id==='sage').map(t=>`${o.id}:${t.id}`));
 return {assets,images,files,origins,allowedPairs,phase:config.phase,revision:hash.digest('hex')};
}
export class ResultCache{
 constructor(directory,origins,{fetchImpl=fetch}={}){this.directory=resolve(directory);this.origins=new Set(origins);this.fetchImpl=fetchImpl;}
 async save(id,raw){
  try{
   if(!/^[a-f0-9-]{36}$/.test(id))throw Error();
   const url=new URL(raw);
   if(url.protocol!=='https:'||url.username||url.password||url.hash||!this.origins.has(url.origin))throw Error();
   // No bearer header goes to storage; no redirects or arbitrary proxy route.
   const response=await this.fetchImpl(url.href,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'image/png,image/jpeg,image/webp'}});
   const type=response.headers.get('content-type')?.split(';')[0].trim();
   if(!response.ok||!['image/png','image/jpeg','image/webp'].includes(type)||Number(response.headers.get('content-length'))>limit||!response.body)throw Error();
   const reader=response.body.getReader(),chunks=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error();chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
   const body=Buffer.concat(chunks);if(imageType(body)!==type)throw Error();
   const extension={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'}[type];
   await mkdir(this.directory,{recursive:true});const path=resolve(this.directory,id+extension),tmp=path+'.tmp';
   await writeFile(tmp,body,{mode:0o600});await rename(tmp,path);return '/results/'+id+extension;
  }catch{throw new AdapterError('RESULT_DOWNLOAD');}
 }
 async read(path){
  if(!/^\/results\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(path))return null;
  try{return {body:await readFile(resolve(this.directory,path.slice('/results/'.length))),type:{'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'}[extname(path)]};}catch{return null;}
 }
}
export async function createLiveRuntime({enabled=false,config,apiKey,baseDir=process.cwd(),dataDir,fetchImpl=fetch,mode='live',pollMs=10000,maxPolls=18}={}){
 if(!enabled)throw new Error('LIVE_DISABLED');
 const prepared=await prepareLiveConfig(config,{baseDir});
 if(typeof apiKey!=='string'||!apiKey.trim())throw new Error('SERVER_CREDENTIAL_REQUIRED');
 if(!dataDir||!['live','fixture'].includes(mode))throw new Error('SEPARATE_STORE_REQUIRED');
 const directory=resolve(dataDir,prepared.revision);if(resolve(dataDir)===resolve('.data'))throw new Error('SEPARATE_STORE_REQUIRED');
 const cache=new ResultCache(resolve(directory,'results'),prepared.origins,{fetchImpl});
 const adapter=new LiveAdapter({enabled:true,apiKey,assets:prepared.assets,fetchImpl,saveResult:(id,url)=>cache.save(id,url)});adapter.mode=mode;
 const store=new TaskStore(resolve(directory,'tasks.sqlite'));
 let manager;try{manager=new TaskManager(store,adapter,{pollMs,maxPolls,revision:prepared.revision,allowedPairs:prepared.allowedPairs,maxActive:prepared.phase==='quality-gate'?1:2});}catch(error){store.close();throw error;}
 const presentation={mode,liveEnabled:mode==='live',phase:prepared.phase,revision:prepared.revision,images:prepared.images,allowedPairs:prepared.allowedPairs,catalog:{outfits:liveOutfits,tops:liveTops}};
 const assetReader=async path=>prepared.files.get(path)??await cache.read(path);
 return {manager,presentation,assetReader,close:async()=>{await manager.stop();store.close();}};
}
