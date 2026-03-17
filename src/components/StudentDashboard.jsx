import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Users, LogIn, ChevronRight, CheckCircle2, Circle, Clock, Loader2, BookOpen, ClipboardCheck } from 'lucide-react';
import AssignmentViewer from './AssignmentViewer';

const StudentDashboard = ({ session, profile }) => {
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [classrooms, setClassrooms] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [activeClassroomId, setActiveClassroomId] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [loading, setLoading] = useState(true);

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

    const loadStudentData = async () => {
        setLoading(true);
        try {
            // Get classrooms the student is enrolled in
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
        } finally {
            setLoading(false);
        }
    };

    const loadAssignments = async (classroomId) => {
        try {
            // Load assignments for this classroom
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('classroom_assignments')
                .select('*')
                .eq('classroom_id', classroomId)
                .order('created_at', { ascending: false });

            if (assignmentsError) throw assignmentsError;

            // Load student submissions for these assignments to check completion status
            const { data: submissionsData, error: submissionsError } = await supabase
                .from('student_submissions')
                .select('assignment_id, is_graded, final_score')
                .eq('student_id', session.user.id)
                .in('assignment_id', assignmentsData.map(a => a.id));

            if (submissionsError && submissionsError.code !== '22P02') { // Handle empty array case nicely
                throw submissionsError;
            }

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
        e.preventDefault();
        if (!joinCode.trim() || joinCode.length !== 6) {
            alert("El código debe tener 6 caracteres.");
            return; // Needs validation
        }

        setIsJoining(true);
        try {
            // 1. Find the classroom by code
            const { data: classroomData, error: findError } = await supabase
                .from('classrooms')
                .select('id, name')
                .eq('join_code', joinCode.toUpperCase())
                .single();

            if (findError || !classroomData) {
                throw new Error("Código de aula inválido o aula no encontrada.");
            }

            // 2. Insert into classroom_students
            const { error: joinError } = await supabase
                .from('classroom_students')
                .insert({
                    classroom_id: classroomData.id,
                    student_id: session.user.id
                });

            if (joinError) {
                if (joinError.code === '23505') { // Unique violation
                    throw new Error("Ya estás inscrito en esta aula.");
                }
                throw joinError;
            }

            alert(`¡Te has unido a "${classroomData.name}" exitosamente!`);
            setJoinCode('');
            await loadStudentData(); // Reload to show the new classroom
            setActiveClassroomId(classroomData.id); // Switch to the new classroom

        } catch (error) {
            alert(error.message);
        } finally {
            setIsJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-grow flex items-center justify-center p-8 bg-slate-50">
                <Loader2 size={40} className="animate-spin text-brand-500" />
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
                    if (activeClassroomId) loadAssignments(activeClassroomId); // Reload to update status
                }} 
            />
        );
    }

    return (
        <div className="flex-grow flex bg-slate-50 overflow-hidden h-full relative">
            {/* Overlay móvil para sidebar */}
            {activeClassroomId && (
                <div className="lg:hidden absolute top-4 left-4 z-40">
                    <button 
                        onClick={() => setActiveClassroomId(null)}
                        className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600"
                    >
                        <Users size={20} />
                    </button>
                </div>
            )}

            {/* Sidebar de Aulas del Estudiante */}
            <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200 flex flex-col h-full transform transition-transform duration-300 lg:relative lg:translate-x-0 ${!activeClassroomId ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-6 border-b border-slate-100 flex-shrink-0">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
                        <Users className="text-brand-500" />
                        Mis Clases
                    </h2>

                    {/* Formulario para Unirse */}
                    <form onSubmit={handleJoinClassroom} className="relative">
                        <input
                            type="text"
                            placeholder="Código de clase (6 letras)"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-bold uppercase tracking-widest text-slate-700"
                            required
                        />
                        <button
                            type="submit"
                            disabled={isJoining || joinCode.length < 6}
                            className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            title="Unirse a la clase"
                        >
                            {isJoining ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                        </button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {classrooms.length === 0 ? (
                        <div className="text-center p-6 text-slate-400">
                            <Users size={32} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Aún no estás en ninguna clase.</p>
                            <p className="text-xs mt-1">Pídele el código a tu profesor.</p>
                        </div>
                    ) : (
                        classrooms.map(classroom => (
                            <button
                                key={classroom.id}
                                onClick={() => setActiveClassroomId(classroom.id)}
                                className={`w-full text-left p-4 rounded-2xl transition-all border ${
                                    activeClassroomId === classroom.id 
                                        ? 'bg-brand-50 border-brand-200 shadow-sm' 
                                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                                }`}
                            >
                                <h3 className={`font-black text-sm mb-1 ${activeClassroomId === classroom.id ? 'text-brand-700' : 'text-slate-700'}`}>
                                    {classroom.name}
                                </h3>
                                <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                    {classroom.teacherName}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Panel Principal - Tareas del Aula Activa */}
            <div className={`flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 custom-scrollbar ${!activeClassroomId ? 'hidden lg:block' : 'block'}`}>
                <div className="max-w-4xl mx-auto">
                    {activeClassroomId ? (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Trabajo de Clase</h1>
                                <p className="text-slate-500 font-medium mt-2">Completa las actividades asignadas por el docente.</p>
                            </div>

                            {assignments.length === 0 ? (
                                <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[400px]">
                                    <ClipboardCheck size={48} className="mb-4 opacity-50" />
                                    <h3 className="text-lg font-bold text-slate-600 mb-1">El aula está vacía</h3>
                                    <p className="text-sm font-medium">El profesor aún no ha publicado tareas en esta clase.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {assignments.map(assignment => (
                                        <div key={assignment.id} className="bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-lg hover:border-brand-200 transition-all group flex items-start gap-4 cursor-pointer">
                                            {/* Status Icon */}
                                            <div className="flex-shrink-0 mt-1">
                                                {assignment.isCompleted ? (
                                                    <CheckCircle2 size={24} className="text-emerald-500" />
                                                ) : (
                                                    <Circle size={24} className="text-slate-300 group-hover:text-brand-400 transition-colors" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md ${assignment.item_type === 'assessment' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700'}`}>
                                                        {assignment.item_type === 'assessment' ? 'Evaluación' : 'Actividad'}
                                                    </span>
                                                    {assignment.due_date && (
                                                        <span className="text-xs font-semibold text-rose-500 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md">
                                                            <Clock size={12} />
                                                            Vence: {new Date(assignment.due_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-brand-600 transition-colors">
                                                    {assignment.title}
                                                </h3>
                                                {assignment.description && (
                                                    <p className="text-sm font-medium text-slate-500 mt-1">
                                                        {assignment.description}
                                                    </p>
                                                )}

                                                {/* Retroalimentación pill si ya está calificado */}
                                                {assignment.isCompleted && assignment.submission?.is_graded && (
                                                    <div className="mt-3 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg text-sm font-bold text-emerald-700">
                                                        <span>Calificación:</span>
                                                        <span className="bg-emerald-200 px-2 py-0.5 rounded-md text-emerald-900">{assignment.submission.final_score}/10</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Button */}
                                            <div className="flex-shrink-0 self-center">
                                                <button 
                                                    onClick={() => setSelectedAssignment(assignment)}
                                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                                    assignment.isCompleted 
                                                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                                                        : 'bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white group-hover:shadow-md'
                                                }`}>
                                                    {assignment.isCompleted ? 'Ver Entrega' : 'Iniciar'}
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-50 space-y-4 min-h-[60vh]">
                            <BookOpen size={64} className="text-brand-300" />
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Estás en la vista de Estudiante</h2>
                            <p className="text-slate-500 font-medium max-w-md">
                                Únete a una clase escribiendo el código que te dio tu profesor en la barra lateral, o selecciona una clase existente para ver tus tareas.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
