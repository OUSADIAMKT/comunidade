-- ============================================================================
-- FULL_SETUP.sql — Creators da Amazônia
-- Gerado por "npm run db:bundle". NÃO edite à mão: edite as migrations e gere de novo.
--
-- Conteúdo, em ordem: 0001_initial_schema.sql, 0002_security_and_plans_fix.sql, 0003_company_and_matching.sql, 0004_applications_matches_contracts.sql, 0005_admin_backoffice.sql, 0006_escola_comunidade.sql, 0007_avaliacoes_e_certificado_sem_prova.sql, 0008_tres_especialidades.sql, 0009_desativar_plano_pro_creators.sql, 0010_hardening_pre_lancamento.sql, seed.sql
--
-- COMO USAR: cole TUDO no SQL Editor do Supabase e rode UMA vez, em um projeto novo/vazio.
-- Tudo roda em uma transação: se algo falhar, nada é aplicado e você vê o erro.
-- Depois, vire admin (trocando o e-mail):
--   UPDATE public.users SET is_admin = TRUE WHERE email = 'seu-email@exemplo.com';
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- >>> 0001_initial_schema.sql
-- ---------------------------------------------------------------------------
-- ============================================================================
-- EXTENSÕES E ENUMS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_status AS ENUM ('PENDING_MODERATION', 'ACTIVE', 'SUSPENDED');
CREATE TYPE compensation_type AS ENUM ('PAID', 'BARTER', 'HYBRID', 'COMMISSION');
CREATE TYPE work_modality AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');
CREATE TYPE campaign_status AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE application_status AS ENUM ('PENDING', 'SHORTLISTED', 'APPROVED', 'REJECTED');
CREATE TYPE match_initiator AS ENUM ('COMPANY', 'PROFESSIONAL');
CREATE TYPE match_status AS ENUM ('PENDING', 'MUTUAL_MATCH', 'DECLINED', 'EXPIRED');
CREATE TYPE proposal_status AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'COUNTER_OFFER');
CREATE TYPE contract_status AS ENUM ('ACTIVE', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED');
CREATE TYPE plan_target AS ENUM ('PROFESSIONAL', 'COMPANY');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIAL');

-- ============================================================================
-- 1. USERS (Autenticação, Papéis e Governança LGPD)
-- ============================================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone_whatsapp TEXT,
  -- Flags Multi-Papel (permite que a mesma conta seja Profissional e Empresa)
  is_professional BOOLEAN DEFAULT FALSE,
  is_company BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  active_context TEXT DEFAULT 'PROFESSIONAL' CHECK (active_context IN ('PROFESSIONAL', 'COMPANY', 'ADMIN')),
  status user_status DEFAULT 'ACTIVE',
  terms_accepted_at TIMESTAMPTZ,
  privacy_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CATEGORIES (As 11 Categorias da Economia Criativa)
-- ============================================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. SERVICES (Catálogo de Serviços Padronizados por Categoria)
-- ============================================================================
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  suggested_min_price NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. PROFESSIONAL_PROFILES (Dados do Talento / Lado A)
-- ============================================================================
CREATE TABLE public.professional_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  headline TEXT, -- Ex: "UGC Creator | Videomaker | Social Media"
  bio TEXT,
  cover_image_url TEXT,
  cpf_cnpj TEXT,
  birth_date DATE,
  gender TEXT,
  -- Localização Escalável (Brasil inteiro + Recorte Amazônico opcional)
  country TEXT DEFAULT 'BR',
  state_uf CHAR(2) NOT NULL, -- Ex: 'PA', 'AM', 'SP'
  city TEXT NOT NULL,        -- Ex: 'Altamira', 'Santarém', 'Belém'
  amazon_territory_pole TEXT, -- Ex: 'Xingu / Transamazônica', 'Tapajós', 'Metropolitana de Belém'
  -- Nichos de atuação e especialidades (ex: ['Beleza', 'Bioeconomia', 'Turismo'])
  niches TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT ARRAY['Português'],
  extra_skills TEXT[] DEFAULT '{}',
  -- Redes Sociais Declaradas
  instagram_handle TEXT,
  instagram_followers INT DEFAULT 0,
  tiktok_handle TEXT,
  tiktok_followers INT DEFAULT 0,
  youtube_handle TEXT,
  youtube_followers INT DEFAULT 0,
  pinterest_handle TEXT,
  pinterest_followers INT DEFAULT 0,
  -- Operação e Preço Base
  starting_price NUMERIC(10,2) DEFAULT 0, -- "A partir de R$ X" exibido no card de Match
  work_modality work_modality DEFAULT 'HYBRID',
  is_available BOOLEAN DEFAULT TRUE,
  profile_completion_score INT DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  rating_avg NUMERIC(3,2) DEFAULT 5.00,
  reviews_count INT DEFAULT 0,
  -- Dados Bancários / Pix (Informativo para fechamento direto)
  pix_key TEXT,
  bank_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. PROFESSIONAL_CATEGORIES (Relação N:N — Multi-Profissão)
-- ============================================================================
CREATE TABLE public.professional_categories (
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  experience_years INT DEFAULT 1,
  PRIMARY KEY (professional_id, category_id)
);

-- ============================================================================
-- 6. SERVICE_PACKAGES (Pacotes Comerciais Estilo 20Pila)
-- ============================================================================
CREATE TABLE public.service_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  title TEXT NOT NULL, -- Ex: "1 Vídeo UGC de Produto" ou "5 Artes para Instagram"
  description TEXT NOT NULL,
  deliverables_summary TEXT, -- Ex: "Vídeo vertical 9:16 até 60s editado + bruto"
  price NUMERIC(10,2) NOT NULL,
  delivery_days INT NOT NULL DEFAULT 7,
  revisions_included INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. PORTFOLIO_ITEMS (Trabalhos, Vídeos e Cases do Profissional)
-- ============================================================================
CREATE TABLE public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  brand_name TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('VIDEO', 'IMAGE', 'EXTERNAL_LINK')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. COMPANY_PROFILES (Dados das Empresas / Lado B)
-- ============================================================================
CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  trade_name TEXT,
  slug TEXT UNIQUE NOT NULL,
  cnpj TEXT,
  logo_url TEXT,
  website_url TEXT,
  instagram_handle TEXT,
  sector_niche TEXT NOT NULL, -- Ex: 'Bioeconomia & Cosméticos', 'Turismo', 'Comércio Local', 'Agência'
  description TEXT,
  country TEXT DEFAULT 'BR',
  state_uf CHAR(2) NOT NULL,
  city TEXT NOT NULL,
  amazon_territory_pole TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. CAMPAIGNS (Mural de Oportunidades e Vagas Publicadas)
-- ============================================================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  briefing_description TEXT NOT NULL,
  deliverables_expected TEXT NOT NULL, -- Ex: "3 vídeos UGC + 1 sequência de stories"
  compensation_type compensation_type NOT NULL DEFAULT 'PAID',
  budget_per_professional NUMERIC(10,2) DEFAULT 0,
  barter_description TEXT,
  slots_total INT NOT NULL DEFAULT 1,
  slots_filled INT NOT NULL DEFAULT 0,
  work_modality work_modality DEFAULT 'REMOTE',
  target_state_uf CHAR(2), -- NULL = Qualquer Estado
  target_city TEXT,
  target_niches TEXT[] DEFAULT '{}',
  deadline_days INT DEFAULT 7,
  expires_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  status campaign_status DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. APPLICATIONS (Candidaturas de Profissionais às Oportunidades)
-- ============================================================================
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  pitch_message TEXT,
  proposed_value NUMERIC(10,2),
  status application_status DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campaign_id, professional_id)
);

-- ============================================================================
-- 11. MATCHES (O "Tinder dos Negócios" — Interesses e Conexões)
-- ============================================================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  service_package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL,
  initiated_by match_initiator NOT NULL,
  search_context_json JSONB DEFAULT '{}'::jsonb, -- Guarda o filtro usado no momento do interesse
  initial_message TEXT,
  company_interested BOOLEAN DEFAULT FALSE,
  professional_interested BOOLEAN DEFAULT FALSE,
  status match_status DEFAULT 'PENDING',
  whatsapp_unlocked BOOLEAN DEFAULT FALSE,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. PROPOSALS (Propostas Comerciais Simples pós-Match ou Pacote)
-- ============================================================================
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scope_description TEXT NOT NULL,
  proposed_amount NUMERIC(10,2) NOT NULL,
  delivery_days INT NOT NULL DEFAULT 7,
  status proposal_status DEFAULT 'SENT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. CONTRACTS (Registro de Contratações e Acompanhamento)
-- ============================================================================
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE RESTRICT,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE RESTRICT,
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  agreed_amount NUMERIC(10,2) NOT NULL,
  delivery_link TEXT,
  delivery_notes TEXT,
  status contract_status DEFAULT 'ACTIVE',
  company_rating INT CHECK (company_rating BETWEEN 1 AND 5),
  company_review TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 14. SUBSCRIPTION_PLANS (Planos Freemium / PRO / Empresa Premium)
-- ============================================================================
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL, -- 'prof-free', 'prof-pro', 'company-free', 'company-premium'
  name TEXT NOT NULL,
  target_role plan_target NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  monthly_applications_limit INT DEFAULT 5, -- Ex: 5 no Free, 999 no PRO
  active_campaigns_limit INT DEFAULT 1,     -- Ex: 1 na Empresa Free, 10 na Premium
  max_packages_limit INT DEFAULT 2,         -- Ex: 2 pacotes 20Pila no Free, 15 no PRO
  featured_profile BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 15. SUBSCRIPTIONS (Assinaturas Ativas dos Usuários)
-- ============================================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status subscription_status DEFAULT 'ACTIVE',
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  external_gateway_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 16. NOTIFICATIONS (Avisos de Match, Candidaturas e Propostas)
-- ============================================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela Auxiliar de Favoritos da Empresa (Listas de Seleção)
CREATE TABLE public.company_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  folder_name TEXT DEFAULT 'Geral',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, professional_id, folder_name)
);

-- ============================================================================
-- ÍNDICES DE PERFORMANCE E RLS BÁSICO
-- ============================================================================
CREATE INDEX idx_prof_location ON public.professional_profiles(state_uf, city, is_available);
CREATE INDEX idx_prof_price ON public.professional_profiles(starting_price);
CREATE INDEX idx_packages_category_price ON public.service_packages(category_id, price) WHERE is_active = TRUE;
CREATE INDEX idx_campaigns_open ON public.campaigns(status, category_id, target_state_uf);
CREATE INDEX idx_matches_lookup ON public.matches(company_id, professional_id, status);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Exemplo de Políticas Essenciais
CREATE POLICY "Perfis públicos visíveis para todos" ON public.professional_profiles FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);
CREATE POLICY "Profissional edita próprio perfil" ON public.professional_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Pacotes ativos visíveis para todos" ON public.service_packages FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Campanhas abertas visíveis para autenticados" ON public.campaigns FOR SELECT USING (auth.role() = 'authenticated');


-- ============================================================================
-- COMPLEMENTO (Sprint 1): trigger de signup, RLS faltante e RPC do WhatsApp
-- ============================================================================

-- Cria public.users automaticamente quando um auth.users é criado (e-mail ou Google)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  initial_role TEXT := COALESCE(NEW.raw_user_meta_data->>'initial_role', 'PROFESSIONAL');
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, is_professional, is_company, active_context, terms_accepted_at, privacy_accepted_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    initial_role = 'PROFESSIONAL',
    initial_role = 'COMPANY',
    CASE WHEN initial_role = 'COMPANY' THEN 'COMPANY' ELSE 'PROFESSIONAL' END,
    NOW(), NOW()
  );
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Impede que o usuário se auto-promova a admin ou altere status pelo client
CREATE OR REPLACE FUNCTION public.protect_user_privileged_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin) THEN
    NEW.is_admin := OLD.is_admin;
    NEW.status := OLD.status;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

CREATE TRIGGER users_protect_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_privileged_columns();

-- Helper de admin (SECURITY DEFINER evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.users WHERE id = auth.uid()), FALSE)
$$;

-- RLS nas tabelas restantes
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_favorites ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "Usuário lê a si mesmo" ON public.users FOR SELECT USING (auth.uid() = id OR public.is_admin_user());
CREATE POLICY "Usuário edita a si mesmo" ON public.users FOR UPDATE USING (auth.uid() = id OR public.is_admin_user());

-- catálogos públicos
CREATE POLICY "Categorias visíveis" ON public.categories FOR SELECT USING (is_active OR public.is_admin_user());
CREATE POLICY "Admin gere categorias" ON public.categories FOR ALL USING (public.is_admin_user());
CREATE POLICY "Serviços visíveis" ON public.services FOR SELECT USING (is_active OR public.is_admin_user());
CREATE POLICY "Admin gere serviços" ON public.services FOR ALL USING (public.is_admin_user());
CREATE POLICY "Planos visíveis" ON public.subscription_plans FOR SELECT USING (TRUE);
CREATE POLICY "Admin gere planos" ON public.subscription_plans FOR ALL USING (public.is_admin_user());

-- profissional
CREATE POLICY "Categorias do profissional visíveis" ON public.professional_categories FOR SELECT USING (TRUE);
CREATE POLICY "Profissional gere suas categorias" ON public.professional_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM public.professional_profiles p WHERE p.id = professional_id AND p.user_id = auth.uid()));
CREATE POLICY "Portfólio visível" ON public.portfolio_items FOR SELECT USING (TRUE);
CREATE POLICY "Profissional gere seu portfólio" ON public.portfolio_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.professional_profiles p WHERE p.id = professional_id AND p.user_id = auth.uid()));
CREATE POLICY "Profissional gere seus pacotes" ON public.service_packages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.professional_profiles p WHERE p.id = professional_id AND p.user_id = auth.uid()));
CREATE POLICY "Admin gere perfis profissionais" ON public.professional_profiles FOR ALL USING (public.is_admin_user());

-- empresa
CREATE POLICY "Empresas visíveis para autenticados" ON public.company_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Empresa edita próprio perfil" ON public.company_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admin gere empresas" ON public.company_profiles FOR ALL USING (public.is_admin_user());
CREATE POLICY "Empresa gere suas campanhas" ON public.campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM public.company_profiles c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Admin gere campanhas" ON public.campaigns FOR ALL USING (public.is_admin_user());
CREATE POLICY "Empresa gere seus favoritos" ON public.company_favorites FOR ALL
  USING (EXISTS (SELECT 1 FROM public.company_profiles c WHERE c.id = company_id AND c.user_id = auth.uid()));

-- candidaturas
CREATE POLICY "Profissional vê/cria suas candidaturas" ON public.applications FOR ALL
  USING (EXISTS (SELECT 1 FROM public.professional_profiles p WHERE p.id = professional_id AND p.user_id = auth.uid()));
CREATE POLICY "Empresa vê/gere candidaturas das suas campanhas" ON public.applications FOR ALL
  USING (EXISTS (SELECT 1 FROM public.campaigns ca JOIN public.company_profiles c ON c.id = ca.company_id
                 WHERE ca.id = campaign_id AND c.user_id = auth.uid()));

-- matches (partes envolvidas)
CREATE POLICY "Partes veem o match" ON public.matches FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.company_profiles c WHERE c.id = company_id AND c.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.professional_profiles p WHERE p.id = professional_id AND p.user_id = auth.uid())
  OR public.is_admin_user());
CREATE POLICY "Partes atualizam o match" ON public.matches FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.company_profiles c WHERE c.id = company_id AND c.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.professional_profiles p WHERE p.id = professional_id AND p.user_id = auth.uid()));
CREATE POLICY "Partes criam match" ON public.matches FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.company_profiles c WHERE c.id = company_id AND c.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.professional_profiles p WHERE p.id = professional_id AND p.user_id = auth.uid()));

-- propostas e contratos
CREATE POLICY "Partes veem propostas" ON public.proposals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.matches m
          LEFT JOIN public.company_profiles c ON c.id = m.company_id
          LEFT JOIN public.professional_profiles p ON p.id = m.professional_id
          WHERE m.id = match_id AND (c.user_id = auth.uid() OR p.user_id = auth.uid())));
CREATE POLICY "Partes veem contratos" ON public.contracts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.company_profiles c WHERE c.id = company_id AND c.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.professional_profiles p WHERE p.id = professional_id AND p.user_id = auth.uid())
  OR public.is_admin_user());

-- assinaturas e notificações
CREATE POLICY "Usuário vê suas assinaturas" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user());
CREATE POLICY "Admin gere assinaturas" ON public.subscriptions FOR ALL USING (public.is_admin_user());
CREATE POLICY "Usuário vê/edita suas notificações" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Anti-bypass: o WhatsApp da outra parte só sai via esta função, e só em MUTUAL_MATCH
CREATE OR REPLACE FUNCTION public.get_match_whatsapp(p_match_id UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m public.matches%ROWTYPE;
  comp_user UUID;
  prof_user UUID;
  phone TEXT;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND OR m.status <> 'MUTUAL_MATCH' THEN RETURN NULL; END IF;
  SELECT user_id INTO comp_user FROM public.company_profiles WHERE id = m.company_id;
  SELECT user_id INTO prof_user FROM public.professional_profiles WHERE id = m.professional_id;
  IF auth.uid() = comp_user THEN
    SELECT phone_whatsapp INTO phone FROM public.users WHERE id = prof_user;
  ELSIF auth.uid() = prof_user THEN
    SELECT phone_whatsapp INTO phone FROM public.users WHERE id = comp_user;
  ELSE
    RETURN NULL;
  END IF;
  RETURN phone;
END $$;

-- ---------------------------------------------------------------------------
-- >>> 0002_security_and_plans_fix.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- >>> 0003_company_and_matching.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- >>> 0004_applications_matches_contracts.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- >>> 0005_admin_backoffice.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- >>> 0006_escola_comunidade.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- >>> 0007_avaliacoes_e_certificado_sem_prova.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- >>> 0008_tres_especialidades.sql
-- ---------------------------------------------------------------------------
-- 0008: foco em 3 especialidades prioritárias.
--   1. UGC Creator            (ugc-creator, mantém o slug)
--   2. Social Media de Eventos (social-media -> social-media-eventos)
--   3. IA Ferramenteiro        (especialista-ia -> ferramenteiro-ia)
-- As outras 8 são removidas (ou, se ainda tiverem pacote/campanha, desativadas). Idempotente: pode rodar mais de uma vez.

UPDATE public.categories SET
  name = 'UGC Creator',
  description = 'A porta de entrada para o Marketing de Influência: vídeos nativos, depoimentos, demonstrações de produto e criativos para anúncios.',
  icon_name = 'Video', display_order = 1, is_active = TRUE
WHERE slug = 'ugc-creator';

UPDATE public.categories SET
  slug = 'social-media-eventos',
  name = 'Social Media de Eventos',
  description = 'Gestão das redes sociais de empresas e cobertura de eventos pelo celular: foto, vídeo, stories, edição na hora e bastidores.',
  icon_name = 'Share2', display_order = 2, is_active = TRUE
WHERE slug IN ('social-media', 'social-media-eventos');

UPDATE public.categories SET
  slug = 'ferramenteiro-ia',
  name = 'IA Ferramenteiro',
  description = 'O que antes exigia designer, gestor de tráfego, copywriter e web designer, agora um só tarefeiro: IA, automações e agentes que entregam.',
  icon_name = 'Bot', display_order = 3, is_active = TRUE
WHERE slug IN ('especialista-ia', 'ferramenteiro-ia');

-- Videomaker e Editor de Vídeos são absorvidos por Social Media de Eventos:
-- remapeia profissionais, pacotes, portfólio e campanhas antes de desativá-las.
INSERT INTO public.professional_categories (professional_id, category_id)
SELECT pc.professional_id, dest.id
FROM public.professional_categories pc
JOIN public.categories src ON src.id = pc.category_id AND src.slug IN ('videomaker', 'editor-video')
JOIN public.categories dest ON dest.slug = 'social-media-eventos'
ON CONFLICT DO NOTHING;

DELETE FROM public.professional_categories pc
USING public.categories src
WHERE src.id = pc.category_id AND src.slug IN ('videomaker', 'editor-video');

UPDATE public.service_packages t SET category_id = dest.id
FROM public.categories src, public.categories dest
WHERE src.id = t.category_id AND src.slug IN ('videomaker', 'editor-video') AND dest.slug = 'social-media-eventos';

UPDATE public.portfolio_items t SET category_id = dest.id
FROM public.categories src, public.categories dest
WHERE src.id = t.category_id AND src.slug IN ('videomaker', 'editor-video') AND dest.slug = 'social-media-eventos';

UPDATE public.campaigns t SET category_id = dest.id
FROM public.categories src, public.categories dest
WHERE src.id = t.category_id AND src.slug IN ('videomaker', 'editor-video') AND dest.slug = 'social-media-eventos';

-- As demais categorias deixam de existir. Remove as que ninguém referencia (profissionais e portfólio
-- se desligam sozinhos: CASCADE / SET NULL). Se alguma ainda tiver pacote ou campanha, fica só DESATIVADA
-- para não perder esses registros (FK RESTRICT) — rode a consulta de conferência no fim para ver se sobrou alguma.
DELETE FROM public.categories c
WHERE c.slug IN ('influenciador', 'videomaker', 'fotografo', 'designer', 'gestor-trafego',
                 'editor-video', 'copywriter', 'estrategista')
  AND NOT EXISTS (SELECT 1 FROM public.service_packages p WHERE p.category_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.campaigns k WHERE k.category_id = c.id);

UPDATE public.categories SET is_active = FALSE
WHERE slug IN ('influenciador', 'videomaker', 'fotografo', 'designer', 'gestor-trafego',
               'editor-video', 'copywriter', 'estrategista');

-- Conferência: deve listar só as 3 categorias ativas (e nenhuma inativa).
SELECT slug, name, is_active FROM public.categories ORDER BY display_order;

-- ---------------------------------------------------------------------------
-- >>> 0009_desativar_plano_pro_creators.sql
-- ---------------------------------------------------------------------------
-- 0009: desativa o plano PRO dos creators (profissionais). O Selo Creators passa a ser o caminho de destaque.
-- As empresas NÃO são afetadas: 'company-free' e 'company-premium' continuam ativos.
-- Não apaga nada: o plano e as assinaturas antigas ficam no histórico. Idempotente.
UPDATE public.subscription_plans SET is_active = FALSE WHERE slug = 'prof-pro';

-- ---------------------------------------------------------------------------
-- >>> 0010_hardening_pre_lancamento.sql
-- ---------------------------------------------------------------------------
-- ============================================================================
-- 0010 — Endurecimento pré-lançamento (diagnóstico de 08/11/2026). Idempotente.
--   1. Candidaturas não podem ser apagadas pelo cliente (fechava a cota mensal do plano gratuito).
--   2. Bucket "media" aceita só imagem e vídeo (antes qualquer tipo de arquivo).
--   3. Aceite de termos/privacidade só é gravado quando veio de verdade do cadastro.
--      Cadastro pelo Google sem aceite fica com NULL e o app pede o aceite no primeiro acesso.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. applications: DELETE só pelo sistema/admin (block_client_delete vem da 0004)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS applications_block_delete ON public.applications;
CREATE TRIGGER applications_block_delete BEFORE DELETE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.block_client_delete();

-- ----------------------------------------------------------------------------
-- 2. Storage: tipos permitidos no bucket media
-- ----------------------------------------------------------------------------
UPDATE storage.buckets
   SET allowed_mime_types = ARRAY[
     'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
     'video/mp4', 'video/quicktime', 'video/webm'
   ]
 WHERE id = 'media';

-- ----------------------------------------------------------------------------
-- 3. Signup: termos e privacidade vêm dos metadados (cadastro por e-mail os envia).
--    Sem metadado (Google), ficam NULL até o usuário aceitar dentro do app.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.safe_timestamptz(p TEXT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN NULLIF(p, '')::timestamptz;
EXCEPTION WHEN others THEN
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  initial_role TEXT := COALESCE(NEW.raw_user_meta_data->>'initial_role', 'PROFESSIONAL');
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, is_professional, is_company, active_context, terms_accepted_at, privacy_accepted_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    initial_role = 'PROFESSIONAL',
    initial_role = 'COMPANY',
    CASE WHEN initial_role = 'COMPANY' THEN 'COMPANY' ELSE 'PROFESSIONAL' END,
    public.safe_timestamptz(NEW.raw_user_meta_data->>'terms_accepted_at'),
    public.safe_timestamptz(NEW.raw_user_meta_data->>'privacy_accepted_at')
  );
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- >>> seed.sql
-- ---------------------------------------------------------------------------
-- Seed: 3 especialidades prioritárias + 4 planos de assinatura (idempotente; rodar após as migrations)
-- As 8 categorias antigas continuam na tabela, desativadas (migração 0008), por causa das FKs.
INSERT INTO public.categories (slug, name, description, icon_name, display_order) VALUES
('ugc-creator','UGC Creator','A porta de entrada para o Marketing de Influência: vídeos nativos, depoimentos, demonstrações de produto e criativos para anúncios.','Video',1),
('social-media-eventos','Social Media de Eventos','Gestão das redes sociais de empresas e cobertura de eventos pelo celular: foto, vídeo, stories, edição na hora e bastidores.','Share2',2),
('ferramenteiro-ia','IA Ferramenteiro','O que antes exigia designer, gestor de tráfego, copywriter e web designer, agora um só tarefeiro: IA, automações e agentes que entregam.','Bot',3)
ON CONFLICT (slug) DO NOTHING;

-- Limites: 999 = "ilimitado" no MVP. monthly_matches_limit só vale para planos de empresa.
INSERT INTO public.subscription_plans
  (slug, name, target_role, price_monthly, monthly_applications_limit, active_campaigns_limit, max_packages_limit, monthly_matches_limit, featured_profile, is_active) VALUES
('prof-free','Profissional Gratuito','PROFESSIONAL',0,5,0,2,0,FALSE,TRUE),
('prof-pro','Profissional PRO','PROFESSIONAL',29.90,999,0,999,0,TRUE,FALSE),
('company-free','Empresa Gratuita','COMPANY',0,0,1,0,5,FALSE,TRUE),
('company-premium','Empresa Premium','COMPANY',97.00,0,999,0,999,TRUE,TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  monthly_applications_limit = EXCLUDED.monthly_applications_limit,
  active_campaigns_limit = EXCLUDED.active_campaigns_limit,
  max_packages_limit = EXCLUDED.max_packages_limit,
  monthly_matches_limit = EXCLUDED.monthly_matches_limit,
  featured_profile = EXCLUDED.featured_profile,
  is_active = EXCLUDED.is_active;

-- Categorias iniciais da Comunidade
INSERT INTO public.forum_categories (slug, name, description, position) VALUES
('apresente-se','Apresente-se','Chegou agora? Conte quem você é, onde atua e o que busca.',1),
('duvidas','Dúvidas e ajuda','Pergunte, responda e aprenda com quem já passou por isso.',2),
('dicas-boas-praticas','Dicas e boas práticas','Roteiro, edição, tráfego, copy, UGC: compartilhe o que funciona.',3),
('mercado-precos','Mercado e preços','Quanto cobrar, como negociar, contratos e propostas.',4),
('ferramentas-ia','Ferramentas e IA','Apps, automações e inteligência artificial para o dia a dia.',5),
('networking-amazonia','Networking Amazônia','Conexões entre profissionais e empresas da região e de todo o Brasil.',6)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
