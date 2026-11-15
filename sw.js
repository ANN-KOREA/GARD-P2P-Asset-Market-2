// Offline shell for owner/buyer apps. Deliberately never cache public catalog.json.
const CACHE='gard-p2p-market-shell-v1.4';
const SHELL=['./','./index.html','./owner.html','./buyer.html','./styles.css','./js/common.js','./js/db.js','./js/zip.js','./js/storefront.js','./js/owner.js','./js/buyer.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/catalog.json'))return;
  event.respondWith(fetch(req).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(c=>c.put(req,clone)).catch(()=>{});}return response;}).catch(()=>caches.match(req)));
});
