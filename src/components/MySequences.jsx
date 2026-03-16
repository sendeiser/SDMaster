import React, { useState, useEffect } from 'react';
import { sequenceDbService } from '../lib/sequenceDbService';
import { FolderHeart, Clock, Search, BookOpen, Loader2, Trash2, Globe, Lock, ClipboardCheck } from 'lucide-react';

const MySequences = ({ session, onLoadSequence, onLoadAssessment }) => {
    const [activeTab, setActiveTab] = useState('secuencias'); // 'secuencias' | 'evaluaciones'
    const [sequences, setSequences] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState(null);

    useEffect(() => {
        if (session) {
            loadAllData();
        } else {
            setLoading(false);
        }
    }, [session]);

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
            console.error("Error cargando repositorio:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
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
        } catch (error) {
            console.error("Error al eliminar", error);
        } finally {
            setIsDeleting(null);
        }
    };

    const toggleVisibility = async (id, currentVisibility, e) => {
        e.stopPropagation();
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
        } catch (error) {
            console.error("Error cambiando visibilidad", error);
        }
    };

    if (!session) {
        return (
            <div className="flex-grow flex items-center justify-center p-8 bg-slate-50">
                <div className="text-center">
                    <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-600">
                        <FolderHeart size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Acceso Restringido</h2>
                    <p className="text-slate-500 font-medium mt-2 max-w-sm">Inicia sesión para gestionar tus propias secuencias y decidir cuáles compartir con la comunidad.</p>
                </div>
            </div>
        );
    }

    const currentData = activeTab === 'secuencias' ? sequences : assessments;

    const filteredItems = currentData.filter(item =>
        (item.topic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
    );



    return (
        <div className="flex-grow p-8 bg-slate-50 overflow-y-auto custom-scrollbar flex justify-center">
            <div className="w-full max-w-5xl">
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600">
                                <FolderHeart size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mi Repositorio</h2>
                        </div>
                        <p className="text-slate-500 font-medium">Gestiona tu repositorio personal. Puedes cambiar la visibilidad o eliminarlas.</p>
                        
                        <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit mt-6">
                            <button
                                onClick={() => setActiveTab('secuencias')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'secuencias' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <FolderHeart size={16} />
                                Secuencias Didácticas
                            </button>
                            <button
                                onClick={() => setActiveTab('evaluaciones')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'evaluaciones' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ClipboardCheck size={16} />
                                Evaluaciones
                            </button>
                        </div>
                    </div>

                    <div className="relative w-full md:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por tema o materia..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 size={32} className="animate-spin text-brand-500" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cargando repositorio...</p>
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all group flex flex-col relative overflow-hidden">
                                <div className="flex items-start justify-between mb-4">
                                    <span className={`px-2.5 py-1 ${activeTab === 'evaluaciones' ? 'bg-purple-50 text-purple-600' : 'bg-brand-50 text-brand-600'} rounded-lg text-xs font-black uppercase tracking-wider`}>
                                        {item.subject || 'Sin Materia'}
                                    </span>
                                    <div className="flex items-center text-slate-300 text-xs font-bold">
                                        <Clock size={12} className="mr-1" />
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                <h3 className={`text-lg font-black text-slate-800 leading-tight mb-2 ${activeTab === 'evaluaciones' ? 'group-hover:text-purple-600' : 'group-hover:text-brand-600'} transition-colors line-clamp-2`}>
                                    {item.topic || 'Tema sin título'}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mb-6">
                                    Año/Curso: {item.year || 'No especificado'}
                                </p>

                                <div className="mt-auto flex gap-2">
                                    <button
                                        onClick={() => activeTab === 'secuencias' ? onLoadSequence(item) : onLoadAssessment(item)}
                                        className={`flex-grow py-2.5 bg-slate-50 hover:text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 group-hover:shadow-md ${activeTab === 'evaluaciones' ? 'hover:bg-purple-600 text-slate-600' : 'hover:bg-brand-600 text-slate-600'}`}
                                    >
                                        <BookOpen size={16} />
                                        <span>Ver en Editor</span>
                                    </button>
                                    <button
                                        title={item.is_public ? "Hacer Privado" : "Hacer Público"}
                                        onClick={(e) => toggleVisibility(item.id, item.is_public, e)}
                                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${item.is_public ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                    >
                                        {item.is_public ? <Globe size={16} /> : <Lock size={16} />}
                                    </button>
                                    <button
                                        title="Eliminar permanentemente"
                                        onClick={(e) => handleDelete(item.id, e)}
                                        className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                    >
                                        {isDeleting === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        {activeTab === 'evaluaciones' ? <ClipboardCheck size={48} className="text-slate-300 mb-4" /> : <FolderHeart size={48} className="text-slate-300 mb-4" />}
                        <h3 className="text-lg font-black text-slate-800 mb-1">Aún no tienes {activeTab === 'secuencias' ? 'secuencias' : 'evaluaciones'}</h3>
                        <p className="text-sm font-medium text-slate-500">Acude al Generador y guarda algunas {activeTab === 'secuencias' ? 'secuencias' : 'evaluaciones'} en tu repositorio en la nube.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MySequences;
