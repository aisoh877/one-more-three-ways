import {build} from 'esbuild';
import {cp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
await rm('dist', {recursive:true, force:true});
await mkdir('dist', {recursive:true});
await build({entryPoints:['src/main.jsx'],bundle:true,minify:true,outfile:'dist/app.js',format:'esm',define:{'process.env.NODE_ENV':'"production"'},metafile:true}).then(async result=>writeFile('evidence/build-inputs.json',JSON.stringify(Object.keys(result.metafile.inputs),null,2)+'\n'));
await cp('public/assets','dist/assets',{recursive:true});
const html=(await readFile('index.html','utf8')).replace('<script type="module" src="/src/main.jsx"></script>','<link rel="stylesheet" href="/app.css"/><script type="module" src="/app.js"></script>');
await writeFile('dist/index.html',html);
console.log('Built self-contained local client in dist/');
