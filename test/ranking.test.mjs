import test from 'node:test';
import assert from 'node:assert/strict';
import {rankCandidates,parseBudget} from '../shared/ranking.mjs';
const approved=(id,n)=>Object.fromEntries(['denim','tailored','weekend'].slice(0,n).map(o=>[`${o}:${id}`,true]));
test('no approvals and one approval produce no qualifying candidates (no division by zero)',()=>{
 assert.deepEqual(rankCandidates({},8000),[]);assert.deepEqual(rankCandidates(approved('sage',1),8000),[]);
});
test('requires two explicit approvals, within inclusive budget, and ranks price / approved count',()=>{
 const a={...approved('sage',2),...approved('ink',3),...approved('clay',3)};
 const result=rankCandidates(a,7200);assert.deepEqual(result.map(t=>[t.id,t.rank,t.scoreCents]),[['clay',1,1600],['ink',2,2400],['sage',2,2400]]);
 assert.equal(result[1].tied,true);assert.equal(result[2].tied,true);
 assert.deepEqual(rankCandidates(a,4799),[]);assert.equal(rankCandidates(a,4800).length,2);
});
test('ties use exact integer cross multiplication, deterministic identity, and competition rank',()=>{
 const a={...approved('sage',2),...approved('clay',2),...approved('ink',2)};
 assert.deepEqual(rankCandidates(a,8000).map(t=>[t.id,t.rank]),[['clay',1],['sage',1],['ink',3]]);
});
test('unapproval removes eligibility, unknown outfits are ignored and true must be boolean',()=>{
 const a={...approved('sage',2),'unknown:sage':true,'weekend:sage':'true'};a['denim:sage']=false;
 assert.deepEqual(rankCandidates(a,8000),[]);
});
test('invalid budgets show no candidates; safe decimal parsing and zero price are supported',()=>{
 for(const x of ['', '-1','1.001','NaN','Infinity','1e2','0x11','9999999'])assert.equal(parseBudget(x),null,x);
 assert.equal(parseBudget('48.00'),4800);assert.equal(parseBudget('0'),0);assert.equal(parseBudget('1.2'),120);
 for(const x of [null,-1,NaN,Infinity,100.1])assert.deepEqual(rankCandidates(approved('sage',3),x),[]);
 assert.equal(rankCandidates(approved('sage',2),0,[{id:'sage',cents:0}])[0].scoreCents,0);
});
