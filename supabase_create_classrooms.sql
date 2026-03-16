-- ═══════════════════════════════════════════════════════════
-- Migración LMS (Fase 2): Sistema de Aulas (Classrooms)
-- ═══════════════════════════════════════════════════════════

-- ==========================================
-- 1. Tabla: classrooms
-- Almacena las aulas creadas por los docentes
-- ==========================================
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    join_code TEXT UNIQUE NOT NULL, -- Código de 6 caracteres para unirse
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. Tabla: classroom_students
-- Relación MUCHOS A MUCHOS entre Aulas y Estudiantes
-- ==========================================
CREATE TABLE IF NOT EXISTS public.classroom_students (
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (classroom_id, student_id)
);

-- ==========================================
-- 3. Tabla: classroom_assignments
-- Tareas (Secuencias o Evaluaciones) publicadas en un aula
-- ==========================================
CREATE TABLE IF NOT EXISTS public.classroom_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    item_type TEXT NOT NULL CHECK (item_type IN ('sequence', 'assessment')),
    -- ID del elemento guardado original (opcional para mantener flexibilidad)
    item_id UUID, 
    -- Contenido estático clonado en el momento de asignar (Markdown) para que no cambie si el profe edita el original
    content_payload TEXT NOT NULL, 
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. Tabla: student_submissions
-- Entregas de los alumnos a las tareas
-- ==========================================
CREATE TABLE IF NOT EXISTS public.student_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.classroom_assignments(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL, -- La respuesta del alumno en Markdown
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Corrección IA
    ai_feedback TEXT,
    ai_score_suggested NUMERIC(5,2),
    
    -- Corrección Docente (Final)
    is_graded BOOLEAN DEFAULT FALSE,
    teacher_feedback TEXT,
    final_score NUMERIC(5,2),
    
    -- Un alumno solo puede enviar una entrega por tarea (o actualiza la misma)
    UNIQUE(assignment_id, student_id)
);

-- ==========================================
-- 5. Habilitar RLS (Row Level Security)
-- ==========================================
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 6. Políticas de Seguridad Básicas (RLS)
-- ==========================================

-- Eliminar políticas previas para evitar errores al re-ejecutar
DROP POLICY IF EXISTS "Classrooms read access" ON public.classrooms;
DROP POLICY IF EXISTS "Docentes pueden insertar classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Docentes pueden actualizar sus classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Docentes pueden eliminar sus classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Classroom students read access" ON public.classroom_students;
DROP POLICY IF EXISTS "Estudiantes pueden unirse a aulas" ON public.classroom_students;
DROP POLICY IF EXISTS "Classroom assignments read access" ON public.classroom_assignments;
DROP POLICY IF EXISTS "Docentes pueden asignar tareas" ON public.classroom_assignments;
DROP POLICY IF EXISTS "Docentes pueden actualizar tareas" ON public.classroom_assignments;
DROP POLICY IF EXISTS "Docentes pueden eliminar tareas" ON public.classroom_assignments;
DROP POLICY IF EXISTS "Submissions read access" ON public.student_submissions;
DROP POLICY IF EXISTS "Estudiantes pueden enviar/actualizar entregas" ON public.student_submissions;
DROP POLICY IF EXISTS "Estudiantes y Docentes pueden modificar entregas" ON public.student_submissions;

-- Función de seguridad para evitar recursión infinita entre Aulas y Alumnos
CREATE OR REPLACE FUNCTION public.is_teacher_of_classroom(c_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM classrooms 
        WHERE id = c_id AND teacher_id = auth.uid()
    );
$$;

-- Classrooms: Docentes pueden leer/escribir las suyas, Estudiantes pueden leer donde están unidos
CREATE POLICY "Classrooms read access"
ON public.classrooms FOR SELECT
USING (
    teacher_id = auth.uid() 
    OR 
    id IN (SELECT classroom_id FROM public.classroom_students WHERE student_id = auth.uid())
);

CREATE POLICY "Docentes pueden insertar classrooms"
ON public.classrooms FOR INSERT
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Docentes pueden actualizar sus classrooms"
ON public.classrooms FOR UPDATE
USING (teacher_id = auth.uid());

CREATE POLICY "Docentes pueden eliminar sus classrooms"
ON public.classrooms FOR DELETE
USING (teacher_id = auth.uid());

-- Classroom_Students: Docentes ven a sus alumnos, Estudiantes se ven a sí mismos
CREATE POLICY "Classroom students read access"
ON public.classroom_students FOR SELECT
USING (
    student_id = auth.uid()
    OR 
    public.is_teacher_of_classroom(classroom_id)
);

-- Estudiantes pueden "unirse" insertando su fila
CREATE POLICY "Estudiantes pueden unirse a aulas"
ON public.classroom_students FOR INSERT
WITH CHECK (student_id = auth.uid());

-- Classroom_Assignments: Lectura para Docente y Alumnos inscritos. Escritura solo Docente.
CREATE POLICY "Classroom assignments read access"
ON public.classroom_assignments FOR SELECT
USING (
    classroom_id IN (SELECT id FROM public.classrooms WHERE teacher_id = auth.uid())
    OR
    classroom_id IN (SELECT classroom_id FROM public.classroom_students WHERE student_id = auth.uid())
);

CREATE POLICY "Docentes pueden asignar tareas"
ON public.classroom_assignments FOR INSERT
WITH CHECK (classroom_id IN (SELECT id FROM public.classrooms WHERE teacher_id = auth.uid()));

CREATE POLICY "Docentes pueden actualizar tareas"
ON public.classroom_assignments FOR UPDATE
USING (classroom_id IN (SELECT id FROM public.classrooms WHERE teacher_id = auth.uid()));

CREATE POLICY "Docentes pueden eliminar tareas"
ON public.classroom_assignments FOR DELETE
USING (classroom_id IN (SELECT id FROM public.classrooms WHERE teacher_id = auth.uid()));

-- Student_Submissions: Estudiantes ven y editan las suyas. Docentes ven y califican las de sus aulas.
CREATE POLICY "Submissions read access"
ON public.student_submissions FOR SELECT
USING (
    student_id = auth.uid()
    OR
    assignment_id IN (
        SELECT id FROM public.classroom_assignments WHERE classroom_id IN (
            SELECT id FROM public.classrooms WHERE teacher_id = auth.uid()
        )
    )
);

CREATE POLICY "Estudiantes pueden enviar/actualizar entregas"
ON public.student_submissions FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Estudiantes y Docentes pueden modificar entregas"
ON public.student_submissions FOR UPDATE
USING (
    student_id = auth.uid()
    OR
    assignment_id IN (
        SELECT id FROM public.classroom_assignments WHERE classroom_id IN (
            SELECT id FROM public.classrooms WHERE teacher_id = auth.uid()
        )
    )
);

-- Refrescar caché de API
NOTIFY pgrst, 'reload schema';
