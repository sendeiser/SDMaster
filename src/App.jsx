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
import { supabase } from './lib/supabaseClient';
import { Sparkles, Layout, Database, Settings as SettingsIcon, PanelLeftOpen, PanelLeftClose, LogOut, LogIn, Globe, FolderHeart, ClipboardCheck, Users, GraduationCap, Zap, BookOpen, ArrowRight } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('generator');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // true while resolving session
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loadedSequence, setLoadedSequence] = useState(null);
  const [loadedAssessment, setLoadedAssessment] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  const handleLoadSequence = (seq) => {
    setLoadedSequence(seq);
    setActiveTab('generator');
  };

  const handleLoadAssessment = (assessment) => {
    setLoadedAssessment(assessment);
    setActiveTab('assessments');
  };

    const loadUserProfile = async (user) => {
        if (user) {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, plan, credits_remaining')
                .eq('id', user.id)
                .single();
            if (error) {
                console.error('Error fetching profile:', error);
                return null;
            } else {
                setProfile(data);
                return data;
            }
        } else {
            setProfile(null);
            return null;
        }
    };

    useEffect(() => {
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
  };

    const navItems = [
        { id: 'generator', label: 'Generador', icon: Layout, requireRole: 'teacher' },
        { id: 'kb', label: 'Base de Conocimiento', icon: Database, requireRole: 'teacher' },
        { id: 'my_sequences', label: 'Mis Secuencias', icon: FolderHeart, requireRole: 'teacher' },
        { id: 'assessments', label: 'Evaluaciones', icon: ClipboardCheck, requireRole: 'teacher' },
        { id: 'classrooms', label: 'Mis Aulas', icon: Users, requireRole: 'teacher' },
        { id: 'student_classes', label: 'Mis Clases', icon: GraduationCap, requireRole: 'student' },
        { id: 'community', label: 'Comunidad', icon: Globe, requireRole: 'teacher' },
        { id: 'plans', label: 'Planes', icon: Zap, requireRole: 'teacher' },
        { id: 'config', label: 'Configuración', icon: SettingsIcon },
    ];

    // ── AUTH GATE ──────────────────────────────────────────────────
    // Mientras resuelve la sesión, muestra pantalla en blanco
    if (isAuthLoading) {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
                <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center animate-pulse">
                    <Sparkles size={20} className="text-white" />
                </div>
            </div>
        );
    }

    // Sin sesión: mostrar landing page en lugar del dashboard
    if (!session) {
        return (
            <>
                <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 flex flex-col items-center justify-center p-6 text-center">
                    {/* Logo */}
                    <div className="w-20 h-20 bg-brand-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-brand-500/30 mb-8">
                        <Sparkles size={36} />
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tight mb-3">
                        SD <span className="text-brand-400">Master</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-md mb-10 font-medium">
                        La plataforma de docentes que crean, asignan y corrigen con Inteligencia Artificial.
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-wrap justify-center gap-3 mb-12">
                        {['Secuencias Didácticas con IA', 'Evaluaciones Automáticas', 'Corrección por IA', 'Aulas Virtuales'].map(f => (
                            <span key={f} className="bg-white/10 backdrop-blur-sm text-white/80 text-xs font-bold px-4 py-2 rounded-full border border-white/10">
                                {f}
                            </span>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => { setIsAuthModalOpen(true); }}
                            className="flex items-center justify-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black text-lg rounded-2xl transition-all shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5"
                        >
                            <LogIn size={22} />
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => { setIsAuthModalOpen(true); }}
                            className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black text-lg rounded-2xl border border-white/20 transition-all hover:-translate-y-0.5 backdrop-blur-sm"
                        >
                            <ArrowRight size={22} />
                            Crear Cuenta Gratis
                        </button>
                    </div>

                    <p className="mt-8 text-slate-500 text-sm font-medium">
                        Registrarse como Alumno también es <strong className="text-slate-400">gratuito</strong>
                    </p>
                </div>

                {/* Auth modal — no close button (auth gate) */}
                <AuthModal
                    isOpen={isAuthModalOpen}
                    onClose={null}
                    onAuthSuccess={() => setIsAuthModalOpen(false)}
                />
            </>
        );
    }

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col font-inter">
      {/* Top Navigation Bar - Shared Premium Shell */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-50">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
          >
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20 text-brand-50">
              <Sparkles size={16} />
            </div>
            <span className="font-black text-slate-900 tracking-tight uppercase text-sm">SD Master <span className="text-brand-600">Pro</span></span>
          </div>
        </div>

        {/* Dynamic Navigation - Desktop */}
        <nav className="hidden lg:flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200">
          {navItems.map((item) => {
            // Unauthenticated view rules:
            if (!session) {
                if (item.requireRole) return null; // No tools for not logged in, only Community
            } else {
                // Logged in user: block items not matching role
                if (item.requireRole && profile?.role !== item.requireRole) return null;
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === item.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
          >
            {isMenuOpen ? <PanelLeftClose size={20} /> : <Layout size={20} />}
          </button>

          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Sistema Activo</span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

          {session ? (
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuenta PRO</span>
                <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                  {session.user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100/80 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl transition-all border border-transparent hover:border-red-100 group"
                title="Cerrar sesión"
              >
                <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
                <span className="text-xs font-bold">Cerrar Sesión</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-slate-900/10"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">Iniciar Sesión</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] transition-all duration-300 ${isMenuOpen ? 'visible' : 'invisible'}`}
      >
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMenuOpen(false)}
        />
        <div
          className={`absolute top-16 left-0 right-0 bg-white border-b border-slate-200 p-4 transition-transform duration-300 transform ${isMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}
        >
          <nav className="flex flex-col space-y-2">
            {navItems.map((item) => {
              if (!session) {
                  if (item.requireRole) return null;
              } else {
                  if (item.requireRole && profile?.role !== item.requireRole) return null;
              }
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                  className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            
            {session && (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full px-4 py-4 rounded-xl text-sm font-black text-red-600 bg-red-50 hover:bg-red-100 transition-all mt-4 border border-red-100"
              >
                <LogOut size={18} />
                <span>Cerrar Sesión</span>
              </button>
            )}
          </nav>
        </div>
      </div>


      <main className="flex-grow flex overflow-hidden">
        {activeTab === 'generator' ? (
          <SequenceGenerator
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            session={session}
            profile={profile}
            loadedSequence={loadedSequence}
            clearLoadedSequence={() => setLoadedSequence(null)}
          />
        ) : activeTab === 'kb' ? (
          <div className="flex-grow flex justify-center items-center bg-slate-200/50 p-8 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-4xl">
              <UploadModule />
            </div>
          </div>
        ) : activeTab === 'community' ? (
          <ExploreSequences onLoadSequence={handleLoadSequence} onLoadAssessment={handleLoadAssessment} />
        ) : activeTab === 'my_sequences' ? (
          <MySequences session={session} onLoadSequence={handleLoadSequence} onLoadAssessment={handleLoadAssessment} />
        ) : activeTab === 'assessments' ? (
          <AssessmentGenerator
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            session={session}
            profile={profile}
            loadedAssessment={loadedAssessment}
            clearLoadedAssessment={() => setLoadedAssessment(null)}
          />
        ) : activeTab === 'classrooms' ? (
          <ClassroomsTeacher session={session} profile={profile} />
        ) : activeTab === 'student_classes' ? (
          <StudentDashboard session={session} profile={profile} />
        ) : activeTab === 'plans' ? (
          <div className="flex-grow overflow-y-auto custom-scrollbar">
            <PlansPage currentPlan={profile?.plan || 'free'} onClose={() => setActiveTab(profile?.role === 'student' ? 'student_classes' : 'generator')} />
          </div>
        ) : (
          <Settings session={session} onProfileUpdate={loadUserProfile} />
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .font-inter { font-family: 'Inter', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
      `}</style>

      {/* Footer / Credits */}
      <footer className="fixed bottom-4 left-6 z-[60] lg:left-auto lg:right-6 pointer-events-none">
        <p className="text-[10px] font-black text-slate-400/50 uppercase tracking-[0.2em] transition-opacity hover:opacity-100">
          Creado por <span className="text-brand-500/50">Martin G Gonzalez</span>
        </p>
      </footer>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default App;

