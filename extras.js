import {amountToMinor} from './core.js';
const MAX=8*1024*1024, MAX_XML=12*1024*1024;
export function csvRows(text){
 text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0];const sep=first.includes(';')?';':first.includes('\t')?'\t':',';
 let rows=[],row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else quoted=false;}else cell+=c;}else if(c==='"'&&!cell){quoted=true;}else if(c===sep){row.push(cell);cell='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('CSV : guillemet non fermé');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function purchaseRows(rows){
 if(rows.length<2||rows.length>2001)throw Error('Fichier attendu : en-têtes et 1 à 2 000 lignes.');
 const head=rows[0].map(norm),idx=(...names)=>head.findIndex(x=>names.includes(x));
 const supplier=idx('fournisseur','magasin','supplier'),product=idx('produit','article','product'),qty=idx('quantite','qty'),currency=idx('devise','currency'),amount=idx('montant','amount'),done=idx('achete','purchased');
 if(supplier<0||product<0)throw Error('Colonnes obligatoires : Fournisseur, Produit.');
 const result=[];for(let i=1;i<rows.length;i++){const row=rows[i];if(!row.some(x=>String(x??'').trim()))continue;const get=j=>j<0?'':String(row[j]??'').trim();const store=get(supplier),name=get(product),quantity=get(qty)||'1',c=(get(currency)||'CDF').toUpperCase().replace(/^FC$/,'CDF');
 if(!store||!name||!['CDF','USD'].includes(c))throw Error('Ligne '+(i+1)+' : fournisseur, produit ou devise invalide.');
 const a=amountToMinor(get(amount).replace(/[ \u00a0\u202f]/g,''));result.push({store,name,qty:quantity,currency:c,amount:a,done:['oui','true','1','yes','x'].includes(norm(get(done)))});}
 if(!result.length)throw Error('Aucun article.');return result;
}
function xml(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('XML non autorisé');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('XML invalide');return doc;}
const tags=(e,n)=>Array.from(e.getElementsByTagNameNS('*',n));
async function unzipSelected(buffer){
 const v=new DataView(buffer),u=new Uint8Array(buffer),dec=new TextDecoder();let end=-1;
 for(let i=u.length-22;i>=Math.max(0,u.length-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===u.length){end=i;break;}
 if(end<0)throw Error('Classeur ZIP invalide');
 if(v.getUint16(end+4,true)||v.getUint16(end+6,true))throw Error('ZIP multi-volume non pris en charge');
 const count=v.getUint16(end+10,true);if(count>2000)throw Error('Classeur trop complexe');
 let p=v.getUint32(end+16,true);const files=new Map();
 for(let i=0;i<count;i++){if(p+46>u.length||v.getUint32(p,true)!==0x02014b50)throw Error('Index ZIP invalide');const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),size=v.getUint32(p+20,true),expanded=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),off=v.getUint32(p+42,true);if(p+46+nl+extra+comment>u.length)throw Error('Index ZIP incomplet');const name=dec.decode(u.slice(p+46,p+46+nl));p+=46+nl+extra+comment;
 if(!/^xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(name))continue;
 if(files.has(name)||flags&1||expanded>MAX_XML||off+30>u.length||v.getUint32(off,true)!==0x04034b50)throw Error('Entrée ZIP non prise en charge');
 const start=off+30+v.getUint16(off+26,true)+v.getUint16(off+28,true);if(start+size>u.length)throw Error('ZIP tronqué');files.set(name,{method,expanded,data:u.slice(start,start+size)});
 }
 return async name=>{const f=files.get(name);if(!f)return null;let data=f.data;if(f.method===8){if(typeof DecompressionStream!=='function')throw Error('Ce navigateur ne lit pas XLSX. Utilisez CSV.');const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();let chunks=[],size=0;while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>MAX_XML||size>f.expanded){await reader.cancel();throw Error('XML trop volumineux');}chunks.push(r.value);}data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}}else if(f.method!==0)throw Error('Compression non prise en charge');if(data.length!==f.expanded)throw Error('Taille ZIP incohérente');return dec.decode(data);};
}
export async function spreadsheetRows(file){
 if(file.size>MAX)throw Error('Fichier limité à 8 Mo.');
 if(/\.csv$/i.test(file.name))return csvRows(await file.text());
 if(!/\.xlsx$/i.test(file.name))throw Error('Formats acceptés : XLSX ou CSV.');
 const get=await unzipSelected(await file.arrayBuffer()),w=await get('xl/workbook.xml'),rels=await get('xl/_rels/workbook.xml.rels');if(!w||!rels)throw Error('Classeur invalide');
 const first=tags(xml(w),'sheet')[0];if(!first)throw Error('Aucune feuille');const rid=first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||first.getAttribute('r:id');const rel=tags(xml(rels),'Relationship').find(x=>x.getAttribute('Id')===rid);let path=rel?.getAttribute('Target')||'';if(rel?.getAttribute('TargetMode')==='External')throw Error('Feuille externe refusée');path=path.startsWith('/')?path.slice(1):'xl/'+path;if(!/^xl\/worksheets\/[^/]+\.xml$/.test(path))throw Error('Chemin de feuille invalide');
 const sharedText=await get('xl/sharedStrings.xml');const shared=sharedText?tags(xml(sharedText),'si').map(x=>tags(x,'t').map(t=>t.textContent).join('')):[];const sheet=await get(path);if(!sheet)throw Error('Feuille introuvable');const rows=[];
 for(const row of tags(xml(sheet),'row')){if(rows.length>=2001)throw Error('Limite : 2 000 articles');const cells=[];for(const c of tags(row,'c')){const col=(c.getAttribute('r')||'').match(/^[A-Z]+/i)?.[0]?.toUpperCase();if(!col)continue;let n=0;for(const a of col)n=n*26+a.charCodeAt(0)-64;if(n>100)continue;if(tags(c,'f').length)throw Error('Formules non acceptées : collez les valeurs dans Excel.');const value=tags(c,'v')[0]?.textContent||'',type=c.getAttribute('t');cells[n-1]=type==='s'?(shared[Number(value)]??''):type==='inlineStr'?tags(c,'t').map(x=>x.textContent).join(''):value;}rows.push(Array.from(cells,x=>x??''));}return rows.filter(r=>r.some(x=>x.trim()));
}
export async function decodeBarcode(file){
 if(!file||file.size>MAX)throw Error('Image limitée à 8 Mo.');
 if(typeof globalThis.BarcodeDetector!=='function')throw Error('Scanner non pris en charge sur cet appareil. Saisissez le code manuellement.');
 const bitmap=await createImageBitmap(file);try{if(bitmap.width*bitmap.height>20000000)throw Error('Image trop grande');const scanner=new BarcodeDetector();const codes=await scanner.detect(bitmap);if(!codes.length)throw Error('Aucun code détecté. Reprenez une photo nette.');return codes[0].rawValue;}finally{bitmap.close();}
}
export function dueReminders(state,day){
 const b=state.business||{},payments=b.payments||[];return (b.invoices||[]).filter(i=>i.due&&i.due<=day&&i.amount>payments.filter(p=>p.invoiceId===i.id).reduce((a,p)=>a+p.amount,0));
}
