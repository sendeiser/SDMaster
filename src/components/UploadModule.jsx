import React, { useState, useEffect } from 'react';
import { 
    CloudUpload, FileText, X, CheckCircle, AlertCircle, 
    Loader2, Database, Layers, RefreshCw, Trash2, 
    ShieldCheck, Zap, Info, ArrowRight, Sparkles,
    ChevronRight, BookOpen, FileUp
} from 'lucide-react';
import { extractTextFromFile } from '../utils/textExtractor';
import { ragService } from '../services/ragService';
import { 
    PremiumButton, PremiumCard, PremiumInput, 
    PremiumToast, PremiumTabs 
} from './shared/PremiumUI';

const UploadModule = () => {
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState([]);
    const [errorStatus, setErrorStatus] = useState(null);
    const [stats, setStats] = useState({ totalChunks: 0 });
    const [existingDocs, setExistingDocs] = useState([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [notification, setNotification] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('Información');

    // Load initial stats
    const loadStats = async () => {
        setIsLoadingStats(true);
        try {
            const [currentStats, docs] = await Promise.all([
                ragService.getStats(),
                ragService.fetchUniqueDocuments()
            ]);
            setStats(currentStats);
            setExistingDocs(docs);
        } catch (err) {
            console.error("Error loading stats:", err);
        } finally {
            setIsLoadingStats(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const showNotif = (type, message, detail) => setNotification({ type, message, detail });

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const processFileForRAG = async (fileObj) => {
        try {
            updateFileStatus(fileObj.id, 'extracting', 'Analizando estructura...', 10);
            const extractedText = await extractTextFromFile(fileObj.file);

            updateFileStatus(fileObj.id, 'indexing', 'Generando conocimiento...', 20);

            await ragService.processAndStoreDocument(
                fileObj.file.name,
                extractedText,
                fileObj.category || 'Información',
                (percent, message) => {
                    const totalPercent = 20 + (percent * 0.8);
                    updateFileStatus(fileObj.id, 'indexing', `Procesando: ${message}`, totalPercent);
                }
            );

            updateFileStatus(fileObj.id, 'success', 'Sincronización completa', 100);
            showNotif('success', '¡Archivo Integrado!', `${fileObj.file.name} ya es parte de tu base de conocimiento.`);
            loadStats();
        } catch (err) {
            console.error(err);
            updateFileStatus(fileObj.id, 'error', 'Error en integración', 0);
            showNotif('error', 'Fallo en Integración', `Hubo un problema al procesar ${fileObj.file.name}.`);
        }
    };

    const updateFileStatus = (id, status, message, progress = 0) => {
        setFiles(prev => prev.map(f =>
            f.id === id ? { ...f, status, statusMessage: message, progress } : f
        ));
    };

    const handleFiles = (newFiles) => {
        setErrorStatus(null);
        const validFiles = newFiles.filter(file =>
            file.type === 'application/pdf' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.endsWith('.docx')
        );

        if (validFiles.length === 0) {
            showNotif('warning', 'Formato no admitido', 'Solo aceptamos PDF o DOCX por el momento.');
            return;
        }

        const uploadingFiles = validFiles.map(file => ({
            file,
            id: Math.random().toString(36).substring(7),
            status: 'uploading',
            statusMessage: 'Iniciando...',
            progress: 0,
            category: selectedCategory
        }));

        setFiles(prev => [...prev, ...uploadingFiles]);
        uploadingFiles.forEach(processFileForRAG);
    };

    const handleDeleteDocument = async (sourceName) => {
        if (!confirm(`¿Deseas desvincular "${sourceName}"? Se perderá este conocimiento.`)) return;

        try {
            await ragService.deleteDocument(sourceName);
            showNotif('info', 'Documento Eliminado', `"${sourceName}" ha sido removido de la base.`);
            loadStats();
        } catch (err) {
            console.error(err);
            showNotif('error', 'Error', 'No se pudo eliminar el documento.');
        }
    };

    const handleToggleCategory = async (doc) => {
        const newCategory = doc.category === 'Plantilla' ? 'Información' : 'Plantilla';
        try {
            await ragService.updateDocumentCategory(doc.name, newCategory);
            showNotif('success', 'Categoría Cambiada', `"${doc.name}" ahora es ${newCategory === 'Plantilla' ? 'Plantilla' : 'Información'}.`);
            loadStats();
        } catch (err) {
            console.error(err);
            showNotif('error', 'Error', 'No se pudo actualizar la categoría.');
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-fade-in pb-20">
            {notification && (
                <PremiumToast 
                    type={notification.type} 
                    message={notification.message} 
                    detail={notification.detail} 
                    onDismiss={() => setNotification(null)} 
                />
            )}

            {/* Header / Intro */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/20">
                            <Database size={20} />
                        </div>
                        <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] leading-none">Cerebro Institucional</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
                        Memoria de <span className="text-brand-600">Conocimiento</span>
                    </h1>
                    <p className="text-slate-500 font-medium max-w-xl text-lg leading-relaxed">
                        Cargá tus materiales, libros o guías para que la IA los use como fuente de verdad al generar contenido o evaluar.
                    </p>
                </div>
                <PremiumButton 
                    variant="secondary" 
                    onClick={loadStats} 
                    className="!rounded-2xl !py-3 active:scale-95"
                    icon={<RefreshCw size={18} className={isLoadingStats ? 'animate-spin' : ''}/>}
                >
                    Actualizar
                </PremiumButton>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <PremiumCard className="!p-8 sm:!p-10 relative overflow-hidden group">
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fragmentos Activos</p>
                            <h3 className="text-5xl font-black text-brand-600 tracking-tighter leading-none mb-1">{stats.totalChunks}</h3>
                            <p className="text-sm font-bold text-slate-400">Knowledge Chunks</p>
                        </div>
                        <div className="w-20 h-20 bg-brand-50 rounded-[2rem] flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform duration-500">
                            <Zap size={32} />
                        </div>
                    </div>
                    <div className="absolute -right-8 -bottom-8 opacity-5 text-brand-600 group-hover:rotate-12 transition-transform duration-700">
                        <Database size={160} />
                    </div>
                </PremiumCard>

                <PremiumCard className="!p-8 sm:!p-10 relative overflow-hidden group">
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fuentes de Verdad</p>
                            <h3 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-1">{existingDocs.length}</h3>
                            <p className="text-sm font-bold text-slate-400">Documentos Validados</p>
                        </div>
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform duration-500">
                            <FileText size={32} />
                        </div>
                    </div>
                    <div className="absolute -right-8 -bottom-8 opacity-5 text-slate-900 group-hover:-rotate-12 transition-transform duration-700">
                        <BookOpen size={160} />
                    </div>
                </PremiumCard>
            </div>

            {/* Upload Area */}
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left: Dropzone */}
                    <div className="flex-1">
                        <div 
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`relative w-full h-[320px] rounded-[3.5rem] border-4 border-dashed transition-all duration-700 flex flex-col items-center justify-center text-center p-10 group overflow-hidden
                                ${dragActive 
                                    ? 'border-brand-500 bg-brand-50/50 scale-[1.02] shadow-2xl shadow-brand-500/10' 
                                    : 'border-slate-100 bg-white hover:border-brand-200 hover:shadow-xl hover:shadow-slate-200/50'}
                            `}
                        >
                            <input 
                                type="file" 
                                multiple 
                                accept=".pdf,.docx" 
                                onChange={handleChange} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            
                            <div className="mb-6 relative">
                                <div className={`w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-300 transition-all duration-500 ${dragActive ? 'bg-brand-500 text-white scale-110 rotate-6 shadow-xl shadow-brand-500/20' : 'group-hover:scale-110 group-hover:text-brand-500'}`}>
                                    <CloudUpload size={48} />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white border-4 border-white">
                                    <Sparkles size={14} />
                                </div>
                            </div>

                            <div className="space-y-2 relative z-10">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none group-hover:text-brand-600 transition-colors">Integrar Conocimiento</h3>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed max-w-[240px]">
                                    Arrastrá tus PDFs o DOCX <br/> o hacé clic para explorar
                                </p>
                            </div>

                            {/* Background Pulse Decor */}
                            <div className={`absolute inset-0 border-brand-500/20 border-8 rounded-[3rem] transition-all duration-1000 ${dragActive ? 'animate-ping opacity-20' : 'opacity-0'}`}></div>
                        </div>
                    </div>

                    {/* Right: Category and Hints */}
                    <div className="md:w-80 space-y-6">
                        <PremiumCard className="!p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-2">
                                    <Info size={12}/> Categoría Sugerida
                                </label>
                                <div className="space-y-3">
                                    <button 
                                        onClick={() => setSelectedCategory('Información')}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedCategory === 'Información' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-brand-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Database size={16}/>
                                            <span className="text-xs font-black uppercase tracking-tight">Información</span>
                                        </div>
                                        {selectedCategory === 'Información' && <CheckCircle size={16} className="text-brand-500"/>}
                                    </button>
                                    <button 
                                        onClick={() => setSelectedCategory('Plantilla')}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedCategory === 'Plantilla' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-brand-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Layers size={16}/>
                                            <span className="text-xs font-black uppercase tracking-tight">Plantilla</span>
                                        </div>
                                        {selectedCategory === 'Plantilla' && <CheckCircle size={16} className="text-brand-500"/>}
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-900 rounded-2xl text-white/70 text-[10px] font-medium leading-relaxed">
                                <p className="mb-2 font-black text-brand-400 uppercase tracking-widest">Tip Premium:</p>
                                Las <span className="text-white">Plantillas</span> ayudan a la IA a seguir tus formatos de examen o rúbricas favoritas.
                            </div>
                        </PremiumCard>
                    </div>
                </div>

                {/* File List & Progress */}
                {(files.length > 0 || existingDocs.length > 0) && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 px-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 whitespace-nowrap">Registro de Memoria</span>
                            <div className="h-px w-full bg-slate-100" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Uploading Progress */}
                            {files.map(f => (
                                <div key={f.id} className="bg-white border-2 border-brand-100 p-6 rounded-[2.5rem] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${f.status === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-brand-50 text-brand-500'}`}>
                                            {f.status === 'success' ? <CheckCircle size={24}/> : f.status === 'error' ? <AlertCircle size={24}/> : <FileUp size={24} className="animate-bounce"/>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black text-slate-900 truncate tracking-tight mb-0.5">{f.file.name}</h4>
                                            <p className={`text-[9px] font-black uppercase tracking-widest ${f.status === 'error' ? 'text-rose-500' : 'text-brand-500'}`}>
                                                {f.statusMessage}
                                            </p>
                                        </div>
                                        <span className="text-xs font-black text-brand-600">{Math.round(f.progress)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-500 transition-all duration-700" style={{ width: `${f.progress}%` }} />
                                    </div>
                                </div>
                            ))}

                            {/* Existing Documents */}
                            {existingDocs.map((doc, idx) => (
                                <div key={idx} className="group bg-white border border-slate-100 p-6 rounded-[2.5rem] flex items-center gap-6 hover:shadow-xl hover:shadow-slate-200/50 hover:border-brand-200 transition-all duration-500">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${doc.category === 'Plantilla' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                        {doc.category === 'Plantilla' ? <Layers size={24}/> : <BookOpen size={24}/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-black text-slate-800 truncate tracking-tight mb-1 group-hover:text-slate-900 transition-colors">{doc.name}</h4>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${doc.category === 'Plantilla' ? 'bg-amber-50-ext border-amber-100 text-amber-600' : 'bg-emerald-50-ext border-emerald-100 text-emerald-600'}`}>
                                                {doc.category}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
                                                <ShieldCheck size={10}/> Verificado
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                        <button 
                                            onClick={() => handleToggleCategory(doc)}
                                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-brand-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                            title="Cambiar Categoría"
                                        >
                                            <RefreshCw size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteDocument(doc.name)}
                                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                            title="Desvincular"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom CTA / Information */}
            <div className="pt-10">
                <div className="bg-slate-50 rounded-[3.5rem] p-12 flex flex-col md:flex-row items-center gap-10 border border-slate-100">
                    <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl border border-slate-50 flex items-center justify-center text-brand-500 flex-shrink-0 animate-bounce-slow">
                        <Sparkles size={40}/>
                    </div>
                    <div className="space-y-4 text-center md:text-left">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none">¿Cómo funciona la Memoria de SD Master?</h4>
                        <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
                            Cuando subís un documento, nuestro motor de RAG (Retrieval-Augmented Generation) lo fragmenta e indexa. 
                            La próxima vez que generes una secuencia sobre este tema, la IA consultará automáticamente tu repositorio 
                            antes de responder, garantizando precisión académica total.
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default UploadModule;
