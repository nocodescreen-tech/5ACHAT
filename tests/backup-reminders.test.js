import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptBackup,decryptBackup} from '../backup.js';
import {futureReminders} from '../reminders.js';
test('encrypted backup round trip and wrong password rejection',async()=>{const state={version:1,description:'Achats privés — 500 FC'};const text=await encryptBackup(state,'test-passphrase-123');assert.equal(text.includes(state.description),false);assert.deepEqual(await decryptBackup(text,'test-passphrase-123'),state);await assert.rejects(decryptBackup(text,'incorrect-password'));});
test('group upcoming unpaid invoices by due date, ignoring paid and past',()=>{const invoices=[{id:'a',due:'2026-12-01',amount:100},{id:'b',due:'2026-12-01',amount:100},{id:'c',due:'2026-12-02',amount:100},{id:'d',due:'2026-11-20',amount:100}];const reminders=futureReminders({business:{invoices,payments:[{invoiceId:'c',amount:100}]}},new Date('2026-11-27T12:00:00'));assert.equal(reminders.length,1);assert.equal(reminders[0].id,20261201);assert.match(reminders[0].body,/2 facture/);});
