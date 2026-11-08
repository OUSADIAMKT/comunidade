-- ============================================================================
-- 0004 — Candidaturas, match bidirecional, propostas, contratos e avaliação
-- Princípio: o banco é a fonte da verdade. O cliente só pede; os triggers decidem.
-- Flags transitórias (set_config local à transação, não acessíveis pelo cliente):
--   app.match_system, app.contract_system, app.rating_update
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Ajustes em funções do 0002/0003 para aceitar as flags de sistema
-- ----------------------------------------------------------------------------
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
    IF COALESCE(current_setting('app.rating_update', TRUE), '0') <> '1' THEN
      NEW.rating_avg := OLD.rating_avg;
      NEW.reviews_count := OLD.reviews_count;
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.guard_match_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp_user UUID;
  prof_user UUID;
  lim INT;
  cnt INT;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(current_setting('app.match_system', TRUE), '0') = '1' THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.guard_match_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp_user UUID;
  prof_user UUID;
  is_comp BOOLEAN;
  is_prof BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_user()
     OR COALESCE(current_setting('app.match_system', TRUE), '0') = '1' THEN
    RETURN NEW;
  END IF;

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
    NEW.status := OLD.status;
    NEW.company_interested := OLD.company_interested;
    NEW.professional_interested := OLD.professional_interested;
  ELSIF NEW.status = 'DECLINED' THEN
    NULL;
  ELSIF NEW.company_interested AND NEW.professional_interested THEN
    NEW.status := 'MUTUAL_MATCH';
    NEW.matched_at := NOW();
    NEW.whatsapp_unlocked := TRUE;
  ELSE
    NEW.status := 'PENDING';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

-- notificação de criação só quando NÃO veio do fluxo de aprovação de candidatura
CREATE OR REPLACE FUNCTION public.notify_match_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp_user UUID; prof_user UUID; comp_name TEXT; prof_name TEXT;
BEGIN
  IF COALESCE(current_setting('app.match_system', TRUE), '0') = '1' THEN RETURN NULL; END IF;
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

-- Aceite / recusa de interesse: avisa quem iniciou
CREATE OR REPLACE FUNCTION public.notify_match_response()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp_user UUID; prof_user UUID; comp_name TEXT; prof_name TEXT;
BEGIN
  IF COALESCE(current_setting('app.match_system', TRUE), '0') = '1' THEN RETURN NULL; END IF;
  IF OLD.status <> 'PENDING' OR NEW.status NOT IN ('MUTUAL_MATCH', 'DECLINED') THEN RETURN NULL; END IF;
  SELECT user_id, company_name INTO comp_user, comp_name FROM public.company_profiles WHERE id = NEW.company_id;
  SELECT p.user_id, u.full_name INTO prof_user, prof_name
    FROM public.professional_profiles p JOIN public.users u ON u.id = p.user_id WHERE p.id = NEW.professional_id;

  IF NEW.status = 'MUTUAL_MATCH' THEN
    INSERT INTO public.notifications (user_id, title, body, action_url) VALUES
      (comp_user, 'Deu match!', prof_name || ' aceitou o contato. O WhatsApp foi liberado.', '/empresa/matches'),
      (prof_user, 'Deu match!', 'Você e ' || comp_name || ' deram match. O WhatsApp foi liberado.', '/profissional/matches');
  ELSIF NEW.initiated_by = 'COMPANY' THEN
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (comp_user, 'Interesse recusado', prof_name || ' não está disponível agora.', '/empresa/matches');
  ELSE
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (prof_user, 'Interesse recusado', comp_name || ' recusou o contato.', '/profissional/matches');
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER matches_notify_response
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.notify_match_response();

-- ----------------------------------------------------------------------------
-- 1. CANDIDATURAS
-- ----------------------------------------------------------------------------
-- o profissional precisa enxergar campanhas nas quais se candidatou, mesmo fechadas
CREATE POLICY "Profissional vê campanhas em que se candidatou" ON public.campaigns FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.applications a
            JOIN public.professional_profiles p ON p.id = a.professional_id
           WHERE a.campaign_id = campaigns.id AND p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_application_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prof_user UUID;
  score INT;
  camp public.campaigns%ROWTYPE;
  comp_user UUID;
  lim INT;
  cnt INT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  SELECT user_id, profile_completion_score INTO prof_user, score
    FROM public.professional_profiles WHERE id = NEW.professional_id;
  IF prof_user IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF COALESCE(score, 0) < 80 THEN RAISE EXCEPTION 'PROFILE_INCOMPLETE' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO camp FROM public.campaigns WHERE id = NEW.campaign_id;
  IF NOT FOUND OR camp.status <> 'OPEN' OR (camp.expires_at IS NOT NULL AND camp.expires_at < NOW()) THEN
    RAISE EXCEPTION 'CAMPAIGN_CLOSED' USING ERRCODE = 'P0001';
  END IF;
  IF camp.slots_filled >= camp.slots_total THEN RAISE EXCEPTION 'CAMPAIGN_FULL' USING ERRCODE = 'P0001'; END IF;

  SELECT user_id INTO comp_user FROM public.company_profiles WHERE id = camp.company_id;
  IF comp_user = auth.uid() THEN RAISE EXCEPTION 'SELF_APPLICATION'; END IF;

  SELECT COALESCE(
    (SELECT sp.monthly_applications_limit
       FROM public.subscriptions s JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = prof_user AND sp.target_role = 'PROFESSIONAL'
        AND s.status IN ('ACTIVE', 'TRIAL') AND s.current_period_end > NOW()
      ORDER BY sp.price_monthly DESC LIMIT 1),
    (SELECT monthly_applications_limit FROM public.subscription_plans WHERE slug = 'prof-free'),
    5) INTO lim;
  SELECT COUNT(*) INTO cnt FROM public.applications
   WHERE professional_id = NEW.professional_id AND created_at >= date_trunc('month', NOW());
  IF cnt >= lim THEN RAISE EXCEPTION 'APPLICATION_LIMIT_REACHED' USING ERRCODE = 'P0001'; END IF;

  NEW.status := 'PENDING';
  RETURN NEW;
END $$;

CREATE TRIGGER applications_guard_insert
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_application_insert();

CREATE OR REPLACE FUNCTION public.guard_application_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp_user UUID;
  prof_user UUID;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_user() THEN RETURN NEW; END IF;

  SELECT c.user_id INTO comp_user
    FROM public.campaigns ca JOIN public.company_profiles c ON c.id = ca.company_id WHERE ca.id = OLD.campaign_id;
  SELECT user_id INTO prof_user FROM public.professional_profiles WHERE id = OLD.professional_id;

  NEW.campaign_id := OLD.campaign_id;
  NEW.professional_id := OLD.professional_id;

  IF auth.uid() = comp_user THEN
    NEW.pitch_message := OLD.pitch_message;
    NEW.proposed_value := OLD.proposed_value;
    IF OLD.status = 'APPROVED' OR NEW.status = 'PENDING' THEN NEW.status := OLD.status; END IF;
  ELSIF auth.uid() = prof_user THEN
    NEW.status := OLD.status;
    IF OLD.status <> 'PENDING' THEN
      NEW.pitch_message := OLD.pitch_message;
      NEW.proposed_value := OLD.proposed_value;
    END IF;
  ELSE
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

CREATE TRIGGER applications_guard_update
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_application_update();

-- Efeitos da triagem: APPROVED => MUTUAL_MATCH + vaga preenchida; avisos
CREATE OR REPLACE FUNCTION public.application_status_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  camp public.campaigns%ROWTYPE;
  prof_user UUID;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NULL; END IF;
  SELECT * INTO camp FROM public.campaigns WHERE id = NEW.campaign_id;
  SELECT user_id INTO prof_user FROM public.professional_profiles WHERE id = NEW.professional_id;

  IF NEW.status = 'APPROVED' THEN
    IF camp.slots_filled >= camp.slots_total THEN RAISE EXCEPTION 'CAMPAIGN_FULL' USING ERRCODE = 'P0001'; END IF;

    PERFORM set_config('app.match_system', '1', TRUE);
    UPDATE public.matches
       SET company_interested = TRUE, professional_interested = TRUE, status = 'MUTUAL_MATCH',
           matched_at = NOW(), whatsapp_unlocked = TRUE, updated_at = NOW()
     WHERE company_id = camp.company_id AND professional_id = NEW.professional_id
       AND campaign_id = NEW.campaign_id AND status IN ('PENDING', 'MUTUAL_MATCH');
    IF NOT FOUND THEN
      INSERT INTO public.matches (company_id, professional_id, campaign_id, initiated_by, initial_message,
                                  company_interested, professional_interested, status, whatsapp_unlocked, matched_at)
      VALUES (camp.company_id, NEW.professional_id, NEW.campaign_id, 'PROFESSIONAL', NEW.pitch_message,
              TRUE, TRUE, 'MUTUAL_MATCH', TRUE, NOW());
    END IF;
    PERFORM set_config('app.match_system', '0', TRUE);

    UPDATE public.campaigns
       SET slots_filled = slots_filled + 1,
           status = CASE WHEN slots_filled + 1 >= slots_total AND status = 'OPEN' THEN 'IN_PROGRESS' ELSE status END,
           updated_at = NOW()
     WHERE id = camp.id;

    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (prof_user, 'Candidatura aprovada! 🎉', 'Você foi aprovado em "' || camp.title || '". O WhatsApp foi liberado.', '/profissional/matches');
  ELSIF NEW.status = 'SHORTLISTED' THEN
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (prof_user, 'Você está na lista curta', 'A empresa pré-selecionou você em "' || camp.title || '".', '/profissional/oportunidades');
  ELSIF NEW.status = 'REJECTED' THEN
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (prof_user, 'Candidatura não selecionada', 'Desta vez não foi em "' || camp.title || '". Continue se candidatando!', '/profissional/oportunidades');
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER applications_status_effects
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.application_status_effects();

CREATE OR REPLACE FUNCTION public.notify_application_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp_user UUID; camp_title TEXT; prof_name TEXT;
BEGIN
  SELECT c.user_id, ca.title INTO comp_user, camp_title
    FROM public.campaigns ca JOIN public.company_profiles c ON c.id = ca.company_id WHERE ca.id = NEW.campaign_id;
  SELECT u.full_name INTO prof_name
    FROM public.professional_profiles p JOIN public.users u ON u.id = p.user_id WHERE p.id = NEW.professional_id;
  INSERT INTO public.notifications (user_id, title, body, action_url)
  VALUES (comp_user, 'Nova candidatura', prof_name || ' se candidatou a "' || camp_title || '".', '/empresa/oportunidades/' || NEW.campaign_id);
  RETURN NULL;
END $$;

CREATE TRIGGER applications_notify_created
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_created();

-- ----------------------------------------------------------------------------
-- 2. PROPOSTAS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_proposal_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m public.matches%ROWTYPE;
  comp_user UUID;
  prof_user UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO m FROM public.matches WHERE id = NEW.match_id;
  IF NOT FOUND OR m.status <> 'MUTUAL_MATCH' THEN RAISE EXCEPTION 'MATCH_NOT_CONFIRMED' USING ERRCODE = 'P0001'; END IF;
  SELECT user_id INTO comp_user FROM public.company_profiles WHERE id = m.company_id;
  SELECT user_id INTO prof_user FROM public.professional_profiles WHERE id = m.professional_id;
  IF auth.uid() NOT IN (comp_user, prof_user) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF EXISTS (SELECT 1 FROM public.contracts WHERE match_id = NEW.match_id AND status IN ('ACTIVE', 'DELIVERED')) THEN
    RAISE EXCEPTION 'CONTRACT_EXISTS' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.proposed_amount <= 0 OR NEW.delivery_days < 1 THEN RAISE EXCEPTION 'INVALID_PROPOSAL'; END IF;
  NEW.sender_user_id := auth.uid();
  NEW.status := 'SENT';
  RETURN NEW;
END $$;

CREATE TRIGGER proposals_guard_insert
  BEFORE INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.guard_proposal_insert();

CREATE OR REPLACE FUNCTION public.guard_proposal_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m public.matches%ROWTYPE;
  comp_user UUID;
  prof_user UUID;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_user() THEN RETURN NEW; END IF;
  SELECT * INTO m FROM public.matches WHERE id = OLD.match_id;
  SELECT user_id INTO comp_user FROM public.company_profiles WHERE id = m.company_id;
  SELECT user_id INTO prof_user FROM public.professional_profiles WHERE id = m.professional_id;
  IF auth.uid() NOT IN (comp_user, prof_user) OR auth.uid() = OLD.sender_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN'; -- só o destinatário responde
  END IF;

  NEW.match_id := OLD.match_id;
  NEW.sender_user_id := OLD.sender_user_id;
  NEW.scope_description := OLD.scope_description;
  NEW.proposed_amount := OLD.proposed_amount;
  NEW.delivery_days := OLD.delivery_days;
  IF OLD.status <> 'SENT' OR NEW.status NOT IN ('ACCEPTED', 'DECLINED', 'COUNTER_OFFER') THEN
    NEW.status := OLD.status;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

CREATE TRIGGER proposals_guard_update
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.guard_proposal_update();

CREATE OR REPLACE FUNCTION public.block_client_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_user() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER proposals_block_delete BEFORE DELETE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.block_client_delete();
CREATE TRIGGER contracts_block_delete BEFORE DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.block_client_delete();

-- Proposta aceita => contrato. Avisos de envio/resposta.
CREATE UNIQUE INDEX uq_contracts_active ON public.contracts (match_id) WHERE status IN ('ACTIVE', 'DELIVERED');

CREATE OR REPLACE FUNCTION public.proposal_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m public.matches%ROWTYPE;
  comp_user UUID;
  prof_user UUID;
  other_user UUID;
  title TEXT;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = NEW.match_id;
  SELECT user_id INTO comp_user FROM public.company_profiles WHERE id = m.company_id;
  SELECT user_id INTO prof_user FROM public.professional_profiles WHERE id = m.professional_id;

  IF TG_OP = 'INSERT' THEN
    other_user := CASE WHEN NEW.sender_user_id = comp_user THEN prof_user ELSE comp_user END;
    INSERT INTO public.notifications (user_id, title, body, action_url) VALUES (
      other_user, 'Nova proposta', 'Você recebeu uma proposta de R$ ' || to_char(NEW.proposed_amount, 'FM999G999G990D00'),
      CASE WHEN other_user = comp_user THEN '/empresa/contratacoes' ELSE '/profissional/propostas' END);
    RETURN NULL;
  END IF;

  IF NEW.status = OLD.status THEN RETURN NULL; END IF;

  IF NEW.status = 'ACCEPTED' THEN
    SELECT COALESCE(
      (SELECT ca.title FROM public.campaigns ca WHERE ca.id = m.campaign_id),
      (SELECT sp.title FROM public.service_packages sp WHERE sp.id = m.service_package_id),
      'Contratação de serviço') INTO title;
    PERFORM set_config('app.contract_system', '1', TRUE);
    INSERT INTO public.contracts (match_id, proposal_id, company_id, professional_id, title, agreed_amount)
    VALUES (m.id, NEW.id, m.company_id, m.professional_id, title, NEW.proposed_amount);
    PERFORM set_config('app.contract_system', '0', TRUE);
  END IF;

  other_user := NEW.sender_user_id; -- avisa quem enviou
  INSERT INTO public.notifications (user_id, title, body, action_url) VALUES (
    other_user,
    CASE NEW.status WHEN 'ACCEPTED' THEN 'Proposta aceita! 🎉' WHEN 'DECLINED' THEN 'Proposta recusada' ELSE 'Contraproposta recebida' END,
    'Atualização na sua proposta de R$ ' || to_char(NEW.proposed_amount, 'FM999G999G990D00'),
    CASE WHEN other_user = comp_user THEN '/empresa/contratacoes' ELSE '/profissional/propostas' END);
  RETURN NULL;
END $$;

CREATE TRIGGER proposals_after_insert AFTER INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.proposal_effects();
CREATE TRIGGER proposals_after_update AFTER UPDATE OF status ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.proposal_effects();

-- ----------------------------------------------------------------------------
-- 3. CONTRATOS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_contract_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_user()
     AND COALESCE(current_setting('app.contract_system', TRUE), '0') <> '1' THEN
    RAISE EXCEPTION 'FORBIDDEN'; -- contratos só nascem de uma proposta aceita
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER contracts_guard_insert BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.guard_contract_insert();

CREATE OR REPLACE FUNCTION public.guard_contract_update()
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

  -- estados finais são imutáveis
  IF OLD.status IN ('COMPLETED', 'CANCELLED', 'DISPUTED') THEN RETURN OLD; END IF;

  NEW.match_id := OLD.match_id;
  NEW.proposal_id := OLD.proposal_id;
  NEW.company_id := OLD.company_id;
  NEW.professional_id := OLD.professional_id;
  NEW.title := OLD.title;
  NEW.agreed_amount := OLD.agreed_amount;
  NEW.completed_at := OLD.completed_at;

  IF is_prof THEN
    NEW.company_rating := OLD.company_rating;
    NEW.company_review := OLD.company_review;
    IF NEW.status = 'DELIVERED' THEN
      IF COALESCE(NEW.delivery_link, '') = '' THEN RAISE EXCEPTION 'DELIVERY_REQUIRED' USING ERRCODE = 'P0001'; END IF;
    ELSIF NEW.status <> 'CANCELLED' THEN
      NEW.status := OLD.status;
    END IF;
  ELSE
    NEW.delivery_link := OLD.delivery_link;
    NEW.delivery_notes := OLD.delivery_notes;
    IF NEW.status = 'COMPLETED' THEN
      IF OLD.status <> 'DELIVERED' THEN RAISE EXCEPTION 'NOT_DELIVERED' USING ERRCODE = 'P0001'; END IF;
      IF NEW.company_rating IS NULL THEN RAISE EXCEPTION 'RATING_REQUIRED' USING ERRCODE = 'P0001'; END IF;
      NEW.completed_at := NOW();
    ELSIF NEW.status = 'ACTIVE' AND OLD.status = 'DELIVERED' THEN
      NEW.company_rating := OLD.company_rating;
      NEW.company_review := OLD.company_review;
    ELSIF NEW.status = 'CANCELLED' THEN
      NEW.company_rating := OLD.company_rating;
      NEW.company_review := OLD.company_review;
    ELSE
      NEW.status := OLD.status;
      NEW.company_rating := OLD.company_rating;
      NEW.company_review := OLD.company_review;
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

CREATE TRIGGER contracts_guard_update BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.guard_contract_update();

-- Conclusão => atualiza nota média e nº de avaliações do profissional; demais avisos
CREATE OR REPLACE FUNCTION public.contract_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comp_user UUID;
  prof_user UUID;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NULL; END IF;
  SELECT user_id INTO comp_user FROM public.company_profiles WHERE id = NEW.company_id;
  SELECT user_id INTO prof_user FROM public.professional_profiles WHERE id = NEW.professional_id;

  IF NEW.status = 'COMPLETED' AND NEW.company_rating IS NOT NULL THEN
    PERFORM set_config('app.rating_update', '1', TRUE);
    UPDATE public.professional_profiles p
       SET rating_avg = s.avg_rating, reviews_count = s.cnt
      FROM (SELECT ROUND(AVG(company_rating)::numeric, 2) AS avg_rating, COUNT(*)::int AS cnt
              FROM public.contracts
             WHERE professional_id = NEW.professional_id AND status = 'COMPLETED' AND company_rating IS NOT NULL) s
     WHERE p.id = NEW.professional_id;
    PERFORM set_config('app.rating_update', '0', TRUE);
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (prof_user, 'Contrato concluído ⭐', 'Você recebeu ' || NEW.company_rating || ' estrela(s) em "' || NEW.title || '".', '/profissional/propostas');
  ELSIF NEW.status = 'DELIVERED' THEN
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (comp_user, 'Entrega enviada', 'O profissional enviou a entrega de "' || NEW.title || '".', '/empresa/contratacoes');
  ELSIF NEW.status = 'ACTIVE' AND OLD.status = 'DELIVERED' THEN
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (prof_user, 'Ajustes solicitados', 'A empresa pediu ajustes em "' || NEW.title || '".', '/profissional/propostas');
  ELSIF NEW.status = 'CANCELLED' THEN
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (CASE WHEN auth.uid() = comp_user THEN prof_user ELSE comp_user END,
            'Contrato cancelado', '"' || NEW.title || '" foi cancelado.',
            CASE WHEN auth.uid() = comp_user THEN '/profissional/propostas' ELSE '/empresa/contratacoes' END);
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER contracts_after_update AFTER UPDATE OF status ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.contract_effects();
