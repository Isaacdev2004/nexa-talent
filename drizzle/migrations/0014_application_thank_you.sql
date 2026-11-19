-- Thank-you notice when a candidate submits an application.
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
  values (
    uid,
    'Thank you for applying',
    'Thank you for applying for ' || j.title || ' at ' || j.employer_display_name || '.' || E'\n\n' ||
    'We have received your application. Our recruitment team will review it, and we will email you each time the status changes. You can follow it from your account.',
    '/applications/' || app_id
  );
  insert into public.notifications (user_id, title, body, link)
  select distinct r.user_id, 'New application', coalesce(prof->>'full_name', 'A candidate') || ' applied for ' || j.title || '.', null
  from public.user_roles r where r.role in ('recruitment_officer','admin','super_admin');

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (uid, 'application.submitted', 'job_application', app_id, jsonb_build_object('job_id', j.id));
  return app_id;
end $$;
revoke execute on function public.submit_application(text, uuid, text, uuid[], jsonb, jsonb) from public, anon;
grant execute on function public.submit_application(text, uuid, text, uuid[], jsonb, jsonb) to authenticated;
