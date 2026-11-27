-- 5ACHAT V1: run once in a new Supabase PostgreSQL project.
begin;
create table public.workspaces (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0 check(revision>=0),
 state jsonb not null default '{"version":1,"activeId":null,"lists":[],"stores":[],"trash":[]}'::jsonb,
 updated_at timestamptz not null default now()
);
create table public.workspace_versions (
 owner_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null,
 state jsonb not null,
 created_at timestamptz not null default now(),
 primary key(owner_id,revision)
);
create table public.suppliers (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id text not null, name text not null check(length(name) between 1 and 250),
 address text not null default '', phone text not null default '',
 primary key(owner_id,id)
);
create table public.purchase_lists (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id text not null, name text not null, purchase_date date not null,
 archived boolean not null default false,
 budget_cdf_minor bigint check(budget_cdf_minor>=0),
 budget_usd_minor bigint check(budget_usd_minor>=0),
 primary key(owner_id,id)
);
create table public.purchase_items (
 owner_id uuid not null, list_id text not null, id text not null, supplier_id text not null,
 name text not null, quantity text not null,
 currency text not null check(currency in ('CDF','USD')),
 amount_minor bigint check(amount_minor>=0), purchased boolean not null default false,
 primary key(owner_id,list_id,id),
 foreign key(owner_id,list_id) references public.purchase_lists(owner_id,id) on delete cascade,
 foreign key(owner_id,supplier_id) references public.suppliers(owner_id,id)
);
create index purchase_items_supplier_idx on public.purchase_items(owner_id,supplier_id);
create index purchase_lists_date_idx on public.purchase_lists(owner_id,purchase_date desc);
-- Future business modules: owner-scoped data, not yet connected to V1 UI.
create table public.products (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null default gen_random_uuid(), name text not null, sku text, category text,
 unit text not null default 'pcs', primary key(owner_id,id), unique(owner_id,sku)
);
create table public.price_history (
 owner_id uuid not null, id uuid not null default gen_random_uuid(),
 product_id uuid not null, supplier_label text not null, currency text not null check(currency in ('CDF','USD')),
 amount_minor bigint not null check(amount_minor>=0), recorded_at timestamptz not null default now(),
 primary key(owner_id,id), foreign key(owner_id,product_id) references public.products(owner_id,id) on delete cascade
);
create table public.expenses (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null default gen_random_uuid(), description text not null,
 currency text not null check(currency in ('CDF','USD')), amount_minor bigint not null check(amount_minor>=0),
 incurred_on date not null default current_date, primary key(owner_id,id)
);
create table public.invoices (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null default gen_random_uuid(), supplier_label text not null, reference text,
 currency text not null check(currency in ('CDF','USD')), amount_minor bigint not null check(amount_minor>=0),
 issued_on date not null default current_date, due_on date, primary key(owner_id,id)
);
create table public.payments (
 owner_id uuid not null, id uuid not null default gen_random_uuid(), invoice_id uuid not null,
 amount_minor bigint not null check(amount_minor>0), paid_at timestamptz not null default now(),
 primary key(owner_id,id), foreign key(owner_id,invoice_id) references public.invoices(owner_id,id) on delete cascade
);
do $$
declare t text;
begin
 foreach t in array array['workspaces','workspace_versions','suppliers','purchase_lists','purchase_items','products','price_history','expenses','invoices','payments'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy read_own on public.%I for select to authenticated using (owner_id = auth.uid())',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
-- Only this transaction can write the active synchronized state.
create function public.save_workspace(expected_revision bigint, new_state jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); old_rev bigint; next_rev bigint; l jsonb; i jsonb; s jsonb; is_archived boolean;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if expected_revision is null or expected_revision<0 or new_state is null or pg_column_size(new_state)>2097152
 or (new_state->>'version') is distinct from '1' or jsonb_typeof(new_state->'lists') is distinct from 'array'
 or jsonb_typeof(new_state->'stores') is distinct from 'array' or jsonb_typeof(new_state->'trash') is distinct from 'array'
 then raise exception 'Invalid workspace'; end if;
 insert into public.workspaces(owner_id) values(u) on conflict do nothing;
 select revision into old_rev from public.workspaces where owner_id=u for update;
 if old_rev<>expected_revision then return jsonb_build_object('conflict',true,'revision',old_rev); end if;
 next_rev:=old_rev+1;
 delete from public.purchase_lists where owner_id=u;
 delete from public.suppliers where owner_id=u;
 for s in select value from jsonb_array_elements(new_state->'stores') loop
  insert into public.suppliers(owner_id,id,name,address,phone) values(u,s->>'id',s->>'name',coalesce(s->>'address',''),coalesce(s->>'phone',''));
 end loop;
 for is_archived in select unnest(array[false,true]) loop
  for l in select value from jsonb_array_elements(case when is_archived then new_state->'trash' else new_state->'lists' end) loop
   insert into public.purchase_lists(owner_id,id,name,purchase_date,archived,budget_cdf_minor,budget_usd_minor)
   values(u,l->>'id',l->>'name',(l->>'date')::date,is_archived,(l->'budget'->>'CDF')::bigint,(l->'budget'->>'USD')::bigint);
   for i in select value from jsonb_array_elements(l->'items') loop
    insert into public.purchase_items(owner_id,list_id,id,supplier_id,name,quantity,currency,amount_minor,purchased)
    values(u,l->>'id',i->>'id',i->>'storeId',i->>'name',i->>'qty',i->>'currency',(i->>'amount')::bigint,(i->>'done')::boolean);
   end loop;
  end loop;
 end loop;
 update public.workspaces set revision=next_rev,state=new_state,updated_at=now() where owner_id=u;
 insert into public.workspace_versions(owner_id,revision,state) values(u,next_rev,new_state);
 -- Keep 50 prior versions per user. Independent database backups still required.
 delete from public.workspace_versions where owner_id=u and revision<next_rev-49;
 return jsonb_build_object('conflict',false,'revision',next_rev);
end $$;
revoke all on function public.save_workspace(bigint,jsonb) from public,anon;
grant execute on function public.save_workspace(bigint,jsonb) to authenticated;
commit;
