import React, { useState, useEffect } from 'react';
import { 
    Plus, Users, BookOpen, Clock, Activity, ChevronRight, X, 
    Copy, Check, Trash2, GraduationCap, LayoutGrid, Calendar,
    ExternalLink, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import ClassroomDetail from './ClassroomDetail';
import { PremiumButton, PremiumCard, PremiumInput, PremiumToast, PremiumModal } from './shared/PremiumUI';

const ClassroomsTeacher = ({ session, profile }) => {
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newClassroom, setNewClassroom] = useState({ name: '', description: '' });
    const [notification, setNotification] = useState(null);
    const [activeClassroom, setActiveClassroom] = useState(null);
    const [isDeletingConfirm, setIsDeletingConfirm] = useState(null); // { id, name }

    useEffect(() => {
        if (session?.user?.id && profile?.role === 'teacher') {
            loadClassrooms();
        }
    }, [session, profile]);

    const showNotif = (type, message, detail) => setNotification({ type, message, detail });

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
            showNotif('error', 'Error al cargar', 'No pudimos obtener tus aulas.');
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
        if (e) e.preventDefault();
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
            showNotif('success', '¡Aula creada!', `El aula "${newClassroom.name}" está lista.`);
        } catch (error) {
            console.error('Error creating classroom:', error);
            showNotif('error', 'Error al crear', error.message);
        }
    };

    const handleDeleteClassroom = async () => {
        if (!isDeletingConfirm) return;
        const { id, name } = isDeletingConfirm;

        try {
            const { error } = await supabase
                .from('classrooms')
                .delete()
                .eq('id', id);

            if (error) throw error;
            loadClassrooms();
            showNotif('success', 'Aula eliminada', `Lamentamos que "${name}" ya no esté.`);
            setIsDeletingConfirm(null);
        } catch (error) {
            console.error('Error deleting classroom:', error);
            showNotif('error', 'Error al eliminar', error.message);
        }
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        showNotif('success', 'Código copiado', `El código ${code} está en tu portapapeles.`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 animate-pulse">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando tus aulas...</p>
            </div>
        );
    }

    if (activeClassroom) {
        return (
            <ClassroomDetail 
                classroom={activeClassroom} 
                onBack={() => {
                    setActiveClassroom(null);
                    loadClassrooms(); 
                }} 
            />
        );
    }

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

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2 sm:px-0">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                            <GraduationCap size={18} />
                        </div>
                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest leading-none">Gestión Académica</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Mis <span className="text-brand-600">Aulas</span></h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium mt-2 max-w-xl">
                        Centraliza tus clases, gestiona la participación de tus estudiantes y realiza un seguimiento detallado de cada actividad.
                    </p>
                </div>
                <PremiumButton 
                    onClick={() => setIsCreating(true)}
                    icon={<Plus size={20} />}
                    className="w-full md:w-auto !rounded-xl !py-4 shadow-sm hover:shadow-md"
                >
                    Nueva Aula
                </PremiumButton>
            </div>

            {/* Main Grid */}
            {classrooms.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-3xl mx-auto animate-scale-up">
                    <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center mx-auto mb-8 border border-slate-100">
                        <Users size={32} />
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Comienza tu viaje académico</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-10 font-medium leading-relaxed">
                        Crea tu primera aula virtual para empezar a asignar actividades potenciadas por Inteligencia Artificial y conectar con tus alumnos.
                    </p>
                    <PremiumButton
                        onClick={() => setIsCreating(true)}
                        icon={<Plus size={20} />}
                        className="mx-auto"
                    >
                        Crear mi primera aula
                    </PremiumButton>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 px-2 sm:px-0">
                    {classrooms.map((classroom) => (
                        <div key={classroom.id} className="group animate-scale-up">
                            <PremiumCard noPadding className="h-full flex flex-col hover:shadow-md transform transition-all hover:-translate-y-1 border border-slate-200 hover:border-brand-300">
                                <div className="p-6 sm:p-8 border-b border-slate-50 bg-gradient-to-br from-white to-slate-50/50 flex-grow">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-10 h-10 bg-slate-50 border border-slate-100 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                            <BookOpen size={20} />
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => copyToClipboard(classroom.join_code)}
                                                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                                                title="Copiar Código"
                                            >
                                                <Copy size={18} />
                                            </button>
                                            <button 
                                                onClick={() => setIsDeletingConfirm({ id: classroom.id, name: classroom.name })}
                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Eliminar Aula"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2 leading-tight mb-2">
                                        {classroom.name}
                                    </h3>
                                    
                                    {classroom.description && (
                                        <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-6 min-h-[2.5rem]">
                                            {classroom.description}
                                        </p>
                                    )}
                                    
                                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</span>
                                        <span className="font-mono font-black text-brand-600 tracking-[0.2em] text-lg">{classroom.join_code}</span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50/30 p-2">
                                    <div className="p-4 flex flex-col items-center">
                                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                            <Users size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Alumnos</span>
                                        </div>
                                        <span className="text-2xl font-black text-slate-800">{classroom.classroom_students?.[0]?.count || 0}</span>
                                    </div>
                                    <div className="p-4 flex flex-col items-center">
                                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                            <Activity size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Tareas</span>
                                        </div>
                                        <span className="text-2xl font-black text-slate-800">{classroom.classroom_assignments?.[0]?.count || 0}</span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => setActiveClassroom(classroom)}
                                    className="p-6 flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all border-t border-slate-200 rounded-b-[inherit]"
                                >
                                    Abrir Panel
                                    <ExternalLink size={16} />
                                </button>
                            </PremiumCard>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Crear Aula */}
            <PremiumModal 
                isOpen={isCreating} 
                onClose={() => setIsCreating(false)}
                title="Nueva Aula Virtual"
                footer={(
                    <div className="flex gap-4">
                        <PremiumButton variant="secondary" onClick={() => setIsCreating(false)} className="flex-1">Cancelar</PremiumButton>
                        <PremiumButton 
                            onClick={handleCreateClassroom} 
                            disabled={!newClassroom.name.trim()} 
                            className="flex-1"
                        >
                            Crear Aula
                        </PremiumButton>
                    </div>
                )}
            >
                <div className="space-y-6">
                    <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl flex gap-3 items-start">
                        <AlertCircle className="text-brand-500 mt-0.5" size={18} />
                        <p className="text-xs text-brand-800 font-medium leading-relaxed">
                            Al crear un aula obtendrás un código único. Compártelo con tus alumnos para que puedan unirse y ver las actividades.
                        </p>
                    </div>
                    
                    <PremiumInput 
                        label="Nombre del Aula" 
                        value={newClassroom.name}
                        onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                        placeholder="Ej. Historia 5° Año - División B"
                        icon={<Users size={12} />}
                    />
                    
                    <div className="space-y-1.5 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-brand-600 transition-colors flex items-center gap-1">
                            Descripción / Comentarios
                        </label>
                        <textarea
                            value={newClassroom.description}
                            onChange={(e) => setNewClassroom({ ...newClassroom, description: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-white/70 py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-slate-300 shadow-sm resize-none"
                            placeholder="Información adicional para tus alumnos..."
                            rows="4"
                        />
                    </div>
                </div>
            </PremiumModal>

            {/* Modal Confirmar Eliminación */}
            <PremiumModal 
                isOpen={!!isDeletingConfirm} 
                onClose={() => setIsDeletingConfirm(null)}
                title="¿Eliminar Aula?"
                maxWidth="max-w-md"
            >
                <div className="space-y-6 text-center py-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Trash2 size={28} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Acción Irreversible</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Estás por eliminar el aula <span className="text-slate-900 font-black">"{isDeletingConfirm?.name}"</span>. 
                            Se perderán todas las notas, entregas y registros de los alumnos.
                        </p>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <PremiumButton variant="secondary" onClick={() => setIsDeletingConfirm(null)} className="flex-1">Conservar Aula</PremiumButton>
                        <PremiumButton onClick={handleDeleteClassroom} className="flex-1 !bg-rose-500 hover:!bg-rose-600 shadow-rose-200">Eliminar Aula</PremiumButton>
                    </div>
                </div>
            </PremiumModal>
        </div>
    );
};

export default ClassroomsTeacher;
