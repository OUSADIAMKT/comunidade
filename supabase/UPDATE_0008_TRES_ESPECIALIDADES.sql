-- ATUALIZAÇÃO 0008: foco em 3 especialidades. Rode UMA vez no SQL Editor do Supabase (idempotente).

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
