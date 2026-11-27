// Supabase Auth + PostgREST; configuration contains only a public key.
// Optional remembered session is device-local; never commit credentials.
import {validate} from './core.js';
const key='5achat:cloud-config:v1', sessionKey='5achat:remember:v1';
const canonical=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
export function makeCloud({getState,replaceState,backup,notify}){
 const cfg={url:'https://koqzbekswlegyljlmvot.supabase.co',key:"sb_publishable_bf049xJMXBgOD2FnWbl2Kw_zk9Ujo-r"};
 let session=null,rev=null,baseline=null,remote=null,busy=false,timer=null,epoch=0,message='Non connecté',tone='neutral',remember=false,retry=0;
 function forget(){try{localStorage.removeItem(sessionKey);}catch{}}
 function checkpoint(){if(!remember||!session?.refresh_token||!session?.user?.id)return;try{localStorage.setItem(sessionKey,JSON.stringify({url:cfg.url,userId:session.user.id,refreshToken:session.refresh_token,revision:rev}));}catch{status('Session non mémorisée • stockage indisponible','warn');}}
 function acceptSession(data){session={...data,expiresAt:Date.now()+Number(data.expires_in||3600)*1000};if(!session.user?.id)throw Error('Session invalide');checkpoint();}
 function status(text,kind='neutral'){message=text;tone=kind;const e=document.querySelector('#cloudStatus');if(e){e.textContent=text;e.dataset.tone=kind;}notify?.(text,kind);}
 function validConfig(url,publicKey){const u=new URL(url);if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('Utilisez l’URL HTTPS de votre projet Supabase.');if(!publicKey||publicKey.startsWith('sb_secret_'))throw Error('Utilisez la clé publique publishable ou anon, jamais la clé service_role.');if(publicKey.split('.').length===3){try{const role=JSON.parse(atob(publicKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role;if(role!=='anon')throw Error('Clé non publique');}catch{throw Error('Utilisez uniquement une clé anon publique.');}}return {url:u.origin,key:publicKey};}
 async function call(path,body,token=null,method='POST'){
  const response=await fetch(cfg.url+path,{method,headers:{apikey:cfg.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(method==='GET'?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
  const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{data={message:raw};}
  if(!response.ok)throw Error(data?.msg||data?.message||data?.error_description||'Erreur réseau '+response.status);
  return data;
 }
 async function token(){if(!session)throw Error('Connectez-vous.');if(Date.now()>=session.expiresAt-30000){const r=await call('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token});acceptSession(r);}return session.access_token;}
 async function read(){const rows=await call('/rest/v1/workspaces?select=revision,state&limit=1',null,await token(),'GET');const row=rows[0];return row?{revision:Number(row.revision),state:validate(row.state)}:{revision:0,state:null};}
 async function connect(email,password,signup,keep=false){
  if(busy)return;busy=true;const generation=++epoch;rev=null;baseline=null;remote=null;session=null;remember=keep;forget();status('Connexion…');refresh();
  try{const data=await call(signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{email,password});
   if(generation!==epoch)return;
   if(!data.access_token){status('Vérifiez votre e-mail puis connectez-vous.');return;}
   acceptSession(data);
   remote=await read();if(generation!==epoch)return;
   const local=canonical(getState());
   if(remote.state&&canonical(remote.state)===local){rev=remote.revision;baseline=local;checkpoint();status('Synchronisé • révision '+rev,'ok');}
   else if(!remote.state){status('Espace cloud vide. Confirmez l’envoi de cette liste locale.');}
   else {status('Données cloud trouvées. Choisissez une action : aucune écriture automatique.','warn');}
  }catch(e){session=null;forget();status(e.message,'warn');}finally{busy=false;refresh();}
 }
 async function resume(){let saved;try{saved=JSON.parse(localStorage.getItem(sessionKey)||'null');}catch{forget();return;}if(!saved||saved.url!==cfg.url||!saved.refreshToken)return;if(busy)return;busy=true;remember=true;status('Restauration de la session…');refresh();try{const data=await call('/auth/v1/token?grant_type=refresh_token',{refresh_token:saved.refreshToken});if(data.user?.id!==saved.userId)throw Error('Compte différent');acceptSession(data);remote=await read();const local=canonical(getState());if(remote.state&&canonical(remote.state)===local){rev=remote.revision;baseline=local;checkpoint();status('Synchronisé • révision '+rev,'ok');}else if(remote.state&&Number.isSafeInteger(saved.revision)&&saved.revision===remote.revision){rev=remote.revision;baseline=canonical(remote.state);checkpoint();status('Modifications locales en attente','warn');}else{rev=null;checkpoint();status(remote.state?'Versions différentes : choisissez la copie à conserver.':'Espace cloud vide. Confirmez l’envoi.','warn');}}catch(e){session=null;status('Session non restaurée : '+e.message,'warn');}finally{busy=false;refresh();if(rev!==null)schedule();}}

 async function push(explicit=false){
  if(!session||busy||(!explicit&&rev===null))return;
  const generation=epoch;busy=true;let failed=false;const snapshot=structuredClone(getState()),fingerprint=canonical(snapshot);
  if(!explicit&&fingerprint===baseline){busy=false;return;}
  status('Synchronisation…');refresh();
  try{const expected=explicit?remote?.revision:rev;if(expected==null)throw Error('Chargez la version distante avant de continuer.');
   const r=await call('/rest/v1/rpc/save_workspace',{expected_revision:expected,new_state:snapshot},await token());
   if(generation!==epoch)return;
   if(r.conflict){rev=null;checkpoint();remote=await read();status('Conflit : une autre version existe. Votre copie locale est conservée.','warn');}
   else{rev=Number(r.revision);baseline=fingerprint;remote={revision:rev,state:snapshot};retry=0;checkpoint();status('Synchronisé • révision '+rev,'ok');}
  }catch(e){failed=true;retry=Math.min(retry+1,6);status('Non synchronisé : '+e.message+' • copie locale conservée','warn');}
  finally{busy=false;refresh();if(rev!==null&&canonical(getState())!==baseline){if(failed){clearTimeout(timer);if(navigator.onLine!==false)timer=setTimeout(()=>push(),Math.min(60000,1500*2**retry));}else schedule(true);}}
 }
 function schedule(auto=true){clearTimeout(timer);if(!auto||!session||rev===null)return;if(canonical(getState())===baseline)return;status(navigator.onLine===false?'Hors connexion • sauvegarde locale':'Modifications locales • synchronisation en attente','warn');if(navigator.onLine===false)return;timer=setTimeout(()=>push(),1200);}
 async function pull(){if(!session||busy)return;busy=true;try{remote=await read();if(!remote.state)throw Error('Aucune sauvegarde cloud.');if(!confirm('Restaurer cette version cloud ? Une copie de vos données locales sera exportée avant.'))return;backup();replaceState(remote.state);rev=remote.revision;baseline=canonical(getState());checkpoint();status('Restauré • révision '+rev,'ok');}catch(e){status(e.message,'warn');}finally{busy=false;refresh();}}
 async function versions(){if(!session||busy)return;busy=true;refresh();try{const rows=await call('/rest/v1/workspace_versions?select=revision,created_at&order=revision.desc&limit=50',null,await token(),'GET');if(!rows.length)throw Error('Aucune version disponible.');const choice=prompt('Versions disponibles :\\n'+rows.map(x=>x.revision+' — '+new Date(x.created_at).toLocaleString('fr-FR')).join('\\n')+'\\nNuméro de la version à restaurer :');if(choice===null)return;const selected=rows.find(x=>String(x.revision)===choice.trim());if(!selected)throw Error('Version inconnue.');const result=await call('/rest/v1/workspace_versions?select=state&revision=eq.'+encodeURIComponent(selected.revision),null,await token(),'GET');if(!result[0])throw Error('Version indisponible.');const previous=validate(result[0].state);const latest=await read();if(!confirm('Restaurer la révision '+selected.revision+' sur cet appareil ? Le cloud actuel ne sera pas écrasé automatiquement.'))return;backup();rev=null;baseline=null;remote=latest;checkpoint();replaceState(previous);status('Ancienne version restaurée localement. Envoi cloud à confirmer.','warn');}catch(e){status(e.message,'warn');}finally{busy=false;refresh();}}
 async function logout(){if(busy||!session)return;if(!confirm('Déconnecter ? Les données restent accessibles localement sur cet appareil privé.'))return;busy=true;clearTimeout(timer);refresh();let revoked=false;try{await call('/auth/v1/logout?scope=local',{},await token());revoked=true;}catch(e){console.warn('Logout:',e.message);}finally{++epoch;session=null;rev=null;remote=null;baseline=null;remember=false;forget();busy=false;status(revoked?'Déconnecté':'Déconnexion locale. Révocation distante non confirmée.',revoked?'neutral':'warn');refresh();}}
 async function changePassword(){if(!session||busy)return;const password=prompt('Nouveau mot de passe (12 caractères minimum)');if(password===null)return;if(password.length<12||password!==prompt('Confirmer le nouveau mot de passe')){status('Mot de passe trop court ou confirmation différente.','warn');return;}busy=true;refresh();try{await call('/auth/v1/user',{password},await token(),'PUT');status('Mot de passe modifié.','ok');}catch(e){status(e.message,'warn');}finally{busy=false;refresh();}}
 function refresh(){const root=document.querySelector('#cloudPanel');if(root)mount(root);}
 function mount(root){
  root.replaceChildren();
  const h=document.createElement('h2');h.textContent='Compte et sauvegarde cloud';root.append(h);
  const p=document.createElement('p');p.id='cloudStatus';p.textContent=message;p.dataset.tone=tone;p.setAttribute('role','status');root.append(p);
  if(!session){
   const form=document.createElement('form');form.className='cloud-form';const field=(label,name,type,value='')=>{const l=document.createElement('label');l.textContent=label;const i=document.createElement('input');i.name=name;i.type=type;i.value=value;i.required=true;if(name==='password')i.autocomplete='current-password';if(name==='email')i.autocomplete='email';l.append(i);form.append(l);};
   field('Adresse e-mail','email','email');field('Mot de passe','password','password');const keep=document.createElement('label');keep.className='remember-device';const cb=document.createElement('input');cb.type='checkbox';cb.name='remember';keep.append(cb,document.createTextNode(' Rester connecté sur cet appareil privé'));form.append(keep);
   const actions=document.createElement('div');actions.className='cloud-actions';for(const [label,mode] of [['Se connecter','login'],['Créer un compte','signup']]){const b=document.createElement('button');b.type='submit';b.name='mode';b.value=mode;b.textContent=label;b.disabled=busy;if(mode==='login')b.className='primary';actions.append(b);}form.append(actions);form.onsubmit=e=>{e.preventDefault();try{const f=new FormData(form);validConfig(cfg.url,cfg.key);const email=f.get('email'),password=f.get('password');if(e.submitter?.value==='signup'&&password.length<8)throw Error('8 caractères minimum.');connect(email,password,e.submitter?.value==='signup',f.has('remember'));}catch(err){status(err.message,'warn');}};root.append(form);
   const note=document.createElement('small');note.textContent='La connexion mémorisée conserve un jeton sur cet appareil, non chiffré par l’application. Activez-la uniquement sur un appareil privé.';root.append(note);
  }else{
   const who=document.createElement('p');who.textContent=session.user?.email||'Compte connecté';root.append(who);
   const actions=document.createElement('div');actions.className='cloud-actions';const btn=(text,fn,primary=false)=>{const b=document.createElement('button');b.textContent=text;b.disabled=busy;if(primary)b.className='primary';b.onclick=fn;actions.append(b);};
   if(rev===null){btn(remote?.state?'Remplacer le cloud par ma copie locale':'Envoyer ma copie locale',()=>{if(confirm('Confirmer l’envoi de la copie locale vers ce compte ?'))push(true);},true);if(remote?.state)btn('Restaurer la copie cloud',pull);}
   else{btn('Synchroniser maintenant',()=>push(),true);btn('Restaurer la dernière version cloud',pull);}
   btn('Historique des sauvegardes',versions);btn('Modifier le mot de passe',changePassword);btn('Déconnexion',logout);root.append(actions);
  }
 }
 window.addEventListener('online',()=>{if(session)schedule();else resume();});return {mount,localChanged:schedule,resume};
}
