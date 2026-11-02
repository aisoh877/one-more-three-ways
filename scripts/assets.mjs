import {writeFile,mkdir} from 'node:fs/promises';
import {outfits,tops} from '../shared/catalog.mjs';
await mkdir('public/assets',{recursive:true});
function svg(outfit,top,isSource=false) {
 const lower=outfit.id==='weekend'?`<path d="M106 211H174L198 333H83Z" fill="${outfit.color}"/><path d="M106 333v50m65-50v50" stroke="#bd9278" stroke-width="18"/>`:`<path d="M104 211h73l8 173h-29l-17-126-12 126H96Z" fill="${outfit.color}"/><path d="M139 239v82" fill="none" stroke="#fff" opacity=".12"/>`;
 const pattern=top.id==='ink'?'<path d="M140 125v91m-23-65h15v18h-15" stroke="#d3dada" fill="none" stroke-width="2"/><circle cx="145" cy="148" r="2" fill="#ddd"/>':top.id==='sage'?'<path d="M109 151h62m-66 8h69m-71 8h74m-75 8h76m-76 8h76m-76 8h76m-76 8h76" stroke="#fff" opacity=".14" fill="none" stroke-width="2"/>':'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 430" role="img" aria-label="Original schematic of fictional adult in ${outfit.name} with ${isSource?'original cream top':top.name}; mock, not AI output"><rect width="280" height="430" rx="16" fill="#eeece5"/><circle cx="142" cy="180" r="112" fill="#e1dfd3"/><ellipse cx="140" cy="405" rx="70" ry="9" fill="#d1d0c8"/><path d="M114 77q-18-61 26-61t27 61Z" fill="#3b332f"/><ellipse cx="140" cy="57" rx="22" ry="31" fill="#bd9278"/><path d="M117 49q7-38 41-18l7 19-19-15Z" fill="#3b332f"/><path d="M133 80h16v27h-16Z" fill="#bd9278"/><path d="M101 126L79 220m102-94 21 94" stroke="#bd9278" stroke-width="18" stroke-linecap="round"/>${lower}<path d="M111 101l17-7q11 16 25 0l18 7 23 45-26 11 3 64h-66l3-64-26-11Z" fill="${top.color}"/><path d="M128 94q11 17 25 0" fill="none" stroke="#000" opacity=".18" stroke-width="3"/>${pattern}<path d="M95 381h32l-3 15H85q-5-8 10-15m61 0h30l14 15h-42Z" fill="${outfit.id==='denim'?'#fbfaf4':'#353633'}"/><text x="140" y="424" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#515b55">ORIGINAL SVG · FICTIONAL ADULT · ${isSource?'SOURCE':'MOCK'}</text></svg>`;
}
for(const o of outfits) {
 await writeFile(`public/assets/source-${o.id}.svg`,svg(o,{id:'original',name:'Cream base',color:'#d1c6ac'},true));
 for(const t of tops)await writeFile(`public/assets/${o.id}-${t.id}.svg`,svg(o,t));
}
for(const t of tops)await writeFile(`public/assets/top-${t.id}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220"><rect width="220" height="220" rx="20" fill="#eeece5"/><path d="M72 52l23-12q15 20 30 0l23 12 42 61-36 20-10-22v70H76v-70l-10 22-36-20Z" fill="${t.color}"/><text x="110" y="207" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#515b55">ORIGINAL SVG · ${t.name.toUpperCase()}</text></svg>`);
console.log('Created 15 original, local SVG placeholders.');
