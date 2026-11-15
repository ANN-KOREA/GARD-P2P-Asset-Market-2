import {SCHEMA_VERSION,ASSET_CATEGORIES,DEAL_STATUS,TRANSITIONS,esc,won,showDate,validEmail,uid,iso,sha256,downloadBlob,downloadText,filename,mailto,notice,assert,toCSV,formValue,linkNav,safeFileSize} from './common.js';
import {dbGet,dbAll,dbPut,dbDel,getSettings,saveSettings,audit,ownerBackup,importOwnerBackup} from './db.js';
import {createZip} from './zip.js';
const $=id=>document.getElementById(id);
let currentAsset=null,currentDeal=null;
const assetForm=$('asset-form'),dealForm=$('deal-form');
const LOCKED_STATUSES=new Set(['AGREED','AWAITING_PAYMENT','PAID_CONFIRMED','DELIVERED','BUYER_ACK','DISPUTED']);
function tab(name){document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===name)));document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!=='tab-'+name);}
function assetStatus(a){if(a.visibility==='PROMOTION'&&a.publishApproved)return '<span class="chip">홍보 승인</span>';if(a.visibility==='SUSPENDED')return '<span class="chip warn">공개 중단</span>';return '<span class="chip ghost">비공개</span>';}
async function renderMetrics(){const [assets,deals]=await Promise.all([dbAll('assets'),dbAll('deals')]);$('metric-assets').textContent=assets.length;$('metric-published').textContent=assets.filter(a=>a.visibility==='PROMOTION'&&a.publishApproved).length;$('metric-deals').textContent=deals.length;$('metric-paid').textContent=deals.filter(d=>['PAID_CONFIRMED','DELIVERED','BUYER_ACK'].includes(d.status)).length;$('publish-count').textContent=assets.filter(a=>a.visibility==='PROMOTION'&&a.publishApproved).length;const settings=await getSettings();const emailReady=validEmail(settings.email);$('publish-email').textContent=emailReady?'설정 완료':'미설정';const approvedCount=assets.filter(a=>a.visibility==='PROMOTION'&&a.publishApproved).length;$('quick-publish-status').textContent=`로컬 공개 승인 ${approvedCount}건 · 문의 이메일 ${emailReady?'설정 완료':'미설정 (STEP 1 이메일 등록 필요)'} · 온라인 반영은 GitHub 업로드 후 확인`;
 $('quick-email-badge').textContent=emailReady?'이메일 저장됨':'이메일 미설정';
 $('quick-email-badge').classList.toggle('warn',!emailReady);
 $('quick-email-state').textContent=emailReady?'오너 이메일 저장 완료. 이미 공개된 사이트에 변경사항을 반영하려면 STEP 2에서 새 catalog.json을 다운로드하여 GitHub에 올리세요.':'오너 이메일을 등록하고 저장해야 공개 JSON을 다운로드할 수 있습니다.';
 for(const id of ['quick-export-catalog','form-export-catalog','export-catalog','preview-catalog'])$(id).disabled=!emailReady;}

function clearAsset(){currentAsset=null;assetForm.reset();assetForm.elements.id.value='';$('a-offer-price').value='0';$('a-approval').checked=false;$('a-status').value='DRAFT';$('asset-form-title').textContent='자산 등록';$('current-file').textContent='첨부 없음';$('delete-asset').hidden=true;document.querySelectorAll('#asset-list .list-record').forEach(x=>x.classList.remove('active'));}
async function selectAsset(id){const a=await dbGet('assets',id);if(!a)return;currentAsset=a;for(const key of ['id','title','summary','description','category','tags','evidenceSummary','pricePolicy','offerPrice','offerType','visibility','licenseSummary']){
 const el=assetForm.elements.namedItem(key);if(el)el.value=key==='tags'?(a.tags||[]).join(', '):(a[key]??'');}
 // Every edit requires a renewed explicit public approval.
 $('a-approval').checked=false;$('a-file').value='';$('a-remove-file').checked=false;
 $('current-file').textContent=a.fileId?`저장된 원본: ${esc(a.fileName)} (${Number(a.fileSize||0).toLocaleString()}바이트) · SHA-256 ${a.fileSha256?.slice(0,15)}…`:'첨부 없음';
 $('asset-form-title').textContent=`자산 수정 · v${a.version}`;$('delete-asset').hidden=false;
 document.querySelectorAll('#asset-list .list-record').forEach(x=>x.classList.toggle('active',x.dataset.id===id));}
async function renderAssets(){const q=$('asset-search').value.trim().toLocaleLowerCase('ko');const assets=(await dbAll('assets')).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')).filter(a=>!q||[a.title,a.id,...(a.tags||[])].join(' ').toLocaleLowerCase('ko').includes(q));
 $('asset-list').innerHTML=assets.length?assets.map(a=>`<article class="list-record ${a.id===currentAsset?.id?'active':''}" data-id="${esc(a.id)}"><div class="mini-row">${assetStatus(a)}<span class="tiny muted">v${a.version||1}</span></div><strong style="margin-top:8px">${esc(a.title)}</strong><p>${esc(a.summary||'').slice(0,130)}</p><div class="tiny muted">${esc(a.id)}</div><div class="controls"><button class="btn secondary small-btn" data-edit-asset="${esc(a.id)}" type="button">수정·확인</button></div></article>`).join(''):'<div class="empty"><strong>등록된 자산이 없습니다.</strong>새 자산을 등록하거나 비공개 예시를 만들어보세요.</div>';
 document.querySelectorAll('[data-edit-asset]').forEach(b=>b.addEventListener('click',()=>selectAsset(b.dataset.editAsset)));
 const dealSelect=$('d-asset'),selected=dealSelect.value,options=(await dbAll('assets')).sort((a,b)=>a.title.localeCompare(b.title,'ko'));dealSelect.innerHTML='<option value="">자산 선택</option>'+options.map(a=>`<option value="${esc(a.id)}">${esc(a.title)} (v${a.version})</option>`).join('');if(options.some(a=>a.id===selected))dealSelect.value=selected;
}
async function saveAssetHandler(e){e.preventDefault();try{
 const f=new FormData(assetForm),title=formValue(assetForm,'title'),summary=formValue(assetForm,'summary');assert(title.length>0&&summary.length>0,'자산명과 공개용 요약을 입력하세요.');
 const id=currentAsset?.id||uid('ASSET'),version=(currentAsset?.version||0)+1,visibility=formValue(assetForm,'visibility'),publishApproved=$('a-approval').checked&&visibility==='PROMOTION';
 const rawFile=$('a-file').files[0];let fileId=currentAsset?.fileId||null,fileName=currentAsset?.fileName||'',fileSha256=currentAsset?.fileSha256||'',fileSize=currentAsset?.fileSize||0;
 if(rawFile){safeFileSize(rawFile.size);const data=new Uint8Array(await rawFile.arrayBuffer());fileId=uid('FILE');fileName=filename(rawFile.name);fileSha256=await sha256(data);fileSize=data.length;await dbPut('files',{id:fileId,assetId:id,name:fileName,type:rawFile.type||'application/octet-stream',size:fileSize,sha256:fileSha256,data});}
 else if($('a-remove-file').checked){fileId=null;fileName='';fileSha256='';fileSize=0;}
 const record={id,version,title,summary,description:formValue(assetForm,'description'),category:formValue(assetForm,'category'),tags:formValue(assetForm,'tags').split(',').map(t=>t.trim()).filter(Boolean).slice(0,20),
 evidenceSummary:formValue(assetForm,'evidenceSummary'),pricePolicy:formValue(assetForm,'pricePolicy'),offerPrice:Math.max(0,Number(f.get('offerPrice')||0)),offerType:formValue(assetForm,'offerType'),visibility,licenseSummary:formValue(assetForm,'licenseSummary'),publishApproved,approvedAt:publishApproved?iso():null,approvalNote:publishApproved?'Owner explicit per-version approval':null,
 fileId,fileName,fileSha256,fileSize,createdAt:currentAsset?.createdAt||iso(),updatedAt:iso()};
 assert(Number.isSafeInteger(record.offerPrice),'가격은 0 이상의 정수여야 합니다.');await dbPut('assets',record);
 if(currentAsset?.fileId&&currentAsset.fileId!==fileId)await dbDel('files',currentAsset.fileId);
 await audit(currentAsset?'ASSET_UPDATED':'ASSET_CREATED',id,`v${version}; 공개상태=${visibility}; 승인=${publishApproved}`);currentAsset=record;await renderAssets();await renderMetrics();await selectAsset(id);notice('자산이 로컬에 저장되었습니다. 공개 상태의 변경은 다음 JSON 배포 후 반영됩니다.');
 }catch(err){notice(err.message,'error');}}
async function deleteAssetHandler(){if(!currentAsset)return;const related=(await dbAll('deals')).filter(d=>d.assetId===currentAsset.id);if(!confirm(`${currentAsset.title}을 로컬에서 삭제하시겠습니까?${related.length?' 연결된 거래 '+related.length+'건은 보존됩니다.':''}\n이미 공개된 자산은 새로운 카탈로그를 배포해야 사라집니다.`))return;
 const id=currentAsset.id;if(currentAsset.fileId)await dbDel('files',currentAsset.fileId);await dbDel('assets',id);await audit('ASSET_DELETED',id);clearAsset();await renderAssets();await renderMetrics();notice('로컬 원본을 삭제했습니다. 공개 카탈로그도 새로 배포하세요.');}
function clearDeal(){currentDeal=null;dealForm.reset();dealForm.elements.id.value='';$('d-amount').value='0';$('deal-form-title').textContent='새 거래 등록';$('deal-history').innerHTML='거래를 선택하세요.';$('deal-current-status').textContent=DEAL_STATUS.INQUIRY;for(const name of ['assetId','buyerEmail','buyerName','amount','terms','quoteRef'])dealForm.elements.namedItem(name).disabled=false;updateTransitions();document.querySelectorAll('#deal-list .list-record').forEach(x=>x.classList.remove('active'));}
function updateTransitions(){const s=currentDeal?.status||'INQUIRY';$('deal-current-status').textContent=DEAL_STATUS[s]||s;const list=currentDeal?(TRANSITIONS[s]||[]):[];$('deal-next-status').innerHTML='<option value="">상태 선택</option>'+list.map(x=>`<option value="${x}">${DEAL_STATUS[x]}</option>`).join('');$('apply-status').disabled=!currentDeal||!list.length;$('delivery-zip').disabled=!currentDeal||!['PAID_CONFIRMED','DELIVERED','BUYER_ACK'].includes(s);$('bank-evidence').value='';$('bank-confirm').checked=false;$('payment-proof-box').hidden=true;$('transition-note').value='';}
function lockDealFields(){const locked=Boolean(currentDeal&&LOCKED_STATUSES.has(currentDeal.status));for(const name of ['assetId','buyerEmail','buyerName','amount','terms','quoteRef'])dealForm.elements.namedItem(name).disabled=locked;}
async function selectDeal(id){const d=await dbGet('deals',id);if(!d)return;currentDeal=d;
 for(const key of ['id','assetId','buyerEmail','buyerName','subject','amount','quoteRef','terms','notes']){const field=dealForm.elements.namedItem(key);if(field)field.value=d[key]??'';}
 $('deal-form-title').textContent=d.id;lockDealFields();updateTransitions();
 $('deal-history').innerHTML='<ul class="timeline">'+(d.history||[]).slice().reverse().map(h=>`<li><strong>${esc(h.event in DEAL_STATUS?DEAL_STATUS[h.event]:h.event)}</strong> · <span class="tiny muted">${showDate(h.at)}</span><div>${esc(h.note||'')}</div></li>`).join('')+'</ul>';
 document.querySelectorAll('#deal-list .list-record').forEach(x=>x.classList.toggle('active',x.dataset.id===d.id));}
async function renderDeals(){const q=$('deal-search').value.toLowerCase().trim(),deals=(await dbAll('deals')).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')).filter(d=>!q||[d.id,d.assetId,d.buyerEmail,d.buyerName].join(' ').toLowerCase().includes(q));const assets=await dbAll('assets'),am=new Map(assets.map(a=>[a.id,a.title]));
 $('deal-list').innerHTML=deals.length?deals.map(d=>`<article class="list-record ${d.id===currentDeal?.id?'active':''}" data-id="${esc(d.id)}"><div class="mini-row"><span class="chip ${d.status==='CANCELLED'?'danger':d.status==='PAID_CONFIRMED'?'warn':''}">${esc(DEAL_STATUS[d.status]||d.status)}</span><span class="tiny muted">${showDate(d.updatedAt)}</span></div><strong style="margin-top:8px">${esc(am.get(d.assetId)||d.assetId)}</strong><p>${esc(d.buyerEmail)} · ${won(d.amount)}</p><div class="tiny muted">${esc(d.id)}</div><div class="controls"><button type="button" data-edit-deal="${esc(d.id)}" class="btn secondary small-btn">협상 기록 열기</button></div></article>`).join(''):'<div class="empty"><strong>거래 기록이 없습니다.</strong>실제 이메일 문의가 들어오면 수동으로 등록하세요.</div>';
 document.querySelectorAll('[data-edit-deal]').forEach(b=>b.addEventListener('click',()=>selectDeal(b.dataset.editDeal)));}
async function saveDealHandler(e){e.preventDefault();try{
 const locked=Boolean(currentDeal&&LOCKED_STATUSES.has(currentDeal.status));const email=locked?currentDeal.buyerEmail:formValue(dealForm,'buyerEmail');
 assert(validEmail(email),'이메일 주소 형식이 올바르지 않습니다.');let assetId=locked?currentDeal.assetId:formValue(dealForm,'assetId');assert(assetId&&await dbGet('assets',assetId),'실제 등록된 자산을 선택하세요.');
 const amount=locked?currentDeal.amount:Number(formValue(dealForm,'amount'));
 assert(Number.isSafeInteger(amount)&&amount>=0,'가격은 0 이상의 정수로 입력하세요.');const terms=locked?currentDeal.terms:formValue(dealForm,'terms');assert(terms.length>0,'이용권 및 인도 조건을 기입하세요.');
 const id=currentDeal?.id||uid('DEAL'),createdAt=currentDeal?.createdAt||iso();const record={id,assetId,buyerEmail:email,buyerName:locked?currentDeal.buyerName:formValue(dealForm,'buyerName'),subject:formValue(dealForm,'subject'),amount,currency:'KRW',terms,
 quoteRef:locked?currentDeal.quoteRef:formValue(dealForm,'quoteRef'),notes:formValue(dealForm,'notes'),status:currentDeal?.status||'INQUIRY',history:currentDeal?.history||[{event:'CREATED',at:iso(),note:'구매자 이메일 문의를 오너가 수동 등록'}],
 bankEvidence:currentDeal?.bankEvidence||null,bankVerifiedAt:currentDeal?.bankVerifiedAt||null,deliveryGeneratedAt:currentDeal?.deliveryGeneratedAt||null,deliveryPackSha256:currentDeal?.deliveryPackSha256||null,createdAt,updatedAt:iso()};
 await dbPut('deals',record);await audit(currentDeal?'DEAL_UPDATED':'DEAL_CREATED',id,`자산=${assetId}`);await renderDeals();await renderMetrics();await selectDeal(id);notice('거래 원장이 저장되었습니다.');
 }catch(err){notice(err.message,'error');}}
async function statusHandler(){try{
 assert(currentDeal,'먼저 거래를 선택하세요.');const next=$('deal-next-status').value;assert((TRANSITIONS[currentDeal.status]||[]).includes(next),'허용된 다음 상태를 선택하세요.');let note=$('transition-note').value.trim();
 if(next==='AGREED'){
  assert(currentDeal.quoteRef.trim()&&currentDeal.terms.trim(),'합의 전 견적·계약 참조번호와 상세 조건을 저장하세요.');assert(note,'구매자의 명시적 합의 이메일 근거를 기입하세요.');
  assert(confirm('구매자의 조건·가격·라이선스 동의 이메일을 실제 확인했습니까?'),'합의 확인이 취소되었습니다.');
 }
 if(next==='PAID_CONFIRMED'){
  assert(currentDeal.amount>0,'0원 거래는 유상 입금 확인 상태로 전환할 수 없습니다.');
  assert($('bank-confirm').checked&&$('bank-evidence').value.trim().length>=5,'실제 은행 입금내역 확인과 근거를 모두 입력하세요.');
  note=($('bank-evidence').value.trim()+' | '+note).trim();
 }
 if(next==='DELIVERED'){
  assert(currentDeal.deliveryGeneratedAt,'먼저 인도 ZIP을 생성하세요.');assert(note,'실제 이메일 전달 일시와 방법을 기록하세요.');
  assert(confirm('생성한 인도 ZIP을 구매자에게 실제로 전달했습니까?'),'인도 확인 취소');
 }
 if(next==='BUYER_ACK')assert(note,'구매자의 실제 인수 확인 근거를 입력하세요.');
 const d={...currentDeal,status:next,updatedAt:iso(),history:[...(currentDeal.history||[]),{event:next,at:iso(),note}]};
 if(next==='AGREED'){const agreedAsset=await dbGet('assets',d.assetId);assert(agreedAsset,'합의 자산을 찾을 수 없습니다.');d.assetSnapshot={id:agreedAsset.id,title:agreedAsset.title,version:agreedAsset.version,fileId:agreedAsset.fileId,fileSha256:agreedAsset.fileSha256};}
 if(next==='PAID_CONFIRMED'){d.bankVerifiedAt=iso();d.bankEvidence=$('bank-evidence').value.trim();}
 await dbPut('deals',d);await audit('DEAL_STATUS',d.id,`${currentDeal.status} → ${next}; ${note}`);await renderDeals();await renderMetrics();await selectDeal(d.id);notice('거래 상태가 증거와 함께 기록되었습니다.');
 }catch(err){notice(err.message,'error');}}
async function exportDelivery(){try{
 assert(currentDeal&&['PAID_CONFIRMED','DELIVERED','BUYER_ACK'].includes(currentDeal.status),'입금 확인을 마친 거래만 인도할 수 있습니다.');
 const asset=await dbGet('assets',currentDeal.assetId);assert(asset&&asset.fileId,'원본 자산과 인도 파일이 모두 존재해야 합니다.');
 const snapshot=currentDeal.assetSnapshot;assert(snapshot && snapshot.id===asset.id && snapshot.version===asset.version && snapshot.fileId===asset.fileId && snapshot.fileSha256===asset.fileSha256,'합의 이후 자산의 버전이나 파일이 변경되었습니다. 기존 계약으로 인도할 수 없습니다. 별도 변경합의가 필요합니다.');
 const file=await dbGet('files',asset.fileId);assert(file?.data,'인도 파일을 찾을 수 없습니다.');
 const hash=await sha256(file.data);assert(hash===file.sha256,'원본 파일 무결성 검사에 실패했습니다.');const settings=await getSettings();
 const path='asset/'+filename(file.name),deliveredAt=iso(),manifest={format:'gard-p2p-delivery',schema_version:SCHEMA_VERSION,generated_at:deliveredAt,deal_id:currentDeal.id,
 asset:{id:asset.id,title:asset.title,version:asset.version,category:asset.category},buyer:{email:currentDeal.buyerEmail,name:currentDeal.buyerName},seller:{name:settings.publisherName,email:settings.email},
 agreement:{reference:currentDeal.quoteRef,license_terms:currentDeal.terms,amount:currentDeal.amount,currency:'KRW'},payment:{status:'SELLER_REPORTED_VERIFIED',verified_at:currentDeal.bankVerifiedAt,verification_type:'manual_bank_ledger_check'},
 file:{path,name:file.name,size:file.size,mime:file.type,sha256:hash}};
 const license=`GARD P2P ASSET DELIVERY LICENSE\n\nDeal ID: ${currentDeal.id}\nAsset: ${asset.title} (${asset.id} v${asset.version})\nSeller: ${settings.publisherName} <${settings.email}>\nBuyer: ${currentDeal.buyerEmail}\nAgreement reference: ${currentDeal.quoteRef}\nAgreed amount: ${won(currentDeal.amount)}\n\nAGREED TERMS:\n${currentDeal.terms}\n\nNOTICE: This package reproduces the seller's transaction record. Verify against the parties' original email agreement. SHA-256 confirms file consistency, not authorship or legal title.\n`;
 const zip=createZip([{name:'manifest.json',data:JSON.stringify(manifest,null,2)},{name:'LICENSE.txt',data:license},{name:path,data:file.data}]);
 const packSha256=await sha256(new Uint8Array(await zip.arrayBuffer()));downloadBlob(`${filename(currentDeal.id)}-delivery.zip`,zip);
 const d={...currentDeal,deliveryGeneratedAt:deliveredAt,deliveryPackSha256:packSha256,updatedAt:iso(),history:[...(currentDeal.history||[]),{event:'PACK_CREATED',at:iso(),note:`ZIP ${packSha256.slice(0,16)}…`}]};await dbPut('deals',d);await audit('DELIVERY_PACK_CREATED',d.id,packSha256);await renderDeals();await selectDeal(d.id);notice('인도 ZIP을 생성했습니다. 이메일에 직접 첨부해 전달한 후 인도 완료를 기록하세요.');
 }catch(err){notice(err.message,'error');}}
async function openEmailDraft(){try{assert(currentDeal,'거래를 선택하세요.');const a=await dbGet('assets',currentDeal.assetId),s=await getSettings();const subject=`[GARD][${currentDeal.id}][${currentDeal.assetId}] 거래 조건 협의`;
 const body=`안녕하세요.\n\n자산: ${a?.title||currentDeal.assetId}\n거래 ID: ${currentDeal.id}\n참조번호: ${currentDeal.quoteRef||'미정'}\n금액: ${won(currentDeal.amount)}\n\n제안/합의 조건:\n${currentDeal.terms}\n\n현재 단계: ${DEAL_STATUS[currentDeal.status]}\n\n이 이메일은 거래 초안이며, 계약 동의나 입금 사실을 자동으로 보증하지 않습니다. 답장으로 합의 여부를 명확히 알려주세요.\n\n${s.publisherName}`;
 location.href=mailto(currentDeal.buyerEmail,subject,body);notice('메일 앱이 열리지 않으면 거래 메일 주소를 직접 사용하세요.');
 }catch(err){notice(err.message,'error');}}
function publicCatalog(assets,settings){assert(validEmail(settings.email),'설정에서 공개 문의용 이메일을 입력하세요.');const approved=assets.filter(a=>a.visibility==='PROMOTION'&&a.publishApproved);
 const fields=approved.map(a=>({id:a.id,version:a.version,title:a.title,summary:a.summary,category:a.category,tags:a.tags||[],evidenceSummary:a.evidenceSummary||'',pricePolicy:a.pricePolicy,offerPrice:a.pricePolicy==='FIXED'?a.offerPrice:null,offerType:a.offerType,licenseSummary:a.licenseSummary||'',visibility:'PROMOTION',approved:true,publishedAt:a.approvedAt}));
 return {schema_version:SCHEMA_VERSION,generated_at:iso(),publisher:{name:settings.publisherName,email:settings.email},assets:fields};}
async function getPublicJSON(){return publicCatalog(await dbAll('assets'),await getSettings());}
async function exportPublicCatalog(){
 try{
  const c=await getPublicJSON();
  if(!c.assets.length && !confirm('현재 저장된 공개 승인 자산이 0건입니다. 빈 catalog.json을 GitHub에 올리면 기존 전시장 자산이 모두 비공개로 전환됩니다. 의도적으로 빈 JSON을 다운로드하시겠습니까?'))return;
  downloadText('catalog.json',JSON.stringify(c,null,2));
  $('catalog-preview').textContent=JSON.stringify(c,null,2);
  $('catalog-export-status').textContent=`파일 다운로드 요청: catalog.json · 공개 승인 ${c.assets.length}건. GitHub 저장소의 catalog.json을 직접 교체해야 사이트에 반영됩니다.`;
  notice(`공개 승인 ${c.assets.length}건의 catalog.json 다운로드를 요청했습니다. GitHub 파일 교체가 다음 단계입니다.`);
 }catch(e){
  $('catalog-export-status').textContent=`다운로드 실패: ${e.message}`;
  notice(e.message+' · 화면 상단 STEP 1에서 오너 거래 문의용 이메일을 입력하세요.','error');
 }
}
function openPublishTab(){tab('publish');$('export-catalog').focus();}

async function renderAudit(){const logs=(await dbAll('audit')).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,40);$('audit-list').innerHTML=logs.length?logs.map(x=>`<div class="timeline" style="padding:8px 0;border-bottom:1px solid var(--line)"><strong>${esc(x.event)}</strong> <span class="tiny muted">${showDate(x.at)}</span><div>${esc(x.entityId)} · ${esc(x.detail||'')}</div></div>`).join(''):'기록 없음';}
async function loadSettingsForm(){const s=await getSettings();$('s-name').value=s.publisherName||'';$('s-email').value=s.email||'';$('quick-owner-email').value=s.email||'';$('s-notice').value=s.notice||'';}
async function saveQuickEmailHandler(e){e.preventDefault();try{
 const email=$('quick-owner-email').value.trim();assert(validEmail(email),'올바른 오너 이메일 주소를 입력하세요.');
 const old=await getSettings();await saveSettings({...old,email});
 await audit('SETTINGS_UPDATED','publisher','오너 공개 문의 이메일 수정');
 await loadSettingsForm();await renderMetrics();await renderAudit();
 notice('거래 문의용 이메일을 로컬에 저장했습니다. 공개 전시장은 catalog.json을 GitHub에 반영한 뒤 변경됩니다.');
 }catch(e){notice('이메일 저장 실패: '+e.message,'error');}
}
function focusOwnerEmail(){tab('assets');$('owner-email-setup').scrollIntoView({behavior:'smooth',block:'start'});$('quick-owner-email').focus();}
async function refresh(){await Promise.all([renderAssets(),renderDeals(),renderMetrics(),renderAudit()]);}
async function createDemo(){try{if(!confirm('합성 예시 자산을 비공개로 하나 만드시겠습니까? 실제 거래나 성과와 무관합니다.'))return;
 const id=uid('ASSET'),fileId=uid('FILE'),data=new TextEncoder().encode('GARD SYNTHETIC DEMO ONLY\nThis is not a real asset for sale.\n');const digest=await sha256(data);await dbPut('files',{id:fileId,assetId:id,name:'synthetic-demo.txt',size:data.length,sha256:digest,type:'text/plain',data});
 await dbPut('assets',{id,version:1,title:'[합성 예시] GARD 로컬 자산 검증 샘플',summary:'사용법을 시험하기 위한 합성 예시입니다. 실제 판매 자산이 아닙니다.',description:'사용법 시험용 합성 데이터',category:'데이터·JSON',tags:['SYNTHETIC','DEMO'],evidenceSummary:'실제 검증 실적 없음',pricePolicy:'NEGOTIABLE',offerPrice:0,offerType:'EVALUATION',licenseSummary:'실제 거래 불가',visibility:'DRAFT',publishApproved:false,approvedAt:null,fileId,fileName:'synthetic-demo.txt',fileSha256:digest,fileSize:data.length,createdAt:iso(),updatedAt:iso()});await audit('SYNTHETIC_DEMO_CREATED',id);await refresh();tab('assets');await selectAsset(id);notice('비공개 합성 예시를 만들었습니다.');
 }catch(e){notice(e.message,'error');}}
async function init(){linkNav();ASSET_CATEGORIES.forEach(c=>$('a-category').add(new Option(c,c)));
 document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>tab(btn.dataset.tab)));
 $('new-asset').addEventListener('click',clearAsset);$('reset-asset').addEventListener('click',clearAsset);$('asset-search').addEventListener('input',renderAssets);assetForm.addEventListener('submit',saveAssetHandler);$('delete-asset').addEventListener('click',deleteAssetHandler);
 $('new-deal').addEventListener('click',clearDeal);$('deal-search').addEventListener('input',renderDeals);dealForm.addEventListener('submit',saveDealHandler);$('deal-email').addEventListener('click',openEmailDraft);
 $('deal-next-status').addEventListener('change',()=>{$('payment-proof-box').hidden=$('deal-next-status').value!=='PAID_CONFIRMED';});$('apply-status').addEventListener('click',statusHandler);$('delivery-zip').addEventListener('click',exportDelivery);
 $('export-catalog').addEventListener('click',exportPublicCatalog);
 $('quick-export-catalog').addEventListener('click',exportPublicCatalog);
 $('form-export-catalog').addEventListener('click',exportPublicCatalog);
 $('quick-go-publish').addEventListener('click',openPublishTab);
 $('quick-email-form').addEventListener('submit',saveQuickEmailHandler);
 $('publish-go-email').addEventListener('click',focusOwnerEmail);
 $('preview-catalog').addEventListener('click',async()=>{try{$('catalog-preview').textContent=JSON.stringify(await getPublicJSON(),null,2);}catch(e){notice(e.message,'error');}});
 $('settings-form').addEventListener('submit',async e=>{e.preventDefault();try{const name=formValue(e.target,'publisherName'),email=formValue(e.target,'email');assert(name&&validEmail(email),'발행자 이름과 올바른 거래용 이메일을 입력하세요.');await saveSettings({publisherName:name,email,notice:formValue(e.target,'notice')});await audit('SETTINGS_UPDATED','publisher','거래용 이메일 설정');await loadSettingsForm();await renderMetrics();await renderAudit();notice('로컬 발행자 설정을 저장했습니다. 변경한 공개 이메일은 다음 catalog.json 배포 후 전시장에 반영됩니다.');}catch(err){notice(err.message,'error');}});
 $('backup-download').addEventListener('click',async()=>{try{const backup=await ownerBackup();downloadText(`gard-owner-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(backup));await audit('BACKUP_EXPORTED','owner',`${backup.assets.length} assets; ${backup.deals.length} deals`);notice('전체 원본과 거래 기록을 포함한 백업을 내려받았습니다. 안전한 곳에 저장하세요.');}catch(e){notice(e.message,'error');}});
 $('backup-restore').addEventListener('click',async()=>{try{const file=$('backup-file').files[0];assert(file&&file.size<180*1024*1024,'180MB 이하의 JSON 백업을 선택하세요.');const json=JSON.parse(await file.text()),mode=$('restore-mode').value;if(!confirm(`${mode==='replace'?'기존 오너 데이터를 전체 교체':'기존 오너 데이터와 병합'}하시겠습니까? 이 작업은 되돌릴 수 없습니다.`))return;const result=await importOwnerBackup(json,mode);clearAsset();clearDeal();await refresh();await loadSettingsForm();notice(`복원 완료: 자산 ${result.assets}건, 거래 ${result.deals}건, 파일 ${result.files}건`);}catch(e){notice('백업 복원 실패: '+e.message,'error');}});
 $('export-deals-csv').addEventListener('click',async()=>{const rows=await dbAll('deals');downloadText('gard-deals.csv','\ufeff'+toCSV(rows,['id','assetId','buyerEmail','buyerName','subject','amount','currency','status','quoteRef','bankVerifiedAt','deliveryGeneratedAt','createdAt','updatedAt']),'text/csv;charset=utf-8');notice('CSV에는 개인정보가 포함됩니다. 외부 공개하지 마세요.');});
 $('create-demo').addEventListener('click',createDemo);await loadSettingsForm();clearAsset();clearDeal();await refresh();
}
init().catch(e=>notice('앱 초기화 실패: '+e.message,'error'));
