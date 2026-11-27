import {test,expect} from '@playwright/test';
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
test('mobile purchase lifecycle, persistence, spreadsheet and theme',async({page})=>{
 await page.goto('http://127.0.0.1:8080');
 await page.getByRole('button',{name:'Continuer',exact:true}).click();await page.getByRole('button',{name:'Continuer',exact:true}).click();await page.getByRole('button',{name:'Commencer hors connexion',exact:true}).click();
 await page.locator('#newList').click();await page.getByLabel('Nom',{exact:true}).fill('Liste QA');await page.locator('#form button[type=submit]').click();
 await page.getByRole('button',{name:'+ Fournisseur',exact:true}).click();await page.getByLabel('Nom',{exact:true}).fill('Magasin QA');await page.locator('#form button[type=submit]').click();
 await page.getByRole('button',{name:'+ Article',exact:true}).click();await page.getByLabel('Produit',{exact:true}).fill('Savon QA');await page.getByLabel('Quantité',{exact:true}).fill('2 pqt');await page.getByLabel('Montant total de la ligne',{exact:true}).fill('2500');await page.locator('#form button[type=submit]').click();
 await page.getByRole('checkbox',{name:'Acheté : Savon QA'}).check();await expect(page.getByRole('checkbox',{name:'Acheté : Savon QA'})).toBeChecked();
 await page.reload();await expect(page.locator('#welcome')).not.toBeVisible();await expect(page.getByRole('checkbox',{name:'Acheté : Savon QA'})).toBeChecked();
 page.once('dialog',d=>d.accept());await page.locator('#spreadsheetFile').setInputFiles({name:'achats.csv',mimeType:'text/csv',buffer:Buffer.from('Fournisseur;Produit;Quantité;Devise;Montant\nMagasin QA;Lotion QA;6;USD;12')});await expect(page.getByRole('checkbox',{name:'Acheté : Lotion QA'})).toBeVisible();
 await page.screenshot({path:'e2e-results/mobile-achats.png',fullPage:true});
 await page.locator('[data-tab=settings]').click();await page.getByRole('button',{name:'Mode sombre',exact:true}).click();await expect(page.locator('html')).toHaveClass(/dark/);
 await page.reload();await expect(page.locator('html')).toHaveClass(/dark/);
});
test('invoice, partial payment and remaining balance',async({page})=>{
 await page.goto('http://127.0.0.1:8080');await page.getByRole('button',{name:'Passer',exact:true}).click();await page.locator('[data-tab=business]').click();
 await page.getByRole('button',{name:'Factures',exact:true}).click();
 await page.getByRole('button',{name:'+ Facture',exact:true}).click();
 await page.getByLabel('Fournisseur',{exact:true}).fill('Fournisseur QA');await page.getByLabel('Montant',{exact:true}).fill('10000');await page.locator('#form button[type=submit]').click();
 await page.getByRole('button',{name:'+ Paiement',exact:true}).click();await page.getByLabel('Montant',{exact:true}).fill('4000');await page.locator('#form button[type=submit]').click();
 await expect(page.getByText(/Reste à payer/)).toBeVisible();await expect(page.getByText('Paiement',{exact:true})).toBeVisible();
 await page.screenshot({path:'e2e-results/mobile-factures.png',fullPage:true});
});

test('first-run permission flow and account entry',async({page})=>{
 await page.addInitScript(()=>{
  window.__reminderCalls=[];
  window.Capacitor={isNativePlatform:()=>true,Plugins:{LocalNotifications:{
   requestPermissions:async()=>{window.__reminderCalls.push('permission');return {display:'granted'};},
   checkPermissions:async()=>({display:'granted'}),getPending:async()=>({notifications:[]}),
   cancel:async()=>{},schedule:async()=>{}
  }}};
 });
 await page.goto('http://127.0.0.1:8080');
 await page.getByRole('button',{name:'Continuer',exact:true}).click();
 await page.getByRole('button',{name:'Continuer',exact:true}).click();
 await page.getByRole('button',{name:'Activer les rappels',exact:true}).click();
 await expect(page.getByRole('button',{name:'Rappels activés',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>window.__reminderCalls)).toEqual(['permission']);
 await page.getByRole('button',{name:'Connecter mon compte',exact:true}).click();
 await expect(page.getByLabel('Adresse e-mail',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Désactiver rappels Android'})).toBeVisible();
 await page.reload();await expect(page.locator('#welcome')).not.toBeVisible();
});
