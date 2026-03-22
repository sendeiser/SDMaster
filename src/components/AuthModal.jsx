import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    X, Mail, Lock as LockIcon, Loader2, ArrowRight, UserPlus, 
    LogIn, GraduationCap, BookOpen, Sparkles, 
    ChevronRight, ShieldCheck, MailCheck
} from 'lucide-react';
import { PremiumButton } from './shared/PremiumUI';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('teacher'); // 'teacher' | 'student'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (onAuthSuccess) onAuthSuccess(data.user);
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: role,
                        }
                    }
                });
                if (error) throw error;
                if (data.user && data.session) {
                    if (onAuthSuccess) onAuthSuccess(data.user);
                } else {
                    setIsSuccess(true);
                }
            }
        } catch (error) {
            setError(error.message || 'Ocurrió un error en la autenticación.');
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
                <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                        <MailCheck size={48} />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">¡Casi listo!</h2>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            Enviamos un enlace de confirmación a <span className="text-slate-900 font-bold">{email}</span>. 
                            Verificá tu casilla para activar tu cuenta de SD Master.
                        </p>
                    </div>
                    <PremiumButton onClick={onClose} className="w-full !py-5 !rounded-3xl">
                        Entendido
                    </PremiumButton>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-y-auto custom-scrollbar">
            <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] w-full max-w-[480px] overflow-hidden relative my-auto animate-in fade-in zoom-in-95 duration-300">
                
                {/* Decorative background for the modal header */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-brand-600/5 to-transparent pointer-events-none"></div>

                {/* Close Button */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all z-20"
                    >
                        <X size={24} />
                    </button>
                )}

                {/* Body Content */}
                <div className="p-10 sm:p-14 relative z-10">
                    
                    {/* Brand/Logo */}
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/30">
                            <Sparkles size={20} />
                        </div>
                        <span className="text-lg font-black text-slate-900 tracking-tighter uppercase">SD Master</span>
                    </div>

                    <div className="space-y-2 mb-10">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            {isLogin ? 'Bienvenido' : 'Crear Cuenta'}
                        </h2>
                        <p className="text-slate-400 font-medium text-lg leading-relaxed">
                            {isLogin 
                                ? 'Ingresá tus credenciales para continuar.' 
                                : 'Unite a la comunidad de docentes innovadores.'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-8 p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl text-rose-700 text-sm font-bold flex items-start gap-4 animate-in shake duration-500">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {!isLogin && (
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">¿Quién sos?</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setRole('teacher')}
                                        className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all duration-300 ${
                                            role === 'teacher'
                                                ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-xl shadow-brand-500/5'
                                                : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-100 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${role === 'teacher' ? 'bg-brand-600 text-white' : 'bg-white text-slate-300'}`}>
                                            <BookOpen size={24} />
                                        </div>
                                        <div className="text-center">
                                            <span className="font-black text-sm block">Docente</span>
                                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Crear</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('student')}
                                        className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all duration-300 ${
                                            role === 'student'
                                                ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-xl shadow-brand-500/5'
                                                : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-100 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${role === 'student' ? 'bg-brand-600 text-white' : 'bg-white text-slate-300'}`}>
                                            <GraduationCap size={24} />
                                        </div>
                                        <div className="text-center">
                                            <span className="font-black text-sm block">Alumno</span>
                                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Aprender</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-brand-500 transition-colors">
                                        <ArrowRight size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-16 pr-6 h-14 bg-slate-50 border-2 border-transparent rounded-2xl text-slate-800 font-bold focus:bg-white focus:border-brand-500 focus:outline-none transition-all"
                                        placeholder={role === 'teacher' ? 'Prof. Juan Pérez' : 'Martín García'}
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Correo Electrónico</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-brand-500 transition-colors">
                                    <Mail size={20} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-16 pr-6 h-14 bg-slate-50 border-2 border-transparent rounded-2xl text-slate-800 font-bold focus:bg-white focus:border-brand-500 focus:outline-none transition-all"
                                    placeholder="tu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tu Contraseña</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-brand-500 transition-colors">
                                    <LockIcon size={20} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-16 pr-6 h-14 bg-slate-50 border-2 border-transparent rounded-2xl text-slate-800 font-bold focus:bg-white focus:border-brand-500 focus:outline-none transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-16 bg-slate-900 hover:bg-brand-600 text-white rounded-[2rem] font-black text-lg transition-all shadow-2xl shadow-slate-900/10 active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 size={24} className="animate-spin" />
                                ) : (
                                    <>
                                        <span>{isLogin ? 'Ingresar ahora' : 'Crear mi cuenta'}</span>
                                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-slate-400 font-bold text-sm">
                            {isLogin ? '¿Aún no tenés acceso?' : '¿Ya sos parte del equipo?'}
                        </p>
                        <button
                            type="button"
                            onClick={() => { setIsLogin(!isLogin); setError(null); }}
                            className="mt-2 text-brand-600 font-black text-lg hover:text-brand-700 hover:underline transition-all"
                        >
                            {isLogin ? 'Registrate gratis aquí' : 'Iniciá sesión ahora'}
                        </button>
                    </div>

                    <div className="mt-12 flex items-center justify-center gap-3 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
                        <ShieldCheck size={14}/>
                        <span>Servidor Seguro SSL</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
