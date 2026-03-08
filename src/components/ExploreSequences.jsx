import React, { useState, useEffect } from 'react';
import { sequenceDbService } from '../lib/sequenceDbService';
import { Globe, Clock, Search, BookOpen, Loader2, User } from 'lucide-react';

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
        <div className="flex-grow p-4 md:p-8 bg-slate-50 overflow-y-auto custom-scrollbar flex justify-center">
            <div className="w-full max-w-6xl">
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                                <Globe size={24} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Galería Comunitaria</h2>
                        </div>
                        <p className="text-slate-500 font-medium">Explora e inspírate con las secuencias públicas de la comunidad docente.</p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por tema o materia..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500:border-brand-500/50 transition-all shadow-sm text-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                        <Loader2 size={48} className="animate-spin text-emerald-500" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest text-center">Sincronizando con la red comunitaria...</p>
                    </div>
                ) : filteredSequences.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                        {filteredSequences.map(seq => (
                            <div key={seq.id} className="community-card-fix rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:border-emerald-200:border-emerald-900/50 transition-all group flex flex-col relative overflow-hidden">
                                {/* Badge de Materia */}
                                <div className="flex items-start justify-between mb-6 relative z-10">
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                        {seq.subject || 'Sin Materia'}
                                    </span>
                                    <div className="flex items-center text-slate-300 text-[10px] font-bold">
                                        <Clock size={12} className="mr-1" />
                                        {new Date(seq.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Autor con Estilo Premium */}
                                <div className="flex items-center space-x-3 mb-6 relative z-10 transition-transform group-hover:translate-x-1">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm ring-4 ring-slate-50">
                                        {seq.profiles?.avatar_url ? (
                                            <img src={seq.profiles.avatar_url} alt={seq.profiles.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={20} className="text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black community-text-fix truncate">
                                            {seq.profiles?.full_name || 'Docente Anónimo'}
                                        </p>
                                        <div className="flex items-center space-x-1 text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                                            <span className="w-1 h-1 bg-brand-500 rounded-full"></span>
                                            <span>Creador</span>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-xl font-black community-text-fix leading-tight mb-3 group-hover:text-emerald-600:text-emerald-400 transition-colors line-clamp-2 relative z-10 font-inter">
                                    {seq.topic || 'Tema sin título'}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mb-8 relative z-10">
                                    Año/Curso: <span className="text-slate-900 font-bold">{seq.year || 'No especificado'}</span>
                                </p>

                                <button
                                    onClick={() => onLoadSequence(seq)}
                                    className="mt-auto w-full py-3.5 bg-slate-100 hover:bg-emerald-600:bg-emerald-500 text-slate-700 hover:text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center space-x-2 group-hover:shadow-lg group-hover:shadow-emerald-500/20 active:scale-[0.98]"
                                >
                                    <BookOpen size={18} />
                                    <span>Ver en Editor</span>
                                </button>

                                {/* Decoración de Fondo (Sutil) */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 opacity-30 text-center">
                        <Globe size={64} className="text-slate-300 mb-6" />
                        <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-widest">Ninguna secuencia pública</h3>
                        <p className="text-sm font-medium text-slate-500 max-w-sm">La galería comunitaria está esperando las primeras contribuciones públicas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExploreSequences;
