import React, { useState, useEffect } from 'react';
import {
    User as UserIcon, Settings as SettingsIcon, Save, Monitor, Clock, LogOut,
    BookOpen, GraduationCap, Camera, Lock as LockIcon, CheckCircle2, AlertCircle, Loader2, Sparkles,
    ChevronRight, X, Plus, BellRing, Smartphone, ShieldCheck, Mail, Building,
    KeyRound, Palette, Layout, Cpu, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { sequenceDbService } from '../lib/sequenceDbService';
import { 
    PremiumButton, PremiumCard, PremiumInput, 
    PremiumToast, PremiumTabs, TagInput 
} from './shared/PremiumUI';

const Settings = ({ session, onProfileUpdate }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState('profile'); 
    const [notification, setNotification] = useState(null);

    const [profile, setProfile] = useState({
        full_name: '',
        avatar_url: '',
        subjects: [],
        courses: [],
        role: 'teacher',
        institution: ''
    });

    const [preferences, setPreferences] = useState({
        defaultDuration: '2h',
        defaultTheme: 'midnight',
        defaultStructure: 'Tradicional',
        defaultSubject: '',
        defaultYear: '',
        defaultTopic: ''
    });

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        loadUserData();
    }, [session]);

    const showNotif = (type, message, detail) => setNotification({ type, message, detail });

    const loadUserData = async () => {
        setLoading(true);
        try {
            const data = await sequenceDbService.getProfile();
            if (data) {
                setProfile({
                    full_name: data.full_name || '',
                    avatar_url: data.avatar_url || '',
                    subjects: data.subjects || [],
                    courses: data.courses || [],
                    role: data.role || 'teacher',
                    institution: data.institution || ''
                });
            }

            const stored = localStorage.getItem('sd_preferences');
            if (stored) {
                const parsed = JSON.parse(stored);
                setPreferences(prev => ({ ...prev, ...parsed }));
            }
        } catch (error) {
            console.error("Error loading user data:", error);
            showNotif('error', 'Error de carga', 'No pudimos sincronizar tu perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handlePreferenceChange = (name, value) => {
        setPreferences(prev => {
            const newPrefs = { ...prev, [name]: value };
            localStorage.setItem('sd_preferences', JSON.stringify(newPrefs));
            return newPrefs;
        });
    };

    const handleAddTag = (field, value) => {
        if (!profile[field].includes(value)) {
            setProfile(prev => ({ ...prev, [field]: [...prev[field], value] }));
        }
    };

    const handleRemoveTag = (field, value) => {
        setProfile(prev => ({ ...prev, [field]: prev[field].filter(t => t !== value) }));
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await sequenceDbService.updateProfile(profile);
            if (onProfileUpdate) await onProfileUpdate(session.user);
            showNotif('success', '¡Perfil actualizado!', 'Tus cambios se han guardado con éxito.');
        } catch (error) {
            showNotif('error', 'Error al guardar', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        showNotif('info', 'Subiendo...', 'Estamos procesando tu nueva imagen.');
        try {
            const publicUrl = await sequenceDbService.uploadAvatar(file);
            const updatedProfile = { ...profile, avatar_url: publicUrl };
            setProfile(updatedProfile);
            await sequenceDbService.updateProfile(updatedProfile);
            if (onProfileUpdate) await onProfileUpdate(session.user);
            showNotif('success', 'Foto actualizada', 'Tu nueva imagen de perfil ya está lista.');
        } catch (error) {
            showNotif('error', 'Error al subir', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        if (e) e.preventDefault();
        const { newPassword, confirmPassword } = passwordData;
        
        if (newPassword !== confirmPassword) {
            showNotif('error', 'Error', 'Las contraseñas no coinciden.');
            return;
        }
        if (newPassword.length < 6) {
            showNotif('warning', 'Seguridad débil', 'La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setSaving(true);
        try {
            await sequenceDbService.updatePassword(newPassword);
            showNotif('success', 'Contraseña cambiada', 'Tu acceso es seguro ahora.');
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            showNotif('error', 'Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] animate-pulse">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando configuración...</p>
            </div>
        );
    }

    const sections = [
        { id: 'profile', label: 'Mi Perfil', icon: <UserIcon size={16}/>, color: 'text-blue-500' },
        { id: 'academic', label: 'Académico', icon: <GraduationCap size={16}/>, color: 'text-purple-500', hide: profile.role === 'student' },
        { id: 'security', label: 'Seguridad', icon: <ShieldCheck size={16}/>, color: 'text-emerald-500' },
        { id: 'preferences', label: 'Preferencias', icon: <SettingsIcon size={16}/>, color: 'text-amber-500', hide: profile.role === 'student' }
    ].filter(s => !s.hide);

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
            {notification && (
                <PremiumToast 
                    type={notification.type} 
                    message={notification.message} 
                    detail={notification.detail} 
                    onDismiss={() => setNotification(null)} 
                />
            )}

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                            <SettingsIcon size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Configuración de Cuenta</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Panel de <span className="text-brand-600">Control</span></h1>
                    <p className="text-slate-500 font-medium mt-2 max-w-xl">
                        Personaliza tu identidad, mejora tu flujo académico y ajusta la IA a tus necesidades pedagógicas.
                    </p>
                </div>
                
                {activeSection !== 'security' && activeSection !== 'preferences' && (
                    <PremiumButton 
                        onClick={handleSaveProfile}
                        loading={saving}
                        icon={<Save size={20} />}
                        className="w-full md:w-auto !rounded-2xl shadow-xl shadow-brand-500/10"
                    >
                        Guardar Cambios
                    </PremiumButton>
                )}
            </div>

            {/* Layout Main */}
            <div className="flex flex-col lg:flex-row gap-10">
                
                {/* Navigation Sidebar */}
                <div className="w-full lg:w-80 shrink-0">
                    <div className="sticky top-10 space-y-8">
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-2 shadow-sm overflow-hidden">
                            <nav className="flex flex-col gap-1">
                                {sections.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setActiveSection(s.id)}
                                        className={`flex items-center gap-4 px-6 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all ${
                                            activeSection === s.id 
                                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className={activeSection === s.id ? 'text-brand-400' : 'opacity-40'}>{s.icon}</span>
                                        {s.label}
                                        {activeSection === s.id && <ChevronRight size={14} className="ml-auto text-brand-400"/>}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <PremiumButton 
                            variant="danger" 
                            onClick={handleLogout} 
                            icon={<LogOut size={18}/>}
                            className="w-full !rounded-2xl !bg-rose-50 !text-rose-600 !border-rose-100 !py-4 hover:!bg-rose-100"
                        >
                            Cerrar Sesión
                        </PremiumButton>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <PremiumCard className="animate-scale-up" noPadding>
                        <div className="p-10 border-b border-slate-50 bg-slate-50/20">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                {sections.find(s => s.id === activeSection)?.icon}
                                {sections.find(s => s.id === activeSection)?.label}
                            </h2>
                            <p className="text-sm text-slate-400 font-medium mt-1 uppercase tracking-tighter">Gestiona los detalles de tu cuenta</p>
                        </div>

                        <div className="p-10">
                            {activeSection === 'profile' && (
                                <div className="space-y-12">
                                    <div className="flex flex-col md:flex-row items-center gap-10 p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-50 to-white border border-slate-100 shadow-inner">
                                        <div className="relative group/avatar">
                                            <div className="w-40 h-40 rounded-[3rem] bg-white border-8 border-white shadow-2xl overflow-hidden transform group-hover:rotate-3 transition-all duration-500">
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                                                        <UserIcon size={80} />
                                                    </div>
                                                )}
                                            </div>
                                            <label className="absolute -bottom-4 -right-4 w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-2xl border-4 border-white flex items-center justify-center hover:bg-brand-600 transition-colors cursor-pointer active:scale-90 overflow-hidden">
                                                <Camera size={20} />
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                            </label>
                                        </div>
                                        <div className="text-center md:text-left space-y-2">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Identidad Visual</h4>
                                            <h3 className="text-xl font-black text-slate-900">Foto de Perfil</h3>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs">
                                                Una imagen clara permite que tus estudiantes y colegas te identifiquen fácilmente en el aula.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <PremiumInput 
                                            label="Nombre Completo" icon={<UserIcon size={12}/>}
                                            name="full_name" value={profile.full_name} onChange={handleProfileChange}
                                            placeholder="Tu nombre completo"
                                        />
                                        <PremiumInput 
                                            label="Institución Educativa" icon={<Building size={12}/>}
                                            name="institution" value={profile.institution} onChange={handleProfileChange}
                                            placeholder="Nombre de tu escuela o universidad"
                                        />
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-1 flex items-center gap-1">
                                                <Mail size={12}/> Email Académico (Invariable)
                                            </label>
                                            <div className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 font-bold opacity-60 flex items-center gap-3">
                                                {session?.user?.email}
                                                <LockIcon size={14} className="ml-auto opacity-30"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'academic' && (
                                <div className="space-y-12">
                                    <div className="grid grid-cols-1 gap-10">
                                        <TagInput 
                                            label="Mis Disciplinas / Materias" 
                                            placeholder="Ej. Matemática..." 
                                            tags={profile.subjects}
                                            onAdd={(v) => handleAddTag('subjects', v)}
                                            onRemove={(v) => handleRemoveTag('subjects', v)}
                                            icon={<BookOpen size={12}/>}
                                        />
                                        <TagInput 
                                            label="Cursos y Niveles" 
                                            placeholder="Ej. 1er Año, 5to B..." 
                                            tags={profile.courses}
                                            onAdd={(v) => handleAddTag('courses', v)}
                                            onRemove={(v) => handleRemoveTag('courses', v)}
                                            icon={<Layout size={12}/>}
                                        />
                                    </div>
                                    
                                    <div className="p-10 bg-brand-50 rounded-[3rem] border border-brand-100 flex items-start gap-6 relative overflow-hidden group">
                                        <div className="w-14 h-14 shrink-0 bg-white rounded-2xl shadow-xl flex items-center justify-center text-brand-600 transform group-hover:scale-110 transition-all duration-500">
                                            <Sparkles size={28} />
                                        </div>
                                        <div className="relative z-10">
                                            <h5 className="text-lg font-black text-brand-800 mb-2">Contextualización Inteligente</h5>
                                            <p className="text-sm text-brand-700/70 font-medium leading-relaxed">
                                                Al completar estos datos, permites que nuestra IA genere secuencias y evaluaciones 
                                                específicas para tu contexto. Cuanto más detallado, mejores serán los resultados.
                                            </p>
                                        </div>
                                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <GraduationCap size={160}/>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'security' && (
                                <div className="space-y-12">
                                    <div className="max-w-md space-y-8">
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                                <KeyRound size={20} className="text-brand-500" />
                                                Seguridad de Acceso
                                            </h3>
                                            <p className="text-sm text-slate-400 font-medium">Mantén tu cuenta protegida con una contraseña robusta.</p>
                                        </div>

                                        <form onSubmit={(e) => { e.preventDefault(); handlePasswordUpdate(); }} className="space-y-6">
                                            <PremiumInput 
                                                label="Nueva Contraseña" icon={<LockIcon size={12}/>}
                                                type="password" name="newPassword" value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                placeholder="Mínimo 6 caracteres"
                                            />
                                            <PremiumInput 
                                                label="Confirmar Contraseña" icon={<LockIcon size={12}/>}
                                                type="password" name="confirmPassword" value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                placeholder="Repite la contraseña"
                                            />
                                            <PremiumButton
                                                onClick={handlePasswordUpdate}
                                                loading={saving}
                                                className="w-full !rounded-2xl !py-4 shadow-xl shadow-slate-900/10"
                                                icon={<LockIcon size={18}/>}
                                            >
                                                Actualizar Credenciales
                                            </PremiumButton>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'preferences' && (
                                <div className="space-y-12">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Palette size={18} className="text-slate-400" />
                                                    Entorno Visual
                                                </h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Personaliza tu espacio</p>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paleta de Interfaz</label>
                                                    <div className="relative group">
                                                        <select
                                                            className="w-full h-14 appearance-none px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:border-brand-500 outline-none cursor-pointer pr-12 transition-all"
                                                            value={preferences.defaultTheme} 
                                                            onChange={(e) => handlePreferenceChange('defaultTheme', e.target.value)}
                                                        >
                                                            <option value="midnight">Midnight Pro (Oscuro)</option>
                                                            <option value="solar">Solar Gold (Cálido)</option>
                                                            <option value="emerald">Emerald Luxe (Verde)</option>
                                                            <option value="nordic">Nordic Ice (Claro)</option>
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                                            <ChevronRight size={18} className="rotate-90"/>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                    <Cpu size={18} className="text-slate-400" />
                                                    Predeterminados IA
                                                </h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ahorra tiempo de entrada</p>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Materia Recurrente</label>
                                                    <div className="relative group">
                                                        <select
                                                            className="w-full h-14 appearance-none px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:border-brand-500 outline-none cursor-pointer pr-12 transition-all"
                                                            value={preferences.defaultSubject} 
                                                            onChange={(e) => handlePreferenceChange('defaultSubject', e.target.value)}
                                                        >
                                                            <option value="">Selecciona una...</option>
                                                            {profile.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                                            <ChevronRight size={18} className="rotate-90"/>
                                                        </div>
                                                    </div>
                                                </div>
                                                <PremiumInput 
                                                    label="Año Predeterminado" icon={<Calendar size={12}/>}
                                                    value={preferences.defaultYear} 
                                                    onChange={(e) => handlePreferenceChange('defaultYear', e.target.value)}
                                                    placeholder="Ej. 1er Año"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-12 bg-slate-900 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                                        <div className="relative z-10 space-y-4">
                                            <div className="w-16 h-16 bg-brand-500/20 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-brand-500/30">
                                                <Sparkles size={32} className="text-brand-400" />
                                            </div>
                                            <h4 className="text-2xl font-black tracking-tight">SD Master Lab</h4>
                                            <p className="text-slate-400 font-medium text-sm max-w-sm leading-relaxed mx-auto">
                                                Muy pronto: Personaliza la estructura didáctica predeterminada y define el tono de voz pedagógico de tu IA.
                                            </p>
                                        </div>
                                        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-brand-600/10 rounded-full blur-[100px]"></div>
                                        <div className="absolute -right-20 -top-20 w-80 h-80 bg-slate-900 rounded-full blur-[100px]"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </PremiumCard>
                </div>
            </div>
        </div>
    );
};

export default Settings;
