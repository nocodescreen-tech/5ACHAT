// Supabase Auth + PostgREST; configuration contains only a public key.
// Tokens live in memory; local workspace remains usable after sign-out or restart.
import {validate} from './core.js';
const key='5achat:cloud-config:v1';
const canonical=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
export function makeCloud({getState,replaceState,backup,notify}){
 let cfg={url:'',key:''};try{cfg={...cfg,...JSON.parse(localStorage.getItem(key)||'{}')};}catch{}
 let session=null,rev=null,baseline=null,remote=null,busy=false,timer=null,epoch=0,message='Non connecté',tone='neutral';
 function status(text,kind='neutral'){message=text;tone=kind;const e=document.querySelector('#cloudStatus');if(e){e.textContent=text;e.dataset.tone=kind;}notify?.(text,kind);}
 function validConfig(url,publicKey){const u=new URL(url);if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('Utilisez l’URL HTTPS de votre projet Supabase.');if(!publicKey||publicKey.startsWith('sb_secret_'))throw Error('Utilisez la clé publique publishable ou anon, jamais la clé service_role.');if(publicKey.split('.').length===3){try{const role=JSON.parse(atob(publicKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role;if(role!=='anon')throw Error('Clé non publique');}catch{throw Error('Utilisez uniquement une clé anon publique.');}}return {url:u.origin,key:publicKey};}
 async function call(path,body,token=null,method='POST'){
  const response=await fetch(cfg.url+path,{method,headers:{apikey:cfg.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(method==='GET'?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
  const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{data={message:raw};}
  if(!response.ok)throw Error(data?.msg||data?.message||data?.error_description||'Erreur réseau '+response.status);
  return data;
 }
 async function token(){if(!session)throw Error('Connectez-vous.');if(Date.now()>=session.expiresAt-30000){const r=await call('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token});session={...r,expiresAt:Date.now()+r.expires_in*1000};}return session.access_token;}
 async function read(){const rows=await call('/rest/v1/workspaces?select=revision,state&limit=1',null,await token(),'GET');const row=rows[0];return row?{revision:Number(row.revision),state:validate(row.state)}:{revision:0,state:null};}
 async function connect(email,password,signup){
  if(busy)return;busy=true;const generation=++epoch;rev=null;baseline=null;remote=null;session=null;status('Connexion…');refresh();
  try{const data=await call(signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{email,password});
   if(generation!==epoch)return;
   if(!data.access_token){status('Vérifiez votre e-mail puis connectez-vous.');return;}
   session={...data,expiresAt:Date.now()+data.expires_in*1000};
   remote=await read();if(generation!==epoch)return;
   const local=canonical(getState());
   if(remote.state&&canonical(remote.state)===local){rev=remote.revision;baseline=local;status('Synchronisé • révision '+rev,'ok');}
   else if(!remote.state){status('Espace cloud vide. Confirmez l’envoi de cette liste locale.');}
   else {status('Données cloud trouvées. Choisissez une action : aucune écriture automatique.','warn');}
  }catch(e){session=null;status(e.message,'warn');}finally{busy=false;refresh();}
 }
 async function push(explicit=false){
  if(!session||busy||(!explicit&&rev===null))return;
  const generation=epoch;busy=true;const snapshot=structuredClone(getState()),fingerprint=canonical(snapshot);
  if(!explicit&&fingerprint===baseline){busy=false;return;}
  status('Synchronisation…');refresh();
  try{const expected=explicit?remote?.revision:rev;if(expected==null)throw Error('Chargez la version distante avant de continuer.');
   const r=await call('/rest/v1/rpc/save_workspace',{expected_revision:expected,new_state:snapshot},await token());
   if(generation!==epoch)return;
   if(r.conflict){rev=null;remote=await read();status('Conflit : une autre version existe. Votre copie locale est conservée.','warn');}
   else{rev=Number(r.revision);baseline=fingerprint;remote={revision:rev,state:snapshot};status('Synchronisé • révision '+rev,'ok');}
  }catch(e){status('Non synchronisé : '+e.message+' • copie locale conservée','warn');}
  finally{busy=false;refresh();if(rev!==null&&baseline!==fingerprint)schedule(false);else if(rev!==null&&canonical(getState())!==baseline)schedule(true);}
 }
 function schedule(auto=true){clearTimeout(timer);if(!auto||!session||rev===null)return;timer=setTimeout(()=>push(),1200);}
 async function pull(){if(!session||busy)return;busy=true;try{remote=await read();if(!remote.state)throw Error('Aucune sauvegarde cloud.');if(!confirm('Restaurer cette version cloud ? Une copie de vos données locales sera exportée avant.'))return;backup();replaceState(remote.state);rev=remote.revision;baseline=canonical(getState());status('Restauré • révision '+rev,'ok');}catch(e){status(e.message,'warn');}finally{busy=false;refresh();}}
 function refresh(){const root=document.querySelector('#cloudPanel');if(root)mount(root);}
 function mount(root){
  root.replaceChildren();
  const h=document.createElement('h2');h.textContent='Compte et sauvegarde cloud';root.append(h);
  const p=document.createElement('p');p.id='cloudStatus';p.textContent=message;p.dataset.tone=tone;p.setAttribute('role','status');root.append(p);
  if(!session){
   const form=document.createElement('form');form.className='cloud-form';const field=(label,name,type,value='')=>{const l=document.createElement('label');l.textContent=label;const i=document.createElement('input');i.name=name;i.type=type;i.value=value;i.required=true;if(name==='password')i.autocomplete='current-password';if(name==='email')i.autocomplete='email';l.append(i);form.append(l);};
   field('URL du projet Supabase','url','url',cfg.url);field('Clé publique Supabase','key','text',cfg.key);field('Adresse e-mail','email','email');field('Mot de passe','password','password');
   const actions=document.createElement('div');actions.className='cloud-actions';for(const [label,mode] of [['Se connecter','login'],['Créer un compte','signup']]){const b=document.createElement('button');b.type='submit';b.name='mode';b.value=mode;b.textContent=label;b.disabled=busy;if(mode==='login')b.className='primary';actions.append(b);}form.append(actions);form.onsubmit=e=>{e.preventDefault();try{const f=new FormData(form);cfg=validConfig(f.get('url').trim(),f.get('key').trim());localStorage.setItem(key,JSON.stringify(cfg));const email=f.get('email'),password=f.get('password');if(e.submitter?.value==='signup'&&password.length<8)throw Error('8 caractères minimum.');connect(email,password,e.submitter?.value==='signup');}catch(err){status(err.message,'warn');}};root.append(form);
   const note=document.createElement('small');note.textContent='La clé publique n’est pas un secret. Ne saisissez jamais une clé service_role. Connexion à renouveler après fermeture.';root.append(note);
  }else{
   const who=document.createElement('p');who.textContent=session.user?.email||'Compte connecté';root.append(who);
   const actions=document.createElement('div');actions.className='cloud-actions';const btn=(text,fn,primary=false)=>{const b=document.createElement('button');b.textContent=text;b.disabled=busy;if(primary)b.className='primary';b.onclick=fn;actions.append(b);};
   if(rev===null){btn(remote?.state?'Remplacer le cloud par ma copie locale':'Envoyer ma copie locale',()=>{if(confirm('Confirmer l’envoi de la copie locale vers ce compte ?'))push(true);},true);if(remote?.state)btn('Restaurer la copie cloud',pull);}
   else{btn('Synchroniser maintenant',()=>push(),true);btn('Restaurer la dernière version cloud',pull);}
   btn('Déconnexion',()=>{if(confirm('Déconnecter ? Les données restent sur cet appareil.')){++epoch;clearTimeout(timer);session=null;rev=null;remote=null;baseline=null;status('Non connecté');refresh();}});root.append(actions);
  }
 }
 window.addEventListener('online',()=>schedule());return {mount,localChanged:schedule};
}
