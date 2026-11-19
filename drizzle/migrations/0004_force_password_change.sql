alter table public.profiles add column must_change_password boolean not null default false;

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff(auth.uid()) then
    if new.account_status is distinct from old.account_status then new.account_status := old.account_status; end if;
    if new.must_change_password is distinct from old.must_change_password
       and coalesce(current_setting('app.password_changed', true), '') <> 'yes' then
      new.must_change_password := old.must_change_password;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.complete_password_change()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  perform set_config('app.password_changed', 'yes', true);
  update public.profiles set must_change_password = false where id = auth.uid();
  insert into public.audit_logs (actor_id, action, entity_type, entity_id) values (auth.uid(), 'password.changed', 'user', auth.uid());
end $$;
revoke execute on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;