import React, { useState } from 'react';
import { 
    Sparkles, Brain, GraduationCap, Clock, Zap, 
    ShieldCheck, Layout, MessageSquare, Rocket, 
    ChevronRight, ArrowRight, CheckCircle2,
    Users, BookOpen, Star, Globe, Smartphone,
    Menu, X
} from 'lucide-react';
import { PremiumButton, PremiumCard } from './shared/PremiumUI';

const LandingPage = ({ onAuthOpen }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const features = [
        {
            icon: <Sparkles className="text-brand-500" size={24} />,
            title: "Secuencias con IA",
            desc: "Generá planificaciones pedagógicas completas en segundos alineadas a tu currícula."
        },
        {
            icon: <Brain className="text-purple-500" size={24} />,
            title: "Evaluación Crítica",
            desc: "Crea rúbricas y criterios de evaluación automatizados con feedback personalizado."
        },
        {
            icon: <Layout className="text-blue-500" size={24} />,
            title: "Gestión de Aula",
            desc: "Controlá entregas, notas y progreso de tus alumnos en un entorno minimalista."
        },
        {
            icon: <Globe className="text-emerald-500" size={24} />,
            title: "Biblioteca Global",
            desc: "Descubrí y compartí recursos con una comunidad de docentes innovadores."
        }
    ];

    return (
        <div className="min-h-screen bg-white font-inter selection:bg-brand-100 selection:text-brand-900 overflow-x-hidden">
            
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/10 group-hover:scale-110 transition-transform duration-500">
                            <Sparkles size={20} />
                        </div>
                        <span className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">SD Master</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Funciones</a>
                        <a href="#how-it-works" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Metodología</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => onAuthOpen(true)}
                            className="text-sm font-black text-slate-900 hover:text-brand-600 transition-colors px-4 py-2 uppercase tracking-widest"
                        >
                            Acceder
                        </button>
                        <PremiumButton 
                            onClick={() => onAuthOpen(false)}
                            className="!rounded-xl shadow-xl shadow-slate-900/10 hidden sm:flex"
                        >
                            Comenzar Gratis
                        </PremiumButton>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-slate-600">
                            {isMenuOpen ? <X size={24}/> : <Menu size={24}/>}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-b border-slate-100 p-6 animate-fade-in">
                        <div className="flex flex-col gap-6">
                            <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-lg font-black text-slate-900">Funciones</a>
                            <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="text-lg font-black text-slate-900">Metodología</a>
                            <hr className="border-slate-100"/>
                            <PremiumButton onClick={() => { onAuthOpen(false); setIsMenuOpen(false); }} className="w-full !py-4">Regístrate ahora</PremiumButton>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 md:pt-52 md:pb-40 px-6">
                <div className="max-w-7xl mx-auto text-center space-y-10 relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-200 text-slate-500 animate-slide-up">
                        <Zap size={14} className="text-brand-500" fill="currentColor"/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Ingeniería Pedagógica 2.0</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9] max-w-5xl mx-auto animate-fade-in">
                        Planificá con <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">Inteligencia</span>, Enseñá con Libertad.
                    </h1>

                    <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed animate-slide-up">
                        SD Master es el copiloto definitivo para docentes. Generá secuencias didácticas, evaluaciones y rúbricas profesionales en segundos.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6 animate-slide-up">
                        <PremiumButton 
                            size="lg" 
                            onClick={() => onAuthOpen(false)}
                            className="w-full sm:w-auto !rounded-2xl !py-5 !px-10 shadow-2xl shadow-brand-500/20 text-lg"
                            icon={<Rocket size={20}/>}
                        >
                            Empezar ahora
                        </PremiumButton>
                        <button 
                            onClick={() => onAuthOpen(true)}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all group"
                        >
                            Ver demostración <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Dashboard Preview Stale */}
                    <div className="pt-20 max-w-6xl mx-auto relative group">
                        <div className="absolute inset-0 bg-brand-500/5 blur-[120px] rounded-full pointer-events-none group-hover:bg-brand-500/10 transition-all duration-1000"></div>
                        <div className="bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl border border-white/10 relative overflow-hidden transform group-hover:-translate-y-2 transition-transform duration-700">
                             <div className="aspect-video bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center relative">
                                <Sparkles size={80} className="text-white/10" />
                                <div className="absolute inset-x-0 bottom-0 p-8 h-1/2 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end justify-center">
                                    <div className="text-center">
                                        <div className="flex items-center gap-1 justify-center mb-2">
                                            {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-amber-400" fill="currentColor"/>)}
                                        </div>
                                        <p className="text-white font-black text-sm uppercase tracking-widest">Interfaz Premium de Gestión Académica</p>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Decorative background objects */}
                <div className="absolute top-20 -left-20 w-80 h-80 bg-brand-50 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-40 -right-20 w-96 h-96 bg-purple-50 rounded-full blur-[120px] opacity-70 pointer-events-none"></div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-32 px-6 bg-slate-50/50 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center space-y-4 mb-20">
                        <h4 className="text-[10px] font-black text-brand-600 uppercase tracking-[0.4em]">Soluciones para el Docente Moderno</h4>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Todo lo que necesitás en un solo lugar.</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((f, i) => (
                            <PremiumCard key={i} className="!p-8 hover:-translate-y-2 transition-all duration-500 cursor-default">
                                <div className="space-y-6">
                                    <div className="w-14 h-14 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-center mb-6">
                                        {f.icon}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{f.title}</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                                </div>
                            </PremiumCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* Methodology Section */}
            <section id="how-it-works" className="py-32 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
                    <div className="lg:w-1/2 relative">
                        <div className="relative z-10 space-y-8">
                             <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 rounded-lg text-brand-600">
                                <GraduationCap size={16}/>
                                <span className="text-[10px] font-black uppercase tracking-widest">Enfoque Académico</span>
                             </div>
                             <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight">Potenciá tu <span className="text-brand-600">Creatividad</span>, no tu carga administrativa.</h2>
                             <p className="text-lg text-slate-500 font-medium leading-relaxed">
                                Nuestra IA no reemplaza al docente; le da superpoderes. SD Master analiza tus requerimientos curriculares y genera estructuras dinámicas listas para ser personalizadas por tu criterio pedagógico.
                             </p>
                             <ul className="space-y-4">
                                {[
                                    "Ahorro de hasta 10 horas semanales en papeleo.",
                                    "Secuencias alineadas al diseño curricular nacional.",
                                    "Evaluaciones formativas centradas en el estudiante.",
                                    "Privacidad y seguridad de datos garantizada."
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 font-bold text-slate-700">
                                        <div className="p-1 bg-emerald-50 text-emerald-500 rounded-md">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                             </ul>
                        </div>
                    </div>

                    <div className="lg:w-1/2 relative h-[500px]">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-slate-900 rounded-[3rem] shadow-3xl flex items-center justify-center text-white overflow-hidden group">
                             <Brain size={120} className="opacity-10 group-hover:scale-125 transition-transform duration-[3s]" />
                             <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center p-12">
                                     <Sparkles size={40} className="text-brand-400 mx-auto mb-6" />
                                     <p className="text-sm font-black uppercase tracking-widest text-brand-400 mb-2">Procesamiento Neural</p>
                                     <p className="text-2xl font-black italic tracking-tighter">Pedagogía por Diseño</p>
                                </div>
                             </div>
                             <div className="absolute top-0 right-0 p-10">
                                <Users size={24} className="opacity-20"/>
                             </div>
                             <div className="absolute bottom-0 left-0 p-10">
                                <MessageSquare size={24} className="opacity-20"/>
                             </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-32 px-6">
                <div className="max-w-5xl mx-auto bg-slate-900 rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden group">
                    <div className="relative z-10 space-y-10">
                        <h2 className="text-4xl md:text-7xl font-black text-white tracking-tight">¿Listo para transformar tus aulas?</h2>
                        <p className="text-slate-400 font-medium text-lg max-w-xl mx-auto">
                            Unete a los docentes que ya están liderando la innovación pedagógica con SD Master.
                        </p>
                        <div className="pt-6">
                            <PremiumButton 
                                size="lg" 
                                onClick={() => onAuthOpen(false)}
                                className="!bg-white !text-slate-900 hover:!bg-slate-100 !rounded-[2rem] !py-6 !px-12 shadow-2xl shadow-brand-500/10 text-xl font-black"
                            >
                                Registrarse Gratis
                            </PremiumButton>
                        </div>
                    </div>
                    {/* Background decorations */}
                    <div className="absolute top-0 left-0 w-64 h-64 bg-brand-600/20 rounded-full blur-[100px] pointer-events-none group-hover:translate-x-10 transition-transform duration-1000"></div>
                    <div className="absolute bottom-0 right-0 w-80 h-80 bg-brand-600/5 rounded-full blur-[120px] pointer-events-none group-hover:-translate-y-10 transition-transform duration-1000"></div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-slate-100">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex flex-col items-center md:items-start gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                <Sparkles size={16} />
                            </div>
                            <span className="text-lg font-black text-slate-900 tracking-tighter uppercase italic">SD Master</span>
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">© 2026 SD Master Platform. Hecho con ❤️ para docentes.</p>
                    </div>

                    <div className="flex items-center gap-8">
                        <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><Globe size={20}/></a>
                        <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><Smartphone size={20}/></a>
                        <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><MessageSquare size={20}/></a>
                    </div>
                </div>
            </footer>

            <style>{`
                .shadow-3xl { box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.4), 0 30px 60px -30px rgba(0, 0, 0, 0.5); }
                .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default LandingPage;
