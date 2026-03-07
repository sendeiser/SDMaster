-- 1. Asegurar que todos los usuarios con secuencias tengan un perfil (por si el trigger no se ejecutó para usuarios viejos)
INSERT INTO public.profiles (id)
SELECT DISTINCT user_id FROM public.saved_sequences
WHERE user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Corregir la llave foránea para que apunte directamente a public.profiles
-- Esto permite que el join de Supabase (.select('..., profiles(...)')) funcione automáticamente
ALTER TABLE public.saved_sequences
DROP CONSTRAINT IF EXISTS saved_sequences_user_id_fkey;

ALTER TABLE public.saved_sequences
ADD CONSTRAINT saved_sequences_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Recargar el esquema de PostgREST
NOTIFY pgrst, 'reload schema';
