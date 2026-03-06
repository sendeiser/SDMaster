import { supabase } from '../lib/supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

let aiInstance = null;
const getAI = () => {
    if (!aiInstance) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("VITE_GEMINI_API_KEY no encontrada");
        }
        aiInstance = new GoogleGenerativeAI(apiKey);
    }
    return aiInstance;
};

// Utilidad para esperar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Servicio para manejar la lógica de Generación Aumentada por Recuperación (RAG)
 */
export const ragService = {

    /**
     * Genera el embedding de un texto con reintentos para manejar límites de cuota (429)
     * Optimizada para el Plan Gratuito (15 RPM)
     */
    async getEmbedding(text, retries = 7, delay = 6000) {
        const modelsToTry = ["gemini-embedding-001", "text-embedding-004", "embedding-001"];
        let lastError = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            for (const modelName of modelsToTry) {
                try {
                    const ai = getAI();
                    const embeddingModel = ai.getGenerativeModel({ model: modelName });
                    const response = await embeddingModel.embedContent(text);

                    if (response && response.embedding && response.embedding.values) {
                        return response.embedding.values.slice(0, 768);
                    }
                } catch (error) {
                    lastError = error;
                    const errorMsg = error.message?.toLowerCase() || "";

                    if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("limit")) {
                        const waitTime = Math.min(delay * Math.pow(2, attempt), 60000); // Max 1 minute wait
                        console.warn(`[RAG] Límite alcanzado con ${modelName}. Reintento ${attempt + 1}/${retries} en ${waitTime}ms...`);
                        await sleep(waitTime);
                        break; // Probar siguiente reintento tras espera
                    }

                    if (errorMsg.includes("404") || errorMsg.includes("not found")) {
                        console.warn(`[RAG] Modelo ${modelName} no encontrado. Probando alternativa...`);
                        continue;
                    }

                    // Para otros errores, probamos el siguiente modelo si existe
                    console.error(`[RAG] Error con ${modelName}:`, errorMsg);
                }
            }
        }
        throw lastError || new Error("No se pudo generar el embedding tras varios intentos y modelos.");
    },

    /**
     * Divide el texto grande en chunks (fragmentos) más pequeños
     */
    chunkText(text, chunkSize = 1500, overlap = 300) {
        const chunks = [];
        let i = 0;
        while (i < text.length) {
            chunks.push(text.slice(i, i + chunkSize));
            i += chunkSize - overlap;
        }
        return chunks;
    },

    /**
     * Procesa un documento: extrae texto, hace chunks, genera embeddings y los guarda
     * ESTRICTAMENTE SECUENCIAL para respetar las 15 RPM del Plan Gratuito
     */
    async processAndStoreDocument(fileName, text, onProgress = null) {
        console.log(`Iniciando procesamiento secuencial de: ${fileName}`);
        const chunks = this.chunkText(text, 1500, 300);
        const totalChunks = chunks.length;
        let processedCount = 0;

        for (let i = 0; i < totalChunks; i++) {
            const chunk = chunks[i];
            try {
                // Procesamiento uno por uno
                const embedding = await this.getEmbedding(chunk);
                const { error } = await supabase.from('documents').insert({
                    content: chunk,
                    metadata: { source: fileName, chunk_index: i },
                    embedding: embedding
                });

                if (error) throw error;

                processedCount++;
                if (onProgress) {
                    onProgress(Math.round((processedCount / totalChunks) * 100), `${processedCount}/${totalChunks}`);
                }

                // ESPERA CRÍTICA: La API gratuita permite 15 RPM (1 cada 4 segundos)
                // Usamos 4100ms para estar seguros de no golpear el límite
                if (i < totalChunks - 1) {
                    await sleep(4100);
                }
            } catch (err) {
                console.error(`Error crítico en fragmento ${i}:`, err);
                // Si falla uno, esperamos un poco extra y seguimos
                await sleep(10000);
            }
        }
        return { total: totalChunks, successful: processedCount };
    },

    /**
     * Busca los fragmentos más relevantes basados en la consulta del usuario
     */
    async retrieveContext(query, limit = 5) {
        try {
            const queryEmbedding = await this.getEmbedding(query);
            const { data, error } = await supabase.rpc('match_documents', {
                query_embedding: queryEmbedding,
                match_threshold: 0.5,
                match_count: limit
            });
            if (error) {
                console.warn("No se pudo obtener contexto:", error);
                return [];
            }
            return data;
        } catch (err) {
            console.error("Error recuperando contexto:", err);
            return [];
        }
    },

    /**
     * Obtiene estadísticas de la base de datos vectorial
     */
    async getStats() {
        try {
            const { count, error } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true });
            if (error) throw error;
            return { totalChunks: count || 0 };
        } catch (err) {
            console.error("Error obteniendo stats:", err);
            return { totalChunks: 0 };
        }
    },

    /**
     * Lista los nombres únicos de documentos indexados
     */
    async fetchUniqueDocuments() {
        try {
            // Obtenemos solo los nombres de fuentes únicos de los metadatos
            const { data, error } = await supabase
                .from('documents')
                .select('metadata->source');

            if (error) throw error;

            // Procesamiento en el cliente para obtener únicos
            const sources = [...new Set(data.map(d => d.source).filter(Boolean))];
            console.log("[RAG] Documentos únicos cargeados:", sources.length);
            return sources;
        } catch (err) {
            console.error("[RAG] Error fetchUniqueDocuments:", err);
            return [];
        }
    },

    /**
     * Recupera una muestra estructural de un documento para usar como plantilla
     */
    async getDocumentTemplate(sourceName) {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('content')
                .filter('metadata->>source', 'eq', sourceName)
                .order('metadata->>chunk_index', { ascending: true })
                .limit(3); // Los primeros 3 chunks suelen dar la estructura

            if (error) throw error;
            return data.map(d => d.content).join('\n\n');
        } catch (err) {
            console.error("Error obteniendo plantilla:", err);
            return "";
        }
    },

    /**
     * Elimina todos los fragmentos asociados a un documento específico
     */
    async deleteDocument(sourceName) {
        try {
            const { error } = await supabase
                .from('documents')
                .delete()
                .filter('metadata->>source', 'eq', sourceName);

            if (error) throw error;
            console.log(`Documento '${sourceName}' eliminado de la base de conocimiento.`);
            return { success: true };
        } catch (err) {
            console.error("Error eliminando documento:", err);
            throw err;
        }
    }
};
