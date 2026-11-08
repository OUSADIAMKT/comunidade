-- Curso de captacao "Videomaker Mobile" (Ousadia Marketing) - aulas do YouTube (nao listado/playlist)
-- Entra como RASCUNHO: cadastre as perguntas da prova em /admin/escola e depois publique.
-- Pode rodar mais de uma vez (nao duplica).

INSERT INTO public.courses (slug, title, description, access_level, level, estimated_hours, instructor_name, status, display_order, pass_score)
VALUES (
  'captacao-videomaker-mobile',
  'Captação de vídeo pelo celular (Videomaker Mobile)',
  'Aprenda a captar vídeos profissionais usando só o celular: gravar stories sozinho, perspectiva, time lapse e vídeo na hora.',
  'FREE', 'Iniciante', 1, 'Ousadia Marketing', 'DRAFT', 2, 70
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.lessons (course_id, title, youtube_id, position)
SELECT c.id, v.title, v.yt, v.pos
FROM public.courses c
CROSS JOIN (VALUES
  (2, 'Aula 2 - Como gravar Stories sozinho', '5ac5GmVSdmk'),
  (4, 'Aula 4 - Perspectiva',                 'imN31EptwSo'),
  (5, 'Aula 5 - Time Lapse',                  'hp8_n5RMIts'),
  (6, 'Aula 6 - Vídeo na hora',               'Tplhc0ZKuKc')
) AS v(pos, title, yt)
WHERE c.slug = 'captacao-videomaker-mobile'
  AND NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.course_id = c.id AND l.youtube_id = v.yt);
