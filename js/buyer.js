import {SCHEMA_VERSION,esc,showDate,won,notice,assert,sha256,downloadBlob,downloadText,iso,linkNav} from './common.js';
import {dbAll,dbPut,dbGet,buyerBackup,importBuyerBackup} from './db.js';
import {parseZip} from './zip.js';
const $=id=>document.getElementById(id);
const dec=new TextDecoder('utf-8',{fatal:true});
async function render(){const purchases=(await dbAll('purchases')).sort((a,b)=>b.importedAt.localeCompare(a.importedAt));$('buyer-count').textContent=`${purchases.length}개 인도 자산을 이 기기에서 보관 중입니다.`;
 $('buyer-assets').innerHTML=purchases.length?purchases.map(p=>`<article class="card asset-card"><div class="meta-row"><span class="chip">SHA-256 일치</span><span class="tiny muted">${showDate(p.importedAt)}</span></div><h3>${esc(p.assetTitle)}</h3><div class="small muted">거래 ID: ${esc(p.dealId)}<br>자산 ID: ${esc(p.assetId)} · v${esc(p.assetVersion)}</div><div class="code-box small" style="flex:1;max-height:130px">${esc(p.licenseTerms)}</div><div class="tiny muted" style="overflow-wrap:anywhere">${esc(p.fileName)} · ${esc(p.fileSha256.slice(0,24))}…</div><div class="controls"><button class="btn small-btn" data-file="${esc(p.id)}" type="button">인도 파일 저장</button><button class="btn secondary small-btn" data-manifest="${esc(p.id)}" type="button">자산여권 JSON</button></div></article>`).join(''):'<div class="empty" style="grid-column:1/-1"><strong>받은 자산이 없습니다.</strong>오너가 실제로 이메일로 전달한 인도 ZIP을 가져오세요.</div>';
 document.querySelectorAll('[data-file]').forEach(b=>b.addEventListener('click',async()=>{try{const p=await dbGet('purchases',b.dataset.file);assert(p,'기록을 찾지 못했습니다.');assert(await sha256(p.fileData)===p.fileSha256,'저장된 파일 해시가 일치하지 않습니다.');downloadBlob(p.fileName,new Blob([p.fileData],{type:p.fileMime||'application/octet-stream'}));}catch(e){notice(e.message,'error');}}));
 document.querySelectorAll('[data-manifest]').forEach(b=>b.addEventListener('click',async()=>{const p=await dbGet('purchases',b.dataset.manifest);downloadText(`passport-${p.dealId}.json`,JSON.stringify(p.manifest,null,2));}));
}
async function importDelivery(){try{const f=$('delivery-file').files[0];assert(f&&f.size<=60*1024*1024,'60MB 이하의 GARD 인도 ZIP을 선택하세요.');
 const entries=parseZip(await f.arrayBuffer());assert(entries.has('manifest.json')&&entries.has('LICENSE.txt'),'GARD 인도용 ZIP 필수 파일이 없습니다.');
 const manifest=JSON.parse(dec.decode(entries.get('manifest.json')));assert(manifest?.format==='gard-p2p-delivery'&&manifest.schema_version===SCHEMA_VERSION,'인도용 자산여권 버전이 유효하지 않습니다.');
 const ref=manifest.file;assert(ref&&typeof ref.path==='string'&&ref.path.startsWith('asset/')&&entries.has(ref.path),'인도 파일 경로가 유효하지 않습니다.');
 const data=entries.get(ref.path);assert(data.length===ref.size&&ref.size<=50*1024*1024,'인도 파일 크기가 기록과 다릅니다.');const digest=await sha256(data);assert(digest===ref.sha256,'SHA-256 불일치: 파일을 저장하지 않았습니다.');
 assert(typeof manifest.deal_id==='string'&&manifest.deal_id.length<120&&typeof manifest.asset?.id==='string'&&typeof manifest.asset?.title==='string'&&typeof manifest.agreement?.license_terms==='string'&&typeof manifest.buyer?.email==='string','인도 자산여권 필수 정보가 누락되었습니다.');
 assert(manifest.payment?.status==='SELLER_REPORTED_VERIFIED','오너의 결제 확인 상태가 표시되지 않았습니다.');
 const record={id:`${manifest.deal_id}:${digest.slice(0,16)}`,dealId:manifest.deal_id,assetId:manifest.asset.id,assetTitle:manifest.asset.title,assetVersion:manifest.asset.version,buyerEmail:manifest.buyer.email,sellerName:manifest.seller?.name||'',fileName:ref.name||'asset.bin',fileMime:ref.mime||'application/octet-stream',fileSha256:digest,fileData:data,licenseTerms:manifest.agreement.license_terms,amount:manifest.agreement.amount,currency:manifest.agreement.currency||'KRW',manifest,importedAt:iso(),hashVerified:true};
 await dbPut('purchases',record);await render();notice('인도 ZIP 파일의 SHA-256 무결성을 확인하고 구매자 로컬 원장에 저장했습니다. 신원·저작권·성능 검증과는 별개입니다.');$('delivery-file').value='';
 }catch(e){notice('인도 검증 실패: '+e.message,'error');}}
async function init(){linkNav();$('verify-delivery').addEventListener('click',importDelivery);
 $('buyer-backup').addEventListener('click',async()=>{try{const backup=await buyerBackup();downloadText(`gard-buyer-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(backup));notice('구매자 백업을 저장했습니다. 인도 파일을 포함하므로 비공개로 보관하세요.');}catch(e){notice(e.message,'error');}});
 $('buyer-restore').addEventListener('click',async()=>{try{const f=$('buyer-restore-file').files[0];assert(f&&f.size<=150*1024*1024,'150MB 이하 구매자 백업 JSON을 선택하세요.');const j=JSON.parse(await f.text());if(!confirm('구매자 백업을 병합하시겠습니까? 같은 거래 ID/해시의 기록은 덮어씁니다.'))return;const n=await importBuyerBackup(j);await render();notice(`구매자 자산 ${n}건을 복원했습니다.`);}catch(e){notice('복원 실패: '+e.message,'error');}});
 await render();}
init().catch(e=>notice('구매자 앱 오류: '+e.message,'error'));
