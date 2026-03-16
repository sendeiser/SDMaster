import React, { useState, useEffect } from 'react';
import { sequenceDbService } from '../lib/sequenceDbService';
import { Globe, Clock, Search, BookOpen, Loader2, User, BookType, ClipboardCheck } from 'lucide-react';

const ExploreSequences = ({ onLoadSequence, onLoadAssessment }) => {
    const [activeTab, setActiveTab] = useState('secuencias'); // 'secuencias' | 'evaluaciones'
    const [sequences, setSequences] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadAllData();
    }, []);

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
            console.error("Error cargando galería pública:", error);
        } finally {
            setLoading(false);
        }
    };

    const currentData = activeTab === 'secuencias' ? sequences : assessments;

    const filteredItems = currentData.filter(item =>
        (item.topic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                        <p className="text-slate-500 font-medium">Explora e inspírate con recursos creados por la comunidad docente.</p>
                        
                        <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit mt-6">
                            <button
                                onClick={() => setActiveTab('secuencias')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'secuencias' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <BookType size={16} />
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
                ) : filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                        {filteredItems.map(item => (
                            <div key={item.id} className={`community-card-fix rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden ${activeTab === 'evaluaciones' ? 'hover:border-purple-200' : 'hover:border-emerald-200'}`}>
                                {/* Badge de Materia */}
                                <div className="flex items-start justify-between mb-6 relative z-10">
                                    <span className={`px-3 py-1 ${activeTab === 'evaluaciones' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} rounded-xl text-[10px] font-black uppercase tracking-wider border`}>
                                        {item.subject || 'Sin Materia'}
                                    </span>
                                    <div className="flex items-center text-slate-300 text-[10px] font-bold">
                                        <Clock size={12} className="mr-1" />
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Autor con Estilo Premium */}
                                <div className="flex items-center space-x-3 mb-6 relative z-10 transition-transform group-hover:translate-x-1">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm ring-4 ring-slate-50">
                                        {item.profiles?.avatar_url ? (
                                            <img src={item.profiles.avatar_url} alt={item.profiles.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={20} className="text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black community-text-fix truncate">
                                            {item.profiles?.full_name || 'Docente Anónimo'}
                                        </p>
                                        <div className="flex items-center space-x-1 text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                                            <span className={`w-1 h-1 ${activeTab === 'evaluaciones' ? 'bg-purple-500' : 'bg-brand-500'} rounded-full`}></span>
                                            <span>Creador</span>
                                        </div>
                                    </div>
                                </div>

                                <h3 className={`text-xl font-black community-text-fix leading-tight mb-3 transition-colors line-clamp-2 relative z-10 font-inter ${activeTab === 'evaluaciones' ? 'group-hover:text-purple-600' : 'group-hover:text-emerald-600'}`}>
                                    {item.topic || 'Tema sin título'}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mb-8 relative z-10">
                                    Año/Curso: <span className="text-slate-900 font-bold">{item.year || 'No especificado'}</span>
                                </p>

                                <button
                                    onClick={() => activeTab === 'secuencias' ? onLoadSequence(item) : onLoadAssessment(item)}
                                    className={`mt-auto w-full py-3.5 bg-slate-100 hover:text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center space-x-2 group-hover:shadow-lg active:scale-[0.98] ${activeTab === 'evaluaciones' ? 'hover:bg-purple-600 text-slate-700 group-hover:shadow-purple-500/20' : 'hover:bg-emerald-600 text-slate-700 group-hover:shadow-emerald-500/20'}`}
                                >
                                    <BookOpen size={18} />
                                    <span>Ver en Editor</span>
                                </button>

                                {/* Decoración de Fondo (Sutil) */}
                                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'evaluaciones' ? 'bg-purple-50' : 'bg-emerald-50'}`}></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 opacity-30 text-center">
                        {activeTab === 'evaluaciones' ? <ClipboardCheck size={64} className="text-slate-300 mb-6" /> : <Globe size={64} className="text-slate-300 mb-6" />}
                        <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-widest">No hay {activeTab === 'secuencias' ? 'secuencias públicas' : 'evaluaciones públicas'}</h3>
                        <p className="text-sm font-medium text-slate-500 max-w-sm">La galería comunitaria está esperando contribuciones.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExploreSequences;
