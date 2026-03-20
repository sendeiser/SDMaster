import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    ArrowLeft, Send, CheckCircle2, Clock, 
    BookOpen, ClipboardCheck, Loader2,
    PenLine, Hash, Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { antigravityService } from '../services/antigravityService';
import { groqService } from '../services/groqService';
import MathKeyboard from './MathKeyboard';

// ─── ExerciseCard (Redesigned & Expanded) ───────────────────────────────────
const ExerciseCard = ({ exercise, exerciseNumber, response, onChange, focusedId, onFocus, isReadOnly }) => {
    const textareaRef = useRef(null);
    const isFocused = focusedId === exercise.id;
    const hasResponse = (response || '').trim().length > 0;
    const wordCount = (response || '').trim() ? (response || '').trim().split(/\s+/).length : 0;

    const borderColor = isFocused
        ? 'border-brand-400 ring-4 ring-brand-500/10'
        : hasResponse
            ? 'border-emerald-300'
            : 'border-slate-200 hover:border-slate-300';

    return (
        <div 
            className={`rounded-3xl border-2 bg-white transition-all duration-300 shadow-sm overflow-hidden mb-8 ${borderColor}`}
            onClick={() => { if (!isFocused && !isReadOnly && textareaRef.current) textareaRef.current.focus(); }}
        >
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${
                isFocused ? 'bg-brand-50 border-brand-100' : hasResponse ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
            }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm ${
                        hasResponse ? 'bg-emerald-500 text-white' : isFocused ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                        {hasResponse ? <CheckCircle2 size={16} /> : exerciseNumber}
                    </div>
                    <div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${
                            isFocused ? 'text-brand-600' : hasResponse ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                            Ejercicio {exerciseNumber}
                        </div>
                    </div>
                </div>
                {wordCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                        <Hash size={12} className="opacity-50" /> {wordCount} <span className="hidden sm:inline">palabras</span>
                    </div>
                )}
            </div>

            {/* Consigna */}
            <div className="p-6 bg-white">
                <div className="prose prose-slate max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-headings:text-slate-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {exercise.content}
                    </ReactMarkdown>
                </div>
            </div>

            {/* Response Area */}
            <div className={`p-6 border-t transition-colors ${isFocused ? 'bg-brand-50/30 border-brand-100' : 'bg-slate-50 border-slate-100'}`}>
                {isReadOnly ? (
                    <div className={`p-5 rounded-2xl border ${hasResponse ? 'bg-white border-slate-200 shadow-sm' : 'bg-transparent border-dashed border-slate-200'}`}>
                        {hasResponse ? (
                            <div className="prose prose-slate max-w-none text-slate-700">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {response}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm italic text-center">Sin respuesta</p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <div className="relative">
                            <PenLine size={18} className={`absolute top-4 left-4 pointer-events-none transition-colors ${isFocused ? 'text-brand-500' : 'text-slate-300'}`} />
                            <textarea
                                ref={textareaRef}
                                value={response || ''}
                                onFocus={() => onFocus(exercise.id)}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder="Escribe tu respuesta detallada aquí..."
                                rows={6}
                                className={`w-full pl-12 pr-4 py-4 bg-white border-2 rounded-2xl text-base text-slate-700 font-medium resize-y min-h-[140px] focus:outline-none transition-all shadow-sm placeholder:text-slate-300 ${
                                    isFocused
                                        ? 'border-brand-400'
                                        : hasResponse 
                                            ? 'border-slate-200 hover:border-slate-300' 
                                            : 'border-slate-200 hover:border-slate-300 border-dashed'
                                }`}
                            />
                        </div>

                        {/* Math keyboard — immediately below the textarea */}
                        <div className={`transition-all duration-300 overflow-hidden ${isFocused ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0 pointer-events-none'}`}>
                            <MathKeyboard
                                textareaRef={textareaRef}
                                value={response || ''}
                                onChange={onChange}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// ─── Main Component ───────────────────────────────────────────────────────────
const AssignmentViewer = ({ session, assignment, onBack }) => {
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionError, setExtractionError] = useState(null);

    const [theoryContent, setTheoryContent] = useState('');
    const [exercises, setExercises] = useState([]);
    const [responses, setResponses] = useState({});
    
    const [focusedId, setFocusedId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState(null);
    const [submissionData, setSubmissionData] = useState(null);

    // Initial load: check if we already have the Groq AI extraction cached in DB.
    useEffect(() => {
        const initialize = async () => {
            try {
                // 1. Fetch current submission data from DB
                const { data: currentSub } = await supabase
                    .from('student_submissions')
                    .select('*')
                    .eq('assignment_id', assignment.id)
                    .eq('student_id', session.user.id)
                    .single();

                let subData = currentSub;
                let parsedContent = null;
                
                if (subData?.content) {
                    try {
                        parsedContent = typeof subData.content === 'string' 
                            ? JSON.parse(subData.content) 
                            : subData.content;
                    } catch { /* malformed old format */ }
                }

                if (subData) {
                    setSubmissionData(subData);
                    setSubmissionStatus(subData.is_graded ? 'graded' : 'submitted');
                }

                // 2. Check if the AI has already extracted this for the student
                if (parsedContent && parsedContent.extracted_exercises) {
                    setTheoryContent(parsedContent.extracted_theory || '');
                    setExercises(parsedContent.extracted_exercises || []);
                    setResponses(parsedContent.responses || {});
                } else {
                    // 3. Fallback to Groq AI extraction
                    setIsExtracting(true);
                    try {
                        const groqExtracted = await groqService.extractStudentContent(assignment.content_payload);
                        
                        setTheoryContent(groqExtracted.theory || '');
                        setExercises(groqExtracted.exercises || []);
                        
                        const initResp = {};
                        (groqExtracted.exercises || []).forEach(ex => initResp[ex.id] = '');
                        setResponses(initResp);

                        // Immediatelly save this structure to the DB so the student always gets the exact same layout
                        const structToSave = {
                            extracted_theory: groqExtracted.theory || '',
                            extracted_exercises: groqExtracted.exercises || [],
                            responses: initResp
                        };

                        const { data: upserted } = await supabase
                            .from('student_submissions')
                            .upsert({
                                assignment_id: assignment.id,
                                student_id: session.user.id,
                                content: JSON.stringify(structToSave),
                                submitted_at: subData ? subData.submitted_at : null // keep null until they submit
                            }, { onConflict: 'assignment_id,student_id' })
                            .select().single();
                            
                        if (upserted) setSubmissionData(upserted);

                    } catch (extError) {
                        setExtractionError(extError.message);
                    } finally {
                        setIsExtracting(false);
                    }
                }
            } catch (err) {
                console.error("Initialization error:", err);
            }
        };

        if (assignment && session?.user?.id) {
            initialize();
        }
    }, [assignment, session]);

    const handleSubmit = async () => {
        const anyResponse = Object.values(responses).some(r => r?.trim());
        if (!anyResponse) { alert('Debes completar al menos un ejercicio.'); return; }
        
        setIsSubmitting(true);
        try {
            // Re-package the entire structure to preserve extracted data
            const newContent = {
                extracted_theory: theoryContent,
                extracted_exercises: exercises,
                responses: responses
            };

            const combinedContentText = exercises.map((ex, i) => {
                return `### Pregunta ${i + 1}:\n${ex.content}\n\nRespuesta:\n${responses[ex.id] || ''}`;
            }).join('\n\n---\n\n');

            const { data, error } = await supabase
                .from('student_submissions')
                .upsert({
                    assignment_id: assignment.id,
                    student_id: session.user.id,
                    content: JSON.stringify(newContent),
                    submitted_at: new Date().toISOString()
                }, { onConflict: 'assignment_id,student_id' })
                .select().single();
            if (error) throw error;

            setSubmissionData(data);
            setSubmissionStatus('submitted');
            
            // Scroll to top to show success state smoothly
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Grade using Antigravity AI Autograder
            try {
                const gradeResult = await antigravityService.gradeSubmission(assignment.content_payload, combinedContentText);
                if (gradeResult.success) {
                    await supabase.from('student_submissions').update({
                        ai_score_suggested: gradeResult.score,
                        ai_feedback: gradeResult.feedback,
                    }).eq('id', data.id);
                }
            } catch (aiErr) {
                console.error('Error en autograder:', aiErr);
            }
        } catch (err) {
            alert('Error al enviar: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const completedCount = exercises.filter(ex => (responses[ex.id] || '').trim()).length;
    const isReadOnly = submissionStatus === 'graded';
    const progress = exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0;

    if (isExtracting) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
                <Loader2 size={40} className="animate-spin text-brand-500 mb-6" />
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Cargando material...</h2>
                <p className="text-slate-500 font-medium max-w-sm text-center mt-2 flex items-center justify-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    Groq AI está organizando tus consignas para una mejor lectura...
                </p>
            </div>
        );
    }

    if (extractionError) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                    <Sparkles size={28} />
                </div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Error de IA</h2>
                <p className="text-red-500 font-medium max-w-md text-center mt-2 bg-red-50 p-4 border border-red-200 rounded-xl">
                    {extractionError}
                </p>
                <p className="text-slate-500 font-medium text-sm mt-6">Asegúrate de que VITE_GROQ_API_KEY esté configurada en .env</p>
                <button onClick={onBack} className="mt-8 px-6 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 transition">Volver atrás</button>
            </div>
        );
    }

    return (
        <div className="flex-grow flex flex-col bg-slate-50/50 h-full overflow-hidden relative">
            {/* ── Fixed Header ── */}
            <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between z-40 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={onBack} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors flex-shrink-0">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-md ${
                                assignment.item_type === 'assessment' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700'
                            }`}>
                                {assignment.item_type === 'assessment' ? 'Evaluación' : 'Actividad Práctica'}
                            </span>
                            {assignment.due_date && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md">
                                    <Clock size={12} /> Vence: {new Date(assignment.due_date).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight truncate">{assignment.title}</h1>
                    </div>
                </div>
                <div className="flex-shrink-0 hidden sm:block">
                    {submissionStatus === 'graded' && (
                        <div className="bg-emerald-50 border-2 border-emerald-200 px-5 py-2 rounded-2xl flex items-center gap-3">
                            <CheckCircle2 size={24} className="text-emerald-500" />
                            <div>
                                <div className="text-[10px] uppercase tracking-widest font-black text-emerald-600">Calificada</div>
                                <div className="text-xl font-black text-emerald-900 leading-none">{submissionData?.final_score}<span className="text-sm">/10</span></div>
                            </div>
                        </div>
                    )}
                    {submissionStatus === 'submitted' && (
                        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl flex items-center gap-3">
                            <Clock size={20} className="text-amber-500" />
                            <div>
                                <div className="text-[10px] uppercase tracking-widest font-bold text-amber-600">Estado</div>
                                <div className="text-sm font-black text-amber-900">En revisión</div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Main Content Flow (Scrollable Child) ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="w-full max-w-4xl mx-auto p-4 sm:p-8 lg:p-12">
                    
                    {/* 1. Theory & Material */}
                    {theoryContent && (
                        <div className="mb-12">
                            <div className="flex items-center gap-3 mb-6 px-2">
                                <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">Material de Estudio</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Leé con atención antes de comenzar</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-10
                                            prose prose-slate max-w-none
                                            prose-headings:font-black prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                                            prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-[1.05rem]
                                            prose-strong:text-slate-900 prose-strong:font-bold
                                            prose-ul:list-disc prose-ol:list-decimal prose-li:text-slate-600
                                            prose-code:text-brand-700 prose-code:bg-brand-50 prose-code:px-1.5 prose-code:rounded-md">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                    {theoryContent}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* 2. Feedback panels (if graded) */}
                    {submissionStatus === 'graded' && (
                        <div className="mb-12 space-y-4">
                            {submissionData?.teacher_feedback && (
                                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 shadow-sm">
                                    <div className="flex items-center gap-2 text-emerald-700 font-black uppercase tracking-widest text-sm mb-4">
                                        <CheckCircle2 size={18} /> Devolución del Docente
                                    </div>
                                    <div className="prose prose-slate max-w-none text-emerald-900 text-lg">
                                        <ReactMarkdown>{submissionData.teacher_feedback}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                            {submissionData?.ai_feedback && !submissionData?.teacher_feedback && (
                                <div className="bg-purple-50 border-2 border-purple-200 rounded-3xl p-8 shadow-sm">
                                    <div className="flex items-center gap-2 text-purple-700 font-black uppercase tracking-widest text-sm mb-4">
                                        Evaluación Automática de IA
                                    </div>
                                    <div className="prose prose-slate max-w-none text-purple-900 text-lg">
                                        <ReactMarkdown>{submissionData.ai_feedback}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. Exercises */}
                    <div>
                        <div className="flex items-center justify-between mb-8 px-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                                    <ClipboardCheck size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">Ejercicios a Resolver</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Respondé cada consigna</p>
                                </div>
                            </div>

                            {/* Progress */}
                            {exercises.length > 0 && (
                                <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="hidden sm:block">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Completados</div>
                                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                    <div className="text-xl font-black text-brand-600">{progress}%</div>
                                </div>
                            )}
                        </div>

                        {exercises.length === 0 ? (
                            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400">
                                <ClipboardCheck size={48} className="mx-auto mb-4 opacity-20" />
                                <h3 className="text-lg font-bold text-slate-700 mb-1">Sin ejercicios detectados</h3>
                                <p className="text-sm font-medium">Groq no pudo identificar preguntas individuales en este documento.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {exercises.map((ex, idx) => (
                                    <ExerciseCard
                                        key={ex.id}
                                        exercise={ex}
                                        exerciseNumber={idx + 1}
                                        response={responses[ex.id]}
                                        onChange={(val) => setResponses(prev => ({ ...prev, [ex.id]: val }))}
                                        focusedId={focusedId}
                                        onFocus={setFocusedId}
                                        isReadOnly={isReadOnly}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 4. Action Area (Submit) */}
                    {!isReadOnly && (
                        <div className="mt-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-lg text-center mb-12">
                            <h3 className="text-lg font-black text-slate-800 mb-2">
                                {submissionStatus === 'submitted' ? 'Actualizar mi entrega' : 'Finalizar y Entregar'}
                            </h3>
                            <p className="text-sm font-medium text-slate-500 mb-6 max-w-md mx-auto">
                                Asegurate de haber completado todos los ejercicios. Puedes revisar tus respuestas y modificarlas ahora o después.
                            </p>
                            
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !Object.values(responses).some(r => r?.trim())}
                                className="w-full sm:w-auto min-w-[280px] py-4 px-8 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-brand-500/25 active:scale-95 inline-flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <><Send size={20} />{submissionStatus === 'submitted' ? 'Actualizar Entrega' : 'Enviar Tarea'}</>}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AssignmentViewer;
