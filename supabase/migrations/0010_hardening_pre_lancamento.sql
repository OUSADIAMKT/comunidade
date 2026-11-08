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
