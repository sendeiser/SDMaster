import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles, BookType, Loader2, Check, FileDown, Trash2,
    FileText, Edit3, Eye, FileOutput, Database, CloudUpload,
    Lock, Globe, ListCheck, ClipboardCheck, GraduationCap,
    Video, ChevronDown, AlertTriangle
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

// ─── Sub-componentes reutilizables ─────────────────────────

const InputField = ({ label, icon, name, value, onChange, placeholder, type = 'text' }) => (
    <div className="space-y-1.5 group">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-brand-600 transition-colors flex items-center gap-1">
            {icon && <span className="opacity-60">{icon}</span>}
            {label}
        </label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 bg-white/70 py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-300 shadow-sm"
        />
    </div>
);

const SelectField = ({ label, name, value, onChange, options }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full rounded-xl border border-slate-200 bg-white/70 py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer shadow-sm"
        >
            {options.map(opt => (
                <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                    {typeof opt === 'string' ? opt : opt.label}
                </option>
            ))}
        </select>
    </div>
);

const ToolbarBtn = ({ onClick, icon, label, variant = 'default', disabled = false }) => {
    const variants = {
        default: 'text-slate-600 hover:bg-slate-100 border border-transparent',
        primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-md border border-slate-800',
        danger: 'text-rose-500 hover:bg-rose-50 border border-transparent',
        success: 'text-emerald-600 hover:bg-emerald-50 border border-transparent',
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]}`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
};

// ─── Componente principal ────────────────────────────────────

const AssessmentGenerator = ({ isSidebarOpen, setIsSidebarOpen, session, loadedAssessment, clearLoadedAssessment }) => {
    const [formData, setFormData] = useState({
        subject: '',
        year: '',
        topic: '',
        type: 'Examen Tradicional',
        difficulty: 'Intermedio',
        itemsCount: '5',
    });

    const [existingDocs, setExistingDocs] = useState([]);
    const [userSequences, setUserSequences] = useState([]);
    const [savedAssessments, setSavedAssessments] = useState([]);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [selectedSequences, setSelectedSequences] = useState([]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // result es siempre Markdown puro
    const [result, setResult] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    const [loadedId, setLoadedId] = useState(null);
    const [notification, setNotification] = useState(null);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (!notification) return;
        const t = setTimeout(() => setNotification(null), notification.duration || 5000);
        return () => clearTimeout(t);
    }, [notification]);

    // Cargar evaluación desde comunidad / Mis Evaluaciones
    useEffect(() => {
        if (!loadedAssessment) return;
        setFormData({
            subject: loadedAssessment.subject || '',
            year: loadedAssessment.year || '',
            topic: loadedAssessment.topic || '',
            type: loadedAssessment.type || 'Examen Tradicional',
            difficulty: loadedAssessment.difficulty || 'Intermedio',
            itemsCount: '5',
        });
        setResult(loadedAssessment.content || '');
        setEditContent(loadedAssessment.content || '');
        setLoadedId(loadedAssessment.id || null);
        setIsEditing(false);
        if (clearLoadedAssessment) clearLoadedAssessment();
    }, [loadedAssessment, clearLoadedAssessment]);

    const showNotif = (type, message, detail, duration = 5000) =>
        setNotification({ type, message, detail, duration });

    const loadData = async () => {
        try {
            const [docs, sequences, assessments] = await Promise.all([
                ragService.fetchUniqueDocuments(),
                sequenceDbService.getUserSequences(),
                sequenceDbService.getUserAssessments(),
            ]);
            setExistingDocs(docs || []);
            setUserSequences(sequences || []);
            setSavedAssessments(assessments || []);
        } catch (err) {
            console.error('Error loading data:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleDoc = (name) =>
        setSelectedDocs(prev => prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]);

    const toggleSequence = (id) =>
        setSelectedSequences(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    const generateAssessment = async () => {
        if (!formData.subject || !formData.topic) {
            showNotif('warning', 'Campos Requeridos', 'Completa Materia y Tema para continuar.');
            return;
        }
        setIsGenerating(true);
        setResult(null);
        setIsEditing(false);
        setLoadedId(null);

        try {
            const sequencesContext = userSequences
                .filter(s => selectedSequences.includes(s.id))
                .map(s => ({ topic: s.topic, content: s.content }));

            const data = await antigravityService.generateAssessment({
                ...formData,
                selectedDocs,
                selectedSequences: sequencesContext,
            });

            if (data.success) {
                setResult(data.content);
                setEditContent(data.content);
            }
        } catch (err) {
            const msg = err.type === 'HIGH_DEMAND'
                ? 'El modelo de IA está con alta demanda. Intentá en unos segundos.'
                : err.detail || err.message || 'Error inesperado al generar.';
            showNotif('error', 'Error al Generar', msg);
        } finally {
            setIsGenerating(false);
        }
    };

    // Al entrar al editor: cargar el resultado actual en editContent
    const enterEditMode = () => {
        setEditContent(result || '');
        setIsEditing(true);
    };

    // Al salir del editor: guardar editContent como nuevo result
    const exitEditMode = () => {
        setResult(editContent);
        setIsEditing(false);
    };

    const getActiveContent = () => isEditing ? editContent : result;

    const handleExportPDF = async () => {
        const content = getActiveContent();
        if (!content) return;
        setIsExporting(true);
        try {
            await exportToPDF(content, { ...formData }, `Evaluacion_${(formData.topic || 'sin_tema').replace(/\s+/g, '_')}`);
        } catch (err) {
            console.error('PDF export error:', err);
            showNotif('error', 'Error PDF', 'No se pudo generar el PDF.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportWord = async () => {
        const content = getActiveContent();
        if (!content) return;
        setIsExporting(true);
        try {
            await exportToWord(content, { ...formData }, `Evaluacion_${(formData.topic || 'sin_tema').replace(/\s+/g, '_')}`);
        } catch (err) {
            console.error('Word export error:', err);
            showNotif('error', 'Error Word', 'No se pudo generar el archivo Word.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleSave = async () => {
        if (!result) return;
        if (!session) {
            showNotif('warning', 'Sesión Requerida', 'Iniciá sesión para guardar en la nube.');
            return;
        }
        setIsSaving(true);
        try {
            const contentToSave = isEditing ? editContent : result;
            const res = await sequenceDbService.saveAssessment({ 
                ...formData, 
                content: contentToSave,
                id: loadedId 
            });
            if (res.success) {
                if (!loadedId && res.data?.id) {
                    setLoadedId(res.data.id);
                }
                showNotif('success', '¡Guardado!', 'La evaluación fue guardada en la nube.', 4000);
                loadData();
            }
        } catch (err) {
            showNotif('error', 'Error al Guardar', err.message || 'No se pudo guardar.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadAssessment = (item) => {
        setFormData({
            subject: item.subject || '',
            year: item.year || '',
            topic: item.topic || '',
            type: item.type || 'Examen Tradicional',
            difficulty: item.difficulty || 'Intermedio',
            itemsCount: '?',
        });
        setResult(item.content || '');
        setEditContent(item.content || '');
        setLoadedId(item.id);
        setIsEditing(false);
    };

    const handleDeleteAssessment = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('¿Eliminar esta evaluación del historial?')) return;
        try {
            await sequenceDbService.deleteAssessment(id);
            loadData();
        } catch {
            showNotif('error', 'Error', 'No se pudo eliminar.');
        }
    };

    // ── Render ─────────────────────────────────────────────────

    return (
        <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden bg-slate-50">

            {/* ── Notificación flotante ── */}
            {notification && (
                <div className={`fixed top-5 right-5 z-50 max-w-sm w-full p-4 rounded-2xl shadow-xl border transition-all animate-slide-up flex gap-3 items-start ${
                    notification.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : notification.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-xs">{notification.message}</p>
                        {notification.detail && <p className="text-xs mt-0.5 opacity-80">{notification.detail}</p>}
                    </div>
                    <button onClick={() => setNotification(null)} className="ml-auto text-xs opacity-50 hover:opacity-100">✕</button>
                </div>
            )}

            {/* ── SIDEBAR ─────────────────────────────────────── */}
            <aside className={`${isSidebarOpen ? 'w-full md:w-[22rem]' : 'w-0'} bg-white border-r border-slate-100 transition-all duration-500 ease-in-out flex flex-col z-40 overflow-hidden flex-shrink-0`}>
                <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">

                    {/* Encabezado sidebar */}
                    <div className="flex items-center gap-3 mb-7">
                        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-brand-500/30">
                            <ClipboardCheck size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 tracking-tight">Evaluaciones <span className="text-brand-600">IA</span></h2>
                            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Generador Académico</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <InputField label="Materia" icon={<GraduationCap size={12} />} name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Ej: Historia Argentina" />
                        <InputField label="Tema de Evaluación" icon={<BookType size={12} />} name="topic" value={formData.topic} onChange={handleInputChange} placeholder="Ej: Revolución de Mayo" />

                        <div className="grid grid-cols-2 gap-3">
                            <SelectField label="Nivel / Año" name="year" value={formData.year} onChange={handleInputChange}
                                options={['', '1° Año', '2° Año', '3° Año', '4° Año', '5° Año', '6° Año']} />
                            <SelectField label="Dificultad" name="difficulty" value={formData.difficulty} onChange={handleInputChange}
                                options={['Fácil', 'Intermedio', 'Difícil']} />
                        </div>

                        <SelectField label="Tipo de Evaluación" name="type" value={formData.type} onChange={handleInputChange}
                            options={['Examen Tradicional', 'Opción Múltiple', 'Rúbrica de Calificación', 'Cuestionario Rápido', 'Ensayo Argumentativo']} />

                        <InputField label="Cantidad de Ítems" icon={<ListCheck size={12} />} name="itemsCount" value={formData.itemsCount} onChange={handleInputChange} placeholder="5" type="number" />

                        {/* Secuencias de referencia */}
                        <SectionSelector
                            title="Secuencias de Referencia"
                            count={userSequences.length}
                            colorClass="brand"
                            items={userSequences.map(s => ({
                                id: s.id,
                                label: s.topic,
                                sublabel: `${s.subject} · ${s.year}`
                            }))}
                            selectedIds={selectedSequences}
                            onToggle={toggleSequence}
                            emptyText="No hay secuencias guardadas aún"
                        />

                        {/* Documentos KB */}
                        <SectionSelector
                            title="Base de Conocimiento (KB)"
                            count={existingDocs.length}
                            colorClass="amber"
                            items={existingDocs.map(d => ({
                                id: d.name,
                                label: d.name,
                                sublabel: d.category || ''
                            }))}
                            selectedIds={selectedDocs}
                            onToggle={toggleDoc}
                            emptyText="Subí archivos a la KB para usarlos aquí"
                        />

                        {/* Botón generar */}
                        <button
                            onClick={generateAssessment}
                            disabled={isGenerating || !formData.subject || !formData.topic}
                            className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-brand-500/25 hover:shadow-brand-500/40 hover:from-brand-700 hover:to-brand-800"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                            {isGenerating ? 'Generando evaluación...' : 'Generar con IA'}
                        </button>

                        {/* Historial */}
                        {savedAssessments.length > 0 && (
                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                                    <span>Historial</span>
                                    <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-[8px]">{savedAssessments.length}</span>
                                </label>
                                <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                                    {savedAssessments.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => handleLoadAssessment(item)}
                                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer group"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-slate-700 truncate uppercase tracking-tight">{item.topic}</p>
                                                <p className="text-[8px] text-slate-400">{item.subject} · {new Date(item.created_at).toLocaleDateString('es-AR')}</p>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteAssessment(e, item.id)}
                                                className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors ml-2 flex-shrink-0"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* ── ÁREA PRINCIPAL ───────────────────────────────── */}
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
                                onClick={handleSave}
                                icon={isSaving ? <Loader2 size={13} className="animate-spin" /> : <CloudUpload size={13} />}
                                label={isSaving ? 'Guardando...' : 'Guardar'}
                                variant="success"
                                disabled={isSaving}
                            />
                            <div className="w-px h-5 bg-slate-200" />
                            <ToolbarBtn
                                onClick={handleExportWord}
                                icon={<FileOutput size={13} />}
                                label="Word"
                                disabled={isExporting}
                            />
                            <ToolbarBtn
                                onClick={handleExportPDF}
                                icon={isExporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                                label="PDF"
                                variant="primary"
                                disabled={isExporting}
                            />
                        </div>
                    )}
                </div>

                {/* Área de contenido */}
                <div className="flex-grow overflow-y-auto p-4 md:p-10 custom-scrollbar flex justify-center items-start">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center gap-5 mt-24 text-center">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center">
                                    <Loader2 size={32} className="animate-spin text-brand-600" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Diseñando Evaluación...</h3>
                                <p className="text-xs text-slate-400 mt-1">Analizando contexto y generando ítems pedagógicos</p>
                            </div>
                        </div>
                    ) : isEditing ? (
                        <div className="w-full max-w-screen-xl animate-scale-up" style={{ height: 'calc(100vh - 10rem)' }}>
                            <RichEditor value={editContent} onChange={setEditContent} />
                        </div>
                    ) : result ? (
                        <div className="w-full max-w-4xl animate-scale-up pb-16">
                            {/* Cabecera del documento */}
                            <div className="document-page">
                                {/* Banda institucional superior */}
                                <div className="flex items-center justify-between mb-8 pb-5 border-b-2 border-brand-700">
                                    <div>
                                        <div className="text-[8px] font-black uppercase tracking-[0.25em] text-brand-600 mb-1">Instrumento de Evaluación</div>
                                        <h1 className="text-xl font-black text-slate-900 leading-tight">{formData.topic || 'Evaluación Académica'}</h1>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">{formData.subject} {formData.year ? `· ${formData.year}` : ''} {formData.type ? `· ${formData.type}` : ''}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-100">
                                            <ClipboardCheck size={11} className="text-brand-600" />
                                            <span className="text-[9px] font-black text-brand-600 uppercase tracking-wider">{formData.difficulty}</span>
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
                                            // Wrapping tables for horizontal scroll
                                            table: ({ children }) => (
                                                <div className="overflow-x-auto my-4 rounded-lg">
                                                    <table>{children}</table>
                                                </div>
                                            ),
                                            // Render YouTube links as cards
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
                            <GraduationCap size={56} className="text-slate-400" />
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Sin Evaluación</h3>
                                <p className="max-w-xs text-xs font-medium text-slate-500 mt-2">Completá los parámetros y hacé clic en "Generar con IA" para crear una evaluación académica a medida.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// ── SectionSelector ─────────────────────────────────────────
const SectionSelector = ({ title, count, colorClass, items, selectedIds, onToggle, emptyText }) => {
    const [open, setOpen] = useState(false);
    const colorMap = {
        brand: 'bg-brand-100 text-brand-600 border-brand-200',
        amber: 'bg-amber-100 text-amber-600 border-amber-200',
    };
    const selectedColor = colorMap[colorClass] || colorMap.brand;

    return (
        <div className="space-y-2 pt-3 border-t border-slate-100">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
            >
                <span>{title}</span>
                <div className="flex items-center gap-1.5">
                    {selectedIds.length > 0 && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${selectedColor}`}>
                            {selectedIds.length}
                        </span>
                    )}
                    <span className={`w-4 h-4 bg-slate-100 rounded text-[8px] font-mono flex items-center justify-center`}>{count}</span>
                    <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {open && (
                <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar p-1 bg-slate-50 rounded-xl border border-slate-100 animate-fade-in">
                    {items.length > 0 ? items.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onToggle(item.id)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left text-[10px] ${
                                selectedIds.includes(item.id)
                                    ? `${selectedColor} border-current`
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            <div className="min-w-0">
                                <div className="font-bold truncate">{item.label}</div>
                                {item.sublabel && <div className="opacity-60 text-[8px]">{item.sublabel}</div>}
                            </div>
                            {selectedIds.includes(item.id)
                                ? <Check size={12} className="flex-shrink-0" />
                                : <div className="w-3 h-3 rounded-full border border-current opacity-30 flex-shrink-0" />
                            }
                        </button>
                    )) : (
                        <p className="text-[10px] text-slate-400 italic p-3 text-center">{emptyText}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AssessmentGenerator;
