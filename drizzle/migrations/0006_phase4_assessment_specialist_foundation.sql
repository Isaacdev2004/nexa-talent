CREATE TABLE public.assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL UNIQUE REFERENCES public.job_applications(id), candidate_user_id uuid NOT NULL, resume_document_id uuid NOT NULL REFERENCES public.documents(id), resume_name text NOT NULL, resume_path text NOT NULL, job_snapshot jsonb NOT NULL, status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','draft','published')), findings jsonb NOT NULL DEFAULT '{}', recommendations text NOT NULL DEFAULT '', missing_requirements text NOT NULL DEFAULT '', supporting_documents text NOT NULL DEFAULT '', outcome text CHECK(outcome IN ('Suitable','Suitable with minor improvements','Restructuring recommended','Additional documents required','More information required','Further review required')), reviewer_id uuid, requested_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates read requested or published assessments" ON public.assessments FOR SELECT TO authenticated USING(candidate_user_id = auth.uid() AND status IN ('requested','published'));
CREATE POLICY "Staff read assessment drafts" ON public.assessments FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE INDEX assessments_candidate_idx ON public.assessments(candidate_user_id);
CREATE TABLE public.specialist_profiles (
 user_id uuid PRIMARY KEY, professional_name text NOT NULL, country text NOT NULL DEFAULT '', biography text NOT NULL DEFAULT '', experience text NOT NULL DEFAULT '', expertise text NOT NULL DEFAULT '', portfolio_url text NOT NULL DEFAULT '', certifications text NOT NULL DEFAULT '', languages text NOT NULL DEFAULT '', services text NOT NULL DEFAULT '', preferred_currency text NOT NULL DEFAULT 'USD', status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), review_note text NOT NULL DEFAULT '', reviewed_by uuid, reviewed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.specialist_profiles TO authenticated;
GRANT ALL ON public.specialist_profiles TO service_role;
ALTER TABLE public.specialist_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specialists read own profile" ON public.specialist_profiles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "Staff read specialist profiles" ON public.specialist_profiles FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE FUNCTION public.request_assessment(_application_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.job_applications; d public.application_documents; result uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO a FROM public.job_applications WHERE id=_application_id AND candidate_user_id=auth.uid();
 IF a.id IS NULL THEN RAISE EXCEPTION 'Choose your own submitted application'; END IF;
 SELECT * INTO d FROM public.application_documents WHERE application_id=a.id AND kind='resume' LIMIT 1;
 IF d.id IS NULL THEN RAISE EXCEPTION 'This application has no resume'; END IF;
 INSERT INTO public.assessments(application_id,candidate_user_id,resume_document_id,resume_name,resume_path,job_snapshot) VALUES(a.id,auth.uid(),d.document_id,d.file_name,d.storage_path,a.job_snapshot) ON CONFLICT(application_id) DO NOTHING;
 SELECT id INTO result FROM public.assessments WHERE application_id=a.id;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.request_assessment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_assessment(uuid) TO authenticated;
CREATE FUNCTION public.save_assessment(_id uuid,_findings jsonb,_recommendations text,_missing text,_supporting text,_outcome text,_publish boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.assessments; category text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Recruitment team access required'; END IF;
 SELECT * INTO a FROM public.assessments WHERE id=_id FOR UPDATE;
 IF a.id IS NULL OR a.status='published' THEN RAISE EXCEPTION 'Published reports are immutable'; END IF;
 IF jsonb_typeof(_findings) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid findings'; END IF;
 IF _publish THEN
  FOREACH category IN ARRAY ARRAY['Job relevance','Relevant work experience','Required skills','Qualifications','Professional achievements','Resume structure','Formatting','ATS parsing compatibility','Relevant keywords','Supporting documents'] LOOP
   IF length(trim(coalesce(_findings->>category,'')))=0 THEN RAISE EXCEPTION 'Complete all assessment categories before publishing'; END IF;
  END LOOP;
  IF _outcome IS NULL OR length(trim(coalesce(_recommendations,'')))=0 THEN RAISE EXCEPTION 'Outcome and recommendations are required'; END IF;
 END IF;
 UPDATE public.assessments SET findings=_findings,recommendations=_recommendations,missing_requirements=_missing,supporting_documents=_supporting,outcome=_outcome,reviewer_id=auth.uid(),status=CASE WHEN _publish THEN 'published' ELSE 'draft' END,published_at=CASE WHEN _publish THEN now() ELSE NULL END,updated_at=now() WHERE id=_id;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),CASE WHEN _publish THEN 'assessment.published' ELSE 'assessment.draft_saved' END,'assessment',_id);
 IF _publish THEN INSERT INTO public.notifications(user_id,title,body,link) VALUES(a.candidate_user_id,'Your resume assessment is ready','Your recruitment team has published your report.','/assessments'); END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_assessment(uuid,jsonb,text,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_assessment(uuid,jsonb,text,text,text,text,boolean) TO authenticated;
CREATE FUNCTION public.submit_specialist_profile(_profile jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'specialist') THEN RAISE EXCEPTION 'Specialist account required'; END IF;
 IF length(trim(coalesce(_profile->>'professional_name','')))=0 OR length(trim(coalesce(_profile->>'biography','')))=0 OR length(trim(coalesce(_profile->>'expertise','')))=0 OR length(trim(coalesce(_profile->>'services','')))=0 THEN RAISE EXCEPTION 'Complete your name, biography, expertise and services'; END IF;
 INSERT INTO public.specialist_profiles(user_id,professional_name,country,biography,experience,expertise,portfolio_url,certifications,languages,services,preferred_currency) VALUES(auth.uid(),_profile->>'professional_name',coalesce(_profile->>'country',''),_profile->>'biography',coalesce(_profile->>'experience',''),_profile->>'expertise',coalesce(_profile->>'portfolio_url',''),coalesce(_profile->>'certifications',''),coalesce(_profile->>'languages',''),_profile->>'services',coalesce(_profile->>'preferred_currency','USD'))
 ON CONFLICT(user_id) DO UPDATE SET professional_name=EXCLUDED.professional_name,country=EXCLUDED.country,biography=EXCLUDED.biography,experience=EXCLUDED.experience,expertise=EXCLUDED.expertise,portfolio_url=EXCLUDED.portfolio_url,certifications=EXCLUDED.certifications,languages=EXCLUDED.languages,services=EXCLUDED.services,preferred_currency=EXCLUDED.preferred_currency,status='pending',review_note='',reviewed_by=NULL,reviewed_at=NULL,updated_at=now();
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),'specialist.profile_submitted','specialist',auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.submit_specialist_profile(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_specialist_profile(jsonb) TO authenticated;
CREATE FUNCTION public.review_specialist(_user_id uuid,_approve boolean,_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN RAISE EXCEPTION 'Administrator approval required'; END IF;
 IF NOT public.has_role(_user_id,'specialist') THEN RAISE EXCEPTION 'Specialist account required'; END IF;
 IF NOT _approve AND length(trim(coalesce(_note,'')))=0 THEN RAISE EXCEPTION 'Provide a reason for rejection'; END IF;
 UPDATE public.specialist_profiles SET status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,review_note=coalesce(_note,''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE user_id=_user_id AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'No pending profile'; END IF;
 IF _approve THEN UPDATE public.profiles SET account_status='active' WHERE id=_user_id AND account_status='pending_review'; END IF;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),CASE WHEN _approve THEN 'specialist.approved' ELSE 'specialist.rejected' END,'specialist',_user_id);
 INSERT INTO public.notifications(user_id,title,body,link) VALUES(_user_id,CASE WHEN _approve THEN 'Specialist profile approved' ELSE 'Specialist profile needs changes' END,coalesce(_note,''),'/specialist');
END $$;
REVOKE ALL ON FUNCTION public.review_specialist(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_specialist(uuid,boolean,text) TO authenticated;