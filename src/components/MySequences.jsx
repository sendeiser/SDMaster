import React, { useState, useEffect } from 'react';
import { sequenceDbService } from '../lib/sequenceDbService';
import { FolderHeart, Clock, Search, BookOpen, Loader2, Trash2, Globe, Lock } from 'lucide-react';

const MySequences = ({ session, onLoadSequence }) => {
    const [sequences, setSequences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState(null);

    useEffect(() => {
        if (session) {
            loadSequences();
        } else {
            setLoading(false);
        }
    }, [session]);

    const loadSequences = async () => {
        setLoading(true);
        try {
            const data = await sequenceDbService.getUserSequences();
            setSequences(data || []);
        } catch (error) {
            console.error("Error cargando mis secuencias:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("¿Seguro que deseas eliminar esta secuencia permanentemente?")) return;

        setIsDeleting(id);
        try {
            await sequenceDbService.deleteSequence(id);
            setSequences(prev => prev.filter(seq => seq.id !== id));
        } catch (error) {
            console.error("Error al eliminar", error);
        } finally {
            setIsDeleting(null);
        }
    };

    const toggleVisibility = async (id, currentVisibility, e) => {
        e.stopPropagation();
        try {
            await sequenceDbService.toggleVisibility(id, !currentVisibility);
            setSequences(prev => prev.map(seq =>
                seq.id === id ? { ...seq, is_public: !currentVisibility } : seq
            ));
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

    const filteredSequences = sequences.filter(seq =>
        (seq.topic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (seq.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mis Secuencias</h2>
                        </div>
                        <p className="text-slate-500 font-medium">Gestiona tu repositorio personal. Puedes cambiar la visibilidad o eliminarlas.</p>
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
                ) : filteredSequences.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSequences.map(seq => (
                            <div key={seq.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all group flex flex-col relative overflow-hidden">
                                <div className="flex items-start justify-between mb-4">
                                    <span className="px-2.5 py-1 bg-brand-50 text-brand-600 rounded-lg text-xs font-black uppercase tracking-wider">
                                        {seq.subject || 'Sin Materia'}
                                    </span>
                                    <div className="flex items-center text-slate-300 text-xs font-bold">
                                        <Clock size={12} className="mr-1" />
                                        {new Date(seq.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2 group-hover:text-brand-600 transition-colors line-clamp-2">
                                    {seq.topic || 'Tema sin título'}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mb-6">
                                    Año/Curso: {seq.year || 'No especificado'}
                                </p>

                                <div className="mt-auto flex gap-2">
                                    <button
                                        onClick={() => onLoadSequence(seq)}
                                        className="flex-grow py-2.5 bg-slate-50 hover:bg-brand-600 text-slate-600 hover:text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 group-hover:shadow-md"
                                    >
                                        <BookOpen size={16} />
                                        <span>Ver en Editor</span>
                                    </button>
                                    <button
                                        title={seq.is_public ? "Hacer Privado" : "Hacer Público"}
                                        onClick={(e) => toggleVisibility(seq.id, seq.is_public, e)}
                                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${seq.is_public ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                    >
                                        {seq.is_public ? <Globe size={16} /> : <Lock size={16} />}
                                    </button>
                                    <button
                                        title="Eliminar permanentemente"
                                        onClick={(e) => handleDelete(seq.id, e)}
                                        className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                    >
                                        {isDeleting === seq.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <FolderHeart size={48} className="text-slate-300 mb-4" />
                        <h3 className="text-lg font-black text-slate-800 mb-1">Aún no tienes secuencias</h3>
                        <p className="text-sm font-medium text-slate-500">Acude al Generador y guarda algunas secuencias en tu repositorio en la nube.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MySequences;
