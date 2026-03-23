import React, { useState, useEffect } from 'react';
import { sequenceDbService } from '../lib/sequenceDbService';
import { 
    Globe as GlobeIcon, Clock as ClockIcon, Search as SearchIcon, BookOpen as BookOpenIcon, Loader2 as LoaderIcon, 
    User as UserIcon, BookType as BookTypeIcon, ClipboardCheck as ClipboardCheckIcon, LayoutGrid as LayoutGridIcon, 
    List as ListIcon, Filter as FilterIcon, ArrowRight as ArrowRightIcon, Share2 as Share2Icon, Heart as HeartIcon,
    Sparkles as SparklesIcon, GraduationCap as GraduationCapIcon, Award as AwardIcon, Lock as LockIcon
} from 'lucide-react';
import { 
    PremiumButton, PremiumCard, PremiumInput, 
    PremiumToast, PremiumTabs 
} from './shared/PremiumUI';

const ExploreSequences = ({ onLoadSequence, onLoadAssessment }) => {
    const [activeTab, setActiveTab] = useState('secuencias'); // 'secuencias' | 'evaluaciones'
    const [sequences, setSequences] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        loadAllData();
    }, []);

    const showNotif = (type, message, detail) => setNotification({ type, message, detail });

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [seqs, evals] = await Promise.all([
                sequenceDbService.getPublicSequences(),
                sequenceDbService.getPublicAssessments()
            ]);
            setSequences(seqs || []);
            setAssessments(evals || []);
        } catch (error) {
            console.error("Error loading gallery:", error);
            showNotif('error', 'Error de Red', 'No pudimos conectar con la base de datos comunitaria.');
        } finally {
            setLoading(false);
        }
    };

    const currentData = activeTab === 'secuencias' ? sequences : assessments;

    const filteredItems = (currentData || []).filter(item => {
        if (!item) return false;
        const search = (searchTerm || '').toLowerCase();
        const topic = (item.topic || '').toLowerCase();
        const subject = (item.subject || '').toLowerCase();
        return topic.includes(search) || subject.includes(search);
    });

    const tabs = [
        { id: 'secuencias', label: 'Secuencias Didácticas', icon: <BookTypeIcon size={16}/> },
        { id: 'evaluaciones', label: 'Evaluaciones & Test', icon: <ClipboardCheckIcon size={16}/> }
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
            {notification && (
                <PremiumToast 
                    type={notification.type} 
                    message={notification.message} 
                    detail={notification.detail} 
                    onDismiss={() => setNotification(null)} 
                />
            )}

            {/* Hero / Header Section */}
            <div className="relative bg-slate-900 rounded-2xl p-10 md:p-16 overflow-hidden shadow-lg border border-slate-800">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-10 opacity-5 blur-3xl">
                    <GlobeIcon size={400} className="text-brand-400 rotate-12"/>
                </div>
                <div className="absolute bottom-0 left-0 p-10 opacity-5 blur-2xl">
                    <SparklesIcon size={200} className="text-purple-400 -rotate-12"/>
                </div>

                <div className="relative z-10 space-y-8 max-w-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-sm">
                            <GlobeIcon size={24} />
                        </div>
                        <span className="text-[11px] font-black text-brand-400 uppercase tracking-[0.3em]">Comunidad Global</span>
                    </div>
                    
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1]">
                        Explorá el <span className="text-brand-500">Patrimonio Docente</span> de SD Master
                    </h1>
                    
                    <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
                        Descubrí recursos educativos validados por otros profesores de todo el mundo. 
                        Inspirate, adaptá y compartí tus propias creaciones.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <PremiumInput 
                            placeholder="¿Qué tema estás buscando hoy? (Ej: Pitágoras, Células...)" 
                            icon={<SearchIcon size={22}/>}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="!w-full sm:!min-w-[400px] !h-14 !bg-white/10 !border-white/10 !text-white placeholder:text-slate-500 !rounded-xl focus:!bg-white/20"
                        />
                        <div className="flex bg-white/10 p-1 rounded-xl border border-white/5 backdrop-blur-md">
                            <button className="px-6 h-full flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 rounded-lg transition-all">
                                <FilterIcon size={16}/> Filtrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gallery Control */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                <PremiumTabs 
                    tabs={tabs} 
                    activeTab={activeTab} 
                    setActiveTab={setActiveTab} 
                />
                
                <div className="flex items-center gap-6">
                    <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <LayoutGridIcon size={14}/> 
                        <span>Mostrando {filteredItems.length} resultados</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200"></div>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <button className="p-2 text-brand-600 bg-white shadow-sm rounded-lg"><LayoutGridIcon size={18}/></button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><ListIcon size={18}/></button>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute top-0 w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando con la red...</p>
                </div>
            ) : filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 px-4">
                    {filteredItems.map(item => (
                        <PremiumCard 
                            key={item.id} 
                            noPadding 
                            className="group flex flex-col h-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border border-slate-200 hover:border-slate-300"
                        >
                            {/* Card Decoration Top */}
                            <div className={`h-3 p-1 w-full ${activeTab === 'secuencias' ? 'bg-brand-500' : 'bg-purple-500'}`}></div>

                            <div className="p-8 sm:p-10 flex-1 flex flex-col">
                                {/* Header Info */}
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                                            activeTab === 'secuencias' 
                                            ? 'bg-brand-50 border-brand-100 text-brand-700' 
                                            : 'bg-purple-50 border-purple-100 text-purple-700'
                                        }`}>
                                            {item.subject || 'S/M'}
                                        </span>
                                        <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-slate-900 text-white shadow-sm border border-slate-800">
                                            {item.year || 'Nivel Libre'}
                                        </span>
                                    </div>
                                    <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all">
                                        <HeartIcon size={18}/>
                                    </button>
                                </div>

                                {/* Author Profile */}
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 shrink-0">
                                        {item.profiles?.avatar_url ? (
                                            <img src={item.profiles.avatar_url} alt={item.profiles.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={20} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-slate-900 truncate tracking-tight">{item.profiles?.full_name || 'Docente Anónimo'}</p>
                                        <div className="flex items-center gap-1.5 leading-none">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Colaborador</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Body */}
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-[1.2] mb-4 group-hover:text-brand-600 transition-colors line-clamp-2">
                                    {item.topic || 'Tema sin título'}
                                </h3>
                                
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-10 mt-auto pt-6 border-t border-slate-50">
                                    <div className="flex items-center gap-1.5">
                                        <AwardIcon size={14} className="text-amber-500 opacity-70"/>
                                        Recurso Validado
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <ClockIcon size={14}/>
                                        {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <PremiumButton 
                                        onClick={() => activeTab === 'secuencias' ? onLoadSequence(item) : onLoadAssessment(item)}
                                        className="flex-1 !py-3 shadow-sm hover:shadow-md !rounded-xl"
                                        icon={<ArrowRightIcon size={16}/>}
                                        iconPosition="right"
                                    >
                                        Importar Recurso
                                    </PremiumButton>
                                    <button className="w-12 h-12 rounded-xl bg-white text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-slate-600 transition-all border border-slate-200">
                                        <Share2Icon size={18}/>
                                    </button>
                                </div>
                            </div>
                        </PremiumCard>
                    ))}
                </div>
            ) : (
                <div className="py-24 flex flex-col items-center text-center space-y-8 px-6">
                    <div className="relative">
                        <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-slate-200">
                           <GlobeIcon size={48}/>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Expandiendo Fronteras</h3>
                        <p className="text-slate-500 font-medium max-w-sm mx-auto text-lg leading-relaxed">
                            No encontramos resultados para tu búsqueda. Probá con términos más generales o empezá vos la tendencia compartiendo tu material.
                        </p>
                    </div>
                    <PremiumButton variant="secondary" onClick={() => setSearchTerm('')} icon={<LockIcon size={18}/>}>
                        Limpiar Búsqueda
                    </PremiumButton>
                </div>
            )}

            {/* Bottom Call to Action */}
            <div className="px-4 pt-10">
                <div className="bg-brand-500 rounded-2xl p-10 md:p-12 text-center text-white relative overflow-hidden shadow-lg border border-brand-400">
                    <div className="relative z-10 space-y-6">
                        <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-6 backdrop-blur-xl border border-white/20">
                            <GraduationCapIcon size={32} className="text-white" />
                        </div>
                        <h3 className="text-3xl font-black tracking-tight">¿Tenés material increíble para compartir?</h3>
                        <p className="text-white/80 font-medium max-w-lg mx-auto text-base">
                            Ayudá a otros docentes subiendo tus secuencias validadas. Juntos construimos el futuro de la educación con IA.
                        </p>
                        <div className="pt-4">
                            <PremiumButton className="!bg-white !text-brand-600 !py-4 !px-8 !rounded-xl !text-base font-bold shadow-md hover:shadow-lg transition-all" icon={<Share2Icon size={18}/>}>
                                Publicar mi Patrimonio
                            </PremiumButton>
                        </div>
                    </div>
                    
                    {/* Floating elements */}
                    <div className="absolute top-10 left-10 w-24 h-24 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                </div>
            </div>
        </div>
    );
};

export default ExploreSequences;
