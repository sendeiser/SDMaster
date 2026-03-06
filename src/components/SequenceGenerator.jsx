import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, BookType, Calendar, Clock, Loader2, Copy, Check, Wand2, ArrowRight, FileDown, History, Trash2, ChevronRight, FileText, Video, Edit3, Save, FileOutput, Cloud, Share2, PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, HardDrive, Link, Type } from 'lucide-react';
import { saveAs } from 'file-saver';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { antigravityService } from '../services/antigravityService';
import { ragService } from '../services/ragService';
import { cloudService } from '../services/cloudService';
import { googleDriveService } from '../services/googleDriveService';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const SequenceGenerator = ({ isSidebarOpen, setIsSidebarOpen }) => {
    const [formData, setFormData] = useState({
        subject: '',
        year: '',
        topic: '',
        duration: '',
        structure: 'Tradicional',
        templateSource: 'None',
        includeMedia: true
    });

    const [existingDocs, setExistingDocs] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editableContent, setEditableContent] = useState('');
    const [copied, setCopied] = useState(false);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isSavingCloud, setIsSavingCloud] = useState(false);
    const [cloudUrl, setCloudUrl] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const resultRef = useRef(null);

    // Cargar historial y documentos al inicio
    useEffect(() => {
        const savedHistory = localStorage.getItem('sd_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Error cargando historial:", e);
            }
        }
        loadIndexedDocs();
    }, []);

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
            const response = await antigravityService.generateSequence(formData);
            const newResult = response.content;
            setResult(newResult);
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
        const element = resultRef.current;
        if (!element || !result) {
            alert("No hay contenido para exportar. Por favor genera una secuencia primero.");
            return;
        }

        setIsGenerating(true);
        try {
            // Aseguramos que el elemento sea visible y esté bien renderizado
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                scrollY: -window.scrollY,
                onclone: (clonedDoc) => {
                    const clonedEl = clonedDoc.getElementById('pdf-content');
                    if (clonedEl) {
                        clonedEl.style.maxHeight = 'none';
                        clonedEl.style.overflow = 'visible';
                        clonedEl.style.padding = '40px';
                        clonedEl.style.width = '800px';

                        // LIMPIEZA CRÍTICA: html2canvas NO soporta oklch de Tailwind 4
                        const allDocs = clonedEl.querySelectorAll('*');
                        allDocs.forEach(el => {
                            const computed = window.getComputedStyle(el);
                            // Convertir colores oklch detectados a fallbacks HEX/RGB
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

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const fileName = `Secuencia_${(formData.topic || 'Sin_Tema').replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Hubo un error al generar el PDF. El contenido puede ser demasiado grande.");
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
            setResult(editableContent);
        }
        setIsEditing(!isEditing);
    };

    const handleSaveToCloud = async () => {
        if (!result) return;

        // Solicitar token opcional para Gists privados
        const token = localStorage.getItem('github_token') || prompt("Introduce tu GitHub Personal Access Token para guardar como Gist privado (cancela para público):");
        if (token) localStorage.setItem('github_token', token);

        setIsSavingCloud(true);
        try {
            const cloudResult = await cloudService.saveToCloud({
                title: formData.topic || 'Secuencia Didáctica',
                content: result,
                metadata: {
                    subject: formData.subject,
                    year: formData.year
                }
            }, token);

            setCloudUrl(cloudResult.url);
            alert("Guardado en la nube exitosamente.");
            window.open(cloudResult.url, '_blank');
        } catch (error) {
            console.error("Cloud Save Error:", error);
            alert("Error al guardar en la nube. Verifica tu conexión o el token.");
        } finally {
            setIsSavingCloud(false);
        }
    };

    const handleSaveToDrive = async () => {
        if (!result) return;
        setIsSavingCloud(true);
        try {
            const token = await googleDriveService.getAccessToken();
            await googleDriveService.saveFile(formData.topic || 'Secuencia Didáctica', result, token);
            alert("¡Guardado en Google Drive exitosamente!");
        } catch (error) {
            console.error("Google Drive Error:", error);
            if (error.message?.includes("VITE_GOOGLE_CLIENT_ID")) {
                alert("Configuración pendiente: Debes añadir VITE_GOOGLE_CLIENT_ID en el archivo .env.");
            } else {
                alert(`Error al guardar en Drive: ${error.message || "Verifica tu conexión"}`);
            }
        } finally {
            setIsSavingCloud(false);
        }
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
        setEditableContent(item.content); // Also load into editable content
        setIsEditing(false); // Ensure not in edit mode when loading from history
        setShowHistory(false);
    };

    const deleteHistoryItem = (e, id) => {
        e.stopPropagation();
        setHistory(prev => prev.filter(item => item.id !== id));
    };

    // Componentes personalizados para ReactMarkdown
    const MarkdownComponents = {
        h1: ({ children }) => <h1 className="text-3xl font-black text-slate-900 border-b-2 border-brand-500 pb-2 mb-6 mt-8">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold text-slate-800 border-l-4 border-brand-400 pl-3 mb-4 mt-6">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold text-slate-700 mb-3 mt-5">{children}</h3>,
        p: ({ children }) => {
            // Evitar error de hidratación: si el hijo es un bloque (div), renderizar como div
            const hasBlock = React.Children.toArray(children).some(
                child => React.isValidElement(child) && (child.type === 'div' || child.props?.className?.includes('my-8'))
            );
            return hasBlock ?
                <div className="mb-4">{children}</div> :
                <p className="text-slate-600 leading-relaxed mb-4 text-sm md:text-base">{children}</p>;
        },
        ul: ({ children }) => <ul className="list-disc list-outside ml-5 mb-4 space-y-2 text-slate-600">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside ml-5 mb-4 space-y-2 text-slate-600">{ol_children(children)}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-200 pl-4 py-2 italic text-slate-500 my-6 bg-slate-50/50 rounded-r-lg">{children}</blockquote>,
        table: ({ children }) => (
            <div className="overflow-x-auto my-8 rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-left border-collapse bg-white">
                    {children}
                </table>
            </div>
        ),
        thead: ({ children }) => <thead className="bg-slate-50 border-b border-slate-200">{children}</thead>,
        th: ({ children }) => <th className="px-4 py-3 text-sm font-bold text-slate-800 uppercase tracking-wider">{children}</th>,
        td: ({ children }) => <td className="px-4 py-3 text-sm text-slate-600 border-b border-slate-100">{children}</td>,
        img: ({ src, alt }) => (
            <div className="my-8 rounded-2xl overflow-hidden shadow-lg border-4 border-white">
                <img src={src} alt={alt} className="w-full object-cover max-h-[400px]" />
                {alt && <p className="text-center text-xs text-slate-400 mt-2 italic">{alt}</p>}
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
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{children}</a>;
        }
    };

    function ol_children(nodes) {
        return nodes;
    }

    return (
        <div className="flex-grow flex overflow-hidden relative">
            {/* Sidebar - Formulario de Configuración */}
            <aside
                className={`
                    absolute inset-y-0 left-0 z-10 w-80 bg-white border-r border-slate-200 transition-all duration-500 transform
                    lg:relative lg:translate-x-0
                    ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:w-0'}
                `}
            >
                <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
                    <div className="mb-8">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Parámetros</h3>
                        <form onSubmit={handleGenerate} className="space-y-5">
                            <InputField label="Materia" icon={<BookType size={16} />} name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Ej. Matemáticas" />
                            <InputField label="Año / Curso" icon={<Calendar size={16} />} name="year" value={formData.year} onChange={handleInputChange} placeholder="Ej. 3er Año" />
                            <InputField label="Tema" icon={<Wand2 size={16} />} name="topic" value={formData.topic} onChange={handleInputChange} placeholder="Ej. Ecuaciones" />

                            <div className="grid grid-cols-2 gap-3">
                                <InputField label="Duración" icon={<Clock size={16} />} name="duration" value={formData.duration} onChange={handleInputChange} placeholder="2h" />
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
                            </div>

                            <SelectField
                                label="Plantilla Referencia"
                                name="templateSource"
                                value={formData.templateSource}
                                onChange={handleInputChange}
                                options={[
                                    { value: 'None', label: 'IA Base' },
                                    ...existingDocs.map(doc => ({ value: doc, label: doc }))
                                ]}
                            />

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
                {/* Floating Toolbar - Solo cuando hay resultado */}
                {result && !isGenerating && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center bg-white/90 backdrop-blur-xl p-1.5 rounded-2xl shadow-2xl shadow-slate-900/10 border border-white animate-fade-in-up">
                        <div className="flex items-center space-x-1 px-1">
                            <ToolbarButton onClick={handleCopy} icon={copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />} label={copied ? "Copiado" : "Copiar"} />
                            <ToolbarButton onClick={toggleEdit} icon={isEditing ? <Check size={16} className="text-green-500" /> : <Edit3 size={16} />} label={isEditing ? "Ver" : "Editar"} highlighted={isEditing} />
                            <div className="w-px h-6 bg-slate-200 mx-1" />

                            <ToolbarButton onClick={handleSaveToDrive} icon={isSavingCloud ? <Loader2 size={16} className="animate-spin text-brand-600" /> : <HardDrive size={16} />} label="Drive" color="text-amber-600" />
                            <ToolbarButton onClick={handleSaveToCloud} icon={isSavingCloud ? <Loader2 size={16} className="animate-spin text-brand-600" /> : <Cloud size={16} />} label="Gist" color="text-brand-600" />

                            <div className="w-px h-6 bg-slate-200 mx-1" />
                            <label className="cursor-pointer">
                                <input type="file" className="hidden" accept="image/*" onChange={handleLocalImage} />
                                <ToolbarButton as="div" icon={<Share2 size={16} />} label="+ Foto" />
                            </label>
                            <ToolbarButton onClick={insertImage} icon={<Wand2 size={16} />} label="URL Foto" />
                            <ToolbarButton onClick={insertLink} icon={<Link size={16} />} label="Link" />

                            <div className="w-px h-6 bg-slate-200 mx-1" />
                            <ToolbarButton onClick={downloadWord} icon={<FileOutput size={16} />} label="Word" />
                            <ToolbarButton onClick={downloadPDF} icon={<FileDown size={16} />} label="PDF" highlighted />
                        </div>
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
                        <div className="w-full max-w-screen-md animate-scale-up origin-top relative pb-20">
                            {isEditing ? (
                                <div className="flex flex-col space-y-4">
                                    <div className="flex items-center justify-between px-4 py-2 bg-brand-50 rounded-xl border border-brand-100">
                                        <span className="text-[10px] font-black text-brand-700 uppercase tracking-widest">Modo Edición Markdown</span>
                                        <button onClick={toggleEdit} className="text-[10px] font-black text-brand-700 uppercase hover:underline">Finalizar</button>
                                    </div>
                                    <textarea
                                        value={editableContent}
                                        onChange={(e) => setEditableContent(e.target.value)}
                                        className="w-full min-h-[1056px] bg-white text-slate-800 p-12 md:p-20 shadow-2xl border-2 border-brand-200 focus:ring-8 focus:ring-brand-500/5 focus:outline-none font-sans text-base leading-relaxed rounded-xl transition-all"
                                        placeholder="Edita tu contenido aquí usando Markdown..."
                                    />
                                </div>
                            ) : (
                                <div
                                    ref={resultRef}
                                    id="pdf-content"
                                    className="bg-white px-10 md:px-20 py-16 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 min-h-[1056px] relative overflow-visible"
                                    style={{ fontFamily: "'Inter', sans-serif" }}
                                >
                                    {/* Membrete Minimalista Profesional (Sin marca de agua) */}
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
                                        rehypePlugins={[rehypeKatex]}
                                        components={MarkdownComponents}
                                    >
                                        {result}
                                    </ReactMarkdown>

                                    {/* Footer Profesional */}
                                    <div className="mt-20 pt-8 border-t-2 border-slate-900 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                                        <span>Documento de Planificación Docente</span>
                                        <span>Página 1</span>
                                    </div>
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
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                
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
