import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBusiness,validateBusiness,outstanding} from '../business.js';
import {emptyState,validate,load,persist,KEY} from '../core.js';
const make=()=>{const b=emptyBusiness();b.products.push({id:'p',name:'Produit',sku:'X',category:'',unit:'pcs'});b.prices.push({id:'r',productId:'p',supplier:'A',currency:'CDF',amount:200,date:'2026-11-27'});b.invoices.push({id:'i',supplier:'A',reference:'F',currency:'USD',amount:1000,date:'2026-11-27',due:''});b.payments.push({id:'pay',invoiceId:'i',amount:400,date:'2026-11-27'});return b;};
test('business state and partial invoice payment',()=>{const b=make();assert.equal(validateBusiness(b),b);assert.equal(outstanding(b.invoices[0],b.payments),600);});
test('reject overpayments and missing references',()=>{const b=make();b.payments[0].amount=1001;assert.throws(()=>validateBusiness(b));b.payments[0].amount=400;b.prices[0].productId='other';assert.throws(()=>validateBusiness(b));});
test('reject duplicate SKU regardless of case',()=>{const b=make();b.products.push({...b.products[0],id:'p2',sku:'x'});assert.throws(()=>validateBusiness(b));});
test('commercial backup round trip, compatible with legacy snapshots',()=>{const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};const s={...emptyState(),business:make()};persist(storage,s);assert.deepEqual(load(storage).state,s);assert.doesNotThrow(()=>validate(emptyState()));map.set(KEY,JSON.stringify({...s,business:{...s.business,payments:[]}}));assert.deepEqual(load(storage).state.business.payments,[]);});
