export const SCHEMA_VERSION = '1.0';
export const APP_NAME = 'GARD P2P Asset Market';
export const DEAL_STATUS = {
  INQUIRY: '문의 접수', DETAIL_SHARED: '상세자료 제공', QUOTED: '견적 발송',
  NEGOTIATING: '협상 중', AGREED: '조건 합의', AWAITING_PAYMENT: '입금 대기',
  PAID_CONFIRMED: '입금 확인', DELIVERED: '인도 완료', BUYER_ACK: '구매자 확인',
  DISPUTED: '이의·분쟁', CANCELLED: '취소'
};
export const TRANSITIONS = {
  INQUIRY: ['DETAIL_SHARED','QUOTED','CANCELLED'],
  DETAIL_SHARED: ['QUOTED','NEGOTIATING','CANCELLED'],
  QUOTED: ['NEGOTIATING','AGREED','CANCELLED'],
  NEGOTIATING: ['QUOTED','AGREED','CANCELLED'],
  AGREED: ['AWAITING_PAYMENT','CANCELLED'],
  AWAITING_PAYMENT: ['PAID_CONFIRMED','CANCELLED'],
  PAID_CONFIRMED: ['DELIVERED','DISPUTED'],
  DELIVERED: ['BUYER_ACK','DISPUTED'],
  BUYER_ACK: ['DISPUTED'], DISPUTED: ['CANCELLED','DELIVERED'], CANCELLED: []
};
export const ASSET_CATEGORIES = ['웹앱','연구·보고서','데이터·JSON','계산엔진','방법론·매뉴얼','교육·콘텐츠','기타'];
export function uid(prefix = 'ID') { return `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0,8).toUpperCase()}`; }
export function iso() { return new Date().toISOString(); }
export function esc(value='') { return String(value ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
export function won(value) { return Number(value || 0).toLocaleString('ko-KR') + '원'; }
export function showDate(value) { if(!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ko-KR'); }
export function validEmail(value) { return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(value || '').trim()); }
export function csvEscape(v) { let s=String(v??''); if(typeof v==='string' && /^[\s]*[=+@-]/.test(s)) s="'"+s; return /[",\n\r]/.test(s) ? '"'+s.replaceAll('"','""')+'"' : s; }
export function toCSV(rows, keys) { return [keys.map(csvEscape).join(','),...rows.map(r=>keys.map(k=>csvEscape(r[k])).join(','))].join('\r\n'); }
export function bytesToBase64(data) { const a = data instanceof Uint8Array ? data : new Uint8Array(data); let out=''; for(let i=0;i<a.length;i+=0x8000) out+=String.fromCharCode(...a.subarray(i,i+0x8000)); return btoa(out); }
export function base64ToBytes(b64) { const s=atob(b64); const out=new Uint8Array(s.length); for(let i=0;i<s.length;i++) out[i]=s.charCodeAt(i); return out; }
export async function sha256(bytes) { const arr=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes); const digest=await crypto.subtle.digest('SHA-256',arr); return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
export function downloadBlob(name,blob) { const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000); }
export function downloadText(name,text,type='application/json;charset=utf-8') { downloadBlob(name,new Blob([text],{type})); }
export function filename(name) { return String(name||'asset.bin').split(/[\\/]/).pop().replace(/[\x00-\x1f<>:"|?*]/g,'_').slice(0,120) || 'asset.bin'; }
export function mailto(to,subject,body) { if(!validEmail(to)) throw new Error('오너 이메일 설정이 올바르지 않습니다.'); return 'mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body); }
export async function copyText(t) { try { await navigator.clipboard.writeText(t); } catch { const el=document.createElement('textarea'); el.value=t; document.body.append(el); el.select(); document.execCommand('copy'); el.remove(); } }
export function notice(message,level='ok') { const n=document.getElementById('toast'); if(!n){alert(message);return;} n.textContent=message; n.className='toast '+level; n.hidden=false; clearTimeout(notice.timer); notice.timer=setTimeout(()=>n.hidden=true,5400); }
export function assert(condition,message) { if(!condition) throw new Error(message); }
export function safeFileSize(n,limit=20*1024*1024) { assert(Number.isFinite(n)&&n>=0&&n<=limit,'파일은 20MB 이하로 등록하세요.'); }
export function normalizeCatalog(raw) {
  assert(raw && raw.schema_version === SCHEMA_VERSION && Array.isArray(raw.assets),'공개 카탈로그 버전 또는 형식이 올바르지 않습니다.');
  const publisher=raw.publisher && typeof raw.publisher==='object' ? raw.publisher : {};
  const assets=raw.assets.filter(a=>a && typeof a.id==='string' && a.title && a.visibility==='PROMOTION' && a.approved===true).map(a=>({
    id:String(a.id).slice(0,90), title:String(a.title).slice(0,180), summary:String(a.summary||'').slice(0,1200),
    category:String(a.category||'기타').slice(0,80), tags:Array.isArray(a.tags)?a.tags.slice(0,20).map(String):[],
    evidenceSummary:String(a.evidenceSummary||'').slice(0,1600), pricePolicy:String(a.pricePolicy||'NEGOTIABLE'),
    offerType:String(a.offerType||'NON_EXCLUSIVE'), offerPrice:Number.isFinite(Number(a.offerPrice))?Number(a.offerPrice):0,
    version:Number(a.version)||1, visibility:'PROMOTION', approved:true, publishedAt:String(a.publishedAt||''),
    licenseSummary:String(a.licenseSummary||'').slice(0,2200)
  }));
  return {schema_version:SCHEMA_VERSION,generated_at:String(raw.generated_at||''),publisher:{name:String(publisher.name||'GARD'),email:String(publisher.email||'')},assets};
}
export function formValue(form,name) { return String(new FormData(form).get(name)??'').trim(); }
export function setText(id,text) { const el=document.getElementById(id); if(el)el.textContent=text; }
export function linkNav() { if ('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
