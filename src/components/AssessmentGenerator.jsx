import React, { useState, useEffect } from 'react';
import {
    Sparkles, BookType, Loader2, Check, FileDown, Trash2,
    FileText, Edit3, Eye, FileOutput, Database, CloudUpload,
    Lock as LockIcon, Globe, ListCheck, ClipboardCheck, GraduationCap,
    Video, ChevronDown, AlertTriangle, Settings as SettingsIcon, X, 
    History as HistoryIcon, FilePlus, Zap, Info, ArrowRight, Save, Play, Columns
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
import { 
    PremiumButton, PremiumCard, PremiumInput, 
    PremiumToast, PremiumTabs, PremiumModal 
} from './shared/PremiumUI';

const AssessmentGenerator = ({ session, profile, loadedAssessment, clearLoadedAssessment }) => {
    const [formData, setFormData] = useState({
        subject: '', year: '', topic: '',
        type: 'Examen Tradicional', difficulty: 'Intermedio', itemsCount: '5',
        suggestions: '',
    });

    const [existingDocs, setExistingDocs] = useState([]);
    const [userSequences, setUserSequences] = useState([]);
    const [savedAssessments, setSavedAssessments] = useState([]);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [selectedSequences, setSelectedSequences] = useState([]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [result, setResult] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [loadedId, setLoadedId] = useState(null);
    const [notification, setNotification] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showDocsPanel, setShowDocsPanel] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [generationPulse, setGenerationPulse] = useState(0);
    const [collapseConfig, setCollapseConfig] = useState(false);

    // Initial Load
    useEffect(() => {
        loadData();
        const prefs = (() => { try { return JSON.parse(localStorage.getItem('sd_preferences') || '{}'); } catch { return {}; } })();
        setFormData(prev => ({
            ...prev,
            subject: prev.subject || prefs.defaultSubject || '',
            year: prev.year || prefs.defaultYear || '',
            topic: prev.topic || prefs.defaultTopic || '',
        }));
    }, [profile]);

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
    }, [loadedAssessment]);

    const showNotif = (type, message, detail) => setNotification({ type, message, detail });

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

    const handleGenerate = async () => {
        if (!formData.subject || !formData.topic) {
            showNotif('warning', 'Campos Requeridos', 'Materia y Tema son obligatorios.');
            return;
        }
        setIsGenerating(true);
        setResult(null);
        setIsEditing(false);
        
        let pulseInterval = setInterval(() => setGenerationPulse(p => (p + 1) % 100), 50);

        try {
            const sequencesContext = userSequences
                .filter(s => selectedSequences.includes(s.id))
                .map(s => ({ topic: s.topic, content: s.content }));

            const data = await antigravityService.generateAssessment({
                ...formData,
                selectedDocs,
                selectedSequences: sequencesContext,
                defaultContext: profile?.defaultContext,
            });

            if (data.success) {
                setResult(data.content);
                setEditContent(data.content);
                showNotif('success', '¡Evaluación Lista!', 'El examen ha sido diseñado con éxito.');
            }
        } catch (err) {
            showNotif('error', 'Error al Generar', err.message);
        } finally {
            clearInterval(pulseInterval);
            setIsGenerating(false);
            setGenerationPulse(0);
        }
    };

    const confirmCloudSave = async (isPublic) => {
        setIsSaving(true);
        setShowSaveModal(false);
        try {
            const contentToSave = isEditing ? editContent : result;
            const res = await sequenceDbService.saveAssessment({ 
                ...formData, content: contentToSave, id: loadedId 
            }, isPublic);
            if (res.success) {
                if (!loadedId && res.data?.id) setLoadedId(res.data.id);
                showNotif('success', '¡Guardado!', `Evaluación guardada en ${isPublic ? 'la Comunidad' : 'tus Recursos'}.`);
                loadData();
            }
        } catch (err) {
            showNotif('error', 'Error al Guardar', err.message);
        } finally { setIsSaving(false); }
    };

    const Header = (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                        <ClipboardCheck size={18} />
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] leading-none">Evaluación Crítica</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
                    Diseño <span className="text-indigo-600">Académico</span>
                </h1>
                <p className="text-slate-500 font-medium max-w-xl text-lg leading-relaxed">
                    Creá exámenes, rúbricas y proyectos de evaluación con precisión pedagógica.
                </p>
            </div>
            <div className="flex gap-3">
                <PremiumButton variant="secondary" onClick={() => setShowHistory(true)} className="!rounded-2xl !py-3" icon={<HistoryIcon size={18} />}>
                    Guardados
                </PremiumButton>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto animate-fade-in pb-20">
            {notification && <PremiumToast {...notification} onDismiss={() => setNotification(null)} />}
            {Header}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start relative">
                
                {/* Collapse Toggle Button (Floating) */}
                <button 
                    onClick={() => setCollapseConfig(!collapseConfig)}
                    className={`hidden xl:flex absolute top-10 ${collapseConfig ? 'left-0' : 'left-[31%]'} z-30 w-10 h-10 bg-white border border-slate-100 rounded-full shadow-xl items-center justify-center text-slate-400 hover:text-indigo-600 hover:scale-110 transition-all`}
                    title={collapseConfig ? "Expandir Configuración" : "Colapsar Configuración"}
                >
                    {collapseConfig ? <ArrowRight size={18} /> : <Columns size={18} />}
                </button>

                {/* Left Column: Config */}
                <div className={`xl:col-span-4 space-y-8 transition-all duration-500 ${collapseConfig ? 'xl:hidden' : 'xl:block'}`}>
                    <PremiumCard title="Parámetros de Evaluación" icon={<SettingsIcon size={18}/>}>
                        <div className="space-y-6">
                            <PremiumInput label="Materia / Nivel" name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Ej: Biología Celular" icon={<GraduationCap size={14}/>} />
                            <PremiumInput label="Tema Principal" name="topic" value={formData.topic} onChange={handleInputChange} placeholder="Ej: Mitosis y Meiosis" icon={<BookType size={14}/>} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Año/Nivel</label>
                                    <select name="year" value={formData.year} onChange={handleInputChange}
                                        className="w-full h-12 pl-4 pr-10 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all appearance-none cursor-pointer shadow-sm">
                                        {['', '1° Año', '2° Año', '3° Año', '4° Año', '5° Año', '6° Año'].map(o => <option key={o} value={o}>{o || 'Seleccionar'}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dificultad</label>
                                    <select name="difficulty" value={formData.difficulty} onChange={handleInputChange}
                                        className="w-full h-12 pl-4 pr-10 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all appearance-none cursor-pointer shadow-sm">
                                        {['Fácil', 'Intermedio', 'Difícil'].map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Formato de Salida</label>
                                <select name="type" value={formData.type} onChange={handleInputChange}
                                    className="w-full h-12 pl-4 pr-10 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all appearance-none cursor-pointer shadow-sm">
                                    {['Examen Tradicional', 'Opción Múltiple', 'Rúbrica Detallada', 'Desafío Práctico', 'Cuestionario Rápido'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>

                            <PremiumInput label="Número de Ítems / Preguntas" name="itemsCount" value={formData.itemsCount} onChange={handleInputChange} type="number" icon={<ListCheck size={14}/>} />

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Instrucciones Adicionales</label>
                                <textarea
                                    name="suggestions"
                                    value={formData.suggestions}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full p-4 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all resize-none text-sm shadow-sm"
                                    placeholder="Ej: Incluir preguntas sobre el contexto local..."
                                />
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <PremiumButton 
                                    variant="primary" 
                                    className="w-full !rounded-xl !py-4 active:scale-95 !bg-indigo-600 hover:!bg-indigo-700" 
                                    onClick={handleGenerate}
                                    loading={isGenerating}
                                    icon={<Sparkles size={20} />}
                                >
                                    Diseñar Evaluación
                                </PremiumButton>
                            </div>
                        </div>
                    </PremiumCard>

                    {/* Context Management Card */}
                    <PremiumCard title="Contexto Institucional" icon={<Database size={18}/>} noPadding>
                        <div className="p-6 space-y-6">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 font-medium leading-relaxed">
                                <p className="mb-1 font-black text-slate-900 uppercase tracking-widest">Fuentes de Verdad:</p>
                                Vinculá tus <span className="font-bold">Secuencias Previas</span> o documentos de la <span className="font-bold">Memoria</span> para alinear el examen a lo enseñado.
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Secuencias ({selectedSequences.length})</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Memoria ({selectedDocs.length})</p>
                                    </div>
                                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden flex">
                                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(selectedSequences.length / (selectedSequences.length + selectedDocs.length || 1)) * 100}%` }}></div>
                                        <div className="flex-grow h-full bg-amber-400 transition-all duration-500"></div>
                                    </div>
                                </div>
                                <PremiumButton 
                                    variant="secondary" 
                                    className="w-full !rounded-2xl !py-3 !text-[10px] !tracking-widest !uppercase !font-black"
                                    onClick={() => setShowDocsPanel(true)}
                                >
                                    Gestionar Contexto
                                </PremiumButton>

                                {(selectedDocs.length > 0 || selectedSequences.length > 0) && (
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contexto Activo</p>
                                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                            {selectedSequences.map(id => {
                                                const seq = userSequences.find(s => s.id === id);
                                                return (
                                                    <div key={id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg group transition-all hover:border-slate-300">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <FilePlus size={14} className="text-indigo-500 flex-shrink-0" />
                                                            <p className="text-[11px] font-bold text-slate-700 truncate">{seq?.topic || 'Secuencia'}</p>
                                                        </div>
                                                        <button onClick={() => setSelectedSequences(prev => prev.filter(x => x !== id))} className="text-slate-300 hover:text-rose-500">
                                                            <X size={14}/>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            {selectedDocs.map(name => {
                                                const doc = existingDocs.find(d => d.name === name);
                                                return (
                                                    <div key={name} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg group transition-all hover:border-slate-300">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <FileText size={14} className="text-amber-500 flex-shrink-0" />
                                                            <p className="text-[11px] font-bold text-slate-700 truncate">{doc?.name || 'Documento'}</p>
                                                        </div>
                                                        <button onClick={() => setSelectedDocs(prev => prev.filter(x => x !== name))} className="text-slate-300 hover:text-rose-500">
                                                            <X size={14}/>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </PremiumCard>
                </div>

                {/* Right Column: Editor */}
                <div className={`${collapseConfig ? 'xl:col-span-12' : 'xl:col-span-8'} flex flex-col h-full transition-all duration-500`}>
                    {isGenerating ? (
                        <div className="flex-grow min-h-[600px] flex flex-col items-center justify-center text-center p-12 bg-white border border-slate-200 rounded-2xl relative overflow-hidden shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 text-slate-900 border border-slate-100 rounded-xl flex items-center justify-center mb-8 relative z-10 animate-pulse">
                                <ClipboardCheck size={36} />
                            </div>
                            <div className="space-y-4 relative z-10 max-w-sm">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Diseñando Evaluación...</h3>
                                <p className="text-slate-500 font-medium">Sincronizando con tus secuencias y documentos para garantizar alineación académica.</p>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-6">
                                    <div className="h-full bg-slate-900 transition-all duration-300" style={{ width: `${generationPulse}%` }} />
                                </div>
                            </div>
                        </div>
                    ) : result ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
                            <div className="flex flex-wrap items-center justify-between gap-4 px-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                                        <Check size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-none">Evaluación Creada</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Personalizá y Exportá en un clic</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PremiumButton variant="secondary" size="sm" onClick={() => isEditing ? exitEditMode() : setIsEditing(true)} icon={isEditing ? <Check size={16}/> : <Edit3 size={16}/>}>
                                        {isEditing ? 'Finalizar' : 'Editar'}
                                    </PremiumButton>
                                    <div className="w-px h-8 bg-slate-200 mx-2"></div>
                                    <PremiumButton variant="secondary" size="sm" onClick={() => exportToPDF(getActiveContent(), formData)} icon={<FileDown size={16}/>}>PDF</PremiumButton>
                                    <PremiumButton variant="primary" size="sm" onClick={() => setShowSaveModal(true)} icon={<Save size={16}/>} className="!bg-indigo-600 hover:!bg-indigo-700">Guardar</PremiumButton>
                                </div>
                            </div>

                            <div className="p-8 sm:p-12 bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[700px]">
                                {isEditing ? (
                                    <RichEditor value={editContent} onChange={setEditContent} />
                                ) : (
                                    <div className="academic-preview prose prose-slate max-w-none">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm, remarkMath]} 
                                            rehypePlugins={[rehypeKatex, rehypeRaw]}
                                        >
                                            {result}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow min-h-[600px] flex flex-col items-center justify-center text-center p-12 bg-slate-50 border border-slate-200 border-dashed rounded-2xl opacity-60 hover:opacity-100 transition-all group">
                            <div className="w-20 h-20 bg-white text-slate-300 rounded-xl border border-slate-200 flex items-center justify-center mb-6 group-hover:text-slate-900 shadow-sm transition-colors duration-300">
                                <Play size={32} className="ml-1 fill-current"/>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">Esperando configuración</h3>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed max-w-[280px] mt-4">
                                Definí los temas y el tipo de evaluación <br/> para ver los resultados mágicos.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Panel Modal */}
            {showDocsPanel && (
                <PremiumModal isOpen={showDocsPanel} onClose={() => setShowDocsPanel(false)} title="Centro de Contexto">
                    <div className="space-y-8">
                        <PremiumTabs 
                            tabs={[
                                { id: 'seqs', label: 'Mis Secuencias', icon: <FilePlus size={16}/> },
                                { id: 'docs', label: 'Memoria KB', icon: <Database size={16}/> }
                            ]}
                            activeTab={null} // Controlled by internal logic if needed, but let's keep it simple
                            defaultTab="seqs"
                        >
                            {(activeTab) => (
                                <div className="mt-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                    {activeTab === 'seqs' ? (
                                        <div className="space-y-2">
                                            {userSequences.length === 0 ? (
                                                <p className="text-center py-10 text-xs text-slate-400 font-bold uppercase tracking-widest">No hay secuencias creadas</p>
                                            ) : (
                                                userSequences.map(s => (
                                                    <button key={s.id} onClick={() => setSelectedSequences(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${selectedSequences.includes(s.id) ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-white'}`}>
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedSequences.includes(s.id) ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                                                            {selectedSequences.includes(s.id) ? <Check size={20}/> : <FilePlus size={20}/>}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 truncate max-w-[200px]">{s.topic}</p>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.subject}</p>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                             {existingDocs.filter(d => d.category?.toLowerCase() !== 'plantilla').length === 0 ? (
                                                <p className="text-center py-10 text-xs text-slate-400 font-bold uppercase tracking-widest">No hay documentos cargados</p>
                                            ) : (
                                                existingDocs.filter(d => d.category?.toLowerCase() !== 'plantilla').map(doc => (
                                                    <button key={doc.name} onClick={() => setSelectedDocs(p => p.includes(doc.name) ? p.filter(x => x !== doc.name) : [...p, doc.name])}
                                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${selectedDocs.includes(doc.name) ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-white'}`}>
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedDocs.includes(doc.name) ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                                                            {selectedDocs.includes(doc.name) ? <Check size={20}/> : <FileText size={20}/>}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 truncate max-w-[200px]">{doc.name}</p>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{doc.category || 'Información'}</p>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </PremiumTabs>
                        <PremiumButton onClick={() => setShowDocsPanel(false)} className="w-full !rounded-2xl !py-4 bg-slate-900">Confirmar Contexto</PremiumButton>
                    </div>
                </PremiumModal>
            )}

            {/* History Modal */}
            {showHistory && (
                <PremiumModal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Evaluaciones Guardadas">
                    <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {savedAssessments.length === 0 ? (
                            <div className="text-center py-20 opacity-30">
                                <HistoryIcon size={48} className="mx-auto mb-4" />
                                <p className="text-sm font-black uppercase tracking-widest">Sin registros</p>
                            </div>
                        ) : (
                            savedAssessments.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => handleLoadAssessment(item)}
                                    className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-900 cursor-pointer group transition-all relative overflow-hidden shadow-sm"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[9px] font-black text-slate-500 tracking-widest">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="text-base font-black text-slate-900 transition-colors">{item.topic}</h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{item.subject} &bull; {item.type}</p>
                                    <div className="absolute top-1/2 right-6 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <button onClick={(e) => { e.stopPropagation(); sequenceDbService.deleteAssessment(item.id).then(() => loadData()); }} className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                                            <Trash2 size={20}/>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </PremiumModal>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <PremiumModal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} title="Guardar Evaluación">
                    <div className="space-y-8 py-4">
                        <div className="grid grid-cols-1 gap-4">
                             <button onClick={() => confirmCloudSave(false)} className="flex items-center gap-5 p-6 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group">
                                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white shadow-xl shadow-indigo-500/0 group-hover:shadow-indigo-500/20 transition-all">
                                    <LockIcon size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-black text-slate-900 leading-none">Mi Recursos</p>
                                    <p className="text-xs font-medium text-slate-400">Privado y seguro.</p>
                                </div>
                             </button>
                             <button onClick={() => confirmCloudSave(true)} className="flex items-center gap-5 p-6 rounded-[2.5rem] border-2 border-indigo-100 bg-indigo-50 hover:bg-white hover:border-indigo-500 transition-all text-left group">
                                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:rotate-12 transition-all">
                                    <Globe size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-black text-indigo-700 leading-none">Comunidad</p>
                                    <p className="text-xs font-medium text-indigo-500">Inspirá a otros docentes.</p>
                                </div>
                             </button>
                        </div>
                    </div>
                </PremiumModal>
            )}
        </div>
    );
};

export default AssessmentGenerator;
