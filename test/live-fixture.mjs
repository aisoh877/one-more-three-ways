// Authored one-pixel PNG + invented protocol responses. No network fallback.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {outfits,tops,sourceURL,referenceURL} from '../shared/catalog.mjs';
export const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
export async function fixtureConfig(dir,phase='quality-gate'){
 await writeFile(join(dir,'fixture.png'),png);
 const assets=Object.fromEntries([...outfits.map(o=>sourceURL(o.id)),...tops.map(t=>referenceURL(t.id))].map((k,i)=>[k,{publicURL:`https://inputs.example.invalid/input-${i}.png`,localFile:'fixture.png'}]));
 return {approvedForLive:true,revision:'test-fixture-v1',phase,qualityGatePassed:phase==='full-demo',assets,resultOrigins:['https://results.example.invalid']};
}
export function fixtureTransport(calls=[]){return async(url,init={})=>{
 calls.push({url:String(url),method:init.method??'GET',authorization:init.headers?.Authorization??null});
 const json=body=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
 if(url==='https://yce-api-01.makeupar.com/s2s/v2.0/task/cloth-v3'&&init.method==='POST')return json({status:200,data:{task_id:'fixture-'+calls.length}});
 if(String(url).startsWith('https://yce-api-01.makeupar.com/s2s/v2.0/task/cloth-v3/fixture-'))return json({status:200,data:{task_status:'success',results:{url:'https://results.example.invalid/result.png?signature=TEST_ONLY'}}});
 if(url==='https://results.example.invalid/result.png?signature=TEST_ONLY')return new Response(png,{headers:{'Content-Type':'image/png'}});
 throw new Error('Fixture rejected unexpected URL; no external fetch exists.');
};}
