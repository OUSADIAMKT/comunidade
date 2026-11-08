-- ATUALIZAÇÃO 0007: avaliações públicas + certificado sem prova + publica os cursos Canva e Captação.
-- Rode UMA vez em uma aba nova do SQL Editor (precisa do UPDATE_ESCOLA_COMUNIDADE e dos seeds dos cursos já aplicados).

-- ============================================================================
-- 0007: avaliações públicas dos profissionais + certificado de cursos sem prova
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Avaliações públicas (só contratos CONCLUÍDOS com nota, de perfis públicos)
--    View security definer de propósito: expõe apenas estes campos, nunca a tabela de contratos.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_professional_reviews AS
SELECT
  c.id                                   AS id,
  c.professional_id                      AS professional_id,
  p.username                             AS username,
  c.company_rating                       AS rating,
  NULLIF(TRIM(c.company_review), '')     AS review,
  COALESCE(NULLIF(cp.trade_name, ''), cp.company_name) AS company_name,
  cp.logo_url                            AS company_logo_url,
  c.completed_at                         AS completed_at
FROM public.contracts c
JOIN public.professional_profiles p ON p.id = c.professional_id
JOIN public.users u ON u.id = p.user_id
JOIN public.company_profiles cp ON cp.id = c.company_id
WHERE c.status = 'COMPLETED'
  AND c.company_rating IS NOT NULL
  AND p.is_public = TRUE
  AND u.status = 'ACTIVE';

GRANT SELECT ON public.public_professional_reviews TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Certificado sem prova: cursos grátis SEM perguntas emitem o certificado
--    ao concluir todas as aulas. (Com perguntas, continua valendo a prova.)
-- ----------------------------------------------------------------------------
ALTER TABLE public.certificates ALTER COLUMN score DROP NOT NULL; -- NULL = concluído sem prova

CREATE OR REPLACE FUNCTION public.claim_certificate(p_course UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.courses%ROWTYPE;
  total INT;
  done INT;
  cert_code TEXT;
  usr public.users%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO c FROM public.courses WHERE id = p_course AND status = 'PUBLISHED' AND access_level = 'FREE';
  IF NOT FOUND THEN RAISE EXCEPTION 'COURSE_NOT_FOUND'; END IF;

  IF EXISTS (SELECT 1 FROM public.exam_questions WHERE course_id = p_course) THEN
    RAISE EXCEPTION 'EXAM_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO total FROM public.lessons WHERE course_id = p_course;
  SELECT COUNT(*) INTO done FROM public.lesson_progress lp JOIN public.lessons l ON l.id = lp.lesson_id
   WHERE lp.user_id = auth.uid() AND l.course_id = p_course;
  IF total = 0 OR done < total THEN RAISE EXCEPTION 'LESSONS_INCOMPLETE' USING ERRCODE = 'P0001'; END IF;

  SELECT code INTO cert_code FROM public.certificates WHERE user_id = auth.uid() AND course_id = p_course;
  IF cert_code IS NULL THEN
    SELECT * INTO usr FROM public.users WHERE id = auth.uid();
    cert_code := 'CA-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || auth.uid()::TEXT), 1, 10));
    INSERT INTO public.certificates (code, user_id, course_id, holder_name, course_title, course_hours, score)
    VALUES (cert_code, auth.uid(), p_course, usr.full_name, c.title, c.estimated_hours, NULL);
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (auth.uid(), 'Certificado emitido 🎓', 'Você concluiu "' || c.title || '".', '/escola/certificados');
  END IF;

  RETURN jsonb_build_object('certificate_code', cert_code);
END $$;

REVOKE ALL ON FUNCTION public.claim_certificate(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_certificate(UUID) TO authenticated;

-- A tela do curso precisa saber se há prova, sem poder ler as perguntas (gabarito é privado)
CREATE OR REPLACE FUNCTION public.course_has_exam(p_course UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.exam_questions WHERE course_id = p_course)
$$;
REVOKE ALL ON FUNCTION public.course_has_exam(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.course_has_exam(UUID) TO authenticated;

-- Publica os cursos gratuitos (sem prova: o certificado sai ao concluir todas as aulas)
UPDATE public.courses SET status = 'PUBLISHED' WHERE slug IN ('canva-para-iniciantes', 'captacao-videomaker-mobile');
