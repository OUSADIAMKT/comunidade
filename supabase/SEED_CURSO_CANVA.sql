-- Curso "Canva para iniciantes" (Ousadia Marketing) - 8 aulas do YouTube (nao listado/playlist)
-- Entra como RASCUNHO: cadastre as perguntas da prova em /admin/escola e depois publique.
-- Pode rodar mais de uma vez (nao duplica).

INSERT INTO public.courses (slug, title, description, access_level, level, estimated_hours, instructor_name, status, display_order, pass_score)
VALUES (
  'canva-para-iniciantes',
  'Canva para iniciantes',
  'Aprenda Canva do zero: conceitos básicos, emoções das cores, o método P.I.F.E e prática com nichos reais (nutricionista, beleza). Ideal para quem quer criar artes profissionais para redes sociais.',
  'FREE', 'Iniciante', 2, 'Ousadia Marketing', 'DRAFT', 1, 70
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.lessons (course_id, title, youtube_id, position)
SELECT c.id, v.title, v.yt, v.pos
FROM public.courses c
CROSS JOIN (VALUES
  (1, 'Aula 01 - Canva',                          'ZYyVcBAx80Y'),
  (2, 'Aula 02 - Canva',                          '7a8Hdu8oGpk'),
  (3, 'Aula 03 - Canva',                          '4Ayltusxf0g'),
  (4, 'Aula 04 - Emoções de Cores',               'FCxjPumjtW4'),
  (5, 'Aula 05 - Conceitos Básicos',              'lwuxOJ87SsY'),
  (6, 'Aula 06 - Método P.I.F.E',                 'SyMs1iwbAw8'),
  (7, 'Aula 07 - Praticando (Nutricionista)',     '7qCRek7Ia0g'),
  (8, 'Aula 08 - Nicho Beleza',                   'BAPDVmHzVcs')
) AS v(pos, title, yt)
WHERE c.slug = 'canva-para-iniciantes'
  AND NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.course_id = c.id AND l.youtube_id = v.yt);
