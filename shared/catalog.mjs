export const REVISION = 'original-svg-v1';
export const outfits = [
  { id: 'denim', name: 'Everyday denim', detail: 'Straight jeans · white sneakers', color: '#637c99' },
  { id: 'tailored', name: 'City tailored', detail: 'Charcoal trousers · loafers', color: '#4e565a' },
  { id: 'weekend', name: 'Weekend ease', detail: 'Terracotta skirt · ankle boots', color: '#b66f53' },
];
export const tops = [
  { id: 'sage', name: 'Sage knit', detail: 'Soft shape / olive green', cents: 4800, color: '#81967c' },
  { id: 'ink', name: 'Ink shirt', detail: 'Relaxed shape / midnight blue', cents: 7200, color: '#344f68' },
  { id: 'clay', name: 'Clay tee', detail: 'Easy shape / warm rust', cents: 4800, color: '#c27f63' },
];
// Stable IDs retain saved preferences; these labels describe the approved raster set.
export const liveOutfits=outfits.map(o=>({...o,...({denim:{detail:'Straight jeans · white sneakers'},tailored:{detail:'Beige trousers · black loafers'},weekend:{name:'Pleated skirt outfit',detail:'Green pleated skirt · burgundy flats'}}[o.id])}));
export const liveTops=tops.map(t=>({...t,...({
 sage:{name:'Ivory shirt',detail:'Ivory shirt reference',color:'#eee7d5'},
 ink:{name:'Blue knit',detail:'Blue knit reference',color:'#6382aa'},
 clay:{name:'Rust striped top',detail:'Rust striped reference',color:'#b46d49'},
}[t.id])}));
export const scenarios = ['success', 'failure', 'unauthorized', 'rate_limit', 'timeout', 'balance'];
export const pairKey = (outfit, top) => `${outfit}:${top}`;
export const sourceURL = id => `/assets/source-${id}.svg`;
export const referenceURL = id => `/assets/top-${id}.svg`;
export const resultURL = (outfit, top) => `/assets/${outfit}-${top}.svg`;
export function validatePair(outfitId, topId) {
  if (!outfits.some(o => o.id === outfitId) || !tops.some(t => t.id === topId)) throw new Error('INVALID_INPUT');
}
export function validateInputURLs(src, ref) {
  if (!outfits.some(o => sourceURL(o.id) === src) || !tops.some(t => referenceURL(t.id) === ref)) throw new Error('INPUT_NOT_ALLOWLISTED');
}
