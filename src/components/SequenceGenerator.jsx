import React, { useState, useEffect } from 'react';
import {
    Sparkles, BookType, Calendar, Clock, Loader2, Check,
    FileDown, History, Trash2, ChevronRight, ChevronDown,
    Video, Edit3, Eye, FileOutput, MessageSquare, Database,
    CloudUpload, Lock, Globe, AlertTriangle, Columns
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { antigravityService } from '../services/antigravityService';
import { ragService } from '../services/ragService';
import { sequenceDbService } from '../lib/sequenceDbService';
import { exportToPDF, exportToWord } from '../utils/docExporter';
import RichEditor from './RichEditor';

// ─── Sub-componentes ─────────────────────────────────────────

const InputField = ({ label, icon, name, value, onChange, placeholder }) => (
    <div className="space-y-1.5 group">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-brand-600 transition-colors flex items-center gap-1">
            {icon && <span className="opacity-60">{icon}</span>}
            {label}
        </label>
        <input
            type="text" name={name} value={value} onChange={onChange} placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 bg-white/70 py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-300 shadow-sm"
        />
    </div>
);

const SelectField = ({ label, name, value, onChange, options }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
        <select name={name} value={value} onChange={onChange}
            className="w-full rounded-xl border border-slate-200 bg-white/70 py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer shadow-sm">
            {options.map(o => (
                <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
                    {typeof o === 'string' ? o : o.label}
                </option>
            ))}
        </select>
    </div>
);

const ToolbarBtn = ({ onClick, icon, label, variant = 'default', disabled = false }) => {
    const v = {
        default: 'text-slate-600 hover:bg-slate-100 border border-transparent',
        primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-md border border-slate-800',
        success: 'text-emerald-600 hover:bg-emerald-50 border border-transparent',
    };
    return (
        <button onClick={onClick} disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${v[variant]}`}>
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
};

// ─── Componente principal ─────────────────────────────────────

const SequenceGenerator = ({ isSidebarOpen, setIsSidebarOpen, session, profile, loadedSequence, clearLoadedSequence }) => {

    const [formData, setFormData] = useState({
        subject: '', year: '', topic: '', duration: '',
        structure: 'Tradicional', includeMedia: true, suggestions: '',
        templateSource: 'None',
    });

    const [existingDocs, setExistingDocs] = useState([]);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState(['Plantilla', 'Información']);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isSavingCloud, setIsSavingCloud] = useState(false);

    // Markdown puro siempre
    const [result, setResult] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [notification, setNotification] = useState(null);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [loadedId, setLoadedId] = useState(null);

    // ── Efectos ──
    useEffect(() => {
        const prefs = (() => { try { return JSON.parse(localStorage.getItem('sd_preferences') || '{}'); } catch { return {}; } })();
        const hist = (() => { try { return JSON.parse(localStorage.getItem('sd_history') || '[]'); } catch { return []; } })();
        setFormData(prev => ({
            ...prev,
            subject: prev.subject || prefs.defaultSubject || '',
            year: prev.year || prefs.defaultYear || '',
            topic: prev.topic || prefs.defaultTopic || '',
            duration: prefs.defaultDuration || '2h',
            structure: prefs.defaultStructure || 'Tradicional',
        }));
        setHistory(hist);
        loadIndexedDocs();
    }, [profile]);

    useEffect(() => { localStorage.setItem('sd_history', JSON.stringify(history)); }, [history]);

    useEffect(() => {
        if (!notification) return;
        const t = setTimeout(() => setNotification(null), notification.duration || 5000);
        return () => clearTimeout(t);
    }, [notification]);

    // Cargar secuencia desde comunidad / Mis Secuencias
    useEffect(() => {
        if (!loadedSequence) return;
        setFormData({
            subject: loadedSequence.subject || '',
            year: loadedSequence.year || '',
            topic: loadedSequence.topic || '',
            duration: loadedSequence.duration || '',
            structure: loadedSequence.structure || 'Tradicional',
            includeMedia: true,
            suggestions: '',
            templateSource: 'None',
        });
        setResult(loadedSequence.content || '');
        setEditContent(loadedSequence.content || '');
        setLoadedId(loadedSequence.id || null);
        setIsEditing(false);
        if (clearLoadedSequence) clearLoadedSequence();
    }, [loadedSequence, clearLoadedSequence]);

    const showNotif = (type, message, detail, duration = 5000) =>
        setNotification({ type, message, detail, duration });

    const loadIndexedDocs = async () => {
        const docs = await ragService.fetchUniqueDocuments();
        setExistingDocs(docs || []);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!formData.subject || !formData.year || !formData.topic || !formData.duration) {
            showNotif('warning', 'Campos Requeridos', 'Completá Materia, Año, Tema y Duración.');
            return;
        }
        setIsGenerating(true);
        setResult(null);
        setIsEditing(false);
        setLoadedId(null);

        try {
            const data = await antigravityService.generateSequence({ 
                ...formData, 
                selectedDocs, 
                selectedCategories,
                defaultContext: profile?.defaultContext 
            });
            const content = data.content;
            setResult(content);
            setEditContent(content);
            setHistory(prev => [{
                id: Date.now(),
                date: new Date().toLocaleString('es-AR'),
                params: { ...formData },
                content
            }, ...prev].slice(0, 5));
        } catch (err) {
            const isHighDemand = err.type === 'HIGH_DEMAND';
            showNotif(
                isHighDemand ? 'warning' : 'error',
                isHighDemand ? '⚡ Alta Demanda' : '⚠️ Error al Generar',
                err.detail || err.message || 'Error inesperado.',
                isHighDemand ? 10000 : 6000
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const enterEditMode = () => { setEditContent(result || ''); setIsEditing(true); };
    const exitEditMode = () => { setResult(editContent); setIsEditing(false); };
    const getActiveContent = () => isEditing ? editContent : result;

    const handleExportPDF = async () => {
        const content = getActiveContent();
        if (!content) return;
        setIsExporting(true);
        try {
            await exportToPDF(content, { ...formData, type: formData.structure },
                `Secuencia_${(formData.topic || 'sin_tema').replace(/\s+/g, '_')}`);
        } catch (err) {
            showNotif('error', 'Error PDF', 'No se pudo generar el PDF.');
        } finally { setIsExporting(false); }
    };

    const handleExportWord = async () => {
        const content = getActiveContent();
        if (!content) return;
        setIsExporting(true);
        try {
            await exportToWord(content, { ...formData, type: formData.structure },
                `Secuencia_${(formData.topic || 'sin_tema').replace(/\s+/g, '_')}`);
        } catch (err) {
            showNotif('error', 'Error Word', 'No se pudo generar el archivo Word.');
        } finally { setIsExporting(false); }
    };

    const handleCloudSaveClick = () => {
        if (!session) { showNotif('warning', 'Sesión Requerida', 'Iniciá sesión para guardar en la nube.'); return; }
        setShowSaveModal(true);
    };

    const confirmCloudSave = async (isPublic) => {
        setIsSavingCloud(true);
        setShowSaveModal(false);
        try {
            const finalContent = isEditing ? editContent : result;
            const res = await sequenceDbService.saveSequence({
                subject: formData.subject, year: formData.year, topic: formData.topic,
                duration: formData.duration, structure: formData.structure,
                theme: 'academic', content: finalContent, id: loadedId
            }, isPublic);
            if (!loadedId && res.data?.id) {
                setLoadedId(res.data.id);
            }
            showNotif('success', '¡Guardado!', `Secuencia guardada como ${isPublic ? 'Pública' : 'Privada'}.`, 4000);
        } catch (err) {
            showNotif('error', 'Error al Guardar', err.message || 'No se pudo guardar.');
        } finally { setIsSavingCloud(false); }
    };

    const loadFromHistory = (item) => {
        setFormData(item.params);
        setResult(item.content);
        setEditContent(item.content);
        setLoadedId(item.id || null);
        setIsEditing(false);
        setShowHistory(false);
    };

    const deleteHistoryItem = (e, id) => {
        e.stopPropagation();
        setHistory(prev => prev.filter(h => h.id !== id));
    };

    // ── Render ────────────────────────────────────────────────

    return (
        <div className="flex-grow flex overflow-hidden relative w-full">

            {/* Notificación flotante */}
            {notification && (
                <div className={`fixed top-5 right-5 z-50 max-w-sm w-full p-4 rounded-2xl shadow-xl border animate-slide-up flex gap-3 items-start ${
                    notification.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : notification.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="font-bold text-xs">{notification.message}</p>
                        {notification.detail && <p className="text-xs mt-0.5 opacity-80">{notification.detail}</p>}
                    </div>
                    <button onClick={() => setNotification(null)} className="ml-auto text-xs opacity-50 hover:opacity-100 flex-shrink-0">✕</button>
                </div>
            )}

            {/* Modal de guardado */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-scale-up">
                        <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">¿Cómo guardar?</h3>
                        <p className="text-sm text-slate-500 mb-6">Elige la visibilidad de tu secuencia en la comunidad.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => confirmCloudSave(false)}
                                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-all group">
                                <Lock size={20} className="text-slate-400 group-hover:text-brand-600" />
                                <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Privada</span>
                                <span className="text-[9px] text-slate-400 text-center">Solo para ti</span>
                            </button>
                            <button onClick={() => confirmCloudSave(true)}
                                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-brand-200 bg-brand-50 hover:border-brand-400 hover:bg-brand-100 transition-all group">
                                <Globe size={20} className="text-brand-600" />
                                <span className="text-xs font-black text-brand-700 uppercase tracking-wide">Pública</span>
                                <span className="text-[9px] text-brand-500 text-center">Visible en comunidad</span>
                            </button>
                        </div>
                        <button onClick={() => setShowSaveModal(false)}
                            className="w-full mt-4 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Overlay móvil */}
            {isSidebarOpen && (
                <div className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* ── SIDEBAR ───────────────────────────────────── */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-100 transition-all duration-500 transform lg:relative lg:translate-x-0 lg:z-10 ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:w-0'}`}>
                <div className="h-full flex flex-col p-5 overflow-y-auto custom-scrollbar">

                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sparkles size={11} className="text-brand-500" />
                            Parámetros de Generación
                        </p>

                        <form onSubmit={handleGenerate} className="space-y-4">
                            <InputField label="Materia" icon={<BookType size={11} />} name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Ej. Matemáticas" />
                            <InputField label="Año / Curso" icon={<Calendar size={11} />} name="year" value={formData.year} onChange={handleInputChange} placeholder="Ej. 3er Año" />
                            <InputField label="Tema Principal" icon={<Sparkles size={11} />} name="topic" value={formData.topic} onChange={handleInputChange} placeholder="Ej. Ecuaciones lineales" />
                            <InputField label="Duración Total" icon={<Clock size={11} />} name="duration" value={formData.duration} onChange={handleInputChange} placeholder="Ej. 2h, 80 minutos" />

                            <div className="grid grid-cols-2 gap-3">
                                <SelectField label="Enfoque"
                                    name="structure" value={formData.structure} onChange={handleInputChange}
                                    options={[
                                        { value: 'Tradicional', label: 'Inicio/Cierre' },
                                        { value: 'ABP', label: 'Por Proyectos' },
                                        { value: 'Flipped', label: 'Aula Invertida' },
                                        { value: 'Gamificación', label: 'Gamificada' },
                                        { value: 'Kolb', label: 'Ciclo Kolb' },
                                    ]}
                                />
                                <SelectField label="Plantilla"
                                    name="templateSource" value={formData.templateSource} onChange={handleInputChange}
                                    options={[
                                        { value: 'None', label: 'IA Base' },
                                        ...existingDocs.filter(d => d.category === 'Plantilla')
                                            .map(d => ({ value: d.name, label: d.name }))
                                    ]}
                                />
                            </div>

                            {/* Fuentes de conocimiento */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Database size={11} /> Fuentes de Conocimiento
                                </label>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                    {['Información', 'Plantilla'].map(cat => (
                                        <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                                            <input type="checkbox"
                                                checked={selectedCategories.includes(cat)}
                                                onChange={e => {
                                                    if (e.target.checked) setSelectedCategories(p => [...p, cat]);
                                                    else setSelectedCategories(p => p.filter(c => c !== cat));
                                                }}
                                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-brand-600 transition-colors uppercase">
                                                {cat === 'Plantilla' ? 'Estructuras / Plantillas' : 'Contenido / Actividades'}
                                            </span>
                                        </label>
                                    ))}

                                    {existingDocs.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200">
                                            <button type="button" onClick={() => setIsDocsOpen(o => !o)}
                                                className="w-full flex items-center justify-between text-[9px] font-black text-slate-400 uppercase hover:text-brand-600 transition-colors">
                                                <span>Documentos específicos</span>
                                                <ChevronRight size={11} className={`transition-transform ${isDocsOpen ? 'rotate-90' : ''}`} />
                                            </button>
                                            {isDocsOpen && (
                                                <div className="mt-2 max-h-28 overflow-y-auto space-y-1 custom-scrollbar animate-fade-in">
                                                    {existingDocs.map(doc => (
                                                        <label key={doc.name} className="flex items-center gap-2 cursor-pointer group">
                                                            <input type="checkbox"
                                                                checked={selectedDocs.includes(doc.name)}
                                                                onChange={e => {
                                                                    if (e.target.checked) setSelectedDocs(p => [...p, doc.name]);
                                                                    else setSelectedDocs(p => p.filter(d => d !== doc.name));
                                                                }}
                                                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                            />
                                                            <span className="text-[9px] text-slate-500 truncate group-hover:text-slate-800 transition-colors">{doc.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sugerencias */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <MessageSquare size={11} /> Indicaciones Extras
                                </label>
                                <textarea name="suggestions" value={formData.suggestions} onChange={handleInputChange}
                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-medium text-slate-700 focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all resize-none h-20"
                                    placeholder="Ej. 'Incluír más ejercicios de práctica', 'Estilo más dinámico'..."
                                />
                            </div>

                            {/* Toggle multimedia */}
                            <button type="button"
                                onClick={() => setFormData(prev => ({ ...prev, includeMedia: !prev.includeMedia }))}
                                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group">
                                <div className="flex items-center gap-2 text-slate-500 group-hover:text-brand-600 transition-colors">
                                    <Video size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Incluir Recursos Multimedia</span>
                                </div>
                                <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${formData.includeMedia ? 'bg-brand-600' : 'bg-slate-300'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${formData.includeMedia ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>

                            <button type="submit" disabled={isGenerating}
                                className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-brand-500/25 hover:shadow-brand-500/40 hover:from-brand-700 hover:to-brand-800">
                                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                {isGenerating ? 'Generando secuencia...' : 'Generar Secuencia'}
                            </button>
                        </form>
                    </div>

                    {/* Historial */}
                    <div className="mt-auto pt-4 border-t border-slate-100">
                        <button onClick={() => setShowHistory(o => !o)}
                            className="w-full p-2.5 rounded-xl flex items-center justify-between text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all group">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                                <History size={14} />
                                <span>Recientes</span>
                                {history.length > 0 && (
                                    <span className="bg-slate-100 text-slate-600 text-[8px] px-1.5 py-0.5 rounded font-black">{history.length}</span>
                                )}
                            </div>
                            <ChevronRight size={14} className={`transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                        </button>

                        {showHistory && history.length > 0 && (
                            <div className="mt-2 space-y-1.5 animate-fade-in">
                                {history.map(item => (
                                    <div key={item.id} onClick={() => loadFromHistory(item)}
                                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer transition-all group">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-slate-700 truncate">{item.params.topic}</p>
                                            <p className="text-[8px] text-slate-400">{item.params.subject} · {item.date}</p>
                                        </div>
                                        <button onClick={e => deleteHistoryItem(e, item.id)}
                                            className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors ml-2 flex-shrink-0">
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* ── ÁREA PRINCIPAL ────────────────────────────── */}
            <main className="flex-grow flex flex-col min-w-0 overflow-hidden">

                {/* Barra de herramientas */}
                <div className="h-14 bg-white/90 backdrop-blur-sm border-b border-slate-100 flex items-center justify-between px-5 flex-shrink-0 gap-2">
                    <div className="flex items-center gap-1.5">
                        {result && !isEditing && (
                            <ToolbarBtn onClick={enterEditMode} icon={<Edit3 size={13} />} label="Editar" />
                        )}
                        {isEditing && (
                            <ToolbarBtn onClick={exitEditMode} icon={<Eye size={13} />} label="Vista Previa" variant="primary" />
                        )}
                    </div>

                    {(result || isEditing) && (
                        <div className="flex items-center gap-1.5 ml-auto">
                            <ToolbarBtn
                                onClick={handleCloudSaveClick}
                                icon={isSavingCloud ? <Loader2 size={13} className="animate-spin" /> : <CloudUpload size={13} />}
                                label={isSavingCloud ? 'Guardando...' : 'Guardar'}
                                variant="success"
                                disabled={isSavingCloud}
                            />
                            <div className="w-px h-5 bg-slate-200" />
                            <ToolbarBtn onClick={handleExportWord} icon={<FileOutput size={13} />} label="Word" disabled={isExporting} />
                            <ToolbarBtn
                                onClick={handleExportPDF}
                                icon={isExporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                                label="PDF" variant="primary" disabled={isExporting}
                            />
                        </div>
                    )}
                </div>

                {/* Contenido */}
                <div className="flex-grow overflow-y-auto p-4 md:p-10 custom-scrollbar flex justify-center items-start">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center gap-5 mt-24 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center">
                                <Loader2 size={32} className="animate-spin text-brand-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Generando Secuencia...</h3>
                                <p className="text-xs text-slate-400 mt-1">Analizando fuentes y construyendo el plan de clase</p>
                            </div>
                        </div>
                    ) : isEditing ? (
                        <div className="w-full max-w-screen-xl animate-scale-up" style={{ height: 'calc(100vh - 10rem)' }}>
                            <RichEditor value={editContent} onChange={setEditContent} />
                        </div>
                    ) : result ? (
                        <div className="w-full max-w-4xl animate-scale-up pb-16">
                            <div className="document-page">
                                {/* Cabecera institucional */}
                                <div className="flex items-start justify-between mb-8 pb-5 border-b-2 border-brand-700">
                                    <div>
                                        <div className="text-[8px] font-black uppercase tracking-[0.25em] text-brand-600 mb-1">Secuencia Didáctica</div>
                                        <h1 className="text-xl font-black text-slate-900 leading-tight">{formData.topic || 'Planificación Docente'}</h1>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            {formData.subject && <span className="text-xs text-slate-500 font-medium">{formData.subject}</span>}
                                            {formData.year && <span className="text-xs text-slate-400">· {formData.year}</span>}
                                            {formData.duration && <span className="text-xs text-slate-400">· {formData.duration}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-100">
                                            <Sparkles size={10} className="text-brand-600" />
                                            <span className="text-[9px] font-black text-brand-600 uppercase tracking-wider">{formData.structure}</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-2 font-mono">{new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>

                                {/* Contenido Markdown */}
                                <div className="academic-preview">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex, rehypeRaw]}
                                        components={{
                                            table: ({ children }) => (
                                                <div className="overflow-x-auto my-4 rounded-lg">
                                                    <table>{children}</table>
                                                </div>
                                            ),
                                            img: ({ src, alt }) => (
                                                <div className="my-6 rounded-xl overflow-hidden shadow-md">
                                                    <img src={src} alt={alt} className="w-full object-cover max-h-72" />
                                                    {alt && <p className="text-center text-[10px] text-slate-400 italic py-1 bg-slate-50">{alt}</p>}
                                                </div>
                                            ),
                                            a: ({ href, children }) => {
                                                if (href?.includes('youtube.com') || href?.includes('youtu.be')) {
                                                    return (
                                                        <a href={href} target="_blank" rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors my-1">
                                                            <Video size={12} />
                                                            {children}
                                                        </a>
                                                    );
                                                }
                                                return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                                            }
                                        }}
                                    >
                                        {result}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-5 mt-24 text-center opacity-25 select-none">
                            <Sparkles size={56} className="text-slate-400" />
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Sin Secuencia</h3>
                                <p className="max-w-xs text-xs font-medium text-slate-500 mt-2">Completá los parámetros y hacé clic en "Generar Secuencia" para crear una planificación profesional.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SequenceGenerator;
