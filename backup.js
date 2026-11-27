const encoder=new TextEncoder(),decoder=new TextDecoder();
const bytesTo64=b=>{let out='';for(let i=0;i<b.length;i+=8192)out+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(out);};
const from64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const rounds=600000;
async function keyFor(password,salt){const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:rounds},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function encryptBackup(state,password){
 if(typeof password!=='string'||password.length<12)throw Error('Utilisez une phrase secrète d’au moins 12 caractères.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await keyFor(password,salt),payload=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('5ACHAT backup v1')},key,encoder.encode(JSON.stringify(state)));
 return JSON.stringify({format:'5achat-encrypted-v1',algorithm:'AES-256-GCM',iterations:rounds,salt:bytesTo64(salt),iv:bytesTo64(iv),data:bytesTo64(new Uint8Array(payload))});
}
export async function decryptBackup(text,password){
 if(text.length>20*1024*1024)throw Error('Sauvegarde trop volumineuse.');
 const b=JSON.parse(text);if(b.format!=='5achat-encrypted-v1'||b.algorithm!=='AES-256-GCM'||b.iterations!==rounds||typeof b.data!=='string')throw Error('Format de sauvegarde non pris en charge.');
 const salt=from64(b.salt),iv=from64(b.iv);if(salt.length!==16||iv.length!==12)throw Error('Sauvegarde invalide.');
 try{const key=await keyFor(password,salt),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:encoder.encode('5ACHAT backup v1')},key,from64(b.data));return JSON.parse(decoder.decode(plain));}catch{throw Error('Phrase secrète incorrecte ou sauvegarde endommagée.');}
}
export async function exportBackupFile(name,text){
 const cap=globalThis.Capacitor;
 if(cap?.isNativePlatform?.()&&cap.Plugins?.Filesystem&&cap.Plugins?.Share){
  const p=await cap.Plugins.Filesystem.writeFile({path:name,data:bytesTo64(encoder.encode(text)),directory:'CACHE'});
  await cap.Plugins.Share.share({title:'Sauvegarde chiffrée 5ACHAT',files:[p.uri],dialogTitle:'Conserver une copie externe'});
  return;
 }
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
