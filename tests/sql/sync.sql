set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$
declare s jsonb:='{"version":1,"activeId":"l1","lists":[{"id":"l1","name":"Test","date":"2026-01-01","budget":{"CDF":1000,"USD":null},"items":[{"id":"i1","storeId":"s1","name":"Produit","qty":"1","currency":"CDF","amount":500,"done":true}]}],"stores":[{"id":"s1","name":"Test","address":"","phone":""}],"trash":[]}'::jsonb; r jsonb;
begin
 r:=public.save_workspace(0,s);
 if r->>'revision'<>'1' or r->>'conflict'<>'false' then raise exception 'Initial save failed';end if;
 if (select count(*) from public.purchase_items)<>1 then raise exception 'Projection failed';end if;
 r:=public.save_workspace(0,s);
 if r->>'conflict'<>'true' then raise exception 'Expected conflict';end if;
 if (select count(*) from public.workspace_versions)<>1 then raise exception 'Unexpected version';end if;
 begin
  perform public.save_workspace(1,jsonb_set(s,'{lists,0,items,0,storeId}','"missing"'::jsonb));
  raise exception 'Expected foreign key violation';
 exception when foreign_key_violation then null;
 end;
 if (select revision from public.workspaces)<>1 or (select count(*) from public.purchase_items)<>1 then raise exception 'Rollback failed';end if;
 begin
  update public.workspaces set revision=99;
  raise exception 'Direct write should be forbidden';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$
begin
 if (select count(*) from public.workspaces)<>0 or (select count(*) from public.purchase_items)<>0 or (select count(*) from public.workspace_versions)<>0 then raise exception 'Cross-account leak';end if;
 perform public.save_workspace(0,'{"version":1,"activeId":null,"lists":[],"stores":[],"trash":[]}'::jsonb);
 if (select count(*) from public.workspaces)<>1 then raise exception 'Second account failed';end if;
end $$;
reset role;
