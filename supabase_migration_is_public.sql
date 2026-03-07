-- Agrega las columnas user_id e is_public a la tabla saved_sequences existente
ALTER TABLE public.saved_sequences
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Politica basica 1: Permitir que cualquiera lea secuencias publicas
CREATE POLICY "Lectura publica" 
ON public.saved_sequences
FOR SELECT 
USING (is_public = true);

-- Politica basica 2: Permitir que los usuarios vean/editen sus propias secuencias
CREATE POLICY "Control total propios" 
ON public.saved_sequences
FOR ALL 
USING (auth.uid() = user_id);

-- Actualizar la caché del esquema de Supabase (Refrescar caché de PostgREST)
NOTIFY pgrst, 'reload schema';
