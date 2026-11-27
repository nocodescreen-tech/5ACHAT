begin;
-- Keep commercial projections in the same transaction as revisioned workspace save.
create function private.project_business() returns trigger language plpgsql security invoker set search_path='' as $$
declare b jsonb:=new.state->'business'; k text; x jsonb; u uuid:=new.owner_id;
begin
 if auth.uid() is distinct from u then raise exception 'Invalid owner' using errcode='42501'; end if;
 if b is null then
  if old.state ? 'business' then raise exception 'Update the application before saving commercial data'; end if;
  return new;
 end if;
 if jsonb_typeof(b) is distinct from 'object' then raise exception 'Invalid business data'; end if;
 foreach k in array array['products','prices','expenses','invoices','payments'] loop
  if jsonb_typeof(b->k) is distinct from 'array' then raise exception 'Invalid collection %',k; end if;
 end loop;
 delete from public.payments where owner_id=u;
 delete from public.invoices where owner_id=u;
 delete from public.price_history where owner_id=u;
 delete from public.products where owner_id=u;
 delete from public.expenses where owner_id=u;
 for x in select value from jsonb_array_elements(b->'products') loop
  insert into public.products(owner_id,id,name,sku,category,unit) values(u,(x->>'id')::uuid,x->>'name',nullif(lower(btrim(x->>'sku')),''),x->>'category',x->>'unit');
 end loop;
 for x in select value from jsonb_array_elements(b->'prices') loop
  insert into public.price_history(owner_id,id,product_id,supplier_label,currency,amount_minor,recorded_at) values(u,(x->>'id')::uuid,(x->>'productId')::uuid,x->>'supplier',x->>'currency',(x->>'amount')::bigint,(x->>'date')::date::timestamp at time zone 'UTC');
 end loop;
 for x in select value from jsonb_array_elements(b->'expenses') loop
  insert into public.expenses(owner_id,id,description,currency,amount_minor,incurred_on) values(u,(x->>'id')::uuid,x->>'description',x->>'currency',(x->>'amount')::bigint,(x->>'date')::date);
 end loop;
 for x in select value from jsonb_array_elements(b->'invoices') loop
  insert into public.invoices(owner_id,id,supplier_label,reference,currency,amount_minor,issued_on,due_on) values(u,(x->>'id')::uuid,x->>'supplier',x->>'reference',x->>'currency',(x->>'amount')::bigint,(x->>'date')::date,nullif(x->>'due','')::date);
 end loop;
 for x in select value from jsonb_array_elements(b->'payments') loop
  insert into public.payments(owner_id,id,invoice_id,amount_minor,paid_at) values(u,(x->>'id')::uuid,(x->>'invoiceId')::uuid,(x->>'amount')::bigint,(x->>'date')::date::timestamp at time zone 'UTC');
 end loop;
 if exists(select 1 from public.invoices i join public.payments p on p.owner_id=i.owner_id and p.invoice_id=i.id where i.owner_id=u group by i.id,i.amount_minor having sum(p.amount_minor)>i.amount_minor) then raise exception 'Payments exceed invoice balance'; end if;
 return new;
end $$;
revoke all on function private.project_business() from public,anon,authenticated;
create trigger project_business_after_save after update of state on public.workspaces for each row execute function private.project_business();
commit;
