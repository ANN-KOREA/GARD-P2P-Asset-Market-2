import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCase,makeFact,assessment,allowedPublicFact,buildHandoff,validateHandoff,SCHEMA,SKU,QA} from '../js/gard-product-core.mjs';

test('3 separate commercial SKUs are defined with expected prices',()=>{
 assert.equal(SKU.KIT49.price,490000);assert.equal(SKU.WS300.price,3000000);assert.equal(SKU.POC500.price,5000000);
});
test('an untouched PoC cannot be marked PASS',()=>{
 const p=makeCase('POC500'); assert.equal(assessment(p).status,'NOT_TESTED');
});
test('PASS requires evidence and reviewer for all required checks',()=>{
 const p=makeCase('KIT49');p.qa.forEach(x=>x.status='PASS'); assert.equal(assessment(p).status,'NOT_TESTED');
 p.qa.forEach(x=>{x.evidenceRef='QA-NOTE';x.reviewer='고객 검토자';});assert.equal(assessment(p).status,'PASS');
});
test('a critical FAIL blocks auto pass regardless of other statuses',()=>{
 const p=makeCase('POC500');p.qa.forEach(x=>{x.status='PASS';x.evidenceRef='X';x.reviewer='R';});p.qa.find(x=>x.critical).status='FAIL';assert.equal(assessment(p).status,'FAIL');
});
test('public handoff requires explicit approval and rights checking',()=>{
 const p=makeCase('KIT49');p.publicTitle='공개 제목';p.publicSummary='공개 소개';p.publicRights='비독점 검토용';
 assert.throws(()=>buildHandoff(p),/승인/);p.publicApproved=true;p.rightsConfirmed=true;
 assert.equal(buildHandoff(p).audience,'reviewer_handoff');
});
test('allowlist prevents private notes, contact and unapproved facts from handoff',()=>{
 const p=makeCase('WS300');p.title='원본 비밀 제목';p.privateNotes='SECRET_NOT_TO_EXPORT';p.customerAlias='PRIVATE_CLIENT';p.publicTitle='공개 상품';p.publicSummary='공개 설명';p.publicRights='검토용';p.publicApproved=true;p.rightsConfirmed=true;
 p.facts.push(makeFact({title:'비밀',statement:'PRIVATE_STATEMENT',evidenceRef:'PRIVATE_REF',evidenceLevel:'D2',humanDecision:'APPROVED',rightsReviewed:true,sensitivity:'SENSITIVE',publicApproved:true,publicSummary:'비밀'}));
 p.facts.push(makeFact({title:'승인됨',statement:'PRIVATE_FACT',evidenceRef:'DOCUMENT_PATH',evidenceLevel:'D1',humanDecision:'APPROVED',rightsReviewed:true,sensitivity:'ORDINARY',publicApproved:true,publicSummary:'공개 가능한 개요'}));
 const out=buildHandoff(p),s=JSON.stringify(out);assert.equal(out.facts.length,1);assert(!s.includes('SECRET_NOT_TO_EXPORT'));assert(!s.includes('PRIVATE_CLIENT'));assert(!s.includes('PRIVATE_REF'));assert(!s.includes('DOCUMENT_PATH'));assert(!s.includes('PRIVATE_FACT'));assert(!s.includes('원본 비밀 제목'));
 assert.equal(validateHandoff(out),out);
});
test('public evidence requires human decision, cleared rights and non-sensitive content',()=>{
 const f=makeFact({title:'x',statement:'y',publicApproved:true,rightsReviewed:true,humanDecision:'PENDING',sensitivity:'ORDINARY',publicSummary:'공개',evidenceLevel:'D1'});assert.equal(allowedPublicFact(f),false);f.humanDecision='APPROVED';assert.equal(allowedPublicFact(f),true);f.sensitivity='PERSONAL';assert.equal(allowedPublicFact(f),false);
});
test('reject malformed handoff',()=>assert.throws(()=>validateHandoff({schema:SCHEMA,audience:'owner_private'}),/JSON|구조/));
