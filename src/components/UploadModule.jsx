import React, { useState, useEffect } from 'react';
import { CloudUpload, FileText, X, CheckCircle, AlertCircle, Loader2, Database, Layers, RefreshCw, Trash2, ShieldCheck, Zap } from 'lucide-react';
import { extractTextFromFile } from '../utils/textExtractor';
import { ragService } from '../services/ragService';

const UploadModule = () => {
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState([]);
    const [errorStatus, setErrorStatus] = useState(null);
    const [stats, setStats] = useState({ totalChunks: 0 });
    const [existingDocs, setExistingDocs] = useState([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [toast, setToast] = useState(null);

    // Cargar estadísticas iniciales
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
            console.error("Error cargando stats:", err);
        } finally {
            setIsLoadingStats(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

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
                (percent, message) => {
                    const totalPercent = 20 + (percent * 0.8);
                    updateFileStatus(fileObj.id, 'indexing', `Procesando: ${message}`, totalPercent);
                }
            );

            updateFileStatus(fileObj.id, 'success', 'Sincronización completa', 100);
            showToast(`¡${fileObj.file.name} integrado!`, 'success');
            loadStats();
        } catch (err) {
            console.error(err);
            updateFileStatus(fileObj.id, 'error', 'Error en integración', 0);
            setErrorStatus(`Fallo al procesar ${fileObj.file.name}`);
            showToast(`Error con ${fileObj.file.name}`, 'error');
        }
    };

    const showToast = (message, type) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
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
            setErrorStatus("Formato no soportado. Por favor usa PDF o DOCX.");
            return;
        }

        const uploadingFiles = validFiles.map(file => ({
            file,
            id: Math.random().toString(36).substring(7),
            status: 'uploading',
            statusMessage: 'Iniciando...',
            progress: 0
        }));

        setFiles(prev => [...prev, ...uploadingFiles]);
        uploadingFiles.forEach(processFileForRAG);
    };

    const handleDeleteDocument = async (sourceName) => {
        if (!confirm(`¿Deseas desvincular "${sourceName}"? Se perderá este conocimiento.`)) return;

        try {
            await ragService.deleteDocument(sourceName);
            showToast(`"${sourceName}" desvinculado`, 'success');
            loadStats();
        } catch (err) {
            console.error(err);
            showToast(`Fallo al eliminar`, 'error');
        }
    };

    return (
        <div className="animate-scale-up">
            {/* Main Container Card */}
            <div className="glass rounded-[2.5rem] shadow-2xl shadow-brand-500/5 overflow-hidden border border-white/60 bg-white/40 backdrop-blur-3xl">

                {/* Header Section */}
                <div className="p-8 border-b border-white/50 bg-gradient-to-br from-brand-600/5 to-transparent">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-brand-600 rounded-2xl text-white shadow-xl shadow-brand-500/30">
                                <Database size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">Cerebro Institucional</h2>
                                <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest flex items-center">
                                    <ShieldCheck size={10} className="mr-1" /> Conocimiento Protegido
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={loadStats}
                            className="p-2.5 bg-white/50 hover:bg-white rounded-xl text-slate-400 hover:text-brand-600 border border-white/50 transition-all shadow-sm active:scale-95"
                            title="Actualizar Memoria"
                        >
                            <RefreshCw size={18} className={isLoadingStats ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/60 p-4 rounded-3xl border border-white/80 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-5 text-brand-600 group-hover:scale-110 transition-transform">
                                <Zap size={40} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Memoria Activa</p>
                            <div className="flex items-baseline space-x-1">
                                <span className="text-3xl font-black text-brand-600 leading-none tracking-tighter">{stats.totalChunks}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">fragmentos</span>
                            </div>
                        </div>
                        <div className="bg-white/60 p-4 rounded-3xl border border-white/80 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-5 text-slate-900 group-hover:scale-110 transition-transform">
                                <FileText size={40} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fuentes de Verdad</p>
                            <div className="flex items-baseline space-x-1">
                                <span className="text-3xl font-black text-slate-900 leading-none tracking-tighter">{existingDocs.length}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">documentos</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Professional Dropzone */}
                    <div className="group relative">
                        <form
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onSubmit={(e) => e.preventDefault()}
                            className={`relative border-2 border-dashed rounded-[2rem] p-12 text-center transition-all duration-500
                                ${dragActive
                                    ? 'border-brand-500 bg-brand-50/50 scale-[1.02] shadow-2xl shadow-brand-500/10'
                                    : 'border-slate-200 bg-slate-50/50 hover:border-brand-400 hover:bg-white hover:shadow-xl'}
                            `}
                        >
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.docx"
                                onChange={handleChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`mb-6 flex justify-center transition-all duration-500 ${dragActive ? 'scale-110 rotate-12' : 'group-hover:scale-110'}`}>
                                <div className="p-6 bg-white rounded-3xl shadow-xl border border-slate-100 text-brand-500">
                                    <CloudUpload size={40} />
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 leading-tight mb-2">Alimenta la Inteligencia</h3>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">Suelte sus archivos PDF o DOCX aquí</p>
                        </form>
                    </div>

                    {/* Progress & File Management */}
                    {(files.length > 0 || existingDocs.length > 0) && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estado de la Red Neuronal</h3>
                                <div className="h-px flex-grow mx-4 bg-slate-100" />
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                                {/* Loading Files */}
                                {files.map(fileObj => (
                                    <div key={fileObj.id} className="group flex flex-col p-4 rounded-3xl bg-white border border-brand-100 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-4 overflow-hidden">
                                                <div className={`p-3 rounded-2xl transition-all ${fileObj.status === 'error' ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white'}`}>
                                                    {fileObj.status === 'success' ? <CheckCircle size={20} /> :
                                                        fileObj.status === 'error' ? <AlertCircle size={20} /> :
                                                            <Layers size={20} className="animate-bounce" />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-black text-slate-800 truncate leading-none mb-1.5">{fileObj.file.name}</p>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${fileObj.status === 'error' ? 'text-red-500' : 'text-brand-500'}`}>
                                                        {fileObj.statusMessage}
                                                    </p>
                                                </div>
                                            </div>
                                            {(fileObj.status !== 'success' && fileObj.status !== 'error') && (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-[10px] font-black text-brand-600">{Math.round(fileObj.progress)}%</span>
                                                    <Loader2 size={16} className="text-brand-500 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Progress Bar */}
                                        {fileObj.status !== 'success' && fileObj.status !== 'error' && (
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-[2px]">
                                                <div
                                                    className="bg-brand-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                                                    style={{ width: `${fileObj.progress}%` }}
                                                ></div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Indexed Docs */}
                                {existingDocs.map((docName, idx) => (
                                    <div key={idx} className="group flex items-center justify-between p-4 rounded-3xl bg-white/40 border border-slate-100 hover:bg-white hover:border-brand-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                                        <div className="flex items-center space-x-4 overflow-hidden">
                                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                                <CheckCircle size={20} />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-black text-slate-700 truncate leading-none mb-1.5">{docName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                                    <ShieldCheck size={10} className="mr-1" /> Conocimiento Sincronizado
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDocument(docName)}
                                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0"
                                            title="Desvincular conocimiento"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Toast */}
            {toast && (
                <div className={`fixed bottom-12 right-12 z-[100] flex items-center space-x-4 py-5 px-8 rounded-3xl shadow-2xl border animate-slide-up
                    ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20' : 'bg-red-600 border-red-500 text-white shadow-red-500/20'}
                `}>
                    <div className="p-2 bg-white/20 rounded-xl">
                        {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div>
                        <p className="font-black text-sm tracking-tight leading-none mb-1">{toast.type === 'success' ? 'Éxito' : 'Error'}</p>
                        <p className="text-xs font-bold opacity-80">{toast.message}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <X size={16} />
                    </button>
                </div>
            )}

            <style>{`
                .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes slideUp { from { transform: translateY(100%) scale(0.9); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default UploadModule;

