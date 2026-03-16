import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    ArrowLeft, Send, CheckCircle2, Clock, 
    BookOpen, ClipboardCheck, Loader2 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { antigravityService } from '../services/antigravityService';

const AssignmentViewer = ({ session, assignment, onBack }) => {
    const [studentResponse, setStudentResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState(null); // 'submitted', 'graded', null
    const [submissionData, setSubmissionData] = useState(null);

    useEffect(() => {
        if (assignment.submission) {
            setSubmissionData(assignment.submission);
            setSubmissionStatus(assignment.submission.is_graded ? 'graded' : 'submitted');
            // If we had the content in the joined query we could set it, but we only fetched basic info.
            // Let's fetch the full submission if it exists
            fetchFullSubmission();
        }
    }, [assignment]);

    const fetchFullSubmission = async () => {
        try {
            const { data, error } = await supabase
                .from('student_submissions')
                .select('*')
                .eq('assignment_id', assignment.id)
                .eq('student_id', session.user.id)
                .single();

            if (data) {
                setStudentResponse(data.content);
                setSubmissionData(data);
                setSubmissionStatus(data.is_graded ? 'graded' : 'submitted');
            }
        } catch (error) {
            console.error("Error fetching submission details:", error);
        }
    };

    const handleActualSubmit = async () => {
        if (!studentResponse.trim()) {
            alert("La respuesta no puede estar vacía.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Upsert the submission (insert or update)
            const { data, error } = await supabase
                .from('student_submissions')
                .upsert({
                    assignment_id: assignment.id,
                    student_id: session.user.id,
                    content: studentResponse,
                    submitted_at: new Date().toISOString()
                }, { onConflict: 'assignment_id,student_id' })
                .select()
                .single();

            if (error) throw error;

            setSubmissionData(data);
            setSubmissionStatus('submitted');
            alert("¡Entrega enviada correctamente! Se está evaluando automáticamente...");
            
            // Trigger AI autograder asynchronously
            try {
                const gradeResult = await antigravityService.gradeSubmission(
                    assignment.content_payload, 
                    studentResponse
                );

                if (gradeResult.success) {
                    // Update submission with AI grades
                    const { data: gradedData, error: updateError } = await supabase
                        .from('student_submissions')
                        .update({
                            ai_score_suggested: gradeResult.score,
                            ai_feedback: gradeResult.feedback,
                            // Optionally, we could auto-grade here or leave it for teacher
                            // the feature spec says "already pre-graded by AI", teacher must review.
                        })
                        .eq('id', data.id)
                        .select()
                        .single();
                        
                    if (updateError) console.error("Error guardando corrección IA:", updateError);
                    else {
                        console.log("Corrección IA completada exitosamente.");
                        // We don't change 'is_graded' to true because the teacher has to approve it.
                    }
                }
            } catch (aiError) {
                console.error("Error en autograder:", aiError);
                // Non-blocking error for the student
            }

        } catch (error) {
            alert("Error al enviar la entrega: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-grow flex flex-col bg-slate-50 h-full overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md ${assignment.item_type === 'assessment' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700'}`}>
                                {assignment.item_type === 'assessment' ? 'Evaluación' : 'Actividad'}
                            </span>
                            {assignment.due_date && (
                                <span className="text-xs font-semibold text-rose-500 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md">
                                    <Clock size={12} /> Vence: {new Date(assignment.due_date).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl font-black text-slate-900 leading-tight">
                            {assignment.title}
                        </h1>
                    </div>
                </div>

                {/* Status Badge */}
                {submissionStatus === 'graded' && (
                    <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-emerald-500" />
                        <div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-emerald-600">Calificada</div>
                            <div className="text-sm font-black text-emerald-900">{submissionData?.final_score}/10</div>
                        </div>
                    </div>
                )}
                {submissionStatus === 'submitted' && (
                    <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-3">
                        <Clock size={20} className="text-amber-500" />
                        <div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-amber-600">Estado</div>
                            <div className="text-sm font-black text-amber-900">Entregado, pendiente revisión</div>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 flex flex-col lg:flex-row gap-8">
                
                {/* Left Side: Content Readonly View */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="bg-slate-100/50 border-b border-slate-200 p-4 flex items-center gap-2">
                        {assignment.item_type === 'assessment' ? <ClipboardCheck size={18} className="text-purple-500"/> : <BookOpen size={18} className="text-brand-500"/>}
                        <h2 className="font-bold text-slate-700">Contenido Documento</h2>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar prose prose-slate max-w-none 
                                  prose-headings:font-black prose-h1:text-3xl prose-h2:text-2xl 
                                  prose-p:text-slate-600 prose-p:leading-relaxed
                                  prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline
                                  prose-strong:text-slate-900 prose-strong:font-bold
                                  prose-ul:list-disc prose-ol:list-decimal">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]} 
                            rehypePlugins={[rehypeKatex, rehypeRaw]}
                        >
                            {assignment.content_payload}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Right Side: Student Input / Submission Details */}
                <div className="w-full lg:w-[450px] flex flex-col gap-6 flex-shrink-0">
                    
                    {/* Retroalimentación si está calificada */}
                    {submissionStatus === 'graded' && submissionData?.teacher_feedback && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex-shrink-0">
                            <h3 className="font-black text-emerald-800 mb-2 flex items-center gap-2">
                                <CheckCircle2 size={18} />
                                Devolución del Docente
                            </h3>
                            <p className="text-sm text-emerald-700 font-medium leading-relaxed">
                                {submissionData.teacher_feedback}
                            </p>
                        </div>
                    )}

                    {/* Editor de Respuesta */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden min-h-[400px]">
                        <div className="bg-slate-100/50 border-b border-slate-200 p-4">
                            <h2 className="font-bold text-slate-700">Tu Respuesta</h2>
                        </div>
                        <div className="flex-1 p-4 flex flex-col">
                            {submissionStatus === 'graded' ? (
                                // Read-only if graded
                                <div className="flex-1 p-4 bg-slate-50 rounded-xl border border-slate-200 prose prose-sm max-w-none overflow-y-auto custom-scrollbar">
                                    <ReactMarkdown>{studentResponse}</ReactMarkdown>
                                </div>
                            ) : (
                                // Editable textarea
                                <textarea
                                    value={studentResponse}
                                    onChange={(e) => setStudentResponse(e.target.value)}
                                    placeholder="Escribe tu respuesta aquí detalladamente..."
                                    className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 font-medium custom-scrollbar"
                                />
                            )}
                        </div>
                        
                        {/* Action Area */}
                        {submissionStatus !== 'graded' && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                                <button
                                    onClick={handleActualSubmit}
                                    disabled={isSubmitting || !studentResponse.trim()}
                                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            {submissionStatus === 'submitted' ? 'Actualizar Entrega' : 'Entregar Tarea'}
                                        </>
                                    )}
                                </button>
                                {submissionStatus === 'submitted' && (
                                    <p className="text-center text-xs text-slate-500 mt-3 font-medium">
                                        Puedes modificar tu entrega hasta que el docente la califique.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentViewer;
