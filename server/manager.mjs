import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {REVISION,validatePair,sourceURL,referenceURL,scenarios} from '../shared/catalog.mjs';
import {AdapterError,safeError} from './errors.mjs';
export function publicTask(t) {
  return {id:t.id,outfitId:t.outfitId,topId:t.topId,scenario:t.scenario,status:t.status,mode:t.mode,resultURL:t.resultURL??null,error:t.error??null,createdAt:t.createdAt};
}
export class TaskManager {
  // Failed receipts are the durable stop condition. Reopening a store must not
  // quietly spend on the rest of a batch; already accepted tasks may finish GETs.
  get paused(){return this.adapter.mode!=='mock'&&this.store.list().some(t=>t.status==='failed');}
  constructor(store,adapter,{pollMs=10000,maxPolls=18,revision=REVISION,allowedPairs=null,maxActive=2}={}) {
    if(store.list().some(t=>t.mode!==adapter.mode))throw new Error('STORE_MODE_MISMATCH');
    this.maxActive=Math.max(1,Math.min(2,maxActive));this.revision=revision;this.allowedPairs=allowedPairs;this.store=store;this.adapter=adapter;this.pollMs=pollMs;this.maxPolls=maxPolls;this.active=0;this.peak=0;this.stopped=false;this.idleWaiters=[];
    for(const task of store.list())if(task.status==='running') {
      if(adapter.mode==='mock'||task.remoteId)store.save({...task,status:'queued'});
      else store.save({...task,status:'failed',error:safeError(new AdapterError('NEEDS_REVIEW'))});
    }
    this.drain();
  }
  create({outfitId,topId,scenario='success',...extra}) {
    validatePair(outfitId,topId);
    if(this.allowedPairs&&!this.allowedPairs.includes(`${outfitId}:${topId}`))throw new Error('PAIR_NOT_APPROVED');
    if(Object.keys(extra).length||!scenarios.includes(scenario)||(this.adapter.mode!=='mock'&&scenario!=='success'))throw new Error('INVALID_INPUT');
    // No browser-provided idempotency key can bypass this canonical cache identity.
    const cacheKey=JSON.stringify([this.revision,this.adapter.mode,outfitId,topId,scenario]);
    const existing=this.store.byKey(cacheKey);if(existing)return existing;
    if(this.paused)throw new AdapterError('RUNTIME_PAUSED');
    const task=this.store.insert({id:randomUUID(),cacheKey,outfitId,topId,src:sourceURL(outfitId),ref:referenceURL(topId),scenario,mode:this.adapter.mode,status:'queued',createdAt:new Date().toISOString()});
    this.drain();return this.store.get(task.id);
  }
  drain() {
    if(this.stopped)return;
    while(this.active<this.maxActive) {
      const next=this.store.list().find(t=>t.status==='queued'&&(!this.paused||t.remoteId)&&(!this.allowedPairs||this.allowedPairs.includes(`${t.outfitId}:${t.topId}`)));if(!next)break;
      this.active++;this.peak=Math.max(this.peak,this.active);
      this.store.save({...next,status:'running'});
      void this.run(next).finally(()=>{this.active--;this.drain();if(!this.active)for(const resolve of this.idleWaiters.splice(0))resolve();});
    }
  }
  async run(task) {
    try {
      if(!task.remoteId) {
        // Persist running before the POST; never automatically repeat an ambiguous POST after a crash.
        task.remoteId=await this.adapter.submit(task);
        this.store.save({...task,status:'running'});
      }
      for(let attempt=0;attempt<this.maxPolls;attempt++) {
        const result=await this.adapter.poll(task);
        if(result.status==='succeeded') {this.store.save({...task,...result});return;}
        if(attempt+1<this.maxPolls)await delay(this.pollMs);
      }
      throw new AdapterError('TIMEOUT');
    }catch(error){this.store.save({...task,status:'failed',error:safeError(error)});}
  }
  async idle(){if(this.active)await new Promise(resolve=>this.idleWaiters.push(resolve));}
  async stop(){this.stopped=true;await this.idle();}
}
