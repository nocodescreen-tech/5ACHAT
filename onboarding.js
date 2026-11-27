// First-launch guide, opt-in permissions and explicit local/cloud choice.
const KEY='5achat:onboarding:v1';
const pages=[
 {title:'Vos achats, mieux organisés.',body:'Créez vos listes, regroupez les articles par fournisseur et suivez vos budgets en francs congolais et en dollars.',icon:'list'},
 {title:'Vos données restent à vous.',body:'Travaillez hors connexion. Connectez votre compte pour synchroniser vos listes et conserver un historique. Exportez aussi une sauvegarde chiffrée.',icon:'shield'},
 {title:'Ne manquez plus une échéance.',body:'Recevez des rappels locaux Android pour vos factures non réglées. Vous pouvez les activer maintenant ou plus tard dans les paramètres.',icon:'bell'}
];
const icons={list:'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="m8 9 1 1 2-2m2 1h3m-8 6 1 1 2-2m2 1h3"/>',shield:'<path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6z"/><path d="m8 12 3 3 5-6"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>'};
export function initOnboarding({onAccount,onReminders}){
 const d=document.querySelector('#welcome'),content=d.querySelector('.welcome-content');let step=0,returnFocus=null;
 function done(account=false){try{localStorage.setItem(KEY,'1');}catch{}d.close();if(account)onAccount();else if(returnFocus?.isConnected)returnFocus.focus();}
 function render(){
  const p=pages[step];content.innerHTML='<div class="welcome-top"><img src="icon.svg" alt="" width="44" height="44"><strong>5ACHAT</strong><button type="button" data-welcome="skip">Passer</button></div><div class="welcome-visual"><svg viewBox="0 0 24 24" width="68" height="68" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[p.icon]+'</svg></div><p class="welcome-kicker">PRISE EN MAIN · '+(step+1)+' / '+pages.length+'</p><h2 id="welcomeTitle">'+p.title+'</h2><p>'+p.body+'</p><div class="welcome-dots" aria-hidden="true">'+pages.map((_,i)=>'<span class="'+(i===step?'active':'')+'"></span>').join('')+'</div><p id="welcomeStatus" role="status"></p><div class="welcome-actions">'+(step>0?'<button type="button" data-welcome="back">Retour</button>':'')+(step<pages.length-1?'<button class="primary" type="button" data-welcome="next">Continuer</button>':'<button class="primary" type="button" data-welcome="reminders">Activer les rappels</button><button type="button" data-welcome="account">Connecter mon compte</button><button type="button" data-welcome="local">Commencer hors connexion</button>')+'</div>';
 }
 content.addEventListener('click',async e=>{const btn=e.target.closest('[data-welcome]');if(!btn)return;switch(btn.dataset.welcome){case 'next':step++;render();break;case 'back':step--;render();break;case 'skip':case 'local':done();break;case 'account':done(true);break;case 'reminders':btn.disabled=true;try{await onReminders();if(d.open){const status=d.querySelector('#welcomeStatus');status.textContent='Rappels activés. Vous pouvez maintenant connecter votre compte ou commencer hors connexion.';btn.textContent='Rappels activés';}}catch(err){if(d.open)d.querySelector('#welcomeStatus').textContent=err.message;}finally{if(btn.isConnected&&btn.textContent!=='Rappels activés')btn.disabled=false;}break;}});
 d.addEventListener('cancel',e=>{e.preventDefault();done();});
 const open=()=>{if(d.open)return;returnFocus=document.activeElement;step=0;render();d.showModal();};
 let first=true;try{first=localStorage.getItem(KEY)!=='1';}catch{}if(first)open();return {open};
}
