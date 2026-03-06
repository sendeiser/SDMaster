/**
 * cloudService.js
 * Servicio para almacenamiento externo de secuencias mediante GitHub Gists.
 * Permite persistencia en la nube sin depender de la base de datos principal.
 */
export const cloudService = {
    /**
     * Crea un Gist con la secuencia didáctica.
     * @param {Object} data - Datos de la secuencia (titulo, contenido, metadatos)
     * @param {string} token - GitHub Personal Access Token (opcional, para gists privados/propios)
     */
    async saveToCloud(data, token = null) {
        const { title, content, metadata } = data;
        const fileName = `${title.replace(/\s+/g, '_')}.md`;

        const body = {
            description: `Secuencia Didáctica: ${title} - Generada por SD Master`,
            public: !token, // Si no hay token, es público por defecto
            files: {
                [fileName]: {
                    content: `# ${title}\n\n${content}\n\n---\n**Metadatos:**\n- Materia: ${metadata.subject}\n- Año: ${metadata.year}\n- Generado el: ${new Date().toLocaleString()}`
                }
            }
        };

        try {
            const headers = {
                'Content-Type': 'application/json',
            };
            if (token) headers['Authorization'] = `token ${token}`;

            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error('Error al guardar en GitHub Gist');

            const result = await response.json();
            return {
                success: true,
                url: result.html_url,
                id: result.id
            };
        } catch (error) {
            console.error("Cloud Storage Error:", error);
            throw error;
        }
    },

    /**
     * Recupera una lista de gists (simulando una nube de documentos)
     * En una implementación real, esto filtraría por tags o descripción.
     */
    async fetchSavedSequences(token = null) {
        if (!token) return []; // Requiere token para ver gists propios/privados

        try {
            const response = await fetch('https://api.github.com/gists', {
                headers: {
                    'Authorization': `token ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al recuperar gists');

            const gists = await response.json();
            return gists
                .filter(g => g.description?.includes('Generada por SD Master'))
                .map(g => ({
                    id: g.id,
                    title: Object.keys(g.files)[0].replace('.md', '').replace(/_/g, ' '),
                    url: g.html_url,
                    date: new Date(g.created_at).toLocaleDateString()
                }));
        } catch (error) {
            console.error("Cloud Fetch Error:", error);
            return [];
        }
    }
};
