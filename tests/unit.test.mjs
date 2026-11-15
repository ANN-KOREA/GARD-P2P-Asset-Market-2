import test from 'node:test';
import assert from 'node:assert/strict';
import {crc32,createZip,parseZip} from '../js/zip.js';
import {normalizeCatalog,esc,validEmail,sha256,TRANSITIONS,toCSV} from '../js/common.js';

const encode=s=>new TextEncoder().encode(s);
test('ZIP STORE roundtrip is lossless',async()=>{
 const payload=encode('한글 및 한국수어 GARD 자산 🚀');
 const zip=createZip([{name:'asset/연구결과.txt',data:payload},{name:'manifest.json',data:'{"format":"test"}'}]);
 const unpacked=parseZip(await zip.arrayBuffer());
 assert.equal(new TextDecoder().decode(unpacked.get('asset/연구결과.txt')),'한글 및 한국수어 GARD 자산 🚀');
 assert.equal(new TextDecoder().decode(unpacked.get('manifest.json')),'{"format":"test"}');
});
test('ZIP denies corrupted bytes and path traversal',async()=>{
 assert.throws(()=>createZip([{name:'../secret.txt',data:'x'}]));
 const zip=createZip([{name:'file.txt',data:'good content'}]);
 const data=new Uint8Array(await zip.arrayBuffer());
 const index=Buffer.from(data).indexOf(Buffer.from('good content'));
 assert.ok(index>0);data[index]^=1;
 assert.throws(()=>parseZip(data),/CRC/);
});
test('ZIP CRC32 canonical test vector',()=>assert.equal(crc32(encode('123456789')),0xcbf43926));
test('catalog visibility whitelist rejects unapproved',()=>{
 const doc=normalizeCatalog({schema_version:'1.0',publisher:{name:'test',email:'a@example.com'},assets:[
  {id:'1',title:'public',summary:'public only',visibility:'PROMOTION',approved:true,privateFile:'confidential',tags:['a']},
  {id:'2',title:'private',summary:'secret',visibility:'DRAFT',approved:true},
  {id:'3',title:'not approved',summary:'secret',visibility:'PROMOTION',approved:false}
 ]});
 assert.equal(doc.assets.length,1);assert.equal(doc.assets[0].title,'public');assert.ok(!('privateFile' in doc.assets[0]));
});
test('escape HTML and validate email',()=>{
 assert.equal(esc('<script>'), '&lt;script&gt;');
 assert.equal(validEmail('contact@example.com'),true);
 assert.equal(validEmail('name@invalid'),false);
});
test('SHA256 known vector and no false payment shortcut',async()=>{
 assert.equal(await sha256(encode('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 assert.equal(TRANSITIONS.INQUIRY.includes('PAID_CONFIRMED'),false);
 assert.equal(TRANSITIONS.AWAITING_PAYMENT.includes('PAID_CONFIRMED'),true);
});
test('CSV quotes newlines, commas and formulas as text?',()=>{
 const csv=toCSV([{a:'hello,world',b:'line\nnext'}],['a','b']);assert.match(csv,/"hello,world"/);assert.match(csv,/"line\nnext"/);
});
