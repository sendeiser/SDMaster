-- ═══════════════════════════════════════════════════════════
-- Migración LMS: Agregar Roles e Institución a Perfiles
-- ═══════════════════════════════════════════════════════════

-- 1. Agregar columnas a profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'teacher' CHECK (role IN ('teacher', 'student')),
ADD COLUMN IF NOT EXISTS institution TEXT;

-- 2. Recargar esquema para PostgREST (API de Supabase)
NOTIFY pgrst, 'reload schema';
