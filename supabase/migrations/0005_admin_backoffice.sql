-- ============================================================================
-- 0005 — Backoffice: policies e RPCs do admin, moderação efetiva e pedidos de upgrade
-- ============================================================================
-- Como virar admin (rode UMA vez no SQL Editor, trocando o e-mail):
--   UPDATE public.users SET is_admin = TRUE WHERE email = 'seu-email@exemplo.com';
-- ============================================================================

-- Admin enxerga/gere pacotes de qualquer profissional (inclusive inativos)
CREATE POLICY "Admin gere pacotes" ON public.service_packages FOR ALL
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "Admin gere portfólio" ON public.portfolio_items FOR ALL
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "Admin vê candidaturas" ON public.applications FOR SELECT USING (public.is_admin_user());
CREATE POLICY "Admin vê propostas" ON public.proposals FOR SELECT USING (public.is_admin_user());
CREATE POLICY "Admin vê dados privados" ON public.professional_private_data FOR SELECT USING (public.is_admin_user());

-- ----------------------------------------------------------------------------
-- Conta suspensa/pendente não cria nada novo (policies RESTRICTIVE só de INSERT)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT status = 'ACTIVE' FROM public.users WHERE id = auth.uid()), FALSE)
$$;

CREATE POLICY "Somente conta ativa cria matches" ON public.matches AS RESTRICTIVE FOR INSERT WITH CHECK (public.is_active_user());
CREATE POLICY "Somente conta ativa cria candidaturas" ON public.applications AS RESTRICTIVE FOR INSERT WITH CHECK (public.is_active_user());
CREATE POLICY "Somente conta ativa cria propostas" ON public.proposals AS RESTRICTIVE FOR INSERT WITH CHECK (public.is_active_user());
CREATE POLICY "Somente conta ativa cria campanhas" ON public.campaigns AS RESTRICTIVE FOR INSERT WITH CHECK (public.is_active_user());
CREATE POLICY "Somente conta ativa cria pacotes" ON public.service_packages AS RESTRICTIVE FOR INSERT WITH CHECK (public.is_active_user());

-- ----------------------------------------------------------------------------
-- Métricas globais
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_metrics()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN jsonb_build_object(
    'users',               (SELECT COUNT(*) FROM public.users),
    'professionals',       (SELECT COUNT(*) FROM public.professional_profiles),
    'companies',           (SELECT COUNT(*) FROM public.company_profiles),
    'open_campaigns',      (SELECT COUNT(*) FROM public.campaigns WHERE status = 'OPEN'),
    'active_packages',     (SELECT COUNT(*) FROM public.service_packages WHERE is_active),
    'mutual_matches',      (SELECT COUNT(*) FROM public.matches WHERE status = 'MUTUAL_MATCH'),
    'pending_matches',     (SELECT COUNT(*) FROM public.matches WHERE status = 'PENDING'),
    'contracts_total',     (SELECT COUNT(*) FROM public.contracts),
    'contracts_active',    (SELECT COUNT(*) FROM public.contracts WHERE status IN ('ACTIVE', 'DELIVERED')),
    'contracts_completed', (SELECT COUNT(*) FROM public.contracts WHERE status = 'COMPLETED'),
    'gmv_completed',       (SELECT COALESCE(SUM(agreed_amount), 0) FROM public.contracts WHERE status = 'COMPLETED'),
    'gmv_active',          (SELECT COALESCE(SUM(agreed_amount), 0) FROM public.contracts WHERE status IN ('ACTIVE', 'DELIVERED')),
    'pending_moderation',  (SELECT COUNT(*) FROM public.users WHERE status = 'PENDING_MODERATION'),
    'suspended',           (SELECT COUNT(*) FROM public.users WHERE status = 'SUSPENDED'),
    'paid_subscriptions',  (SELECT COUNT(*) FROM public.subscriptions s JOIN public.subscription_plans sp ON sp.id = s.plan_id
                             WHERE s.status IN ('ACTIVE', 'TRIAL') AND s.current_period_end > NOW() AND sp.price_monthly > 0)
  );
END $$;

-- ----------------------------------------------------------------------------
-- Moderação de conta: suspender também tira o conteúdo do ar
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_status(p_user UUID, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_status NOT IN ('PENDING_MODERATION', 'ACTIVE', 'SUSPENDED') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF p_user = auth.uid() AND p_status <> 'ACTIVE' THEN RAISE EXCEPTION 'CANNOT_MODERATE_SELF'; END IF;

  UPDATE public.users SET status = p_status::user_status, updated_at = NOW() WHERE id = p_user;

  IF p_status = 'SUSPENDED' THEN
    UPDATE public.campaigns SET status = 'CANCELLED', updated_at = NOW()
     WHERE status IN ('OPEN', 'DRAFT')
       AND company_id IN (SELECT id FROM public.company_profiles WHERE user_id = p_user);
    UPDATE public.service_packages SET is_active = FALSE, updated_at = NOW()
     WHERE is_active
       AND professional_id IN (SELECT id FROM public.professional_profiles WHERE user_id = p_user);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Troca manual de plano (prof-free <-> prof-pro, company-free <-> company-premium)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_plan(p_user UUID, p_plan_slug TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  plan public.subscription_plans%ROWTYPE;
  usr public.users%ROWTYPE;
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO plan FROM public.subscription_plans WHERE slug = p_plan_slug AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_NOT_FOUND'; END IF;
  SELECT * INTO usr FROM public.users WHERE id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF (plan.target_role = 'PROFESSIONAL' AND NOT usr.is_professional)
     OR (plan.target_role = 'COMPANY' AND NOT usr.is_company) THEN
    RAISE EXCEPTION 'ROLE_MISMATCH';
  END IF;

  -- encerra as assinaturas vigentes do mesmo tipo de plano
  UPDATE public.subscriptions s SET status = 'CANCELLED', updated_at = NOW()
   FROM public.subscription_plans sp
   WHERE s.plan_id = sp.id AND s.user_id = p_user AND sp.target_role = plan.target_role
     AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE');

  -- planos gratuitos não precisam de linha: a ausência de assinatura cai em *-free
  IF plan.price_monthly > 0 THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, external_gateway_ref)
    VALUES (p_user, plan.id, 'ACTIVE', NOW(), NOW() + INTERVAL '30 days', 'admin-manual');
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (p_user, 'Seu plano foi atualizado 🎉', 'Agora você está no plano ' || plan.name || '.',
            CASE WHEN plan.target_role = 'COMPANY' THEN '/empresa/plano' ELSE '/profissional/plano' END);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Pedido de upgrade: avisa todos os admins (ainda sem gateway de pagamento)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_upgrade(p_plan_slug TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  plan public.subscription_plans%ROWTYPE;
  usr public.users%ROWTYPE;
  body_text TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO plan FROM public.subscription_plans WHERE slug = p_plan_slug AND is_active AND price_monthly > 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_NOT_FOUND'; END IF;
  SELECT * INTO usr FROM public.users WHERE id = auth.uid();
  body_text := usr.full_name || ' (' || usr.email || ') pediu o plano ' || plan.name || '.';

  INSERT INTO public.notifications (user_id, title, body, action_url)
  SELECT a.id, 'Pedido de upgrade', body_text, '/admin/assinaturas'
    FROM public.users a
   WHERE a.is_admin
     AND NOT EXISTS (SELECT 1 FROM public.notifications n
                      WHERE n.user_id = a.id AND n.body = body_text AND n.created_at > NOW() - INTERVAL '1 day');
END $$;
