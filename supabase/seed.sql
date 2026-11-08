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