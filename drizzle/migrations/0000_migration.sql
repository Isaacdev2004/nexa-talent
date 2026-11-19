-- Roles
create type public.app_role as enum ('candidate','employer','recruiter','specialist','recruitment_officer','admin','super_admin');
create type public.account_status as enum ('active','pending_review','suspended');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  email text,
  phone text check (char_length(phone) <= 40),
  country text check (char_length(country) <= 80),
  city text check (char_length(city) <= 80),
  timezone text,
  avatar_url text,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('recruitment_officer','admin','super_admin'))
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "Admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

create policy "Users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Staff read profiles" on public.profiles for select to authenticated using (public.is_staff(auth.uid()));
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Prevent users changing their own account_status
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.account_status is distinct from old.account_status and not public.is_staff(auth.uid()) and auth.uid() is not null then
    new.account_status := old.account_status;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile_fields();

-- Candidates
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  current_position text check (char_length(current_position) <= 150),
  industry text check (char_length(industry) <= 100),
  years_experience int check (years_experience between 0 and 70),
  summary text check (char_length(summary) <= 4000),
  skills text[] not null default '{}',
  preferred_titles text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  employment_types text[] not null default '{}',
  work_arrangement text check (work_arrangement in ('On-site','Hybrid','Remote','Any')),
  expected_salary text check (char_length(expected_salary) <= 80),
  onboarding_step int not null default 1 check (onboarding_step between 1 and 6),
  profile_visibility text not null default 'recruiters' check (profile_visibility in ('private','recruiters')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update on public.candidates to authenticated;
grant all on public.candidates to service_role;
alter table public.candidates enable row level security;
create policy "Candidate reads own" on public.candidates for select to authenticated using (user_id = auth.uid());
create policy "Candidate inserts own" on public.candidates for insert to authenticated with check (user_id = auth.uid());
create policy "Candidate updates own" on public.candidates for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Staff read candidates" on public.candidates for select to authenticated using (public.is_staff(auth.uid()));

-- Companies
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  website text,
  industry text,
  country text,
  description text check (char_length(description) <= 4000),
  owner_id uuid not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update on public.companies to authenticated;
grant select (id, name, website, industry, country, description, verified) on public.companies to anon;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create policy "Public reads verified companies" on public.companies for select to anon, authenticated using (verified and deleted_at is null);
create policy "Owner reads own company" on public.companies for select to authenticated using (owner_id = auth.uid());
create policy "Employer creates company" on public.companies for insert to authenticated with check (owner_id = auth.uid() and public.has_role(auth.uid(),'employer'));
create policy "Owner updates company" on public.companies for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Staff manage companies" on public.companies for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create or replace function public.protect_company_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) and auth.uid() is not null then
    if tg_op = 'INSERT' then new.verified := false;
    elsif new.verified is distinct from old.verified then new.verified := old.verified; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger companies_protect before insert or update on public.companies for each row execute function public.protect_company_verified();

-- Jobs
create type public.job_status as enum ('draft','pending_approval','published','closed','archived');
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,120}$'),
  title text not null check (char_length(title) between 2 and 160),
  company_id uuid references public.companies(id),
  employer_display_name text not null check (char_length(employer_display_name) <= 160),
  department text,
  description text not null default '',
  location text not null,
  country text not null,
  employment_type text not null check (employment_type in ('Full-time','Part-time','Contract','Temporary','Internship')),
  work_arrangement text not null check (work_arrangement in ('On-site','Hybrid','Remote')),
  salary_text text,
  currency text,
  closing_date date,
  status public.job_status not null default 'draft',
  source text check (source in ('internal','employer','recruiter','partner')) default 'internal',
  created_by uuid not null,
  published_at timestamptz, -- internal only; never granted to anon
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index jobs_status_idx on public.jobs(status) where deleted_at is null;
create index jobs_country_idx on public.jobs(country);
grant select, insert, update on public.jobs to authenticated;
grant select (id, slug, title, company_id, employer_display_name, department, description, location, country, employment_type, work_arrangement, salary_text, currency, closing_date, status) on public.jobs to anon;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
create policy "Public reads published jobs" on public.jobs for select to anon, authenticated using (status = 'published' and deleted_at is null);
create policy "Creator reads own jobs" on public.jobs for select to authenticated using (created_by = auth.uid());
create policy "Staff manage jobs" on public.jobs for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Employer drafts jobs" on public.jobs for insert to authenticated with check (created_by = auth.uid() and public.has_role(auth.uid(),'employer') and status in ('draft','pending_approval'));
create policy "Employer edits own unpublished" on public.jobs for update to authenticated using (created_by = auth.uid() and status in ('draft','pending_approval')) with check (created_by = auth.uid() and status in ('draft','pending_approval'));

create or replace function public.jobs_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then new.published_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;
create trigger jobs_touch before insert or update on public.jobs for each row execute function public.jobs_touch();

-- Audit log
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "Admins read audit" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

-- Consent records
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  consent_type text not null check (consent_type in ('terms','privacy','marketing','profile_sharing')),
  version text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.consent_records to authenticated;
grant all on public.consent_records to service_role;
alter table public.consent_records enable row level security;
create policy "Own consents read" on public.consent_records for select to authenticated using (user_id = auth.uid());
create policy "Own consents insert" on public.consent_records for insert to authenticated with check (user_id = auth.uid());

-- Signup handler: only self-service roles can be chosen
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := coalesce(new.raw_user_meta_data->>'account_type', 'candidate');
  chosen public.app_role;
begin
  if requested not in ('candidate','employer','recruiter','specialist') then requested := 'candidate'; end if;
  chosen := requested::public.app_role;
  insert into public.profiles (id, full_name, email, account_status)
  values (new.id,
          left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 120),
          new.email,
          case when chosen in ('recruiter','specialist') then 'pending_review'::public.account_status else 'active'::public.account_status end);
  insert into public.user_roles (user_id, role) values (new.id, chosen);
  if chosen = 'candidate' then insert into public.candidates (user_id) values (new.id); end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (new.id, 'account.created', 'user', new.id, jsonb_build_object('account_type', requested));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();