import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sequenceDbService } from '../lib/sequenceDbService';
import { ArrowLeft, Users, Eye, FileText, ClipboardCheck, MessageSquare, Loader2, Save, Download, Activity, Plus, Search, X, BookOpen, Circle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

const ClassroomDetail = ({ classroom, onBack }) => {
    const [assignments, setAssignments] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('assignments'); // 'assignments', 'students', 'grades'
    
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
    const [assignTab, setAssignTab] = useState('secuencias'); // 'secuencias' | 'evaluaciones'
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

    const loadClassroomData = async () => {
        setLoading(true);
        try {
            // 1. Load Assignments
            const { data: assignmentsData, error: asnError } = await supabase
                .from('classroom_assignments')
                .select('*')
                .eq('classroom_id', classroom.id)
                .order('created_at', { ascending: false });
            if (asnError) throw asnError;
            setAssignments(assignmentsData || []);

            // 2. Load Students
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
            alert('Error al cargar datos del aula.');
        } finally {
            setLoading(false);
        }
    };

    const loadGradeMatrix = async () => {
        setMatrixLoading(true);
        try {
            // Load ALL submissions for all assignments in this classroom
            const assignmentIds = assignments.map(a => a.id);
            if (assignmentIds.length === 0) { setMatrixLoading(false); return; }

            const { data, error } = await supabase
                .from('student_submissions')
                .select('student_id, assignment_id, final_score, ai_score_suggested, is_graded')
                .in('assignment_id', assignmentIds);

            if (error) throw error;

            // Build matrix { student_id -> { assignment_id -> submission } }
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

    // Load matrix when grades tab is activated
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
                console.error('Error cargando contenido:', err);
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
            // Reload assignments list
            await loadClassroomData();
            alert(`¡"${selectedItem.topic}" asignado al aula exitosamente!`);
        } catch (err) {
            alert('Error al asignar: ' + err.message);
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
        }
    };

    const handleSelectSubmission = (sub) => {
        setSelectedSubmission(sub);
        // Pre-fill editable fields with AI suggestions or existing teacher grades
        setEditScore(sub.is_graded ? sub.final_score.toString() : (sub.ai_score_suggested?.toString() || ''));
        
        // Formatear el feedback si es JSON antes de ponerlo en el textarea
        const initialFeedback = sub.is_graded ? (sub.teacher_feedback || '') : (sub.ai_feedback || '');
        setEditFeedback(formatAiFeedback(initialFeedback));
    };

    const handleSaveGrade = async () => {
        if (!editScore || isNaN(editScore) || Number(editScore) < 1 || Number(editScore) > 10) {
            alert("La calificación debe ser un número entre 1 y 10.");
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

            // Update local state
            setSelectedSubmission(prev => ({ ...prev, ...data }));
            setSubmissions(prev => prev.map(s => s.id === data.id ? { ...s, ...data } : s));
            
            alert("¡Calificación guardada y publicada!");
            
        } catch (error) {
            console.error("Error saving grade:", error);
            alert("Error al guardar la calificación.");
        } finally {
            setIsSavingGrade(false);
        }
    };

    const formatAiFeedback = (feedback) => {
        if (!feedback) return "";
        try {
            // Detectamos y extraemos el JSON incluso si tiene texto antes (como "Devolución automática:")
            let cleanJson = feedback.trim();
            const firstBrace = cleanJson.indexOf('{');
            const firstBracket = cleanJson.indexOf('[');
            const startIdx = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
            
            if (startIdx !== -1) {
                const lastBrace = cleanJson.lastIndexOf('}');
                const lastBracket = cleanJson.lastIndexOf(']');
                const endIdx = Math.max(lastBrace, lastBracket);
                
                if (endIdx > startIdx) {
                    cleanJson = cleanJson.substring(startIdx, endIdx + 1);
                }
            } else if (!cleanJson.startsWith("{") && !cleanJson.startsWith("[")) {
                return feedback; // No es JSON
            }

            const r = JSON.parse(cleanJson);
            const reportLines = [];
            
            // Section: General Overview
            const generalObs = r.feedback || r.comentarios_pedagogicos || r.evaluacion_tarea?.comentarios_pedagogicos || r.resumen_desempeno?.observaciones_generales || r.resumen_evaluacion || r.observaciones;
            if (generalObs) {
                reportLines.push(`### 📝 Observaciones Generales\n${generalObs}`);
            }

            // Section: Performance analysis (by item or general)
            const items = r.analisis_por_item || r.analisis_detallado || r.analisis_ejercicios || r.items || r.analisis_de_desempeno;
            if (items && Array.isArray(items)) {
                reportLines.push(`\n### 🔍 Análisis por Item`);
                items.forEach(item => {
                    const num = item.item || item.id || item.ejercicio || item.pregunta || '?';
                    const res = item.resultado || item.estado || '';
                    const comm = item.comentario || item.detalle || item.observacion || '';
                    reportLines.push(`- **Ejercicio ${num}**: ${res ? `_${res}_` : ''} ${comm}`);
                });
            } else if (items && typeof items === 'object') {
                reportLines.push(`\n### 🔍 Análisis por Item`);
                Object.keys(items).forEach(key => {
                    const item = items[key];
                    const num = key.replace('ejercicio', '') || '?';
                    const res = item.resultado || item.estado || '';
                    const comm = item.comentario || item.detalle || item.observacion || '';
                    reportLines.push(`- **Ejercicio ${num}**: ${res ? `_${res}_` : ''} ${comm}`);
                });
            }
            
            // Section: Suggestions
            const sugs = r.sugerencias_mejora || r.sugerencias_pedagogicas || r.evaluacion_tarea?.sugerencias_mejora || r.sugerencias;
            if (sugs) {
                reportLines.push(`\n### 💡 Sugerencias de Mejora`);
                if (Array.isArray(sugs)) {
                    sugs.forEach(s => reportLines.push(`- ${s}`));
                } else {
                    reportLines.push(sugs);
                }
            }

            const finalReport = reportLines.join('\n');
            return finalReport.trim() || feedback;
        } catch (err) {
            return feedback;
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12"><Loader2 size={32} className="animate-spin text-brand-500"/></div>
    );

    // ======== VISTA DE CORRECCIÓN (Selected Assignment) ========
    if (selectedAssignment) {
        return (
            <div className="flex flex-col h-full bg-slate-50">
                <header className="bg-white px-6 py-4 border-b border-slate-200 flex items-center gap-4 flex-shrink-0">
                    <button onClick={() => { setSelectedAssignment(null); setSelectedSubmission(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft size={20} className="text-slate-500" />
                    </button>
                    <div>
                        <div className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-1">Revisión de Tareas</div>
                        <h2 className="text-xl font-black text-slate-800">{selectedAssignment.title}</h2>
                    </div>
                </header>

                <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
                    {/* Lista de Alumnos/Entregas */}
                    <div className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0 max-h-[250px] lg:max-h-full overflow-y-auto">
                        <div className="p-3 lg:p-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
                            <h3 className="font-bold text-slate-700 text-sm">Entregas ({submissions.length}/{students.length})</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {students.map(student => {
                                const sub = submissions.find(s => s.student_id === student.student_id);
                                const isSelected = selectedSubmission?.student_id === student.student_id;
                                
                                return (
                                    <button 
                                        key={student.student_id}
                                        onClick={() => sub ? handleSelectSubmission(sub) : null}
                                        disabled={!sub}
                                        className={`w-full text-left p-3 rounded-xl mb-1 transition-all flex items-center justify-between ${
                                            !sub ? 'opacity-50 cursor-not-allowed' :
                                            isSelected ? 'bg-brand-50 border border-brand-200' : 'hover:bg-slate-50 border border-transparent'
                                        }`}
                                    >
                                        <div className="truncate pr-2">
                                            <div className={`text-sm font-bold truncate ${isSelected ? 'text-brand-700' : 'text-slate-700'}`}>
                                                {student.profiles?.full_name || 'Estudiante'}
                                            </div>
                                            <div className="text-[10px] text-slate-500 truncate">{student.profiles?.email}</div>
                                        </div>
                                        <div>
                                            {!sub ? <Circle size={16} className="text-slate-300" /> :
                                             sub.is_graded ? <div className="bg-emerald-100 text-emerald-700 font-black text-xs px-2 py-1 rounded">{sub.final_score}</div> :
                                             <div className="bg-amber-100 text-amber-700 font-black text-[10px] px-2 py-1 rounded uppercase tracking-wider">A Evaluar</div>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Panel de Corrección */}
                    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                        {selectedSubmission ? (
                            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
                                
                                {/* Respuesta del Estudiante */}
                                <div className="flex-1 bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                                    <div className="bg-slate-100/50 border-b border-slate-200 p-4">
                                        <h3 className="font-bold text-slate-700 text-sm">Respuesta del Estudiante</h3>
                                        <div className="text-xs text-slate-500 mt-1">Entregado: {new Date(selectedSubmission.submitted_at).toLocaleString()}</div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 prose prose-slate max-w-none custom-scrollbar">
                                        {(() => {
                                            try {
                                                const parsed = JSON.parse(selectedSubmission.content);
                                                if (parsed.responses) {
                                                    return (
                                                        <div className="space-y-8">
                                                            {parsed.extracted_exercises?.map((ex, i) => (
                                                                <div key={ex.id || i} className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                                                    <div className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Ejercicio {i + 1}</div>
                                                                    <div className="mb-4 prose prose-sm max-w-none text-slate-700">
                                                                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                                                            {ex.content}
                                                                        </ReactMarkdown>
                                                                    </div>
                                                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative mt-6">
                                                                        <div className="absolute -top-3 left-4 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-emerald-200">
                                                                            Respuesta del Alumno
                                                                        </div>
                                                                        <div className="prose prose-sm max-w-none mt-1 text-slate-800 font-medium whitespace-pre-wrap">
                                                                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                                                                {parsed.responses[ex.id] || "*(Sin respuesta)*"}
                                                                            </ReactMarkdown>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {(!parsed.extracted_exercises || parsed.extracted_exercises.length === 0) && (
                                                                <div className="text-slate-500 italic">No hay ejercicios estructurados.</div>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                            } catch (e) {
                                                // Es texto plano (versión legacy anterior)
                                            }
                                            
                                            // Fallback
                                            return (
                                                <ReactMarkdown 
                                                    remarkPlugins={[remarkGfm, remarkMath]} 
                                                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                                                >
                                                    {selectedSubmission.content}
                                                </ReactMarkdown>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Panel Lateral (AutoGrader & Calificación Final) */}
                                <div className="w-full lg:w-[400px] flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-6 pr-2">
                                    
                                    {/* Sugerencia IA */}
                                    {selectedSubmission.ai_score_suggested && (
                                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-3xl p-5 shadow-sm">
                                            <div className="flex items-center gap-2 text-purple-700 font-black text-sm uppercase tracking-widest mb-3">
                                                <Activity size={16} />
                                                Sugerencia de la IA
                                            </div>
                                            <div className="flex items-end gap-2 mb-3">
                                                <span className="text-3xl font-black text-purple-900 leading-none">{selectedSubmission.ai_score_suggested}</span>
                                                <span className="text-purple-600 font-bold mb-1">/ 10</span>
                                            </div>
                                            <div className="bg-white/60 p-3 rounded-xl text-sm font-medium text-purple-900/80 prose prose-sm max-w-none break-words">
                                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                                    {formatAiFeedback(selectedSubmission.ai_feedback)}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}

                                    {/* Formulario de Calificación Docente */}
                                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                                        <div className="flex items-center gap-2 text-slate-700 font-black text-sm uppercase tracking-widest mb-4">
                                            <ClipboardCheck size={16} />
                                            Calificación Final
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nota (1 a 10)</label>
                                                <input 
                                                    type="number" 
                                                    min="1" max="10" step="0.5"
                                                    value={editScore}
                                                    onChange={(e) => setEditScore(e.target.value)}
                                                    className="w-24 text-2xl font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Devolución al Alumno</label>
                                                <textarea 
                                                    value={editFeedback}
                                                    onChange={(e) => setEditFeedback(e.target.value)}
                                                    rows="5"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                                    placeholder="Escribe tus comentarios aquí... Puedes usar lo sugerido por la IA."
                                                />
                                            </div>

                                            <button 
                                                onClick={handleSaveGrade}
                                                disabled={isSavingGrade || !editScore}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                                            >
                                                {isSavingGrade ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                                Guardar y Publicar
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                                <Eye size={48} className="mb-4 opacity-20" />
                                <p className="font-medium text-lg text-slate-600 mb-1">Selecciona una entrega</p>
                                <p className="text-sm">Haz clic en un estudiante en el panel izquierdo para ver y corregir su trabajo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ======== VISTA GENERAL DEL AULA ========
    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                    <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight truncate pr-4">{classroom.name}</h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm font-medium text-slate-500">
                        <span className="flex items-center gap-1"><Users size={14}/> {students.length} alumnos</span>
                        <span className="hidden sm:inline w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span className="font-mono text-brand-600 font-bold bg-brand-50 px-2 rounded">Código: {classroom.join_code}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 sm:space-x-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
                {[{id:'assignments', label:'Trabajos', icon:ClipboardCheck}, 
                  {id:'students', label:'Alumnos', icon:Users},
                  {id:'grades', label:'Notas', icon:FileText}].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                            activeTab === tab.id 
                                ? 'border-brand-500 text-brand-600 bg-brand-50/50' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            <div className="py-2">
                {activeTab === 'assignments' && (
                    <div className="space-y-4">
                        {/* Header: Agregar Actividad */}
                        <div className="flex justify-end">
                            <button
                                onClick={openAssignModal}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow-brand-500/25 active:scale-95"
                            >
                                <Plus size={18} />
                                Agregar Actividad
                            </button>
                        </div>
                        {assignments.length === 0 ? (
                            <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-12 text-center text-slate-400">
                                <p>Aún no has publicado tareas en esta aula.</p>
                                <p className="text-sm mt-2">Ve a "Mis Secuencias" o "Evaluaciones" para asignar contenido a esta clase.</p>
                            </div>
                        ) : (
                            assignments.map(assignment => (
                                <div key={assignment.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-brand-200 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md ${assignment.item_type === 'assessment' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700'}`}>
                                                {assignment.item_type === 'assessment' ? 'Evaluación' : 'Actividad'}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">Asignado el {new Date(assignment.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">{assignment.title}</h3>
                                    </div>
                                    <button 
                                        onClick={() => loadSubmissionsForAssignment(assignment)}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
                                    >
                                        <MessageSquare size={16} />
                                        Ver Entregas y Corregir
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="bg-white border border-slate-200 rounded-2xl lg:rounded-3xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[500px]">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-widest font-black text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Estudiante</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Fecha de Ingreso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-sm">
                                {students.map((st, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-bold">{st.profiles?.full_name || '-'}</td>
                                        <td className="px-6 py-4">{st.profiles?.email}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(st.joined_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'grades' && (
                    matrixLoading ? (
                        <div className="flex items-center justify-center p-16">
                            <Loader2 size={32} className="animate-spin text-brand-500 mr-3" />
                            <span className="text-slate-500 font-medium">Cargando calificaciones...</span>
                        </div>
                    ) : assignments.length === 0 ? (
                        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400">
                            <FileText size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-medium">No hay tareas publicadas en esta aula todavía.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Export button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => {
                                        // Export CSV
                                        const header = ['Estudiante', 'Email', ...assignments.map(a => a.title), 'Promedio'];
                                        const rows = students.map(st => {
                                            const studentSubs = gradeMatrix[st.student_id] || {};
                                            const scores = assignments.map(a => {
                                                const sub = studentSubs[a.id];
                                                return sub?.is_graded ? sub.final_score : (sub?.ai_score_suggested ? `IA:${sub.ai_score_suggested}` : '-');
                                            });
                                            const numericScores = scores.filter(s => typeof s === 'number' || (!isNaN(parseFloat(s)) && !String(s).startsWith('IA')));
                                            const avg = numericScores.length > 0 ? (numericScores.reduce((a, b) => a + parseFloat(b), 0) / numericScores.length).toFixed(1) : '-';
                                            return [st.profiles?.full_name || '-', st.profiles?.email || '-', ...scores, avg];
                                        });
                                        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
                                        const blob = new Blob([csv], { type: 'text/csv' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `notas_${classroom.name.replace(/\s+/g, '_')}.csv`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
                                >
                                    <Download size={16} />
                                    Exportar CSV
                                </button>
                            </div>

                            {/* Grade Grid */}
                            <div className="bg-white border border-slate-200 rounded-3xl overflow-x-auto shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-xs uppercase tracking-widest font-black text-slate-500 sticky left-0 bg-slate-50 z-10 min-w-[180px]">Estudiante</th>
                                            {assignments.map(a => (
                                                <th key={a.id} className="px-4 py-4 text-xs uppercase tracking-widest font-black text-slate-500 text-center min-w-[120px]">
                                                    <div className="truncate max-w-[100px] mx-auto" title={a.title}>{a.title}</div>
                                                    <span className={`text-[9px] font-bold mt-1 inline-block px-1.5 py-0.5 rounded ${a.item_type === 'assessment' ? 'bg-purple-100 text-purple-600' : 'bg-brand-100 text-brand-600'}`}>
                                                        {a.item_type === 'assessment' ? 'Eval.' : 'Act.'}
                                                    </span>
                                                </th>
                                            ))}
                                            <th className="px-4 py-4 text-xs uppercase tracking-widest font-black text-emerald-600 text-center min-w-[100px]">Promedio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {students.map((st) => {
                                            const studentSubs = gradeMatrix[st.student_id] || {};
                                            const scores = assignments.map(a => {
                                                const sub = studentSubs[a.id];
                                                if (!sub) return null;
                                                if (sub.is_graded) return sub.final_score;
                                                return sub.ai_score_suggested || null;
                                            });
                                            const numericFinal = assignments.map(a => {
                                                const sub = studentSubs[a.id];
                                                return sub?.is_graded ? sub.final_score : null;
                                            }).filter(s => s !== null);
                                            const avg = numericFinal.length > 0 
                                                ? (numericFinal.reduce((a, b) => a + b, 0) / numericFinal.length).toFixed(1) 
                                                : null;
                                            
                                            return (
                                                <tr key={st.student_id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 sticky left-0 bg-white z-10 border-r border-slate-100">
                                                        <div className="font-bold text-slate-800 text-sm">{st.profiles?.full_name || 'Estudiante'}</div>
                                                        <div className="text-xs text-slate-500 truncate max-w-[160px]">{st.profiles?.email}</div>
                                                    </td>
                                                    {assignments.map((a, i) => {
                                                        const sub = studentSubs[a.id];
                                                        const score = scores[i];
                                                        return (
                                                            <td key={a.id} className="px-4 py-4 text-center">
                                                                {!sub ? (
                                                                    <span className="text-slate-300 font-medium text-sm">—</span>
                                                                ) : sub.is_graded ? (
                                                                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm ${
                                                                        score >= 7 ? 'bg-emerald-100 text-emerald-700' :
                                                                        score >= 4 ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>
                                                                        {score}
                                                                    </div>
                                                                ) : sub.ai_score_suggested ? (
                                                                    <div className="inline-flex flex-col items-center">
                                                                        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 font-black text-xs flex items-center justify-center">
                                                                            {sub.ai_score_suggested}
                                                                        </div>
                                                                        <span className="text-[9px] text-purple-500 font-bold mt-0.5">IA</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-lg">Pendiente</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-4 py-4 text-center">
                                                        {avg ? (
                                                            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl font-black text-base border-2 ${
                                                                avg >= 7 ? 'border-emerald-400 text-emerald-700 bg-emerald-50' :
                                                                avg >= 4 ? 'border-amber-400 text-amber-700 bg-amber-50' :
                                                                'border-red-400 text-red-700 bg-red-50'
                                                            }`}>
                                                                {avg}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 font-medium">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-4 text-xs font-medium text-slate-500">
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-100"></div>Calificado por docente</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-purple-100 border border-purple-200"></div>Sugerencia IA (pendiente revisión)</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-200"></div>Sin entregar</div>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* ======== MODAL: AGREGAR ACTIVIDAD ======== */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">Agregar Actividad al Aula</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Selecciona una secuencia o evaluación de tu repositorio</p>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Tabs picker */}
                        <div className="px-6 pt-4 flex gap-2 flex-shrink-0">
                            {[{id: 'secuencias', label: 'Secuencias Didácticas'}, {id: 'evaluaciones', label: 'Evaluaciones'}].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => { setAssignTab(t.id); setSelectedItem(null); setAssignSearch(''); }}
                                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                                        assignTab === t.id ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="px-6 py-3 flex-shrink-0">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={assignSearch}
                                    onChange={(e) => setAssignSearch(e.target.value)}
                                    placeholder="Buscar por tema..."
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                            </div>
                        </div>

                        {/* Content List */}
                        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
                            {loadingContent ? (
                                <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
                            ) : (() => {
                                const items = (assignTab === 'secuencias' ? savedSequences : savedAssessments)
                                    .filter(item => !assignSearch || item.topic?.toLowerCase().includes(assignSearch.toLowerCase()) || item.subject?.toLowerCase().includes(assignSearch.toLowerCase()));
                                
                                if (items.length === 0) return (
                                    <div className="text-center py-12 text-slate-400">
                                        <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
                                        <p className="font-medium text-slate-500">Sin resultados.</p>
                                        {savedSequences.length === 0 && savedAssessments.length === 0 && (
                                            <p className="text-sm mt-1">No tienes contenido guardado todavía.</p>
                                        )}
                                    </div>
                                );

                                return items.map(item => {
                                    const isSelected = selectedItem?.id === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setSelectedItem(isSelected ? null : item)}
                                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                                                isSelected 
                                                    ? 'border-brand-400 bg-brand-50' 
                                                    : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-800 truncate">{item.topic}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {item.subject && <span>{item.subject}</span>}
                                                        {item.year && <span> · {item.year}</span>}
                                                        {item.type && <span> · {item.type}</span>}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                });
                            })()}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4 flex-shrink-0 bg-slate-50/50">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Fecha límite (opcional)</label>
                                <input
                                    type="datetime-local"
                                    value={assignDueDate}
                                    onChange={(e) => setAssignDueDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                            </div>
                            <div className="flex gap-3 flex-shrink-0 w-full sm:w-auto">
                                <button
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="flex-1 sm:flex-none px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAssignActivity}
                                    disabled={!selectedItem || isAssigning}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                                >
                                    {isAssigning ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                    Asignar al Aula
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassroomDetail;
