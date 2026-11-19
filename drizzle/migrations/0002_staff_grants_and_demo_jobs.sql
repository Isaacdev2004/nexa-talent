create table public.staff_role_grants (
  email text primary key check (email = lower(email)),
  role public.app_role not null check (role in ('recruitment_officer','admin','super_admin')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
grant all on public.staff_role_grants to service_role;
alter table public.staff_role_grants enable row level security;

create or replace function public.apply_staff_grant(_user_id uuid, _email text)
returns void language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from public.staff_role_grants where email = lower(_email) and claimed_at is null;
  if not found then return; end if;
  insert into public.user_roles (user_id, role) values (_user_id, g.role) on conflict do nothing;
  update public.profiles set account_status = 'active' where id = _user_id;
  update public.staff_role_grants set claimed_at = now() where email = g.email;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (_user_id, 'role.granted', 'user', _user_id, jsonb_build_object('role', g.role, 'via', 'staff_role_grants'));
end $$;
revoke execute on function public.apply_staff_grant(uuid, text) from public, anon, authenticated;

create or replace function public.handle_user_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    perform public.apply_staff_grant(new.id, new.email);
  end if;
  return new;
end $$;
revoke execute on function public.handle_user_confirmed() from public, anon, authenticated;
create trigger on_auth_user_confirmed_ins after insert on auth.users for each row execute function public.handle_user_confirmed();
create trigger on_auth_user_confirmed_upd after update of email_confirmed_at on auth.users for each row execute function public.handle_user_confirmed();

insert into public.staff_role_grants (email, role) values ('admin@nexatalent.com', 'super_admin');

alter table public.jobs add column is_demo boolean not null default false;
grant select (is_demo) on public.jobs to anon;

insert into public.jobs (slug, title, employer_display_name, department, description, location, country, employment_type, work_arrangement, salary_text, closing_date, status, source, created_by, is_demo) values
('senior-financial-analyst-dubai','Senior Financial Analyst','Meridian Capital Group','Finance','Lead monthly forecasting, variance analysis and investment reporting for a regional portfolio. You will partner with senior leadership on capital allocation decisions.','Dubai','United Arab Emirates','Full-time','Hybrid','AED 28,000 – 34,000 / month','2026-12-12','published','internal','00000000-0000-0000-0000-000000000000',true),
('clinical-operations-manager-toronto','Clinical Operations Manager','Northbridge Health','Healthcare','Oversee day-to-day clinical operations across two outpatient sites, improving patient flow, staffing and compliance.','Toronto','Canada','Full-time','On-site','CAD 118,000 – 132,000 / year','2026-12-05','published','internal','00000000-0000-0000-0000-000000000000',true),
('product-designer-lisbon','Product Designer','Atlas Mobility','Design','Design end-to-end experiences for a mobility platform used across Europe, from research through to polished interface.','Lisbon','Portugal','Full-time','Remote',null,'2026-12-20','published','internal','00000000-0000-0000-0000-000000000000',true),
('supply-chain-lead-singapore','Regional Supply Chain Lead','Kestrel Logistics','Operations','Own supply chain planning for South-East Asia, managing supplier relationships and a team of four planners.','Singapore','Singapore','Full-time','Hybrid','SGD 9,500 – 11,000 / month','2026-11-30','published','internal','00000000-0000-0000-0000-000000000000',true),
('data-engineer-london','Data Engineer','Halden & Shore','Technology','Build and maintain data pipelines and warehouse models supporting analytics and reporting for a professional services firm.','London','United Kingdom','Contract','Remote','£550 – 620 / day','2026-12-08','published','internal','00000000-0000-0000-0000-000000000000',true),
('hr-business-partner-nairobi','HR Business Partner','Savanna Telecom','People','Partner with business leaders on workforce planning, performance and employee relations across East Africa.','Nairobi','Kenya','Full-time','On-site',null,'2026-12-15','published','internal','00000000-0000-0000-0000-000000000000',true);