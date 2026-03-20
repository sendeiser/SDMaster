import Groq from "groq-sdk";

let groqInstance = null;
const getGroq = () => {
    if (!groqInstance) {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) {
            throw new Error("VITE_GROQ_API_KEY no encontrada en el archivo .env (es necesaria para extraer el contenido).");
        }
        groqInstance = new Groq({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true, // Enable for frontend
        });
    }
    return groqInstance;
};

export const groqService = {
    /**
     * Extracts theory and exercises from raw assignment markdown via Groq API (LLaMA 3).
     * @param {string} markdown - The full administrative markdown.
     * @returns {Promise<{theory: string, exercises: {id: string|number, content: string}[]}>}
     */
    async extractStudentContent(markdown) {
        if (!markdown) return { theory: '', exercises: [] };

        const prompt = `
Eres un asistente experto en procesamiento de texto pedagógico.
Se te entregará un documento Markdown (Secuencia Didáctica) que contiene secciones para el docente (Fundamentación, Rúbricas, Bibliografía) y material para el alumno (Desarrollo Teórico, Actividades, Ejercicios).

TU OBJETIVO: Extraer únicamente el material para el alumno estructurándolo en formato JSON.

REGLAS DE EXTRACCIÓN:
1. Campo "theory": Junta aquí todo el texto explicativo/teórico del tema ("Marco Teórico", "Desarrollo Teórico", "Lectura"). Conserva el formato Markdown. Si no hay, devuelve "".
2. Campo "exercises": Una lista de objetos JSON. Extrae cada ejercicio, pregunta o consigna individual del documento. 
   - Cada objeto DEBE tener "id" (string único, ej: "ex1") y "content" (texto en Markdown de la pregunta/consigna).
3. IGNORA: Datos de Identificación, Fundamentaciones, Objetivos explícitos, Contenidos, Rúbricas, Metodologías, Bibliografías y Notas Docentes.

FORMATO DE SALIDA OBLIGATORIO (JSON VÁLIDO):
{
  "theory": "Texto en markdown...",
  "exercises": [
    { "id": "1", "content": "Pregunta 1..." },
    { "id": "2", "content": "Pregunta 2..." }
  ]
}

DOCUMENTO ORIGEN:
==================
${markdown}
==================
`;

        try {
            const groq = getGroq();
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You output valid JSON format exactly as requested." },
                     { role: "user", content: prompt }
                ],
                model: "llama-3.1-8b-instant", // Extremely fast and good enough for structural parsing
                temperature: 0.1,
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0]?.message?.content || "{}";
            const parsed = JSON.parse(content);

            return {
                theory: parsed.theory || '',
                exercises: parsed.exercises || []
            };

        } catch (error) {
            console.warn("Aviso: Falló la extracción con Groq (quizás límite de uso). Intentando con Gemini como respaldo...", error.message || error);
            
            // Fallback robusto a Gemini si Groq falla (ej. Rate Limit 429)
            try {
                const { GoogleGenerativeAI } = await import('@google/generative-ai');
                const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!geminiApiKey) throw new Error("No hay key de Gemini disponible para el respaldo.");
                
                const ai = new GoogleGenerativeAI(geminiApiKey);
                const model = ai.getGenerativeModel({
                    model: 'gemini-3-flash-preview',
                    systemInstruction: "You output valid JSON format exactly as requested."
                });
                
                const response = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                });
                
                const textResponse = response.response.text();
                const parsed = JSON.parse(textResponse);
                
                return {
                    theory: parsed.theory || '',
                    exercises: parsed.exercises || []
                };
            } catch (fallbackError) {
                console.error("También falló el respaldo de Gemini:", fallbackError);
                throw new Error("Límite de uso alcanzado en Groq y Gemini. Por favor, reportalo a tu profesor o intenta de nuevo más tarde.");
            }
        }
    }
};
