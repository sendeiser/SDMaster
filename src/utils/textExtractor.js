import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configurar el worker de PDF.js usando la URL de Vite para que sea accesible localmente
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const extractTextFromFile = async (file) => {
    try {
        if (file.type === 'application/pdf') {
            return await extractTextFromPDF(file);
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.endsWith('.docx')
        ) {
            return await extractTextFromDOCX(file);
        } else {
            throw new Error("Formato de archivo no soportado. Solo PDF o DOCX.");
        }
    } catch (error) {
        console.error("Error extrayendo texto del archivo:", error);
        throw error;
    }
};

const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // Items de texto tienen .str (texto) y .transform (matriz 2d, index 5 es la Y)
        // PDF.js renderiza de abajo hacia arriba, la Y puede fluir de manera extraña, agruparemos las Y similares.
        let lastY = -1;
        let pageText = '';

        for (const item of content.items) {
            if (!item.str.trim() && !pageText.endsWith(' ')) {
                pageText += ' '; // preservar espacio vacío si viene de PDF.js
                continue;
            }

            const currentY = parseFloat(item.transform[5].toFixed(1));

            if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
                // Hay un salto de línea/párrafo (tolerancia de 5 pts de altura típica de letra)
                pageText += '\n';
            }

            pageText += item.str;
            lastY = currentY;
        }

        fullText += pageText + '\n\n'; // Doble salto de línea al cambiar de página
    }

    // Normalizar a saltos más estándar
    return fullText.replace(/\n{3,}/g, '\n\n');
};

const extractTextFromDOCX = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    // En lugar de raw text puro que destruye algunos espacios entre párrafos, usamos una extracción levemente mejor
    const result = await mammoth.extractRawText({ arrayBuffer });

    // Mammoth a veces deja el texto excesivamente compacto, normalizamos:
    let text = result.value || '';

    // Reemplazar saltos de línea carriage return con newline normal
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');

    return text;
};
