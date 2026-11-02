import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {mkdir,readFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
test('React initial UI renders 9 named comparison and approval controls, disclosure and accessible labels',async()=>{
 await mkdir('.data',{recursive:true});const outfile=resolve('.data/ui-test.mjs');
 await build({entryPoints:['src/App.jsx'],bundle:true,platform:'node',format:'esm',outfile,external:['react']});
 try {const {default:App}=await import(pathToFileURL(outfile).href);const html=renderToStaticMarkup(createElement(App));
 assert.equal((html.match(/aria-label="Approve /g)||[]).length,9);assert.equal((html.match(/aria-label="Compare original for /g)||[]).length,9);assert.equal((html.match(/aria-label="Prepare mock /g)||[]).length,9);
 for(const text of ['MOCK MODE','NO API CALLS','fictional adult aged 28','not generated try-ons','No candidates qualify yet.','not cost per wear','Skip to comparisons'])assert.ok(html.includes(text),text);
 assert.ok(html.includes('aria-describedby="budget-help"'));assert.ok(html.includes('aria-live="polite"'));assert.ok(html.includes('type="checkbox"'));
 const css=await readFile('src/style.css','utf8');assert.ok(css.includes('@media(max-width:720px)'));assert.ok(css.includes(':focus-visible'));assert.ok(css.includes('grid-template-columns:1fr'));
 }finally{await rm(outfile);}
});
