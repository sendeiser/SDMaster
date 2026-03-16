-- 1. Asegurar que todos los usuarios con evaluaciones tengan un perfil
INSERT INTO public.profiles (id)
SELECT DISTINCT user_id FROM public.saved_assessments
WHERE user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Corregir la llave foránea para que apunte directamente a public.profiles
ALTER TABLE public.saved_assessments
DROP CONSTRAINT IF EXISTS saved_assessments_user_id_fkey;

ALTER TABLE public.saved_assessments
ADD CONSTRAINT saved_assessments_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Recargar el esquema de PostgREST
NOTIFY pgrst, 'reload schema';
