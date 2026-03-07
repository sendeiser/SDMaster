import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
    Bold, Italic, Strikethrough, Code, Link, Image, List, ListOrdered,
    Quote, Minus, Table, Eye, Edit3, Columns, Heading1, Heading2, Heading3,
    Undo, Redo, AlignLeft, AlignCenter, AlignRight, Type
} from 'lucide-react';

// ————— Markdown Components (rich styled) —————
const mdComponents = {
    h1: ({ children }) => <h1 className="text-2xl font-black text-slate-900 mt-8 mb-3 pb-2 border-b border-slate-200 tracking-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2 tracking-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-bold text-slate-700 mt-4 mb-1">{children}</h3>,
    p: ({ children }) => <p className="text-sm text-slate-700 leading-relaxed mb-3">{children}</p>,
    strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
    em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
    del: ({ children }) => <del className="line-through text-slate-400">{children}</del>,
    code: ({ inline, children }) => inline
        ? <code className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
        : <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto my-4 leading-relaxed">{children}</pre>,
    blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-brand-400 pl-4 py-1 my-3 bg-brand-50/50 rounded-r-lg text-brand-800 italic text-sm">{children}</blockquote>
    ),
    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-slate-700 pl-2">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-slate-700 pl-2">{children}</ol>,
    li: ({ children }) => <li className="text-sm text-slate-700 leading-relaxed">{children}</li>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-800 underline underline-offset-2 transition-colors">{children}</a>,
    img: ({ src, alt }) => <img src={src} alt={alt} className="max-w-full rounded-xl my-4 shadow-md" />,
    table: ({ children }) => (
        <div className="overflow-x-auto my-4 rounded-xl border border-slate-200">
            <table className="w-full text-sm">{children}</table>
        </div>
    ),
    th: ({ children }) => <th className="px-4 py-2 bg-slate-50 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">{children}</th>,
    td: ({ children }) => <td className="px-4 py-2 text-slate-700 border-b border-slate-100">{children}</td>,
    hr: () => <hr className="my-6 border-slate-200" />,
};

// ————— Toolbar Button —————
const TBtn = ({ onClick, icon, label, active, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        className={`
            flex items-center justify-center w-7 h-7 rounded text-slate-500 transition-all
            hover:bg-slate-100 hover:text-slate-900 active:scale-90
            ${active ? 'bg-brand-100 text-brand-700' : ''}
            ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        `}
    >
        {icon}
    </button>
);

const Divider = () => <div className="w-px h-5 bg-slate-200 mx-0.5 flex-shrink-0" />;

// ————— Insert helper —————
const useInsert = (value, onChange, textareaRef) => {
    return useCallback((before, after = '', placeholder = '') => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selected = value.substring(start, end) || placeholder;
        const newVal = value.substring(0, start) + before + selected + after + value.substring(end);
        onChange(newVal);
        setTimeout(() => {
            el.focus();
            const cursor = start + before.length;
            el.setSelectionRange(cursor, cursor + selected.length);
        }, 10);
    }, [value, onChange, textareaRef]);
};

// ————— Main RichEditor Component —————
const RichEditor = ({ value, onChange, fontFamily = "'Inter', sans-serif", mdPreviewComponents }) => {
    const [activeTab, setActiveTab] = useState('write'); // 'write' | 'preview' | 'split'
    const [history, setHistory] = useState([value]);
    const [histIdx, setHistIdx] = useState(0);
    const textareaRef = useRef(null);

    // Push history on meaningful change (debounced)
    const historyTimer = useRef(null);
    const pushHistory = useCallback((v) => {
        clearTimeout(historyTimer.current);
        historyTimer.current = setTimeout(() => {
            setHistory(prev => {
                const trimmed = prev.slice(0, histIdx + 1);
                return [...trimmed, v].slice(-50); // max 50 snapshots
            });
            setHistIdx(prev => Math.min(prev + 1, 49));
        }, 600);
    }, [histIdx]);

    const handleChange = (newVal) => {
        onChange(newVal);
        pushHistory(newVal);
    };

    const undo = () => {
        if (histIdx <= 0) return;
        const newIdx = histIdx - 1;
        setHistIdx(newIdx);
        onChange(history[newIdx]);
    };

    const redo = () => {
        if (histIdx >= history.length - 1) return;
        const newIdx = histIdx + 1;
        setHistIdx(newIdx);
        onChange(history[newIdx]);
    };

    const insert = useInsert(value, handleChange, textareaRef);

    // Keyboard shortcuts
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        const handler = (e) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (!ctrl) return;
            if (e.key === 'b') { e.preventDefault(); insert('**', '**', 'negrita'); }
            if (e.key === 'i') { e.preventDefault(); insert('*', '*', 'cursiva'); }
            if (e.key === 'k') { e.preventDefault(); insert('[', '](url)', 'texto'); }
            if (e.key === 'z') { e.preventDefault(); undo(); }
            if (e.key === 'y') { e.preventDefault(); redo(); }
        };
        el.addEventListener('keydown', handler);
        return () => el.removeEventListener('keydown', handler);
    }, [insert, undo, redo]);

    // Tab key inserts spaces
    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            insert('  ', '', '');
        }
    };

    const components = mdPreviewComponents || mdComponents;

    const tabBtn = (id, label, Icon) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all
                ${activeTab === id
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-400 hover:text-slate-700'}
            `}
        >
            <Icon size={13} />
            {label}
        </button>
    );

    return (
        <div className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden shadow-lg bg-white">

            {/* ——— Header Bar ——— */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                {/* Tabs */}
                <div className="flex gap-1 p-0.5 bg-slate-100 rounded-xl">
                    {tabBtn('write', 'Escribir', Edit3)}
                    {tabBtn('preview', 'Vista previa', Eye)}
                    {tabBtn('split', 'Dividir', Columns)}
                </div>

                {/* Right: undo/redo */}
                <div className="flex items-center gap-1">
                    <TBtn onClick={undo} icon={<Undo size={13} />} label="Deshacer (Ctrl+Z)" disabled={histIdx <= 0} />
                    <TBtn onClick={redo} icon={<Redo size={13} />} label="Rehacer (Ctrl+Y)" disabled={histIdx >= history.length - 1} />
                </div>
            </div>

            {/* ——— Toolbar ——— */}
            {(activeTab === 'write' || activeTab === 'split') && (
                <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-white border-b border-slate-100">
                    {/* Headings */}
                    <TBtn onClick={() => insert('\n# ', '', 'Título')} icon={<Heading1 size={14} />} label="Título H1" />
                    <TBtn onClick={() => insert('\n## ', '', 'Subtítulo')} icon={<Heading2 size={14} />} label="Subtítulo H2" />
                    <TBtn onClick={() => insert('\n### ', '', 'Sección')} icon={<Heading3 size={14} />} label="Sección H3" />
                    <Divider />

                    {/* Inline format */}
                    <TBtn onClick={() => insert('**', '**', 'negrita')} icon={<Bold size={14} />} label="Negrita (Ctrl+B)" />
                    <TBtn onClick={() => insert('*', '*', 'cursiva')} icon={<Italic size={14} />} label="Cursiva (Ctrl+I)" />
                    <TBtn onClick={() => insert('~~', '~~', 'tachado')} icon={<Strikethrough size={14} />} label="Tachado" />
                    <TBtn onClick={() => insert('`', '`', 'código')} icon={<Code size={14} />} label="Código inline" />
                    <Divider />

                    {/* Blocks */}
                    <TBtn onClick={() => insert('\n> ', '', 'cita destacada')} icon={<Quote size={14} />} label="Cita" />
                    <TBtn onClick={() => insert('\n- ', '', 'elemento')} icon={<List size={14} />} label="Lista" />
                    <TBtn onClick={() => insert('\n1. ', '', 'elemento')} icon={<ListOrdered size={14} />} label="Lista numerada" />
                    <TBtn onClick={() => insert('\n---\n', '', '')} icon={<Minus size={14} />} label="Separador" />
                    <Divider />

                    {/* Table */}
                    <TBtn
                        onClick={() => insert('\n| Columna 1 | Columna 2 | Columna 3 |\n|---|---|---|\n| ', ' | dato | dato |\n', 'dato')}
                        icon={<Table size={14} />}
                        label="Tabla"
                    />
                    <Divider />

                    {/* Link & Image */}
                    <TBtn
                        onClick={() => {
                            const url = prompt('URL del enlace:');
                            if (url) insert('[', `](${url})`, 'texto del enlace');
                        }}
                        icon={<Link size={14} />}
                        label="Enlace (Ctrl+K)"
                    />
                    <TBtn
                        onClick={() => {
                            const url = prompt('URL de la imagen:');
                            if (url) {
                                const alt = prompt('Descripción (alt):', 'imagen') || 'imagen';
                                insert(`![${alt}](${url})\n`, '', '');
                            }
                        }}
                        icon={<Image size={14} />}
                        label="Imagen por URL"
                    />

                    {/* Font selector */}
                    <Divider />
                    <div className="flex items-center gap-1">
                        <Type size={12} className="text-slate-400" />
                        <select
                            title="Fuente del documento"
                            defaultValue="'Inter', sans-serif"
                            onChange={(e) => {
                                // Propagate font up via custom event or prop
                                const event = new CustomEvent('editor-font-change', { detail: e.target.value });
                                document.dispatchEvent(event);
                            }}
                            className="text-[10px] font-bold text-slate-500 bg-transparent border border-slate-200 rounded-lg px-2 py-1 outline-none hover:border-slate-300 focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                        >
                            <option value="'Inter', sans-serif">Inter</option>
                            <option value="'Playfair Display', serif">Elegante</option>
                            <option value="'Roboto Mono', monospace">Monoespaciada</option>
                            <option value="'Montserrat', sans-serif">Montserrat</option>
                            <option value="'Georgia', serif">Georgia</option>
                        </select>
                    </div>
                </div>
            )}

            {/* ——— Editor / Preview Area ——— */}
            <div className={`flex flex-1 ${activeTab === 'split' ? 'divide-x divide-slate-100' : ''}`}
                style={{ minHeight: '520px' }}
            >
                {/* Write pane */}
                {(activeTab === 'write' || activeTab === 'split') && (
                    <div className={`flex flex-col ${activeTab === 'split' ? 'w-1/2' : 'w-full'} bg-white`}>
                        <textarea
                            id="editor-textarea"
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => handleChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 w-full p-6 text-sm text-slate-800 bg-transparent resize-none outline-none leading-[1.8] placeholder:text-slate-300"
                            style={{ fontFamily: fontFamily, minHeight: '520px' }}
                            placeholder={`Escribí aquí usando Markdown...

# Título principal
## Subtítulo

**Negrita**, *cursiva*, ~~tachado~~

- Lista de elementos
- Otro elemento

> Cita importante

| Col 1 | Col 2 |
|-------|-------|
| dato  | dato  |`}
                            spellCheck="true"
                        />
                        {/* Footer con info */}
                        <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                            <span>{value.split('\n').length} líneas · {value.length} caracteres</span>
                            <span className="hidden md:block">Ctrl+B Negrita · Ctrl+I Cursiva · Ctrl+K Link · Ctrl+Z Deshacer</span>
                        </div>
                    </div>
                )}

                {/* Preview pane */}
                {(activeTab === 'preview' || activeTab === 'split') && (
                    <div className={`flex-1 ${activeTab === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto`}>
                        {value.trim() ? (
                            <div className="p-6 prose-sm" style={{ fontFamily: fontFamily }}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={components}
                                >
                                    {value}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-300 text-sm">
                                <div className="text-center">
                                    <Eye size={40} className="mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">La previsualización aparecerá aquí</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RichEditor;
export { mdComponents };
