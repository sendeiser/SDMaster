import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    ArrowLeft, Send, CheckCircle2, Clock, Award,
    BookOpen, ClipboardCheck, Loader2,
    PenLine, Hash, Sparkles, AlertCircle,
    ChevronRight, ChevronLeft, Layout,
    GraduationCap, MessageSquare, Info
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
import { 
    PremiumButton, PremiumCard, PremiumToast, 
    PremiumTabs, PremiumInput 
} from './shared/PremiumUI';

// ─── ExerciseCard (Enhanced Premium Version) ───────────────────────────────────
const ExerciseCard = ({ exercise, exerciseNumber, response, onChange, focusedId, onFocus, isReadOnly }) => {
    const textareaRef = useRef(null);
    const isFocused = focusedId === exercise.id;
    const hasResponse = (response || '').trim().length > 0;
    const wordCount = (response || '').trim() ? (response || '').trim().split(/\s+/).length : 0;

    return (
        <PremiumCard 
            noPadding 
            className={`transition-all duration-500 overflow-hidden mb-10 ${
                isFocused 
                ? 'ring-2 ring-brand-500 shadow-2xl shadow-brand-500/10 -translate-y-1' 
                : hasResponse ? 'border-emerald-100 shadow-sm' : 'border-slate-100'
            }`}
        >
            {/* Header */}
            <div className={`px-8 py-5 border-b flex items-center justify-between transition-colors ${
                isFocused ? 'bg-brand-50/50' : hasResponse ? 'bg-emerald-50/30' : 'bg-slate-50/50'
            }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-all duration-300 ${
                        hasResponse ? 'bg-emerald-500 text-white rotate-6' : isFocused ? 'bg-brand-500 text-white scale-110' : 'bg-white text-slate-400 border border-slate-200'
                    }`}>
                        {hasResponse ? <CheckCircle2 size={18} /> : exerciseNumber}
                    </div>
                    <div>
                        <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                            isFocused ? 'text-brand-600' : hasResponse ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                            Consigna {exerciseNumber}
                        </div>
                    </div>
                </div>
                {wordCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Hash size={12} className="text-brand-400" /> {wordCount} palabras
                    </div>
                )}
            </div>

            {/* Consigna Content */}
            <div className="p-8 sm:p-10 bg-white">
                <div className="prose prose-slate max-w-none 
                                prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-lg
                                prose-strong:text-slate-900 prose-strong:font-black
                                prose-headings:text-slate-900 prose-headings:tracking-tight prose-headings:font-black">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {exercise.content}
                    </ReactMarkdown>
                </div>
            </div>

            {/* Response Section */}
            <div className={`p-8 sm:p-10 border-t transition-all duration-500 ${isFocused ? 'bg-brand-50/20' : 'bg-slate-50/30'}`}>
                {isReadOnly ? (
                    <div className={`p-8 rounded-[2.5rem] border-2 ${hasResponse ? 'bg-white border-slate-100 shadow-inner' : 'bg-transparent border-dashed border-slate-200'}`}>
                        {hasResponse ? (
                            <div className="prose prose-slate max-w-none text-slate-800 text-lg">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {response}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-4">
                                <Info size={24} className="text-slate-200"/>
                                <p className="text-slate-300 text-sm font-black uppercase tracking-widest">Sin respuesta registrada</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col space-y-4">
                        <div className="relative group">
                            <div className={`absolute top-6 left-6 transition-colors duration-300 ${isFocused ? 'text-brand-500' : 'text-slate-300'}`}>
                                <PenLine size={24} />
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={response || ''}
                                onFocus={() => onFocus(exercise.id)}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder="Escribe tu resolución detallada..."
                                rows={6}
                                className={`w-full pl-16 pr-8 py-6 bg-white border-2 rounded-[2.5rem] text-lg text-slate-800 font-medium resize-y min-h-[180px] focus:outline-none transition-all shadow-sm placeholder:text-slate-200 ${
                                    isFocused
                                        ? 'border-brand-400 shadow-xl shadow-brand-500/5'
                                        : 'border-slate-100 hover:border-slate-200'
                                }`}
                            />
                        </div>

                        {/* Math keyboard */}
                        <div className={`transition-all duration-500 ease-out overflow-hidden ${isFocused ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                            <div className="bg-white rounded-[2rem] p-4 border border-brand-100 shadow-xl shadow-brand-500/5">
                                <div className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2">
                                    <Sparkles size={12}/> Herramientas Matemáticas
                                </div>
                                <MathKeyboard
                                    textareaRef={textareaRef}
                                    value={response || ''}
                                    onChange={onChange}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PremiumCard>
    );
};


// ─── Main Component ───────────────────────────────────────────────────────────
const AssignmentViewer = ({ session, assignment, onBack }) => {
    const [isExtracting, setIsExtracting] = useState(false);
    const [theoryContent, setTheoryContent] = useState('');
    const [exercises, setExercises] = useState([]);
    const [responses, setResponses] = useState({});
    
    const [focusedId, setFocusedId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState(null);
    const [submissionData, setSubmissionData] = useState(null);
    const [notification, setNotification] = useState(null);

    const showNotif = (type, message, detail) => setNotification({ type, message, detail });

    useEffect(() => {
        const initialize = async () => {
            try {
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
                    } catch { /* malformed */ }
                }

                if (subData) {
                    setSubmissionData(subData);
                    setSubmissionStatus(subData.is_graded ? 'graded' : 'submitted');
                }

                if (parsedContent && parsedContent.extracted_exercises) {
                    setTheoryContent(parsedContent.extracted_theory || '');
                    setExercises(parsedContent.extracted_exercises || []);
                    setResponses(parsedContent.responses || {});
                } else {
                    setIsExtracting(true);
                    try {
                        const groqExtracted = await groqService.extractStudentContent(assignment.content_payload);
                        
                        setTheoryContent(groqExtracted.theory || '');
                        setExercises(groqExtracted.exercises || []);
                        
                        const initResp = {};
                        (groqExtracted.exercises || []).forEach(ex => initResp[ex.id] = '');
                        setResponses(initResp);

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
                                submitted_at: subData ? subData.submitted_at : null
                            }, { onConflict: 'assignment_id,student_id' })
                            .select().single();
                            
                        if (upserted) setSubmissionData(upserted);

                    } catch (extError) {
                        showNotif('error', 'Error de Procesamiento', 'La IA no pudo organizar el contenido. Reintenta en unos momentos.');
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
        if (!anyResponse) { 
            showNotif('warning', 'Sin Respuestas', 'Debes completar al menos un ejercicio antes de enviar.');
            return; 
        }
        
        setIsSubmitting(true);
        try {
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
            showNotif('success', '¡Recibido!', 'Tu tarea ha sido entregada. Ahora será evaluada.');
            
            window.scrollTo({ top: 0, behavior: 'smooth' });

            try {
                const gradeResult = await antigravityService.gradeSubmission(assignment.content_payload, combinedContentText);
                if (gradeResult.success) {
                    await supabase.from('student_submissions').update({
                        ai_score_suggested: gradeResult.score,
                        ai_feedback: gradeResult.feedback,
                    }).eq('id', data.id);
                }
            } catch (aiErr) { console.error('Error en autograder:', aiErr); }
        } catch (err) {
            showNotif('error', 'Error al enviar', err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isExtracting) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 animate-fade-in">
                <div className="w-20 h-20 relative mb-8">
                    <div className="absolute inset-0 bg-brand-500/20 rounded-[2rem] animate-ping"></div>
                    <div className="relative w-full h-full bg-white rounded-[2rem] shadow-xl border border-brand-100 flex items-center justify-center text-brand-500">
                        <Sparkles size={40} className="animate-pulse" />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">SD Master <span className="text-brand-600">Smart View</span></h2>
                <p className="text-slate-500 font-medium text-center mt-3 max-w-sm leading-relaxed">
                    Estamos utilizando Inteligencia Artificial para organizar el material y los ejercicios de forma amigable...
                </p>
                <div className="w-48 h-1 bg-slate-100 rounded-full mt-10 overflow-hidden">
                    <div className="h-full bg-brand-500 animate-loading-bar"></div>
                </div>
            </div>
        );
    }

    const completedCount = exercises.filter(ex => (responses[ex.id] || '').trim()).length;
    const isReadOnly = submissionStatus === 'graded';
    const progress = exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0;

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {notification && (
                <PremiumToast 
                    type={notification.type} 
                    message={notification.message} 
                    detail={notification.detail} 
                    onDismiss={() => setNotification(null)} 
                />
            )}

            {/* ── Fixed Header ── */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 sm:px-12 py-5 flex items-center justify-between z-50 shadow-sm transition-all">
                <div className="flex items-center gap-6 min-w-0">
                    <button 
                        onClick={onBack} 
                        className="w-12 h-12 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-500 transition-all flex items-center justify-center shadow-sm active:scale-95"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 overflow-x-auto no-scrollbar">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${
                                assignment.item_type === 'assessment' ? 'bg-rose-100 text-rose-700' : 'bg-brand-100 text-brand-700'
                            }`}>
                                {assignment.item_type === 'assessment' ? 'Evaluación Final' : 'Práctica Guiada'}
                            </span>
                            {assignment.due_date && (
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-slate-900 text-white px-3 py-1 rounded-lg flex items-center gap-2">
                                    <Clock size={12} className="text-brand-400" /> Vence: {new Date(assignment.due_date).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 leading-none truncate tracking-tight">{assignment.title}</h1>
                    </div>
                </div>

                <div className="hidden lg:flex items-center gap-6">
                    {submissionStatus === 'graded' ? (
                        <div className="bg-white border-2 border-emerald-500/20 px-6 py-3 rounded-3xl flex items-center gap-4 shadow-xl shadow-emerald-500/5">
                            <div className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center">
                                <Award size={22} />
                            </div>
                            <div>
                                <div className="text-[9px] uppercase tracking-widest font-black text-emerald-600 block mb-0.5">Calificación Final</div>
                                <div className="text-2xl font-black text-slate-900 leading-none">{submissionData?.final_score}<span className="text-sm opacity-30">/10</span></div>
                            </div>
                        </div>
                    ) : submissionStatus === 'submitted' ? (
                        <div className="bg-amber-50 border border-amber-200 px-6 py-3 rounded-3xl flex items-center gap-4">
                            <Clock size={24} className="text-amber-500 animate-pulse" />
                            <div>
                                <div className="text-[9px] uppercase tracking-[0.2em] font-black text-amber-600">Estado de Entrega</div>
                                <div className="text-sm font-black text-slate-900 uppercase tracking-tighter">Esperando Corrección</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="text-right">
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Tu Progreso</div>
                                <div className="w-32 h-2 bg-slate-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                            <div className="text-3xl font-black text-brand-600 leading-none">{progress}%</div>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Main Layout (Content + Navigation/Summary) ── */}
            <main className="max-w-7xl mx-auto px-6 sm:px-12 py-12 lg:flex lg:gap-12">
                
                {/* Center Content */}
                <div className="flex-1 min-w-0 space-y-16">
                    
                    {/* 1. Theory Section */}
                    {theoryContent && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-lg border border-slate-100 flex items-center justify-center text-brand-500">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Material de Apoyo</h2>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Referencia teórica para completar los ejercicios</p>
                                </div>
                            </div>

                            <PremiumCard className="!p-10 !rounded-[3rem] prose prose-slate max-w-none 
                                            prose-headings:font-black prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
                                            prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-lg
                                            prose-strong:text-slate-900 prose-strong:font-black
                                            prose-ul:list-disc prose-ol:list-decimal prose-li:text-slate-700
                                            prose-code:text-brand-600 prose-code:bg-brand-50 prose-code:px-2 prose-code:py-1 prose-code:rounded-lg prose-code:font-black">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                    {theoryContent}
                                </ReactMarkdown>
                            </PremiumCard>
                        </section>
                    )}

                    {/* 2. Personalized Feedback */}
                    {(submissionData?.teacher_feedback || submissionData?.ai_feedback) && submissionStatus === 'graded' && (
                        <section className="animate-in zoom-in-95 duration-500">
                            <PremiumCard className={`!p-10 !rounded-[3rem] border-2 ${submissionData?.teacher_feedback ? 'bg-emerald-50/50 border-emerald-200' : 'bg-purple-50 border-purple-200'}`}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${submissionData?.teacher_feedback ? 'bg-emerald-500 text-white' : 'bg-purple-500 text-white'}`}>
                                        {submissionData?.teacher_feedback ? <MessageSquare size={24}/> : <Sparkles size={24}/>}
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-black tracking-tight ${submissionData?.teacher_feedback ? 'text-emerald-900' : 'text-purple-900'}`}>
                                            {submissionData?.teacher_feedback ? 'Devolución del Docente' : 'Análisis Inteligente (Beta)'}
                                        </h3>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${submissionData?.teacher_feedback ? 'text-emerald-600' : 'text-purple-600'}`}>Retroalimentación sobre tu desempeño</p>
                                    </div>
                                </div>
                                <div className={`prose prose-slate max-w-none text-lg ${submissionData?.teacher_feedback ? 'text-emerald-900/80' : 'text-purple-900/80'}`}>
                                    <ReactMarkdown>{submissionData.teacher_feedback || submissionData.ai_feedback}</ReactMarkdown>
                                </div>
                            </PremiumCard>
                        </section>
                    )}

                    {/* 3. Exercises Section */}
                    <section className="relative">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-lg border border-slate-100 flex items-center justify-center text-amber-500">
                                    <ClipboardCheck size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Consignas</h2>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Resolvé cada punto con detalle</p>
                                </div>
                            </div>
                        </div>

                        {exercises.length === 0 ? (
                            <div className="bg-white border-4 border-dashed border-slate-100 rounded-[3rem] p-20 text-center space-y-4">
                                <Layout size={64} className="mx-auto text-slate-100" />
                                <h3 className="text-xl font-black text-slate-400">Sin ejercicios detectados</h3>
                                <p className="text-sm text-slate-300 max-w-xs mx-auto">Nuestro motor de extracción no pudo identificar puntos individuales en esta publicación.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
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
                    </section>

                    {/* 4. Submission Footer */}
                    {!isReadOnly && (
                        <div className="bg-slate-900 rounded-[4rem] p-12 lg:p-16 text-center space-y-8 shadow-2xl relative overflow-hidden">
                            <div className="relative z-10 space-y-4">
                                <div className="w-20 h-20 bg-brand-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-brand-500/20">
                                    <Send size={32} className="text-brand-400" />
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tight">¿Todo listo para entregar?</h3>
                                <p className="text-white/40 font-medium max-w-md mx-auto text-lg leading-relaxed">
                                    Revisá tus respuestas antes de enviar. Podés seguir editando más tarde si el profesor todavía no cerró el aula.
                                </p>
                                
                                <div className="pt-6">
                                    <PremiumButton
                                        onClick={handleSubmit}
                                        loading={isSubmitting}
                                        disabled={!Object.values(responses).some(r => r?.trim())}
                                        className="w-full sm:w-auto min-w-[320px] !py-6 !px-12 !rounded-[2.5rem] !text-xl shadow-2xl shadow-brand-500/20 !bg-brand-500 hover:!bg-brand-600"
                                        icon={<Send size={24} />}
                                    >
                                        {submissionStatus === 'submitted' ? 'Actualizar mi Entrega' : 'Enviar mi Tarea'}
                                    </PremiumButton>
                                </div>
                            </div>
                            
                            {/* Bg decoration */}
                            <div className="absolute top-0 right-0 p-20 opacity-5 blur-3xl">
                                <GraduationCap size={300} className="text-brand-400"/>
                            </div>
                        </div>
                    )}
                </div>

                {/* Desktop Sticky Sidebar Navigation */}
                <aside className="hidden lg:block w-80 shrink-0">
                    <div className="sticky top-32 space-y-8">
                        <PremiumCard className="!p-8 shadow-xl shadow-slate-200/50">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Índice Académico</h4>
                            <nav className="space-y-2">
                                {theoryContent && (
                                    <button className="w-full group flex items-center gap-3 p-4 rounded-2xl hover:bg-brand-50 transition-colors text-left border border-transparent hover:border-brand-100">
                                        <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0">
                                            <BookOpen size={16}/>
                                        </div>
                                        <span className="text-sm font-black text-slate-600 group-hover:text-brand-700 tracking-tight uppercase tracking-tighter">Teoría y Apuntes</span>
                                    </button>
                                )}
                                <div className="pt-4 mt-4 border-t border-slate-50 space-y-1">
                                    {exercises.map((ex, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => {
                                                const el = document.getElementById(`exercise-${ex.id}`);
                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                setFocusedId(ex.id);
                                            }}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                                                focusedId === ex.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] font-black ${focusedId === ex.id ? 'text-brand-400' : 'text-slate-300'}`}>0{idx + 1}</span>
                                                <span className="text-xs font-bold tracking-tight">Ejercicio {idx + 1}</span>
                                            </div>
                                            {(responses[ex.id] || '').trim() && <CheckCircle2 size={14} className="text-emerald-500"/>}
                                        </button>
                                    ))}
                                </div>
                            </nav>
                        </PremiumCard>

                        <div className="p-8 bg-brand-500 rounded-[2.5rem] text-white shadow-xl shadow-brand-500/10 relative overflow-hidden group">
                           <div className="relative z-10 text-center space-y-3">
                                <Award size={48} className="mx-auto mb-2 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                                <h5 className="text-lg font-black tracking-tight leading-none">Meta del Día</h5>
                                <p className="text-white/70 text-xs font-medium px-4">¡Completá tu tarea para sumar créditos de IA!</p>
                           </div>
                           <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default AssignmentViewer;
