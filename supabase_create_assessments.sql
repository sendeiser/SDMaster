-- ═══════════════════════════════════════════════════════════
-- Crear tabla saved_assessments (misma estructura que saved_sequences)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.saved_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    year TEXT,
    topic TEXT,
    type TEXT DEFAULT 'Examen Tradicional',
    difficulty TEXT DEFAULT 'Intermedio',
    content TEXT,
    theme TEXT DEFAULT 'academic',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_saved_assessments_user_id ON public.saved_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_assessments_public ON public.saved_assessments(is_public);

-- Habilitar RLS
ALTER TABLE public.saved_assessments ENABLE ROW LEVEL SECURITY;

-- Política: lectura pública
CREATE POLICY "Lectura publica evaluaciones"
ON public.saved_assessments
FOR SELECT
USING (is_public = true);

-- Política: control total sobre propios
CREATE POLICY "Control total evaluaciones propias"
ON public.saved_assessments
FOR ALL
USING (auth.uid() = user_id);

-- Agregar columna updated_at a saved_sequences si no existe
ALTER TABLE public.saved_sequences
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Refrescar caché de PostgREST
NOTIFY pgrst, 'reload schema';
