import React, { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, Save, Monitor, Clock, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const Settings = ({ session }) => {
    const [preferences, setPreferences] = useState({
        defaultDuration: '2h',
        defaultTheme: 'classic',
        defaultStructure: 'Tradicional'
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Cargar preferencias
        const stored = localStorage.getItem('sd_preferences');
        if (stored) {
            try {
                setPreferences(JSON.parse(stored));
            } catch (e) {
                console.error("Error parsing preferences", e);
            }
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPreferences(prev => ({ ...prev, [name]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        localStorage.setItem('sd_preferences', JSON.stringify(preferences));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="flex-grow bg-slate-100 flex items-center justify-center p-6 h-full overflow-y-auto">
            <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-8 sm:p-12 border-b border-slate-100 flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <SettingsIcon className="text-brand-500" size={32} />
                            Configuración Avanzada
                        </h2>
                        <p className="text-slate-500 mt-2 font-medium">Personaliza tu experiencia de generación y gestiona tu cuenta PRO.</p>
                    </div>
                </div>

                <div className="p-8 sm:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">

                    {/* Preferencias */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                            <Monitor size={16} /> Preferencias del Generador
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Tema Visual por Defecto</label>
                                <select
                                    name="defaultTheme"
                                    value={preferences.defaultTheme}
                                    onChange={handleChange}
                                    className="w-full text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/20"
                                >
                                    <option value="classic">Clásico</option>
                                    <option value="minimalist">Minimalista</option>
                                    <option value="colorful">Dinámico</option>
                                    <option value="academic">Académico</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Estructura por Defecto</label>
                                <select
                                    name="defaultStructure"
                                    value={preferences.defaultStructure}
                                    onChange={handleChange}
                                    className="w-full text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/20"
                                >
                                    <option value="Tradicional">Inicio/Cierre (Tradicional)</option>
                                    <option value="ABP">Proyectos (ABP)</option>
                                    <option value="Flipped">Aula Invertida</option>
                                    <option value="Gamificación">Gamificación</option>
                                    <option value="Kolb">Ciclo de Kolb</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Clock size={16} /> Duración Estimada
                                </label>
                                <input
                                    type="text"
                                    name="defaultDuration"
                                    value={preferences.defaultDuration}
                                    onChange={handleChange}
                                    placeholder="Ej. 2h"
                                    className="w-full text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/20"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                className={`w-full py-4 mt-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/30'}`}
                            >
                                {saved ? <>¡Guardado correctamente!</> : <><Save size={18} /> Guardar Preferencias</>}
                            </button>
                        </div>
                    </div>

                    {/* Cuenta */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                            <User size={16} /> Datos de la Cuenta
                        </h3>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                            {session ? (
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Email Registrado</p>
                                        <p className="text-lg font-black text-slate-800">{session.user.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Tipo de Plan</p>
                                        <div className="inline-flex mt-1 items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-100 border border-brand-200">
                                            <span className="text-xs font-black text-brand-700 uppercase tracking-widest">Plan PRO</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Último Ingreso</p>
                                        <p className="text-sm font-medium text-slate-600">
                                            {new Date(session.user.last_sign_in_at).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="pt-6 border-t border-slate-200 mt-6">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-xl font-bold transition-colors"
                                        >
                                            <LogOut size={16} /> Cerrar Sesión Segura
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <User size={32} />
                                    </div>
                                    <p className="text-slate-500 font-medium mb-4">No has iniciado sesión. Para acceder a funciones Pro, ingresa a tu cuenta.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Settings;
