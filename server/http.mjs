import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {publicTask} from './manager.mjs';
export function createApp(manager,{dist=resolve('dist'),presentation={mode:'mock',liveEnabled:false,revision:'original-svg-v1'},assetReader}={}) {
  return createServer(async(req,res)=>{
    const host=req.headers.host;
    if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host??'')){res.writeHead(403);res.end();return;}
    const origin=req.headers.origin;
    const expected=`http://${host}`;
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    if(origin&&origin!==expected){json(403,{error:'Cross-origin access denied.'});return;}
    try {
      const path=new URL(req.url,expected).pathname;
      if(path==='/api/tasks'&&req.method==='GET'){json(200,{...presentation,submissionsPaused:manager.paused,tasks:manager.store.list().map(publicTask)});return;}
      if(path==='/api/tasks'&&req.method==='POST') {
        if(presentation.readOnly){json(405,{error:'Saved replay is read-only. No generation is available.'});return;}
        if(!req.headers['content-type']?.startsWith('application/json')){json(415,{error:'JSON required.'});return;}
        let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2048){json(413,{error:'Request too large.'});return;}}
        let input;try{input=JSON.parse(raw);if(!input||typeof input!=='object'||Array.isArray(input))throw new Error();}catch{json(400,{error:'Invalid JSON.'});return;}
        const task=manager.create(input);json(200,publicTask(task));return;
      }
      if(path.startsWith('/api/')){json(404,{error:'Unknown API route.'});return;}
      if(req.method!=='GET'&&req.method!=='HEAD'){json(405,{error:'Method not allowed.'});return;}
      if(assetReader&&(path.startsWith('/inputs/')||path.startsWith('/results/'))){
        const allowed=path.startsWith('/inputs/')||manager.store.list().some(t=>t.status==='succeeded'&&t.resultURL===path);
        const asset=allowed?await assetReader(path):null;if(!asset){json(404,{error:'Not found.'});return;}
        res.writeHead(200,{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:asset.body);return;
      }
      const file=path==='/'?resolve(dist,'index.html'):resolve(dist,'.'+path);
      // Serve only the compiled client and original assets; never source, DB, or dotfiles.
      if(!(file===resolve(dist,'index.html')||file===resolve(dist,'app.js')||file===resolve(dist,'app.css')||/^\/assets\/[a-z-]+\.svg$/.test(path))){json(404,{error:'Not found.'});return;}
      const body=await readFile(file);
      res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[extname(file)],'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
      res.end(req.method==='HEAD'?undefined:body);
    }catch(error){json(error?.code==='RUNTIME_PAUSED'?409:error?.code==='ENOENT'?404:400,{error:error?.code==='RUNTIME_PAUSED'?'New submissions paused. Reconcile saved failures before continuing.':error?.code==='ENOENT'?'Not found.':'Invalid demo request.'});}
  });
}
