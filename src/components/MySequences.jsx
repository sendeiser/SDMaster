import React, { useState, useEffect } from 'react';
import { sequenceDbService } from '../lib/sequenceDbService';
import { 
    FolderHeart, Clock, Search as SearchIcon, BookOpen, Loader2, Trash2, 
    Globe as GlobeIcon, Lock as LockIcon, ClipboardCheck, Users, Calendar, X, 
    Filter, LayoutGrid, List, MoreVertical, Share2,
    Eye, Edit3, Trash, AlertCircle, ChevronRight
} from 'lucide-react';
import { 
    PremiumButton, PremiumCard, PremiumInput, 
    PremiumToast, PremiumTabs, PremiumModal 
} from './shared/PremiumUI';

const MySequences = ({ session, onLoadSequence, onLoadAssessment }) => {
    const [activeTab, setActiveTab] = useState('secuencias'); // 'secuencias' | 'evaluaciones'
    const [sequences, setSequences] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState(null);
    const [notification, setNotification] = useState(null);

    // Modal Asignación
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [itemToAssign, setItemToAssign] = useState(null);
    const [classrooms, setClassrooms] = useState([]);
    const [selectedClassroom, setSelectedClassroom] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

    useEffect(() => {
        if (session) {
            loadAllData();
        } else {
            setLoading(false);
        }
    }, [session]);

    const showNotif = (type, message, detail) => setNotification({ type, message, detail });

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [seqs, evals] = await Promise.all([
                sequenceDbService.getUserSequences(),
                sequenceDbService.getUserAssessments()
            ]);
            setSequences(seqs || []);
            setAssessments(evals || []);
        } catch (error) {
            console.error("Error loading repository:", error);
            showNotif('error', 'Error de Carga', 'No pudimos sincronizar tu repositorio personal.');
        } finally {
            setLoading(false);
        }
    };

    const openAssignModal = async (item, e) => {
        if (e) e.stopPropagation();
        setItemToAssign(item);
        setIsAssignModalOpen(true);
        try {
            const rooms = await sequenceDbService.getTeacherClassrooms();
            setClassrooms(rooms || []);
        } catch (error) {
            console.error("Error loading classrooms:", error);
        }
    };

    const handleAssign = async (e) => {
        if (e) e.preventDefault();
        if (!selectedClassroom || !itemToAssign) return;

        setIsAssigning(true);
        try {
            const itemType = activeTab === 'secuencias' ? 'sequence' : 'assessment';
            let finalDueDate = null;
            if (dueDate) finalDueDate = new Date(dueDate).toISOString();

            await sequenceDbService.assignToClassroom(selectedClassroom, itemToAssign, itemType, finalDueDate);
            showNotif('success', '¡Asignado!', `"${itemToAssign.topic}" ya está disponible en el aula seleccionada.`);
            setIsAssignModalOpen(false);
            setDueDate('');
            setSelectedClassroom('');
        } catch (error) {
            showNotif('error', 'Error al asignar', error.message);
        } finally {
            setIsAssigning(false);
            setItemToAssign(null);
        }
    };

    const handleDelete = async (id, e) => {
        if (e) e.stopPropagation();
        // Standard confirm for now, maybe PremiumModal later
        if (!window.confirm(`¿Seguro que deseas eliminar esta ${activeTab === 'secuencias' ? 'secuencia' : 'evaluación'} permanentemente?`)) return;

        setIsDeleting(id);
        try {
            if (activeTab === 'secuencias') {
                await sequenceDbService.deleteSequence(id);
                setSequences(prev => prev.filter(item => item.id !== id));
            } else {
                await sequenceDbService.deleteAssessment(id);
                setAssessments(prev => prev.filter(item => item.id !== id));
            }
            showNotif('success', 'Eliminado', 'El item ha sido removido de tu repositorio.');
        } catch (error) {
            showNotif('error', 'Error al eliminar', error.message);
        } finally {
            setIsDeleting(null);
        }
    };

    const toggleVisibility = async (id, currentVisibility, e) => {
        if (e) e.stopPropagation();
        try {
            if (activeTab === 'secuencias') {
                await sequenceDbService.toggleVisibility(id, !currentVisibility);
                setSequences(prev => prev.map(seq =>
                    seq.id === id ? { ...seq, is_public: !currentVisibility } : seq
                ));
            } else {
                await sequenceDbService.toggleAssessmentVisibility(id, !currentVisibility);
                setAssessments(prev => prev.map(evalu =>
                    evalu.id === id ? { ...evalu, is_public: !currentVisibility } : evalu
                ));
            }
            showNotif('info', 'Visibilidad Actualizada', `Ahora tu contenido es ${!currentVisibility ? 'Público' : 'Privado'}.`);
        } catch (error) {
            showNotif('error', 'Error', 'No se pudo cambiar la visibilidad.');
        }
    };

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-fade-in">
                <div className="w-20 h-20 bg-slate-50 text-slate-300 border border-slate-200 rounded-xl flex items-center justify-center mb-6">
                    <LockIcon size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Acceso Privado</h2>
                <p className="text-slate-500 font-medium mt-4 max-w-sm mx-auto leading-relaxed">
                    Inicia sesión para gestionar tus propias secuencias didácticas y evaluaciones. 
                    Tus creaciones son seguras y siempre accesibles para vos.
                </p>
                <PremiumButton onClick={() => window.location.reload()} className="mt-8 !rounded-xl">
                    Volver al Inicio
                </PremiumButton>
            </div>
        );
    }

    const currentData = activeTab === 'secuencias' ? sequences : assessments;

    const filteredItems = currentData.filter(item =>
        (item.topic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const tabs = [
        { id: 'secuencias', label: 'Secuencias Didácticas', icon: <FolderHeart size={16}/> },
        { id: 'evaluaciones', label: 'Evaluaciones & Test', icon: <ClipboardCheck size={16}/> }
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

            {/* Header / Intro */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                            <FolderHeart size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Repositorio Personal</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Mi Patrimonio <span className="text-brand-600">Académico</span></h1>
                    <p className="text-slate-500 font-medium mt-2 max-w-xl">
                        Gestiona, organiza y despliega tu contenido directamente a tus aulas. 
                        Decí qué materiales querés compartir con la comunidad global.
                    </p>
                </div>

                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
                    <PremiumInput 
                        placeholder="Buscar por tema..." 
                        icon={<SearchIcon size={16}/>}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="!w-full sm:!w-72"
                    />
                </div>
            </div>

            {/* Tabs Control */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-4">
                <PremiumTabs 
                    tabs={tabs} 
                    activeTab={activeTab} 
                    setActiveTab={setActiveTab} 
                />
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <button className="p-2 text-brand-600 bg-white shadow-sm rounded-lg"><LayoutGrid size={18}/></button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><List size={18}/></button>
                </div>
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-6">
                    <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando archivos...</p>
                </div>
            ) : filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredItems.map(item => (
                        <PremiumCard 
                            key={item.id} 
                            noPadding 
                            className="group flex flex-col h-full hover:shadow-lg transition-all duration-300 border border-slate-200 hover:border-slate-300"
                        >
                            {/* Card Header Illustration-ish */}
                            <div className={`h-20 w-full relative overflow-hidden transition-all duration-300 ${
                                activeTab === 'secuencias' ? 'bg-slate-50 border-b border-slate-100' : 'bg-slate-50 border-b border-slate-100'
                            }`}>
                                <div className="absolute top-4 left-6 flex items-center gap-2">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm ${
                                        activeTab === 'secuencias' ? 'bg-white text-brand-700' : 'bg-white text-purple-700'
                                    }`}>
                                        {item.subject || 'S/M'}
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-slate-900 text-white shadow-sm">
                                        {item.year || 'CURSO'}
                                    </span>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                                    {activeTab === 'secuencias' ? <FolderHeart size={100}/> : <ClipboardCheck size={100}/>}
                                </div>
                            </div>

                            <div className="p-8 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug mb-3 group-hover:text-brand-600 transition-colors line-clamp-2">
                                    {item.topic || 'Sin título'}
                                </h3>
                                
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-8 mt-auto pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} className="opacity-50"/>
                                        {new Date(item.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${item.is_public ? 'text-emerald-500' : 'text-slate-300'}`}>
                                        {item.is_public ? <GlobeIcon size={14}/> : <LockIcon size={14}/>}
                                        {item.is_public ? 'Público' : 'Solo Yo'}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <PremiumButton 
                                        onClick={() => activeTab === 'secuencias' ? onLoadSequence(item) : onLoadAssessment(item)}
                                        variant="secondary"
                                        className="!px-0 !w-12 !h-12 !rounded-xl border-slate-200 hover:border-slate-300"
                                        title="Editar y Visualizar"
                                    >
                                        <Eye size={18}/>
                                    </PremiumButton>
                                    
                                    <PremiumButton 
                                        onClick={(e) => openAssignModal(item, e)}
                                        className="flex-1 !rounded-xl !py-3 shadow-sm hover:shadow-md"
                                        icon={<Users size={16}/>}
                                    >
                                        Asignar
                                    </PremiumButton>

                                    <div className="h-10 w-[1px] bg-slate-100 mx-1"></div>

                                    <button 
                                        onClick={(e) => toggleVisibility(item.id, item.is_public, e)}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border ${
                                            item.is_public ? 'bg-emerald-50 text-emerald-500 border-emerald-100 hover:bg-emerald-100' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                        }`}
                                        title={item.is_public ? "Hacer Privado" : "Hacer Público"}
                                    >
                                        {item.is_public ? <GlobeIcon size={18}/> : <LockIcon size={18}/>}
                                    </button>

                                    <button 
                                        onClick={(e) => handleDelete(item.id, e)}
                                        disabled={isDeleting === item.id}
                                        className="w-12 h-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 border border-slate-200 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200"
                                        title="Eliminar"
                                    >
                                        {isDeleting === item.id ? <Loader2 size={18} className="animate-spin"/> : <Trash size={18}/>}
                                    </button>
                                </div>
                            </div>
                        </PremiumCard>
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center space-y-6 flex flex-col items-center animate-in zoom-in-95 duration-500 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                        {activeTab === 'secuencias' ? <FolderHeart size={36}/> : <ClipboardCheck size={36}/>}
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-2xl font-black text-slate-900">Repositorio Vacío</h3>
                        <p className="text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                            Las {activeTab === 'secuencias' ? 'secuencias' : 'evaluaciones'} que generes y guardes aparecerán aquí para que puedas reutilizarlas o asignarlas a tus clases.
                        </p>
                    </div>
                </div>
            )}

            <PremiumModal 
                isOpen={isAssignModalOpen} 
                onClose={() => { setIsAssignModalOpen(false); setItemToAssign(null); }}
                title="Desplegar Actividad"
            >
                <div className="space-y-6 py-4">
                    <div className="p-6 bg-slate-900 rounded-xl text-white relative overflow-hidden group shadow-sm border border-slate-800">
                        <div className="relative z-10">
                            <span className="text-[9px] font-black text-brand-400 uppercase tracking-widest block mb-2">Item seleccionado:</span>
                            <h4 className="text-xl font-black tracking-tight mb-1">{itemToAssign?.topic || 'Sin título'}</h4>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{itemToAssign?.subject}</p>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-all">
                            <Users size={80}/>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Aula de Destino</label>
                            {classrooms.length === 0 ? (
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3 text-amber-700 text-sm font-bold">
                                    <AlertCircle size={18}/> No hay aulas creadas aún.
                                </div>
                            ) : (
                                <div className="relative">
                                    <select
                                        value={selectedClassroom}
                                        onChange={(e) => setSelectedClassroom(e.target.value)}
                                        className="w-full h-12 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm"
                                        required
                                    >
                                        <option value="">Elegir un aula...</option>
                                        {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                        <ChevronRight size={18} className="rotate-90"/>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha de Entrega (Opcional)</label>
                            <input
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full h-12 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <PremiumButton 
                            onClick={handleAssign}
                            disabled={!selectedClassroom || isAssigning || classrooms.length === 0}
                            loading={isAssigning}
                            className="w-full !py-4 !rounded-xl shadow-sm hover:translate-y-[-2px]"
                            icon={<Users size={20}/>}
                        >
                            Confirmar Asignación
                        </PremiumButton>
                        <button 
                            onClick={() => { setIsAssignModalOpen(false); setItemToAssign(null); }}
                            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors py-2"
                        >
                            Cancelar Operación
                        </button>
                    </div>
                </div>
            </PremiumModal>
        </div>
    );
};

export default MySequences;
