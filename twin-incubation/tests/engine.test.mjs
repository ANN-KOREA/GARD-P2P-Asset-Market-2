import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,assessment,publicCatalog,makeSuccessorKit,validateState,exchangePackage,validateExchange,GATE_DEFS,zipStore} from '../engine.mjs';

test('new owner starts with zero verified results and zero synthetic business',()=>{
 const s=blankState(); assert.equal(s.assets.length,0);assert.equal(s.successors.length,0);
 const a=assessment(s);assert.equal(a.selfRecords,0);assert.equal(a.reviewerRecords,0);assert.equal(a.secondReviewed,0);assert.equal(a.first,'NOT_ESTABLISHED');
});
test('independence cannot pass with missing evidence, dates, or reviewers',()=>{
 const s=blankState();s.owner.name='Owner A';for(const g of s.gates){g.status='REVIEW_RECORDED';g.evidenceRef='example';g.evidenceDate='2026-11-21';g.reviewer='Owner A';g.reviewerNotes='외부 검수 수행';}
 assert.equal(assessment(s).reviewerRecords,0);
 for(const g of s.gates)g.reviewer='Reviewer B';
 assert.equal(assessment(s).reviewerRecords,GATE_DEFS.length);
 assert.equal(assessment(s).first,'EXTERNAL_REVIEW_RECORDED');
 s.gates[0].evidenceDate='';assert.equal(assessment(s).reviewerRecords,4);
});
test('public catalog never includes private notes, contacts, or nonapproved assets',()=>{
 const s=blankState();s.owner.name='Owner A';s.owner.email='secret@example.org';s.business.name='A Business';s.business.problem='SECRET business question';
 s.assets.push({id:'a1',title:'Allowed',summary:'Public only',license:'Evaluation',approved:true,createdAt:'2026-11-21'});
 s.assets.push({id:'a2',title:'Private only',summary:'SECRET',license:'N/A',approved:false,createdAt:'2026-11-21'});
 s.negotiations.push({exchangeId:'deal1',question:'SECRET NEGOTIATION'});s.successors.push({alias:'SECRET PERSON'});
 const cat=publicCatalog(s);assert.equal(cat.items.length,1);assert.equal(cat.owner.email,'');const raw=JSON.stringify(cat);assert.ok(!raw.includes('SECRET'));assert.ok(!raw.includes('secret@example'));
 s.owner.emailPublic=true;assert.equal(publicCatalog(s).owner.email,'secret@example.org');
 const kit=makeSuccessorKit(s);assert.ok(!kit['index.html'].includes('SECRET'));assert.ok(kit['index.html'].includes('Public only'));
});
test('bad backup format or gate schema rejected',()=>{
 const s=blankState();assert.equal(validateState(s),s);assert.throws(()=>validateState({...s,schema:'other'}));assert.throws(()=>validateState({...s,gates:[]}));
});
test('exchange never claims SENT or payment automatically',()=>{
 const s=blankState();const x=exchangePackage(s,{kind:'QUESTION',subject:'Q',question:'Why?',recipientAlias:'Buyer'});assert.equal(x.status,'DRAFT_NOT_SENT');assert.equal(x.senderConfirmedAt,null);assert.equal(validateExchange(x),x);assert.throws(()=>validateExchange({...x,kind:'PAYMENT_VERIFIED'}));
});
test('zip output starts with valid local header and has central + end records',async()=>{
 const blob=zipStore({'index.html':'<h1>Hello</h1>','catalog.json':'{}'});const bytes=new Uint8Array(await blob.arrayBuffer());assert.equal(bytes[0],0x50);assert.equal(bytes[1],0x4b);assert.equal(bytes[2],0x03);assert.equal(bytes[3],0x04);assert.equal(bytes.at(-22),0x50);assert.equal(bytes.at(-21),0x4b);assert.equal(bytes.at(-20),0x05);assert.equal(bytes.at(-19),0x06);
});
test('first-generation claims do not automatically become second-generation outcome',()=>{
 const s=blankState();for(const g of s.gates){g.status='SELF_REPORTED';g.evidenceRef='file';g.evidenceDate='2026-11-21';}const a=assessment(s);assert.equal(a.first,'SELF_REPORT_COMPLETE');assert.equal(a.second,'NOT_ESTABLISHED');
 s.successors.push({alias:'B',independentSite:'https://example.org',evidenceRef:'screenshot',status:'SELF_REPORTED'});assert.equal(assessment(s).second,'SELF_REPORTED');assert.equal(assessment(s).secondReviewed,0);
});
