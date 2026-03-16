-- ═══════════════════════════════════════════════════════════
-- Migración: Sistema de Créditos y Planes (Fase 7)
-- Ejecutar en Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Agregar columnas de créditos/plan a profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'institution')),
    ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 10,
    ADD COLUMN IF NOT EXISTS credits_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Usuarios existentes obtienen el plan free con 10 créditos si no tienen
UPDATE public.profiles
SET credits_remaining = 10, plan = 'free'
WHERE credits_remaining IS NULL OR plan IS NULL;

-- 3. Función para descontar 1 crédito (retorna TRUE si pudo, FALSE si no hay saldo)
CREATE OR REPLACE FUNCTION public.deduct_credit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    remaining INTEGER;
BEGIN
    SELECT credits_remaining INTO remaining
    FROM public.profiles
    WHERE id = p_user_id;

    IF remaining IS NULL OR remaining <= 0 THEN
        RETURN FALSE;
    END IF;

    UPDATE public.profiles
    SET credits_remaining = credits_remaining - 1
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

-- 4. Verificar que el trigger handle_new_user guarda el rol del metadata
-- Si ya existe, lo reemplazamos con la versión que incluye plan y créditos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, plan, credits_remaining, credits_reset_at)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'teacher'),
        'free',
        10,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = COALESCE(EXCLUDED.role, profiles.role);
    RETURN NEW;
END;
$$;

-- 5. Crear trigger si no existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Recargar esquema
NOTIFY pgrst, 'reload schema';
