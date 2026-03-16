import React, { useState, useEffect } from 'react';
import { Plus, Users, BookOpen, Clock, Activity, ChevronRight, X, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import ClassroomDetail from './ClassroomDetail';

const ClassroomsTeacher = ({ session, profile }) => {
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newClassroom, setNewClassroom] = useState({ name: '', description: '' });
    const [copiedCode, setCopiedCode] = useState(null);
    const [activeClassroom, setActiveClassroom] = useState(null);

    useEffect(() => {
        if (session?.user?.id && profile?.role === 'teacher') {
            loadClassrooms();
        }
    }, [session, profile]);

    const loadClassrooms = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('classrooms')
                .select(`
                    *,
                    classroom_students(count),
                    classroom_assignments(count)
                `)
                .eq('teacher_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClassrooms(data || []);
        } catch (error) {
            console.error('Error loading classrooms:', error);
            alert('Error al cargar las aulas. Por favor intenta recargar la página.');
        } finally {
            setLoading(false);
        }
    };

    const generateJoinCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleCreateClassroom = async (e) => {
        e.preventDefault();
        try {
            const joinCode = generateJoinCode();
            const { error } = await supabase
                .from('classrooms')
                .insert([{
                    teacher_id: session.user.id,
                    name: newClassroom.name,
                    description: newClassroom.description,
                    join_code: joinCode
                }]);

            if (error) throw error;
            setIsCreating(false);
            setNewClassroom({ name: '', description: '' });
            loadClassrooms();
        } catch (error) {
            console.error('Error creating classroom:', error);
            alert('Error al crear el aula: ' + error.message);
        }
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (activeClassroom) {
        return (
            <ClassroomDetail 
                classroom={activeClassroom} 
                onBack={() => {
                    setActiveClassroom(null);
                    loadClassrooms(); // Recargar datos al volver (para actualizar stats)
                }} 
            />
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Mis Aulas</h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Administra tus clases, invita estudiantes y asigna actividades.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all shadow-sm hover:shadow-brand-500/25 active:scale-95 whitespace-nowrap"
                >
                    <Plus size={20} />
                    Crear Aula
                </button>
            </div>

            {/* Lista de Aulas */}
            {classrooms.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                    <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="text-brand-500" size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-3">Aún no tienes aulas</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">
                        Crea tu primera aula para generar un código de acceso que tus estudiantes usarán para unirse a tus clases.
                    </p>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-50 text-brand-600 hover:bg-brand-100 font-bold rounded-xl transition-colors"
                    >
                        <Plus size={20} />
                        Crear mi primera aula
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classrooms.map((classroom) => (
                        <div key={classroom.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-brand-200 group">
                            {/* Cabecera Tarjeta */}
                            <div className="p-6 border-b border-slate-50 bg-gradient-to-br from-white to-slate-50/50">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-black text-slate-800 group-hover:text-brand-600 transition-colors line-clamp-2">
                                        {classroom.name}
                                    </h3>
                                </div>
                                {classroom.description && (
                                    <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4">
                                        {classroom.description}
                                    </p>
                                )}
                                
                                <div className="flex items-center gap-2 mt-auto">
                                    <div className="bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-200">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Código:</span>
                                        <span className="font-mono font-black text-brand-600 tracking-widest">{classroom.join_code}</span>
                                    </div>
                                    <button 
                                        onClick={() => copyToClipboard(classroom.join_code)}
                                        className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-md transition-colors"
                                        title="Copiar Código"
                                    >
                                        {copiedCode === classroom.join_code ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Stats Tarjeta */}
                            <div className="grid grid-cols-2 divide-x divide-slate-50 bg-white">
                                <div className="p-4 flex flex-col items-center justify-center text-center">
                                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                        <Users size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Estudiantes</span>
                                    </div>
                                    <span className="text-xl font-black text-slate-700">{classroom.classroom_students?.[0]?.count || 0}</span>
                                </div>
                                <div className="p-4 flex flex-col items-center justify-center text-center">
                                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                        <Activity size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Actividades</span>
                                    </div>
                                    <span className="text-xl font-black text-slate-700">{classroom.classroom_assignments?.[0]?.count || 0}</span>
                                </div>
                            </div>
                            
                            {/* Botón Acción */}
                            <button 
                                onClick={() => setActiveClassroom(classroom)}
                                className="p-4 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors border-t border-slate-50 mt-auto"
                            >
                                Entrar al Aula
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Crear Aula */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Plus className="text-brand-500" />
                                Crear Nueva Aula
                            </h2>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateClassroom} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Aula</label>
                                <input
                                    type="text"
                                    value={newClassroom.name}
                                    onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium"
                                    placeholder="Ej. Matemática 5° A"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Descripción (Opcional)</label>
                                <textarea
                                    value={newClassroom.description}
                                    onChange={(e) => setNewClassroom({ ...newClassroom, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium resize-none"
                                    placeholder="Ej. Ciclo lectivo 2026 - Turno Mañana"
                                    rows="3"
                                />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newClassroom.name.trim()}
                                    className="flex-1 px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Crear Aula
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassroomsTeacher;
