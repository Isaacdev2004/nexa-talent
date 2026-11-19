create or replace function public.is_active_employer(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'employer') and exists (select 1 from public.profiles p where p.id = _user_id and p.account_status = 'active' and p.deleted_at is null)
$$;
create or replace function public.owns_company(_user_id uuid, _company_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies c where c.id = _company_id and c.owner_id = _user_id and c.deleted_at is null)
$$;
create or replace function public.employer_owns_job(_user_id uuid, _job_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_employer(_user_id) and exists (
    select 1 from public.jobs j join public.companies c on c.id = j.company_id
    where j.id = _job_id and c.owner_id = _user_id and c.deleted_at is null and j.deleted_at is null)
$$;
revoke execute on function public.is_active_employer(uuid), public.owns_company(uuid, uuid), public.employer_owns_job(uuid, uuid) from public, anon;
grant execute on function public.is_active_employer(uuid), public.owns_company(uuid, uuid), public.employer_owns_job(uuid, uuid) to authenticated;

drop policy if exists "Employer drafts jobs" on public.jobs;
drop policy if exists "Employer edits own unpublished" on public.jobs;
create policy "Employer drafts jobs" on public.jobs for insert to authenticated
  with check (created_by = auth.uid() and public.is_active_employer(auth.uid()) and public.owns_company(auth.uid(), company_id) and status in ('draft','pending_approval') and source = 'employer' and is_demo = false);
create policy "Employer edits own unpublished" on public.jobs for update to authenticated
  using (public.employer_owns_job(auth.uid(), id) and status in ('draft','pending_approval'))
  with check (public.owns_company(auth.uid(), company_id) and status in ('draft','pending_approval','archived'));
create policy "Employer reads company jobs" on public.jobs for select to authenticated
  using (public.employer_owns_job(auth.uid(), id));

create or replace function public.employer_set_job_status(_job_id uuid, _status job_status) returns void
language plpgsql security definer set search_path = public as $$
declare cur job_status;
begin
  if not public.employer_owns_job(auth.uid(), _job_id) then raise exception 'Not allowed'; end if;
  select status into cur from public.jobs where id = _job_id;
  if not ((cur = 'published' and _status = 'closed') or (cur = 'closed' and _status in ('pending_approval','archived')) or (cur in ('draft','pending_approval') and _status in ('draft','pending_approval','archived'))) then
    raise exception 'This change is not allowed';
  end if;
  update public.jobs set status = _status where id = _job_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details) values (auth.uid(), 'employer_job_status', 'job', _job_id, jsonb_build_object('from', cur, 'to', _status));
end $$;
revoke execute on function public.employer_set_job_status(uuid, job_status) from public, anon;
grant execute on function public.employer_set_job_status(uuid, job_status) to authenticated;

create policy "Employer reads applicants" on public.job_applications for select to authenticated
  using (public.employer_owns_job(auth.uid(), job_id));
create policy "Employer reads applicant docs" on public.application_documents for select to authenticated
  using (exists (select 1 from public.job_applications a where a.id = application_id and public.employer_owns_job(auth.uid(), a.job_id)));
create policy "Employer reads applicant events" on public.application_events for select to authenticated
  using (exists (select 1 from public.job_applications a where a.id = application_id and public.employer_owns_job(auth.uid(), a.job_id)));
create policy "Employer reads applicant files" on storage.objects for select to authenticated
  using (bucket_id = 'candidate-documents' and exists (
    select 1 from public.application_documents d join public.job_applications a on a.id = d.application_id
    where d.storage_path = storage.objects.name and public.employer_owns_job(auth.uid(), a.job_id)));

create or replace function public.application_status_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if auth.uid() is not null and not public.is_staff(auth.uid()) then
      if public.employer_owns_job(auth.uid(), old.job_id) and auth.uid() <> old.candidate_user_id then
        if new.status = 'withdrawn' or old.status in ('withdrawn','hired') then raise exception 'Not allowed'; end if;
      elsif new.status <> 'withdrawn' or old.status in ('withdrawn','hired','rejected') then
        raise exception 'Not allowed';
      end if;
      new.cover_letter := old.cover_letter; new.answers := old.answers; new.confirmations := old.confirmations;
      new.profile_snapshot := old.profile_snapshot; new.job_snapshot := old.job_snapshot; new.job_id := old.job_id; new.submitted_at := old.submitted_at; new.candidate_user_id := old.candidate_user_id;
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

create or replace function public.employer_set_application_status(_id uuid, _status application_status) returns void
language plpgsql security definer set search_path = public as $$
declare a public.job_applications;
begin
  select * into a from public.job_applications where id = _id;
  if a.id is null or not public.employer_owns_job(auth.uid(), a.job_id) then raise exception 'Not allowed'; end if;
  if _status = 'withdrawn' then raise exception 'Only candidates can withdraw'; end if;
  update public.job_applications set status = _status where id = _id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details) values (auth.uid(), 'employer_application_status', 'application', _id, jsonb_build_object('from', a.status, 'to', _status));
end $$;
revoke execute on function public.employer_set_application_status(uuid, application_status) from public, anon;
grant execute on function public.employer_set_application_status(uuid, application_status) to authenticated;