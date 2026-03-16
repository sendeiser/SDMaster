-- Tabla para guardar las evaluaciones generadas
CREATE TABLE IF NOT EXISTS public.saved_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    year TEXT,
    topic TEXT NOT NULL,
    type TEXT,
    difficulty TEXT,
    content TEXT NOT NULL,
    theme TEXT DEFAULT 'midnight',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.saved_assessments ENABLE ROW LEVEL SECURITY;

-- Politica: Los usuarios solo pueden ver y gestionar sus propias evaluaciones
CREATE POLICY "Control total propios evaluaciones" 
ON public.saved_assessments
FOR ALL 
USING (auth.uid() = user_id);

-- Actualizar caché de PostgREST
NOTIFY pgrst, 'reload schema';
