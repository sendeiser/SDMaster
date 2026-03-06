import React from 'react';
import { BookOpen, Sparkles, FileText, Settings } from 'lucide-react';

const Navigation = () => {
    return (
        <nav className="sticky top-0 z-50 glass border-b border-slate-200/50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo & Brand */}
                    <div className="flex items-center space-x-3">
                        <div className="bg-brand-600 p-2 rounded-xl shadow-lg shadow-brand-500/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                                SD Master
                            </span>
                            <span className="hidden sm:block text-[10px] uppercase tracking-widest text-slate-400 font-semibold leading-none mt-1">
                                AI Pedagogical Engine
                            </span>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-8">
                        <NavLink icon={<BookOpen className="w-4 h-4" />} label="Generador" active />
                        <NavLink icon={<FileText className="w-4 h-4" />} label="Base de Conocimiento" />
                        <NavLink icon={<Settings className="w-4 h-4" />} label="Configuración" />
                    </div>

                    {/* User Status */}
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-xs font-medium text-emerald-700">Sistema Activo</span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

const NavLink = ({ icon, label, active = false }) => (
    <a
        href="#"
        className={`flex items-center space-x-2 text-sm font-medium transition-colors duration-200 ${active
                ? 'text-brand-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
    >
        {icon}
        <span>{label}</span>
    </a>
);

export default Navigation;
