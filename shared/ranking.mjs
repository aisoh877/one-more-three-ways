import {outfits, tops, pairKey} from './catalog.mjs';
export function rankCandidates(approvals, budgetCents, candidates = tops) {
  if (!Number.isSafeInteger(budgetCents) || budgetCents < 0) return [];
  const eligible = candidates.map(top => ({ ...top, count: outfits.filter(o => approvals[pairKey(o.id, top.id)] === true).length }))
    .filter(t => Number.isSafeInteger(t.cents) && t.cents >= 0 && t.count >= 2 && t.cents <= budgetCents)
    .sort((a,b) => a.cents * b.count - b.cents * a.count || a.id.localeCompare(b.id));
  let rank = 0;
  return eligible.map((t, i) => {
    const tied = i > 0 && t.cents * eligible[i-1].count === eligible[i-1].cents * t.count;
    if (!tied) rank = i + 1;
    return {...t, scoreCents: t.cents / t.count, rank, tied: eligible.some(x => x.id !== t.id && x.cents * t.count === t.cents * x.count)};
  });
}
export function parseBudget(value) {
  if (!/^\d{1,6}(\.\d{0,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export const money = cents => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(cents/100);
