import React, { useState, useEffect } from 'react';
import {
    Sparkles, BookType, Calendar, Clock, Loader2, Check,
    FileDown, Trash2, ChevronRight, ChevronDown,
    Video, Edit3, Eye, FileOutput, MessageSquare, Database,
    CloudUpload, Lock as LockIcon, Globe, AlertTriangle, Columns, FileText, 
    Settings as SettingsIcon, X, Info, Zap, ArrowRight, Save, Play, History as HistoryIcon
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

const SequenceGenerator = ({ session, profile, loadedSequence, clearLoadedSequence }) => {
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

    const [result, setResult] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [notification, setNotification] = useState(null);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [loadedId, setLoadedId] = useState(null);
    const [generationPulse, setGenerationPulse] = useState(0);
    const [collapseConfig, setCollapseConfig] = useState(false);

    // Initial Load
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
    }, [loadedSequence]);

    const showNotif = (type, message, detail) => setNotification({ type, message, detail });

    const loadIndexedDocs = async () => {
        const docs = await ragService.fetchUniqueDocuments();
        setExistingDocs(docs || []);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleGenerate = async (e) => {
        if (e) e.preventDefault();
        if (!formData.subject || !formData.topic) {
            showNotif('warning', 'Campos Requeridos', 'Materia y Tema son obligatorios.');
            return;
        }
        setIsGenerating(true);
        setResult(null);
        setIsEditing(false);
        
        let pulseInterval = setInterval(() => setGenerationPulse(p => (p + 1) % 100), 50);

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
            }, ...prev].slice(0, 10));
            showNotif('success', '¡Secuencia Lista!', 'Tu contenido ha sido generado con éxito.');
        } catch (err) {
            showNotif('error', 'Fallo en la Generación', err.message || 'Error inesperado.');
        } finally {
            clearInterval(pulseInterval);
            setIsGenerating(false);
            setGenerationPulse(0);
        }
    };

    const confirmCloudSave = async (isPublic) => {
        setIsSavingCloud(true);
        setShowSaveModal(false);
        try {
            const finalContent = isEditing ? editContent : result;
            const res = await sequenceDbService.saveSequence({
                ...formData, content: finalContent, id: loadedId
            }, isPublic);
            if (!loadedId && res.data?.id) setLoadedId(res.data.id);
            showNotif('success', '¡Guardado!', `Secuencia disponible en ${isPublic ? 'Comunidad' : 'tus Recursos'}.`);
        } catch (err) {
            showNotif('error', 'Error al Guardar', err.message);
        } finally { setIsSavingCloud(false); }
    };

    const Header = (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/20">
                        <Sparkles size={18} />
                    </div>
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.3em] leading-none">Pedagogía IA</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
                    Generador <span className="text-brand-600">Pro</span>
                </h1>
                <p className="text-slate-500 font-medium max-w-xl text-lg leading-relaxed">
                    Transformá tus ideas en secuencias didácticas completas y estructuradas.
                </p>
            </div>
            <div className="flex gap-3">
                <PremiumButton variant="secondary" onClick={() => setShowHistory(true)} className="!rounded-2xl !py-3" icon={<HistoryIcon size={18} />}>
                    Historial
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
                    className={`hidden xl:flex absolute top-10 ${collapseConfig ? 'left-0' : 'left-[31%]'} z-30 w-10 h-10 bg-white border border-slate-100 rounded-full shadow-xl items-center justify-center text-slate-400 hover:text-brand-600 hover:scale-110 transition-all`}
                    title={collapseConfig ? "Expandir Configuración" : "Colapsar Configuración"}
                >
                    {collapseConfig ? <ArrowRight size={18} /> : <Columns size={18} />}
                </button>

                {/* Left Column: Form & Config */}
                <div className={`xl:col-span-4 space-y-8 transition-all duration-500 ${collapseConfig ? 'xl:hidden' : 'xl:block'}`}>
                    <PremiumCard title="Configuración de Clase" icon={<SettingsIcon size={18}/>}>
                        <div className="space-y-6">
                            <PremiumInput label="Materia / Asignatura" name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Ej: Introducción a la Física" icon={<BookType size={14}/>} />
                            <div className="grid grid-cols-2 gap-4">
                                <PremiumInput label="Año / Curso" name="year" value={formData.year} onChange={handleInputChange} placeholder="Ej: 4to Año" icon={<Calendar size={14}/>} />
                                <PremiumInput label="Duración Estimada" name="duration" value={formData.duration} onChange={handleInputChange} placeholder="Ej: 80 min" icon={<Clock size={14}/>} />
                            </div>
                            <PremiumInput label="Eje Temático / Tema" name="topic" value={formData.topic} onChange={handleInputChange} placeholder="Ej: Ley de Newton" icon={<Zap size={14}/>} />
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Estructura Pedagógica</label>
                                <select 
                                    name="structure" 
                                    value={formData.structure} 
                                    onChange={handleInputChange}
                                    className="w-full h-14 pl-5 pr-10 bg-slate-50 border-2 border-transparent rounded-[1.25rem] text-slate-800 font-bold focus:bg-white focus:border-brand-500 focus:outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {['Tradicional', 'ABP (Proyectos)', 'Flipped Classroom', 'Gamificación', 'Taller Experimental'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Plantilla Base (Opcional)</label>
                                <select 
                                    name="templateSource" 
                                    value={formData.templateSource} 
                                    onChange={handleInputChange}
                                    className="w-full h-14 pl-5 pr-10 bg-slate-50 border-2 border-transparent rounded-[1.25rem] text-slate-800 font-bold focus:bg-white focus:border-brand-500 focus:outline-none transition-all appearance-none cursor-pointer text-sm"
                                >
                                    <option value="None">Sin plantilla específica</option>
                                    <optgroup label="Plantillas del Sistema">
                                        <option value="Diseño Inverso">Diseño Inverso (Wiggins & McTighe)</option>
                                        <option value="Modelo 5E">Modelo 5E (Engage, Explore...)</option>
                                        <option value="Merrill">Principios de Merrill</option>
                                    </optgroup>
                                    {existingDocs.filter(d => d.category?.toLowerCase() === 'plantilla').length > 0 && (
                                        <optgroup label="Mis Plantillas (Base de Saber)">
                                            {existingDocs.filter(d => d.category?.toLowerCase() === 'plantilla').map(doc => (
                                                <option key={doc.name} value={doc.name}>{doc.name}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-brand-100 transition-all">
                                <span className="text-xs font-bold text-slate-700">Incluir Sugerencias Multimedia</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="includeMedia" checked={formData.includeMedia} onChange={handleInputChange} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                </label>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Instrucciones Adicionales</label>
                                <textarea
                                    name="suggestions"
                                    value={formData.suggestions}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-[1.25rem] text-slate-800 font-medium focus:bg-white focus:border-brand-500 focus:outline-none transition-all resize-none text-sm"
                                    placeholder="Ej: Incluir debate grupal al inicio..."
                                />
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <PremiumButton 
                                    variant="primary" 
                                    className="w-full !rounded-[2rem] !py-5 shadow-2xl shadow-brand-500/20 active:scale-95" 
                                    onClick={handleGenerate}
                                    loading={isGenerating}
                                    icon={<Sparkles size={20} />}
                                >
                                    Generar Contenido
                                </PremiumButton>
                            </div>
                        </div>
                    </PremiumCard>

                    {/* Context Management Card */}
                    <PremiumCard title="Fuentes de Consulta" icon={<Database size={18}/>} noPadding>
                        <div className="p-8 space-y-6">
                            <div className="p-4 bg-slate-900 rounded-2xl text-[10px] text-white/60 font-medium leading-relaxed">
                                <p className="mb-2 font-black text-brand-400 uppercase tracking-widest">Memoria de RAG:</p>
                                Seleccioná materiales de tu <span className="text-white">Base de Saber</span> para que la IA los use como referencia exclusiva.
                            </div>
                            
                            <div className="space-y-3">
                                {selectedDocs.length === 0 ? (
                                    <div className="py-8 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-center px-6">
                                        <Database size={24} className="text-slate-200 mb-2" />
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin fuentes vinculadas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedDocs.map(name => {
                                            const doc = existingDocs.find(d => d.name === name);
                                            return (
                                                <div key={name} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:border-brand-200">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <FileText size={16} className="text-brand-500 flex-shrink-0" />
                                                        <p className="text-xs font-black text-slate-700 truncate">{doc?.name || 'Documento'}</p>
                                                    </div>
                                                    <button onClick={() => setSelectedDocs(prev => prev.filter(x => x !== name))} className="text-slate-300 hover:text-rose-500 p-1">
                                                        <X size={16}/>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <PremiumButton 
                                    variant="secondary" 
                                    className="w-full !rounded-2xl !py-3 !text-[10px] !tracking-widest !uppercase !font-black"
                                    onClick={() => setIsDocsOpen(true)}
                                >
                                    Vincular Conocimiento
                                </PremiumButton>
                            </div>
                        </div>
                    </PremiumCard>
                </div>

                {/* Right Column: Result / Editor */}
                <div className={`${collapseConfig ? 'xl:col-span-12' : 'xl:col-span-8'} flex flex-col h-full transition-all duration-500`}>
                    {isGenerating ? (
                        <div className="flex-grow min-h-[600px] flex flex-col items-center justify-center text-center p-12 bg-white border-2 border-brand-50 rounded-[3.5rem] relative overflow-hidden">
                            <div className="w-24 h-24 bg-brand-50 text-brand-600 rounded-[2.5rem] flex items-center justify-center mb-8 relative z-10 animate-pulse">
                                <Sparkles size={48} />
                            </div>
                            <div className="space-y-4 relative z-10 max-w-sm">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Consultando tu Cerebro...</h3>
                                <p className="text-slate-400 font-medium">La IA está procesando tus fuentes y estructurando la secuencia pedagógica perfecta.</p>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-6">
                                    <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${generationPulse}%` }} />
                                </div>
                            </div>
                            {/* Background decoration */}
                            <div className="absolute inset-0 border-[20px] border-brand-50/20 rounded-[3rem] animate-ping opacity-20 pointer-events-none"></div>
                        </div>
                    ) : result ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
                            <div className="flex flex-wrap items-center justify-between gap-4 px-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                                        <Check size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-none">Secuencia Generada</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Listo para exportar o editar</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PremiumButton variant="secondary" size="sm" onClick={() => isEditing ? exitEditMode() : setIsEditing(true)} icon={isEditing ? <Check size={16}/> : <Edit3 size={16}/>}>
                                        {isEditing ? 'Finalizar' : 'Editar'}
                                    </PremiumButton>
                                    <div className="w-px h-8 bg-slate-200 mx-2"></div>
                                    <PremiumButton variant="secondary" size="sm" onClick={() => exportToPDF(getActiveContent(), formData)} icon={<FileDown size={16}/>}>PDF</PremiumButton>
                                    <PremiumButton variant="primary" size="sm" onClick={() => setShowSaveModal(true)} icon={<Save size={16}/>}>Guardar</PremiumButton>
                                </div>
                            </div>

                            <div className="p-10 sm:p-14 bg-white border border-slate-100 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 min-h-[700px]">
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
                        <div className="flex-grow min-h-[600px] flex flex-col items-center justify-center text-center p-12 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3.5rem] opacity-40 hover:opacity-100 transition-all group">
                            <div className="w-24 h-24 bg-white text-slate-200 rounded-[2.5rem] border-2 border-slate-100 flex items-center justify-center mb-8 group-hover:text-brand-500 group-hover:scale-110 shadow-sm transition-all duration-700">
                                <Play size={40} className="ml-2 fill-current"/>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none group-hover:text-brand-600 transition-colors">Esperando configuración</h3>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed max-w-[280px] mt-4">
                                Completá los campos de la izquierda <br/> y dale vida a tu próxima clase.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Selection Panel Modal */}
            {isDocsOpen && (
                <PremiumModal 
                    isOpen={isDocsOpen} 
                    onClose={() => setIsDocsOpen(false)}
                    title="Memoria Institucional"
                >
                    <div className="space-y-6">
                        <p className="text-sm text-slate-500 font-medium">Vinculá documentos específicos para que la IA se base exclusivamente en ellos.</p>
                        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {existingDocs.filter(d => d.category?.toLowerCase() !== 'plantilla').map(doc => (
                                <button 
                                    key={doc.name}
                                    onClick={() => setSelectedDocs(prev => prev.includes(doc.name) ? prev.filter(x => x !== doc.name) : [...prev, doc.name])}
                                    className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left ${selectedDocs.includes(doc.name) ? 'border-brand-500 bg-brand-50 shadow-lg shadow-brand-500/5' : 'border-slate-50 hover:border-brand-200'}`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedDocs.includes(doc.name) ? 'bg-brand-600 text-white shadow-xl shadow-brand-500/20' : 'bg-slate-50 text-slate-300'}`}>
                                        {selectedDocs.includes(doc.name) ? <Check size={24}/> : <FileText size={24}/>}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 truncate max-w-[200px]">{doc.name}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{doc.category || 'Información'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <PremiumButton onClick={() => setIsDocsOpen(false)} className="w-full !rounded-2xl !py-4">Vincular Selección</PremiumButton>
                    </div>
                </PremiumModal>
            )}

            {/* History Panel */}
            {showHistory && (
                <PremiumModal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Historial Local">
                    <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {history.length === 0 ? (
                            <div className="text-center py-20 opacity-30">
                                <HistoryIcon size={48} className="mx-auto mb-4" />
                                <p className="text-sm font-black uppercase tracking-widest">Sin registros</p>
                            </div>
                        ) : (
                            history.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => {
                                        setFormData(item.params);
                                        setResult(item.content);
                                        setEditContent(item.content);
                                        setIsEditing(false);
                                        setShowHistory(false);
                                    }}
                                    className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-brand-500 cursor-pointer group transition-all relative overflow-hidden"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-400 tracking-widest">{item.date}</span>
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 group-hover:text-brand-600 transition-colors">{item.params.topic}</h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{item.params.subject} &bull; {item.params.year}</p>
                                    <div className="absolute top-1/2 right-6 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <button onClick={(e) => { e.stopPropagation(); setHistory(h => h.filter(prev => prev.id !== item.id)); }} className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                                            <Trash2 size={20}/>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </PremiumModal>
            )}

            {/* Public/Private Save Modal */}
            {showSaveModal && (
                <PremiumModal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} title="Guardar Recursos">
                    <div className="space-y-8 py-4">
                        <div className="grid grid-cols-1 gap-4">
                             <button onClick={() => confirmCloudSave(false)} className="flex items-center gap-5 p-6 rounded-[2.5rem] border-2 border-slate-100 hover:border-brand-500 hover:bg-brand-50 transition-all text-left group">
                                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white shadow-xl shadow-brand-500/0 group-hover:shadow-brand-500/20 transition-all">
                                    <LockIcon size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-black text-slate-900 leading-none">Mi Recursos</p>
                                    <p className="text-xs font-medium text-slate-400">Sólo vos podés ver esto.</p>
                                </div>
                             </button>
                             <button onClick={() => confirmCloudSave(true)} className="flex items-center gap-5 p-6 rounded-[2.5rem] border-2 border-brand-100 bg-brand-50 hover:bg-white hover:border-brand-500 transition-all text-left group">
                                <div className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/20 group-hover:rotate-12 transition-all">
                                    <Globe size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-black text-brand-700 leading-none">Comunidad</p>
                                    <p className="text-xs font-medium text-brand-500">Compartir con otros docentes.</p>
                                </div>
                             </button>
                        </div>
                    </div>
                </PremiumModal>
            )}
        </div>
    );
};

export default SequenceGenerator;
