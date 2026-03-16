/**
 * docExporter.js
 * ============================
 * Exportación profesional de Markdown a PDF y Word.
 * 
 * - Pre-renderiza LaTeX ($..$ y $$..$$) con KaTeX antes de generar HTML.
 * - PDF: Abre ventana de impresión con HTML académico + KaTeX renderizado.
 * - Word: Genera .doc con HTML formateado (compatible con MS Word/LibreOffice).
 * 
 * No bloquea el hilo principal.
 */

import { marked } from 'marked';
import katex from 'katex';

marked.setOptions({ gfm: true, breaks: true });

// ─── Preprocesar LaTeX en el Markdown ─────────────────────
// Convierte $...$ y $$...$$ en HTML de KaTeX antes de pasar a marked.
function preprocessLatex(markdown) {
    if (!markdown) return '';

    // Primero: bloques $$...$$
    let result = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
        try {
            return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false, output: 'html' });
        } catch {
            return `<div class="katex-error" style="color:red;">[Error LaTeX: ${expr.trim()}]</div>`;
        }
    });

    // Segundo: inline $...$  (no matchear $$ ni $ sueltos)
    result = result.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_, expr) => {
        try {
            return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false, output: 'html' });
        } catch {
            return `<span class="katex-error" style="color:red;">[${expr.trim()}]</span>`;
        }
    });

    return result;
}

// ─── Convertir Markdown a HTML con LaTeX renderizado ──────
function markdownToHTML(markdown) {
    const withLatex = preprocessLatex(markdown);
    return marked.parse(withLatex);
}

// ─── Estilos CSS compartidos ──────────────────────────────
const KATEX_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';

const BASE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 10.5pt;
    color: #1e293b;
    line-height: 1.75;
}

/* ── Encabezados ── */
h1 {
    font-size: 17pt;
    font-weight: 900;
    color: #0f172a;
    border-bottom: 2.5px solid #1e40af;
    padding-bottom: 5px;
    margin: 22px 0 14px 0;
    letter-spacing: -0.02em;
}

h2 {
    font-size: 13pt;
    font-weight: 800;
    color: #1e3a8a;
    border-left: 4px solid #2563eb;
    padding-left: 10px;
    margin: 18px 0 10px 0;
}

h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #334155;
    margin: 14px 0 7px 0;
}

h4, h5, h6 {
    font-size: 10pt;
    font-weight: 700;
    color: #475569;
    margin: 10px 0 5px 0;
}

/* ── Texto ── */
p {
    margin-bottom: 7px;
    text-align: justify;
}

strong { font-weight: 700; color: #0f172a; }
em { font-style: italic; }

/* ── Listas ── */
ul, ol {
    margin: 7px 0 7px 22px;
    color: #334155;
}

li {
    margin-bottom: 3px;
    line-height: 1.65;
}

/* ── Tablas ── */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 9.5pt;
}

th {
    background-color: #1e3a8a;
    color: white;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 8pt;
    letter-spacing: 0.06em;
    padding: 7px 10px;
    text-align: left;
    border: 1px solid #1e3a8a;
}

td {
    padding: 5px 10px;
    border: 1px solid #cbd5e1;
    color: #334155;
    vertical-align: top;
    line-height: 1.5;
}

tr:nth-child(even) td {
    background-color: #f8fafc;
}

/* ── Código ── */
code {
    background-color: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    color: #dc2626;
}

pre {
    background-color: #0f172a;
    color: #e2e8f0;
    padding: 12px 16px;
    border-radius: 6px;
    margin: 10px 0;
    font-size: 8.5pt;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: break-word;
}

pre code {
    background: none;
    color: inherit;
    padding: 0;
}

/* ── Blockquote ── */
blockquote {
    border-left: 4px solid #bfdbfe;
    padding: 7px 14px;
    margin: 10px 0;
    background-color: #eff6ff;
    border-radius: 0 6px 6px 0;
    color: #1e40af;
    font-style: italic;
}

/* ── Separador ── */
hr {
    border: none;
    border-top: 1.5px solid #e2e8f0;
    margin: 18px 0;
}

/* ── Links ── */
a { color: #2563eb; text-decoration: underline; }

/* ── Imágenes ── */
img { max-width: 100%; margin: 8px 0; border-radius: 4px; }

/* ── KaTeX ── */
.katex-display {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 16px;
    margin: 12px 0;
    text-align: center;
    overflow-x: auto;
}

.katex { font-size: 1.05em; }
`;

// ─── Estilos adicionales solo para PDF print ──────────────
const PDF_EXTRA_STYLES = `
@page {
    size: A4;
    margin: 18mm 16mm 22mm 16mm;
}

body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

.doc-header {
    background-color: #1e3a8a;
    color: white;
    padding: 12px 20px;
    margin: -18mm -16mm 18px -16mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.doc-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #1e40af;
}

.doc-meta-left { }

.doc-meta-left .doc-title {
    font-size: 16pt;
    font-weight: 900;
    color: #0f172a;
    line-height: 1.2;
    margin-bottom: 4px;
}

.doc-meta-left .doc-subtitle {
    font-size: 9pt;
    color: #64748b;
    font-weight: 500;
}

.doc-meta-right {
    text-align: right;
    flex-shrink: 0;
}

.doc-badge {
    display: inline-block;
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 7.5pt;
    font-weight: 800;
    color: #1e40af;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.doc-date {
    font-size: 7.5pt;
    color: #94a3b8;
    margin-top: 6px;
    font-family: 'Courier New', monospace;
}

thead { display: table-header-group; }
tr { page-break-inside: avoid; }
h1, h2, h3, h4 { page-break-after: avoid; }
p { orphans: 3; widows: 3; }

.doc-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    font-size: 7pt;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding: 5px 16mm;
    display: flex;
    justify-content: space-between;
}
`;

// ─── Estilos Word ────────────────────────────────────────
const WORD_EXTRA_STYLES = `
@page { size: A4; margin: 2cm; }
body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
th { background-color: #1e3a8a !important; color: white !important; }
tr:nth-child(even) td { background-color: #f8fafc !important; }
pre { background-color: #f1f5f9 !important; color: #334155 !important; }
blockquote { background-color: #eff6ff !important; }
`;

// ═══════════════════════════════════════════════════════════
//  EXPORTAR A PDF
// ═══════════════════════════════════════════════════════════

export async function exportToPDF(markdown, meta = {}, fileName = 'documento') {
    const html = markdownToHTML(markdown);

    const fullPage = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${fileName}</title>
    <link rel="stylesheet" href="${KATEX_CDN}">
    <style>
        ${BASE_STYLES}
        ${PDF_EXTRA_STYLES}
    </style>
</head>
<body>
    <div class="doc-header">
        <span>SD Master — Planificación Docente</span>
        <span>${(meta.type || 'Documento Académico').toUpperCase()}</span>
    </div>

    <div class="doc-meta">
        <div class="doc-meta-left">
            <div class="doc-title">${meta.topic || 'Documento Académico'}</div>
            <div class="doc-subtitle">${[meta.subject, meta.year].filter(Boolean).join(' · ')}</div>
        </div>
        <div class="doc-meta-right">
            <span class="doc-badge">${meta.difficulty || meta.type || 'Académico'}</span>
            <div class="doc-date">${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
    </div>

    ${html}

    <div class="doc-footer">
        <span>${meta.subject || ''} — ${meta.topic || ''}</span>
        <span>SD Master · ${new Date().toLocaleDateString('es-AR')}</span>
    </div>

    <script>
        // Esperar a que KaTeX CSS cargue y fuentes se rendericen
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 800);
        };
        window.onafterprint = function() {
            window.close();
        };
    </script>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=900,height=750');
    if (!printWin) {
        throw new Error('Popup bloqueado: habilitá las ventanas emergentes para exportar a PDF.');
    }
    printWin.document.write(fullPage);
    printWin.document.close();
}

// ═══════════════════════════════════════════════════════════
//  EXPORTAR A WORD
// ═══════════════════════════════════════════════════════════

export async function exportToWord(markdown, meta = {}, fileName = 'documento') {
    const html = markdownToHTML(markdown);

    const wordDoc = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>${fileName}</title>
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <link rel="stylesheet" href="${KATEX_CDN}">
    <style>
        ${BASE_STYLES}
        ${WORD_EXTRA_STYLES}
    </style>
</head>
<body>
    <table style="width:100%; border:none; margin-bottom:12px;">
        <tr style="border:none;">
            <td style="border:none; padding:3px 0;">
                <strong style="color:#1e3a8a; font-size:9pt; text-transform:uppercase; letter-spacing:0.1em;">
                    SD Master — Documento de Planificación Docente
                </strong>
            </td>
        </tr>
        <tr style="border:none;">
            <td style="border:none; padding:2px 0; font-size:9pt; color:#64748b;">
                ${[meta.subject, meta.year, meta.type].filter(Boolean).join(' | ')} — ${new Date().toLocaleDateString('es-AR')}
            </td>
        </tr>
    </table>
    <hr style="border:none; border-top:2px solid #1e40af; margin-bottom:14px;">

    ${html}

    <hr style="border:none; border-top:1px solid #e2e8f0; margin-top:22px;">
    <p style="font-size:8pt; color:#94a3b8; text-align:center; font-style:italic;">
        Documento de Planificación — ${meta.subject || ''} — Generado el ${new Date().toLocaleDateString('es-AR')}
    </p>
</body>
</html>`;

    const blob = new Blob(['\ufeff' + wordDoc], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
