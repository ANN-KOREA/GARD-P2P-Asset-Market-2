// GARD TWIN Independence Evidence Lab — pure deterministic logic.
// No cloud API, no account secrets, no server side effects.
export const SCHEMA = 'gard.twin.independence.v1';
export const EXCHANGE_SCHEMA = 'gard.twin.exchange.v1';
export const GATE_DEFS = [
  ['self_build', '최초 오너의 도움 없이 사업·첫 자산 제작', '다른 사람의 실시간 제작 지원 없이 직접 만든 첫 자산의 실행 증거'],
  ['portable', '다른 브라우저·기기에서 JSON 백업 복원', '원래 기기가 아닌 환경에서 복원·재실행한 관찰 기록'],
  ['rights', '자기 자산의 권리·공개 범위를 직접 결정', '공개할 필드와 인도 조건을 본인이 결정한 기록'],
  ['own_market', '자신의 이름으로 독립 전시장 구성', '자신의 공개 전시장 주소 또는 별도 파일 실행 증거'],
  ['real_counterparty', '실제 상대방과 문의·협상을 수행', '실제 문의/거절/조건협상의 날짜 및 증거 위치']
];
export function makeId(prefix='id') {
  const v = typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${v}`;
}
export function blankState() {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA, version: 1, createdAt: now, updatedAt: now,
    owner: {id: makeId('owner'), name: '', email: '', emailPublic: false, generation: 1, mentorName: ''},
    business: {name: '', problem: '', customer: '', value: '', alternative: '', price: '', falsification: '', firstAsset: '', publicSummary: ''},
    assets: [],
    gates: GATE_DEFS.map(([key]) => ({key, status: 'NOT_TESTED', evidenceRef: '', evidenceDate: '', reviewer: '', reviewerNotes: ''})),
    negotiations: [], successors: [], events: []
  };
}
export function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function safeName(s) { return String(s||'GARD-TWIN').replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,72) || 'GARD-TWIN'; }
export function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'')); }
export function isEvidencePresent(g) {return !!(g?.evidenceRef?.trim() && g.evidenceDate?.trim());}
export function isReviewRecorded(g, ownerName='') {
  const reviewer = String(g?.reviewer||'').trim();
  const owner = String(ownerName||'').trim();
  return g?.status === 'REVIEW_RECORDED' && isEvidencePresent(g) && reviewer.length>=2 && g?.reviewerNotes?.trim()?.length>=5 && (!owner || reviewer.toLowerCase() !== owner.toLowerCase());
}
export function assessment(state) {
  const gates = GATE_DEFS.map(([key]) => (state.gates||[]).find(g=>g.key===key)||{key,status:'NOT_TESTED'});
  const selfRecords = gates.filter(g=>['SELF_REPORTED','REVIEW_RECORDED'].includes(g.status)&&isEvidencePresent(g)).length;
  const reviewerRecords = gates.filter(g=>isReviewRecorded(g,state.owner?.name)).length;
  const first = reviewerRecords===GATE_DEFS.length ? 'EXTERNAL_REVIEW_RECORDED' : selfRecords===GATE_DEFS.length ? 'SELF_REPORT_COMPLETE' : 'NOT_ESTABLISHED';
  const successors = (state.successors||[]).filter(s=>s?.alias?.trim() && s?.independentSite?.trim());
  const secondSelf = successors.filter(s=>s.status==='SELF_REPORTED' && s.evidenceRef?.trim()).length;
  const secondReviewed = successors.filter(s=>s.status==='REVIEW_RECORDED' && s.evidenceRef?.trim() && s.reviewer?.trim()?.length>=2 && s.reviewNotes?.trim()?.length>=5 && (!state.owner?.name || s.reviewer.toLowerCase().trim()!==state.owner.name.toLowerCase().trim())).length;
  return {selfRecords,reviewerRecords,required: GATE_DEFS.length, first, secondSelf, secondReviewed, second: secondReviewed>0?'EXTERNAL_REVIEW_RECORDED':secondSelf>0?'SELF_REPORTED':'NOT_ESTABLISHED', assets:state.assets.length, approvedAssets:state.assets.filter(a=>a.approved).length, negotiations:state.negotiations.length, successors:state.successors.length};
}
export function validateState(input) {
  if (!input || typeof input !== 'object' || input.schema !== SCHEMA || input.version !== 1) throw new Error('지원하지 않는 백업 버전 또는 형식입니다.');
  for (const key of ['owner','business']) if (!input[key] || typeof input[key] !== 'object' || Array.isArray(input[key])) throw new Error(`필수 객체 누락: ${key}`);
  for (const key of ['assets','gates','negotiations','successors','events']) if(!Array.isArray(input[key])) throw new Error(`필수 배열 누락: ${key}`);
  if (input.assets.length>10000 || input.negotiations.length>10000 || input.successors.length>10000 || input.events.length>30000) throw new Error('안전을 위한 레코드 개수 제한 초과');
  if (new Set(input.gates.map(g=>g.key)).size !== GATE_DEFS.length || GATE_DEFS.some(([key])=>!input.gates.some(g=>g.key===key))) throw new Error('독립성 검증 항목이 잘못되었습니다.');
  return input;
}
export function publicCatalog(state) {
  const email = state.owner.emailPublic && isEmail(state.owner.email) ? String(state.owner.email).trim() : '';
  return {schema:'gard.twin.public.catalog.v1',generatedAt:new Date().toISOString(),owner:{name:String(state.owner.name||'').slice(0,100), email},business:{name:String(state.business.name||'').slice(0,120),summary:String(state.business.publicSummary||'').slice(0,800)},items:state.assets.filter(a=>a.approved===true).map(a=>({id:a.id,title:String(a.title||'').slice(0,140),summary:String(a.summary||'').slice(0,1000),license:String(a.license||'문의').slice(0,140)}))};
}
export function exchangePackage(state, params={}) {
  return {schema:EXCHANGE_SCHEMA,version:1,exchangeId:makeId('EX'),threadId:params.threadId||makeId('THREAD'),createdAt:new Date().toISOString(),originRole:'independent_owner',originAlias:state.owner.name||'익명 오너',recipientAlias:String(params.recipientAlias||''),assetId:String(params.assetId||''),kind:String(params.kind||'QUESTION'),subject:String(params.subject||''),question:String(params.question||''),status:'DRAFT_NOT_SENT',evidenceRef:null,files:[],senderConfirmedAt:null,recipientConfirmedAt:null};
}
export function validateExchange(x) {
 if(!x||x.schema!==EXCHANGE_SCHEMA||x.version!==1||typeof x.exchangeId!=='string'||typeof x.subject!=='string'||typeof x.question!=='string'||!['QUESTION','RESPONSE','PROPOSAL','REVIEW'].includes(x.kind)) throw new Error('교환 JSON 규격이 올바르지 않습니다.');
 return x;
}
function crc32(data){let c=0xffffffff;for(const v of data){c^=v;for(let k=0;k<8;k++) c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function u16(view,off,n){view.setUint16(off,n,true);}function u32(view,off,n){view.setUint32(off,n>>>0,true);}
export function zipStore(entries){
 const enc=new TextEncoder(); const chunks=[]; const central=[]; let offset=0;
 for(const [name,value] of Object.entries(entries)){
  if(!name||name.includes('..')||name.startsWith('/')||name.includes('\\')) throw new Error('잘못된 ZIP 경로');
  const fn=enc.encode(name), body=typeof value==='string'?enc.encode(value):value; const hash=crc32(body); const h=new Uint8Array(30+fn.length),v=new DataView(h.buffer);u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x0800);u16(v,8,0);u16(v,10,0);u16(v,12,0);u32(v,14,hash);u32(v,18,body.length);u32(v,22,body.length);u16(v,26,fn.length);u16(v,28,0);h.set(fn,30);chunks.push(h,body);
  const c=new Uint8Array(46+fn.length),cv=new DataView(c.buffer);u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x0800);u16(cv,10,0);u32(cv,16,hash);u32(cv,20,body.length);u32(cv,24,body.length);u16(cv,28,fn.length);u32(cv,42,offset);c.set(fn,46);central.push(c);offset+=h.length+body.length;
 }
 const size=central.reduce((n,b)=>n+b.length,0);const end=new Uint8Array(22),ev=new DataView(end.buffer);u32(ev,0,0x06054b50);u16(ev,8,central.length);u16(ev,10,central.length);u32(ev,12,size);u32(ev,16,offset);return new Blob([...chunks,...central,end],{type:'application/zip'});
}
export function makeSuccessorKit(state) {
 const catalog=publicCatalog(state);
 const title=escapeHtml(catalog.business.name||'My Independent TWIN'); const owner=escapeHtml(catalog.owner.name||'독립 오너');const summary=escapeHtml(catalog.business.summary||'');
 const mail=catalog.owner.email ? `<a class="contact" href="mailto:${escapeHtml(catalog.owner.email)}?subject=${encodeURIComponent('TWIN 자산 문의')}">오너에게 이메일 문의</a>` : '<p>이메일 연락처는 아직 승인 공개되지 않았습니다.</p>';
 const cards=catalog.items.length?catalog.items.map(a=>`<article><small>${escapeHtml(a.id)}</small><h2>${escapeHtml(a.title)}</h2><p>${escapeHtml(a.summary)}</p><small>라이선스: ${escapeHtml(a.license)}</small></article>`).join('\n'):'<p>승인 공개된 자산이 없습니다. 창업자는 자신이 공개할 항목을 직접 결정해야 합니다.</p>';
 const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · 독립 자산시장</title><style>body{margin:0;background:#0c1624;color:#f7fafb;font-family:system-ui,sans-serif;line-height:1.7}main{max-width:850px;margin:auto;padding:55px 22px}.eyebrow{color:#7adbb4;letter-spacing:.08em;font-size:12px;font-weight:700}h1{font-size:clamp(30px,6vw,52px);line-height:1.2;margin:14px 0}.lead{color:#c9d5df;font-size:18px}article{background:#172536;border:1px solid #30485b;border-radius:16px;padding:23px;margin:16px 0}small{color:#91a8b7}.contact{display:inline-block;background:#71dab0;color:#092134;text-decoration:none;font-weight:800;padding:14px 21px;border-radius:12px;margin:18px 0}footer{border-top:1px solid #30485b;color:#91a8b7;padding-top:25px;margin-top:55px}</style></head><body><main><div class="eyebrow">OWNER-TO-OWNER · INDEPENDENT MARKET</div><h1>${title}</h1><p class="lead">${summary}</p><p>독립 소유자: ${owner}. 본 전시장은 승인 공개된 자산 설명만 표시합니다.</p>${mail}<h2>공개 자산</h2>${cards}<footer>GARD TWIN 방식으로 생성된 독립 전시장. 실제 검증·권리·판매 계약은 당사자 간 확인이 필요합니다.</footer></main></body></html>`;
 const readme=`# 독립 오너 전시장 인도 패키지\n\n1. ZIP을 압축 해제합니다.\n2. index.html을 PC에서 열어 자신의 승인 자산만 표시되는지 검수합니다.\n3. catalog.json은 공개용 요약만 포함합니다. 사적 질문, 고객정보, 원본 자산은 포함하지 않습니다.\n4. 새 GitHub 저장소에 index.html과 catalog.json만 업로드합니다.\n5. Netlify → Add new project → Import an existing project → GitHub에서 자신의 저장소를 선택합니다.\n6. Build command 비움, Publish directory . 으로 배포합니다.\n7. 배포 후 다른 브라우저에서 직접 열어보고 링크·권리 정보를 확인합니다.\n8. 이메일 문의는 자동으로 수집/발송되지 않습니다. 거래는 사적 이메일과 독립 증거 원장으로 관리합니다.\n9. 독립 검증은 본 ZIP 다운로드만으로 완료되지 않습니다. 복원, 공개 URL, 실제 사람과의 협상 증거가 필요합니다.\n`;
 return {'index.html':html,'catalog.json':JSON.stringify(catalog,null,2),'README_KO.md':readme};
}
