/**
 * fixDocx.js
 * Aplica el post-proceso al DOCX generado por docx-js:
 * 1. Elimina <w:tblBorders> inválidos
 * 2. Exporta a PDF usando LibreOffice
 *
 * Uso: node fixDocx.js input.docx output_dir/
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, basename, extname } from 'path';
import JSZip from 'jszip'; // npm install jszip

export async function fixDocxTableBorders(inputPath, outputPath) {
  const data = readFileSync(inputPath);
  const zip = await JSZip.loadAsync(data);

  const docXml = zip.file('word/document.xml');
  if (!docXml) throw new Error('word/document.xml no encontrado');

  let xml = await docXml.async('string');

  // Eliminar bloques <w:tblBorders>...</w:tblBorders> que causan el error de validación OOXML
  xml = xml.replace(/\s*<w:tblBorders>[\s\S]*?<\/w:tblBorders>/g, '');

  zip.file('word/document.xml', xml);

  const fixedBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  writeFileSync(outputPath, fixedBuffer);
  console.log(`✓ DOCX corregido: ${outputPath}`);
}

export function docxToPdf(docxPath, outputDir) {
  try {
    execSync(`libreoffice --headless --convert-to pdf --outdir "${outputDir}" "${docxPath}"`, {
      stdio: 'pipe',
    });

    const baseName = basename(docxPath, extname(docxPath));
    const pdfPath = join(outputDir, `${baseName}.pdf`);
    console.log(`✓ PDF generado: ${pdfPath}`);
    return pdfPath;
  } catch (err) {
    throw new Error(`Error convirtiendo a PDF: ${err.stderr?.toString() || err.message}`);
  }
}

export async function generateDocxAndPdf(inputDocx, outputDir = '.') {
  const baseName = basename(inputDocx, extname(inputDocx));
  const fixedDocx = join(outputDir, `${baseName}_final.docx`);

  await fixDocxTableBorders(inputDocx, fixedDocx);
  const pdfPath = docxToPdf(fixedDocx, outputDir);

  return { docx: fixedDocx, pdf: pdfPath };
}

// Uso directo como script:
// node fixDocx.js documento.docx ./outputs/
if (process.argv[2]) {
  const [, , input, outDir = '.'] = process.argv;
  generateDocxAndPdf(input, outDir)
    .then(({ docx, pdf }) => {
      console.log('\n=== Archivos generados ===');
      console.log('DOCX:', docx);
      console.log('PDF: ', pdf);
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}
