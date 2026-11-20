// Separate add-on database. Does not open/upgrade the existing GARD P2P market database.
const DB='gard-product-studio-2026-v1';
let pending;
export function openProductDb(){if(!pending)pending=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('cases'))db.createObjectStore('cases',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return pending;}
export async function listCases(){const db=await openProductDb();return new Promise((ok,no)=>{const r=db.transaction('cases','readonly').objectStore('cases').getAll();r.onsuccess=()=>ok(r.result||[]);r.onerror=()=>no(r.error);});}
export async function saveCase(x){const db=await openProductDb();return new Promise((ok,no)=>{const t=db.transaction('cases','readwrite');t.objectStore('cases').put(x);t.oncomplete=()=>ok(x);t.onerror=()=>no(t.error);});}
export async function deleteCase(id){const db=await openProductDb();return new Promise((ok,no)=>{const t=db.transaction('cases','readwrite');t.objectStore('cases').delete(id);t.oncomplete=()=>ok();t.onerror=()=>no(t.error);});}
export async function getCase(id){const db=await openProductDb();return new Promise((ok,no)=>{const r=db.transaction('cases','readonly').objectStore('cases').get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
