create table public.contact_enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('general','employer')),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 255),
  company text check (char_length(company) <= 160),
  message text not null check (char_length(message) between 10 and 4000),
  status text not null default 'new' check (status in ('new','in_progress','closed')),
  created_at timestamptz not null default now()
);
grant insert on public.contact_enquiries to anon, authenticated;
grant select, update on public.contact_enquiries to authenticated;
grant all on public.contact_enquiries to service_role;
alter table public.contact_enquiries enable row level security;
create policy "Anyone sends enquiry" on public.contact_enquiries for insert to anon, authenticated with check (status = 'new');
create policy "Staff read enquiries" on public.contact_enquiries for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff update enquiries" on public.contact_enquiries for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.outreach_records (
  id uuid primary key default gen_random_uuid(),
  candidate_name text not null check (char_length(candidate_name) between 2 and 120),
  candidate_email text check (char_length(candidate_email) <= 255),
  candidate_user_id uuid,
  channel text not null check (channel in ('email','phone','linkedin','referral','event','other')),
  job_id uuid references public.jobs(id),
  outcome text not null default 'contacted' check (outcome in ('contacted','no_response','interested','not_interested','follow_up')),
  notes text check (char_length(notes) <= 4000),
  follow_up_on date,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outreach_created_idx on public.outreach_records(created_at desc);
grant select, insert, update on public.outreach_records to authenticated;
grant all on public.outreach_records to service_role;
alter table public.outreach_records enable row level security;
create policy "Staff manage outreach" on public.outreach_records for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()) and created_by = auth.uid());

create table public.candidate_opportunities (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  candidate_email text not null check (candidate_email = lower(candidate_email)),
  candidate_user_id uuid,
  shared_description text not null check (char_length(shared_description) between 10 and 20000),
  staff_note text check (char_length(staff_note) <= 2000),
  status text not null default 'shared' check (status in ('shared','interested','declined','link_sent','applied')),
  candidate_response text check (char_length(candidate_response) <= 2000),
  shared_by uuid not null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_email)
);
grant select, insert, update on public.candidate_opportunities to authenticated;
grant all on public.candidate_opportunities to service_role;
alter table public.candidate_opportunities enable row level security;
create policy "Staff manage opportunities" on public.candidate_opportunities for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Candidate reads own opportunities" on public.candidate_opportunities for select to authenticated
  using (candidate_user_id = auth.uid() or candidate_email = lower(coalesce(auth.jwt()->>'email', '')));

create or replace function public.respond_to_opportunity(_id uuid, _interested boolean, _message text)
returns void language plpgsql security definer set search_path = public as $$
declare o public.candidate_opportunities; jt text;
begin
  select * into o from public.candidate_opportunities where id = _id
    and (candidate_user_id = auth.uid() or candidate_email = lower(coalesce(auth.jwt()->>'email', '')));
  if not found then raise exception 'Opportunity not found'; end if;
  if o.status not in ('shared','interested','declined') then raise exception 'This opportunity has moved on'; end if;
  update public.candidate_opportunities set status = case when _interested then 'interested' else 'declined' end,
    candidate_response = left(nullif(trim(_message), ''), 2000), candidate_user_id = auth.uid(), responded_at = now(), updated_at = now()
  where id = _id;
  select title into jt from public.jobs where id = o.job_id;
  insert into public.notifications (user_id, title, body, link)
  values (o.shared_by, case when _interested then 'Candidate is interested' else 'Candidate declined' end, o.candidate_email || ' responded about ' || jt || '.', '/staff/opportunities');
end $$;
revoke execute on function public.respond_to_opportunity(uuid, boolean, text) from public, anon;
grant execute on function public.respond_to_opportunity(uuid, boolean, text) to authenticated;

create or replace function public.opportunity_shared_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid; jt text;
begin
  select id into uid from public.profiles where lower(email) = new.candidate_email limit 1;
  if uid is not null then
    new.candidate_user_id := coalesce(new.candidate_user_id, uid);
    select title into jt from public.jobs where id = new.job_id;
    insert into public.notifications (user_id, title, body, link) values (uid, 'New opportunity shared with you', 'Our recruitment team shared the role ' || jt || ' with you.', '/opportunities');
  end if;
  return new;
end $$;
revoke execute on function public.opportunity_shared_notify() from public, anon, authenticated;
create trigger opportunity_shared before insert on public.candidate_opportunities for each row execute function public.opportunity_shared_notify();