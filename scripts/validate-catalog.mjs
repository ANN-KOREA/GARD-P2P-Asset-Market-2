// Fail closed when manually uploaded catalog.json contains fields not cleared for publication.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {validEmail} from '../js/common.js';
const raw=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const exactKeys=(obj,keys,label)=>{
  assert.ok(obj && typeof obj==='object'&&!Array.isArray(obj),label+' must be an object');
  for(const k of Object.keys(obj))assert.ok(keys.includes(k),`${label} contains unapproved field: ${k}`);
};
exactKeys(raw,['schema_version','generated_at','publisher','assets'],'catalog');
assert.equal(raw.schema_version,'1.0');assert.ok(Array.isArray(raw.assets));
exactKeys(raw.publisher,['name','email'],'publisher');
assert.ok(typeof raw.publisher.name==='string'&&raw.publisher.name.length>0);
assert.ok(!raw.assets.length||validEmail(raw.publisher.email),'Published assets require a valid public inquiry mailbox');
for(const [i,a] of raw.assets.entries()){
 exactKeys(a,['id','version','title','summary','category','tags','evidenceSummary','pricePolicy','offerPrice','offerType','licenseSummary','visibility','approved','publishedAt'],`asset ${i}`);
 assert.ok(typeof a.id==='string'&&a.id.length>0&&a.id.length<120);
 assert.ok(typeof a.title==='string'&&a.title.trim());
 assert.ok(typeof a.summary==='string'&&a.summary.trim());
 assert.ok(Array.isArray(a.tags));
 assert.equal(a.visibility,'PROMOTION');assert.equal(a.approved,true);
 assert.ok(Number.isSafeInteger(a.version)&&a.version>=1);
 if(a.pricePolicy==='FIXED')assert.ok(Number.isSafeInteger(a.offerPrice)&&a.offerPrice>=0);
}
console.log(`catalog validation PASS (${raw.assets.length} approved assets; no extra keys)`);
