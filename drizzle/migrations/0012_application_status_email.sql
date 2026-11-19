-- Clear, factual notice when an application moves to a new stage.
-- The existing email queue copies this notice to the candidate's address.
create or replace function public.application_status_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  role_title text;
  employer_name text;
  phrase text;
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
        role_title := coalesce(nullif(new.job_snapshot->>'title', ''), 'this role');
        employer_name := coalesce(new.job_snapshot->>'employer', '');
        phrase := case new.status
          when 'under_review' then 'is under review'
          when 'shortlisted' then 'has been shortlisted'
          when 'interview_scheduled' then 'has an interview being arranged'
          when 'interviewed' then 'has been updated after interview'
          when 'offered' then 'has reached the offer stage'
          when 'hired' then 'has been marked as hired'
          when 'rejected' then 'was not progressed'
          when 'withdrawn' then 'has been withdrawn'
          else 'has been updated'
        end;
        insert into public.notifications (user_id, title, body, link)
        values (
          new.candidate_user_id,
          'Application update',
          'Your application for ' || role_title || case when employer_name <> '' then ' at ' || employer_name else '' end || ' ' || phrase || '.',
          '/applications/' || new.id
        );
      end if;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.application_status_changed() from public, anon, authenticated;
