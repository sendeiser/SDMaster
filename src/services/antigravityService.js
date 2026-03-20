import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPTS } from '../utils/prompts';
import { ragService } from './ragService';
import { supabase } from '../lib/supabaseClient';

/**
 * Descuenta 1 crédito del usuario autenticado.
 * Lanza un error con type='NO_CREDITS' si no tiene saldo.
 */
const checkAndDeductCredit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // no autenticado: dejar pasar (el resto del sistema protege)

    const { data, error } = await supabase.rpc('deduct_credit', { p_user_id: user.id });
    if (error) {
        console.warn('Error descontando crédito:', error);
        return; // Si falla el RPC, no bloqueamos: fail open
    }
    if (data === false) {
        const err = new Error('NO_CREDITS');
        err.type = 'NO_CREDITS';
        err.detail = '¡Te quedaste sin créditos! Mejorá tu plan para seguir generando.';
        throw err;
    }
};

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
        // 0. Verificar créditos antes de generar
        await checkAndDeductCredit();

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
${templateString ? `
════════════════════════════════════════════════════════
PLANTILLA ESTRUCTURAL SELECCIONADA POR EL DOCENTE
════════════════════════════════════════════════════════
${templateString}
════════════════════════════════════════════════════════

🚨 REGLA ABSOLUTA DE PLANTILLA:
- DEBES seguir ESTRICTAMENTE la estructura de la plantilla anterior.
- Replica EXACTAMENTE sus títulos, secciones, orden y formato visual.
- NO inventes secciones nuevas ni omitas ninguna sección de la plantilla.
- Si la plantilla tiene tablas de datos (ej: institución, materia, fecha), mantenlas.
- Adapta SOLO el contenido interno (textos, ejercicios, temas) al tema solicitado.
- PERO SIEMPRE incluye una sección de DESARROLLO TEÓRICO con explicación conceptual extensiva (mínimo 400 palabras), definiciones, ejemplos resueltos y fórmulas si aplica. Si la plantilla no la tiene, agrégala ANTES de la sección de actividades prácticas.
` : `
(No se seleccionó plantilla — usa la estructura por defecto del system prompt)
`}

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

REQUISITOS CRÍTICOS DE CONTENIDO:
1. DESARROLLO TEÓRICO OBLIGATORIO: SIEMPRE incluí una sección "## Desarrollo Teórico" con explicación completa del tema (definiciones, conceptos, ejemplos resueltos, fórmulas si aplica). Mínimo 400 palabras. DEBE ir ANTES de las actividades prácticas.
2. MAXIMIZAR EJERCITACIÓN: Sección extensa de "Actividades y Problemas" con al menos 10-15 ejercicios detallados.
3. COMPLETITUD: No resumas. Desarrolla cada consigna paso a paso. Material listo para clase.
4. FORMATO: Markdown GFM exclusivamente. '# ' para título, '## ' para secciones, '### ' para sub-conceptos.
5. CONTROL ESTRICTO DEL TIEMPO (CRONOGRAMA):
   - CADA actividad DEBE tener su duración en minutos.
   - LA SUMA DE TODOS LOS MINUTOS DEBE IGUALAR EXACTAMENTE '${duration}'.
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
        // 0. Verificar créditos antes de generar
        await checkAndDeductCredit();

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
    },

    async gradeSubmission(assignmentContent, studentResponse) {
        if (!assignmentContent || !studentResponse) {
            throw new Error("Se requiere la consigna original y la respuesta del alumno para corregir.");
        }

        const prompt = `
════════════════════════════════════════════════════════
CONSIGNA ORIGINAL DE LA TAREA/EVALUACIÓN:
════════════════════════════════════════════════════════
${assignmentContent}

════════════════════════════════════════════════════════
RESPUESTA DEL ESTUDIANTE:
════════════════════════════════════════════════════════
${studentResponse}
`;

        try {
            const ai = getAI();
            const model = ai.getGenerativeModel({
                model: 'gemini-3-flash-preview',
                systemInstruction: SYSTEM_PROMPTS.AUTOGRADER_EXPERT
            });

            // We request JSON output format from Gemini
            const response = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                }
            });
            
            let textResponse = response.response.text();
            
            try {
                // Strip markdown blocks if present
                if (textResponse.startsWith('```json')) {
                    textResponse = textResponse.replace(/^```json/, '').replace(/```$/, '').trim();
                } else if (textResponse.startsWith('```')) {
                    textResponse = textResponse.replace(/^```/, '').replace(/```$/, '').trim();
                }

                if (Array.isArray(result)) result = result[0];

                // --- 1. Score Extraction ---
                let extractedScore = 1;
                const scoreKeys = ['score', 'puntuacion_estimada', 'calificacion_estimada', 'puntos', 'calificacion'];
                
                const findScore = (obj) => {
                    for (const key of scoreKeys) {
                        if (obj[key] !== undefined) return obj[key];
                    }
                    if (obj.resumen_desempeno?.calificacion_estimada !== undefined) return obj.resumen_desempeno.calificacion_estimada;
                    if (obj.evaluacion_tarea?.puntuacion_estimada !== undefined) return obj.evaluacion_tarea.puntuacion_estimada;
                    return null;
                };
                
                const foundScore = findScore(result);
                if (foundScore !== null) extractedScore = foundScore;

                // --- 2. Feedback Extraction & Formatting ---
                let extractedFeedback = "";

                // If LLM actually sent "feedback" as a nice string, prioritize it
                if (typeof result.feedback === 'string' && result.feedback.length > 10) {
                    extractedFeedback = result.feedback;
                } else {
                    // Build a comprehensive Markdown report from the object
                    const reportLines = [];
                    const r = result;

                    // Section: General Overview
                    const generalObs = r.feedback || r.comentarios_pedagogicos || r.evaluacion_tarea?.comentarios_pedagogicos || r.resumen_desempeno?.observaciones_generales || r.resumen_evaluacion || r.observaciones;
                    if (generalObs) {
                        reportLines.push(`### 📝 Observaciones Generales\n${generalObs}`);
                    }

                    // Section: Performance analysis (by item or general)
                    const items = r.analisis_por_item || r.analisis_detallado || r.analisis_ejercicios || r.items || r.analisis_de_desempeno;
                    if (items && Array.isArray(items)) {
                        reportLines.push(`\n### 🔍 Análisis por Item`);
                        items.forEach(item => {
                            const num = item.item || item.id || item.ejercicio || item.pregunta || '?';
                            const res = item.resultado || item.estado || '';
                            const comm = item.comentario || item.detalle || item.observacion || '';
                            reportLines.push(`- **Ejercicio ${num}**: ${res ? `_${res}_` : ''} ${comm}`);
                        });
                    } else if (items && typeof items === 'object') {
                        // Case like "analisis_detallado": { "pregunta_1": { ... } }
                        reportLines.push(`\n### 🔍 Análisis Detallado`);
                        Object.entries(items).forEach(([key, val]) => {
                            const name = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            const status = val.estado || val.resultado || '';
                            const errors = val.errores_detallados || val.errores_detectados || [];
                            reportLines.push(`- **${name}**: ${status ? `_${status}_` : ''}`);
                            if (Array.isArray(errors)) errors.forEach(e => reportLines.push(`  - ❌ ${e}`));
                        });
                    }

                    // Section: Suggestions
                    const sugs = r.sugerencias_mejora || r.sugerencias_pedagogicas || r.evaluacion_tarea?.sugerencias_mejora || r.sugerencias;
                    if (sugs) {
                        reportLines.push(`\n### 💡 Sugerencias de Mejora`);
                        if (Array.isArray(sugs)) {
                            sugs.forEach(s => reportLines.push(`- ${s}`));
                        } else {
                            reportLines.push(sugs);
                        }
                    }

                    extractedFeedback = reportLines.join('\n');

                    // Final fallback if we still have nothing
                    if (!extractedFeedback.trim()) {
                        extractedFeedback = typeof r.feedback === 'string' ? r.feedback : "Se generó una evaluación detallada (ver desglose).";
                    }
                }

                return {
                    success: true,
                    score: Number(extractedScore) || 1,
                    feedback: extractedFeedback
                };
            } catch (parseError) {
                console.error("Error parseando respuesta JSON del LLM:", textResponse);
                throw new Error("Error interno al interpretar la corrección de la IA.");
            }

        } catch (error) {
            console.error("Error en AutoGrader:", error);
            throw error;
        }
    }
};
