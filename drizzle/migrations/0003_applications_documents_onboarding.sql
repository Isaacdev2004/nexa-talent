alter table public.candidates
  add column education jsonb not null default '[]',
  add column certifications text[] not null default '{}',
  add column employment_history jsonb not null default '[]';

-- Documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  kind text not null check (kind in ('resume','cover_letter','supporting')),
  file_name text not null check (char_length(file_name) <= 200),
  storage_path text not null unique,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 10485760),
  mime_type text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index documents_owner_idx on public.documents(owner_id) where deleted_at is null;
grant select, insert, update on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "Owner reads documents" on public.documents for select to authenticated using (owner_id = auth.uid());
create policy "Owner adds documents" on public.documents for insert to authenticated with check (owner_id = auth.uid() and storage_path like auth.uid()::text || '/%');
create policy "Owner soft-deletes documents" on public.documents for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Staff read documents" on public.documents for select to authenticated using (public.is_staff(auth.uid()));

create or replace function public.documents_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  -- only deleted_at may change: submitted applications rely on the original file
  if new.storage_path <> old.storage_path or new.file_name <> old.file_name or new.owner_id <> old.owner_id or new.kind <> old.kind then
    raise exception 'Documents cannot be edited; upload a new version instead';
  end if;
  return new;
end $$;
create trigger documents_immutable before update on public.documents for each row execute function public.documents_immutable();

-- Applications
create type public.application_status as enum ('submitted','under_review','shortlisted','interview_scheduled','interviewed','offered','hired','rejected','withdrawn');

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  candidate_user_id uuid not null,
  status public.application_status not null default 'submitted',
  cover_letter text check (char_length(cover_letter) <= 8000),
  answers jsonb not null default '{}',
  confirmations jsonb not null default '{}',
  profile_snapshot jsonb not null,
  job_snapshot jsonb not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_user_id)
);
create index job_applications_candidate_idx on public.job_applications(candidate_user_id);
create index job_applications_job_idx on public.job_applications(job_id, status);
grant select, update on public.job_applications to authenticated;
grant all on public.job_applications to service_role;
alter table public.job_applications enable row level security;
create policy "Candidate reads own applications" on public.job_applications for select to authenticated using (candidate_user_id = auth.uid());
create policy "Candidate withdraws" on public.job_applications for update to authenticated using (candidate_user_id = auth.uid()) with check (candidate_user_id = auth.uid() and status = 'withdrawn');
create policy "Staff read applications" on public.job_applications for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff update applications" on public.job_applications for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  document_id uuid not null references public.documents(id),
  kind text not null,
  file_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
grant select on public.application_documents to authenticated;
grant all on public.application_documents to service_role;
alter table public.application_documents enable row level security;
create policy "Candidate reads own app docs" on public.application_documents for select to authenticated using (exists (select 1 from public.job_applications a where a.id = application_id and a.candidate_user_id = auth.uid()));
create policy "Staff read app docs" on public.application_documents for select to authenticated using (public.is_staff(auth.uid()));

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  status public.application_status not null,
  note text,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index application_events_app_idx on public.application_events(application_id, created_at);
grant select on public.application_events to authenticated;
grant all on public.application_events to service_role;
alter table public.application_events enable row level security;
create policy "Candidate reads own events" on public.application_events for select to authenticated using (exists (select 1 from public.job_applications a where a.id = application_id and a.candidate_user_id = auth.uid()));
create policy "Staff read events" on public.application_events for select to authenticated using (public.is_staff(auth.uid()));

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Own notifications read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Own notifications mark read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Status trigger: timeline, candidate-only-withdraw guard, notifications
create or replace function public.application_status_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if not public.is_staff(auth.uid()) and auth.uid() is not null then
      -- candidates may only change status to withdrawn; everything else is frozen
      if new.status <> 'withdrawn' or old.status in ('withdrawn','hired','rejected') then raise exception 'Not allowed'; end if;
      new.cover_letter := old.cover_letter; new.answers := old.answers; new.confirmations := old.confirmations;
      new.profile_snapshot := old.profile_snapshot; new.job_snapshot := old.job_snapshot; new.job_id := old.job_id; new.submitted_at := old.submitted_at;
    end if;
    new.updated_at := now();
    if new.status is distinct from old.status then
      insert into public.application_events (application_id, status, actor_id) values (new.id, new.status, auth.uid());
      if auth.uid() is distinct from new.candidate_user_id then
        insert into public.notifications (user_id, title, body, link)
        values (new.candidate_user_id, 'Application update', 'Your application for ' || (new.job_snapshot->>'title') || ' is now ' || replace(new.status::text, '_', ' ') || '.', '/applications/' || new.id);
      end if;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.application_status_changed() from public, anon, authenticated;
create trigger job_applications_status before update on public.job_applications for each row execute function public.application_status_changed();

-- Atomic submission
create or replace function public.submit_application(
  _job_slug text, _resume_id uuid, _cover_letter text, _supporting_ids uuid[], _answers jsonb, _confirmations jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  j public.jobs;
  app_id uuid;
  prof jsonb;
  doc_ids uuid[];
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if not public.has_role(uid, 'candidate') then raise exception 'Only candidate accounts can apply'; end if;
  select * into j from public.jobs where slug = _job_slug and status = 'published' and deleted_at is null;
  if not found then raise exception 'This opportunity is not open for applications'; end if;
  if j.closing_date is not null and j.closing_date < current_date then raise exception 'Applications for this role have closed'; end if;
  if coalesce((_confirmations->>'accurate')::boolean, false) is not true or coalesce((_confirmations->>'consent')::boolean, false) is not true then
    raise exception 'Please confirm the required statements';
  end if;
  if _cover_letter is not null and char_length(_cover_letter) > 8000 then raise exception 'Cover letter is too long'; end if;
  if exists (select 1 from public.job_applications where job_id = j.id and candidate_user_id = uid) then
    raise exception 'You have already applied for this role';
  end if;

  doc_ids := array_remove(array_prepend(_resume_id, coalesce(_supporting_ids, '{}')), null);
  if _resume_id is null then raise exception 'Please attach a resume'; end if;
  if (select count(*) from public.documents where id = any(doc_ids) and owner_id = uid and deleted_at is null) <> cardinality(doc_ids) then
    raise exception 'One of the selected documents is unavailable';
  end if;

  select jsonb_build_object(
    'full_name', p.full_name, 'email', p.email, 'phone', p.phone, 'country', p.country, 'city', p.city,
    'current_position', c.current_position, 'industry', c.industry, 'years_experience', c.years_experience,
    'summary', c.summary, 'skills', c.skills, 'education', c.education, 'certifications', c.certifications,
    'employment_history', c.employment_history)
  into prof from public.profiles p left join public.candidates c on c.user_id = p.id where p.id = uid;

  insert into public.job_applications (job_id, candidate_user_id, cover_letter, answers, confirmations, profile_snapshot, job_snapshot)
  values (j.id, uid, nullif(trim(_cover_letter), ''), coalesce(_answers, '{}'), _confirmations, prof,
          jsonb_build_object('slug', j.slug, 'title', j.title, 'employer', j.employer_display_name, 'location', j.location, 'country', j.country))
  returning id into app_id;

  insert into public.application_documents (application_id, document_id, kind, file_name, storage_path)
  select app_id, d.id, case when d.id = _resume_id then 'resume' else d.kind end, d.file_name, d.storage_path
  from public.documents d where d.id = any(doc_ids);

  insert into public.application_events (application_id, status, actor_id) values (app_id, 'submitted', uid);

  insert into public.notifications (user_id, title, body, link)
  values (uid, 'Application received', 'We''ve received your application for ' || j.title || ' at ' || j.employer_display_name || '.', '/applications/' || app_id);
  insert into public.notifications (user_id, title, body, link)
  select distinct r.user_id, 'New application', coalesce(prof->>'full_name', 'A candidate') || ' applied for ' || j.title || '.', null
  from public.user_roles r where r.role in ('recruitment_officer','admin','super_admin');

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (uid, 'application.submitted', 'job_application', app_id, jsonb_build_object('job_id', j.id));
  return app_id;
end $$;
revoke execute on function public.submit_application(text, uuid, text, uuid[], jsonb, jsonb) from public, anon;
grant execute on function public.submit_application(text, uuid, text, uuid[], jsonb, jsonb) to authenticated;

-- Storage policies for private candidate documents bucket
create policy "Owner uploads candidate docs" on storage.objects for insert to authenticated
  with check (bucket_id = 'candidate-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner reads candidate docs" on storage.objects for select to authenticated
  using (bucket_id = 'candidate-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Staff read candidate docs" on storage.objects for select to authenticated
  using (bucket_id = 'candidate-documents' and public.is_staff(auth.uid()));