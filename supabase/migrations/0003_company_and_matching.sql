-- ============================================================================
-- 0003 — Ambiente da Empresa: busca, campanhas e proteção da tabela matches
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. View pública ganha: categorias, categoria principal e selo PRO
--    (colunas novas SEMPRE no final, exigência do CREATE OR REPLACE VIEW)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_professional_profiles AS
SELECT
  p.id, p.username, u.full_name, u.avatar_url, p.headline, p.bio, p.cover_image_url,
  p.country, p.state_uf, p.city, p.amazon_territory_pole, p.niches, p.languages, p.extra_skills,
  p.instagram_handle, p.instagram_followers, p.tiktok_handle, p.tiktok_followers,
  p.youtube_handle, p.youtube_followers, p.pinterest_handle, p.pinterest_followers,
  p.starting_price, p.work_modality, p.is_available, p.is_verified, p.rating_avg, p.reviews_count,
  p.profile_completion_score, p.created_at,
  (SELECT COALESCE(array_agg(pc.category_id), '{}'::uuid[])
     FROM public.professional_categories pc WHERE pc.professional_id = p.id) AS category_ids,
  (SELECT COALESCE(array_agg(c.name ORDER BY pc.is_primary DESC, c.display_order), '{}'::text[])
     FROM public.professional_categories pc JOIN public.categories c ON c.id = pc.category_id
    WHERE pc.professional_id = p.id) AS category_names,
  (SELECT pc.category_id FROM public.professional_categories pc
    WHERE pc.professional_id = p.id AND pc.is_primary LIMIT 1) AS primary_category_id,
  EXISTS (SELECT 1 FROM public.subscriptions s
            JOIN public.subscription_plans sp ON sp.id = s.plan_id
           WHERE s.user_id = p.user_id AND sp.target_role = 'PROFESSIONAL' AND sp.featured_profile
             AND s.status IN ('ACTIVE', 'TRIAL') AND s.current_period_end > NOW()) AS is_pro
FROM public.professional_profiles p
JOIN public.users u ON u.id = p.user_id
WHERE p.is_public = TRUE AND u.status = 'ACTIVE';

GRANT SELECT ON public.public_professional_profiles TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Empresa: só admin altera is_verified
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_company_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.is_verified := FALSE;
    RETURN NEW;
  END IF;
  IF NOT public.is_admin_user() THEN NEW.is_verified := OLD.is_verified; END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

CREATE TRIGGER company_guard
  BEFORE INSERT OR UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_company_columns();

-- ----------------------------------------------------------------------------
-- 3. Campanhas: rascunhos não vazam, vagas coerentes e cota de campanhas abertas
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Campanhas abertas visíveis para autenticados" ON public.campaigns;
CREATE POLICY "Campanhas abertas visíveis para autenticados" ON public.campaigns
  FOR SELECT USING (auth.role() = 'authenticated' AND status = 'OPEN');

ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_slots_valid CHECK (slots_total >= 1 AND slots_filled >= 0 AND slots_filled <= slots_total);

CREATE OR REPLACE FUNCTION public.enforce_campaign_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID;
  lim INT;
  cnt INT;
BEGIN
  IF NEW.status <> 'OPEN' THEN RETURN NEW; END IF;
  SELECT user_id INTO uid FROM public.company_profiles WHERE id = NEW.company_id;

  SELECT COALESCE(
    (SELECT sp.active_campaigns_limit
       FROM public.subscriptions s JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = uid AND sp.target_role = 'COMPANY'
        AND s.status IN ('ACTIVE', 'TRIAL') AND s.current_period_end > NOW()
      ORDER BY sp.price_monthly DESC LIMIT 1),
    (SELECT active_campaigns_limit FROM public.subscription_plans WHERE slug = 'company-free'),
    1) INTO lim;

  SELECT COUNT(*) INTO cnt FROM public.campaigns
   WHERE company_id = NEW.company_id AND status = 'OPEN'
     AND (TG_OP = 'INSERT' OR id <> NEW.id);
  IF cnt >= lim THEN
    RAISE EXCEPTION 'CAMPAIGN_LIMIT_REACHED' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER campaigns_enforce_limit
  BEFORE INSERT OR UPDATE OF status ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_limit();

-- ----------------------------------------------------------------------------
-- 4. MATCHES: a policy do 0001 deixava o cliente se auto-aprovar (status/WhatsApp).
--    Agora o banco decide o status; cada lado só mexe no próprio interesse.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX uq_matches_open ON public.matches (
  company_id, professional_id,
  COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(service_package_id, '00000000-0000-0000-0000-000000000000'::uuid)
) WHERE status IN ('PENDING', 'MUTUAL_MATCH');

CREATE OR REPLACE FUNCTION public.guard_match_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp_user UUID;
  prof_user UUID;
  lim INT;
  cnt INT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- SQL editor / service role

  SELECT user_id INTO comp_user FROM public.company_profiles WHERE id = NEW.company_id;
  SELECT user_id INTO prof_user FROM public.professional_profiles WHERE id = NEW.professional_id;
  IF comp_user IS NULL OR prof_user IS NULL THEN RAISE EXCEPTION 'INVALID_PARTIES'; END IF;
  IF comp_user = prof_user THEN RAISE EXCEPTION 'SELF_MATCH'; END IF;

  IF auth.uid() = comp_user THEN
    NEW.initiated_by := 'COMPANY';
    NEW.company_interested := TRUE;
    NEW.professional_interested := FALSE;

    SELECT COALESCE(
      (SELECT sp.monthly_matches_limit
         FROM public.subscriptions s JOIN public.subscription_plans sp ON sp.id = s.plan_id
        WHERE s.user_id = comp_user AND sp.target_role = 'COMPANY'
          AND s.status IN ('ACTIVE', 'TRIAL') AND s.current_period_end > NOW()
        ORDER BY sp.price_monthly DESC LIMIT 1),
      (SELECT monthly_matches_limit FROM public.subscription_plans WHERE slug = 'company-free'),
      5) INTO lim;
    SELECT COUNT(*) INTO cnt FROM public.matches
     WHERE company_id = NEW.company_id AND initiated_by = 'COMPANY'
       AND created_at >= date_trunc('month', NOW());
    IF cnt >= lim THEN RAISE EXCEPTION 'MATCH_LIMIT_REACHED' USING ERRCODE = 'P0001'; END IF;
  ELSIF auth.uid() = prof_user THEN
    NEW.initiated_by := 'PROFESSIONAL';
    NEW.professional_interested := TRUE;
    NEW.company_interested := FALSE;
  ELSE
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  NEW.status := 'PENDING';
  NEW.whatsapp_unlocked := FALSE;
  NEW.matched_at := NULL;

  IF NEW.service_package_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_packages WHERE id = NEW.service_package_id AND professional_id = NEW.professional_id
  ) THEN RAISE EXCEPTION 'INVALID_PACKAGE'; END IF;
  IF NEW.campaign_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.campaigns WHERE id = NEW.campaign_id AND company_id = NEW.company_id
  ) THEN RAISE EXCEPTION 'INVALID_CAMPAIGN'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER matches_guard_insert
  BEFORE INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.guard_match_insert();

CREATE OR REPLACE FUNCTION public.guard_match_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp_user UUID;
  prof_user UUID;
  is_comp BOOLEAN;
  is_prof BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_user() THEN RETURN NEW; END IF;

  SELECT user_id INTO comp_user FROM public.company_profiles WHERE id = OLD.company_id;
  SELECT user_id INTO prof_user FROM public.professional_profiles WHERE id = OLD.professional_id;
  is_comp := (auth.uid() = comp_user);
  is_prof := (auth.uid() = prof_user);
  IF NOT (is_comp OR is_prof) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  NEW.company_id := OLD.company_id;
  NEW.professional_id := OLD.professional_id;
  NEW.campaign_id := OLD.campaign_id;
  NEW.service_package_id := OLD.service_package_id;
  NEW.initiated_by := OLD.initiated_by;
  NEW.matched_at := OLD.matched_at;
  NEW.whatsapp_unlocked := OLD.whatsapp_unlocked;
  IF NOT is_comp THEN NEW.company_interested := OLD.company_interested; END IF;
  IF NOT is_prof THEN NEW.professional_interested := OLD.professional_interested; END IF;

  IF OLD.status <> 'PENDING' THEN
    -- match já finalizado: congela tudo
    NEW.status := OLD.status;
    NEW.company_interested := OLD.company_interested;
    NEW.professional_interested := OLD.professional_interested;
  ELSIF NEW.status = 'DECLINED' THEN
    NULL; -- qualquer lado pode recusar
  ELSIF NEW.company_interested AND NEW.professional_interested THEN
    NEW.status := 'MUTUAL_MATCH';
    NEW.matched_at := NOW();
    NEW.whatsapp_unlocked := TRUE;
  ELSE
    NEW.status := 'PENDING'; -- EXPIRED só pelo sistema/admin
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

CREATE TRIGGER matches_guard_update
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.guard_match_update();

-- Notifica a outra parte quando alguém demonstra interesse
CREATE OR REPLACE FUNCTION public.notify_match_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp_user UUID;
  prof_user UUID;
  comp_name TEXT;
  prof_name TEXT;
BEGIN
  SELECT user_id, company_name INTO comp_user, comp_name FROM public.company_profiles WHERE id = NEW.company_id;
  SELECT p.user_id, u.full_name INTO prof_user, prof_name
    FROM public.professional_profiles p JOIN public.users u ON u.id = p.user_id WHERE p.id = NEW.professional_id;

  IF NEW.initiated_by = 'COMPANY' THEN
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (prof_user, 'Nova empresa interessada', comp_name || ' demonstrou interesse no seu trabalho.', '/profissional/matches');
  ELSE
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (comp_user, 'Novo profissional interessado', prof_name || ' demonstrou interesse na sua oportunidade.', '/empresa/matches');
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER matches_notify_created
  AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.notify_match_created();
