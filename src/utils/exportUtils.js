import katex from 'katex';
import { marked } from 'marked';

/**
 * Convierte Markdown con LaTeX a HTML limpio listo para Word/PDF
 * Renderiza $$...$$ y $...$ con KaTeX antes de exportar
 */
export function markdownToExportHtml(mdContent) {
  if (!mdContent) return '';

  // 1. Renderizar LaTeX de bloque: $$...$$
  let processed = mdContent.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return `<span class="math-error">${tex}</span>`;
    }
  });

  // 2. Renderizar LaTeX inline: $...$
  processed = processed.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode: false,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return `<span class="math-error">${tex}</span>`;
    }
  });

  // 3. Convertir Markdown a HTML
  return marked.parse(processed);
}

/**
 * Genera el HTML completo para exportar a Word (.doc)
 */
export function buildWordHtml(htmlContent, meta = {}) {
  const { subject = '', year = '', topic = '', date = new Date().toLocaleDateString() } = meta;

  // Incluir CSS de KaTeX inline para que Word lo procese
  return `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${topic || 'Documento'}</title>
  <style>
    body {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 60px;
    }
    h1 {
      font-size: 20pt;
      font-weight: 700;
      color: #1e293b;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 8px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    h2 {
      font-size: 15pt;
      font-weight: 700;
      color: #334155;
      border-left: 4px solid #0284c7;
      padding-left: 10px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    h3 {
      font-size: 13pt;
      font-weight: 600;
      color: #475569;
      margin-top: 16px;
      margin-bottom: 8px;
    }
    p {
      margin-bottom: 10px;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }
    th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    ul, ol {
      margin: 8px 0 8px 24px;
      padding: 0;
    }
    li {
      margin-bottom: 4px;
    }
    blockquote {
      border-left: 3px solid #0284c7;
      margin: 12px 0;
      padding: 8px 16px;
      background: #f0f9ff;
      color: #0c4a6e;
    }
    code {
      font-family: 'Courier New', monospace;
      background: #f1f5f9;
      padding: 2px 4px;
      font-size: 9pt;
      border-radius: 3px;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 9pt;
      overflow-x: auto;
      margin: 12px 0;
    }
    /* KaTeX overrides para Word */
    .katex { font-size: 1em !important; }
    .katex-display { margin: 12px 0; }
    .math-error {
      color: #dc2626;
      font-family: monospace;
      background: #fef2f2;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .header-meta {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 24px;
      font-size: 9pt;
      color: #64748b;
    }
    .footer-note {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 9pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header-meta">
    <span><strong>${subject}</strong>${year ? ` | ${year}` : ''}</span>
    <span>Generado el ${date}</span>
  </div>
  ${htmlContent}
  <div class="footer-note">Documento generado por SD Master Pro</div>
</body>
</html>`;
}
