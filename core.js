import {validateBusiness} from './business.js';
export const currencies = ['CDF','USD'];
export const uid = () => globalThis.crypto.randomUUID();
export const today = () => new Date().toISOString().slice(0,10);
export function emptyState(){return {version:1,activeId:null,lists:[],stores:[],trash:[]};}
export function amountToMinor(value){
  const s=String(value??'').trim().replace(',', '.');
  if(s==='') return null;
  if(!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error('Montant positif, maximum deux décimales.');
  const [whole,frac='']=s.split('.');
  const n=Number(whole)*100+Number(frac.padEnd(2,'0'));
  if(!Number.isSafeInteger(n)) throw new Error('Montant trop élevé.');
  return n;
}
export const minorToInput = n => n==null?'':(n/100).toFixed(2);
export const format = (n,c) => new Intl.NumberFormat('fr-CD',{style:'currency',currency:c,maximumFractionDigits:2}).format(n/100);
export function total(items){
  const result={CDF:{planned:0,paid:0,unknown:0},USD:{planned:0,paid:0,unknown:0}};
  for(const i of items){const t=result[i.currency];if(i.amount==null){t.unknown++;continue;}t.planned+=i.amount;if(i.done)t.paid+=i.amount;}
  return result;
}
const str=x=>typeof x==='string';
const money=x=>x===null||(Number.isSafeInteger(x)&&x>=0);
const arr=x=>Array.isArray(x);
export function validate(s){
 if(!s||s.version!==1||!arr(s.lists)||!arr(s.stores)||!arr(s.trash)) throw Error('Sauvegarde incompatible.');
 const unique=(a)=>new Set(a.map(x=>x.id)).size===a.length;
 if(!s.stores.every(x=>x&&str(x.id)&&str(x.name)&&str(x.address)&&str(x.phone))||!unique(s.stores))throw Error('Magasins invalides.');
 const storeIds=new Set(s.stores.map(x=>x.id));
 const validItem=i=>i&&str(i.id)&&str(i.name)&&str(i.qty)&&storeIds.has(i.storeId)&&currencies.includes(i.currency)&&money(i.amount)&&typeof i.done==='boolean';
 const validList=l=>l&&str(l.id)&&str(l.name)&&str(l.date)&&arr(l.items)&&unique(l.items)&&l.items.every(validItem)&&(l.storeIds===undefined||(arr(l.storeIds)&&new Set(l.storeIds).size===l.storeIds.length&&l.storeIds.every(id=>storeIds.has(id))))&&l.budget&&currencies.every(c=>money(l.budget[c]));
 if(!s.lists.every(validList)||!s.trash.every(validList)||!unique([...s.lists,...s.trash]))throw Error('Listes invalides.');
 if(s.activeId!==null&&!s.lists.some(l=>l.id===s.activeId))throw Error('Liste active invalide.');
 if(s.business!==undefined)validateBusiness(s.business);
 return s;
}
export function newList(name,date=today()){return {id:uid(),name,date,items:[],storeIds:[],budget:{CDF:null,USD:null}};}
export function newStore(name,address='',phone=''){return {id:uid(),name,address,phone};}
export function newItem(storeId,name,qty,currency,amount=null){return {id:uid(),storeId,name,qty,currency,amount,done:false};}
export function duplicateList(l){return {...structuredClone(l),id:uid(),name:l.name+' — copie',date:today(),items:l.items.map(i=>({...i,id:uid(),done:false}))};}
export function parseWhatsApp(text){
 const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const out=[];let store='';
 for(let line of lines){
  line=line.replace(/^\[[^\]]+\]\s*[^:]+:\s*/,'');
  if(line.includes(':')){const k=line.indexOf(':');store=line.slice(0,k).trim();line=line.slice(k+1).trim();}
  if(!line)continue;
  const m=line.match(/^(\d+(?:[.,]\d+)?\s*(?:dz|douzaines?|pcs|pqs|pqt|paquets?|cartons?|chaînes?)?)\s*(.+)$/i);
  out.push({store:store||'À classer',qty:m?m[1].trim():'1',name:m?m[2].trim():line});
 }
 return out;
}
export const KEY='5achat:v1';
export function load(storage){
 const current=storage.getItem(KEY),previous=storage.getItem(KEY+':previous');
 if(current!==null){try{return {state:validate(JSON.parse(current)),recovered:false};}catch(e){if(previous!==null)return {state:validate(JSON.parse(previous)),recovered:true};throw e;}}
 if(previous!==null)return {state:validate(JSON.parse(previous)),recovered:true};
 return {state:emptyState(),recovered:false};
}
export function persist(storage,state){
 validate(state);
 const current=storage.getItem(KEY);
 if(current!==null){try{validate(JSON.parse(current));storage.setItem(KEY+':previous',current);}catch(e){if(e.name==='QuotaExceededError'||e.name==='SecurityError')throw e;}}
 storage.setItem(KEY,JSON.stringify(state));
}
