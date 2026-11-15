import {esc, won, normalizeCatalog, mailto, validEmail, copyText, notice, linkNav} from './common.js';
let catalog={assets:[],publisher:{}},active=null;
const $=id=>document.getElementById(id);
const contactEmail=()=>String(catalog.publisher?.email||'').trim();
const hasContact=()=>validEmail(contactEmail());
function inquiryText(asset){return `GARD 자산 거래 문의\n\n자산 ID: ${asset.id}\n자산명: ${asset.title}\n자산 버전: v${asset.version}\n\n1. 자산을 활용하려는 목적:\n2. 추가로 확인하고 싶은 사항:\n3. 원하는 이용권 범위(개인/기관/상업용 등):\n4. 희망 거래 방식/가격:\n\n상세자료 공개 범위, 가격, 라이선스, 전달 방식과 취소·환불 조건을 이메일로 협의하고 싶습니다.`;}
function priceText(a){return a.pricePolicy==='FIXED'?won(a.offerPrice)+' (제안가)':a.pricePolicy==='ON_REQUEST'?'문의 후 안내':'1:1 협상';}
function emailLink(asset){return mailto(contactEmail(),`[GARD][${asset.id}] 자산 거래 문의`,inquiryText(asset));}
function contactMarkup(asset){
 if(!hasContact())return '<span class="email-unavailable">문의 이메일 미설정</span>';
 const href=asset?emailLink(asset):'mailto:'+encodeURIComponent(contactEmail());
 return `<a class="email-address" href="${esc(href)}" aria-label="${asset?'이 자산에 이메일 문의':'문의 이메일 열기'}: ${esc(contactEmail())}">${esc(contactEmail())}</a>`;
}
function renderPublisherContact(){
 const box=$('publisher-contact');box.hidden=false;
 if(!hasContact()){
  box.className='publisher-contact missing';
  box.innerHTML='<div><strong>거래 문의 이메일: 미설정</strong><p>오너가 이메일을 저장하고 새 catalog.json을 GitHub에 배포해야 문의할 수 있습니다.</p></div>';
  return;
 }
 box.className='publisher-contact';
 box.innerHTML=`<div class="publisher-contact-label"><strong>공개 거래 문의 이메일</strong><div>${contactMarkup(null)}</div><p>관심 있는 자산은 아래 카드에서 이메일로 직접 문의할 수 있습니다.</p></div><button id="copy-publisher-email" class="btn secondary small-btn" type="button">이메일 주소 복사</button>`;
 $('copy-publisher-email').addEventListener('click',copyEmail);
}
async function copyEmail(){
 if(!hasContact()){notice('공개 문의 이메일이 설정되지 않았습니다.','error');return;}
 try{await copyText(contactEmail());notice('문의 이메일 주소를 복사했습니다.');}
 catch(e){notice('이메일 복사 실패: '+e.message,'error');}
}
function showModal(a){active=a;$('detail-title').textContent=a.title;$('detail-kicker').textContent=`${a.id} · v${a.version}`;
 $('detail-body').innerHTML=`<div class="tagrow" style="margin:14px 0"><span class="chip">${esc(a.category)}</span>${a.tags.map(tag=>`<span class="tag">${esc(tag)}</span>`).join('')}</div><p>${esc(a.summary).replaceAll('\n','<br>')}</p><div class="divider"></div><div class="kv"><span>가격 정책</span><strong>${esc(priceText(a))}</strong></div><div class="kv"><span>권리 제안</span><strong>${esc(a.offerType==='NON_EXCLUSIVE'?'비독점 이용권':a.offerType==='EVALUATION'?'검토·평가용':'개별 협상')}</strong></div><div class="kv"><span>검증 근거 개요</span><span>${esc(a.evidenceSummary||'별도 협의 — 독립 검증 미확인')}</span></div><div class="kv"><span>기본 라이선스</span><span>${esc(a.licenseSummary||'최종 이용권 조건은 이메일 협의 후 확정')}</span></div><div class="kv"><span>발행자</span><span>${esc(catalog.publisher.name)}</span></div><div class="kv"><span>거래 문의 이메일</span><span>${contactMarkup(a)}</span></div><p class="tiny muted">이 공개 카드는 원본 파일의 제공, 권리의 양도 또는 객관적 검증 완료를 의미하지 않습니다.</p>`;
 const link=$('inquiry-link');const copyButton=$('copy-email');if(hasContact()){link.href=emailLink(a);link.removeAttribute('aria-disabled');link.style.pointerEvents='';link.textContent='이메일로 문의';copyButton.disabled=false;}else{link.removeAttribute('href');link.setAttribute('aria-disabled','true');link.style.pointerEvents='none';link.textContent='이메일 준비 중';copyButton.disabled=true;}
 $('asset-modal').hidden=false;$('close-modal').focus();}
function render(){const q=$('search').value.trim().toLocaleLowerCase('ko'),c=$('category').value;const list=catalog.assets.filter(a=>(!c||a.category===c)&&(!q||[a.title,a.summary,a.category,...a.tags].join(' ').toLocaleLowerCase('ko').includes(q)));
 $('assets').innerHTML=!list.length?`<div class="empty" style="grid-column:1/-1"><strong>${catalog.assets.length?'검색 조건에 맞는 자산이 없습니다.':'아직 공개 승인된 자산이 없습니다.'}</strong>오너가 명시적으로 승인한 자산만 이곳에 표시됩니다.</div>`:list.map(a=>`<article class="card asset-card"><div class="meta-row"><span class="chip">${esc(a.category)}</span><span class="tiny muted">v${esc(a.version)}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.summary.length>210?a.summary.slice(0,210)+'…':a.summary)}</p><div class="tagrow">${a.tags.slice(0,4).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><div class="card-contact"><span>거래 문의 이메일</span>${contactMarkup(a)}</div><div class="meta-row"><strong class="small">${esc(priceText(a))}</strong><button data-id="${esc(a.id)}" class="btn small-btn">자산 자세히</button></div></article>`).join('');
 $('assets').querySelectorAll('button[data-id]').forEach(btn=>btn.addEventListener('click',()=>showModal(list.find(a=>a.id===btn.dataset.id))));
}
async function init(){linkNav();$('search').addEventListener('input',render);$('category').addEventListener('change',render);$('close-modal').addEventListener('click',()=>{$('asset-modal').hidden=true;});$('asset-modal').addEventListener('click',e=>{if(e.target===$('asset-modal'))$('asset-modal').hidden=true;});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('asset-modal').hidden)$('asset-modal').hidden=true;});
 $('copy-email').addEventListener('click',copyEmail);
 $('copy-inquiry').addEventListener('click',async()=>{if(!active)return;try{await copyText(`[GARD][${active.id}] 자산 거래 문의\n\n`+inquiryText(active));notice('이메일 제목과 문의 내용이 복사되었습니다.');}catch(e){notice('복사 실패: '+e.message,'error');}});
 try{const response=await fetch('./catalog.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);catalog=normalizeCatalog(await response.json());const unique=[...new Set(catalog.assets.map(a=>a.category))].sort((a,b)=>a.localeCompare(b,'ko'));$('category').insertAdjacentHTML('beforeend',unique.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join(''));$('catalog-meta').textContent=`${catalog.assets.length}개 자산 공개 · 발행: ${catalog.publisher.name} · 자료 기준 ${catalog.generated_at?new Date(catalog.generated_at).toLocaleString('ko-KR'):'미기재'}`;renderPublisherContact();render();}catch(e){$('catalog-meta').textContent='공개 카탈로그를 불러오지 못했습니다.';$('assets').innerHTML=`<div class="empty" style="grid-column:1/-1"><strong>공개 자산을 불러올 수 없습니다.</strong>네트워크 상태와 catalog.json 파일을 확인하세요. (${esc(e.message)})</div>`;$('publisher-contact').hidden=true;}
}
init();
