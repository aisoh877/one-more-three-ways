// Server-only module. Never import from src/ or shared/.
import {setTimeout as delay} from 'node:timers/promises';
import {resultURL, validateInputURLs} from '../shared/catalog.mjs';
import {AdapterError} from './errors.mjs';
export class MockAdapter {
  mode = 'mock';
  constructor({latency=260}={}) {this.latency=latency;}
  async submit(task) {
    validateInputURLs(task.src,task.ref);
    await delay(this.latency);
    const code={failure:'FAILURE',unauthorized:'UNAUTHORIZED',rate_limit:'RATE_LIMIT',timeout:'TIMEOUT',balance:'BALANCE'}[task.scenario];
    if(code)throw new AdapterError(code);
    return `mock-${task.id}`;
  }
  async poll(task) {
    await delay(this.latency);
    return {status:'succeeded',resultURL:resultURL(task.outfitId,task.topId)};
  }
}
const endpoint='https://yce-api-01.makeupar.com/s2s/v2.0/task/cloth-v3';
export const validFileId=value=>typeof value==='string'&&/^[A-Za-z0-9+/_=-]{1,512}$/.test(value);
export class LiveAdapter {
  mode = 'live';
  constructor({enabled=false,apiKey,assets={},fetchImpl=fetch,timeoutMs=15000,saveResult}={}) {
    this.enabled=enabled;this.apiKey=enabled?(apiKey??process.env.YOUCAM_API_KEY):undefined;this.assets=Object.freeze(Object.fromEntries(Object.entries(assets).map(([k,v])=>[k,v&&typeof v==='object'?Object.freeze({...v}):v])));this.fetchImpl=fetchImpl;this.timeoutMs=timeoutMs;this.saveResult=saveResult;
  }
  preflight(task) {
    if(!this.enabled)throw new AdapterError('LIVE_DISABLED');
    if(!this.apiKey)throw new AdapterError('UNAUTHORIZED');
    validateInputURLs(task.src,task.ref);
    for(const local of [task.src,task.ref]) {
      const input=this.assets[local];
      if(input&&typeof input==='object'){
        if(Object.keys(input).length!==1||!validFileId(input.fileId))throw new AdapterError('INPUT_NOT_ALLOWLISTED');
        continue;
      }
      let url;try{url=new URL(this.assets[local]);}catch{throw new AdapterError('INPUT_NOT_ALLOWLISTED');}
      if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||!Object.values(this.assets).includes(url.href))throw new AdapterError('INPUT_NOT_ALLOWLISTED');
    }
  }
  async request(url,method,body) {
    if(!this.enabled)throw new AdapterError('LIVE_DISABLED');
    let response;
    try {response=await this.fetchImpl(url,{method,redirect:'error',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(this.timeoutMs)});}
    catch {throw new AdapterError('TIMEOUT');} // Never expose URLs, headers, credential, or raw errors.
    if(response.status===401)throw new AdapterError('UNAUTHORIZED');
    if(response.status===429)throw new AdapterError('RATE_LIMIT');
    if(response.status===402)throw new AdapterError('BALANCE'); // Defensive mapping; actual balance codes need verification.
    let payload;try{payload=await response.json();}catch{throw new AdapterError('PROTOCOL');}
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new AdapterError('PROTOCOL');
    if(['CreditInsufficiency','InsufficientCredit','InsufficientCredits','InsufficientBalance','insufficient_credit'].includes(payload.error_code))throw new AdapterError('BALANCE');
    if(!response.ok)throw new AdapterError('FAILURE');
    return payload;
  }
  async submit(task) {
    this.preflight(task);
    const src=this.assets[task.src],ref=this.assets[task.ref];
    const payload=await this.request(endpoint,'POST',{...(typeof src==='string'?{src_file_url:src}:{src_file_id:src.fileId}),...(typeof ref==='string'?{ref_file_url:ref}:{ref_file_id:ref.fileId}),garment_category:'upper_body',change_shoes:false});
    const id=payload?.data?.task_id;
    if(typeof id!=='string'||!id||id.length>512)throw new AdapterError('PROTOCOL');
    return id;
  }
  async poll(task) {
    this.preflight(task);
    if(!task.remoteId)throw new AdapterError('PROTOCOL');
    const payload=await this.request(`${endpoint}/${encodeURIComponent(task.remoteId)}`,'GET');
    // Documented task wrapper; the published OpenAPI has a malformed results reference.
    // Keep strict nested decoding and require real response verification before release.
    const data=payload?.data;
    if(data?.task_status==='error')throw new AdapterError('FAILURE');
    if(['running','pending','queued','processing'].includes(data?.task_status))return {status:'running'};
    if(data?.task_status!=='success')throw new AdapterError('PROTOCOL');
    let result;try{result=new URL(data.results.url);}catch{throw new AdapterError('PROTOCOL');}
    if(result.protocol!=='https:'||result.username||result.password)throw new AdapterError('PROTOCOL');
    return {status:'succeeded',resultURL:this.saveResult?await this.saveResult(task.id,result.href):result.href};
  }
}
