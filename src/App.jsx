import React, { useState, useEffect } from 'react';
import UploadModule from './components/UploadModule';
import SequenceGenerator from './components/SequenceGenerator';
import ExploreSequences from './components/ExploreSequences';
import AuthModal from './components/AuthModal';
import Settings from './components/Settings';
import MySequences from './components/MySequences';
import AssessmentGenerator from './components/AssessmentGenerator';
import ClassroomsTeacher from './components/ClassroomsTeacher';
import StudentDashboard from './components/StudentDashboard';
import CreditsBadge from './components/CreditsBadge';
import PlansPage from './components/PlansPage';
import { PremiumButton, PremiumCard, PremiumToast } from './components/shared/PremiumUI';
import { supabase } from './lib/supabaseClient';
import { 
    Sparkles, Layout, Database, Settings as SettingsIcon, PanelLeftOpen, 
    PanelLeftClose, LogOut, LogIn, Globe, FolderHeart, ClipboardCheck, 
    Users, GraduationCap, Zap, BookOpen, ArrowRight, Menu, X,
    ChevronRight, Bell, Search, User, Award, Play
} from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('generator');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [session, setSession] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [loadedSequence, setLoadedSequence] = useState(null);
    const [loadedAssessment, setLoadedAssessment] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [profile, setProfile] = useState(null);
    const [notification, setNotification] = useState(null);

    const handleLoadSequence = (seq) => {
        setLoadedSequence(seq);
        setActiveTab('generator');
        if (window.innerWidth < 1024) setIsMenuOpen(false);
    };

    const handleLoadAssessment = (assessment) => {
        setLoadedAssessment(assessment);
        setActiveTab('assessments');
        if (window.innerWidth < 1024) setIsMenuOpen(false);
    };

    const loadUserProfile = async (user) => {
        if (!user) { setProfile(null); return null; }
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, plan, credits_remaining, full_name, avatar_url')
                .eq('id', user.id)
                .single();
            if (error) throw error;
            setProfile(data);
            return data;
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    };

    useEffect(() => {
        // Force Light Mode for consistent premium feel
        document.documentElement.classList.remove('dark');
        localStorage.removeItem('sd_dark_mode');

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsAuthLoading(false);
            if (session) {
                loadUserProfile(session.user).then((prof) => {
                    if (prof?.role === 'student' && activeTab === 'generator') {
                        setActiveTab('student_classes');
                    }
                });
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setIsAuthLoading(false);
            if (session) {
                loadUserProfile(session.user).then((prof) => {
                    if (prof?.role === 'student' && activeTab === 'generator') {
                        setActiveTab('student_classes');
                    }
                });
            } else {
                setProfile(null);
                setActiveTab('generator');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setNotification({ type: 'info', message: 'Sesión Cerrada', detail: 'Has salido del sistema de forma segura.' });
    };

    const navItems = [
        { id: 'generator', label: 'Generador Pro', icon: Sparkles, requireRole: 'teacher', group: 'Creación' },
        { id: 'assessments', label: 'Evaluaciones IA', icon: ClipboardCheck, requireRole: 'teacher', group: 'Creación' },
        { id: 'kb', label: 'Base de Saber', icon: Database, requireRole: 'teacher', group: 'Creación' },
        { id: 'my_sequences', label: 'Mis Recursos', icon: FolderHeart, requireRole: 'teacher', group: 'Gestión' },
        { id: 'classrooms', label: 'Aulas Virtuales', icon: Users, requireRole: 'teacher', group: 'Gestión' },
        { id: 'student_classes', label: 'Mi Tablero', icon: GraduationCap, requireRole: 'student', group: 'Alumno' },
        { id: 'community', label: 'Comunidad', icon: Globe, requireRole: 'teacher', group: 'Explora' },
        { id: 'plans', label: 'Suscripciones', icon: Zap, requireRole: 'teacher', group: 'Explora' },
        { id: 'config', label: 'Mi Perfil', icon: SettingsIcon, group: 'Sistema' },
    ];

    if (isAuthLoading) {
        return (
            <div className="fixed inset-0 bg-[#F8FAFC] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 bg-brand-600 rounded-[2rem] flex items-center justify-center animate-bounce shadow-2xl shadow-brand-500/40">
                        <Sparkles size={32} className="text-white" />
                    </div>
                </div>
            </div>
        );
    }

    // ── Pre-Login Landing Page ──────────────────────────────────────────────────
    if (!session) {
        return (
            <div className="fixed inset-0 bg-slate-900 flex flex-col font-inter overflow-hidden">
                {notification && <PremiumToast {...notification} onDismiss={() => setNotification(null)} />}
                
                {/* Header for Landing */}
                <div className="relative z-50 h-24 flex items-center justify-between px-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/20">
                            <Sparkles size={22} />
                        </div>
                        <span className="text-xl font-black text-white tracking-tighter uppercase">SD Master</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsAuthModalOpen(true)} className="text-sm font-black text-white/60 hover:text-white transition-colors uppercase tracking-[0.2em]">Acceder</button>
                        <PremiumButton onClick={() => setIsAuthModalOpen(true)} className="!rounded-xl !py-3 !px-8 shadow-sm">Empezar Gratis</PremiumButton>
                    </div>
                </div>

                {/* Main Landing Body */}
                <div className="relative flex-grow flex flex-col items-center justify-center px-10">
                    {/* Background Dynamic Shapes */}
                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-brand-600/5 blur-[160px] rounded-full" />
                        <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 blur-[140px] rounded-full animate-pulse" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-brand-500/10 blur-[120px] rounded-full" />
                    </div>

                    <div className="relative z-10 w-full max-w-6xl flex flex-col items-center text-center animate-fade-in">
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-brand-400 text-xs font-black uppercase tracking-[0.3em] mb-10 backdrop-blur-md">
                            <Zap size={14} className="animate-pulse" /> Evolución Tecnológica para Docentes
                        </div>

                        <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-8 leading-[1]">
                            Enseñá mejor, <br/> trabajá <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-400">más inteligente</span>.
                        </h1>

                        <p className="text-slate-400 text-xl md:text-2xl max-w-3xl mb-14 font-medium leading-relaxed">
                            La primera suite pedagógica con <span className="text-white font-black underline decoration-brand-500 decoration-4">IA Generativa</span> diseñada para transformar la corrección y planificación docente.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-6">
                            <PremiumButton 
                                onClick={() => setIsAuthModalOpen(true)} 
                                className="!px-12 !py-6 !text-xl !rounded-2xl shadow-lg active:scale-95 transition-all"
                                icon={<ArrowRight size={24} />}
                                iconPosition="right"
                            >
                                Registrarme Ahora
                            </PremiumButton>
                            <button 
                                onClick={() => setIsAuthModalOpen(true)} 
                                className="px-12 py-6 text-white font-black text-xl hover:bg-white/5 rounded-2xl border-2 border-white/10 transition-all flex items-center justify-center gap-4 group"
                            >
                                <Play size={24} className="fill-white group-hover:scale-110 transition-transform"/> Ver Demo
                            </button>
                        </div>

                        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-20 text-center">
                            {[
                                { val: '+15k', lab: 'Secuencias' },
                                { val: '98%', lab: 'Precisión IA' },
                                { val: '+500', lab: 'Colegios' },
                                { val: '24/7', lab: 'Soporte' }
                            ].map(s => (
                                <div key={s.lab}>
                                    <div className="text-3xl font-black text-white mb-1">{s.val}</div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.lab}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onAuthSuccess={() => setIsAuthModalOpen(false)} />
            </div>
        );
    }

    // ── Authenticated Premium Shell ─────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-[#F8FAFC] flex flex-col font-inter overflow-hidden">
            {notification && <PremiumToast {...notification} onDismiss={() => setNotification(null)} />}
            
            {/* Main Premium Header */}
            <header className="h-20 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-10 z-[60] shadow-sm">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-all active:scale-90 border border-slate-200"
                    >
                        {isSidebarOpen ? <PanelLeftClose size={22} fill="currentColor" className="opacity-10"/> : <PanelLeftOpen size={22} />}
                    </button>
                    
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('generator')}>
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-300">
                            <Sparkles size={20} />
                        </div>
                        <div className="hidden sm:block">
                            <h2 className="font-black text-slate-900 tracking-tighter text-lg leading-none uppercase">SD Master</h2>
                            <p className="text-[9px] font-black text-brand-600 tracking-[0.2em] uppercase mt-1">Workspace v2.0</p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Search (Placeholder decorative) */}
                <div className="hidden xl:flex flex-1 max-w-md mx-10">
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-300">
                            <Search size={16} />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Buscar en mi biblioteca..." 
                            className="w-full pl-14 pr-6 h-10 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all shadow-sm"
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center gap-1.5 opacity-30">
                            <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">⌘</span>
                            <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">K</span>
                        </div>
                    </div>
                </div>

                {/* Top Right Profile & Info */}
                <div className="flex items-center gap-4 sm:gap-8">
                    <div className="hidden md:flex items-center gap-3">
                        <div className="text-right">
                           <div className="flex items-center justify-end gap-1.5 mb-1 text-emerald-500">
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Status: Pro</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400"></div>
                           </div>
                           <p className="text-xs font-black text-slate-900 leading-none">Patrimonio Seguro</p>
                        </div>
                    </div>

                    <div className="h-10 w-[1px] bg-slate-100 hidden sm:block"></div>

                    <div className="flex items-center gap-4">
                        <PremiumButton 
                            variant="secondary" 
                            className="!p-0 !w-10 !h-10 !rounded-lg !bg-slate-50 !border-slate-200"
                            onClick={() => setActiveTab('config')}
                        >
                            <Bell size={18} className="text-slate-500"/>
                        </PremiumButton>

                        <button 
                            onClick={() => setActiveTab('config')}
                            className="flex items-center gap-3 p-1 pr-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-all group"
                        >
                            <div className="w-8 h-8 bg-slate-900 rounded-md overflow-hidden p-[1px] shadow-sm group-hover:scale-105 transition-transform">
                                <div className="w-full h-full rounded-[0.35rem] bg-white flex items-center justify-center text-slate-400 overflow-hidden">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={16}/>
                                    )}
                                </div>
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-[11px] font-black text-slate-900 leading-none truncate max-w-[100px]">{profile?.full_name?.split(' ')[0] || 'Mi Perfil'}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Docente</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform"/>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Drawer */}
            <div className={`fixed inset-0 z-[100] transition-all duration-500 lg:hidden ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsMenuOpen(false)} />
                <div className={`absolute top-0 bottom-0 left-0 w-[80%] max-w-sm bg-white shadow-2xl transition-transform duration-500 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    {/* Reuse sidebar logic or similar */}
                    <div className="p-8 h-full flex flex-col">
                        {/* Mobile Header */}
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center text-white">
                                    <Sparkles size={20} />
                                </div>
                                <h2 className="font-black text-slate-900 tracking-tighter uppercase">SD Master</h2>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)} className="p-3 text-slate-400"><X size={24}/></button>
                        </div>
                        
                        {/* Mobile Links */}
                        <div className="flex-grow space-y-2 overflow-y-auto custom-scrollbar pr-2">
                             {navItems.map((item) => {
                                if (item.requireRole && profile?.role !== item.requireRole) return null;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                                        className={`flex items-center gap-4 w-full p-4 rounded-lg font-black transition-all ${isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <item.icon size={20} />
                                        <span className="text-sm">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-8 border-t border-slate-100">
                             <button onClick={handleLogout} className="w-full flex items-center gap-4 p-5 rounded-[1.5rem] font-black text-rose-600 hover:bg-rose-50 transition-all">
                                <LogOut size={20} />
                                <span className="text-sm uppercase tracking-widest">Cerrar Sesión</span>
                             </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-grow flex overflow-hidden">
                {/* Desktop Premium Sidebar */}
                <aside className={`
                    hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out relative z-40
                    ${isSidebarOpen ? 'w-64' : 'w-20'}
                `}>
                    <div className="flex-grow flex flex-col p-4 space-y-10 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        
                        {/* Grouped Navigation */}
                        {['Creación', 'Gestión', 'Explora', 'Sistema'].map(group => {
                            const items = navItems.filter(i => i.group === group);
                            if (items.every(i => i.requireRole && profile?.role !== i.requireRole)) return null;

                            return (
                                <div key={group} className="space-y-4">
                                    <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 transition-opacity duration-500 ml-4 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                                        {group}
                                    </h4>
                                    <div className="space-y-2">
                                        {items.map(item => {
                                            if (item.requireRole && profile?.role !== item.requireRole) return null;
                                            const isActive = activeTab === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setActiveTab(item.id)}
                                                    className={`
                                                        w-full flex items-center gap-4 p-3 rounded-lg transition-all duration-300 relative group
                                                        ${isActive 
                                                            ? 'bg-slate-900 text-white shadow-sm' 
                                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
                                                    `}
                                                    title={!isSidebarOpen ? item.label : ''}
                                                >
                                                    <div className={`transition-all duration-500 ${!isSidebarOpen && 'mx-auto'}`}>
                                                        <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                                    </div>
                                                    <span className={`text-sm font-black tracking-tight whitespace-nowrap transition-all duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
                                                        {item.label}
                                                    </span>
                                                    {!isSidebarOpen && isActive && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-brand-500 rounded-r-full"></div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Credits Badge Integrated in Sidebar */}
                        {isSidebarOpen && profile?.role === 'teacher' && (
                            <div className="mt-auto px-1">
                                <PremiumCard className="!p-5 !bg-slate-50 !border-slate-200 !rounded-xl space-y-4 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
                                                <Zap size={16} fill="currentColor"/>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Mi Plan: {profile.plan || 'Free'}</span>
                                        </div>
                                        <h5 className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-1">{profile.credits_remaining || 0} <span className="text-slate-400 text-[10px] tracking-widest font-bold">CR</span></h5>
                                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Créditos IA Disponibles</p>
                                    </div>
                                    <button className="relative z-10 w-full py-2 bg-white hover:bg-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-lg transition-all border border-slate-200 shadow-sm">
                                        Cargar más
                                    </button>
                                    <div className="absolute -right-8 -bottom-8 opacity-5 text-white group-hover:scale-125 transition-transform duration-700">
                                        <Award size={120} />
                                    </div>
                                </PremiumCard>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-200">
                        <button 
                            onClick={handleLogout}
                            className={`flex items-center gap-3 w-full p-3 rounded-lg font-black text-rose-600 hover:bg-rose-50 transition-all ${!isSidebarOpen && 'justify-center p-3'}`}
                            title="Cerrar Sesión"
                        >
                            <LogOut size={20} />
                            <span className={`text-xs uppercase tracking-widest transition-all ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>Salir</span>
                        </button>
                    </div>
                </aside>

                <div className="flex-1 flex flex-col h-full relative overflow-y-auto custom-scrollbar overflow-x-hidden bg-[#F8FAFC]">
                    {/* Mobile Bottom Navigation (Floating) */}
                    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] flex items-center bg-white px-4 py-2 rounded-2xl shadow-lg border border-slate-200 gap-6">
                        <button onClick={() => setActiveTab('generator')} className={`p-2 transition-all ${activeTab === 'generator' ? 'text-slate-900 scale-110' : 'text-slate-400'}`}><Sparkles size={22}/></button>
                        <button onClick={() => setActiveTab('classrooms')} className={`p-2 transition-all ${activeTab === 'classrooms' ? 'text-slate-900 scale-110' : 'text-slate-400'}`}><Users size={22}/></button>
                        <button onClick={() => setIsMenuOpen(true)} className="p-3 bg-slate-900 rounded-xl text-white shadow-sm active:scale-95 transition-transform"><Menu size={20}/></button>
                        <button onClick={() => setActiveTab('community')} className={`p-2 transition-all ${activeTab === 'community' ? 'text-slate-900 scale-110' : 'text-slate-400'}`}><Globe size={22}/></button>
                        <button onClick={() => setActiveTab('config')} className={`p-2 transition-all ${activeTab === 'config' ? 'text-slate-900 scale-110' : 'text-slate-400'}`}><SettingsIcon size={22}/></button>
                    </div>

                    <div className="p-6 sm:p-10 animate-fade-in pb-32 lg:pb-10">
                        {activeTab === 'generator' ? (
                            <SequenceGenerator session={session} profile={profile} loadedSequence={loadedSequence} clearLoadedSequence={() => setLoadedSequence(null)} />
                        ) : activeTab === 'kb' ? (
                            <UploadModule />
                        ) : activeTab === 'community' ? (
                            <ExploreSequences onLoadSequence={handleLoadSequence} onLoadAssessment={handleLoadAssessment} />
                        ) : activeTab === 'my_sequences' ? (
                            <MySequences session={session} onLoadSequence={handleLoadSequence} onLoadAssessment={handleLoadAssessment} />
                        ) : activeTab === 'assessments' ? (
                            <AssessmentGenerator session={session} profile={profile} loadedAssessment={loadedAssessment} clearLoadedAssessment={() => setLoadedAssessment(null)} />
                        ) : activeTab === 'classrooms' ? (
                            <ClassroomsTeacher session={session} profile={profile} />
                        ) : activeTab === 'student_classes' ? (
                            <StudentDashboard session={session} profile={profile} />
                        ) : activeTab === 'plans' ? (
                            <PlansPage currentPlan={profile?.plan || 'free'} onClose={() => setActiveTab(profile?.role === 'student' ? 'student_classes' : 'generator')} />
                        ) : (
                            <Settings session={session} onProfileUpdate={loadUserProfile} />
                        )}
                    </div>
                </div>
            </main>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onAuthSuccess={() => setIsAuthModalOpen(false)} />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                .font-inter { font-family: 'Inter', sans-serif; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

export default App;
