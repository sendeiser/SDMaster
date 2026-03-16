import { supabase } from './supabaseClient';

export const sequenceDbService = {
    /**
     * Guarda o ACTUALIZA una secuencia.
     * Si se pasa un `id`, actualiza ese registro. Si no, crea uno nuevo.
     */
    async saveSequence({ id, subject, year, topic, duration, structure, content, theme }, isPublic = false) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuario no autenticado');

            const record = {
                user_id: user.id,
                subject,
                year,
                topic,
                content,
                theme: theme || 'classic',
                is_public: isPublic,
                updated_at: new Date().toISOString(),
            };

            let result;

            if (id) {
                // Actualizar registro existente
                const { data, error } = await supabase
                    .from('saved_sequences')
                    .update(record)
                    .eq('id', id)
                    .eq('user_id', user.id) // seguridad: solo el dueño
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            } else {
                // Crear nuevo
                const { data, error } = await supabase
                    .from('saved_sequences')
                    .insert([record])
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            }

            return { success: true, data: result };
        } catch (error) {
            console.error('Error guardando secuencia:', error);
            throw error;
        }
    },

    /**
     * Obtiene las secuencias del usuario logueado
     */
    async getUserSequences() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuario no autenticado');

            const { data, error } = await supabase
                .from('saved_sequences')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error obteniendo secuencias del usuario:', error);
            return [];
        }
    },

    /**
     * Obtiene secuencias públicas de la comunidad incluyendo el nombre del creador
     */
    async getPublicSequences() {
        try {
            const { data, error } = await supabase
                .from('saved_sequences')
                .select(`
                    id, subject, topic, year, created_at, content, theme,
                    user_id,
                    profiles:user_id (full_name, avatar_url)
                `)
                .eq('is_public', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error obteniendo secuencias públicas:', error);
            return [];
        }
    },

    /**
     * Perfil de Usuario
     */
    async getProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error obteniendo perfil:', error);
            return null;
        }
    },

    async updateProfile(profileData) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión activa');

            const { data, error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    ...profileData,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            throw error;
        }
    },

    async updatePassword(newPassword) {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data;
    },

    /**
     * Sube un avatar al bucket 'profiles'
     */
    async uploadAvatar(file) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión activa');

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/avatar.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('profiles')
                .upload(fileName, file, { upsert: true, cacheControl: '3600' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error('Error subiendo avatar:', error);
            throw error;
        }
    },

    /**
     * Cambia la visibilidad de una secuencia (Pública/Privada)
     */
    async toggleVisibility(id, isPublic) {
        try {
            const { data, error } = await supabase
                .from('saved_sequences')
                .update({ is_public: isPublic })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error actualizando visibilidad:', error);
            throw error;
        }
    },

    /**
     * Elimina una secuencia de la base de datos
     */
    async deleteSequence(id) {
        try {
            const { error } = await supabase
                .from('saved_sequences')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error eliminando secuencia:', error);
            throw error;
        }
    },

    /**
     * ————— Evaluaciones —————
     */

    /**
     * Guarda o ACTUALIZA una evaluación.
     * Si se pasa un `id`, actualiza. Si no, crea una nueva.
     */
    async saveAssessment({ id, subject, year, topic, type, difficulty, content, theme }) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuario no autenticado');

            const record = {
                user_id: user.id,
                subject,
                year,
                topic,
                type,
                difficulty,
                content,
                theme: theme || 'academic',
                updated_at: new Date().toISOString(),
            };

            let result;

            if (id) {
                // Actualizar registro existente
                const { data, error } = await supabase
                    .from('saved_assessments')
                    .update(record)
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            } else {
                // Crear nuevo
                const { data, error } = await supabase
                    .from('saved_assessments')
                    .insert([record])
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            }

            return { success: true, data: result };
        } catch (error) {
            console.error('Error guardando evaluación:', error);
            throw error;
        }
    },

    async getUserAssessments() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('saved_assessments')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            return data;
        } catch (error) {
            console.error('Error obteniendo evaluaciones:', error);
            return [];
        }
    },

    async getPublicAssessments() {
        try {
            const { data, error } = await supabase
                .from('saved_assessments')
                .select(`
                    id, subject, topic, year, created_at, content, theme, type, difficulty,
                    user_id,
                    profiles:user_id (full_name, avatar_url)
                `)
                .eq('is_public', true)
                .order('created_at', { ascending: false });

            if (error) {
                if (error.message?.includes('schema cache') || error.code === '42P01') {
                    return [];
                }
                throw error;
            }
            return data;
        } catch (error) {
            console.error('Error obteniendo evaluaciones públicas:', error);
            return [];
        }
    },

    async toggleAssessmentVisibility(id, isPublic) {
        try {
            const { data, error } = await supabase
                .from('saved_assessments')
                .update({ is_public: isPublic })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error actualizando visibilidad de evaluación:', error);
            throw error;
        }
    },

    async deleteAssessment(id) {
        try {
            const { error } = await supabase
                .from('saved_assessments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error eliminando evaluación:', error);
            throw error;
        }
    }
};
