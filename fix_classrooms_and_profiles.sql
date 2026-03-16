-- ═══════════════════════════════════════════════════════════
-- Corrección de Aulas (RLS) y Perfiles (Email)
-- ═══════════════════════════════════════════════════════════

-- 1. Asegurar que los alumnos puedan buscar aulas por código (Error 406 fix)
DROP POLICY IF EXISTS "Classrooms read access" ON public.classrooms;
CREATE POLICY "Classrooms read access"
ON public.classrooms FOR SELECT
USING (
    auth.role() = 'authenticated'
);

-- 2. Agregar columna email a perfiles (Error 42703 fix)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- 3. Actualizar el trigger para capturar el email
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Sincronizar emails existentes (opcional pero recomendado)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 5. Refrescar caché
NOTIFY pgrst, 'reload schema';
