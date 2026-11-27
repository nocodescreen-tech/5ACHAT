import test from 'node:test';
import assert from 'node:assert/strict';
import {csvRows,purchaseRows,dueReminders} from '../extras.js';
test('CSV Excel : accents, guillemets, devises et décimales',()=>{
 const rows=csvRows('\ufeffFournisseur;Produit;Quantité;Devise;Montant;Acheté\r\n"A; B";"Savon ""doux""";2 pqt;FC;1 200,50;Oui\r\nC;Autre;1;USD;;Non');
 assert.deepEqual(purchaseRows(rows),[{store:'A; B',name:'Savon "doux"',qty:'2 pqt',currency:'CDF',amount:120050,done:true},{store:'C',name:'Autre',qty:'1',currency:'USD',amount:null,done:false}]);
});
test('reject incomplete columns, wrong currencies and invalid prices',()=>{for(const raw of ['Produit\nA','Fournisseur;Produit;Devise\nA;B;EUR','Fournisseur;Produit;Montant\nA;B;-10'])assert.throws(()=>purchaseRows(csvRows(raw)));assert.throws(()=>csvRows('A;B\n"non fermé'));});
test('due reminders exclude paid and future invoices',()=>{const state={business:{invoices:[{id:'a',due:'2026-11-27',amount:100},{id:'b',due:'2026-11-26',amount:200},{id:'c',due:'2026-12-01',amount:100}],payments:[{invoiceId:'b',amount:200}]}};assert.deepEqual(dueReminders(state,'2026-11-27').map(i=>i.id),['a']);});
