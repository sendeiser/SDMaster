-- Tabla de perfiles para extender los datos de auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  subjects TEXT[] DEFAULT '{}',
  courses TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{"defaultTheme": "classic", "defaultDuration": "2h", "defaultStructure": "Tradicional"}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Los perfiles son públicos" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Los usuarios pueden editar sus propios perfiles" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden insertar sus propios perfiles" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
