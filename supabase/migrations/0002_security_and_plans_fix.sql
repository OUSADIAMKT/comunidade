-- ============================================================================
-- 0002 — Segurança (LGPD), limites de plano e regras do profissional
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LGPD: dados sensíveis saem de professional_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE public.professional_private_data (
  professional_id UUID PRIMARY KEY REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cpf_cnpj TEXT,
  birth_date DATE,
  pix_key TEXT,
  bank_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.professional_private_data (professional_id, user_id, cpf_cnpj, birth_date, pix_key, bank_info)
SELECT id, user_id, cpf_cnpj, birth_date, pix_key, bank_info FROM public.professional_profiles;

ALTER TABLE public.professional_profiles
  DROP COLUMN cpf_cnpj,
  DROP COLUMN birth_date,
  DROP COLUMN pix_key,
  DROP COLUMN bank_info;

ALTER TABLE public.professional_private_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono e admin acessam dados privados" ON public.professional_private_data FOR ALL
  USING (auth.uid() = user_id OR public.is_admin_user())
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user());

-- A tabela base deixa de ser pública: vitrine e Mídia Kit leem somente a view abaixo.
DROP POLICY IF EXISTS "Perfis públicos visíveis para todos" ON public.professional_profiles;
-- (restam as policies "Profissional edita próprio perfil" e "Admin gere perfis profissionais")

-- View pública: apenas colunas seguras. Roda com os privilégios do dono (ignora RLS)
-- DE PROPÓSITO, por isso filtra is_public e usuários ACTIVE e nunca expõe telefone/PIX/CPF.
CREATE VIEW public.public_professional_profiles AS
SELECT
  p.id,
  p.username,
  u.full_name,
  u.avatar_url,
  p.headline,
  p.bio,
  p.cover_image_url,
  p.country,
  p.state_uf,
  p.city,
  p.amazon_territory_pole,
  p.niches,
  p.languages,
  p.extra_skills,
  p.instagram_handle,
  p.instagram_followers,
  p.tiktok_handle,
  p.tiktok_followers,
  p.youtube_handle,
  p.youtube_followers,
  p.pinterest_handle,
  p.pinterest_followers,
  p.starting_price,
  p.work_modality,
  p.is_available,
  p.is_verified,
  p.rating_avg,
  p.reviews_count,
  p.profile_completion_score,
  p.created_at
FROM public.professional_profiles p
JOIN public.users u ON u.id = p.user_id
WHERE p.is_public = TRUE AND u.status = 'ACTIVE';

GRANT SELECT ON public.public_professional_profiles TO anon, authenticated;

ALTER TABLE public.professional_profiles
  ADD CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]{3,30}$');

-- ----------------------------------------------------------------------------
-- 2. Limite de matches da empresa
-- ----------------------------------------------------------------------------
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS monthly_matches_limit INT DEFAULT 5;
UPDATE public.subscription_plans SET monthly_matches_limit = 5   WHERE slug = 'company-free';
UPDATE public.subscription_plans SET monthly_matches_limit = 999 WHERE slug = 'company-premium';
UPDATE public.subscription_plans SET monthly_matches_limit = 0   WHERE target_role = 'PROFESSIONAL'; -- n/a

-- ----------------------------------------------------------------------------
-- 3. Preço do plano Empresa Premium
-- ----------------------------------------------------------------------------
UPDATE public.subscription_plans SET price_monthly = 97.00 WHERE slug = 'company-premium';

-- ----------------------------------------------------------------------------
-- 4. profile_completion_score calculado no banco (fonte única da verdade)
--    Obrigatórios (6 x 13,33 = 80): foto, bio, 1+ categoria, cidade/UF, WhatsApp, 1+ portfólio
--    Opcionais (+20): alguma rede social (+10), nichos e preço inicial (+10)
--    Logo: score >= 80 <=> todos os obrigatórios preenchidos.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_profile_score(p_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prof public.professional_profiles%ROWTYPE;
  usr public.users%ROWTYPE;
  req INT := 0;
  score INT;
BEGIN
  SELECT * INTO prof FROM public.professional_profiles WHERE id = p_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT * INTO usr FROM public.users WHERE id = prof.user_id;

  IF COALESCE(usr.avatar_url, '') <> '' THEN req := req + 1; END IF;
  IF COALESCE(prof.bio, '') <> '' THEN req := req + 1; END IF;
  IF EXISTS (SELECT 1 FROM public.professional_categories WHERE professional_id = p_id) THEN req := req + 1; END IF;
  IF COALESCE(prof.city, '') <> '' AND COALESCE(prof.state_uf::text, '') <> '' THEN req := req + 1; END IF;
  IF COALESCE(usr.phone_whatsapp, '') <> '' THEN req := req + 1; END IF;
  IF EXISTS (SELECT 1 FROM public.portfolio_items WHERE professional_id = p_id) THEN req := req + 1; END IF;

  score := ROUND(80.0 * req / 6);
  IF COALESCE(prof.instagram_handle, '') <> '' OR COALESCE(prof.tiktok_handle, '') <> ''
     OR COALESCE(prof.youtube_handle, '') <> '' OR COALESCE(prof.pinterest_handle, '') <> '' THEN
    score := score + 10;
  END IF;
  IF COALESCE(array_length(prof.niches, 1), 0) > 0 AND COALESCE(prof.starting_price, 0) > 0 THEN
    score := score + 10;
  END IF;

  PERFORM set_config('app.score_update', '1', TRUE);
  UPDATE public.professional_profiles SET profile_completion_score = score WHERE id = p_id;
  PERFORM set_config('app.score_update', '0', TRUE);
  RETURN score;
END $$;

-- Colunas controladas pelo sistema não podem ser editadas pelo próprio profissional
CREATE OR REPLACE FUNCTION public.guard_professional_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.profile_completion_score := 0;
    NEW.is_verified := FALSE;
    NEW.rating_avg := 5.00;
    NEW.reviews_count := 0;
    RETURN NEW;
  END IF;
  IF COALESCE(current_setting('app.score_update', TRUE), '0') <> '1' THEN
    NEW.profile_completion_score := OLD.profile_completion_score;
  END IF;
  IF NOT public.is_admin_user() THEN
    NEW.is_verified := OLD.is_verified;
    NEW.rating_avg := OLD.rating_avg;
    NEW.reviews_count := OLD.reviews_count;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

CREATE TRIGGER professional_guard
  BEFORE INSERT OR UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_professional_columns();

-- Recalcula o score quando algo relevante muda
CREATE OR REPLACE FUNCTION public.trg_recompute_from_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_setting('app.score_update', TRUE), '0') = '1' THEN RETURN NULL; END IF;
  PERFORM public.recompute_profile_score(NEW.id);
  RETURN NULL;
END $$;

CREATE TRIGGER professional_score_after
  AFTER INSERT OR UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_profile();

CREATE OR REPLACE FUNCTION public.trg_recompute_from_child()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_profile_score(COALESCE(NEW.professional_id, OLD.professional_id));
  RETURN NULL;
END $$;

CREATE TRIGGER portfolio_score_after
  AFTER INSERT OR DELETE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_child();
CREATE TRIGGER categories_score_after
  AFTER INSERT OR DELETE ON public.professional_categories
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_child();

CREATE OR REPLACE FUNCTION public.trg_recompute_from_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid UUID;
BEGIN
  SELECT id INTO pid FROM public.professional_profiles WHERE user_id = NEW.id;
  IF pid IS NOT NULL THEN PERFORM public.recompute_profile_score(pid); END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER users_score_after
  AFTER UPDATE OF avatar_url, phone_whatsapp ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_user();

-- ----------------------------------------------------------------------------
-- 5. Trava de governança + cota de pacotes (regras 3 e 4 do SPEC) no banco
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_package_rules()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  score INT;
  uid UUID;
  lim INT;
  cnt INT;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN RETURN NEW; END IF;

  SELECT profile_completion_score, user_id INTO score, uid
  FROM public.professional_profiles WHERE id = NEW.professional_id;
  IF COALESCE(score, 0) < 80 THEN
    RAISE EXCEPTION 'PROFILE_INCOMPLETE' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(
    (SELECT sp.max_packages_limit
       FROM public.subscriptions s
       JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = uid AND sp.target_role = 'PROFESSIONAL'
        AND s.status IN ('ACTIVE', 'TRIAL') AND s.current_period_end > NOW()
      ORDER BY sp.price_monthly DESC LIMIT 1),
    (SELECT max_packages_limit FROM public.subscription_plans WHERE slug = 'prof-free'),
    2) INTO lim;

  SELECT COUNT(*) INTO cnt FROM public.service_packages
   WHERE professional_id = NEW.professional_id AND is_active
     AND (TG_OP = 'INSERT' OR id <> NEW.id);
  IF cnt >= lim THEN
    RAISE EXCEPTION 'PACKAGE_LIMIT_REACHED' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER packages_enforce_rules
  BEFORE INSERT OR UPDATE OF is_active ON public.service_packages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_package_rules();

-- ----------------------------------------------------------------------------
-- 6. Storage: bucket "media" (avatar e portfólio), pasta = id do usuário
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media', 'media', TRUE, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Mídia pública para leitura" ON storage.objects FOR SELECT
  USING (bucket_id = 'media');
CREATE POLICY "Usuário envia na própria pasta" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuário atualiza na própria pasta" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuário remove da própria pasta" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
