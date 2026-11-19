CREATE FUNCTION public.my_assessments() RETURNS SETOF public.assessments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.assessments;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 FOR a IN SELECT * FROM public.assessments WHERE candidate_user_id=auth.uid() ORDER BY requested_at DESC LOOP
  IF a.status <> 'published' THEN
   a.status := 'requested'; a.findings := '{}'::jsonb; a.recommendations := ''; a.missing_requirements := ''; a.supporting_documents := ''; a.outcome := NULL; a.reviewer_id := NULL; a.published_at := NULL;
  END IF;
  RETURN NEXT a;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.my_assessments() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_assessments() TO authenticated;