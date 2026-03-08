import React, { useState, useEffect } from 'react';
import {
    User, Settings as SettingsIcon, Save, Monitor, Clock, LogOut,
    BookOpen, GraduationCap, Camera, Lock, CheckCircle2, AlertCircle, Loader2, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { sequenceDbService } from '../lib/sequenceDbService';

const Settings = ({ session }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        full_name: '',
        avatar_url: '',
        subjects: [],
        courses: []
    });
    const [preferences, setPreferences] = useState({
        defaultDuration: '2h',
        defaultTheme: 'midnight',
        defaultStructure: 'Tradicional'
    });

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const [status, setStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        loadUserData();
    }, [session]);

    const loadUserData = async () => {
        setLoading(true);
        try {
            const data = await sequenceDbService.getProfile();
            if (data) {
                setProfile({
                    full_name: data.full_name || '',
                    avatar_url: data.avatar_url || '',
                    subjects: data.subjects || [],
                    courses: data.courses || []
                });
            }

            const stored = localStorage.getItem('sd_preferences');
            if (stored) {
                setPreferences(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handlePreferenceChange = (e) => {
        const { name, value } = e.target;
        setPreferences(prev => ({ ...prev, [name]: value }));
    };

    const handleArrayChange = (name, value) => {
        const arr = value.split(',').map(item => item.trim()).filter(Boolean);
        setProfile(prev => ({ ...prev, [name]: arr }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            await sequenceDbService.updateProfile(profile);
            localStorage.setItem('sd_preferences', JSON.stringify(preferences));
            setStatus({ type: 'success', message: '¡Configuración guardada correctamente!' });
        } catch (error) {
            setStatus({ type: 'error', message: 'Error al guardar: ' + error.message });
        } finally {
            setSaving(false);
            setTimeout(() => setStatus({ type: '', message: '' }), 4000);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        setStatus({ type: 'info', message: 'Subiendo imagen...' });
        try {
            const publicUrl = await sequenceDbService.uploadAvatar(file);
            const updatedProfile = { ...profile, avatar_url: publicUrl };
            setProfile(updatedProfile);
            await sequenceDbService.updateProfile(updatedProfile);
            setStatus({ type: 'success', message: 'Foto de perfil actualizada' });
        } catch (error) {
            setStatus({ type: 'error', message: 'Error al subir: ' + error.message });
        } finally {
            setSaving(false);
            setTimeout(() => setStatus({ type: '', message: '' }), 4000);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        const { newPassword, confirmPassword } = passwordData;
        if (newPassword !== confirmPassword) {
            setStatus({ type: 'error', message: 'Las contraseñas no coinciden' });
            return;
        }
        if (newPassword.length < 6) {
            setStatus({ type: 'error', message: 'Mínimo 6 caracteres' });
            return;
        }

        setSaving(true);
        try {
            await sequenceDbService.updatePassword(newPassword);
            setStatus({ type: 'success', message: 'Contraseña actualizada con éxito' });
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setSaving(false);
            setTimeout(() => setStatus({ type: '', message: '' }), 4000);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (loading) {
        return (
            <div className="flex-grow flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 size={40} className="animate-spin text-brand-500" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sincronizando perfil...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow bg-slate-50 p-4 md:p-8 lg:p-12 overflow-y-auto custom-scrollbar flex justify-center">
            <div className="max-w-5xl w-full space-y-8">

                {/* Header Dinámico */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center overflow-hidden border-2 border-brand-100 shadow-inner">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                                ) : (
                                    <User size={32} className="text-brand-300" />
                                )}
                            </div>
                            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-lg shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-500 transition-colors cursor-pointer">
                                <Camera size={14} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                {profile.full_name || 'Configura tu nombre'}
                            </h2>
                            <p className="text-slate-500 font-medium">{session?.user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Guardar Cambios
                    </button>
                </div>

                {status.message && (
                    <div className={`p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <p className="font-bold text-sm">{status.message}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Columna Izquierda: Datos Personales y Académicos */}
                    <div className="lg:col-span-2 space-y-8">

                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <User size={16} /> Información Personal
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nombre Completo</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        value={profile.full_name}
                                        onChange={handleProfileChange}
                                        placeholder="Ej. Prof. Juan Pérez"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-slate-800"
                                    />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <p className="text-xs text-slate-400 font-medium">Puedes cambiar tu foto haciendo clic en el ícono de la cámara arriba.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <GraduationCap size={16} /> Perfil Académico
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Materias que Dictas (Separadas por comas)</label>
                                    <textarea
                                        rows="2"
                                        placeholder="Matemática, Física, Robótica..."
                                        value={profile.subjects.join(', ')}
                                        onChange={(e) => handleArrayChange('subjects', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium resize-none text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Cursos/Años (Separados por comas)</label>
                                    <input
                                        type="text"
                                        placeholder="1° Año, 2° Año, 5° B"
                                        value={profile.courses.join(', ')}
                                        onChange={(e) => handleArrayChange('courses', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-slate-800"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                                <Lock size={16} /> Seguridad de la Cuenta
                            </h3>
                            <form onSubmit={handlePasswordUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-slate-800"
                                        placeholder="Mínimo 6 chars"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        className="flex-grow px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-slate-800"
                                        placeholder="Repetir..."
                                    />
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-slate-900 hover:bg-black:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-lg"
                                    >
                                        Cambiar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Columna Derecha: Preferencias Generador */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-3xl p-8 border-2 border-brand-50 shadow-sm space-y-6 lg:sticky lg:top-8">
                            <h3 className="text-xs font-black text-brand-600 uppercase tracking-widest flex items-center gap-2">
                                <Monitor size={16} /> Defaults del Generador
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Materia Predeterminada</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-brand-500 outline-none"
                                        name="defaultSubject"
                                        value={preferences.defaultSubject || ''}
                                        onChange={handlePreferenceChange}
                                    >
                                        <option value="">Selecciona...</option>
                                        {profile.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tema Visual Premium</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-brand-500 outline-none"
                                        name="defaultTheme"
                                        value={preferences.defaultTheme}
                                        onChange={handlePreferenceChange}
                                    >
                                        <option value="midnight">Midnight Pro</option>
                                        <option value="solar">Solar Gold</option>
                                        <option value="emerald">Emerald Luxe</option>
                                        <option value="nordic">Nordic Ice</option>
                                    </select>
                                </div>

                                <div className="pt-6">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50:bg-red-900/10 rounded-xl font-bold transition-all text-xs uppercase tracking-widest"
                                    >
                                        <LogOut size={14} /> Salida Segura
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
