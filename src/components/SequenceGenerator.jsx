import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, BookType, Calendar, Clock, Loader2, Copy, Check, ArrowRight, FileDown, History, Trash2, ChevronRight, FileText, Video, Edit3, Eye, FileOutput, MessageSquare, Database, CloudUpload, Lock, Globe } from 'lucide-react';
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
import RichEditor, { mdComponents as richMdComponents } from './RichEditor';
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
    // Escapamos los caracteres especiales de MD, pero PROTEGEMOS el backslash
    return string
        .replace(/(\*|_|~|`|\[|\]|#|&|<|>|\|)/g, (match) => {
            // No escapamos el pipe | si queremos tablas GFM, 
            // pero turndown-plugin-gfm suele manejarlo.
            // Para estar seguros de que LaTeX (\) no se escape, NO incluimos \ en el regex de arriba.
            if (match === '|') return match; // Dejar pipes intactos para tablas
            return '\\' + match;
        })
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

// ————— Theme Definitions —————
const THEMES_CONFIG = {
    midnight: {
        h1: "text-3xl font-black text-slate-900 dark:text-white border-b-2 border-brand-500 pb-2 mb-6 mt-8 p-1",
        h2: "text-xl font-bold text-slate-800 dark:text-slate-100 border-l-4 border-brand-400 pl-3 mb-4 mt-6",
        h3: "text-lg font-bold text-slate-700 dark:text-slate-300 mb-3 mt-5",
        p: "text-slate-600 dark:text-slate-400 leading-relaxed mb-4 text-sm md:text-base break-words whitespace-pre-wrap",
        quote: "border-l-4 border-slate-200 dark:border-slate-700 pl-4 py-2 italic text-slate-500 my-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-r-lg",
        tableHeader: "bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200",
        link: "text-brand-600 dark:text-brand-400 hover:underline",
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
    // Backwards compatibility fallbacks
    get classic() { return this.midnight; },
    get minimalist() { return this.nordic; },
    get colorful() { return this.emerald; },
    get academic() { return this.solar; }
};

const SequenceGenerator = ({ isSidebarOpen, setIsSidebarOpen, session, loadedSequence, clearLoadedSequence }) => {
    const [formData, setFormData] = useState({
        subject: '',
        year: '',
        topic: '',
        duration: '',
        structure: 'Tradicional',
        theme: 'classic',
        templateSource: 'None',
        includeMedia: true,
        suggestions: ''
    });

    const [existingDocs, setExistingDocs] = useState([]); // Ahora será [{name, category}]
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState(['Plantilla', 'Información']);
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState(null);
    const [notification, setNotification] = useState(null); // { type: 'error'|'warning', message, detail }
    const [isEditing, setIsEditing] = useState(false);
    const [editableContent, setEditableContent] = useState('');
    const [copied, setCopied] = useState(false);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [fontFamily, setFontFamily] = useState("'Inter', sans-serif");

    const [isSavingCloud, setIsSavingCloud] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);

    // Estados para Paginación y Selección
    const [selectedPages, setSelectedPages] = useState([]); // Array de índices de páginas seleccionadas
    const [pages, setPages] = useState([]); // Array de strings (contenido de cada página)

    // Listen for font changes from RichEditor
    useEffect(() => {
        const handler = (e) => setFontFamily(e.detail);
        document.addEventListener('editor-font-change', handler);
        return () => document.removeEventListener('editor-font-change', handler);
    }, []);

    useEffect(() => {
        if (loadedSequence) {
            setFormData({
                subject: loadedSequence.subject || '',
                year: loadedSequence.year || '',
                topic: loadedSequence.topic || '',
                duration: loadedSequence.duration || '',
                structure: loadedSequence.structure || 'Secuencia Didáctica Estándar',
                theme: loadedSequence.theme || 'classic',
                templateSource: 'None',
                includeMedia: true,
                suggestions: ''
            });

            const content = loadedSequence.content || '';
            setResult(content);
            const splitPages = content.split(/\n---\n|\n---\r\n|<hr\s*\/?>/i).filter(p => p.trim().length > 0);
            setPages(splitPages.length > 0 ? splitPages : [content]);
            setSelectedPages((splitPages.length > 0 ? splitPages : [content]).map((_, i) => i)); // Todas seleccionadas por defecto

            setIsEditing(false);

            try {
                setEditableContent(marked.parse(content));
            } catch (e) {
                console.error(e);
            }

            if (clearLoadedSequence) clearLoadedSequence();
        }
    }, [loadedSequence, clearLoadedSequence]);

    const resultRef = useRef(null);

    // Cargar historial, documentos y PREFERENCIAS al inicio
    useEffect(() => {
        // --- Preferencias de Configuración ---
        const prefsStr = localStorage.getItem('sd_preferences');
        if (prefsStr) {
            try {
                const prefs = JSON.parse(prefsStr);
                setFormData(prev => ({
                    ...prev,
                    duration: prev.duration || prefs.defaultDuration || '2h',
                    theme: prev.theme !== 'classic' ? prev.theme : (prefs.defaultTheme || 'classic'),
                    structure: prev.structure !== 'Tradicional' ? prev.structure : (prefs.defaultStructure || 'Tradicional')
                }));
            } catch (e) {
                console.error("Error cargando preferencias", e);
            }
        }

        // --- Historial ---
        const savedHistory = localStorage.getItem('sd_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Error al parsear el historial", e);
            }
        }
        loadIndexedDocs();
    }, []);

    // Auto-dismiss notifications
    useEffect(() => {
        if (!notification) return;
        const timer = setTimeout(() => setNotification(null), notification.autoDismiss || 6000);
        return () => clearTimeout(timer);
    }, [notification]);

    const loadIndexedDocs = async () => {
        const docs = await ragService.fetchUniqueDocuments();
        setExistingDocs(docs);
    };

    // Guardar historial cuando cambie
    useEffect(() => {
        localStorage.setItem('sd_history', JSON.stringify(history));
    }, [history]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!formData.subject || !formData.year || !formData.topic || !formData.duration) return;

        setIsGenerating(true);
        setResult(null);
        setCopied(false);

        try {
            const data = await antigravityService.generateSequence({
                ...formData,
                selectedDocs,
                selectedCategories
            });
            const newResult = data.content;
            setResult(newResult);

            // Paginación automática al generar
            const splitPages = newResult.split(/\n---\n|\n---\r\n|<hr\s*\/?>/i).filter(p => p.trim().length > 0);
            const finalPages = splitPages.length > 0 ? splitPages : [newResult];
            setPages(finalPages);
            setSelectedPages(finalPages.map((_, i) => i));

            setEditableContent(newResult);
            setIsEditing(false);

            // Guardar en historial (limitado a 5)
            const historyItem = {
                id: Date.now(),
                date: new Date().toLocaleString(),
                params: { ...formData },
                content: newResult
            };
            setHistory(prev => [historyItem, ...prev].slice(0, 5));
        } catch (error) {
            console.error("Error generating sequence:", error);
            if (error.type === 'HIGH_DEMAND') {
                setNotification({
                    type: 'warning',
                    message: '⚡ Alta Demanda en el Modelo de IA',
                    detail: error.detail || 'El servicio está recibiendo muchas solicitudes. Esperá unos segundos e intentá de nuevo.',
                    autoDismiss: 10000
                });
            } else {
                setNotification({
                    type: 'error',
                    message: '⚠️ Error al generar',
                    detail: error.message || 'Ocurrió un error inesperado.',
                    autoDismiss: 6000
                });
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        if (result) {
            navigator.clipboard.writeText(result);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const downloadPDF = async () => {
        if (selectedPages.length === 0) {
            alert("Selecciona al menos una página para exportar.");
            return;
        }

        setIsGenerating(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < selectedPages.length; i++) {
                const pageIdx = selectedPages[i];
                const element = document.getElementById(`page-content-${pageIdx}`);

                if (!element) continue;

                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    onclone: (clonedDoc) => {
                        const clonedEl = clonedDoc.getElementById(`page-content-${pageIdx}`);
                        if (clonedEl) {
                            clonedEl.style.padding = '40px';
                            clonedEl.style.width = '800px';
                            // Eliminar el checkbox de la clonación
                            const checkbox = clonedEl.querySelector('.page-selector-overlay');
                            if (checkbox) checkbox.remove();

                            const allDocs = clonedEl.querySelectorAll('*');
                            allDocs.forEach(el => {
                                const computed = clonedDoc.defaultView.getComputedStyle(el);
                                if (computed.color.includes('oklch')) el.style.color = '#1e293b';
                                if (computed.backgroundColor.includes('oklch')) el.style.backgroundColor = 'transparent';
                                if (computed.borderColor.includes('oklch')) el.style.borderColor = '#e2e8f0';
                            });
                        }
                    }
                });

                const imgData = canvas.toDataURL('image/png');
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            }

            const fileName = `Secuencia_${(formData.topic || 'Sin_Tema').replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Hubo un error al generar el PDF.");
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadWord = async () => {
        const element = resultRef.current;
        if (!element || !result) {
            alert("No hay contenido para exportar. Por favor genera una secuencia primero.");
            return;
        }

        setIsGenerating(true);
        try {
            // Usamos el contenido renderizado para mantener el formato de tablas y estilos
            const contentHtml = element.innerHTML;

            const htmlContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset='utf-8'>
                    <title>Secuencia Didáctica - SD Master</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; padding: 40px; }
                        h1 { color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 5px; font-size: 24pt; }
                        h2 { color: #1e293b; border-left: 5px solid #0ea5e9; padding-left: 10px; margin-top: 20px; font-size: 18pt; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 11pt; }
                        th { background-color: #f8fafc; font-weight: bold; }
                        p { margin-bottom: 10pt; }
                        .footer { font-size: 9pt; color: #94a3b8; text-align: center; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    ${contentHtml}
                    <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 9pt;">
                        Documento de Planificación Docente • Página 1
                    </div>
                </body>
                </html>
            `;

            const blob = new Blob(['\ufeff', htmlContent], {
                type: 'application/msword'
            });

            const fileName = `Secuencia_${(formData.topic || 'Sin_Tema').replace(/\s+/g, '_')}.doc`;
            saveAs(blob, fileName);
        } catch (error) {
            console.error("Error downloading Word:", error);
            alert("Error al generar el archivo Word.");
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleEdit = () => {
        if (isEditing) {
            try {
                // Saliendo del modo edición (WYSIWYG -> MD)
                const markdownContent = turndownService.turndown(editableContent);
                setResult(markdownContent);
            } catch (err) {
                console.error("Error convirtiendo HTML a MD", err);
                setResult(editableContent);
            }
        } else {
            try {
                // Entrando al modo edición (MD -> WYSIWYG/HTML)
                const htmlContent = marked.parse(result || '');
                setEditableContent(htmlContent);
            } catch (err) {
                console.error("Error convirtiendo MD a HTML", err);
                setEditableContent(result || '');
            }
        }
        setIsEditing(!isEditing);
    };

    const handleCloudSaveClick = () => {
        if (!session) {
            setNotification({
                type: 'warning',
                message: 'No Autenticado',
                detail: 'Debes iniciar sesión para poder guardar las secuencias en la nube.',
                autoDismiss: 4000
            });
            return;
        }
        setShowSaveModal(true);
    };

    const confirmCloudSave = async (isPublic) => {
        setIsSavingCloud(true);
        setShowSaveModal(false);
        try {
            // Pasamos un objeto con los datos a guardar. Incluimos el contenido final (ya sea resultado o el markdown si sale de edición)
            let finalContent = result;
            if (isEditing) {
                finalContent = turndownService.turndown(editableContent);
                setResult(finalContent);
            }

            await sequenceDbService.saveSequence({
                subject: formData.subject,
                year: formData.year,
                topic: formData.topic,
                duration: formData.duration,
                structure: formData.structure,
                theme: formData.theme,
                content: finalContent
            }, isPublic);

            setNotification({
                type: 'success',
                message: '¡Guardado con éxito!',
                detail: `Tu secuencia fue guardada en la nube y es ${isPublic ? 'Pública' : 'Privada'}.`,
                autoDismiss: 4000
            });
        } catch (error) {
            console.error("Error confirm cloud save:", error);
            setNotification({
                type: 'error',
                message: 'Error al Guardar',
                detail: error.message || 'No se pudo guardar la secuencia en la base de datos.',
                autoDismiss: 5000
            });
        } finally {
            setIsSavingCloud(false);
        }
    };

    const insertFormat = (symbol, placeholder = "texto") => {
        const textarea = document.getElementById('editor-textarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = editableContent;
        const selectedText = text.substring(start, end) || placeholder;
        const before = text.substring(0, start);
        const after = text.substring(end);

        const newText = `${before}${symbol}${selectedText}${symbol}${after}`;
        setEditableContent(newText);
        if (!isEditing) setResult(newText);

        // Re-enfocar y ajustar cursor (opcional pero bueno para UX)
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + symbol.length, start + symbol.length + selectedText.length);
        }, 10);
    };

    const insertLink = () => {
        const text = prompt("Texto del enlace:");
        const url = prompt("URL del enlace (ej: https://...):");
        if (text && url) {
            const linkMarkdown = ` [${text}](${url}) `;
            setEditableContent(prev => prev + linkMarkdown);
            if (!isEditing) {
                setResult(prev => prev + linkMarkdown);
            }
        }
    };

    const insertImage = () => {
        const url = prompt("Introduce la URL de la imagen:");
        if (url) {
            const imgMarkdown = `\n![Imagen insertada](${url})\n`;
            setEditableContent(prev => prev + imgMarkdown);
            if (!isEditing) {
                setResult(prev => prev + imgMarkdown);
            }
        }
    };

    const handleLocalImage = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result;
                const imgMarkdown = `\n![Imagen Local](${base64})\n`;
                setEditableContent(prev => prev + imgMarkdown);
                if (!isEditing) {
                    setResult(prev => prev + imgMarkdown);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const loadFromHistory = (item) => {
        setFormData(item.params);
        setResult(item.content);
        const splitPages = item.content.split(/\n---\n|\n---\r\n|<hr\s*\/?>/i).filter(p => p.trim().length > 0);
        const finalPages = splitPages.length > 0 ? splitPages : [item.content];
        setPages(finalPages);
        setSelectedPages(finalPages.map((_, i) => i));

        setEditableContent(item.content); // Also load into editable content
        setIsEditing(false); // Ensure not in edit mode when loading from history
        setShowHistory(false);
    };

    const deleteHistoryItem = (e, id) => {
        e.stopPropagation();
        setHistory(prev => prev.filter(item => item.id !== id));
    };

    // Componentes personalizados dinámicos según el tema visual seleccionado
    const getMarkdownComponents = (theme) => {
        const t = THEMES_CONFIG[theme] || THEMES_CONFIG.classic;

        return {
            h1: ({ children }) => <h1 className={t.h1}>{children}</h1>,
            h2: ({ children }) => <h2 className={t.h2}>{children}</h2>,
            h3: ({ children }) => <h3 className={t.h3}>{children}</h3>,
            p: ({ children }) => {
                const hasBlock = React.Children.toArray(children).some(
                    child => React.isValidElement(child) && (child.type === 'div' || child.props?.className?.includes('my-8'))
                );
                return hasBlock ?
                    <div className="mb-4 break-words whitespace-pre-wrap">{children}</div> :
                    <p className={t.p}>{children}</p>;
            },
            ul: ({ children }) => <ul className={`list-disc list-outside ml-5 mb-4 space-y-2 break-words whitespace-pre-wrap ${theme === 'academic' ? 'font-serif text-black' : 'text-slate-600'}`}>{children}</ul>,
            ol: ({ children }) => <ol className={`list-decimal list-outside ml-5 mb-4 space-y-2 break-words whitespace-pre-wrap ${theme === 'academic' ? 'font-serif text-black' : 'text-slate-600'}`}>{children}</ol>,
            li: ({ children }) => <li className="pl-1 break-words">{children}</li>,
            blockquote: ({ children }) => <blockquote className={t.quote}>{children}</blockquote>,
            table: ({ children }) => (
                <div className="table-wrapper">
                    <table>
                        {children}
                    </table>
                </div>
            ),
            thead: ({ children }) => <thead>{children}</thead>,
            th: ({ children }) => <th>{children}</th>,
            td: ({ children }) => <td>{children}</td>,
            img: ({ src, alt }) => (
                <div className="my-8 rounded-2xl overflow-hidden shadow-lg border-4 border-white">
                    <img src={src} alt={alt} className="w-full object-cover max-h-[400px]" />
                    {alt && <p className={`text-center text-xs mt-2 italic ${theme === 'academic' ? 'font-serif text-gray-600' : 'text-slate-400'}`}>{alt}</p>}
                </div>
            ),
            a: ({ href, children }) => {
                if (href?.includes('youtube.com')) {
                    return (
                        <div className="my-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between group hover:border-red-200 transition-all">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-red-600 text-white rounded-lg shadow-md group-hover:scale-110 transition-transform">
                                    <Video size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-red-900">{children}</p>
                                    <p className="text-xs text-red-600">Recurso audiovisual sugerido</p>
                                </div>
                            </div>
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-white text-red-600 text-xs font-bold rounded-xl border border-red-200 shadow-sm hover:bg-red-600 hover:text-white transition-all uppercase tracking-wider"
                            >
                                Ver en YouTube
                            </a>
                        </div>
                    );
                }
                return <a href={href} target="_blank" rel="noopener noreferrer" className={t.link}>{children}</a>;
            }
        };
    };

    function ol_children(nodes) {
        return nodes;
    }

    return (
        <div className="flex-grow flex overflow-hidden relative w-full">
            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Formulario de Configuración */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200 transition-all duration-500 transform
                    lg:relative lg:translate-x-0 lg:z-10
                    ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:w-0'}
                `}
            >
                <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
                    <div className="mb-8">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Parámetros</h3>
                        <form onSubmit={handleGenerate} className="space-y-5">
                            <InputField label="Materia" icon={<BookType size={16} />} name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Ej. Matemáticas" />
                            <InputField label="Año / Curso" icon={<Calendar size={16} />} name="year" value={formData.year} onChange={handleInputChange} placeholder="Ej. 3er Año" />
                            <InputField label="Tema" icon={<Sparkles size={16} />} name="topic" value={formData.topic} onChange={handleInputChange} placeholder="Ej. Ecuaciones" />

                            <InputField label="Duración" icon={<Clock size={16} />} name="duration" value={formData.duration} onChange={handleInputChange} placeholder="2h" />
                            <div className="grid grid-cols-2 gap-3">
                                <SelectField
                                    label="Enfoque"
                                    name="structure"
                                    value={formData.structure}
                                    onChange={handleInputChange}
                                    options={[
                                        { value: 'Tradicional', label: 'Inicio/Cierre' },
                                        { value: 'ABP', label: 'Proyectos' },
                                        { value: 'Flipped', label: 'Invertida' },
                                        { value: 'Gamificación', label: 'Juego' },
                                        { value: 'Kolb', label: 'Kolb' }
                                    ]}
                                />
                                <SelectField
                                    label="Tema Visual"
                                    name="theme"
                                    value={formData.theme}
                                    onChange={handleInputChange}
                                    options={[
                                        { value: 'midnight', label: 'Midnight Pro' },
                                        { value: 'solar', label: 'Solar Gold' },
                                        { value: 'emerald', label: 'Emerald Luxe' },
                                        { value: 'nordic', label: 'Nordic Ice' },
                                        { value: 'apa', label: 'Académico APA' }
                                    ]}
                                />
                            </div>

                            <SelectField
                                label="Plantilla Referencia"
                                name="templateSource"
                                value={formData.templateSource}
                                onChange={handleInputChange}
                                options={[
                                    { value: 'None', label: 'IA Base' },
                                    ...existingDocs
                                        .filter(d => d.category === 'Plantilla')
                                        .map(doc => ({ value: doc.name, label: doc.name }))
                                ]}
                            />

                            {/* Selección de Contexto de Conocimiento */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                    <Database size={12} className="mr-1" /> Conocimiento a Usar
                                </label>
                                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    {['Información', 'Plantilla'].map(cat => (
                                        <label key={cat} className="flex items-center space-x-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(cat)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedCategories(prev => [...prev, cat]);
                                                    else setSelectedCategories(prev => prev.filter(c => c !== cat));
                                                }}
                                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            <span className="text-[10px] font-bold text-slate-600 uppercase group-hover:text-brand-600 transition-colors">
                                                {cat === 'Plantilla' ? 'Estructuras' : 'Contenido/Actividades'}
                                            </span>
                                        </label>
                                    ))}

                                    {existingDocs.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsDocsOpen(!isDocsOpen)}
                                                className="w-full flex items-center justify-between text-[9px] font-black text-slate-400 uppercase hover:text-brand-600 transition-colors"
                                            >
                                                <span>Documentos Específicos</span>
                                                <ChevronRight size={12} className={`transition-transform ${isDocsOpen ? 'rotate-90' : ''}`} />
                                            </button>

                                            {isDocsOpen && (
                                                <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar mt-2 animate-fade-in">
                                                    {existingDocs.map(doc => (
                                                        <label key={doc.name} className="flex items-center space-x-2 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDocs.includes(doc.name)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedDocs(prev => [...prev, doc.name]);
                                                                    else setSelectedDocs(prev => prev.filter(d => d !== doc.name));
                                                                }}
                                                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                            />
                                                            <span className="text-[9px] font-medium text-slate-500 truncate group-hover:text-slate-800 transition-colors">
                                                                {doc.name}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Chat de Sugerencias */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                    <MessageSquare size={12} className="mr-1" /> Sugerencias Extras
                                </label>
                                <textarea
                                    name="suggestions"
                                    value={formData.suggestions}
                                    onChange={handleInputChange}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-medium text-slate-700 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all resize-none h-24"
                                    placeholder="Ej. 'Añade más énfasis en la parte de resolución de problemas' o 'Usa un tono más lúdico'."
                                />
                            </div>

                            <button
                                onClick={() => setFormData(prev => ({ ...prev, includeMedia: !prev.includeMedia }))}
                                type="button"
                                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center space-x-2 text-slate-500 group-hover:text-brand-600 transition-colors">
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                        <Video size={14} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Multimedia</span>
                                </div>
                                <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${formData.includeMedia ? 'bg-brand-600' : 'bg-slate-300'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${formData.includeMedia ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>

                            <button
                                type="submit"
                                disabled={isGenerating}
                                className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-500/20 transition-all active:scale-95 flex items-center justify-center space-x-2"
                            >
                                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> <span>Generar</span></>}
                            </button>
                        </form>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-100">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="w-full p-3 rounded-xl flex items-center justify-between text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all group"
                        >
                            <div className="flex items-center space-x-3 text-xs font-bold uppercase tracking-wider">
                                <History size={16} />
                                <span>Recientes</span>
                            </div>
                            <ChevronRight size={16} className={`transition-transform duration-300 ${showHistory ? 'rotate-90' : ''}`} />
                        </button>

                        {showHistory && (
                            <div className="mt-4 space-y-2 animate-fade-in">
                                {history.length > 0 ? history.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => loadFromHistory(item)}
                                        className="w-full p-3 text-left rounded-xl bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all group"
                                    >
                                        <p className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tighter mb-1">{item.params.topic}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{item.date}</p>
                                    </button>
                                )) : (
                                    <p className="text-center py-4 text-[10px] text-slate-400 font-bold uppercase">Sin historial</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Área de Trabajo - Documento Espacial */}
            <main className="flex-grow flex flex-col relative bg-slate-200/50 overflow-hidden">

                {/* ——— Toast Notification ——— */}
                {notification && (
                    <div className={`
                        absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3
                        bg-white shadow-2xl border-l-4 rounded-2xl px-5 py-4 max-w-sm w-[calc(100%-2rem)]
                        animate-fade-in-up
                        ${notification.type === 'warning' ? 'border-amber-400' : 'border-red-500'}
                    `}>
                        <div className="text-xl mt-0.5 flex-shrink-0">
                            {notification.type === 'warning' ? '⚡' : '⚠️'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-black uppercase tracking-widest mb-1 ${notification.type === 'warning' ? 'text-amber-600' : 'text-red-600'}`}>
                                {notification.message}
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {notification.detail}
                            </p>
                        </div>
                        <button
                            onClick={() => setNotification(null)}
                            className="flex-shrink-0 text-slate-300 hover:text-slate-600 transition-colors mt-0.5 text-lg leading-none"
                            aria-label="Cerrar"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Save Modal */}
                {showSaveModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up relative my-auto">
                            <div className="p-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Guardar en la Nube</h3>
                                <p className="text-sm text-slate-500 mb-6">Elige la visibilidad para esta secuencia en la plataforma.</p>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => confirmCloudSave(false)}
                                        className="w-full flex items-center p-3 sm:p-4 border-2 border-slate-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all text-left group"
                                    >
                                        <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors mr-4">
                                            <Lock size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">Privado</p>
                                            <p className="text-xs text-slate-500">Solo tú podrás verla en Mis Secuencias.</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => confirmCloudSave(true)}
                                        className="w-full flex items-center p-3 sm:p-4 border-2 border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                                    >
                                        <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors mr-4">
                                            <Globe size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">Público</p>
                                            <p className="text-xs text-slate-500">Aparecerá en el repositorio comunitario.</p>
                                        </div>
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="w-full mt-4 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating Action Menu - Responsive Design */}
                {result && !isGenerating && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-xl px-3 py-2 rounded-full shadow-2xl shadow-slate-900/10 border border-white/80 animate-fade-in-up whitespace-nowrap">
                        <ToolbarButton onClick={handleCopy} icon={copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />} label={copied ? "Copiado" : "Copiar"} />
                        <ToolbarButton
                            onClick={toggleEdit}
                            icon={isEditing ? <Eye size={15} /> : <Edit3 size={15} />}
                            label={isEditing ? "Ver Doc" : "Editar"}
                            highlighted={isEditing}
                        />
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <ToolbarButton onClick={handleCloudSaveClick} icon={isSavingCloud ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />} label={isSavingCloud ? "Guardando" : "Guardar Nube"} color="text-brand-600 font-bold" />
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <ToolbarButton onClick={downloadWord} icon={<FileOutput size={15} />} label="Word" />
                        <ToolbarButton onClick={downloadPDF} icon={<FileDown size={15} />} label="PDF" highlighted />
                    </div>
                )}

                {/* Contenedor del Documento */}
                <div className="flex-grow overflow-y-auto p-4 md:p-12 custom-scrollbar flex justify-center">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center space-y-6 animate-pulse mt-20">
                            <div className="relative">
                                <div className="absolute inset-0 bg-brand-500/20 rounded-full animate-ping"></div>
                                <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-brand-600 relative z-10">
                                    <Loader2 size={32} className="animate-spin" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Redactando Planificación...</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-bounce">IA conectada a base de conocimientos</p>
                            </div>
                        </div>
                    ) : result ? (
                        <div className="w-full max-w-screen-lg animate-scale-up origin-top relative pb-20">
                            {isEditing ? (
                                <RichEditor
                                    value={editableContent}
                                    onChange={(v) => { setEditableContent(v); }}
                                    fontFamily={fontFamily}
                                />
                            ) : (
                                <div className="space-y-8 pb-20">
                                    {pages.map((pageContent, idx) => (
                                        <div
                                            key={idx}
                                            id={`page-content-${idx}`}
                                            className={`relative group transition-all duration-500 ${(THEMES_CONFIG[formData.theme] || THEMES_CONFIG.classic).containerClass || "px-8 md:px-16 py-12 shadow-[0_10px_30px_rgba(0,0,0,0.05)]"} bg-white border border-slate-100 min-h-[1056px] w-full max-w-[800px] mx-auto overflow-hidden`}
                                            style={{ fontFamily: fontFamily }}
                                        >
                                            {/* Selector de Página (UI solamente) */}
                                            <div className="absolute top-4 right-4 z-20 page-selector-overlay no-print">
                                                <button
                                                    onClick={() => {
                                                        setSelectedPages(prev =>
                                                            prev.includes(idx) ? prev.filter(p => p !== idx) : [...prev, idx]
                                                        );
                                                    }}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 ${selectedPages.includes(idx) ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-200 text-slate-300'}`}
                                                >
                                                    {selectedPages.includes(idx) ? <Check size={16} strokeWidth={3} /> : <div className="w-2 h-2 bg-slate-200 rounded-full" />}
                                                </button>
                                            </div>

                                            {/* Membrete - Solo en la primera página o en todas */}
                                            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-10">
                                                <div className="text-left">
                                                    <p className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">{formData.subject}</p>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{formData.topic}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{formData.year}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{new Date().toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeKatex, rehypeRaw]}
                                                components={getMarkdownComponents(formData.theme)}
                                            >
                                                {pageContent}
                                            </ReactMarkdown>

                                            {/* Footer Profesional */}
                                            <div className="absolute bottom-12 left-8 right-8 pt-8 border-t-2 border-slate-900 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                                                <span>Documento de Planificación Docente</span>
                                                <span>Página {idx + 1} de {pages.length}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center opacity-30 lg:mt-20 px-6 text-center">
                            <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center mb-8 border-4 border-dashed border-slate-300">
                                <FileText size={48} className="text-slate-400" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Escritorio Vacío</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] max-w-xs leading-loose">Configura los parámetros a la izquierda para comenzar a diseñar</p>
                        </div>
                    )}
                </div>
            </main>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Roboto+Mono:wght@400;700&family=Montserrat:wght@400;700;900&display=swap');
                
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

                .animate-scale-up { animation: scaleUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes scaleUp { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                
                .prose h1 { color: #0f172a; font-weight: 900; font-size: 2.25rem; margin-bottom: 2rem; }
                .prose table { width: 100%; border-collapse: collapse; margin: 2rem 0; border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden; }
                .prose th { background: #f8fafc; padding: 1rem; border: 1px solid #f1f5f9; text-transform: uppercase; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.05em; }
                .prose td { padding: 1rem; border: 1px solid #f1f5f9; font-size: 0.875rem; color: #475569; }
            `}</style>
        </div>
    );
};

const ToolbarButton = ({ onClick, icon, label, highlighted = false, color = "text-slate-600", as: Tag = "button" }) => (
    <Tag
        onClick={onClick}
        className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-90 group relative
            ${highlighted ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-700' : `hover:bg-slate-100 ${color}`}
        `}
    >
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">{label}</span>
        {/* Tooltip para cuando está colapsado */}
        {!highlighted && <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest lg:hidden whitespace-nowrap">{label}</div>}
    </Tag>
);

const InputField = ({ label, icon, name, value, onChange, placeholder }) => (
    <div className="space-y-2 group">
        <label htmlFor={name} className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-brand-600 transition-colors">
            {label}
        </label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-all duration-300">
                {icon}
            </div>
            <input
                type="text"
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                className="pl-12 w-full rounded-2xl border border-slate-200 bg-white/50 py-4 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all placeholder:text-slate-200 placeholder:font-medium shadow-sm hover:border-slate-300"
                placeholder={placeholder}
                required
            />
        </div>
    </div>
);

const SelectField = ({ label, name, value, onChange, options }) => (
    <div className="space-y-2 group">
        <label htmlFor={name} className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-brand-600 transition-colors">
            {label}
        </label>
        <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className="w-full rounded-2xl border border-slate-200 bg-white/50 py-4 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all shadow-sm hover:border-slate-300 appearance-none cursor-pointer"
        >
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

export default SequenceGenerator;
