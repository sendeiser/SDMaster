import React, { useState } from 'react';
import Navigation from './components/Navigation';
import UploadModule from './components/UploadModule';
import SequenceGenerator from './components/SequenceGenerator';
import { Sparkles, Layout, Database, Settings, PanelLeftOpen, PanelLeftClose } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('generator');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

        {/* Dynamic Navigation */}
        <nav className="hidden md:flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200">
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
            <span>Base de Conocimiento</span>
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'config' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Settings size={14} />
            <span>Configuración</span>
          </button>
        </nav>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Sistema Activo</span>
          </div>
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden">
        {activeTab === 'generator' ? (
          <SequenceGenerator isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        ) : activeTab === 'kb' ? (
          <div className="flex-grow flex justify-center items-center bg-slate-200/50 p-8 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-4xl">
              <UploadModule />
            </div>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-sm">
            Próximamente: Configuración Avanzada
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .font-inter { font-family: 'Inter', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}

export default App;

