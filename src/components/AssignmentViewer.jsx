import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    ArrowLeft, Send, CheckCircle2, Clock, 
    BookOpen, ClipboardCheck, Loader2,
    ChevronLeft, ChevronRight, PenLine, Hash, Activity
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { antigravityService } from '../services/antigravityService';
import MathKeyboard from './MathKeyboard';

// ─── Sections to hide from students ─────────────────────────────────────────
const HIDDEN_SECTION_PATTERNS = [
    /^#+\s*(datos\s+de\s+identificaci[oó]n|identificaci[oó]n)/i,
    /^#+\s*fundamentaci[oó]n/i,
    /^#+\s*objetivos?(\s+generales?|\s+espec[ií]ficos?)?\s*$/i,
    /^#+\s*contenidos?\s+(a\s+trabajar|conceptuales?|procedimentales?|actitudinales?)?\s*$/i,
    /^#+\s*cronograma/i,
    /^#+\s*criterios?\s+de\s+evaluaci[oó]n/i,
    /^#+\s*bibliograf[ií]a(\s+y\s+recursos?)?\s*$/i,
    /^#+\s*recursos?\s+y\s+materiales?\s*$/i,
    /^#+\s*metodolog[ií]a\s*$/i,
];

/** Strip planning/administrative sections from the markdown */
function filterStudentContent(markdown) {
    if (!markdown) return '';
    const lines = markdown.split('\n');
    const result = [];
    let hiddenLevel = null;

    for (const line of lines) {
        const headingMatch = line.match(/^(#{1,6})\s+/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            if (HIDDEN_SECTION_PATTERNS.some(p => p.test(line))) {
                hiddenLevel = level;
                continue;
            }
            if (hiddenLevel !== null && level <= hiddenLevel) {
                hiddenLevel = null;
            }
        }
        if (hiddenLevel === null) result.push(line);
    }

    const filtered = result.join('\n').trim();
    return filtered || markdown; // fallback
}

// ─── Exercise Parsing ─────────────────────────────────────────────────────────
/**
 * Splits filtered markdown into discrete exercise blocks.
 * Detects formats like:
 *   • ## Ejercicio 1
 *   • **Ejercicio 1:**
 *   • Ejercicio 1: Text...
 */
function parseExercises(text) {
    if (!text) return [];

    const EXERCISE_LINE_RE = /^(?:\*\*|__)?\s*(ejercicio|problema|pregunta|consigna|actividad)\s*\d+\s*[:.](?:\*\*|__)?/i;
    const EXERCISE_HEADING_RE = /^#{1,6}\s*(ejercicio|problema|pregunta|consigna|actividad)\s*\d*\s*[:.]?/i;
    const NUMBERED_LIST_RE = /^\d+[\.\)]\s+\S/;

    const lines = text.split('\n');
    
    // Check if the document has explicit "Ejercicio N" markers anywhere
    const hasExplicitMarkers = lines.some(l => EXERCISE_LINE_RE.test(l) || EXERCISE_HEADING_RE.test(l));

    const segments = [];
    let current = null;

    const pushCurrent = () => {
        if (current && current.content.trim()) segments.push({ ...current });
    };

    for (const line of lines) {
        let isNewExercise = false;

        if (EXERCISE_HEADING_RE.test(line) || EXERCISE_LINE_RE.test(line)) {
            isNewExercise = true;
        } else if (!hasExplicitMarkers && NUMBERED_LIST_RE.test(line)) {
            // Only split on simple numbers if there are no explicit "Ejercicio N" markers
            // and we aren't inside a theory block
            if (!current || current.type !== 'theory') {
                isNewExercise = true;
            }
        }

        if (isNewExercise) {
            pushCurrent();
            current = { id: segments.length, content: line + '\n', type: 'exercise' };
        } else {
            if (!current) {
                current = { id: 0, content: '', type: 'theory' };
            }
            current.content += line + '\n';
        }
    }
    pushCurrent();

    return segments;
}

/** Extract a short label from exercise content for header/sidebar display */
function getExerciseLabel(content) {
    const firstLine = content.split('\n')[0];
    return firstLine
        .replace(/^#+\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/__/g, '')
        .trim()
        .slice(0, 50);
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AssignmentViewer = ({ session, assignment, onBack }) => {
    // Content state
    const [exercises, setExercises] = useState([]);
    const [filteredContent, setFilteredContent] = useState('');
    const [responses, setResponses] = useState({});
    
    // Navigation state
    const [activeId, setActiveId] = useState('theory'); // 'theory', exercise.id, 'submit'
    
    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState(null);
    const [submissionData, setSubmissionData] = useState(null);
    
    // Ref for MathKeyboard
    const textareaRef = useRef(null);

    // Initialization
    useEffect(() => {
        if (assignment.content_payload) {
            const filtered = filterStudentContent(assignment.content_payload);
            setFilteredContent(filtered);
            
            const parsed = parseExercises(filtered);
            setExercises(parsed);
            
            const initialResponses = {};
            parsed.forEach(ex => { if (ex.type === 'exercise') initialResponses[ex.id] = ''; });
            setResponses(initialResponses);
            
            // If there's no theory block (e.g. all exercises), navigate to the first exercise instead
            const hasTheory = parsed.some(ex => ex.type === 'theory');
            const firstExercise = parsed.find(ex => ex.type === 'exercise');
            if (!hasTheory && firstExercise) {
                setActiveId(firstExercise.id);
            }
        }
    }, [assignment.content_payload]);

    useEffect(() => {
        if (assignment.submission) {
            setSubmissionData(assignment.submission);
            setSubmissionStatus(assignment.submission.is_graded ? 'graded' : 'submitted');
            fetchFullSubmission();
        }
    }, [assignment]);

    const fetchFullSubmission = async () => {
        try {
            const { data } = await supabase
                .from('student_submissions')
                .select('*')
                .eq('assignment_id', assignment.id)
                .eq('student_id', session.user.id)
                .single();
            if (data) {
                setSubmissionData(data);
                setSubmissionStatus(data.is_graded ? 'graded' : 'submitted');
                try {
                    const parsed = JSON.parse(data.content);
                    if (typeof parsed === 'object') setResponses(parsed);
                    else throw new Error('Not JSON');
                } catch {
                    setResponses({ 0: data.content });
                }
            }
        } catch (err) {
            console.error('Error fetching submission:', err);
        }
    };

    const handleSubmit = async () => {
        const anyResponse = Object.values(responses).some(r => r?.trim());
        if (!anyResponse) { alert('Debes completar al menos un ejercicio.'); return; }
        setIsSubmitting(true);
        try {
            const exerciseList = exercises.filter(ex => ex.type === 'exercise');
            const combinedContent = exerciseList.map((ex, i) => {
                const title = getExerciseLabel(ex.content) || `Ejercicio ${i + 1}`;
                return `### ${title}\n${responses[ex.id] || ''}`;
            }).join('\n\n---\n\n');

            const { data, error } = await supabase
                .from('student_submissions')
                .upsert({
                    assignment_id: assignment.id,
                    student_id: session.user.id,
                    content: JSON.stringify(responses),
                    submitted_at: new Date().toISOString()
                }, { onConflict: 'assignment_id,student_id' })
                .select().single();
            if (error) throw error;

            setSubmissionData(data);
            setSubmissionStatus('submitted');
            alert('¡Entrega enviada! Se está evaluando automáticamente…');

            try {
                const gradeResult = await antigravityService.gradeSubmission(assignment.content_payload, combinedContent);
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

    // Derived flags
    const theorySegments = exercises.filter(ex => ex.type === 'theory');
    const exerciseList = exercises.filter(ex => ex.type === 'exercise');
    
    // Navigation items mapping
    const navItems = useMemo(() => {
        const items = [];
        if (theorySegments.length > 0) {
            items.push({ id: 'theory', label: 'Material de Estudio', icon: BookOpen });
        }
        exerciseList.forEach((ex, i) => {
            const hasAns = (responses[ex.id] || '').trim().length > 0;
            items.push({ 
                id: ex.id, 
                label: `Ejercicio ${i + 1}`, 
                subtext: getExerciseLabel(ex.content),
                icon: hasAns ? CheckCircle2 : PenLine,
                completed: hasAns,
                type: 'exercise',
                index: i + 1,
                exercise: ex
            });
        });
        items.push({ id: 'submit', label: 'Revisión y Entrega', icon: Send });
        return items;
    }, [theorySegments, exerciseList, responses]);

    const activeIndex = navItems.findIndex(item => item.id === activeId);
    
    const handleNext = () => {
        if (activeIndex < navItems.length - 1) setActiveId(navItems[activeIndex + 1].id);
    };
    const handlePrev = () => {
        if (activeIndex > 0) setActiveId(navItems[activeIndex - 1].id);
    };

    const completedCount = exerciseList.filter(ex => (responses[ex.id] || '').trim()).length;
    const isReadOnly = submissionStatus === 'graded';
    const progress = exerciseList.length > 0 ? Math.round((completedCount / exerciseList.length) * 100) : 0;

    return (
        <div className="flex-grow flex flex-col bg-slate-50 h-[100dvh] md:h-full overflow-hidden">
            {/* ── Header ── */}
            <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10 flex-shrink-0 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors flex-shrink-0">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md ${
                                assignment.item_type === 'assessment' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700'
                            }`}>
                                {assignment.item_type === 'assessment' ? 'Evaluación' : 'Actividad'}
                            </span>
                        </div>
                        <h1 className="text-lg font-black text-slate-900 leading-tight truncate">{assignment.title}</h1>
                    </div>
                </div>
                
                {/* Status Badges */}
                <div className="flex-shrink-0 hidden sm:block">
                    {submissionStatus === 'graded' && (
                        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl flex items-center gap-3">
                            <CheckCircle2 size={20} className="text-emerald-500" />
                            <div>
                                <div className="text-[10px] uppercase tracking-widest font-bold text-emerald-600">Calificada</div>
                                <div className="text-lg font-black text-emerald-900">{submissionData?.final_score}<span className="text-sm font-bold">/10</span></div>
                            </div>
                        </div>
                    )}
                    {submissionStatus === 'submitted' && (
                        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-3">
                            <Clock size={20} className="text-amber-500" />
                            <div>
                                <div className="text-[10px] uppercase tracking-widest font-bold text-amber-600">Estado</div>
                                <div className="text-sm font-black text-amber-900">En revisión</div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Main Layout: Sidebar + Focus Area ── */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                {/* Nav Sidebar */}
                <aside className="w-full md:w-72 lg:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col flex-shrink-0 z-0">
                    {/* Progress Overview */}
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tu Progreso</div>
                            <span className="text-xs font-black text-brand-600">{progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 mt-2">
                            {completedCount} de {exerciseList.length} ejercicios
                        </div>
                    </div>

                    {/* Nav Items - Scrollable mobile horizontal / desktop vertical */}
                    <div className="flex-1 overflow-auto custom-scrollbar p-3 flex md:flex-col gap-2">
                        {navItems.map(item => {
                            const isActive = activeId === item.id;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveId(item.id)}
                                    className={`flex-shrink-0 w-48 md:w-full text-left p-3 md:p-4 rounded-xl transition-all border-2 flex items-start gap-3 group ${
                                        isActive 
                                            ? 'border-brand-400 bg-brand-50 shadow-sm shadow-brand-500/10' 
                                            : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                                    }`}
                                >
                                    <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                        isActive 
                                            ? 'text-brand-600 bg-brand-100' 
                                            : item.completed 
                                                ? 'text-emerald-500 bg-emerald-100 group-hover:bg-emerald-200' 
                                                : 'text-slate-400 bg-slate-100 group-hover:bg-slate-200'
                                    }`}>
                                        <Icon size={12} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className={`text-sm font-bold truncate ${isActive ? 'text-brand-700' : 'text-slate-700'}`}>
                                            {item.label}
                                        </div>
                                        {item.subtext && (
                                            <div className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                                                {item.subtext}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Focus Area */}
                <main className="flex-1 bg-slate-50 overflow-y-auto custom-scrollbar flex flex-col relative px-4 md:px-12 lg:px-24 py-6 md:py-10">
                    
                    {/* Floating Teacher Feedback (if any) */}
                    {submissionStatus === 'graded' && activeId !== 'submit' && (submissionData?.teacher_feedback || submissionData?.ai_feedback) && (
                        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 mb-6">
                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5">
                                <CheckCircle2 size={12} /> Devolución General
                            </div>
                            <div className="prose prose-sm max-w-none text-slate-700">
                                <ReactMarkdown>{submissionData.teacher_feedback || submissionData.ai_feedback}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col min-h-full">
                        
                        {/* 1. Theory View */}
                        {activeId === 'theory' && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden animate-fade-in mb-6">
                                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
                                    <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                                        <BookOpen size={18} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 text-lg">Material de Estudio</h2>
                                        <p className="text-xs text-slate-500 font-medium">Lee atentamente antes de resolver los ejercicios</p>
                                    </div>
                                </div>
                                <div className="p-8 prose prose-slate max-w-none
                                              prose-headings:font-black prose-h1:text-2xl prose-h2:text-xl
                                              prose-p:text-slate-700 prose-p:leading-relaxed
                                              prose-strong:text-slate-900 prose-strong:font-bold
                                              prose-ul:list-disc prose-ol:list-decimal
                                              prose-code:text-brand-700 prose-code:bg-brand-50 prose-code:px-1 prose-code:rounded">
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                        {theorySegments.map(s => s.content).join('\n\n')}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {/* 2. Exercise View */}
                        {navItems[activeIndex]?.type === 'exercise' && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden animate-fade-in mb-6 flex-1 min-h-[400px]">
                                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center font-black text-lg">
                                        {navItems[activeIndex].index}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="font-bold text-slate-800 text-sm md:text-base">Ejercicio {navItems[activeIndex].index}</h2>
                                        <p className="text-xs text-slate-500 font-medium truncate">{navItems[activeIndex].subtext}</p>
                                    </div>
                                </div>
                                <div className="p-6 md:p-8 flex flex-col flex-1 gap-6">
                                    {/* Consigna */}
                                    <div className="prose prose-sm md:prose-base max-w-none prose-p:text-slate-700 prose-strong:text-slate-900">
                                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {navItems[activeIndex].exercise.content}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Textarea */}
                                    <div className="flex flex-col flex-1 min-h-[250px] relative">
                                        <div className="flex items-center justify-between mb-2 px-1">
                                            <label className="text-[10px] font-black text-slate-400 py-1 uppercase tracking-widest flex items-center gap-1.5">
                                                <PenLine size={12} /> Tu Respuesta
                                            </label>
                                            {responses[activeId]?.trim().length > 0 && (
                                                <span className="text-[10px] text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Hash size={10} /> {responses[activeId].trim().split(/\s+/).length} palabras
                                                </span>
                                            )}
                                        </div>
                                        
                                        {isReadOnly ? (
                                             <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-5 overflow-auto">
                                                 {responses[activeId] ? (
                                                     <div className="prose prose-sm max-w-none text-slate-700">
                                                         <ReactMarkdown>{responses[activeId]}</ReactMarkdown>
                                                     </div>
                                                 ) : (
                                                     <p className="text-slate-400 text-sm italic text-center mt-10">No respondiste este ejercicio.</p>
                                                 )}
                                             </div>
                                        ) : (
                                            <textarea
                                                ref={textareaRef}
                                                value={responses[activeId] || ''}
                                                onChange={(e) => setResponses({ ...responses, [activeId]: e.target.value })}
                                                placeholder="Escribe tu resolución detallada o respuesta aquí..."
                                                className="w-full flex-1 bg-white border border-slate-200 rounded-2xl p-5 text-sm md:text-base text-slate-700 font-medium resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-300 shadow-inner"
                                            />
                                        )}
                                        
                                        {/* Math Keyboard - always attached below */}
                                        {!isReadOnly && (
                                            <MathKeyboard
                                                textareaRef={textareaRef}
                                                value={responses[activeId] || ''}
                                                onChange={(val) => setResponses({ ...responses, [activeId]: val })}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Submit View */}
                        {activeId === 'submit' && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden animate-fade-in mb-6">
                                <div className="bg-slate-50 border-b border-slate-200 px-6 py-8 text-center">
                                    <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Send size={28} />
                                    </div>
                                    <h2 className="font-black text-slate-800 text-2xl">Revisión y Entrega</h2>
                                    <p className="text-sm text-slate-500 font-medium mt-2 max-w-md mx-auto">
                                        Revisa el estado de tus ejercicios antes de enviar el trabajo al docente.
                                    </p>
                                </div>
                                <div className="p-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                                        {exerciseList.map((ex, i) => {
                                            const hasAns = (responses[ex.id] || '').trim().length > 0;
                                            return (
                                                <button 
                                                    key={ex.id}
                                                    onClick={() => setActiveId(ex.id)}
                                                    className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-colors text-left ${
                                                        hasAns ? 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50' : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div>
                                                        <div className={`text-sm font-bold ${hasAns ? 'text-emerald-800' : 'text-slate-700'}`}>Ejercicio {i + 1}</div>
                                                        <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                                                            {hasAns ? 'Completado' : 'Pendiente'}
                                                        </div>
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                        hasAns ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
                                                    }`}>
                                                        {hasAns ? <CheckCircle2 size={16} /> : <PenLine size={16} />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {!isReadOnly ? (
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || completedCount === 0}
                                            className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-brand-500/25 flex items-center justify-center gap-3"
                                        >
                                            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                                            {submissionStatus === 'submitted' ? 'Actualizar Entrega' : 'Confirmar y Entregar Tarea'}
                                        </button>
                                    ) : (
                                        <div className="bg-slate-100 text-slate-500 font-bold p-4 rounded-2xl text-center">
                                            Tu tarea ya fue calificada. No se admiten nuevas entregas.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Bottom Navigation Buttons */}
                        <div className="flex items-center justify-between mt-auto pt-2 pb-8">
                            <button
                                onClick={handlePrev}
                                disabled={activeIndex === 0}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-slate-500 hover:bg-white hover:text-brand-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors shadow-sm bg-white"
                            >
                                <ChevronLeft size={18} /> Anterior
                            </button>
                            
                            <button
                                onClick={handleNext}
                                disabled={activeIndex === navItems.length - 1}
                                className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                            >
                                {activeIndex === navItems.length - 2 ? 'Ir a Entrega' : 'Siguiente'} <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AssignmentViewer;
