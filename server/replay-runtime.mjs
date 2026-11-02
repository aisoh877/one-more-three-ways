import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {liveOutfits,liveTops,sourceURL,referenceURL} from '../shared/catalog.mjs';
// A fixed local recording: no provider adapter, task store or credential access.
export async function loadReplay(directory=resolve('public/replay')){
 const names=['source-01-denim.png','source-02-tailored.png','source-03-pleated.png','top-02-ivory-shirt.png','01-denim-ivory.jpg','02-tailored-ivory.jpg','03-pleated-ivory.jpg'];
 const checksums=JSON.parse(await readFile(resolve(directory,'checksums.json'),'utf8'));
 const assets=new Map();
 for(const name of names){
  const body=await readFile(resolve(directory,name));
  if(createHash('sha256').update(body).digest('hex')!==checksums[name])throw Error('Recorded replay asset mismatch.');
  assets.set(`/${name.endsWith('.png')?'inputs':'results'}/${name}`,{body,type:name.endsWith('.png')?'image/png':'image/jpeg'});
 }
 const tasks=liveOutfits.map((o,i)=>Object.freeze({id:`recorded-20261102-${o.id}`,outfitId:o.id,topId:'sage',scenario:'success',status:'succeeded',mode:'replay',resultURL:`/results/${names[i+4]}`,createdAt:'2026-11-02'}));
 const images=Object.fromEntries(liveOutfits.map((o,i)=>[sourceURL(o.id),`/inputs/${names[i]}`]));
 images[referenceURL('sage')]=`/inputs/${names[3]}`;
 return {manager:{paused:false,store:{list:()=>tasks.slice()}},presentation:{mode:'replay',readOnly:true,liveEnabled:false,revision:'recorded-20261102-v1',phase:'recorded',images,allowedPairs:liveOutfits.map(o=>`${o.id}:sage`),catalog:{outfits:liveOutfits,tops:liveTops.filter(t=>t.id==='sage')}},assetReader:async path=>assets.get(path)??null};
}
