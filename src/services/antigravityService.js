import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPTS } from '../utils/prompts';
import { ragService } from './ragService';

// Inicializar de forma segura (normalmente no haríamos esto en frontend puro en prod,
// pero está bien para un prototipo rápido de validación).
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

/**
 * Servicio simulado para interactuar con la API de Antigravity (RAG + Generación)
 */
export const antigravityService = {
    async generateSequence(params) {
        const {
            subject, year, topic, duration,
            structure = 'Tradicional',
            templateSource = null,
            includeMedia = true,
            selectedDocs = [],
            selectedCategories = [],
            suggestions = ''
        } = params;

        // 1. Obtener contexto RAG filtrado
        const contextQuery = `${subject} ${topic} ${year}`;
        const relevantChunks = await ragService.retrieveContext(
            contextQuery,
            5,
            selectedCategories,
            selectedDocs
        );
        const contextString = relevantChunks.length > 0
            ? relevantChunks.map((chunk, i) => `--- Fragmento Referencia ${i + 1} ---\n${chunk.content}`).join('\n\n')
            : "No hay documentos específicos seleccionados o encontrados.";

        // 2. Obtener Estructura de Plantilla (si se seleccionó un archivo específico)
        let templateString = "";
        if (templateSource && templateSource !== 'None') {
            console.log(`Usando '${templateSource}' como plantilla estructural.`);
            templateString = await ragService.getDocumentTemplate(templateSource);
        }

        const prompt = `
${templateString ? `PLANTILLA ESTRUCTURAL DE REFERENCIA (USA ESTE ESQUEMA EXACTO):
${templateString}
----------------------------------------------------` : ''}

CONTEXTO DE CONOCIMIENTOS (RAG):
${contextString}

----------------------------------------------------

GENERACIÓN REQUERIDA:
- Materia: ${subject}
- Año/Nivel: ${year}
- Tema Principal: ${topic}
- Tiempo Estimado (Total de la clase/secuencia): ${duration}
- Estructura Base: ${structure}
- Incluir Multimedia: ${includeMedia ? 'SÍ' : 'NO'}

${suggestions ? `SUGERENCIAS ADICIONALES DEL USUARIO:
${suggestions}
----------------------------------------------------` : ''}

REQUISITOS CRÍTICOS DE CONTENIDO Y ORQUESTACIÓN:
1. MAXIMIZAR EJERCITACIÓN: La secuencia DEBE ser extremadamente completa. Incluye una sección extensa de "Actividades y Problemas" con al menos 10-15 ejercicios, problemas o desafíos prácticos detallados.
2. COMPLETITUD: No resumas. Desarrolla cada consigna, explica el paso a paso de las actividades y asegúrate de que el material sea listo para usar en clase.
3. SI HAY PLANTILLA: Imita el formato, los títulos y la organización visual de la "PLANTILLA ESTRUCTURAL" de arriba.
4. FORMATO: Usa '# ' para títulos, '## ' para secciones y '-' para listas.
5. CONTROL ESTRICTO DEL TIEMPO (CRONOGRAMA MATEMÁTICO):
   - Al inicio o final de CADA actividad o momento de la clase, DEBES especificar EXACTAMENTE el tiempo que le tomará a los estudiantes realizarla en MINUTOS (ej: "Duración: 15 minutos").
   - El tiempo asignado a cada ejercicio debe ser realista de acuerdo a la demanda cognitiva.
   - LA SUMA PERFECTA Y MATEMÁTICA DE TODOS ESTOS MINUTOS INDIVIDUALES DEBE IGUALAR EXACTAMENTE AL "Tiempo Estimado" total indicado en '${duration}'. Si sobra tiempo, crea más actividades; si falta, ajusta las estimaciones, pero el total DEBE cuadrar perfectamente en formato numérico justificado.
`;

        try {
            const ai = getAI();
            // Restableciendo lista de modelos con fallbacks funcionales + opciones nuevas
            const modelsToTry = ['gemini-3-flash-preview'];
            let textResponse = null;
            let lastError = null;

            for (const modelName of modelsToTry) {
                try {
                    console.log(`Intentando generar con: ${modelName}`);
                    const model = ai.getGenerativeModel({
                        model: modelName,
                        systemInstruction: SYSTEM_PROMPTS.PEDAGOGICAL_EXPERT
                    });

                    const response = await model.generateContent(prompt);
                    textResponse = response.response.text();

                    if (textResponse) {
                        console.log(`Generación exitosa con: ${modelName}`);
                        break;
                    }
                } catch (e) {
                    lastError = e;
                    const msg = e.message || '';
                    if (msg.includes('404') || msg.includes('not found')) {
                        console.warn(`Modelo ${modelName} no disponible (404). Intentando siguiente...`);
                        continue;
                    }
                    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
                        const err = new Error('HIGH_DEMAND');
                        err.type = 'HIGH_DEMAND';
                        err.detail = 'El modelo de IA recibe demasiadas solicitudes en este momento. Esperá unos segundos e intentá de nuevo.';
                        throw err;
                    }
                    if (msg.includes('503') || msg.toLowerCase().includes('overloaded') || msg.toLowerCase().includes('unavailable')) {
                        const err = new Error('HIGH_DEMAND');
                        err.type = 'HIGH_DEMAND';
                        err.detail = 'Los servidores de IA están temporalmente saturados. Por favor intentá en unos instantes.';
                        throw err;
                    }
                    throw e;
                }
            }

            if (!textResponse) throw lastError;

            return {
                success: true,
                content: textResponse,
                systemPromptUsed: "Gemini 1.5 Flash (Fallback Active)",
                contextUsed: ['RAG Context Integrated']
            };

        } catch (error) {
            console.error("Error al llamar a Gemini API:", error);
            throw error;
        }
    },

    async generateAssessment(params) {
        const {
            subject, year, topic,
            type = 'Examen Tradicional',
            difficulty = 'Intermedio',
            itemsCount = 5,
            selectedDocs = [],
            selectedSequences = [], // [{topic, content}]
            selectedCategories = [],
            suggestions = ''
        } = params;

        // 1. Obtener contexto RAG (Documentos de la KB)
        const contextQuery = `${subject} ${topic} ${year}`;
        const relevantChunks = await ragService.retrieveContext(
            contextQuery,
            5,
            selectedCategories,
            selectedDocs
        );
        let contextString = relevantChunks.length > 0
            ? relevantChunks.map((chunk, i) => `--- Fragmento KB ${i + 1} ---\n${chunk.content}`).join('\n\n')
            : "";

        // 2. Integrar contexto de Secuencias Didácticas seleccionadas
        if (selectedSequences && selectedSequences.length > 0) {
            const sequencesString = selectedSequences.map((seq, i) =>
                `--- Secuencia Didáctica de Referencia ${i + 1}: ${seq.topic} ---\n${seq.content}`
            ).join('\n\n');
            contextString = contextString
                ? `${contextString}\n\n${sequencesString}`
                : sequencesString;
        }

        if (!contextString) {
            contextString = "No hay documentos específicos de la KB ni secuencias didácticas seleccionadas como contexto previo.";
        }

        const prompt = `
CREAR EVALUACIÓN FINAL:
- Materia: ${subject}
- Año/Nivel: ${year}
- Tema Principal: ${topic}
- Tipo de Evaluación Estructural: ${type}
- Nivel de Dificultad Cognitiva: ${difficulty}
- Cantidad aproximada de ítems/preguntas: ${itemsCount}

----------------------------------------------------
CONTEXTO DE REFERENCIA (KB + SECUENCIAS):
${contextString}
----------------------------------------------------

${suggestions ? `INDICACIONES ADICIONALES DEL DOCENTE:
${suggestions}
` : ''}

REQUISITOS PEDAGÓGICOS Y ESTRUCTURALES:
1. ALINEACIÓN: La evaluación DEBE estar estrictamente alineada con los contenidos presentados en el "CONTEXTO DE REFERENCIA".
2. ENCABEZADO PROFESIONAL: Incluye campos para Nombre del Alumno, Institución, Curso y Fecha.
3. CLARIDAD: Consignas precisas, adaptadas al lenguaje del nivel ${year}.
4. TABLAS Y FORMATO: Si la evaluación requiere rúbricas o cuadros comparativos, usa tablas Markdown.
5. SOLUCIONARIO/CRITERIOS: OBLIGATORIO incluir al final una sección de "Clave de Respuestas" o "Criterios de Calificación" detallados para el docente.
`;

        try {
            const ai = getAI();
            const model = ai.getGenerativeModel({
                model: 'gemini-3-flash-preview',
                systemInstruction: SYSTEM_PROMPTS.ASSESSMENT_EXPERT
            });

            const response = await model.generateContent(prompt);
            const textResponse = response.response.text();

            return {
                success: true,
                content: textResponse
            };
        } catch (error) {
            console.error("Error al generar evaluación:", error);
            throw error;
        }
    }
};
