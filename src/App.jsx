import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import UploadModule from './components/UploadModule';
import SequenceGenerator from './components/SequenceGenerator';
import ExploreSequences from './components/ExploreSequences';
import AuthModal from './components/AuthModal';
import Settings from './components/Settings';
import MySequences from './components/MySequences';
import AssessmentGenerator from './components/AssessmentGenerator';
import { supabase } from './lib/supabaseClient';
import { Sparkles, Layout, Database, Settings as SettingsIcon, PanelLeftOpen, PanelLeftClose, LogOut, LogIn, User, Globe, FolderHeart, ClipboardCheck } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('generator');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [session, setSession] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loadedSequence, setLoadedSequence] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLoadSequence = (seq) => {
    setLoadedSequence(seq);
    setActiveTab('generator');
  };

  useEffect(() => {
    // Asegurar siempre modo claro
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('sd_dark_mode');

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'generator' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Layout size={14} />
            <span>Generador</span>
          </button>
          <button
            onClick={() => setActiveTab('kb')}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'kb' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Database size={14} />
            <span>KB</span>
          </button>

          <div className="w-px h-5 bg-slate-200 mx-2"></div>

          <button
            onClick={() => setActiveTab('my_sequences')}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'my_sequences' ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-slate-500 hover:text-brand-700'}`}
          >
            <FolderHeart size={14} />
            <span>Mis Secuencias</span>
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'community' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-700'}`}
          >
            <Globe size={14} />
            <span>Comunidad</span>
          </button>

          <button
            onClick={() => setActiveTab('assessments')}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'assessments' ? 'bg-purple-50 text-purple-600 shadow-sm' : 'text-slate-500 hover:text-purple-700'}`}
          >
            <ClipboardCheck size={14} />
            <span>Evaluaciones</span>
          </button>

          <div className="w-px h-5 bg-slate-200 mx-2"></div>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'config' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <SettingsIcon size={14} />
            <span>Config</span>
          </button>
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
                className="p-2 bg-slate-100/80 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
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
            {[
              { id: 'generator', label: 'Generador', icon: <Layout size={18} /> },
              { id: 'kb', label: 'Base de Conocimiento', icon: <Database size={18} /> },
              { id: 'my_sequences', label: 'Mis Secuencias', icon: <FolderHeart size={18} /> },
              { id: 'community', label: 'Comunidad', icon: <Globe size={18} /> },
              { id: 'assessments', label: 'Evaluaciones', icon: <ClipboardCheck size={18} /> },
              { id: 'config', label: 'Configuración', icon: <SettingsIcon size={18} /> }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>


      <main className="flex-grow flex overflow-hidden">
        {activeTab === 'generator' ? (
          <SequenceGenerator
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            session={session}
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
          <ExploreSequences onLoadSequence={handleLoadSequence} />
        ) : activeTab === 'my_sequences' ? (
          <MySequences session={session} onLoadSequence={handleLoadSequence} />
        ) : activeTab === 'assessments' ? (
          <AssessmentGenerator
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            session={session}
          />
        ) : (
          <Settings session={session} />
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

