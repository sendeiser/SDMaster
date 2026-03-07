import React, { useState, useEffect } from 'react';
import { sequenceDbService } from '../lib/sequenceDbService';
import { Globe, Clock, Search, BookOpen, Loader2 } from 'lucide-react';

const ExploreSequences = ({ onLoadSequence }) => {
    const [sequences, setSequences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadSequences();
    }, []);

    const loadSequences = async () => {
        setLoading(true);
        try {
            const data = await sequenceDbService.getPublicSequences();
            setSequences(data || []);
        } catch (error) {
            console.error("Error cargando secuencias públicas:", error);
        } finally {
            setLoading(false);
        }
    };

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
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                <Globe size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Galería Comunitaria</h2>
                        </div>
                        <p className="text-slate-500 font-medium">Explora e inspírate con las secuencias públicas creadas por otros docentes.</p>
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
                        <Loader2 size={32} className="animate-spin text-emerald-500" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cargando repositorio...</p>
                    </div>
                ) : filteredSequences.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSequences.map(seq => (
                            <div key={seq.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black uppercase tracking-wider">
                                        {seq.subject || 'Sin Materia'}
                                    </span>
                                    <div className="flex items-center text-slate-300 text-xs font-bold">
                                        <Clock size={12} className="mr-1" />
                                        {new Date(seq.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                                    {seq.topic || 'Tema sin título'}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mb-6">
                                    Año/Curso: {seq.year || 'No especificado'}
                                </p>

                                <button
                                    onClick={() => onLoadSequence(seq)}
                                    className="mt-auto w-full py-2.5 bg-slate-50 hover:bg-emerald-600 text-slate-600 hover:text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 group-hover:shadow-md"
                                >
                                    <BookOpen size={16} />
                                    <span>Ver en Editor</span>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Globe size={48} className="text-slate-300 mb-4" />
                        <h3 className="text-lg font-black text-slate-800 mb-1">Ninguna secuencia encontrada</h3>
                        <p className="text-sm font-medium text-slate-500">Intenta con otros términos básicos o espera a que la comunidad comparta más secuencias.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExploreSequences;
