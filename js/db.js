import {SCHEMA_VERSION, assert, iso, uid, bytesToBase64, base64ToBytes, sha256} from './common.js';
const DB_NAME='gard-p2p-market-2026-v1';const STORE_NAMES=['assets','files','deals','audit','settings','purchases'];
let dbPromise;
export function openDB(){if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{const db=request.result;for(const name of STORE_NAMES)if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:name==='settings'?'key':'id'});};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});return dbPromise;}
export async function dbGet(store,key){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store,'readonly').objectStore(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export async function dbAll(store){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store,'readonly').objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});}
export async function dbPut(store,value){const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).put(value);t.oncomplete=()=>res(value);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});}
export async function dbDel(store,key){const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).delete(key);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});}
export async function getSettings(){return (await dbGet('settings','owner'))?.value||{publisherName:'GARD 자영자산',email:'',notice:'',policyUrl:''};}
export async function saveSettings(value){return dbPut('settings',{key:'owner',value,updatedAt:iso()});}
export async function audit(event,entityId,detail=''){return dbPut('audit',{id:uid('LOG'),event,entityId,detail,at:iso()});}
function normalizeBytes(files){return files.map(f=>({id:f.id,assetId:f.assetId,name:f.name,type:f.type,size:f.size,sha256:f.sha256,data_base64:bytesToBase64(f.data)}));}
function restoreBytes(files){return files.map(f=>{assert(typeof f.data_base64==='string','백업 파일 데이터 누락');const data=base64ToBytes(f.data_base64);assert(data.length===f.size && data.length<=20*1024*1024,'백업 첨부파일 크기 불일치 또는 파일 제한 초과');return {id:f.id,assetId:f.assetId,name:f.name,type:f.type,size:f.size,sha256:f.sha256,data};});}
export async function ownerBackup(){const [assets,files,deals,auditRows,settings]=await Promise.all(['assets','files','deals','audit','settings'].map(dbAll));
return {format:'gard-p2p-owner-backup',schema_version:SCHEMA_VERSION,exported_at:iso(),assets,files:normalizeBytes(files),deals,audit:auditRows,settings};}
export async function importOwnerBackup(json,mode='merge'){
  assert(json&&json.format==='gard-p2p-owner-backup'&&json.schema_version===SCHEMA_VERSION,'GARD 오너 백업 파일이 아닙니다.');
  for(const store of ['assets','files','deals','audit','settings'])assert(Array.isArray(json[store]),'백업 구조 오류: '+store);
  const rows={assets:json.assets,files:restoreBytes(json.files),deals:json.deals,audit:json.audit,settings:json.settings};
  for(const file of rows.files){assert(typeof file.sha256==='string' && (await sha256(file.data))===file.sha256,'원본 백업 파일 SHA-256 불일치: '+file.name);}
  for(const [store,records] of Object.entries(rows)){
    assert(records.length<50000,store+' 레코드 수 초과');
    for(const r of records)assert(r&&typeof r==='object'&&typeof (store==='settings'?r.key:r.id)==='string',store+' 레코드 ID 오류');
  }
  const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction(['assets','files','deals','audit','settings'],'readwrite');
    for(const store of ['assets','files','deals','audit','settings']){const obj=tx.objectStore(store);if(mode==='replace')obj.clear();for(const row of rows[store])obj.put(row);}
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);
  });
  return {assets:rows.assets.length,deals:rows.deals.length,files:rows.files.length};
}
export async function buyerBackup(){const purchases=await dbAll('purchases');return {format:'gard-p2p-buyer-backup',schema_version:SCHEMA_VERSION,exported_at:iso(),purchases:purchases.map(p=>({...p,fileData:undefined,fileDataBase64:bytesToBase64(p.fileData)}))};}
export async function importBuyerBackup(json,mode='merge'){
  assert(json?.format==='gard-p2p-buyer-backup'&&json.schema_version===SCHEMA_VERSION&&Array.isArray(json.purchases),'구매자 백업 형식 오류');
  const records=json.purchases.map(p=>({...p,fileData:base64ToBytes(p.fileDataBase64)}));
  for(const p of records){assert(typeof p.id==='string'&&typeof p.fileName==='string'&&p.fileData.length<=50*1024*1024,'구매자 자산 기록 오류');assert((await sha256(p.fileData))===p.fileSha256,'구매자 백업 SHA-256 불일치: '+p.id);}
  const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('purchases','readwrite'),s=tx.objectStore('purchases');if(mode==='replace')s.clear();for(const p of records){delete p.fileDataBase64;s.put(p);}tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});
  return records.length;
}
