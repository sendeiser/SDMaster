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
        const strings = content.items.map(item => item.str);
        fullText += strings.join(' ') + '\n';
    }

    return fullText;
};

const extractTextFromDOCX = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
};
