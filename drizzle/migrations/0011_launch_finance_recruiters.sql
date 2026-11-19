-- Archive sample vacancies so they are no longer public.
update public.jobs
set status = 'archived', updated_at = now()
where is_demo = true and status = 'published';

alter table public.jobs add column if not exists listing_paid_at timestamptz;

create or replace function public.protect_job_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and coalesce(new.is_demo, false) then
    raise exception 'Demo listings cannot be published';
  end if;
  if new.status = 'published' and new.source = 'employer' and new.listing_paid_at is null then
    raise exception 'Listing fee has not been paid';
  end if;
  return new;
end $$;

drop trigger if exists jobs_protect_publish on public.jobs;
create trigger jobs_protect_publish before update on public.jobs
for each row execute function public.protect_job_publish();

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  to_email text not null,
  subject text not null,
  body text not null,
  link text,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.email_outbox enable row level security;
drop policy if exists "Staff read email outbox" on public.email_outbox;
create policy "Staff read email outbox" on public.email_outbox for select to authenticated using (public.is_staff(auth.uid()));
grant select on public.email_outbox to authenticated;
grant all on public.email_outbox to service_role;

create or replace function public.queue_email_for_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare em text;
begin
  select email into em from public.profiles where id = new.user_id;
  if em is not null and length(trim(em)) > 0 then
    insert into public.email_outbox (user_id, to_email, subject, body, link)
    values (new.user_id, em, new.title, coalesce(new.body, ''), new.link);
  end if;
  return new;
end $$;

drop trigger if exists notifications_queue_email on public.notifications;
create trigger notifications_queue_email after insert on public.notifications
for each row execute function public.queue_email_for_notification();

create table if not exists public.recruiter_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  recruiter_user_id uuid not null,
  status text not null default 'offered' check (status in ('offered','accepted','declined','completed')),
  commission_bps integer not null default 1500 check (commission_bps between 0 and 5000),
  terms text not null default '' check (char_length(terms) <= 4000),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (job_id, recruiter_user_id)
);
alter table public.recruiter_assignments enable row level security;
drop policy if exists "Recruiter or staff reads assignments" on public.recruiter_assignments;
create policy "Recruiter or staff reads assignments" on public.recruiter_assignments for select to authenticated
  using (recruiter_user_id = auth.uid() or public.is_staff(auth.uid()));
grant select on public.recruiter_assignments to authenticated;
drop policy if exists "Recruiter reads assigned jobs" on public.jobs;
create policy "Recruiter reads assigned jobs" on public.jobs for select to authenticated
  using (exists (
    select 1 from public.recruiter_assignments a
    where a.job_id = id and a.recruiter_user_id = auth.uid()
  ));
grant all on public.recruiter_assignments to service_role;

create table if not exists public.recruiter_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.recruiter_assignments(id),
  candidate_name text not null check (char_length(candidate_name) between 2 and 120),
  candidate_email text not null check (char_length(candidate_email) between 3 and 255),
  consent boolean not null,
  note text not null default '' check (char_length(note) <= 4000),
  status text not null default 'submitted' check (status in ('submitted','reviewing','rejected','placed')),
  placement_cents integer,
  currency text not null default 'usd',
  created_at timestamptz not null default now()
);
alter table public.recruiter_submissions enable row level security;
drop policy if exists "Recruiter or staff reads submissions" on public.recruiter_submissions;
create policy "Recruiter or staff reads submissions" on public.recruiter_submissions for select to authenticated
  using (
    public.is_staff(auth.uid())
    or exists (
      select 1 from public.recruiter_assignments a
      where a.id = assignment_id and a.recruiter_user_id = auth.uid()
    )
  );
grant select on public.recruiter_submissions to authenticated;
grant all on public.recruiter_submissions to service_role;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('listing','service')),
  job_id uuid references public.jobs(id),
  order_id uuid,
  payer_user_id uuid not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null,
  status text not null default 'pending' check (status in ('pending','paid','refunded','failed')),
  stripe_session_id text unique,
  stripe_payment_intent text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.payments enable row level security;
drop policy if exists "Payer or staff reads payments" on public.payments;
create policy "Payer or staff reads payments" on public.payments for select to authenticated
  using (payer_user_id = auth.uid() or public.is_staff(auth.uid()));
grant select on public.payments to authenticated;
grant all on public.payments to service_role;

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  payee_user_id uuid not null,
  source text not null check (source in ('placement','service')),
  source_id uuid not null,
  basis_cents integer not null,
  rate_bps integer not null,
  amount_cents integer not null,
  currency text not null,
  status text not null default 'accrued' check (status in ('accrued','payable','paid','reversed')),
  created_at timestamptz not null default now(),
  unique (source, source_id, payee_user_id)
);
alter table public.commissions enable row level security;
drop policy if exists "Payee or staff reads commissions" on public.commissions;
create policy "Payee or staff reads commissions" on public.commissions for select to authenticated
  using (payee_user_id = auth.uid() or public.is_staff(auth.uid()));
grant select on public.commissions to authenticated;
grant all on public.commissions to service_role;

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  payee_user_id uuid not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null,
  status text not null default 'scheduled' check (status in ('scheduled','paid')),
  reference text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.payouts enable row level security;
drop policy if exists "Payee or staff reads payouts" on public.payouts;
create policy "Payee or staff reads payouts" on public.payouts for select to authenticated
  using (payee_user_id = auth.uid() or public.is_staff(auth.uid()));
grant select on public.payouts to authenticated;
grant all on public.payouts to service_role;

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id),
  order_id uuid,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null,
  reason text not null check (char_length(reason) between 8 and 2000),
  status text not null default 'requested' check (status in ('requested','approved','rejected','refunded')),
  stripe_refund_id text,
  opened_by uuid not null,
  resolved_by uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.refund_requests enable row level security;
drop policy if exists "Opener or staff reads refunds" on public.refund_requests;
create policy "Opener or staff reads refunds" on public.refund_requests for select to authenticated
  using (opened_by = auth.uid() or public.is_staff(auth.uid()));
grant select on public.refund_requests to authenticated;
grant all on public.refund_requests to service_role;

create or replace function public.list_recruiters()
returns table (user_id uuid, full_name text, email text, account_status text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not allowed'; end if;
  return query
    select p.id, p.full_name, p.email, p.account_status::text
    from public.profiles p
    join public.user_roles r on r.user_id = p.id and r.role = 'recruiter'
    where p.deleted_at is null
    order by p.full_name;
end $$;
revoke all on function public.list_recruiters() from public, anon;
grant execute on function public.list_recruiters() to authenticated;

create or replace function public.staff_offer_assignment(_job_id uuid, _recruiter_id uuid, _rate_bps integer, _terms text)
returns uuid language plpgsql security definer set search_path = public as $$
declare job public.jobs; result uuid; rate integer;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not allowed'; end if;
  select * into job from public.jobs where id = _job_id and deleted_at is null;
  if job.id is null or job.status not in ('pending_approval','published') then raise exception 'Job is not open for assignment'; end if;
  if not exists (select 1 from public.user_roles where user_id = _recruiter_id and role = 'recruiter') then raise exception 'Not a recruiter'; end if;
  if not exists (select 1 from public.profiles where id = _recruiter_id and account_status = 'active' and deleted_at is null) then raise exception 'Recruiter is not active'; end if;
  rate := least(greatest(coalesce(_rate_bps, 1500), 0), 5000);
  insert into public.recruiter_assignments (job_id, recruiter_user_id, commission_bps, terms, created_by)
  values (_job_id, _recruiter_id, rate, left(coalesce(_terms, ''), 4000), auth.uid())
  on conflict (job_id, recruiter_user_id) do update
    set status = 'offered', commission_bps = excluded.commission_bps, terms = excluded.terms, responded_at = null
  returning id into result;
  insert into public.notifications (user_id, title, body, link)
  values (_recruiter_id, 'New vacancy assignment', job.title, '/recruiter');
  return result;
end $$;
revoke all on function public.staff_offer_assignment(uuid, uuid, integer, text) from public, anon;
grant execute on function public.staff_offer_assignment(uuid, uuid, integer, text) to authenticated;

create or replace function public.recruiter_respond_assignment(_id uuid, _accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare a public.recruiter_assignments;
begin
  select * into a from public.recruiter_assignments where id = _id and recruiter_user_id = auth.uid();
  if a.id is null or a.status <> 'offered' then raise exception 'No open assignment'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and account_status = 'active') then raise exception 'Account is not active'; end if;
  update public.recruiter_assignments
  set status = case when _accept then 'accepted' else 'declined' end, responded_at = now()
  where id = a.id;
end $$;
revoke all on function public.recruiter_respond_assignment(uuid, boolean) from public, anon;
grant execute on function public.recruiter_respond_assignment(uuid, boolean) to authenticated;

create or replace function public.recruiter_submit_candidate(_assignment_id uuid, _name text, _email text, _note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare a public.recruiter_assignments; result uuid;
begin
  select * into a from public.recruiter_assignments where id = _assignment_id and recruiter_user_id = auth.uid() and status = 'accepted';
  if a.id is null then raise exception 'Accepted assignment required'; end if;
  if _name is null or char_length(trim(_name)) < 2 or _email is null or position('@' in _email) < 2 then raise exception 'Name and email are required'; end if;
  insert into public.recruiter_submissions (assignment_id, candidate_name, candidate_email, consent, note)
  values (a.id, left(trim(_name), 120), lower(trim(_email)), true, left(coalesce(_note, ''), 4000))
  returning id into result;
  insert into public.notifications (user_id, title, body, link)
  select a.created_by, 'Recruiter submitted a candidate', left(trim(_name), 120), '/staff/recruiters'
  where a.created_by is not null;
  return result;
end $$;
revoke all on function public.recruiter_submit_candidate(uuid, text, text, text) from public, anon;
grant execute on function public.recruiter_submit_candidate(uuid, text, text, text) to authenticated;

create or replace function public.staff_set_submission_status(_id uuid, _status text, _placement_cents integer, _currency text)
returns void language plpgsql security definer set search_path = public as $$
declare s public.recruiter_submissions; a public.recruiter_assignments; basis integer; rate integer; cut integer;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not allowed'; end if;
  if _status not in ('reviewing','rejected','placed') then raise exception 'Invalid status'; end if;
  select * into s from public.recruiter_submissions where id = _id;
  if s.id is null then raise exception 'Submission not found'; end if;
  select * into a from public.recruiter_assignments where id = s.assignment_id;
  if _status = 'placed' then
    basis := coalesce(_placement_cents, 0);
    if basis <= 0 then raise exception 'Placement value is required'; end if;
    rate := a.commission_bps;
    cut := (basis * rate) / 10000;
    update public.recruiter_submissions set status = 'placed', placement_cents = basis, currency = lower(coalesce(_currency, 'usd')) where id = s.id;
    update public.recruiter_assignments set status = 'completed' where id = a.id;
    insert into public.commissions (payee_user_id, source, source_id, basis_cents, rate_bps, amount_cents, currency)
    values (a.recruiter_user_id, 'placement', s.id, basis, rate, cut, lower(coalesce(_currency, 'usd')))
    on conflict (source, source_id, payee_user_id) do nothing;
    insert into public.notifications (user_id, title, body, link)
    values (a.recruiter_user_id, 'Placement confirmed', 'A candidate you submitted was placed.', '/recruiter');
  else
    update public.recruiter_submissions set status = _status where id = s.id;
  end if;
end $$;
revoke all on function public.staff_set_submission_status(uuid, text, integer, text) from public, anon;
grant execute on function public.staff_set_submission_status(uuid, text, integer, text) to authenticated;

create or replace function public.apply_verified_payment(_payment_id uuid, _intent text, _amount_cents integer, _currency text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments; o public.service_orders; major numeric; cut integer;
begin
  select * into p from public.payments where id = _payment_id for update;
  if p.id is null then raise exception 'Payment not found'; end if;
  if p.status = 'paid' then return; end if;
  if p.amount_cents <> _amount_cents or lower(p.currency) <> lower(_currency) then raise exception 'Payment amount does not match'; end if;
  update public.payments set status = 'paid', stripe_payment_intent = _intent, paid_at = now() where id = p.id;
  if p.kind = 'listing' then
    update public.jobs
    set listing_paid_at = now(),
        status = case when status = 'draft' then 'pending_approval'::public.job_status else status end,
        updated_at = now()
    where id = p.job_id;
    insert into public.notifications (user_id, title, body, link)
    values (p.payer_user_id, 'Listing fee received', 'Your vacancy is with the recruitment team for approval.', '/employer/vacancies');
  elsif p.kind = 'service' then
    select * into o from public.service_orders where id = p.order_id;
    if o.id is null then raise exception 'Order not found'; end if;
    major := round((p.amount_cents::numeric / 100), 2);
    perform public.confirm_service_payment(o.id, coalesce(_intent, p.id::text), major, upper(p.currency));
    cut := (p.amount_cents * 8500) / 10000;
    insert into public.commissions (payee_user_id, source, source_id, basis_cents, rate_bps, amount_cents, currency)
    values (o.specialist_user_id, 'service', o.id, p.amount_cents, 8500, cut, lower(p.currency))
    on conflict (source, source_id, payee_user_id) do nothing;
    insert into public.notifications (user_id, title, body, link)
    values (o.specialist_user_id, 'Order paid', 'The candidate paid. You can start the work.', '/specialist-work');
    insert into public.notifications (user_id, title, body, link)
    values (o.candidate_user_id, 'Payment confirmed', 'Your specialist can start the agreed work.', '/my-services');
  end if;
end $$;
revoke all on function public.apply_verified_payment(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.apply_verified_payment(uuid, text, integer, text) to service_role;

create or replace function public.request_service_refund(_order_id uuid, _reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.service_orders; p public.payments; result uuid;
begin
  if _reason is null or char_length(trim(_reason)) < 8 then raise exception 'Describe the issue in a few words'; end if;
  select * into o from public.service_orders where id = _order_id;
  if o.id is null or auth.uid() not in (o.candidate_user_id, o.specialist_user_id) then raise exception 'Not allowed'; end if;
  if o.status in ('cancelled','completed') then raise exception 'This order can no longer be disputed'; end if;
  select * into p from public.payments where order_id = o.id and status = 'paid' order by paid_at desc limit 1;
  if p.id is null then raise exception 'No captured payment to refund'; end if;
  insert into public.refund_requests (payment_id, order_id, amount_cents, currency, reason, opened_by)
  values (p.id, o.id, p.amount_cents, p.currency, left(trim(_reason), 2000), auth.uid())
  returning id into result;
  if o.status <> 'disputed' then
    update public.service_orders set status = 'disputed', updated_at = now() where id = o.id;
  end if;
  insert into public.notifications (user_id, title, body, link)
  values (case when auth.uid() = o.candidate_user_id then o.specialist_user_id else o.candidate_user_id end, 'A refund was requested', left(trim(_reason), 180), case when auth.uid() = o.candidate_user_id then '/specialist-work' else '/my-services' end);
  return result;
end $$;
revoke all on function public.request_service_refund(uuid, text) from public, anon;
grant execute on function public.request_service_refund(uuid, text) to authenticated;

create or replace function public.staff_resolve_refund(_id uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not allowed'; end if;
  update public.refund_requests
  set status = case when _approve then 'approved' else 'rejected' end,
      resolved_by = auth.uid(),
      resolved_at = now()
  where id = _id and status = 'requested';
  if not found then raise exception 'Refund is not awaiting a decision'; end if;
end $$;
revoke all on function public.staff_resolve_refund(uuid, boolean) from public, anon;
grant execute on function public.staff_resolve_refund(uuid, boolean) to authenticated;

create or replace function public.mark_refund_settled(_id uuid, _stripe_refund_id text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.refund_requests;
begin
  select * into r from public.refund_requests where id = _id for update;
  if r.id is null or r.status not in ('approved','refunded') then raise exception 'Refund is not approved'; end if;
  if r.status = 'refunded' then return; end if;
  update public.refund_requests set status = 'refunded', stripe_refund_id = _stripe_refund_id, resolved_at = now() where id = r.id;
  update public.payments set status = 'refunded' where id = r.payment_id;
  update public.commissions set status = 'reversed' where source = 'service' and source_id = r.order_id and status in ('accrued','payable');
  if r.order_id is not null then
    update public.service_orders set status = 'cancelled', updated_at = now() where id = r.order_id and status = 'disputed';
  end if;
end $$;
revoke all on function public.mark_refund_settled(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_refund_settled(uuid, text) to service_role;

create or replace function public.staff_schedule_payout(_payee uuid, _currency text)
returns uuid language plpgsql security definer set search_path = public as $$
declare total integer; result uuid; cur text;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not allowed'; end if;
  cur := lower(coalesce(_currency, 'usd'));
  select coalesce(sum(amount_cents), 0) into total from public.commissions
  where payee_user_id = _payee and currency = cur and status = 'accrued';
  if total <= 0 then raise exception 'Nothing accrued for this payee'; end if;
  insert into public.payouts (payee_user_id, amount_cents, currency, created_by)
  values (_payee, total, cur, auth.uid())
  returning id into result;
  update public.commissions set status = 'payable'
  where payee_user_id = _payee and currency = cur and status = 'accrued';
  insert into public.notifications (user_id, title, body, link)
  values (_payee, 'Payout scheduled', 'A payout has been scheduled for your accrued earnings.', '/dashboard');
  return result;
end $$;
revoke all on function public.staff_schedule_payout(uuid, text) from public, anon;
grant execute on function public.staff_schedule_payout(uuid, text) to authenticated;

create or replace function public.staff_mark_payout_paid(_id uuid, _reference text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payouts;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not allowed'; end if;
  if _reference is null or length(trim(_reference)) < 2 then raise exception 'A payment reference is required'; end if;
  select * into p from public.payouts where id = _id and status = 'scheduled';
  if p.id is null then raise exception 'Payout is not scheduled'; end if;
  update public.payouts set status = 'paid', reference = left(trim(_reference), 120), paid_at = now() where id = p.id;
  update public.commissions set status = 'paid'
  where payee_user_id = p.payee_user_id and currency = p.currency and status = 'payable';
  insert into public.notifications (user_id, title, body, link)
  values (p.payee_user_id, 'Payout sent', 'Your payout was marked paid. Reference: ' || left(trim(_reference), 80), '/dashboard');
end $$;
revoke all on function public.staff_mark_payout_paid(uuid, text) from public, anon;
grant execute on function public.staff_mark_payout_paid(uuid, text) to authenticated;
