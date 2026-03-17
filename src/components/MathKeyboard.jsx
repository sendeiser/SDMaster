import React from 'react';

const mathSymbols = [
    { label: '½',  value: '\\frac{a}{b}',  title: 'Fracción' },
    { label: '√',  value: '\\sqrt{x}',      title: 'Raíz cuadrada' },
    { label: 'x²', value: '^{2}',            title: 'Potencia 2' },
    { label: 'xⁿ', value: '^{n}',            title: 'Potencia n' },
    { label: 'π',  value: '\\pi',            title: 'Pi (π ≈ 3.14)' },
    { label: 'θ',  value: '\\theta',         title: 'Theta' },
    { label: 'α',  value: '\\alpha',         title: 'Alpha' },
    { label: 'β',  value: '\\beta',          title: 'Beta' },
    { label: 'Σ',  value: '\\sum',           title: 'Sumatoria' },
    { label: '∫',  value: '\\int',           title: 'Integral' },
    { label: '≠',  value: '\\neq',           title: 'Distinto' },
    { label: '≤',  value: '\\leq',           title: 'Menor o igual' },
    { label: '≥',  value: '\\geq',           title: 'Mayor o igual' },
    { label: '∞',  value: '\\infty',         title: 'Infinito' },
    { label: '·',  value: '\\cdot',          title: 'Multiplicación (punto)' },
    { label: '±',  value: '\\pm',            title: 'Más/Menos' },
    { label: '→',  value: '\\rightarrow',    title: 'Implica' },
    { label: '°',  value: '^{\\circ}',       title: 'Grados' },
    { label: 'ₙ',  value: '_{n}',            title: 'Subíndice n' },
    { label: '△',  value: '\\triangle',      title: 'Triángulo' },
];

/**
 * MathKeyboard — inserts LaTeX symbols at the cursor position of the
 * textarea referenced by `textareaRef`.
 *
 * Props:
 *  - textareaRef: React ref pointing to the <textarea> element
 *  - value: current textarea value (string)
 *  - onChange: (newValue) => void — called with the new string after insertion
 */
const MathKeyboard = ({ textareaRef, value, onChange }) => {
    const insertAtCursor = (symbol) => {
        const el = textareaRef?.current;
        if (!el) {
            // Fallback: append to end
            onChange((value || '') + symbol);
            return;
        }

        const start = el.selectionStart ?? (value || '').length;
        const end   = el.selectionEnd   ?? (value || '').length;
        const currentValue = value || '';

        const newValue = currentValue.slice(0, start) + symbol + currentValue.slice(end);
        onChange(newValue);

        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
            el.focus();
            const newPos = start + symbol.length;
            el.setSelectionRange(newPos, newPos);
        });
    };

    return (
        <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 px-1">
                Teclado matemático
            </div>
            <div className="flex flex-wrap gap-1">
                {mathSymbols.map((sym, i) => (
                    <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => {
                            // Prevent textarea from losing focus
                            e.preventDefault();
                            insertAtCursor(sym.value);
                        }}
                        title={sym.title}
                        className="min-w-[34px] h-8 px-2 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 transition-all font-mono text-sm shadow-sm active:scale-95 text-slate-700"
                    >
                        {sym.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MathKeyboard;
