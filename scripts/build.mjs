import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
const files=['index.html','style.css','app.js','core.js','cloud.js','manifest.webmanifest','icon.svg','sw.js'];
await mkdir('www',{recursive:true});
for(const f of files)await copyFile(f,'www/'+f);
// Branded PNG icons generated locally, no external assets.
function crc32(buf){let crc=0xffffffff;for(const b of buf){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(tag,data){const name=Buffer.from(tag),l=Buffer.alloc(4),crc=Buffer.alloc(4);l.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([l,name,data,crc]);}
function png(size){const raw=Buffer.alloc((size*3+1)*size),header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=2;
for(let y=0;y<size;y++)for(let x=0;x<size;x++){const a=x/size,b=y/size;const white=(a>.32&&a<.68&&b>.25&&b<.35)||(a>.32&&a<.42&&b>.25&&b<.55)||(a>.32&&a<.68&&b>.47&&b<.57)||(a>.58&&a<.68&&b>.47&&b<.75)||(a>.32&&a<.68&&b>.65&&b<.75);const p=y*(size*3+1)+1+x*3;raw[p]=white?255:18;raw[p+1]=white?255:99;raw[p+2]=white?255:77;}
return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
for(const n of [192,512])await writeFile('www/icon-'+n+'.png',png(n));
const manifest=JSON.parse(await (await import('node:fs/promises')).readFile('www/manifest.webmanifest','utf8'));manifest.icons=[...manifest.icons,...[192,512].map(n=>({src:'icon-'+n+'.png',sizes:n+'x'+n,type:'image/png',purpose:'any'}))];await writeFile('www/manifest.webmanifest',JSON.stringify(manifest,null,2));
console.log('Web assets ready in www/');
