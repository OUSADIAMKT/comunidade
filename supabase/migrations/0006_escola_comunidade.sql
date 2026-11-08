-- ============================================================================
-- 0006 — Escola (cursos, provas, certificados) e Comunidade (fórum)
-- ============================================================================
-- Modelo de acesso da Escola:
--   FREE: aulas em vídeo (YouTube não listado) dentro da plataforma, para qualquer usuário logado.
--   PRO : curso listado para todos, mas o link do HeroSpark só é entregue a quem tem plano pago
--         (via RPC get_course_external_url — o link nunca fica legível por SELECT).
-- ============================================================================

-- Quem tem plano pago vigente (PRO de profissional ou Premium de empresa)
CREATE OR REPLACE FUNCTION public.has_paid_plan(p_user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s JOIN public.subscription_plans sp ON sp.id = s.plan_id
     WHERE s.user_id = p_user AND s.status IN ('ACTIVE', 'TRIAL')
       AND s.current_period_end > NOW() AND sp.price_monthly > 0)
$$;

-- ----------------------------------------------------------------------------
-- ESCOLA
-- ----------------------------------------------------------------------------
CREATE TYPE course_access AS ENUM ('FREE', 'PRO');
CREATE TYPE content_status AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]{3,80}$'),
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  access_level course_access NOT NULL DEFAULT 'FREE',
  level TEXT DEFAULT 'Iniciante',
  estimated_hours NUMERIC(5,1) DEFAULT 1,
  instructor_name TEXT,
  status content_status NOT NULL DEFAULT 'DRAFT',
  display_order INT DEFAULT 0,
  pass_score INT NOT NULL DEFAULT 70 CHECK (pass_score BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link do HeroSpark (cursos PRO): isolado, sem policy de SELECT para usuários comuns
CREATE TABLE public.course_private_links (
  course_id UUID PRIMARY KEY REFERENCES public.courses(id) ON DELETE CASCADE,
  external_url TEXT NOT NULL
);

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  youtube_id TEXT NOT NULL CHECK (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  position INT NOT NULL DEFAULT 0,
  duration_minutes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_lessons_course ON public.lessons(course_id, position);

CREATE TABLE public.lesson_progress (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE public.exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
  correct_index INT NOT NULL CHECK (correct_index >= 0),
  position INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_exam_questions_course ON public.exam_questions(course_id, position);

CREATE TABLE public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  score INT NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_exam_attempts_user ON public.exam_attempts(user_id, course_id, created_at DESC);

CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  holder_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  course_hours NUMERIC(5,1),
  score INT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_private_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cursos publicados visíveis" ON public.courses FOR SELECT
  USING (auth.role() = 'authenticated' AND (status = 'PUBLISHED' OR public.is_admin_user()));
CREATE POLICY "Admin gere cursos" ON public.courses FOR ALL
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "Admin gere links privados" ON public.course_private_links FOR ALL
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "Aulas de cursos grátis publicados" ON public.lessons FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    public.is_admin_user() OR EXISTS (
      SELECT 1 FROM public.courses c
       WHERE c.id = lessons.course_id AND c.status = 'PUBLISHED' AND c.access_level = 'FREE')));
CREATE POLICY "Admin gere aulas" ON public.lessons FOR ALL
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "Aluno vê o próprio progresso" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Aluno marca aula concluída" ON public.lesson_progress FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id));
CREATE POLICY "Aluno desmarca aula" ON public.lesson_progress FOR DELETE USING (auth.uid() = user_id);

-- Gabarito: ninguém além do admin lê a tabela; alunos usam as RPCs abaixo
CREATE POLICY "Admin gere perguntas" ON public.exam_questions FOR ALL
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "Aluno vê as próprias tentativas" ON public.exam_attempts FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_user());

CREATE POLICY "Aluno vê os próprios certificados" ON public.certificates FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_user());

-- Perguntas SEM gabarito, somente após concluir todas as aulas
CREATE OR REPLACE FUNCTION public.get_exam_questions(p_course UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.courses%ROWTYPE;
  total INT;
  done INT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO c FROM public.courses WHERE id = p_course AND status = 'PUBLISHED' AND access_level = 'FREE';
  IF NOT FOUND THEN RAISE EXCEPTION 'COURSE_NOT_FOUND'; END IF;
  SELECT COUNT(*) INTO total FROM public.lessons WHERE course_id = p_course;
  SELECT COUNT(*) INTO done FROM public.lesson_progress lp JOIN public.lessons l ON l.id = lp.lesson_id
   WHERE lp.user_id = auth.uid() AND l.course_id = p_course;
  IF total = 0 OR done < total THEN RAISE EXCEPTION 'LESSONS_INCOMPLETE' USING ERRCODE = 'P0001'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.exam_questions WHERE course_id = p_course) THEN
    RAISE EXCEPTION 'NO_EXAM' USING ERRCODE = 'P0001';
  END IF;
  RETURN jsonb_build_object(
    'pass_score', c.pass_score,
    'questions', (SELECT jsonb_agg(jsonb_build_object('id', q.id, 'prompt', q.prompt, 'options', q.options) ORDER BY q.position, q.id)
                    FROM public.exam_questions q WHERE q.course_id = p_course));
END $$;

-- Corrige no banco; aprovado => emite o certificado (um por aluno/curso)
CREATE OR REPLACE FUNCTION public.submit_exam(p_course UUID, p_answers JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.courses%ROWTYPE;
  total INT;
  done INT;
  n_questions INT;
  n_correct INT;
  pct INT;
  ok BOOLEAN;
  cert_code TEXT;
  usr public.users%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO c FROM public.courses WHERE id = p_course AND status = 'PUBLISHED' AND access_level = 'FREE';
  IF NOT FOUND THEN RAISE EXCEPTION 'COURSE_NOT_FOUND'; END IF;

  SELECT COUNT(*) INTO total FROM public.lessons WHERE course_id = p_course;
  SELECT COUNT(*) INTO done FROM public.lesson_progress lp JOIN public.lessons l ON l.id = lp.lesson_id
   WHERE lp.user_id = auth.uid() AND l.course_id = p_course;
  IF total = 0 OR done < total THEN RAISE EXCEPTION 'LESSONS_INCOMPLETE' USING ERRCODE = 'P0001'; END IF;

  -- trava anti força-bruta: nova tentativa só 5 minutos depois de uma reprovação
  IF EXISTS (SELECT 1 FROM public.exam_attempts
              WHERE user_id = auth.uid() AND course_id = p_course AND NOT passed
                AND created_at > NOW() - INTERVAL '5 minutes')
     AND NOT EXISTS (SELECT 1 FROM public.certificates WHERE user_id = auth.uid() AND course_id = p_course) THEN
    RAISE EXCEPTION 'EXAM_COOLDOWN' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO n_questions FROM public.exam_questions WHERE course_id = p_course;
  IF n_questions = 0 THEN RAISE EXCEPTION 'NO_EXAM' USING ERRCODE = 'P0001'; END IF;

  SELECT COUNT(*) INTO n_correct FROM public.exam_questions q
   WHERE q.course_id = p_course
     AND (p_answers ->> q.id::text) ~ '^[0-9]+$'
     AND (p_answers ->> q.id::text)::INT = q.correct_index;

  pct := ROUND(100.0 * n_correct / n_questions);
  ok := pct >= c.pass_score;
  INSERT INTO public.exam_attempts (user_id, course_id, score, passed) VALUES (auth.uid(), p_course, pct, ok);

  SELECT code INTO cert_code FROM public.certificates WHERE user_id = auth.uid() AND course_id = p_course;
  IF ok AND cert_code IS NULL THEN
    SELECT * INTO usr FROM public.users WHERE id = auth.uid();
    cert_code := 'CA-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || auth.uid()::TEXT), 1, 10));
    INSERT INTO public.certificates (code, user_id, course_id, holder_name, course_title, course_hours, score)
    VALUES (cert_code, auth.uid(), p_course, usr.full_name, c.title, c.estimated_hours, pct);
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (auth.uid(), 'Certificado emitido 🎓', 'Você foi aprovado em "' || c.title || '" com ' || pct || '%.', '/escola/certificados');
  END IF;

  RETURN jsonb_build_object('score', pct, 'passed', ok, 'pass_score', c.pass_score,
                            'correct', n_correct, 'total', n_questions, 'certificate_code', CASE WHEN ok THEN cert_code END);
END $$;

-- Verificação pública do certificado (sem e-mail nem dados pessoais além do nome)
CREATE OR REPLACE FUNCTION public.verify_certificate(p_code TEXT)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('holder_name', holder_name, 'course_title', course_title,
                            'course_hours', course_hours, 'score', score, 'issued_at', issued_at, 'code', code)
    FROM public.certificates WHERE code = UPPER(TRIM(p_code))
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated;

-- Link do HeroSpark: só para plano pago (ou admin)
CREATE OR REPLACE FUNCTION public.get_course_external_url(p_course UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE url TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  IF NOT (public.has_paid_plan(auth.uid()) OR public.is_admin_user()) THEN RETURN NULL; END IF;
  SELECT l.external_url INTO url FROM public.course_private_links l
    JOIN public.courses c ON c.id = l.course_id
   WHERE l.course_id = p_course AND c.access_level = 'PRO' AND (c.status = 'PUBLISHED' OR public.is_admin_user());
  RETURN url;
END $$;

-- ----------------------------------------------------------------------------
-- COMUNIDADE (fórum)
-- ----------------------------------------------------------------------------
CREATE TABLE public.forum_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  position INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.forum_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE RESTRICT,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 140),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  reply_count INT NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_topics_category ON public.forum_topics(category_id, is_pinned DESC, last_activity_at DESC);

CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_posts_topic ON public.forum_posts(topic_id, created_at);

CREATE TABLE public.forum_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((topic_id IS NOT NULL)::INT + (post_id IS NOT NULL)::INT = 1)
);
CREATE UNIQUE INDEX uq_likes_topic ON public.forum_likes(user_id, topic_id) WHERE topic_id IS NOT NULL;
CREATE UNIQUE INDEX uq_likes_post ON public.forum_likes(user_id, post_id) WHERE post_id IS NOT NULL;

CREATE TABLE public.forum_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DISMISSED', 'ACTIONED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((topic_id IS NOT NULL)::INT + (post_id IS NOT NULL)::INT = 1)
);
CREATE UNIQUE INDEX uq_reports_topic ON public.forum_reports(reporter_id, topic_id) WHERE topic_id IS NOT NULL;
CREATE UNIQUE INDEX uq_reports_post ON public.forum_reports(reporter_id, post_id) WHERE post_id IS NOT NULL;

-- Nome/foto de quem escreve, sem expor e-mail, telefone ou dados privados
CREATE VIEW public.forum_authors AS
SELECT
  u.id,
  CASE WHEN u.is_professional THEN u.full_name
       ELSE COALESCE(c.trade_name, c.company_name, u.full_name) END AS display_name,
  u.avatar_url,
  pp.username,
  u.is_admin,
  (u.is_company AND NOT u.is_professional) AS is_company_only,
  public.has_paid_plan(u.id) AS is_paid
FROM public.users u
LEFT JOIN public.professional_profiles pp ON pp.user_id = u.id
LEFT JOIN public.company_profiles c ON c.user_id = u.id
WHERE u.status = 'ACTIVE';
GRANT SELECT ON public.forum_authors TO authenticated;

ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorias do fórum visíveis" ON public.forum_categories FOR SELECT
  USING (auth.role() = 'authenticated' AND (is_active OR public.is_admin_user()));
CREATE POLICY "Admin gere categorias do fórum" ON public.forum_categories FOR ALL
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "Tópicos visíveis" ON public.forum_topics FOR SELECT
  USING (auth.role() = 'authenticated' AND (NOT is_hidden OR author_id = auth.uid() OR public.is_admin_user()));
CREATE POLICY "Autor cria tópico" ON public.forum_topics FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "Autor ou admin edita tópico" ON public.forum_topics FOR UPDATE
  USING (author_id = auth.uid() OR public.is_admin_user());
CREATE POLICY "Autor ou admin apaga tópico" ON public.forum_topics FOR DELETE
  USING (author_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "Respostas visíveis" ON public.forum_posts FOR SELECT
  USING (auth.role() = 'authenticated' AND (NOT is_hidden OR author_id = auth.uid() OR public.is_admin_user()));
CREATE POLICY "Autor cria resposta" ON public.forum_posts FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "Autor ou admin edita resposta" ON public.forum_posts FOR UPDATE
  USING (author_id = auth.uid() OR public.is_admin_user());
CREATE POLICY "Autor ou admin apaga resposta" ON public.forum_posts FOR DELETE
  USING (author_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "Curtidas visíveis" ON public.forum_likes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuário curte" ON public.forum_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Usuário descurte" ON public.forum_likes FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Usuário denuncia" ON public.forum_reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admin vê denúncias" ON public.forum_reports FOR SELECT USING (public.is_admin_user());
CREATE POLICY "Admin trata denúncias" ON public.forum_reports FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Somente conta ativa cria tópicos" ON public.forum_topics AS RESTRICTIVE FOR INSERT WITH CHECK (public.is_active_user());
CREATE POLICY "Somente conta ativa cria respostas" ON public.forum_posts AS RESTRICTIVE FOR INSERT WITH CHECK (public.is_active_user());

-- Criação de tópico: autor = quem está logado, flags de moderação zeradas, limite de spam
CREATE OR REPLACE FUNCTION public.guard_topic_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR COALESCE(current_setting('app.forum_system', TRUE), '0') = '1' THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.forum_categories WHERE id = NEW.category_id AND is_active) THEN
    RAISE EXCEPTION 'CATEGORY_INACTIVE' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT COUNT(*) FROM public.forum_topics WHERE author_id = auth.uid() AND created_at > NOW() - INTERVAL '1 hour') >= 5
     AND NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'RATE_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  NEW.author_id := auth.uid();
  IF NOT public.is_admin_user() THEN
    NEW.is_pinned := FALSE; NEW.is_locked := FALSE;
  END IF;
  NEW.is_hidden := FALSE;
  NEW.reply_count := 0;
  NEW.last_activity_at := NOW();
  RETURN NEW;
END $$;
CREATE TRIGGER topics_guard_insert BEFORE INSERT ON public.forum_topics
  FOR EACH ROW EXECUTE FUNCTION public.guard_topic_insert();

CREATE OR REPLACE FUNCTION public.guard_topic_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_user() OR COALESCE(current_setting('app.forum_system', TRUE), '0') = '1' THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;
  -- autor só edita título e texto
  NEW.category_id := OLD.category_id;
  NEW.author_id := OLD.author_id;
  NEW.is_pinned := OLD.is_pinned;
  NEW.is_locked := OLD.is_locked;
  NEW.is_hidden := OLD.is_hidden;
  NEW.reply_count := OLD.reply_count;
  NEW.last_activity_at := OLD.last_activity_at;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;
CREATE TRIGGER topics_guard_update BEFORE UPDATE ON public.forum_topics
  FOR EACH ROW EXECUTE FUNCTION public.guard_topic_update();

CREATE OR REPLACE FUNCTION public.guard_post_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.forum_topics%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(current_setting('app.forum_system', TRUE), '0') = '1' THEN RETURN NEW; END IF;
  SELECT * INTO t FROM public.forum_topics WHERE id = NEW.topic_id;
  IF NOT FOUND OR t.is_hidden THEN RAISE EXCEPTION 'TOPIC_UNAVAILABLE' USING ERRCODE = 'P0001'; END IF;
  IF t.is_locked AND NOT public.is_admin_user() THEN RAISE EXCEPTION 'TOPIC_LOCKED' USING ERRCODE = 'P0001'; END IF;
  IF (SELECT COUNT(*) FROM public.forum_posts WHERE author_id = auth.uid() AND created_at > NOW() - INTERVAL '1 hour') >= 20
     AND NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'RATE_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  NEW.author_id := auth.uid();
  NEW.is_hidden := FALSE;
  RETURN NEW;
END $$;
CREATE TRIGGER posts_guard_insert BEFORE INSERT ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_post_insert();

CREATE OR REPLACE FUNCTION public.guard_post_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_user() OR COALESCE(current_setting('app.forum_system', TRUE), '0') = '1' THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;
  NEW.topic_id := OLD.topic_id;
  NEW.author_id := OLD.author_id;
  NEW.is_hidden := OLD.is_hidden;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;
CREATE TRIGGER posts_guard_update BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_post_update();

-- Contador de respostas, última atividade e aviso ao autor do tópico
CREATE OR REPLACE FUNCTION public.forum_post_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tid UUID := COALESCE(NEW.topic_id, OLD.topic_id);
  topic_author UUID;
  topic_title TEXT;
BEGIN
  PERFORM set_config('app.forum_system', '1', TRUE);
  UPDATE public.forum_topics t
     SET reply_count = (SELECT COUNT(*) FROM public.forum_posts p WHERE p.topic_id = tid AND NOT p.is_hidden),
         last_activity_at = CASE WHEN TG_OP = 'INSERT' THEN NOW() ELSE t.last_activity_at END
   WHERE t.id = tid;
  PERFORM set_config('app.forum_system', '0', TRUE);

  IF TG_OP = 'INSERT' THEN
    SELECT author_id, title INTO topic_author, topic_title FROM public.forum_topics WHERE id = tid;
    IF topic_author IS NOT NULL AND topic_author <> NEW.author_id THEN
      INSERT INTO public.notifications (user_id, title, body, action_url)
      VALUES (topic_author, 'Nova resposta no seu tópico', 'Alguém respondeu "' || LEFT(topic_title, 80) || '".', '/comunidade/t/' || tid);
    END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER posts_after_change AFTER INSERT OR DELETE OR UPDATE OF is_hidden ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_post_effects();

-- Autossustentável: 3 denúncias abertas de pessoas diferentes ocultam o conteúdo até o admin revisar
CREATE OR REPLACE FUNCTION public.forum_report_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n INT;
  did_hide BOOLEAN := FALSE;
BEGIN
  PERFORM set_config('app.forum_system', '1', TRUE);
  IF NEW.topic_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT reporter_id) INTO n FROM public.forum_reports WHERE topic_id = NEW.topic_id AND status = 'OPEN';
    IF n >= 3 THEN
      UPDATE public.forum_topics SET is_hidden = TRUE WHERE id = NEW.topic_id AND NOT is_hidden;
      did_hide := FOUND;
    END IF;
  ELSE
    SELECT COUNT(DISTINCT reporter_id) INTO n FROM public.forum_reports WHERE post_id = NEW.post_id AND status = 'OPEN';
    IF n >= 3 THEN
      UPDATE public.forum_posts SET is_hidden = TRUE WHERE id = NEW.post_id AND NOT is_hidden;
      did_hide := FOUND;
    END IF;
  END IF;
  PERFORM set_config('app.forum_system', '0', TRUE);

  IF did_hide THEN
    INSERT INTO public.notifications (user_id, title, body, action_url)
    SELECT a.id, 'Conteúdo ocultado por denúncias', 'Um conteúdo da comunidade recebeu 3 denúncias e foi ocultado. Revise.', '/admin/comunidade'
      FROM public.users a WHERE a.is_admin;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER reports_after_insert AFTER INSERT ON public.forum_reports
  FOR EACH ROW EXECUTE FUNCTION public.forum_report_effects();

-- Atalho para o app saber se o usuário já denunciou / curtiu é feito por SELECT com RLS;
-- ninguém consegue ler denúncias de terceiros (SELECT só para admin).
