// GARD 3-Product Common Asset Engine v1.0 (2026-11-20)
// Independent from the existing P2P owner's IndexedDB stores and catalog.json.
export const SCHEMA = 'gard-responsible-asset-transfer-v1';
export const REVIEW_SCHEMA = 'gard-responsible-review-v1';
export const SKU = Object.freeze({
  KIT49:{code:'KIT49',name:'Personal Asset Kit',ko:'49만원 개인 자산 제작 키트',price:490000,primary:'개인의 자산 제작·보유·복구',delivery:'개인용 실행 도구 + 분류·권리·자가검수'},
  WS300:{code:'WS300',name:'Asset Maker Workshop',ko:'300만원 자산 제작·역량이전 워크숍',price:3000000,primary:'구성원에게 제작능력 이전',delivery:'2회 실습 교육 + 역량이전 결과'},
  POC500:{code:'POC500',name:'Independence Evidence PoC',ko:'500만원 30일 독립 실행·검증 PoC',price:5000000,primary:'독립 실행·오류 대응·도입판단',delivery:'30일 시험계획 + 로그 + 결과판정'}
});
export const FACETS = ['PF','EF','ACT','PART','BF','HC','ASSET'];
export const LEVELS = ['D0','D1','D2','D3','D4','D5'];
export const QA_STATUS = ['NOT_RUN','PASS','CONDITIONAL','FAIL'];
export const QA = Object.freeze({
 KIT49:[
  {id:'K01',label:'개인 앱에서 자료 등록 및 재열기',critical:true},
  {id:'K02',label:'PF·EF·활동·참여 분류',critical:false},
  {id:'K03',label:'자기진술과 증빙자료 구분',critical:true},
  {id:'K04',label:'AI 제안과 인간 승인 구분',critical:true},
  {id:'K05',label:'JSON 내보내기·다른 환경에서 복구',critical:true},
  {id:'K06',label:'비승인 자료 공개 방지',critical:true}
 ],
 WS300:[
  {id:'W01',label:'합의된 2회 교육 실행',critical:true},
  {id:'W02',label:'참여자별 자산 후보 제작',critical:false},
  {id:'W03',label:'사실·증거 단계 이해평가',critical:false},
  {id:'W04',label:'AI/인간 결정 구분 실습',critical:true},
  {id:'W05',label:'원본 및 산출물 권리표 작성',critical:true},
  {id:'W06',label:'독립 JSON 재현 실습',critical:true},
  {id:'W07',label:'미완료·도움 필요 인원 보고',critical:false}
 ],
 POC500:[
  {id:'P01',label:'사전 기준선·범위·책임자 확정',critical:true},
  {id:'P02',label:'고객 환경에서 앱 최초 실행',critical:true},
  {id:'P03',label:'Fact/Evidence 상태 오표시 방지',critical:true},
  {id:'P04',label:'AI 오류에 대한 인간 검토·거절',critical:true},
  {id:'P05',label:'JSON 데이터 이전 및 독립 복원',critical:true},
  {id:'P06',label:'비승인 공개·권한 없는 자료 차단',critical:true},
  {id:'P07',label:'인도파일 무결성 확인',critical:true},
  {id:'P08',label:'권리·이용조건 점검',critical:true},
  {id:'P09',label:'오류 발생 시 책임 주체 식별',critical:true},
  {id:'P10',label:'GARD 개입 없이 핵심 과업 독립 실행',critical:true}
 ]
});
export const nowISO=()=>new Date().toISOString();
export const newId=()=>`GP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
export function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function money(n){return Number(n).toLocaleString('ko-KR')+'원';}
export function safeSlug(s){return String(s||'asset').replace(/[^a-zA-Z0-9-]/g,'-').slice(0,60);}
export function makeQa(sku){if(!QA[sku])throw Error('알 수 없는 상품');return QA[sku].map(q=>({...q,status:'NOT_RUN',evidenceRef:'',reviewer:'',notes:'',checkedAt:''}));}
export function makeCase(sku='KIT49'){
 if(!SKU[sku])throw Error('지원하지 않는 상품');
 return {schema:SCHEMA,id:newId(),sku,title:'',purpose:'',customerAlias:'',privateNotes:'',linkedAssetId:'',publicTitle:'',publicSummary:'',publicRights:'',publicApproved:false,rightsConfirmed:false,
 responsibility:{owner:'고객 오너',supplier:'GARD',operator:'고객 운영자',verifier:'미지정',aiProvider:'사용자 선택',decisionOwner:'고객 오너'},
 facts:[],qa:makeQa(sku),events:[{at:nowISO(),event:'PROJECT_CREATED',note:'프로젝트 로컬 생성'}],createdAt:nowISO(),updatedAt:nowISO()};
}
export function makeFact(payload={}){return {id:newId(),facet:FACETS.includes(payload.facet)?payload.facet:'PF',title:String(payload.title||'').slice(0,140),statement:String(payload.statement||'').slice(0,3000),evidenceLevel:LEVELS.includes(payload.evidenceLevel)?payload.evidenceLevel:'D0',evidenceRef:String(payload.evidenceRef||'').slice(0,500),aiAssisted:!!payload.aiAssisted,aiTask:String(payload.aiTask||'').slice(0,500),humanTask:String(payload.humanTask||'').slice(0,500),humanDecision:['PENDING','APPROVED','REJECTED'].includes(payload.humanDecision)?payload.humanDecision:'PENDING',rightsReviewed:!!payload.rightsReviewed,sensitivity:['ORDINARY','PERSONAL','SENSITIVE'].includes(payload.sensitivity)?payload.sensitivity:'ORDINARY',publicSummary:String(payload.publicSummary||'').slice(0,400),publicApproved:!!payload.publicApproved,sourceFactId:String(payload.sourceFactId||''),updatedAt:nowISO()};}
export function assessment(p){
 const entries=(p.qa||[]);
 const expected=QA[p.sku]||[];
 if(!expected.length)return {status:'NOT_TESTED',reason:'상품 코드 미확인',passed:0,total:0};
 const indexed=new Map(entries.map(x=>[x.id,x]));
 const all=expected.map(t=>({...t,...(indexed.get(t.id)||{})}));
 const criticalFail=all.some(t=>t.critical&&t.status==='FAIL');
 const anyFail=all.some(t=>t.status==='FAIL');
 const absent=all.some(t=>t.status==='NOT_RUN'||!QA_STATUS.includes(t.status));
 const insufficient=all.some(t=>t.status==='PASS'&&(!String(t.evidenceRef||'').trim()||!String(t.reviewer||'').trim()));
 const partial=all.some(t=>t.status==='CONDITIONAL');
 const status=criticalFail||anyFail?'FAIL':absent||insufficient?'NOT_TESTED':partial?'CONDITIONAL':'PASS';
 const reason=criticalFail?'필수 통제 FAIL':anyFail?'실패한 시험이 존재':absent?'미수행 시험 존재':insufficient?'PASS의 근거 또는 확인자 누락':partial?'조건부 사항 존재':'모든 필수 시험 근거 기재';
 return {status,reason,total:all.length,passed:all.filter(x=>x.status==='PASS'&&x.evidenceRef&&x.reviewer).length,failed:all.filter(x=>x.status==='FAIL').length,notRun:all.filter(x=>x.status==='NOT_RUN').length};
}
export function allowedPublicFact(f){return !!(f&&f.publicApproved&&f.rightsReviewed&&f.humanDecision==='APPROVED'&&f.sensitivity==='ORDINARY'&&String(f.publicSummary||'').trim()&&LEVELS.indexOf(f.evidenceLevel)>=1);}
export function buildHandoff(p){
 if(!p||p.schema!==SCHEMA||!SKU[p.sku])throw Error('유효하지 않은 프로젝트');
 if(!p.publicApproved||!p.rightsConfirmed)throw Error('인도 승인과 권리 확인이 모두 필요합니다.');
 if(!String(p.publicTitle||'').trim()||!String(p.publicSummary||'').trim()||!String(p.publicRights||'').trim())throw Error('공개 제목·요약·권리 범위를 먼저 기입하세요.');
 const summary=assessment(p);
 const publicFacts=(p.facts||[]).filter(allowedPublicFact).map(f=>({id:f.id,facet:f.facet,title:f.title,public_summary:f.publicSummary,evidence_level:f.evidenceLevel,ai_assisted:f.aiAssisted,human_decision:'APPROVED'}));
 // Explicit allowlist only. Excludes customerAlias, privateNotes, evidenceRef, participant files, and reviewer notes.
 return {schema:SCHEMA,audience:'reviewer_handoff',generated_at:nowISO(),project_id:p.id,sku:p.sku,product_name:SKU[p.sku].ko,
 project:{title:p.publicTitle,summary:p.publicSummary,rights_scope:p.publicRights},
 facts:publicFacts,checks:(p.qa||[]).map(t=>({id:t.id,label:t.label,status:t.status,critical:!!t.critical,evidence_provided:!!String(t.evidenceRef||'').trim(),reviewer_recorded:!!String(t.reviewer||'').trim()})),
 internal_assessment:{status:summary.status,reason:summary.reason},local_event_count:(p.events||[]).length,notices:['내부 기록 및 자료의 실제 진실성을 증명하지 않습니다.','독립 검증자의 공식 서명이나 자격증명을 포함하지 않습니다.','공개·제3자 전달 전에 내용과 개인정보를 사람이 다시 확인해야 합니다.']};
}
export function validateHandoff(doc){
 if(!doc||doc.schema!==SCHEMA||doc.audience!=='reviewer_handoff')throw Error('GARD 검토용 인도 JSON이 아닙니다.');
 if(!SKU[doc.sku]||typeof doc.project?.title!=='string'||!Array.isArray(doc.facts)||!Array.isArray(doc.checks))throw Error('인도 JSON 구조 오류');
 if(doc.facts.length>2000||doc.checks.length>100)throw Error('데이터 제한 초과');
 if(typeof doc.project.summary!=='string'||typeof doc.project.rights_scope!=='string')throw Error('인도 설명·권리 범위가 없습니다.');
 if(!doc.facts.every(f=>f&&typeof f.id==='string'&&typeof f.title==='string'&&typeof f.public_summary==='string'&&FACETS.includes(f.facet)&&LEVELS.includes(f.evidence_level)))throw Error('공개 사실 카드 구조 오류');
 if(!doc.checks.every(q=>q&&typeof q.id==='string'&&typeof q.label==='string'&&QA_STATUS.includes(q.status)))throw Error('시험 결과 구조 오류');
 if(new Set(doc.checks.map(x=>x.id)).size!==doc.checks.length)throw Error('시험 ID 중복');
 return doc;
}
export function formatReport(p){const s=assessment(p);const lines=[`GARD ${SKU[p.sku]?.ko||p.sku} 자체 시험보고`, `프로젝트: ${p.title||p.id}`, `기록 생성일: ${nowISO()}`,`검수 상태: ${s.status} (${s.reason})`, `PASS ${s.passed}/${s.total} · FAIL ${s.failed} · NOT_RUN ${s.notRun}`, '', '시험 기록'];(p.qa||[]).forEach(q=>lines.push(`${q.id} ${q.label}: ${q.status} | 근거: ${q.evidenceRef||'없음'} | 확인자: ${q.reviewer||'없음'}`));lines.push('','주의: 이 문서는 앱에서 작성한 자체 기록입니다. 법적 인증, 독립 시험 성적서 또는 성공 보증이 아닙니다.');return lines.join('\n');}
export function downloadJSON(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});downloadBlob(name,blob);}
export function downloadBlob(name,blob){const link=document.createElement('a');const url=URL.createObjectURL(blob);link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
