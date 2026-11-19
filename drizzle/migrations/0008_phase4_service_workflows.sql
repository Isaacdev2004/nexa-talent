CREATE TABLE public.specialist_referrals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES public.assessments(id), candidate_user_id uuid NOT NULL, specialist_user_id uuid NOT NULL REFERENCES public.specialist_profiles(user_id), candidate_name text NOT NULL, specialist_name text NOT NULL, service_name text NOT NULL, requirements text NOT NULL, status text NOT NULL DEFAULT 'awaiting_consent' CHECK(status IN ('awaiting_consent','consented','declined')), consented_at timestamptz, responded_at timestamptz, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(assessment_id,specialist_user_id)
);
GRANT SELECT ON public.specialist_referrals TO authenticated;
GRANT ALL ON public.specialist_referrals TO service_role;
ALTER TABLE public.specialist_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referral participants read" ON public.specialist_referrals FOR SELECT TO authenticated USING(candidate_user_id=auth.uid() OR public.is_staff(auth.uid()) OR (specialist_user_id=auth.uid() AND status='consented'));
CREATE INDEX referrals_candidate_idx ON public.specialist_referrals(candidate_user_id);
CREATE INDEX referrals_specialist_idx ON public.specialist_referrals(specialist_user_id);
CREATE TABLE public.quotations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), referral_id uuid NOT NULL REFERENCES public.specialist_referrals(id), service_name text NOT NULL, scope text NOT NULL, deliverables text NOT NULL, items jsonb NOT NULL, amount numeric(12,2) NOT NULL CHECK(amount>0), currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), delivery_days integer NOT NULL CHECK(delivery_days>0), revisions integer NOT NULL CHECK(revisions>=0), exclusions text NOT NULL, terms text NOT NULL, expires_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','accepted','declined')), responded_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quotation participants read" ON public.quotations FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.specialist_referrals r WHERE r.id=referral_id AND (r.candidate_user_id=auth.uid() OR r.specialist_user_id=auth.uid())) OR public.is_staff(auth.uid()));
CREATE UNIQUE INDEX one_live_quote_per_referral ON public.quotations(referral_id) WHERE status IN ('sent','accepted');
CREATE TABLE public.service_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quotation_id uuid NOT NULL UNIQUE REFERENCES public.quotations(id), referral_id uuid NOT NULL REFERENCES public.specialist_referrals(id), candidate_user_id uuid NOT NULL, specialist_user_id uuid NOT NULL, candidate_name text NOT NULL, specialist_name text NOT NULL, agreement jsonb NOT NULL, status text NOT NULL DEFAULT 'awaiting_payment' CHECK(status IN ('awaiting_payment','paid','in_progress','awaiting_candidate_information','submitted_for_review','revision_requested','completed','cancelled','disputed')), payment_reference text UNIQUE, paid_at timestamptz, due_at timestamptz, revisions_used integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_orders TO authenticated;
GRANT ALL ON public.service_orders TO service_role;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants read" ON public.service_orders FOR SELECT TO authenticated USING(candidate_user_id=auth.uid() OR specialist_user_id=auth.uid() OR public.is_staff(auth.uid()));
CREATE INDEX orders_candidate_idx ON public.service_orders(candidate_user_id);
CREATE INDEX orders_specialist_idx ON public.service_orders(specialist_user_id);
CREATE TABLE public.order_deliverables (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.service_orders(id), file_name text NOT NULL, storage_path text NOT NULL UNIQUE, size_bytes integer NOT NULL CHECK(size_bytes>0 AND size_bytes<=10485760), mime_type text NOT NULL CHECK(mime_type IN ('application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document')), note text NOT NULL DEFAULT '', created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_deliverables TO authenticated;
GRANT ALL ON public.order_deliverables TO service_role;
ALTER TABLE public.order_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants read deliveries" ON public.order_deliverables FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.service_orders o WHERE o.id=order_id AND (o.candidate_user_id=auth.uid() OR o.specialist_user_id=auth.uid())) OR public.is_staff(auth.uid()));
CREATE TABLE public.order_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.service_orders(id), sender_id uuid NOT NULL, body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 5000), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_messages TO authenticated;
GRANT ALL ON public.order_messages TO service_role;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants read messages" ON public.order_messages FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.service_orders o WHERE o.id=order_id AND (o.candidate_user_id=auth.uid() OR o.specialist_user_id=auth.uid())) OR public.is_staff(auth.uid()));
CREATE FUNCTION public.approved_specialists() RETURNS TABLE(user_id uuid,professional_name text,country text,biography text,experience text,expertise text,portfolio_url text,certifications text,languages text,services text,preferred_currency text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT s.user_id,s.professional_name,s.country,s.biography,s.experience,s.expertise,s.portfolio_url,s.certifications,s.languages,s.services,s.preferred_currency FROM public.specialist_profiles s JOIN public.profiles p ON p.id=s.user_id WHERE auth.uid() IS NOT NULL AND s.status='approved' AND p.account_status='active' AND p.deleted_at IS NULL AND public.has_role(s.user_id,'specialist') $$;
REVOKE ALL ON FUNCTION public.approved_specialists() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approved_specialists() TO authenticated;
CREATE FUNCTION public.create_specialist_referral(_assessment_id uuid,_specialist_id uuid,_service text,_requirements text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.assessments; s public.specialist_profiles; n text; result uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Recruitment team access required'; END IF;
 SELECT * INTO a FROM public.assessments WHERE id=_assessment_id AND status='published';
 IF a.id IS NULL THEN RAISE EXCEPTION 'Choose a published assessment'; END IF;
 SELECT sp.* INTO s FROM public.specialist_profiles sp JOIN public.profiles p ON p.id=sp.user_id WHERE sp.user_id=_specialist_id AND sp.status='approved' AND p.account_status='active' AND p.deleted_at IS NULL;
 IF s.user_id IS NULL OR NOT public.has_role(_specialist_id,'specialist') THEN RAISE EXCEPTION 'Choose an approved active specialist'; END IF;
 IF length(trim(_service))=0 OR length(trim(_requirements))=0 THEN RAISE EXCEPTION 'Service and requirements are required'; END IF;
 SELECT full_name INTO n FROM public.profiles WHERE id=a.candidate_user_id;
 INSERT INTO public.specialist_referrals(assessment_id,candidate_user_id,specialist_user_id,candidate_name,specialist_name,service_name,requirements,created_by) VALUES(a.id,a.candidate_user_id,s.user_id,coalesce(n,'Candidate'),s.professional_name,_service,_requirements,auth.uid()) RETURNING id INTO result;
 INSERT INTO public.notifications(user_id,title,body,link) VALUES(a.candidate_user_id,'Optional specialist referral','Review the specialist and choose whether to share your submitted resume.','/my-services');
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),'referral.created','referral',result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_specialist_referral(uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_specialist_referral(uuid,uuid,text,text) TO authenticated;
CREATE FUNCTION public.respond_specialist_referral(_id uuid,_consent boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.specialist_referrals;
BEGIN
 SELECT * INTO r FROM public.specialist_referrals WHERE id=_id AND candidate_user_id=auth.uid() FOR UPDATE;
 IF r.id IS NULL OR r.status<>'awaiting_consent' THEN RAISE EXCEPTION 'No pending referral'; END IF;
 UPDATE public.specialist_referrals SET status=CASE WHEN _consent THEN 'consented' ELSE 'declined' END,consented_at=CASE WHEN _consent THEN now() ELSE NULL END,responded_at=now() WHERE id=_id;
 INSERT INTO public.consent_records(user_id,consent_type,version,granted) VALUES(auth.uid(),'specialist_referral:'||_id::text,'1',_consent);
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),CASE WHEN _consent THEN 'referral.consented' ELSE 'referral.declined' END,'referral',_id);
 IF _consent THEN INSERT INTO public.notifications(user_id,title,body,link) VALUES(r.specialist_user_id,'New specialist referral',r.service_name,'/specialist-work'); END IF;
END $$;
REVOKE ALL ON FUNCTION public.respond_specialist_referral(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.respond_specialist_referral(uuid,boolean) TO authenticated;
CREATE FUNCTION public.referral_resume(_id uuid) RETURNS TABLE(file_name text,storage_path text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT a.resume_name,a.resume_path FROM public.specialist_referrals r JOIN public.assessments a ON a.id=r.assessment_id WHERE r.id=_id AND (r.candidate_user_id=auth.uid() OR public.is_staff(auth.uid()) OR (r.specialist_user_id=auth.uid() AND r.status='consented')) $$;
REVOKE ALL ON FUNCTION public.referral_resume(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.referral_resume(uuid) TO authenticated;
CREATE POLICY "Consented specialist reads referred resume" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='candidate-documents' AND EXISTS(SELECT 1 FROM public.specialist_referrals r JOIN public.assessments a ON a.id=r.assessment_id WHERE r.specialist_user_id=auth.uid() AND r.status='consented' AND a.resume_path=name));
-- The policy helper bypasses draft RLS only to check the exact consented resume path.
CREATE FUNCTION public.can_read_referred_resume(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.specialist_referrals r JOIN public.assessments a ON a.id=r.assessment_id WHERE r.specialist_user_id=auth.uid() AND r.status='consented' AND a.resume_path=_path) $$;
REVOKE ALL ON FUNCTION public.can_read_referred_resume(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_referred_resume(text) TO authenticated;
ALTER POLICY "Consented specialist reads referred resume" ON storage.objects USING(bucket_id='candidate-documents' AND public.can_read_referred_resume(name));
CREATE FUNCTION public.send_quotation(_referral_id uuid,_quote jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.specialist_referrals; i jsonb; total numeric:=0; result uuid; field text;
BEGIN
 SELECT * INTO r FROM public.specialist_referrals WHERE id=_referral_id AND specialist_user_id=auth.uid() AND status='consented' FOR UPDATE;
 IF r.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.specialist_profiles s JOIN public.profiles p ON p.id=s.user_id WHERE s.user_id=auth.uid() AND s.status='approved' AND p.account_status='active') THEN RAISE EXCEPTION 'Approved specialist and consented referral required'; END IF;
 FOREACH field IN ARRAY ARRAY['service_name','scope','deliverables','exclusions','terms'] LOOP IF length(trim(coalesce(_quote->>field,'')))=0 THEN RAISE EXCEPTION 'Complete all quotation fields'; END IF; END LOOP;
 IF jsonb_typeof(_quote->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(_quote->'items')=0 THEN RAISE EXCEPTION 'Add an itemised price'; END IF;
 FOR i IN SELECT value FROM jsonb_array_elements(_quote->'items') LOOP
  IF length(trim(coalesce(i->>'description','')))=0 OR (i->>'amount')::numeric<=0 OR (i->>'amount')::numeric IS NULL THEN RAISE EXCEPTION 'Each item needs a description and positive price'; END IF;
  total:=total+round((i->>'amount')::numeric,2);
 END LOOP;
 IF (_quote->>'expires_at')::timestamptz<=now() OR (_quote->>'expires_at') IS NULL THEN RAISE EXCEPTION 'Expiry must be in the future'; END IF;
 UPDATE public.quotations SET status='declined',responded_at=now() WHERE referral_id=r.id AND status='sent' AND expires_at<=now();
 INSERT INTO public.quotations(referral_id,service_name,scope,deliverables,items,amount,currency,delivery_days,revisions,exclusions,terms,expires_at) VALUES(r.id,_quote->>'service_name',_quote->>'scope',_quote->>'deliverables',_quote->'items',total,upper(_quote->>'currency'),(_quote->>'delivery_days')::integer,(_quote->>'revisions')::integer,_quote->>'exclusions',_quote->>'terms',(_quote->>'expires_at')::timestamptz) RETURNING id INTO result;
 INSERT INTO public.notifications(user_id,title,body,link) VALUES(r.candidate_user_id,'Your specialist quotation is ready',r.service_name,'/my-services');
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),'quotation.sent','quotation',result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.send_quotation(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_quotation(uuid,jsonb) TO authenticated;
CREATE FUNCTION public.respond_quotation(_id uuid,_accept boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.quotations; r public.specialist_referrals; result uuid;
BEGIN
 SELECT * INTO q FROM public.quotations WHERE id=_id FOR UPDATE;
 SELECT * INTO r FROM public.specialist_referrals WHERE id=q.referral_id AND candidate_user_id=auth.uid() AND status='consented';
 IF r.id IS NULL OR q.status<>'sent' THEN RAISE EXCEPTION 'No pending quotation'; END IF;
 IF _accept AND q.expires_at<=now() THEN RAISE EXCEPTION 'This quotation has expired'; END IF;
 UPDATE public.quotations SET status=CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,responded_at=now() WHERE id=q.id;
 IF _accept THEN INSERT INTO public.service_orders(quotation_id,referral_id,candidate_user_id,specialist_user_id,candidate_name,specialist_name,agreement) VALUES(q.id,r.id,r.candidate_user_id,r.specialist_user_id,r.candidate_name,r.specialist_name,to_jsonb(q)||jsonb_build_object('accepted_at',now())) RETURNING id INTO result; END IF;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),CASE WHEN _accept THEN 'quotation.accepted' ELSE 'quotation.declined' END,'quotation',q.id);
 INSERT INTO public.notifications(user_id,title,body,link) VALUES(r.specialist_user_id,CASE WHEN _accept THEN 'Quotation accepted — awaiting payment' ELSE 'Quotation declined' END,r.service_name,'/specialist-work');
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.respond_quotation(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.respond_quotation(uuid,boolean) TO authenticated;
CREATE FUNCTION public.confirm_service_payment(_order_id uuid,_reference text,_amount numeric,_currency text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.service_orders;
BEGIN
 SELECT * INTO o FROM public.service_orders WHERE id=_order_id FOR UPDATE;
 IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF o.payment_reference=_reference THEN RETURN; END IF;
 IF o.status<>'awaiting_payment' OR length(trim(coalesce(_reference,'')))=0 OR _amount IS DISTINCT FROM (o.agreement->>'amount')::numeric OR upper(_currency) IS DISTINCT FROM o.agreement->>'currency' THEN RAISE EXCEPTION 'Payment does not match order'; END IF;
 UPDATE public.service_orders SET status='paid',payment_reference=_reference,paid_at=now(),due_at=now()+make_interval(days=>(o.agreement->>'delivery_days')::integer),updated_at=now() WHERE id=o.id;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,details) VALUES('order.payment_confirmed','service_order',o.id,jsonb_build_object('reference',_reference));
END $$;
REVOKE ALL ON FUNCTION public.confirm_service_payment(uuid,text,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_service_payment(uuid,text,numeric,text) TO service_role;
CREATE FUNCTION public.transition_service_order(_id uuid,_status text,_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.service_orders; allowed boolean:=false;
BEGIN
 SELECT * INTO o FROM public.service_orders WHERE id=_id FOR UPDATE;
 IF o.id IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF auth.uid()=o.specialist_user_id THEN
  allowed:= (o.status='paid' AND _status='in_progress') OR (o.status IN ('in_progress','revision_requested') AND _status='awaiting_candidate_information') OR (o.status IN ('awaiting_candidate_information','revision_requested') AND _status='in_progress');
 END IF;
 IF auth.uid()=o.candidate_user_id THEN
  allowed:= allowed OR (o.status='submitted_for_review' AND _status IN ('completed','revision_requested')) OR (o.status='awaiting_payment' AND _status='cancelled') OR (o.status IN ('paid','in_progress','awaiting_candidate_information','submitted_for_review','revision_requested') AND _status='disputed');
 END IF;
 IF NOT allowed THEN RAISE EXCEPTION 'This status change is not allowed'; END IF;
 IF _status='revision_requested' THEN
  IF o.revisions_used >= (o.agreement->>'revisions')::integer THEN RAISE EXCEPTION 'Included revisions are exhausted'; END IF;
  UPDATE public.service_orders SET revisions_used=revisions_used+1 WHERE id=o.id;
 END IF;
 IF _status IN ('revision_requested','disputed','awaiting_candidate_information') AND length(trim(coalesce(_note,'')))=0 THEN RAISE EXCEPTION 'Please include a message'; END IF;
 UPDATE public.service_orders SET status=_status,updated_at=now() WHERE id=o.id;
 IF length(trim(coalesce(_note,'')))>0 THEN INSERT INTO public.order_messages(order_id,sender_id,body) VALUES(o.id,auth.uid(),_note); END IF;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'order.status_changed','service_order',o.id,jsonb_build_object('status',_status));
 INSERT INTO public.notifications(user_id,title,body,link) VALUES(CASE WHEN auth.uid()=o.candidate_user_id THEN o.specialist_user_id ELSE o.candidate_user_id END,'Service order updated',replace(_status,'_',' '),CASE WHEN auth.uid()=o.candidate_user_id THEN '/specialist-work' ELSE '/my-services' END);
END $$;
REVOKE ALL ON FUNCTION public.transition_service_order(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transition_service_order(uuid,text,text) TO authenticated;
CREATE FUNCTION public.send_order_message(_id uuid,_body text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.service_orders WHERE id=_id AND (candidate_user_id=auth.uid() OR specialist_user_id=auth.uid() OR public.is_staff(auth.uid()))) THEN RAISE EXCEPTION 'Order access required'; END IF;
 INSERT INTO public.order_messages(order_id,sender_id,body) VALUES(_id,auth.uid(),trim(_body));
END $$;
REVOKE ALL ON FUNCTION public.send_order_message(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_order_message(uuid,text) TO authenticated;
CREATE FUNCTION public.add_order_delivery(_id uuid,_path text,_name text,_size integer,_mime text,_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.service_orders WHERE id=_id AND specialist_user_id=auth.uid() AND status IN ('in_progress','revision_requested')) OR _path NOT LIKE auth.uid()::text||'/'||_id::text||'/%' THEN RAISE EXCEPTION 'Active assigned order required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='service-deliveries' AND name=_path AND (metadata->>'size')::integer=_size AND metadata->>'mimetype'=_mime) THEN RAISE EXCEPTION 'Upload the delivery first'; END IF;
 INSERT INTO public.order_deliverables(order_id,file_name,storage_path,size_bytes,mime_type,note,created_by) VALUES(_id,_name,_path,_size,_mime,coalesce(_note,''),auth.uid());
 UPDATE public.service_orders SET status='submitted_for_review',updated_at=now() WHERE id=_id;
 INSERT INTO public.notifications(user_id,title,body,link) SELECT candidate_user_id,'Your documents are ready',_name,'/my-services' FROM public.service_orders WHERE id=_id;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),'order.document_delivered','service_order',_id);
END $$;
REVOKE ALL ON FUNCTION public.add_order_delivery(uuid,text,text,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_order_delivery(uuid,text,text,integer,text,text) TO authenticated;
CREATE POLICY "Specialist uploads active order delivery" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='service-deliveries' AND (storage.foldername(name))[1]=auth.uid()::text AND EXISTS(SELECT 1 FROM public.service_orders o WHERE o.id::text=(storage.foldername(name))[2] AND o.specialist_user_id=auth.uid() AND o.status IN ('in_progress','revision_requested')));
CREATE POLICY "Participants read registered deliveries" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='service-deliveries' AND (public.is_staff(auth.uid()) OR EXISTS(SELECT 1 FROM public.order_deliverables d JOIN public.service_orders o ON o.id=d.order_id WHERE d.storage_path=name AND (o.candidate_user_id=auth.uid() OR o.specialist_user_id=auth.uid()))));
CREATE POLICY "Specialist reads own delivery uploads" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='service-deliveries' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "Specialist removes unregistered delivery" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='service-deliveries' AND (storage.foldername(name))[1]=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.order_deliverables d WHERE d.storage_path=name));