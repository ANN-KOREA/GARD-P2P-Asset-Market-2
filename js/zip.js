// Dependency-free ZIP (STORE compression only). Can be read by normal unzip programs.
const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});
const CRC_TABLE=(()=>{const a=[];for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;a.push(c>>>0);}return a;})();
export function crc32(data) { let c=0xffffffff; for(const b of data)c=CRC_TABLE[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0; }
function push16(a,n){a.push(n&255,(n>>>8)&255);}
function push32(a,n){a.push(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255);}
function u16(d,p){return d[p]|(d[p+1]<<8);}
function u32(d,p){return (d[p]|(d[p+1]<<8)|(d[p+2]<<16)|(d[p+3]<<24))>>>0;}
function cleanName(n) { const name=String(n).replaceAll('\\','/'); if(!name||name.startsWith('/')||name.split('/').some(s=>s==='..'||s==='.'||!s)||name.includes('\0'))throw Error('안전하지 않은 ZIP 경로'); return name; }
export function createZip(files) {
  if(!Array.isArray(files)||files.length>32) throw Error('ZIP 파일 개수가 허용 범위를 벗어났습니다.');
  const parts=[],central=[];let offset=0;
  for(const item of files){
    const name=encoder.encode(cleanName(item.name));
    const data=typeof item.data==='string'?encoder.encode(item.data):(item.data instanceof Uint8Array?item.data:new Uint8Array(item.data));
    if(data.length>50*1024*1024)throw Error('ZIP 개별 파일은 50MB 이하만 지원합니다.');
    const crc=crc32(data); const loc=[];
    push32(loc,0x04034b50);push16(loc,20);push16(loc,0x0800);push16(loc,0);push16(loc,0);push16(loc,0);
    push32(loc,crc);push32(loc,data.length);push32(loc,data.length);push16(loc,name.length);push16(loc,0);
    parts.push(new Uint8Array(loc),name,data);
    const cen=[];push32(cen,0x02014b50);push16(cen,20);push16(cen,20);push16(cen,0x0800);push16(cen,0);
    push16(cen,0);push16(cen,0);push32(cen,crc);push32(cen,data.length);push32(cen,data.length);
    push16(cen,name.length);push16(cen,0);push16(cen,0);push16(cen,0);push16(cen,0);push32(cen,0);push32(cen,offset);
    central.push(new Uint8Array(cen),name);
    offset+=loc.length+name.length+data.length;
  }
  const centralOffset=offset;const centralSize=central.reduce((a,p)=>a+p.length,0);
  const end=[];push32(end,0x06054b50);push16(end,0);push16(end,0);push16(end,files.length);push16(end,files.length);
  push32(end,centralSize);push32(end,centralOffset);push16(end,0);
  return new Blob([...parts,...central,new Uint8Array(end)],{type:'application/zip'});
}
export function parseZip(arrayBuffer) {
  const d=arrayBuffer instanceof Uint8Array?arrayBuffer:new Uint8Array(arrayBuffer);
  if(d.length>60*1024*1024)throw Error('ZIP은 60MB 이하여야 합니다.');
  let end=-1;for(let p=d.length-22;p>=Math.max(0,d.length-65557);p--){if(u32(d,p)===0x06054b50&&p+22+u16(d,p+20)===d.length){end=p;break;}}
  if(end<0)throw Error('ZIP 종료 구조를 찾지 못했습니다.');
  const count=u16(d,end+10),size=u32(d,end+12),offset=u32(d,end+16);
  if(u16(d,end+8)!==count||count>32||offset+size>end||u16(d,end+4)!==0||u16(d,end+6)!==0)throw Error('지원하지 않는 ZIP 형식입니다.');
  const result=new Map();let p=offset;
  for(let k=0;k<count;k++){
    if(p+46>d.length||u32(d,p)!==0x02014b50)throw Error('ZIP 중앙 디렉터리가 손상되었습니다.');
    const flags=u16(d,p+8),method=u16(d,p+10),crc=u32(d,p+16),compressed=u32(d,p+20),plain=u32(d,p+24);
    const nameLen=u16(d,p+28),extra=u16(d,p+30),comment=u16(d,p+32),localOff=u32(d,p+42);
    if(method!==0||flags&0x1||compressed!==plain||plain>50*1024*1024||p+46+nameLen+extra+comment>d.length)throw Error('압축 또는 암호화된 ZIP은 지원하지 않습니다.');
    const name=cleanName(decoder.decode(d.subarray(p+46,p+46+nameLen)));
    if(result.has(name)||localOff+30>d.length||u32(d,localOff)!==0x04034b50)throw Error('ZIP 엔트리 구조가 유효하지 않습니다.');
    const start=localOff+30+u16(d,localOff+26)+u16(d,localOff+28);
    if(start+plain>offset)throw Error('ZIP 파일 범위가 유효하지 않습니다.');
    const payload=d.slice(start,start+plain);
    if(crc32(payload)!==crc)throw Error('ZIP CRC 검증에 실패했습니다: '+name);
    result.set(name,payload);p+=46+nameLen+extra+comment;
  }
  if(p!==offset+size)throw Error('ZIP 디렉터리 크기가 불일치합니다.');
  return result;
}
