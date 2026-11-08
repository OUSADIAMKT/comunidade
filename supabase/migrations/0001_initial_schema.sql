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
