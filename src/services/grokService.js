import OpenAI from 'openai';

let xaiInstance = null;
const getXAI = () => {
    if (!xaiInstance) {
        const apiKey = import.meta.env.VITE_XAI_API_KEY;
        if (!apiKey) {
            throw new Error("VITE_XAI_API_KEY no encontrada en .env");
        }
        xaiInstance = new OpenAI({
            apiKey: apiKey,
            baseURL: "https://api.x.ai/v1",
            dangerouslyAllowBrowser: true 
        });
    }
    return xaiInstance;
};

export const grokService = {
    /**
     * Extracts theory and exercises from a raw assignment markdown.
     * @param {string} markdown - The full administrative markdown.
     * @returns {Promise<{theory: string, exercises: {id: string|number, content: string}[]}>}
     */
    async extractStudentContent(markdown) {
        if (!markdown) return { theory: '', exercises: [] };

        const prompt = `
Eres un asistente pedagógico diseñado para analizar documentos de actividades escolares.
Tu objetivo es extraer EXCLUSIVAMENTE el material de estudio (teoría, desarrollo conceptual) y los ejercicios/consignas a resolver, ignorando por completo cualquier otra sección administrativa (fundamentación, rúbricas, criterios de evaluación, cronogramas, datos de identificación, bibliografía del docente, etc.).

REGLAS DE EXTRACCIÓN:
1. Extrae y junta todo el texto explicativo/teórico del tema en el campo "theory" utilizando formato Markdown.
2. Identifica cada ejercicio, pregunta o consigna individual y colócalo como un objeto en la lista "exercises". Usa Markdown para cada consigna.
3. Ignora secciones de evaluación, notas para el docente, objetivos o indicadores.

DEVUELVE ÚNICAMENTE UN JSON VÁLIDO CON ESTA ESTRUCTURA:
{
  "theory": "Todo el desarrollo teórico aquí en Markdown...",
  "exercises": [
    { "id": 1, "content": "Texto de la consigna 1..." },
    { "id": 2, "content": "Texto de la consigna 2..." }
  ]
}

DOCUMENTO DE ORIGEN:
==================
${markdown}
==================
`;

        try {
            const openai = getXAI();
            const completion = await openai.chat.completions.create({
                model: "grok-2-latest",
                messages: [
                    { role: "system", content: "You are a helpful AI that strictly outputs valid JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
            });

            const content = completion.choices[0].message.content;
            const parsed = JSON.parse(content);

            return {
                theory: parsed.theory || '',
                exercises: parsed.exercises || []
            };

        } catch (error) {
            console.error("Error al extraer con Grok:", error);
            throw new Error("No se pudo extraer el contenido con la IA de Grok.");
        }
    }
};
