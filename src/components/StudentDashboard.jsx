import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    Users, LogIn, ChevronRight, CheckCircle2, Circle, Clock, 
    Loader2, BookOpen, ClipboardCheck, Layout, Calendar,
    ExternalLink, AlertCircle, Sparkles, GraduationCap,
    TrendingUp, Award, Play
} from 'lucide-react';
import AssignmentViewer from './AssignmentViewer';
import { 
    PremiumButton, PremiumCard, PremiumInput, 
    PremiumToast, PremiumTabs 
} from './shared/PremiumUI';

const StudentDashboard = ({ session, profile }) => {
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [classrooms, setClassrooms] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [activeClassroomId, setActiveClassroomId] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (session) {
            loadStudentData();
        }
    }, [session]);

    useEffect(() => {
        if (activeClassroomId) {
            loadAssignments(activeClassroomId);
        } else {
            setAssignments([]);
        }
    }, [activeClassroomId]);

    const showNotif = (type, message, detail) => setNotification({ type, message, detail });

    const loadStudentData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('classroom_students')
                .select(`
                    classroom_id,
                    classrooms (id, name, description, teacher_id, profiles!teacher_id (full_name))
                `)
                .eq('student_id', session.user.id);

            if (error) throw error;
            
            const formattedClassrooms = data.map(d => ({
                id: d.classrooms.id,
                name: d.classrooms.name,
                description: d.classrooms.description,
                teacherName: d.classrooms.profiles?.full_name || 'Profesor'
            }));
            
            setClassrooms(formattedClassrooms);
            
            if (formattedClassrooms.length > 0 && !activeClassroomId) {
                setActiveClassroomId(formattedClassrooms[0].id);
            }
        } catch (error) {
            console.error('Error loading classrooms:', error);
            showNotif('error', 'Error de conexión', 'No pudimos cargar tus aulas.');
        } finally {
            setLoading(false);
        }
    };

    const loadAssignments = async (classroomId) => {
        try {
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('classroom_assignments')
                .select('*')
                .eq('classroom_id', classroomId)
                .order('created_at', { ascending: false });

            if (assignmentsError) throw assignmentsError;

            const { data: submissionsData, error: submissionsError } = await supabase
                .from('student_submissions')
                .select('assignment_id, is_graded, final_score')
                .eq('student_id', session.user.id)
                .in('assignment_id', assignmentsData.length > 0 ? assignmentsData.map(a => a.id) : ['dummy']);

            if (submissionsError && submissionsError.code !== '22P02') throw submissionsError;

            const submissionsMap = (submissionsData || []).reduce((acc, sub) => {
                acc[sub.assignment_id] = sub;
                return acc;
            }, {});

            const merged = assignmentsData.map(assignment => ({
                ...assignment,
                submission: submissionsMap[assignment.id] || null,
                isCompleted: !!submissionsMap[assignment.id]
            }));

            setAssignments(merged);
        } catch (error) {
            console.error('Error loading assignments:', error);
        }
    };

    const handleJoinClassroom = async (e) => {
        if (e) e.preventDefault();
        if (!joinCode.trim() || joinCode.length !== 6) {
            showNotif('warning', 'Código Inválido', 'El código debe tener exactamente 6 caracteres.');
            return;
        }

        setIsJoining(true);
        try {
            const { data: classroomData, error: findError } = await supabase
                .from('classrooms')
                .select('id, name')
                .eq('join_code', joinCode.toUpperCase())
                .single();

            if (findError || !classroomData) {
                throw new Error("El código no corresponde a un aula activa.");
            }

            const { error: joinError } = await supabase
                .from('classroom_students')
                .insert({
                    classroom_id: classroomData.id,
                    student_id: session.user.id
                });

            if (joinError) {
                if (joinError.code === '23505') throw new Error("Ya formas parte de esta aula.");
                throw joinError;
            }

            showNotif('success', '¡Aula Unida!', `Te has unido a ${classroomData.name}.`);
            setJoinCode('');
            await loadStudentData();
            setActiveClassroomId(classroomData.id);

        } catch (error) {
            showNotif('error', 'Error al unirse', error.message);
        } finally {
            setIsJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] animate-pulse">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando tu campus virtual...</p>
            </div>
        );
    }

    if (selectedAssignment) {
        return (
            <AssignmentViewer 
                session={session} 
                assignment={selectedAssignment} 
                onBack={() => {
                    setSelectedAssignment(null);
                    if (activeClassroomId) loadAssignments(activeClassroomId);
                }} 
            />
        );
    }

    const activeClassroom = classrooms.find(c => c.id === activeClassroomId);

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

            {/* Header / Hero Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-slate-900 p-6 sm:p-10 rounded-2xl text-white overflow-hidden relative shadow-md">
                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-brand-500/20 text-brand-400 rounded-lg backdrop-blur-md">
                            <GraduationCap size={16} />
                        </div>
                        <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] leading-none">Portal del Estudiante</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">Hola, <span className="text-brand-400">{profile?.full_name?.split(' ')[0] || 'Estudiante'}</span> 👋</h1>
                    <p className="text-white/60 font-medium max-w-xl">
                        {activeClassroom 
                            ? `Estás en el aula "${activeClassroom.name}". Tenés ${assignments.filter(a => !a.isCompleted).length} tareas pendientes.`
                            : "Explora tus clases o únete a una nueva para comenzar a aprender."
                        }
                    </p>
                </div>

                <div className="relative z-10 w-full md:w-auto">
                    <div className="flex bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-2xl">
                        <input
                            type="text"
                            placeholder="CÓDIGO DE AULA"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="bg-transparent border-none outline-none text-white px-4 py-2 font-black text-sm uppercase tracking-widest placeholder:text-white/20 w-full md:w-40"
                        />
                        <PremiumButton 
                            onClick={handleJoinClassroom}
                            loading={isJoining}
                            className="!px-4 !py-2 !rounded-xl active:scale-95"
                        >
                            <LogIn size={18}/>
                        </PremiumButton>
                    </div>
                </div>

                {/* Background Decorations */}
                <div className="absolute top-0 right-0 p-10 opacity-10 blur-xl">
                    <Sparkles size={160} className="text-brand-400"/>
                </div>
                <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-brand-600/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Main Content Layout */}
            <div className="flex flex-col lg:flex-row gap-10">
                
                {/* Sidebar: Mis Aulas */}
                <div className="w-full lg:w-80 shrink-0 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Users size={12}/> Mis CLASES
                        </h2>
                    </div>

                    <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 custom-scrollbar-hide lg:custom-scrollbar snap-x">
                        {classrooms.length === 0 ? (
                            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl border-dashed">
                                <Users size={32} className="mx-auto text-slate-300 mb-3"/>
                                <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-widest">Aún no estás inscrito en ninguna aula.</p>
                            </div>
                        ) : (
                            classrooms.map(classroom => (
                                <button
                                    key={classroom.id}
                                    onClick={() => setActiveClassroomId(classroom.id)}
                                    className={`flex-shrink-0 w-[240px] lg:w-full group relative flex flex-col items-start p-5 rounded-2xl transition-all duration-300 snap-start ${
                                        activeClassroomId === classroom.id 
                                        ? 'bg-white shadow-sm border border-slate-200 lg:-translate-y-1' 
                                        : 'bg-white/50 lg:bg-transparent hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all ${
                                        activeClassroomId === classroom.id ? 'bg-brand-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        <BookOpen size={20}/>
                                    </div>
                                    <h3 className={`font-black text-sm tracking-tight mb-1 transition-colors ${
                                        activeClassroomId === classroom.id ? 'text-slate-900' : 'text-slate-600'
                                    }`}>
                                        {classroom.name}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp size={10} className="text-emerald-500"/> {classroom.teacherName}
                                    </p>
                                    
                                    {activeClassroomId === classroom.id && (
                                        <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    {!activeClassroomId ? (
                        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center space-y-6 flex flex-col items-center">
                            <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center text-slate-300 border border-slate-100">
                                <Layout size={32}/>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900">Seleccioná un aula</h3>
                                <p className="text-slate-500 font-medium max-w-sm mx-auto">
                                    Hacé clic en una de tus clases en la barra lateral para ver los trabajos asignados y tus calificaciones.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <ClipboardCheck size={14}/> TRABAJO DEL CURSO
                                </h2>
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Completado
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-slate-200"></div> Pendiente
                                    </div>
                                </div>
                            </div>

                            {assignments.length === 0 ? (
                                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center space-y-6 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                                        <Calendar size={28}/>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-slate-900">Todo al día</h3>
                                        <p className="text-slate-500 font-medium">El profesor todavía no ha pulicado actividades en esta sección.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {assignments.map(assignment => (
                                        <PremiumCard 
                                            key={assignment.id} 
                                            noPadding 
                                            className="group hover:-translate-y-1 hover:shadow-md transition-all duration-300 border border-slate-200 hover:border-brand-200"
                                        >
                                            <div className="flex flex-col md:flex-row p-5 sm:p-8 gap-4 sm:gap-6 md:items-center">
                                                {/* Left Status */}
                                                <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                                                    assignment.isCompleted 
                                                    ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' 
                                                    : 'bg-slate-50 text-slate-300 border border-slate-200'
                                                }`}>
                                                    {assignment.isCompleted ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                                                </div>

                                                {/* Core Info */}
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                                                            assignment.item_type === 'assessment' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {assignment.item_type === 'assessment' ? 'Evaluación' : 'Práctica'}
                                                        </span>
                                                        {assignment.due_date && (
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-lg">
                                                                <Clock size={12}/> Vence el {new Date(assignment.due_date).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors uppercase tracking-tight">
                                                        {assignment.title}
                                                    </h3>
                                                    {assignment.description && (
                                                        <p className="text-sm font-medium text-slate-400">
                                                            {assignment.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Feedback / Score */}
                                                {assignment.isCompleted && assignment.submission?.is_graded && (
                                                    <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 p-4 rounded-xl shadow-sm">
                                                        <Award size={24} className="text-emerald-500"/>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Calificación</p>
                                                            <p className="text-2xl font-black text-emerald-900 leading-none">
                                                                {assignment.submission.final_score}<span className="text-sm">/10</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Action */}
                                                <PremiumButton 
                                                    onClick={() => setSelectedAssignment(assignment)}
                                                    variant={assignment.isCompleted ? 'secondary' : 'primary'}
                                                    className={`!rounded-xl !py-4 !px-8 shadow-sm ${assignment.isCompleted ? '' : 'hover:shadow-md'}`}
                                                    icon={<Play size={18} fill="currentColor"/>}
                                                >
                                                    {assignment.isCompleted ? 'Ver Entrega' : 'Comenzar'}
                                                </PremiumButton>
                                            </div>
                                        </PremiumCard>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
