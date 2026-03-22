import React, { useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { 
    Edit3, Eye, Bold, Italic, List, Table2, 
    Minus, Code2, Heading2, Quote, Link, Save,
    RotateCcw, Sparkles
} from 'lucide-react';
import 'katex/dist/katex.min.css';

const RichEditor = ({ value = '', onChange, onSave, isSaving = false }) => {
    const textareaRef = useRef(null);

    const countWords = (text) => {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(Boolean).length;
    };

    const insertAtCursor = useCallback((before, placeholder = 'texto', after = '') => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = value.substring(start, end) || placeholder;
        const newText = value.substring(0, start) + before + selected + after + value.substring(end);
        onChange(newText);
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
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = value.indexOf('\n', start);
        const line = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
        const newLine = prefix + (line.startsWith(prefix) ? line.slice(prefix.length) : line);
        const newValue = value.substring(0, lineStart) + newLine + (lineEnd === -1 ? '' : value.substring(lineEnd));
        onChange(newValue);
    }, [value, onChange]);

    const toolbarActions = [
        { icon: <Heading2 size={13} />, title: 'Título', action: () => insertLine('## ') },
        { icon: <Bold size={13} />, title: 'Negrita', action: () => insertAtCursor('**', 'texto', '**') },
        { icon: <Italic size={13} />, title: 'Cursiva', action: () => insertAtCursor('*', 'texto', '*') },
        { icon: <Quote size={13} />, title: 'Cita', action: () => insertLine('> ') },
        { separator: true },
        { icon: <List size={13} />, title: 'Lista', action: () => insertLine('- ') },
        { icon: <Code2 size={13} />, title: 'Código', action: () => insertAtCursor('`', 'código', '`') },
        { separator: true },
        {
            icon: <Table2 size={13} />, title: 'Tabla', action: () => {
                const tableTemplate = `\n| Columna 1 | Columna 2 |\n|-----------|-----------|\n| Celda     | Celda     |\n`;
                const ta = textareaRef.current;
                if (!ta) return;
                const pos = ta.selectionStart;
                onChange(value.substring(0, pos) + tableTemplate + value.substring(pos));
            }
        },
        { icon: <Minus size={13} />, title: 'Divisor', action: () => { const ta = textareaRef.current; if (!ta) return; const pos = ta.selectionStart; onChange(value.substring(0, pos) + '\n---\n' + value.substring(pos)); } },
    ];

    return (
        <div className="flex flex-col border border-slate-200 rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/50 bg-white h-full transition-all border-transparent hover:border-brand-100">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50/50 border-b border-slate-100 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1 mr-4">
                        {toolbarActions.map((action, idx) =>
                            action.separator
                                ? <div key={idx} className="w-px h-4 bg-slate-100 mx-1 self-center" />
                                : (
                                    <button
                                        key={idx}
                                        type="button"
                                        title={action.title}
                                        onClick={action.action}
                                        className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all active:scale-95"
                                    >
                                        {action.icon}
                                    </button>
                                )
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">{countWords(value)} WORDS</span>
                        <div className="w-[1px] h-3 bg-slate-200"></div>
                        <span className="bg-brand-50 text-brand-600 px-2 py-1 rounded-md">LIVE PREVIEW</span>
                    </div>
                    {onSave && (
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-brand-600 transition-all disabled:opacity-50"
                        >
                            {isSaving ? <RotateCcw size={14} className="animate-spin"/> : <Save size={14}/>}
                            {isSaving ? 'Guardando' : 'Guardar'}
                        </button>
                    )}
                </div>
            </div>

            {/* Split Panel */}
            <div className="flex flex-1 min-h-0 overflow-hidden bg-white">
                {/* Markdown Editor */}
                <div className="flex-1 flex flex-col border-r border-slate-50 min-w-0">
                    <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/30 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source Editor</span>
                        </div>
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="flex-1 w-full p-8 font-mono text-[13px] text-slate-600 leading-[1.8] resize-none outline-none bg-white custom-scrollbar selection:bg-brand-100 selection:text-brand-900"
                        placeholder="Empezá a redactar tu contenido..."
                        spellCheck={false}
                    />
                </div>

                {/* Live Preview */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/20">
                    <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/30 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></div>
                            <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Rendered View</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white shadow-inner m-1 rounded-3xl border border-white">
                        <div className="academic-preview prose prose-slate max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex, rehypeRaw]}
                            >
                                {value || '*Escribí algo para ver la magia...*'}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Status */}
            <div className="px-5 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">
                    <Sparkles size={10} className="text-brand-400"/>
                    SD Master Content Engine v2.0
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Cloud Synced</span>
                </div>
            </div>
        </div>
    );
};

export default RichEditor;
