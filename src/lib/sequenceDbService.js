import { supabase } from './supabaseClient';

export const sequenceDbService = {
    /**
     * Guarda o actualiza una secuencia en la base de datos
     */
    async saveSequence({ subject, year, topic, duration, structure, content, theme }, isPublic = false) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            const { data, error } = await supabase
                .from('saved_sequences')
                .insert([
                    {
                        user_id: user.id,
                        subject,
                        year,
                        topic,
                        content,
                        theme: theme || 'classic',
                        is_public: isPublic
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
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
            throw error;
        }
    },

    /**
     * Obtiene secuencias públicas de la comunidad (exceptuando las propias)
     */
    async getPublicSequences() {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            let query = supabase
                .from('saved_sequences')
                .select(`
                    id, subject, topic, year, created_at, content, theme,
                    user_id
                `)
                .eq('is_public', true)
                .order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error obteniendo secuencias públicas:', error);
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
            console.error('Error actualizando visibilidad de la secuencia:', error);
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
    }
};
