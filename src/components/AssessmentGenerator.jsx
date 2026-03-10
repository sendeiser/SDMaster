import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, BookType, Calendar, Clock, Loader2, Copy, Check, ArrowRight, FileDown, History, Trash2, ChevronRight, FileText, Video, Edit3, Eye, FileOutput, MessageSquare, Database, CloudUpload, Lock, Globe, ListCheck, ClipboardCheck, GraduationCap } from 'lucide-react';
import { saveAs } from 'file-saver';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { antigravityService } from '../services/antigravityService';
import { ragService } from '../services/ragService';
import { sequenceDbService } from '../lib/sequenceDbService';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import RichEditor from './RichEditor';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

// Iniciar turndown globalmente
const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
});
turndownService.use(gfm);

// Sobreescribir el método escape por defecto para proteger LaTeX (\) pero mantener el resto
turndownService.escape = function (string) {
    return string
        .replace(/(\*|_|~|`|\[|\]|#|&|<|>|\|)/g, (match) => {
            if (match === '|') return match;
            return '\\' + match;
        })
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

// ————— Theme Definitions (Shared with SequenceGenerator) —————
const THEMES_CONFIG = {
    midnight: {
        h1: "text-3xl font-black text-slate-900 border-b-2 border-brand-500 pb-2 mb-6 mt-8 p-1",
        h2: "text-xl font-bold text-slate-800 border-l-4 border-brand-400 pl-3 mb-4 mt-6",
        h3: "text-lg font-bold text-slate-700 mb-3 mt-5",
        p: "text-slate-600 leading-relaxed mb-4 text-sm md:text-base break-words whitespace-pre-wrap",
        quote: "border-l-4 border-slate-200 pl-4 py-2 italic text-slate-500 my-6 bg-slate-50/50 rounded-r-lg",
        tableHeader: "bg-slate-50 border-b border-slate-200 text-slate-800",
        link: "text-brand-600 hover:underline",
    },
    solar: {
        h1: "text-3xl font-black text-amber-900 border-b-2 border-amber-500 pb-2 mb-6 mt-8 p-1",
        h2: "text-xl font-bold text-amber-800 border-l-4 border-amber-400 pl-3 mb-4 mt-6",
        h3: "text-lg font-bold text-amber-700 mb-3 mt-5",
        p: "text-amber-900/80 leading-relaxed mb-4 text-sm md:text-base break-words whitespace-pre-wrap",
        quote: "border-l-4 border-amber-200 pl-4 py-2 italic text-amber-600 my-6 bg-amber-50/50 rounded-r-lg",
        tableHeader: "bg-amber-50 border-b border-amber-200 text-amber-900",
        link: "text-amber-700 hover:text-amber-900 underline",
    },
    emerald: {
        h1: "text-3xl font-black text-emerald-900 border-b-2 border-emerald-500 pb-2 mb-6 mt-8 p-1",
        h2: "text-xl font-bold text-emerald-800 border-l-4 border-emerald-400 pl-3 mb-4 mt-6",
        h3: "text-lg font-bold text-emerald-700 mb-3 mt-5",
        p: "text-emerald-900/80 leading-relaxed mb-4 text-sm md:text-base break-words whitespace-pre-wrap",
        quote: "border-l-4 border-emerald-200 pl-4 py-2 italic text-emerald-600 my-6 bg-emerald-50/50 rounded-r-lg",
        tableHeader: "bg-emerald-50 border-b border-emerald-200 text-emerald-900",
        link: "text-emerald-700 hover:text-emerald-900 underline",
    },
    nordic: {
        h1: "text-3xl font-light text-slate-900 border-b border-slate-200 pb-2 mb-6 mt-8 tracking-tight p-1",
        h2: "text-xl font-medium text-slate-800 mb-4 mt-6",
        h3: "text-lg font-medium text-slate-700 mb-3 mt-5",
        p: "text-slate-700 leading-loose mb-4 text-sm md:text-base break-words whitespace-pre-wrap",
        quote: "border-l-2 border-slate-800 pl-4 py-2 italic text-slate-600 my-6",
        tableHeader: "bg-white border-b border-slate-900 text-slate-900",
        link: "text-slate-900 hover:text-slate-600 underline",
    },
    apa: {
        h1: "text-2xl font-bold text-black border-none pb-2 mb-8 mt-10 font-serif uppercase tracking-wider text-center p-1",
        h2: "text-xl font-bold text-black border-none pb-1 mb-6 mt-8 font-serif uppercase tracking-tight",
        h3: "text-lg font-bold text-black mb-4 mt-6 font-serif italic text-slate-800",
        p: "text-black leading-relaxed mb-6 text-base break-words whitespace-pre-wrap font-serif text-justify px-2",
        quote: "pl-8 pr-8 py-4 italic text-slate-700 my-8 font-serif border-l-2 border-slate-300 bg-slate-50/30",
        tableHeader: "bg-slate-100 border-b-2 border-slate-900 text-black font-serif font-bold uppercase text-xs",
        link: "text-slate-900 hover:underline font-serif",
        containerClass: "px-24 py-20 bg-white shadow-2xl scale-[1.02] origin-top",
    },
    get classic() { return this.midnight; }
};

const AssessmentGenerator = ({ isSidebarOpen, setIsSidebarOpen, session }) => {
    const [formData, setFormData] = useState({
        subject: '',
        year: '',
        topic: '',
        type: 'Examen Tradicional',
        difficulty: 'Intermedio',
        itemsCount: '5',
        theme: 'midnight'
    });

    const [existingDocs, setExistingDocs] = useState([]);
    const [userSequences, setUserSequences] = useState([]);
    const [savedAssessments, setSavedAssessments] = useState([]); // Nueva lista de evaluaciones
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [selectedSequences, setSelectedSequences] = useState([]); // Array de IDs
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [result, setResult] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editableContent, setEditableContent] = useState('');
    const resultRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [docs, sequences, assessments] = await Promise.all([
                ragService.fetchUniqueDocuments(),
                sequenceDbService.getUserSequences(),
                sequenceDbService.getUserAssessments() // Cargar evaluaciones guardadas
            ]);
            setExistingDocs(docs || []);
            setUserSequences(sequences || []);
            setSavedAssessments(assessments || []);
        } catch (error) {
            console.error("Error loading data:", error);
        }
    };

    const handleSaveToCloud = async () => {
        if (!result) return;
        setIsSaving(true);
        try {
            // Si estamos editando, usamos el contenido del editor convertido a MD
            const contentToSave = isEditing ? turndownService.turndown(editableContent) : result;

            const response = await sequenceDbService.saveAssessment({
                ...formData,
                content: contentToSave
            });

            if (response.success) {
                alert("Evaluación guardada exitosamente en la nube 🚀");
                loadData(); // Recargar historial
            }
        } catch (error) {
            console.error("Error saving assessment:", error);
            alert("No se pudo guardar la evaluación. Verifica tu conexión.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadSavedAssessment = (assessment) => {
        setFormData({
            subject: assessment.subject,
            year: assessment.year,
            topic: assessment.topic,
            type: assessment.type,
            difficulty: assessment.difficulty,
            itemsCount: '?', // No guardado explícitamente pero se infiere
            theme: assessment.theme || 'midnight'
        });
        setResult(assessment.content);
        setEditableContent(marked.parse(assessment.content || ''));
        setIsEditing(false);
    };

    const handleDeleteAssessment = async (e, id) => {
        e.stopPropagation();
        if (!confirm("¿Estás seguro de que quieres eliminar esta evaluación?")) return;
        try {
            await sequenceDbService.deleteAssessment(id);
            loadData();
        } catch (error) {
            alert("Error al eliminar");
        }
    };

    const handleInputChange = (e) => {

        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleDocSelection = (docName) => {
        setSelectedDocs(prev =>
            prev.includes(docName)
                ? prev.filter(d => d !== docName)
                : [...prev, docName]
        );
    };

    const toggleSequenceSelection = (seqId) => {
        setSelectedSequences(prev =>
            prev.includes(seqId)
                ? prev.filter(id => id !== seqId)
                : [...prev, seqId]
        );
    };

    const generateAssessment = async () => {
        if (!formData.subject || !formData.topic) return;
        setIsGenerating(true);
        setResult(null);
        try {
            // Preparar objetos de secuencias seleccionadas para el servicio
            const sequencesContext = userSequences
                .filter(s => selectedSequences.includes(s.id))
                .map(s => ({ topic: s.topic, content: s.content }));

            const data = await antigravityService.generateAssessment({
                ...formData,
                selectedDocs,
                selectedSequences: sequencesContext
            });
            if (data.success) {
                setResult(data.content);
                setEditableContent(marked.parse(data.content || ''));
            }
        } catch (error) {
            alert(error.detail || "Error al generar la evaluación");
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadPDF = async () => {
        const element = resultRef.current;
        if (!element || !result) {
            alert("No hay contenido para exportar. Por favor genera una evaluación primero.");
            return;
        }

        setIsGenerating(true);
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                scrollY: -window.scrollY,
                onclone: (clonedDoc) => {
                    const clonedEl = clonedDoc.getElementById('pdf-content');
                    if (clonedEl) {
                        // Expandir el elemento para capturar TODO el contenido
                        clonedEl.style.maxHeight = 'none';
                        clonedEl.style.overflow = 'visible';
                        clonedEl.style.padding = '40px';
                        clonedEl.style.width = '800px';
                        clonedEl.style.transform = 'none';
                        clonedEl.style.boxShadow = 'none';

                        // Convertir colores oklch (Tailwind 4) a colores HEX compatibles con html2canvas
                        const allEls = clonedEl.querySelectorAll('*');
                        allEls.forEach(el => {
                            const computed = window.getComputedStyle(el);
                            if (computed.color.includes('oklch')) el.style.color = '#1e293b';
                            if (computed.backgroundColor.includes('oklch')) el.style.backgroundColor = 'transparent';
                            if (computed.borderColor.includes('oklch')) el.style.borderColor = '#e2e8f0';
                        });
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            // Primera página
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            // Páginas adicionales mientras quede contenido
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const fileName = `Evaluacion_${(formData.topic || 'Sin_Tema').replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error("Error al exportar PDF:", error);
            alert("Hubo un error al generar el PDF.");
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadWord = async () => {
        if (!result) return;
        setIsGenerating(true);
        try {
            const contentToExport = isEditing ? turndownService.turndown(editableContent) : result;
            const htmlFromMd = marked.parse(contentToExport);

            const htmlContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head><meta charset='utf-8'><title>Evaluación</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; padding: 50px; }
                    h1 { color: #1e293b; font-size: 24pt; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
                    h2 { color: #334155; font-size: 18pt; margin-top: 30px; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
                    th { background-color: #f8fafc; font-weight: bold; }
                </style>
                </head>
                <body>
                    <div style="text-align: right; font-size: 10pt; color: #64748b; margin-bottom: 30px;">
                        ${formData.subject} | ${formData.year}<br>
                        Generado el ${new Date().toLocaleDateString()}
                    </div>
                    ${htmlFromMd}
                </body>
                </html>
            `;
            const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
            saveAs(blob, `Evaluacion_${formData.topic.replace(/\s+/g, '_')}.doc`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleEdit = () => {
        if (isEditing) {
            try {
                const markdownContent = turndownService.turndown(editableContent);
                setResult(markdownContent);
            } catch (err) {
                console.error("Error convirtiendo HTML a MD", err);
                setResult(editableContent);
            }
        } else {
            try {
                const htmlContent = marked.parse(result || '');
                setEditableContent(htmlContent);
            } catch (err) {
                console.error("Error convirtiendo MD a HTML", err);
                setEditableContent(result || '');
            }
        }
        setIsEditing(!isEditing);
    };

    const getMarkdownComponents = (theme) => {
        const t = THEMES_CONFIG[theme] || THEMES_CONFIG.classic;
        return {
            h1: ({ children }) => <h1 className={t.h1}>{children}</h1>,
            h2: ({ children }) => <h2 className={t.h2}>{children}</h2>,
            h3: ({ children }) => <h3 className={t.h3}>{children}</h3>,
            p: ({ children }) => <p className={t.p}>{children}</p>,
            blockquote: ({ children }) => <blockquote className={t.quote}>{children}</blockquote>,
            table: ({ children }) => <div className="table-wrapper"><table>{children}</table></div>,
            th: ({ children }) => <th className={t.tableHeader}>{children}</th>,
            td: ({ children }) => <td>{children}</td>,
        };
    };

    return (
        <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 transition-colors duration-300">
            {/* Sidebar de Configuración */}
            <aside className={`${isSidebarOpen ? 'w-full md:w-96' : 'w-0'} bg-white border-r border-slate-200 transition-all duration-500 ease-in-out relative flex flex-col z-40 overflow-hidden`}>
                <div className="p-8 flex-grow overflow-y-auto custom-scrollbar">
                    <div className="flex items-center space-x-3 mb-8">
                        <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                            <ClipboardCheck size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Evaluaciones <span className="text-brand-600">AI</span></h2>
                    </div>

                    <div className="space-y-6">
                        <InputField label="Materia" icon={<GraduationCap size={18} />} name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Ej: Historia, Biología..." />
                        <InputField label="Tema de Evaluación" icon={<BookType size={18} />} name="topic" value={formData.topic} onChange={handleInputChange} placeholder="Ej: Revolución de Mayo" />

                        <div className="grid grid-cols-2 gap-4">
                            <SelectField label="Nivel/Año" name="year" value={formData.year} onChange={handleInputChange} options={['1° Año', '2° Año', '3° Año', '4° Año', '5° Año', '6° Año']} />
                            <SelectField label="Dificultad" name="difficulty" value={formData.difficulty} onChange={handleInputChange} options={['Fácil', 'Intermedio', 'Difícil']} />
                        </div>

                        <SelectField label="Tipo de Evaluación" name="type" value={formData.type} onChange={handleInputChange} options={['Examen Tradicional', 'Opción Múltiple', 'Rúbrica de Calificación', 'Cuestionario Rápido', 'Ensayo']} />

                        <InputField label="Cantidad de Ítems" icon={<ListCheck size={18} />} name="itemsCount" value={formData.itemsCount} onChange={handleInputChange} placeholder="5" />

                        {/* Fuente de Conocimiento - Secuencias */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center justify-between">
                                <span>Secuencias de Referencia</span>
                                <span className="bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-md text-[8px]">{userSequences.length}</span>
                            </label>
                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 bg-slate-50/50 rounded-2xl custom-scrollbar">
                                {userSequences.length > 0 ? userSequences.map(seq => (
                                    <button
                                        key={seq.id}
                                        onClick={() => toggleSequenceSelection(seq.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${selectedSequences.includes(seq.id) ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-200'}`}
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold truncate pr-2 uppercase tracking-tight">{seq.topic}</span>
                                            <span className="text-[8px] text-slate-400 font-medium">{seq.subject} - {seq.year}</span>
                                        </div>
                                        {selectedSequences.includes(seq.id) ? <Check size={14} className="flex-shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-200 flex-shrink-0 group-hover:border-brand-300" />}
                                    </button>
                                )) : (
                                    <p className="text-[10px] text-slate-400 italic p-4 text-center">No tienes secuencias guardadas aún</p>
                                )}
                            </div>
                        </div>

                        {/* Fuente de Conocimiento - Documentos KB */}
                        <div className="space-y-3 pt-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center justify-between">
                                <span>Contenidos de la KB</span>
                                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md text-[8px]">{existingDocs.length}</span>
                            </label>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 bg-slate-50/50 rounded-2xl custom-scrollbar">
                                {existingDocs.length > 0 ? existingDocs.map(doc => (
                                    <button
                                        key={doc.name}
                                        onClick={() => toggleDocSelection(doc.name)}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${selectedDocs.includes(doc.name) ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200'}`}
                                    >
                                        <div className="flex items-center space-x-2 min-w-0">
                                            <Database size={10} className={selectedDocs.includes(doc.name) ? 'text-amber-500' : 'text-slate-300'} />
                                            <span className="text-[10px] font-bold truncate pr-2">{doc.name}</span>
                                        </div>
                                        {selectedDocs.includes(doc.name) ? <Check size={14} className="flex-shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-200 flex-shrink-0 group-hover:border-amber-300" />}
                                    </button>
                                )) : (
                                    <p className="text-[10px] text-slate-400 italic p-4 text-center">Sube archivos a la KB para usarlos aquí</p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={generateAssessment}
                            disabled={isGenerating || !formData.subject || !formData.topic}
                            className={`w-full py-4 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all transform active:scale-95 flex items-center justify-center space-x-3 shadow-xl ${isGenerating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-brand-500/20 shadow-lg'}`}
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                            <span>{isGenerating ? 'Vinculando Fuentes...' : 'Generar con Contexto'}</span>
                        </button>

                        {/* Historial de Evaluaciones */}
                        <div className="space-y-3 pt-6 border-t border-slate-100">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center justify-between">
                                <span>Historial de Evaluaciones</span>
                                <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-md text-[8px]">{savedAssessments.length}</span>
                            </label>
                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-2 border border-slate-200 bg-slate-50/50 rounded-2xl custom-scrollbar">
                                {savedAssessments.length > 0 ? savedAssessments.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleLoadSavedAssessment(item)}
                                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-purple-300 transition-all text-left group"
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold truncate pr-6 uppercase tracking-tight text-slate-700">{item.topic}</span>
                                            <span className="text-[8px] text-slate-400 font-medium">{item.subject} • {new Date(item.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteAssessment(e, item.id)}
                                            className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </button>
                                )) : (
                                    <p className="text-[10px] text-slate-400 italic p-4 text-center">No has guardado evaluaciones aún</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Area de Visualización Principal */}
            <main className="flex-grow flex flex-col relative min-w-0">
                {/* Herramientas de Cabecera */}
                <div className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
                    <div className="flex items-center space-x-4">
                        <button onClick={toggleEdit} className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${isEditing ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100:bg-slate-800'}`}>
                            {isEditing ? <Eye size={16} /> : <Edit3 size={16} />}
                            <span>{isEditing ? 'Vista Previa' : 'Modo Editor'}</span>
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-2" />
                        <SelectFieldMinimal name="theme" value={formData.theme} onChange={handleInputChange} options={Object.keys(THEMES_CONFIG).map(k => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))} />
                    </div>

                    {result && (
                        <div className="flex items-center space-x-2">
                            <ToolbarButton
                                onClick={handleSaveToCloud}
                                icon={isSaving ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />}
                                label={isSaving ? "Guardando..." : "Guardar en la Nube"}
                                disabled={isSaving}
                            />
                            <div className="w-px h-5 bg-slate-200 mx-1" />
                            <ToolbarButton onClick={downloadWord} icon={<FileOutput size={15} />} label="Word" />
                            <div className="w-px h-5 bg-slate-200 mx-1" />
                            <ToolbarButton onClick={downloadPDF} icon={<FileDown size={15} />} label="PDF" highlighted />
                        </div>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto p-4 md:p-12 custom-scrollbar flex justify-center">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center space-y-6 animate-pulse mt-20">
                            <Loader2 size={48} className="animate-spin text-brand-600" />
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Diseñando Evaluación...</h3>
                        </div>
                    ) : result ? (
                        <div className="w-full max-w-screen-lg animate-scale-up origin-top relative pb-20">
                            {isEditing ? (
                                <RichEditor value={editableContent} onChange={setEditableContent} />
                            ) : (
                                <div
                                    ref={resultRef}
                                    id="pdf-content"
                                    className={`${(THEMES_CONFIG[formData.theme] || THEMES_CONFIG.classic).containerClass || "px-10 md:px-20 py-16 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"} bg-white border border-slate-100 min-h-[1056px] relative overflow-hidden break-words transition-all duration-500`}
                                >
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex, rehypeRaw]}
                                        components={getMarkdownComponents(formData.theme)}
                                    >
                                        {result}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center space-y-6 mt-20 text-center opacity-30">
                            <GraduationCap size={64} className="text-slate-400" />
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Sin Evaluación</h3>
                            <p className="max-w-xs text-sm font-medium text-slate-500">Configura los parámetros y haz clic en "Generar" para crear una evaluación a medida.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// Reusable Small Components
const InputField = ({ label, icon, name, value, onChange, placeholder }) => (
    <div className="space-y-2 group">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-brand-600 transition-colors">{label}</label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-all">{icon}</div>
            <input type="text" name={name} value={value} onChange={onChange} className="pl-12 w-full rounded-2xl border border-slate-200 bg-white/50 py-4 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all placeholder:text-slate-200 shadow-sm" placeholder={placeholder} />
        </div>
    </div>
);

const SelectField = ({ label, name, value, onChange, options }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
        <select name={name} value={value} onChange={onChange} className="w-full rounded-2xl border border-slate-200 bg-white/50 py-4 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 cursor-pointer shadow-sm">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const SelectFieldMinimal = ({ name, value, onChange, options }) => (
    <select name={name} value={value} onChange={onChange} className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-transparent border border-slate-200 rounded-lg px-3 py-1.5 outline-none hover:border-slate-300 transition-all cursor-pointer">
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
);

const ToolbarButton = ({ onClick, icon, label, highlighted = false }) => (
    <button onClick={onClick} className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all active:scale-95 group relative ${highlighted ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-100:bg-slate-800 text-slate-600'}`}>
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest hiddn lg:block">{label}</span>
    </button>
);

export default AssessmentGenerator;
