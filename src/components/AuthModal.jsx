import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Mail, Lock, Loader2, ArrowRight, UserPlus, LogIn } from 'lucide-react';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                if (onAuthSuccess) onAuthSuccess(data.user);
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                // Auto login on successful signup if email confirmation is off, else show message
                if (data.user && data.session) {
                    if (onAuthSuccess) onAuthSuccess(data.user);
                } else {
                    setError('Por favor revisa tu correo para confirmar tu cuenta.');
                }
            }
        } catch (error) {
            setError(error.message || 'Ocurrió un error en la autenticación.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up relative my-auto">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                            {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-start space-x-3">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Mail size={16} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-700"
                                    placeholder="tu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-700"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                />
                            </div>
                            {!isLogin && <p className="text-xs text-slate-400 px-1">Mínimo 6 caracteres</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2.5 px-4 rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <span>{isLogin ? 'Entrar a SD Master' : 'Registrarme'}</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer / Toggle */}
                    <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                        <p className="text-sm text-slate-500">
                            {isLogin ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
                            <button
                                type="button"
                                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                                className="text-brand-600 font-bold hover:text-brand-700 hover:underline transition-all"
                            >
                                {isLogin ? 'Regístrate aquí' : 'Inicia Sesión'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
