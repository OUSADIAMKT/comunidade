-- 0009: desativa o plano PRO dos creators (profissionais). O Selo Creators passa a ser o caminho de destaque.
-- As empresas NÃO são afetadas: 'company-free' e 'company-premium' continuam ativos.
-- Não apaga nada: o plano e as assinaturas antigas ficam no histórico. Idempotente.
UPDATE public.subscription_plans SET is_active = FALSE WHERE slug = 'prof-pro';
