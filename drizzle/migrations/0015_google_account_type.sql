-- Let a new Google signup keep the account type chosen on the join page.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff(auth.uid()) then
    if new.account_status is distinct from old.account_status
       and coalesce(current_setting('app.account_claim', true), '') <> 'yes' then
      new.account_status := old.account_status;
    end if;
    if new.must_change_password is distinct from old.must_change_password
       and coalesce(current_setting('app.password_changed', true), '') <> 'yes' then
      new.must_change_password := old.must_change_password;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.claim_oauth_account_type(_type text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if _type not in ('employer','recruiter','specialist') then return; end if;
  if exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('recruitment_officer','admin','super_admin','employer','recruiter','specialist')) then return; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and created_at > now() - interval '30 minutes') then return; end if;
  delete from public.user_roles where user_id = auth.uid() and role = 'candidate';
  insert into public.user_roles (user_id, role) values (auth.uid(), _type::public.app_role) on conflict do nothing;
  perform set_config('app.account_claim', 'yes', true);
  update public.profiles
  set account_status = case when _type in ('recruiter','specialist') then 'pending_review'::public.account_status else 'active'::public.account_status end
  where id = auth.uid();
end $$;
revoke execute on function public.claim_oauth_account_type(text) from public, anon;
grant execute on function public.claim_oauth_account_type(text) to authenticated;
