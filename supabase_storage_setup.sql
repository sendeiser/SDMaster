-- Crear bucket para fotos de perfil si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de seguridad para el bucket de perfiles
-- Permitir lectura pública
CREATE POLICY "Avatares públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

-- Permitir a usuarios autenticados subir sus propias fotos
-- Nota: Usamos el nombre del archivo basado en el ID del usuario para facilitar la gestión
CREATE POLICY "Los usuarios pueden subir sus propios avatares"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir a los usuarios actualizar/eliminar sus propios avatares
CREATE POLICY "Los usuarios pueden actualizar sus avatares"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Los usuarios pueden borrar sus avatares"
ON storage.objects FOR DELETE
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);
