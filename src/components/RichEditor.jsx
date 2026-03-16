import React, { useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Edit3, Eye, Bold, Italic, List, Table2, Minus, Code2, Heading2 } from 'lucide-react';
import 'katex/dist/katex.min.css';

/**
 * RichEditor — Editor Markdown puro con vista previa en vivo.
 * El valor siempre es Markdown, nunca HTML. Elimina el ciclo marked↔turndown.
 */
const RichEditor = ({ value = '', onChange }) => {
    const textareaRef = useRef(null);

    const countWords = (text) => {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(Boolean).length;
    };

    // Inserta texto en el cursor del textarea
    const insertAtCursor = useCallback((before, placeholder = 'texto', after = '') => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = value.substring(start, end) || placeholder;
        const newText = value.substring(0, start) + before + selected + after + value.substring(end);
        onChange(newText);
        // Restaurar el foco y la selección después del render
        setTimeout(() => {
            ta.focus();
            const newCursorStart = start + before.length;
            const newCursorEnd = newCursorStart + selected.length;
            ta.setSelectionRange(newCursorStart, newCursorEnd);
        }, 10);
    }, [value, onChange]);

    const insertLine = useCallback((prefix) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        // Encontrar el inicio de la línea actual
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = value.indexOf('\n', start);
        const line = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
        const newLine = prefix + (line.startsWith(prefix) ? line.slice(prefix.length) : line);
        const newValue = value.substring(0, lineStart) + newLine + (lineEnd === -1 ? '' : value.substring(lineEnd));
        onChange(newValue);
    }, [value, onChange]);

    const toolbarActions = [
        { icon: <Heading2 size={14} />, title: 'Encabezado H2', action: () => insertLine('## ') },
        { icon: <Bold size={14} />, title: 'Negrita', action: () => insertAtCursor('**', 'texto en negrita', '**') },
        { icon: <Italic size={14} />, title: 'Cursiva', action: () => insertAtCursor('*', 'texto en cursiva', '*') },
        { icon: <Code2 size={14} />, title: 'Código inline', action: () => insertAtCursor('`', 'código', '`') },
        { separator: true },
        { icon: <List size={14} />, title: 'Lista', action: () => insertLine('- ') },
        { separator: true },
        {
            icon: <Table2 size={14} />, title: 'Insertar tabla', action: () => {
                const tableTemplate = `\n| Columna 1 | Columna 2 | Columna 3 |\n|-----------|-----------|----------|\n| Celda 1   | Celda 2   | Celda 3  |\n| Celda 4   | Celda 5   | Celda 6  |\n`;
                const ta = textareaRef.current;
                if (!ta) return;
                const pos = ta.selectionStart;
                onChange(value.substring(0, pos) + tableTemplate + value.substring(pos));
            }
        },
        { icon: <Minus size={14} />, title: 'Separador', action: () => { const ta = textareaRef.current; if (!ta) return; const pos = ta.selectionStart; onChange(value.substring(0, pos) + '\n---\n' + value.substring(pos)); } },
    ];

    return (
        <div className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden shadow-lg bg-white h-full">
            {/* Barra de herramientas */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center gap-1">
                    <span className="flex items-center justify-center p-1.5 bg-brand-100 text-brand-600 rounded-lg mr-2">
                        <Edit3 size={13} />
                    </span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-3">
                        Editor Markdown
                    </span>
                    <div className="w-px h-4 bg-slate-200 mr-2" />
                    {toolbarActions.map((action, idx) =>
                        action.separator
                            ? <div key={idx} className="w-px h-4 bg-slate-200 mx-1" />
                            : (
                                <button
                                    key={idx}
                                    type="button"
                                    title={action.title}
                                    onClick={action.action}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                >
                                    {action.icon}
                                </button>
                            )
                    )}
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono">
                    <span>{countWords(value)} palabras</span>
                    <span className="text-slate-200">|</span>
                    <span>{(value || '').length} caracteres</span>
                </div>
            </div>

            {/* Panel dividido: Editor | Vista previa */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Editor Markdown */}
                <div className="flex-1 flex flex-col border-r border-slate-100 min-w-0">
                    <div className="flex items-center px-3 py-1.5 bg-slate-50/80 border-b border-slate-100">
                        <Edit3 size={11} className="text-slate-400 mr-1.5" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Markdown</span>
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="flex-1 w-full p-4 font-mono text-[12px] text-slate-700 leading-relaxed resize-none outline-none bg-white custom-scrollbar"
                        placeholder="Escribe tu contenido en Markdown aquí...

# Título Principal
## Sección

Texto con **negrita** e *cursiva*.

| Col 1 | Col 2 |
|-------|-------|
| Dato  | Dato  |

Fórmula en línea: $E = mc^2$

Fórmula en bloque:
$$\int_a^b f(x)\,dx$$"
                        spellCheck={false}
                    />
                </div>

                {/* Vista previa */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <div className="flex items-center px-3 py-1.5 bg-slate-50/80 border-b border-slate-100">
                        <Eye size={11} className="text-brand-500 mr-1.5" />
                        <span className="text-[9px] font-bold text-brand-500 uppercase tracking-widest">Vista Previa</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="academic-preview">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex, rehypeRaw]}
                            >
                                {value || '*El texto aparecerá aquí...*'}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RichEditor;
