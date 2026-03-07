import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Estilos base de Quill
import { Eye, Edit3, Columns, AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// ————— Markdown Components (for fallback or initial render parsing if needed) —————
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

// Configuramos los módulos de Quill (Herramientas disponibles)
const modules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
        [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']                                         // remove formatting button
    ],
    history: {
        delay: 1000,
        maxStack: 50,
        userOnly: true
    }
};

const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'blockquote', 'code-block',
    'list', 'bullet',
    'script',
    'indent',
    'color', 'background',
    'align',
    'link', 'image', 'video'
];

const RichEditor = ({ value, onChange, fontFamily = "'Inter', sans-serif" }) => {
    // Si la entrada es un markdown inicial, habría que convertirlo a HTML usando marked o un render() on mount.
    // Para simplificar y dado que el nuevo editor maneja HTML nativo como foros/word:
    // Asumiremos que el valor de entrada se trata como text/html. Si SequenceGenerator le pasa markdown puro,
    // se verá como texto plano la primera vez, pero el usuario puede formatear visualmente y onChange devolverá HTLM limpio.

    // Convertir de MD a HTML en montaje inicial si es necesario, 
    // pero idealmente 'value' aquí va a ser HTML después de la primera edición.

    const countWords = (htmlStr) => {
        if (!htmlStr) return 0;
        const text = htmlStr.replace(/<[^>]*>?/gm, ' ').trim();
        return text ? text.split(/\s+/).length : 0;
    };

    return (
        <div className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden shadow-lg bg-white relative">

            {/* Header / Opciones custom */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center p-1.5 bg-brand-100 text-brand-600 rounded-lg">
                        <Edit3 size={14} />
                    </span>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                        Editor Visual Avanzado
                    </span>
                </div>

                {/* Selector de fuente integrado */}
                <div className="flex items-center gap-1">
                    <Type size={12} className="text-slate-400" />
                    <select
                        title="Fuente del documento"
                        defaultValue="'Inter', sans-serif"
                        onChange={(e) => {
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

            {/* Contenedor del Editor Quill */}
            <div className="quill-premium-wrapper" style={{ fontFamily }}>
                <ReactQuill
                    theme="snow"
                    value={value}
                    onChange={onChange}
                    modules={modules}
                    formats={formats}
                    placeholder="Escribí tu contenido aquí..."
                    className="h-full min-h-[500px]"
                />
            </div>

            {/* Footer con info */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                <span>{countWords(value)} palabras</span>
                <span className="hidden md:block">Editor con soporte WYSIWYG</span>
            </div>

        </div>
    );
};

export default RichEditor;
export { mdComponents };
