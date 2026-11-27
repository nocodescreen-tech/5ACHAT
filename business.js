import {uid,today,amountToMinor,minorToInput,format,currencies} from './core.js';
export const emptyBusiness=()=>({products:[],prices:[],expenses:[],invoices:[],payments:[]});
export const businessOf=s=>s.business||emptyBusiness();
export const outstanding=(invoice,payments)=>invoice.amount-payments.filter(p=>p.invoiceId===invoice.id).reduce((a,p)=>a+p.amount,0);
export function validateBusiness(b){
 if(!b||typeof b!=='object')throw Error('Données commerciales invalides');
 const validText=v=>typeof v==='string'&&v.length<=500;
 const required=v=>validText(v)&&v.trim().length>0;
 const money=n=>Number.isSafeInteger(n)&&n>=0;
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 for(const k of Object.keys(emptyBusiness()))if(!Array.isArray(b[k])||b[k].some(x=>!x||!required(x.id))||new Set(b[k].map(x=>x.id)).size!==b[k].length)throw Error('Collection invalide : '+k);
 if(b.products.some(x=>!required(x.name)||!validText(x.sku)||!validText(x.category)||!required(x.unit)))throw Error('Produit invalide');
 const skus=b.products.map(x=>x.sku.trim().toLowerCase()).filter(Boolean);if(new Set(skus).size!==skus.length)throw Error('Référence produit déjà utilisée');
 if(b.prices.some(x=>!b.products.some(p=>p.id===x.productId)||!required(x.supplier)||!currencies.includes(x.currency)||!money(x.amount)||!date(x.date)))throw Error('Prix invalide');
 if(b.expenses.some(x=>!required(x.description)||!currencies.includes(x.currency)||!money(x.amount)||!date(x.date)))throw Error('Dépense invalide');
 if(b.invoices.some(x=>!required(x.supplier)||!validText(x.reference)||!currencies.includes(x.currency)||!money(x.amount)||!date(x.date)||(x.due!==''&&!date(x.due))))throw Error('Facture invalide');
 if(b.payments.some(x=>!b.invoices.some(i=>i.id===x.invoiceId)||!money(x.amount)||x.amount<=0||!date(x.date)))throw Error('Paiement invalide');
 if(b.invoices.some(i=>outstanding(i,b.payments)<0))throw Error('Le paiement dépasse le montant dû');
 return b;
}
export function businessUI({getState,change,dialog,inp,sel,btn,esc,render,download}){
 let section='overview';
 const b=()=>businessOf(getState());
 const edit=(key,id)=>b()[key].find(x=>x.id===id);
 const currency=v=>sel('currency','Devise',currencies.map(c=>[c,c]),v||'CDF');
 const value=x=>inp('amount','Montant',minorToInput(x),'text','inputmode="decimal" required');
 const when=x=>inp('date','Date',x||today(),'date','required');
 const text=(k,l,v='')=>inp(k,l,v,'text','required');
 const optional=(k,l,v='')=>inp(k,l,v);
 const save=(key,id,fields)=>change(s=>{s.business??=emptyBusiness();const a=s.business[key];if(id){const x=a.find(z=>z.id===id);if(!x)throw Error('Enregistrement introuvable');Object.assign(x,fields);}else a.push({id:uid(),...fields});validateBusiness(s.business);});
 const requiredAmount=v=>{const n=amountToMinor(v);if(n==null)throw Error('Montant obligatoire');return n;};
 const cash=(v,c)=>esc(format(v,c));
 const row=(title,sub,amount,actions)=>'<div class="business-row"><div><strong>'+esc(title)+'</strong><small>'+esc(sub)+'</small></div>'+(amount?'<span class="money">'+amount+'</span>':'')+actions+'</div>';
 const card=(heading,body)=>'<article class="store"><header><h3>'+heading+'</h3></header>'+body+'</article>';
 const empty='<div class="empty">Aucun enregistrement.</div>';
 const act=(action,label,id='',cl='')=>btn('biz:'+action,label,id,cl);
 const metrics=()=>{const s=getState(),d=b();return '<div class="business-grid">'+currencies.map(c=>{const paid=s.lists.flatMap(l=>l.items).filter(i=>i.done&&i.currency===c&&i.amount!=null).reduce((a,i)=>a+i.amount,0),exp=d.expenses.filter(x=>x.currency===c).reduce((a,i)=>a+i.amount,0),debt=d.invoices.filter(x=>x.currency===c).reduce((a,i)=>a+outstanding(i,d.payments),0);return '<article class="store"><small>Achats cochés · '+c+'</small><h2>'+cash(paid,c)+'</h2><small>Autres dépenses (hors achats)</small><h3>'+cash(exp,c)+'</h3><small>Dettes fournisseurs</small><h3>'+cash(debt,c)+'</h3></article>';}).join('')+'</div>';};
 function view(){const d=b();let h='<div class="listhead"><div><small>GESTION COMMERCIALE</small><h2>Activité</h2></div>'+act('export','CSV')+act('print','PDF / Imprimer')+'</div><div class="segment">'+[['overview','Synthèse'],['products','Catalogue'],['prices','Prix'],['expenses','Dépenses'],['invoices','Factures']].map(([k,t])=>act('tab',t,k,k===section?'active':'')).join('')+'</div>';
 if(section==='overview')return h+metrics()+card('En un coup d’œil',row('Produits',d.products.length+' références','',act('tab','Ouvrir','products'))+row('Factures',d.invoices.filter(i=>outstanding(i,d.payments)>0).length+' impayées','',act('tab','Ouvrir','invoices'))+row('Dépenses',d.expenses.length+' opérations','',act('tab','Ouvrir','expenses')))+'<p class="business-note">Les achats cochés, autres dépenses et factures sont présentés séparément pour éviter les doubles comptes.</p>';
 if(section==='products')return h+act('product','+ Produit','','primary')+card('Catalogue',d.products.map(x=>row(x.name,[x.sku,x.category,x.unit].filter(Boolean).join(' · '),'',act('product','Modifier',x.id)+act('remove','Supprimer','products:'+x.id))).join('')||empty);
 if(section==='prices')return h+act('price','+ Relevé de prix','','primary')+card('Prix unitaires par produit et devise',d.products.map(p=>{const prices=d.prices.filter(x=>x.productId===p.id);return '<div class="business-row"><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.unit)+'</small></div></div>'+currencies.map(c=>{const latest=new Map();prices.filter(x=>x.currency===c).sort((a,b)=>b.date.localeCompare(a.date)).forEach(x=>{const k=x.supplier.trim().toLowerCase();if(!latest.has(k))latest.set(k,x);});const best=[...latest.values()].sort((a,b)=>a.amount-b.amount)[0];return best?'<div class="business-row"><small>Meilleur dernier prix '+c+' : '+esc(best.supplier)+'</small><span class="money">'+cash(best.amount,c)+'</span></div>':'';}).join('')+prices.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>row(x.supplier,x.date,cash(x.amount,x.currency),act('price','Modifier',x.id)+act('remove','Supprimer','prices:'+x.id))).join('');}).join('')||empty);
 if(section==='expenses')return h+act('expense','+ Dépense','','primary')+card('Autres dépenses',d.expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>row(x.description,x.date,cash(x.amount,x.currency),act('expense','Modifier',x.id)+act('remove','Supprimer','expenses:'+x.id))).join('')||empty);
 if(section==='invoices')return h+act('invoice','+ Facture','','primary')+card('Factures fournisseurs',d.invoices.map(x=>{const remaining=outstanding(x,d.payments);return row(x.supplier,(x.reference||'Sans référence')+' · '+x.date+(x.due?' · échéance '+x.due:''),cash(x.amount,x.currency),act('invoice','Modifier',x.id)+act('remove','Supprimer','invoices:'+x.id))+'<div class="business-row"><div><strong>'+(remaining===0?'Payée':'Reste à payer : '+cash(remaining,x.currency))+'</strong><small>'+(x.due&&x.due<today()&&remaining>0?'Échéance dépassée':'')+'</small></div>'+(remaining>0?act('payment','+ Paiement',x.id,'primary'):'')+'</div>'+d.payments.filter(p=>p.invoiceId===x.id).map(p=>row('Paiement',p.date,cash(p.amount,x.currency),act('remove','Annuler','payments:'+p.id))).join('');}).join('')||empty);
 return h;
 }
 function handle(action,id){let x;
 if(action==='tab'){section=id;render();return;}
 if(action==='print'){window.print();return;}
 if(action==='export'){const d=b(),cell=x=>'"'+String(x??'').replace(/^[=+@\-]/,"'$&").replace(/"/g,'""')+'"';const rows=[['Type','Nom','Date','Devise','Montant','Solde'],...d.products.map(p=>['Produit',p.name,'','','','']),...d.prices.map(p=>['Prix',d.products.find(x=>x.id===p.productId)?.name+' / '+p.supplier,p.date,p.currency,minorToInput(p.amount),'']),...d.expenses.map(p=>['Dépense',p.description,p.date,p.currency,minorToInput(p.amount),'']),...d.invoices.map(p=>['Facture',p.supplier,p.date,p.currency,minorToInput(p.amount),minorToInput(outstanding(p,d.payments))]),...d.payments.map(p=>{const i=d.invoices.find(x=>x.id===p.invoiceId);return ['Paiement',i.supplier,p.date,i.currency,minorToInput(p.amount),''];})];download('5achat-activite-'+today()+'.csv','\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\n'),'text/csv;charset=utf-8');return;}
 if(action==='product'){x=edit('products',id);return dialog(x?'Modifier produit':'Nouveau produit',text('name','Nom',x?.name)+optional('sku','Référence / code-barres',x?.sku)+'<label class="file-label">Scanner un code-barres (si compatible)<input id="barcodePhoto" type="file" accept="image/*" capture="environment"><small>Vous pouvez toujours saisir la référence manuellement.</small></label>'+optional('category','Catégorie',x?.category)+text('unit','Unité de comparaison',x?.unit||'pcs'),v=>save('products',id,{name:v.name.trim(),sku:v.sku.trim(),category:v.category.trim(),unit:v.unit.trim()}));}
 if(action==='price'){x=edit('prices',id);if(!b().products.length)throw Error('Créez d’abord un produit dans Catalogue.');return dialog('Prix unitaire',sel('productId','Produit',b().products.map(p=>[p.id,p.name+' / '+p.unit]),x?.productId||b().products[0].id)+text('supplier','Fournisseur',x?.supplier)+currency(x?.currency)+value(x?.amount)+when(x?.date),v=>save('prices',id,{productId:v.productId,supplier:v.supplier.trim(),currency:v.currency,amount:requiredAmount(v.amount),date:v.date}));}
 if(action==='expense'){x=edit('expenses',id);return dialog('Autre dépense',text('description','Description',x?.description)+currency(x?.currency)+value(x?.amount)+when(x?.date),v=>save('expenses',id,{description:v.description.trim(),currency:v.currency,amount:requiredAmount(v.amount),date:v.date}));}
 if(action==='invoice'){x=edit('invoices',id);return dialog('Facture fournisseur',text('supplier','Fournisseur',x?.supplier)+optional('reference','Référence facture',x?.reference)+currency(x?.currency)+value(x?.amount)+when(x?.date)+inp('due','Échéance',x?.due||'','date'),v=>{if(x&&b().payments.some(p=>p.invoiceId===x.id)&&x.currency!==v.currency)throw Error('Impossible de changer la devise d’une facture avec paiements');save('invoices',id,{supplier:v.supplier.trim(),reference:v.reference.trim(),currency:v.currency,amount:requiredAmount(v.amount),date:v.date,due:v.due});});}
 if(action==='payment'){x=edit('invoices',id);if(!x)throw Error('Facture introuvable');return dialog('Paiement · '+x.currency,value(null)+when(),v=>save('payments','',{invoiceId:id,amount:requiredAmount(v.amount),date:v.date}));}
 if(action==='remove'){const [key,...rest]=id.split(':'),rid=rest.join(':');if(!Object.keys(emptyBusiness()).includes(key))throw Error('Type invalide');if(!confirm('Supprimer cet enregistrement ?'))return;return change(s=>{const d=s.business??=emptyBusiness();if(key==='products'&&d.prices.some(p=>p.productId===rid))throw Error('Supprimez d’abord les relevés de prix.');if(key==='invoices'&&d.payments.some(p=>p.invoiceId===rid))throw Error('Annulez d’abord les paiements.');d[key]=d[key].filter(x=>x.id!==rid);validateBusiness(d);});}
 }
 return {view,handle};
}
