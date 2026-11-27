const KEY='5achat:reminders:v1';
const plugin=()=>globalThis.Capacitor?.isNativePlatform?.()?globalThis.Capacitor.Plugins?.LocalNotifications:null;
export function remindersEnabled(){try{return localStorage.getItem(KEY)==='1';}catch{return false;}}
export function futureReminders(state,now=new Date()){
 const b=state.business||{},payments=b.payments||[],due=new Map();
 for(const i of b.invoices||[]){if(!i.due||i.amount<=payments.filter(p=>p.invoiceId===i.id).reduce((a,p)=>a+p.amount,0))continue;const at=new Date(i.due+'T09:00:00');if(!Number.isFinite(at.getTime())||at<=now)continue;due.set(i.due,(due.get(i.due)||0)+1);}
 return [...due].sort(([a],[b])=>a.localeCompare(b)).slice(0,60).map(([day,count])=>({id:Number(day.replace(/-/g,'')),title:'5ACHAT · Échéance',body:count+' facture(s) à vérifier dans votre espace.',schedule:{at:new Date(day+'T09:00:00')},extra:{type:'5achat-due'}}));
}
let queue=Promise.resolve();
export async function configureReminders(enabled,state){
 const p=plugin();if(!p)throw Error('Disponible dans l’application Android. Les rappels visuels restent actifs sur le web.');
 if(enabled){const permission=await p.requestPermissions();if(permission.display!=='granted')throw Error('Autorisation de notification refusée.');}
 localStorage.setItem(KEY,enabled?'1':'0');await syncReminders(state);
}
export function syncReminders(state){
 queue=queue.catch(()=>{}).then(async()=>{const p=plugin();if(!p)return;const pending=(await p.getPending()).notifications||[];const owned=pending.filter(x=>Number.isInteger(x.id)&&x.id>=20000101&&x.id<=20991231);
 const enabled=remindersEnabled();if(enabled&&(await p.checkPermissions()).display!=='granted')return;
 const next=enabled?futureReminders(state):[];
 if(owned.length)await p.cancel({notifications:owned.map(n=>({id:n.id}))});
 if(next.length)await p.schedule({notifications:next});});
 return queue;
}
