// RFC 1321 MD5 for stable legacy reference keys, matching PostgreSQL's md5(text).
// This is an identifier checksum, never password hashing or authorization.
export function md5Text(text){
 const bytes=new TextEncoder().encode(text),length=Math.ceil((bytes.length+9)/64)*64,data=new Uint8Array(length);data.set(bytes);data[bytes.length]=128;const view=new DataView(data.buffer),bits=bytes.length*8;view.setUint32(length-8,bits>>>0,true);view.setUint32(length-4,Math.floor(bits/4294967296),true);
 let a=0x67452301,b=0xefcdab89,c=0x98badcfe,d=0x10325476;const shifts=[7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21],rotate=(x,n)=>(x<<n)|(x>>>(32-n));
 for(let offset=0;offset<length;offset+=64){let aa=a,bb=b,cc=c,dd=d;for(let i=0;i<64;i++){const round=i>>4,g=round===0?i:round===1?(5*i+1)%16:round===2?(3*i+5)%16:(7*i)%16,f=round===0?(bb&cc)|(~bb&dd):round===1?(dd&bb)|(~dd&cc):round===2?bb^cc^dd:cc^(bb|~dd),k=Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0,next=(bb+rotate((aa+f+k+view.getUint32(offset+g*4,true))|0,shifts[round*4+i%4]))|0;aa=dd;dd=cc;cc=bb;bb=next;}a=(a+aa)|0;b=(b+bb)|0;c=(c+cc)|0;d=(d+dd)|0;}
 const result=new DataView(new ArrayBuffer(16));[a,b,c,d].forEach((x,i)=>result.setUint32(i*4,x>>>0,true));return [...new Uint8Array(result.buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function legacyExerciseKey(e){const parts=[e.id||'',e.name||'',e.equipment||'',...( ['primary','secondary'].map(key=>(e.muscles?.[key]||[]).slice().sort().join(',')))];return md5Text(parts.map(x=>new TextEncoder().encode(x).length+':'+x).join('|'));}
export const legacyPersonalId=(exercise,owner='guest')=>'legacy:'+md5Text((owner||'guest')+'|'+legacyExerciseKey(exercise));
