import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sequenceDbService } from '../lib/sequenceDbService';
import { 
    ArrowLeft, Users, Eye, FileText, ClipboardCheck, MessageSquare, 
    Loader2, Save, Download, Activity, Plus, Search as SearchIcon, X, BookOpen, Zap,
    Circle as CircleIcon, Trash2, Calendar, Target, ExternalLink, Award, ChevronRight,
    CheckCircle2, AlertTriangle, HelpCircle, History as HistoryIcon, Info, Filter, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { 
    PremiumButton, PremiumCard, PremiumInput, 
    PremiumToast, PremiumTable, PremiumTabs, PremiumModal 
} from './shared/PremiumUI';

const ClassroomDetail = ({ classroom, onBack }) => {
    const [assignments, setAssignments] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('assignments'); 
    const [notification, setNotification] = useState(null);
    const [isDeletingActivity, setIsDeletingActivity] = useState(null); // { id, title }
    
    // Grading states
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);

    // Grade matrix state
    const [gradeMatrix, setGradeMatrix] = useState({});
    const [matrixLoading, setMatrixLoading] = useState(false);
    
    // Edit score states
    const [editScore, setEditScore] = useState('');
    const [editFeedback, setEditFeedback] = useState('');
    const [isSavingGrade, setIsSavingGrade] = useState(false);

    // Assign Activity Modal states
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignTab, setAssignTab] = useState('secuencias'); 
    const [savedSequences, setSavedSequences] = useState([]);
    const [savedAssessments, setSavedAssessments] = useState([]);
    const [assignSearch, setAssignSearch] = useState('');
    const [assignDueDate, setAssignDueDate] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [loadingContent, setLoadingContent] = useState(false);

    useEffect(() => {
        loadClassroomData();
    }, [classroom.id]);

    const showNotif = (type, message, detail) => setNotification({ type, message, detail });

    const loadClassroomData = async () => {
        setLoading(true);
        try {
            const { data: assignmentsData, error: asnError } = await supabase
                .from('classroom_assignments')
                .select('*')
                .eq('classroom_id', classroom.id)
                .order('created_at', { ascending: false });
            if (asnError) throw asnError;
            setAssignments(assignmentsData || []);

            const { data: studentsData, error: stdError } = await supabase
                .from('classroom_students')
                .select(`
                    student_id,
                    joined_at,
                    profiles!student_id (full_name, avatar_url, email)
                `)
                .eq('classroom_id', classroom.id);
            if (stdError) throw stdError;
            setStudents(studentsData || []);
        } catch (error) {
            console.error('Error loading classroom details:', error);
            showNotif('error', 'Error al cargar', 'No pudimos obtener la información del aula.');
        } finally {
            setLoading(false);
        }
    };

    const loadGradeMatrix = async () => {
        setMatrixLoading(true);
        try {
            const assignmentIds = assignments.map(a => a.id);
            if (assignmentIds.length === 0) { setMatrixLoading(false); return; }

            const { data, error } = await supabase
                .from('student_submissions')
                .select('student_id, assignment_id, final_score, ai_score_suggested, is_graded')
                .in('assignment_id', assignmentIds);

            if (error) throw error;

            const matrix = {};
            (data || []).forEach(sub => {
                if (!matrix[sub.student_id]) matrix[sub.student_id] = {};
                matrix[sub.student_id][sub.assignment_id] = sub;
            });
            setGradeMatrix(matrix);
        } catch (err) {
            console.error('Error loading grade matrix:', err);
        } finally {
            setMatrixLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'grades' && assignments.length > 0) {
            loadGradeMatrix();
        }
    }, [activeTab, assignments]);

    const openAssignModal = async () => {
        setIsAssignModalOpen(true);
        setSelectedItem(null);
        setAssignSearch('');
        setAssignDueDate('');
        if (savedSequences.length === 0 && savedAssessments.length === 0) {
            setLoadingContent(true);
            try {
                const [seqs, evals] = await Promise.all([
                    sequenceDbService.getUserSequences(),
                    sequenceDbService.getUserAssessments()
                ]);
                setSavedSequences(seqs || []);
                setSavedAssessments(evals || []);
            } catch (err) {
                console.error('Error loading content:', err);
            } finally {
                setLoadingContent(false);
            }
        }
    };

    const handleAssignActivity = async () => {
        if (!selectedItem) return;
        setIsAssigning(true);
        try {
            const itemType = assignTab === 'secuencias' ? 'sequence' : 'assessment';
            const dueDate = assignDueDate ? new Date(assignDueDate).toISOString() : null;
            await sequenceDbService.assignToClassroom(classroom.id, selectedItem, itemType, dueDate);
            setIsAssignModalOpen(false);
            setSelectedItem(null);
            await loadClassroomData();
            showNotif('success', '¡Asignado!', `"${selectedItem.topic}" ya está disponible para el aula.`);
        } catch (err) {
            showNotif('error', 'Error al asignar', err.message);
        } finally {
            setIsAssigning(false);
        }
    };

    const loadSubmissionsForAssignment = async (assignment) => {
        setSelectedAssignment(assignment);
        setSubmissions([]);
        try {
            const { data, error } = await supabase
                .from('student_submissions')
                .select(`
                    *,
                    profiles!student_id (full_name, email)
                `)
                .eq('assignment_id', assignment.id);
            if (error) throw error;
            setSubmissions(data || []);
        } catch (error) {
            console.error("Error loading submissions", error);
            showNotif('error', 'Error', 'No pudimos cargar las entregas.');
        }
    };

    const handleSelectSubmission = (sub) => {
        setSelectedSubmission(sub);
        setEditScore(sub.is_graded ? sub.final_score.toString() : (sub.ai_score_suggested?.toString() || ''));
        const initialFeedback = sub.is_graded ? (sub.teacher_feedback || '') : (sub.ai_feedback || '');
        setEditFeedback(formatAiFeedback(initialFeedback));
    };

    const handleApplyAiSuggestion = () => {
        if (!selectedSubmission) return;
        setEditScore(selectedSubmission.ai_score_suggested?.toString() || '');
        setEditFeedback(formatAiFeedback(selectedSubmission.ai_feedback) || '');
        showNotif('success', 'Sugerencia Aplicada', 'Se ha copiado la nota y el feedback de la IA.');
    };

    const handleSaveGrade = async () => {
        if (!editScore || isNaN(editScore) || Number(editScore) < 1 || Number(editScore) > 10) {
            showNotif('warning', 'Calificación inválida', 'La nota debe estar entre 1 y 10.');
            return;
        }

        setIsSavingGrade(true);
        try {
            const { data, error } = await supabase
                .from('student_submissions')
                .update({
                    is_graded: true,
                    final_score: Number(editScore),
                    teacher_feedback: editFeedback
                })
                .eq('id', selectedSubmission.id)
                .select()
                .single();

            if (error) throw error;

            setSelectedSubmission(prev => ({ ...prev, ...data }));
            setSubmissions(prev => prev.map(s => s.id === data.id ? { ...s, ...data } : s));
            showNotif('success', 'Calificado', 'La nota ha sido publicada exitosamente.');
        } catch (error) {
            console.error("Error saving grade:", error);
            showNotif('error', 'Error al guardar', 'No pudimos guardar la calificación.');
        } finally {
            setIsSavingGrade(false);
        }
    };

    const handleDeleteAssignment = async () => {
        if (!isDeletingActivity) return;
        const { id, title } = isDeletingActivity;

        try {
            const { error } = await supabase
                .from('classroom_assignments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadClassroomData();
            showNotif('success', 'Actividad eliminada', 'La tarea desapareció del aula.');
            setIsDeletingActivity(null);
        } catch (error) {
            console.error('Error deleting assignment:', error);
            showNotif('error', 'Error', 'No pudimos eliminar la actividad.');
        }
    };

    const formatAiFeedback = (feedback) => {
        if (!feedback) return "";
        try {
            // First pass: try to extract JSON from markdown or raw text
            let cleanJson = feedback.trim();
            
            // Helpful for when AI returns ```json block or just plain JSON
            const jsonMatch = cleanJson.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                cleanJson = jsonMatch[0];
            } else {
                // If no JSON structure is found, it's likely already plain text
                return feedback;
            }

            const r = JSON.parse(cleanJson);
            const reportLines = [];
            
            // Smart extraction of different possible JSON structures
            const getField = (obj, paths) => {
                for (const path of paths) {
                    const keys = path.split('.');
                    let current = obj;
                    for (const key of keys) {
                        current = current?.[key];
                    }
                    if (current) return current;
                }
                return null;
            };

            const generalObs = getField(r, [
                'feedback', 
                'comentarios_pedagogicos', 
                'evaluacion_tarea.comentarios_pedagogicos', 
                'resumen_desempeno.observaciones_generales',
                'resumen_evaluacion',
                'observaciones'
            ]);
            
            if (generalObs) {
                reportLines.push(`### 📝 Observaciones Generales\n${generalObs}`);
            }

            const items = getField(r, [
                'analisis_por_item', 
                'analisis_detallado', 
                'analisis_ejercicios', 
                'items', 
                'analisis_de_desempeno'
            ]);

            if (items) {
                reportLines.push(`\n### 🔍 Análisis por Item`);
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        const num = item.item || item.id || item.ejercicio || item.pregunta || '?';
                        const res = item.resultado || item.estado || '';
                        const comm = item.comentario || item.detalle || item.observacion || '';
                        reportLines.push(`- **Ejercicio ${num}**: ${res ? `_${res}_` : ''} ${comm}`);
                    });
                } else if (typeof items === 'object') {
                    Object.keys(items).forEach(key => {
                        const item = items[key];
                        const num = key.replace(/[^\d]/g, '') || key;
                        const res = item.resultado || item.estado || '';
                        const comm = item.comentario || item.detalle || item.observacion || '';
                        reportLines.push(`- **Ejercicio ${num}**: ${res ? `_${res}_` : ''} ${comm}`);
                    });
                }
            }
            
            const sugs = getField(r, [
                'sugerencias_mejora', 
                'sugerencias_pedagogicas', 
                'evaluacion_tarea.sugerencias_mejora', 
                'sugerencias'
            ]);

            if (sugs) {
                reportLines.push(`\n### 💡 Sugerencias de Mejora`);
                if (Array.isArray(sugs)) sugs.forEach(s => reportLines.push(`- ${s}`));
                else reportLines.push(sugs);
            }

            const finalOutput = reportLines.join('\n').trim();
            return finalOutput || feedback;
        } catch (err) { 
            // If it's not JSON, return as is (could be already formatted markdown)
            return feedback; 
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 animate-pulse">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando datos del aula...</p>
            </div>
        );
    }

    // ======== VISTA DE CORRECCIÓN ========
    if (selectedAssignment) {
        const gradedCount = submissions.filter(s => s.is_graded).length;
        const pendingCount = submissions.length - gradedCount;

        return (
            <div className="fixed inset-0 z-[120] bg-[#F8FAFC] flex flex-col animate-fade-in overflow-hidden">
                {/* Header Premium */}
                <header className="bg-white/90 backdrop-blur-2xl px-10 py-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 relative z-20">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => { setSelectedAssignment(null); setSelectedSubmission(null); }} 
                            className="w-12 h-12 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center group shadow-sm hover:shadow-md active:scale-95"
                            title="Volver al Aula"
                        >
                            <ArrowLeft size={20} className="text-slate-500 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="min-w-0">
                            <div className="flex items-center gap-3 mb-1.5 overflow-x-auto no-scrollbar">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${
                                    selectedAssignment.item_type === 'assessment' 
                                    ? 'bg-rose-100 text-rose-700' 
                                    : 'bg-brand-100 text-brand-700'
                                }`}>
                                    {selectedAssignment.item_type === 'assessment' ? 'Examen Final' : 'Actividad Práctica'}
                                </span>
                                <div className="h-4 w-px bg-slate-200 mx-1" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users size={12} className="text-brand-500" /> {students.length} Estudiantes
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none truncate max-w-xl">
                                {selectedAssignment.title}
                            </h2>
                        </div>
                    </div>

                    {/* Stats summary */}
                    <div className="hidden lg:flex items-center gap-8 bg-slate-50/50 border border-slate-100 px-8 py-3 rounded-[2rem]">
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Calificados</p>
                                <p className="text-xl font-black text-emerald-600 leading-none">{gradedCount}</p>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pendientes</p>
                                <p className="text-xl font-black text-amber-600 leading-none">{pendingCount}</p>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                                <Clock size={16} className="animate-pulse" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden relative z-10">
                    {/* Alumnos List Sidebar */}
                    <div className="w-96 bg-white border-r border-slate-100 flex flex-col flex-shrink-0 animate-slide-right relative z-10">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/20 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Listado Académico</h3>
                                <Filter size={14} className="text-slate-300" />
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                            {students.map(student => {
                                const sub = submissions.find(s => s.student_id === student.student_id);
                                const isSelected = selectedSubmission?.student_id === student.student_id;
                                
                                return (
                                    <button 
                                        key={student.student_id}
                                        onClick={() => sub ? handleSelectSubmission(sub) : null}
                                        disabled={!sub}
                                        className={`w-full text-left p-5 rounded-[2rem] transition-all duration-300 flex items-center gap-4 border-2 ${
                                            !sub ? 'opacity-30 bg-white border-transparent grayscale' :
                                            isSelected 
                                            ? 'bg-brand-500 border-brand-500 text-white shadow-xl shadow-brand-500/20 translate-x-2' 
                                            : 'bg-white border-slate-50 hover:border-brand-100 hover:bg-slate-50/50 shadow-sm'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 transition-colors shadow-sm ${
                                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                            {student.profiles?.full_name?.charAt(0) || 'E'}
                                        </div>
                                        
                                        <div className="min-w-0 flex-grow">
                                            <p className={`text-sm font-black truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                                {student.profiles?.full_name || 'Estudiante'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {!sub ? (
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Sin entrega</span>
                                                ) : sub.is_graded ? (
                                                    <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${isSelected ? 'text-white/70' : 'text-emerald-500'}`}>
                                                        <CheckCircle2 size={8}/> Calificado
                                                    </span>
                                                ) : (
                                                    <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${isSelected ? 'text-white' : 'text-amber-500'} animate-pulse`}>
                                                        <Clock size={8}/> Esperando
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 ml-2">
                                            {sub?.is_graded ? (
                                                <div className={`px-2 py-1.5 rounded-xl font-black text-xs border transition-all ${
                                                    isSelected 
                                                    ? 'bg-white/20 border-white/30 text-white' 
                                                    : sub.final_score >= 7 
                                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                                        : 'bg-rose-50 border-rose-100 text-rose-600'
                                                }`}>
                                                    {sub.final_score}
                                                </div>
                                            ) : sub ? (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                                    isSelected ? 'border-white/30 text-white' : 'border-slate-100 text-slate-300'
                                                }`}>
                                                    <ChevronRight size={14}/>
                                                </div>
                                            ) : (
                                                <CircleIcon size={14} className="text-slate-100" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Correction Content */}
                    <div className="flex-1 bg-slate-50/50 overflow-hidden flex flex-col relative">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.03),transparent)] pointer-events-none" />
                        
                        {selectedSubmission ? (
                            <div className="flex-1 flex overflow-hidden p-8 gap-8 relative z-10">
                                {/* Student Work Workspace */}
                                <div className="flex-1 flex flex-col min-w-0">
                                    <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden animate-scale-up">
                                        <div className="px-10 py-8 border-b border-slate-50 bg-white flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                                                    <FileText size={22} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Producción del Alumno</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Visor Académico de Entrega</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Documento Verificado</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-16 bg-slate-50/20">
                                            {(() => {
                                                try {
                                                    const parsed = JSON.parse(selectedSubmission.content);
                                                    if (parsed.responses) {
                                                        return (
                                                            <div className="max-w-4xl mx-auto space-y-12 pb-20">
                                                                {parsed.extracted_exercises?.map((ex, i) => (
                                                                    <div key={ex.id || i} className="group relative">
                                                                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-brand-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                        
                                                                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-500 overflow-hidden">
                                                                            <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                                                                                <div className="flex items-center gap-3">
                                                                                    <span className="w-8 h-8 bg-brand-600 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-lg shadow-brand-500/20">
                                                                                        {i + 1}
                                                                                    </span>
                                                                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Consigna del Docente</span>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div className="p-10 space-y-10">
                                                                                <div className="text-lg text-slate-700 leading-relaxed font-medium academic-text prose prose-slate max-w-none">
                                                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                                                                        {ex.content}
                                                                                    </ReactMarkdown>
                                                                                </div>
                                                                                
                                                                                <div className="relative pt-6">
                                                                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent" />
                                                                                    <div className="flex items-center gap-3 mb-6">
                                                                                        <div className="w-2 h-2 rounded-full bg-brand-500" />
                                                                                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">Respuesta Elaborada</span>
                                                                                    </div>
                                                                                    <div className="bg-brand-50/30 p-10 rounded-[2rem] border-2 border-brand-100/50 relative group/resp hover:bg-white hover:border-brand-500/20 transition-all duration-300">
                                                                                        <div className="text-slate-800 leading-relaxed font-semibold italic text-lg">
                                                                                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                                                                                {parsed.responses[ex.id] || "*(Sin respuesta)*"}
                                                                                            </ReactMarkdown>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                
                                                                {(!parsed.extracted_exercises || parsed.extracted_exercises.length === 0) && (
                                                                    <div className="bg-amber-50 rounded-[2rem] p-10 text-amber-700 text-sm italic flex gap-4 border border-amber-100 shadow-inner">
                                                                        <AlertTriangle size={24} className="shrink-0" /> 
                                                                        <div>
                                                                            <p className="font-black uppercase tracking-widest text-[10px] mb-2 text-amber-800">Aviso de Estructura</p>
                                                                            <p className="leading-relaxed font-medium">Este trabajo no contiene ejercicios estructurados detectables por el sistema. Mostrando el contenido bruto de la entrega.</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                } catch (e) {}
                                                
                                                return (
                                                    <div className="max-w-4xl mx-auto bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 academic-text text-xl leading-loose text-slate-800">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                                            {selectedSubmission.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar de Calificación Premium */}
                                <div className="w-[480px] flex flex-col gap-8 animate-slide-left shrink-0 pb-10 custom-scrollbar overflow-y-auto">
                                    {/* Card de IA con Smart Actions */}
                                    {selectedSubmission.ai_score_suggested && (
                                        <div className="bg-[#1E1B4B] rounded-[3.5rem] p-10 text-white shadow-2xl shadow-indigo-950/20 relative overflow-hidden group border border-white/5">
                                            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                                                <Activity size={200} />
                                            </div>
                                            
                                            <div className="relative z-10 flex justify-between items-start mb-8">
                                                <div>
                                                    <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2 border border-white/10 mb-4 text-indigo-200">
                                                        <Zap size={12} className="fill-indigo-400 text-indigo-400" /> IA Evaluadora
                                                    </div>
                                                    <h4 className="text-2xl font-black tracking-tight text-white leading-tight">Análisis Predictivo</h4>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-7xl font-black text-white leading-none tracking-tighter tabular-nums">{selectedSubmission.ai_score_suggested}</span>
                                                    <span className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] mt-2">Puntaje IA</span>
                                                </div>
                                            </div>

                                            <div className="relative z-10 bg-white/5 backdrop-blur-sm rounded-[2rem] p-8 border border-white/10 mb-8 max-h-64 overflow-y-auto custom-scrollbar-white">
                                                <div className="text-indigo-100 text-sm leading-relaxed font-medium academic-preview prose prose-invert prose-sm">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                                        {formatAiFeedback(selectedSubmission.ai_feedback)}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={handleApplyAiSuggestion}
                                                className="relative z-10 w-full bg-white text-brand-900 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-brand-50 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20 group/btn overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-brand-500/0 via-brand-500/10 to-brand-500/0 -translate-x-full group-hover/btn:animate-[shimmer_1s_infinite]" />
                                                <Plus size={18} /> Aplicar Sugerencia IA
                                            </button>
                                        </div>
                                    )}

                                    {/* Panel Principal de Calificación */}
                                    <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-2xl shadow-slate-200/50 flex-grow flex flex-col space-y-10 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[6rem] -z-10" />
                                        
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                                                <CheckCircle2 size={24} />
                                            </div>
                                            <h4 className="text-xl font-black text-slate-800 tracking-tight">Veredicto Final</h4>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 group focus-within:bg-white focus-within:border-brand-500/30 transition-all duration-300">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-6 px-2">Calificación Numérica (1-10)</label>
                                                <div className="flex items-center gap-6">
                                                    <div className="relative flex-grow">
                                                        <input 
                                                            type="number" min="1" max="10" step="0.5"
                                                            value={editScore}
                                                            onChange={(e) => setEditScore(e.target.value)}
                                                            className="w-full bg-transparent text-7xl font-black text-slate-900 border-none p-0 focus:ring-0 placeholder:text-slate-100"
                                                            placeholder="0"
                                                        />
                                                        <div className="absolute bottom-4 right-0 text-slate-300 font-black text-2xl">/ 10</div>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <button onClick={() => setEditScore(prev => Math.min(10, parseFloat(prev || 0) + 0.5).toString())} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:text-brand-600 hover:border-brand-600 transition-all active:scale-90 shadow-sm">+</button>
                                                        <button onClick={() => setEditScore(prev => Math.max(0, parseFloat(prev || 0) - 0.5).toString())} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:text-brand-600 hover:border-brand-600 transition-all active:scale-90 shadow-sm">-</button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex justify-between items-center">
                                                    <span>Devolución al Alumno</span>
                                                    <span className="text-brand-500 lowercase font-medium tracking-tight">markdown compatible</span>
                                                </label>
                                                <textarea 
                                                    value={editFeedback}
                                                    onChange={(e) => setEditFeedback(e.target.value)}
                                                    rows="8"
                                                    className="w-full bg-slate-50 rounded-[2rem] p-8 text-base font-semibold text-slate-700 leading-relaxed border-2 border-transparent focus:border-brand-500/20 focus:ring-8 focus:ring-brand-500/5 focus:bg-white transition-all resize-none custom-scrollbar"
                                                    placeholder="Escribe tus observaciones pedagógicas aquí..."
                                                />
                                            </div>

                                            <PremiumButton 
                                                onClick={handleSaveGrade}
                                                loading={isSavingGrade}
                                                disabled={!editScore}
                                                className="w-full !py-8 !rounded-[2rem] text-sm shadow-2xl shadow-brand-500/30 font-black uppercase tracking-[0.2em]"
                                                icon={<Save size={22} />}
                                            >
                                                Publicar Nota Final
                                            </PremiumButton>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-fade-in select-none">
                                <div className="relative mb-12">
                                    <div className="absolute inset-0 bg-brand-500/10 blur-[100px] rounded-full" />
                                    <div className="w-40 h-40 bg-white rounded-[3rem] border border-slate-100 shadow-2xl flex items-center justify-center relative z-10">
                                        <SearchIcon size={80} className="text-slate-100 group-hover:scale-110 transition-transform" />
                                        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-brand-500 text-white rounded-2xl flex items-center justify-center shadow-2xl transform rotate-12">
                                            <Activity size={32} />
                                        </div>
                                    </div>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Módulo de Corrección</h3>
                                <p className="text-slate-500 font-semibold text-lg max-w-lg leading-relaxed">
                                    Selecciona un estudiante del panel lateral para comenzar el proceso de evaluación y feedback personalizado.
                                </p>
                                <div className="mt-12 flex gap-4">
                                    <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 font-bold text-sm">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {gradedCount} Calificados
                                    </div>
                                    <div className="flex items-center gap-3 px-6 py-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 font-bold text-sm">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> {pendingCount} Pendientes
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Modal Confirmar Eliminación Actividad */}
                <PremiumModal 
                    isOpen={!!isDeletingActivity} 
                    onClose={() => setIsDeletingActivity(null)}
                    title="¿Remover Actividad?"
                    maxWidth="max-w-md"
                >
                    <div className="space-y-6 text-center py-4">
                        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Acción Crítica</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                Estás por remover <span className="text-slate-900 font-black">"{isDeletingActivity?.title}"</span> de este aula. 
                                Los alumnos ya no podrán verla ni entregar trabajos.
                            </p>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <PremiumButton variant="secondary" onClick={() => setIsDeletingActivity(null)} className="flex-1">Conservar</PremiumButton>
                            <PremiumButton onClick={handleDeleteAssignment} className="flex-1 !bg-rose-500 hover:!bg-rose-600 shadow-rose-200">Remover</PremiumButton>
                        </div>
                    </div>
                </PremiumModal>
            </div>
        );
    }

    // ======== VISTA GENERAL ========
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

            {/* Header */}
            <div className="flex items-center gap-6">
                <button onClick={onBack} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all hover:shadow-sm">
                    <ArrowLeft size={20} className="text-slate-500" />
                </button>
                <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">ID: {classroom.join_code}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1"><Users size={12}/> {students.length} Miembros</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2 truncate">{classroom.name}</h1>
                </div>
                <div className="hidden md:flex gap-8 px-8 py-4 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
                    <div className="text-center">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Activas</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{assignments.length}</p>
                    </div>
                    <div className="w-px h-auto bg-slate-100" />
                    <div className="text-center">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Alumnos</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{students.length}</p>
                    </div>
                </div>
            </div>

            {/* Navigation & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <PremiumTabs 
                    activeTab={activeTab} 
                    onChange={setActiveTab} 
                    tabs={[
                        { id: 'assignments', label: 'Plan de Trabajo', icon: <ClipboardCheck size={14}/> },
                        { id: 'students', label: 'Mi Auditorio', icon: <Users size={14}/> },
                        { id: 'grades', label: 'Libreta de Calificaciones', icon: <Award size={14}/> }
                    ]}
                />
                
                {activeTab === 'assignments' && (
                    <PremiumButton onClick={openAssignModal} icon={<Plus size={20}/>} className="!rounded-2xl !py-3.5">
                        Nueva Actividad
                    </PremiumButton>
                )}

                {activeTab === 'grades' && assignments.length > 0 && (
                    <PremiumButton variant="secondary" onClick={() => {
                        const header = ['Estudiante', 'Email', ...assignments.map(a => a.title), 'Promedio'];
                        const rows = students.map(st => {
                            const studentSubs = gradeMatrix[st.student_id] || {};
                            const scores = assignments.map(a => {
                                const sub = studentSubs[a.id];
                                return sub?.is_graded ? sub.final_score : '-';
                            });
                            const numericScores = scores.filter(s => typeof s === 'number').map(Number);
                            const avg = numericScores.length > 0 ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(1) : '-';
                            return [st.profiles?.full_name || '-', st.profiles?.email || '-', ...scores, avg];
                        });
                        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url;
                        a.download = `notas_${classroom.name.replace(/\s+/g, '_')}.csv`;
                        a.click(); URL.revokeObjectURL(url);
                    }} icon={<Download size={18}/>}>
                        Reporte CSV
                    </PremiumButton>
                )}
            </div>

            {/* Content Views */}
            <div className="animate-fade-in">
                {activeTab === 'assignments' && (
                    <div className="space-y-6">
                        {assignments.length === 0 ? (
                            <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-100 flex flex-col items-center">
                                <HistoryIcon size={48} className="text-slate-200 mb-6" />
                                <h3 className="text-2xl font-black text-slate-800 mb-2">No hay actividades publicadas</h3>
                                <p className="text-slate-500 font-medium max-w-sm mb-10">Empieza asignando secuencias o evaluaciones para que tus estudiantes puedan completar sus tareas.</p>
                                <PremiumButton variant="secondary" onClick={openAssignModal} icon={<Plus size={18}/>}>Publicar la primera</PremiumButton>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {assignments.map(a => (
                                    <PremiumCard key={a.id} noPadding className="flex flex-col group hover:ring-2 hover:ring-brand-500/10 transition-all">
                                        <div className="p-8 border-b border-slate-50">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${a.item_type === 'assessment' ? 'bg-indigo-50 text-indigo-600' : 'bg-brand-50 text-brand-600'}`}>
                                                    {a.item_type === 'assessment' ? 'Evaluación' : 'Secuencia Didáctica'}
                                                </span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setIsDeletingActivity({ id: a.id, title: a.title })} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-black text-slate-900 leading-tight mb-2 group-hover:text-brand-600 transition-colors">{a.title}</h4>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tight">
                                                <Calendar size={14}/> Creado {new Date(a.created_at).toLocaleDateString()}
                                                {a.due_date && <span className="text-rose-400 ml-2">&bull; Expira {new Date(a.due_date).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => loadSubmissionsForAssignment(a)}
                                            className="p-5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-900 hover:text-white transition-all rounded-b-[inherit]"
                                        >
                                            Ver Entregas
                                            <ExternalLink size={14} />
                                        </button>
                                    </PremiumCard>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'students' && (
                    <PremiumTable 
                        headers={[
                            { label: 'Estudiante' },
                            { label: 'Identificación / Email' },
                            { label: 'Status' },
                            { label: 'Membresía Desde', className: 'text-right' }
                        ]}
                    >
                        {students.length === 0 ? (
                            <tr><td colSpan="4" className="p-20 text-center text-slate-400 font-medium">Aún no hay alumnos en este aula.</td></tr>
                        ) : students.map((st, i) => (
                            <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                                            {st.profiles?.full_name?.[0] || 'A'}
                                        </div>
                                        <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{st.profiles?.full_name || '-'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-sm font-medium text-slate-500">{st.profiles?.email}</td>
                                <td className="px-6 py-5">
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-black uppercase tracking-widest">Activo</span>
                                </td>
                                <td className="px-6 py-5 text-right text-xs font-bold text-slate-400">{new Date(st.joined_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </PremiumTable>
                )}

                {activeTab === 'grades' && (
                    <div className="space-y-6">
                        {matrixLoading ? (
                            <div className="p-20 bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center">
                                <Loader2 size={40} className="animate-spin text-brand-500 mb-4" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Generando Matriz Académica...</p>
                            </div>
                        ) : assignments.length === 0 ? (
                            <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-24 text-center text-slate-300">
                                <Award size={56} className="mx-auto mb-6 opacity-20" />
                                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Libreta de Notas Vacía</h3>
                            </div>
                        ) : (
                            <div className="relative group/table animate-scale-up">
                                <PremiumTable 
                                    headers={[
                                        { label: 'Filiación del Alumno', className: 'sticky left-0 bg-slate-50 z-20 shadow-[2px_0_10px_rgba(0,0,0,0.02)]' },
                                        ...assignments.map(a => ({ 
                                            label: a.title, 
                                            className: 'text-center' 
                                        })),
                                        { label: 'Promedio', className: 'text-center font-black text-slate-900 bg-slate-50 sticky right-0 z-20' }
                                    ]}
                                >
                                    {students.map((st) => {
                                        const studentSubs = gradeMatrix[st.student_id] || {};
                                        const numericScores = assignments.map(a => studentSubs[a.id]?.is_graded ? studentSubs[a.id].final_score : null).filter(s => s !== null);
                                        const avg = numericScores.length > 0 ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(1) : null;
                                        
                                        return (
                                            <tr key={st.student_id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-5 sticky left-0 bg-white z-10 group-hover:bg-slate-50 border-r border-slate-50 min-w-[200px]">
                                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{st.profiles?.full_name || 'Estudiante'}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{st.profiles?.email}</p>
                                                </td>
                                                {assignments.map(a => {
                                                    const sub = studentSubs[a.id];
                                                    return (
                                                        <td key={a.id} className="px-4 py-5 text-center min-w-[120px]">
                                                            {!sub ? (
                                                                <span className="text-slate-200 text-lg font-black">—</span>
                                                            ) : sub.is_graded ? (
                                                                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl font-black text-base shadow-sm ring-2 ring-white ${
                                                                    sub.final_score >= 7 ? 'bg-emerald-100 text-emerald-800' :
                                                                    sub.final_score >= 4 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                                                }`}>
                                                                    {sub.final_score}
                                                                </div>
                                                            ) : sub.ai_score_suggested ? (
                                                                <div className="flex flex-col items-center gap-1 group/ai">
                                                                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 font-black text-xs flex items-center justify-center border-2 border-purple-100 group-hover/ai:bg-purple-600 group-hover/ai:text-white transition-all">
                                                                        {sub.ai_score_suggested}
                                                                    </div>
                                                                    <span className="text-[8px] font-black text-purple-500 tracking-widest">IA</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-md uppercase tracking-widest border border-amber-100">Pendiente</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-5 text-center sticky right-0 bg-white z-10 group-hover:bg-slate-50 border-l border-slate-50">
                                                    {avg ? (
                                                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-[1.25rem] font-black text-lg shadow-md border-4 border-white ${
                                                            avg >= 7 ? 'bg-brand-600 text-white' : 'bg-slate-900 text-white'
                                                        }`}>
                                                            {avg}
                                                        </div>
                                                    ) : <span className="text-slate-200 text-lg font-black">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </PremiumTable>
                                
                                <div className="mt-8 flex flex-wrap items-center gap-8 justify-center bg-white p-6 rounded-[2rem] border border-slate-100 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-lg bg-emerald-100 shadow-inner"></div> Calificado</div>
                                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-lg bg-purple-100 border-2 border-purple-200"></div> Sugerencia IA</div>
                                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-lg bg-amber-50 border border-amber-200"></div> En Espera</div>
                                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-lg bg-slate-100"></div> Sin Registro</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL: ASIGNACIÓN */}
            <PremiumModal 
                isOpen={isAssignModalOpen} 
                onClose={() => setIsAssignModalOpen(false)}
                title="Publicar Actividad"
                maxWidth="max-w-4xl"
                footer={(
                    <div className="flex justify-between items-center gap-6">
                        <div className="flex-grow flex items-center gap-6 pr-6 border-r border-slate-100">
                            <div className="grid grid-cols-1 gap-2 flex-grow">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Calendar size={12}/> Plazo de Entrega (Opcional)
                                </label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-brand-500/10 placeholder:text-slate-300"
                                    value={assignDueDate}
                                    onChange={(e) => setAssignDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 min-w-fit">
                            <PremiumButton variant="secondary" onClick={() => setIsAssignModalOpen(false)}>Descartar</PremiumButton>
                            <PremiumButton onClick={handleAssignActivity} loading={isAssigning} disabled={!selectedItem}>Publicar en Aula</PremiumButton>
                        </div>
                    </div>
                )}
            >
                <div className="space-y-8 min-h-[400px]">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 w-fit shrink-0">
                            <button onClick={() => { setAssignTab('secuencias'); setSelectedItem(null); }}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${assignTab === 'secuencias' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Secuencias</button>
                            <button onClick={() => { setAssignTab('evaluaciones'); setSelectedItem(null); }}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${assignTab === 'evaluaciones' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Evaluaciones</button>
                        </div>
                        <div className="flex-grow relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                                type="text" placeholder="Filtrar por tema..."
                                className="w-full pl-12 pr-6 py-3.5 bg-slate-100/50 border-none rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-4 focus:ring-brand-500/10"
                                value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loadingContent ? (
                            <div className="col-span-2 py-20 flex flex-col items-center justify-center text-center opacity-30">
                                <Loader2 size={32} className="animate-spin mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">Sincronizando Repositorio...</p>
                            </div>
                        ) : (
                            (assignTab === 'secuencias' ? savedSequences : savedAssessments)
                            .filter(x => !assignSearch || x.topic.toLowerCase().includes(assignSearch.toLowerCase()))
                            .map(item => (
                                <button key={item.id} onClick={() => setSelectedItem(item)}
                                    className={`flex items-center gap-5 p-5 rounded-3xl border-2 text-left transition-all ${
                                        selectedItem?.id === item.id 
                                        ? 'bg-brand-50 border-brand-500 shadow-xl shadow-brand-500/5 ring-4 ring-brand-500/5' 
                                        : 'bg-white border-slate-100 hover:border-brand-200'
                                    }`}>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                                        selectedItem?.id === item.id ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-400'
                                    }`}>
                                        {assignTab === 'secuencias' ? <BookOpen size={24}/> : <ClipboardCheck size={24}/>}
                                    </div>
                                    <div className="min-w-0 flex-grow">
                                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{item.subject} &bull; {item.year}</div>
                                        <h5 className="font-black text-slate-900 group-hover:text-brand-600 transition-colors truncate text-sm uppercase tracking-tight">{item.topic}</h5>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md uppercase">ID: {item.id.slice(0,5)}</span>
                                            {selectedItem?.id === item.id && <CheckCircle2 size={16} className="text-brand-600 ml-auto" />}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </PremiumModal>
        </div>
    );
};

export default ClassroomDetail;
