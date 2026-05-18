import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    Users, ShieldCheck, Search, RefreshCw, Save, Plus, Minus, 
    TrendingUp, Award, Mail, GraduationCap, Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { PremiumCard, PremiumButton } from './shared/PremiumUI';

const AdminPanel = ({ session, profile }) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [submittingId, setSubmittingId] = useState(null);
    const [message, setMessage] = useState(null);
    const [editedUsers, setEditedUsers] = useState({}); // Stores local edits { userId: { credits_remaining, plan } }

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_list_users');
            if (error) throw error;
            setUsers(data || []);
            setFilteredUsers(data || []);
            // Initialize local edits mapping
            const edits = {};
            data.forEach(u => {
                edits[u.id] = { credits_remaining: u.credits_remaining, plan: u.plan };
            });
            setEditedUsers(edits);
        } catch (error) {
            console.error('Error fetching users:', error);
            setMessage({ type: 'error', text: 'Error al cargar usuarios de la base de datos.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Filter users on search query change
    useEffect(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(u => 
                (u.full_name && u.full_name.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query)) ||
                (u.role && u.role.toLowerCase().includes(query)) ||
                (u.institution && u.institution.toLowerCase().includes(query))
            );
            setFilteredUsers(filtered);
        }
    }, [searchQuery, users]);

    const handleLocalEdit = (userId, field, value) => {
        setEditedUsers(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [field]: value
            }
        }));
    };

    const handleSaveChanges = async (userId) => {
        setSubmittingId(userId);
        setMessage(null);
        const { credits_remaining, plan } = editedUsers[userId];
        
        try {
            const { data, error } = await supabase.rpc('admin_update_user_credits', {
                p_user_id: userId,
                p_credits: parseInt(credits_remaining, 10),
                p_plan: plan
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Cambios guardados con éxito en la base de datos.' });
            
            // Update local state to match saved data
            setUsers(prev => prev.map(u => 
                u.id === userId 
                    ? { ...u, credits_remaining: parseInt(credits_remaining, 10), plan } 
                    : u
            ));
        } catch (error) {
            console.error('Error updating user:', error);
            setMessage({ type: 'error', text: 'Error al actualizar el usuario. Permisos insuficientes.' });
        } finally {
            setSubmittingId(null);
            // Hide toast after 4 seconds
            setTimeout(() => setMessage(null), 4000);
        }
    };

    // Calculate metrics
    const totalUsers = users.length;
    const totalTeachers = users.filter(u => u.role === 'teacher').length;
    const totalStudents = users.filter(u => u.role === 'student').length;
    const planCounts = users.reduce((acc, u) => {
        acc[u.plan] = (acc[u.plan] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-8 font-inter">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-brand-600 mb-1.5">
                        <ShieldCheck size={20} className="stroke-[2.5]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Acceso de Desarrollador</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                        Panel de Administración
                    </h1>
                    <p className="text-xs font-bold text-slate-400 mt-2">
                        Gestioná planes, límites de créditos e información del sistema en tiempo real.
                    </p>
                </div>

                <PremiumButton 
                    variant="secondary"
                    onClick={fetchUsers}
                    disabled={loading}
                    className="flex items-center gap-2 self-start sm:self-auto !px-4 !h-10 border border-slate-200 shadow-sm"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sincronizar</span>
                </PremiumButton>
            </div>

            {/* Notification Toast inside container */}
            {message && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all animate-fade-in ${
                    message.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    ) : (
                        <AlertCircle size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider mb-1">
                            {message.type === 'success' ? 'Éxito' : 'Error del Servidor'}
                        </p>
                        <p className="text-[11px] font-bold opacity-90">{message.text}</p>
                    </div>
                </div>
            )}

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <PremiumCard className="!p-6 flex items-center justify-between border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Usuarios Totales</p>
                        <h4 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{totalUsers}</h4>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                        <Users size={20} />
                    </div>
                </PremiumCard>

                <PremiumCard className="!p-6 flex items-center justify-between border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Docentes / Aulas</p>
                        <h4 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{totalTeachers}</h4>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                        <Sparkles size={20} />
                    </div>
                </PremiumCard>

                <PremiumCard className="!p-6 flex items-center justify-between border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Alumnos Registrados</p>
                        <h4 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{totalStudents}</h4>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                        <GraduationCap size={20} />
                    </div>
                </PremiumCard>

                <PremiumCard className="!p-6 flex items-center justify-between border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Planes Activos</p>
                        <div className="flex gap-2.5 mt-2">
                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-black text-slate-600">F: {planCounts['free'] || 0}</span>
                            <span className="text-[10px] bg-indigo-100 px-2 py-0.5 rounded font-black text-indigo-700">P: {planCounts['pro'] || 0}</span>
                            <span className="text-[10px] bg-purple-100 px-2 py-0.5 rounded font-black text-purple-700">U: {planCounts['unlimited'] || 0}</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
                        <Award size={20} />
                    </div>
                </PremiumCard>
            </div>

            {/* List and Actions Container */}
            <PremiumCard className="!p-0 border-slate-200/60 overflow-hidden shadow-md">
                {/* Search Bar Block */}
                <div className="p-6 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-grow max-w-md">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-300">
                            <Search size={16} />
                        </div>
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar usuario por nombre, email, rol o institución..."
                            className="w-full pl-12 pr-6 h-10 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all shadow-sm"
                        />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Mostrando {filteredUsers.length} de {totalUsers} cuentas
                    </p>
                </div>

                {/* Table Block */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol / Escuela</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Actual</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Créditos de IA</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-xs font-bold text-slate-400">
                                        No se encontraron cuentas que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => {
                                    const edits = editedUsers[u.id] || { credits_remaining: u.credits_remaining, plan: u.plan };
                                    const isSelf = u.id === session.user.id;
                                    const hasChanged = edits.credits_remaining !== u.credits_remaining || edits.plan !== u.plan;

                                    return (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-slate-300 overflow-hidden font-black text-xs uppercase shadow-sm">
                                                        {u.full_name ? u.full_name.substring(0, 2) : 'US'}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                                                            {u.full_name || 'Sin Nombre'}
                                                            {isSelf && (
                                                                <span className="text-[8px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Tú</span>
                                                            )}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Mail size={10} />
                                                            {u.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                                    u.role === 'teacher' 
                                                        ? 'bg-indigo-50 text-indigo-700' 
                                                        : 'bg-emerald-50 text-emerald-700'
                                                }`}>
                                                    {u.role === 'teacher' ? 'Docente' : 'Alumno'}
                                                </span>
                                                {u.institution && (
                                                    <p className="text-[10px] font-bold text-slate-500 mt-2 truncate max-w-[150px]" title={u.institution}>
                                                        🏫 {u.institution}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <select 
                                                    value={edits.plan}
                                                    onChange={(e) => handleLocalEdit(u.id, 'plan', e.target.value)}
                                                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 p-2 focus:bg-white focus:outline-none transition-all shadow-sm"
                                                >
                                                    <option value="free">Inicial (Free)</option>
                                                    <option value="pro">Docente Pro</option>
                                                    <option value="institution">Institucional</option>
                                                    <option value="unlimited">Infinitos (Admin)</option>
                                                </select>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleLocalEdit(u.id, 'credits_remaining', Math.max(0, parseInt(edits.credits_remaining, 10) - 5))}
                                                        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold transition-all active:scale-95 shadow-sm"
                                                        disabled={edits.plan === 'unlimited'}
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    
                                                    <input 
                                                        type="number"
                                                        value={edits.plan === 'unlimited' ? '' : edits.credits_remaining}
                                                        onChange={(e) => handleLocalEdit(u.id, 'credits_remaining', Math.max(0, parseInt(e.target.value, 10) || 0))}
                                                        placeholder="∞"
                                                        className="w-16 h-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:bg-white focus:outline-none shadow-sm"
                                                        disabled={edits.plan === 'unlimited'}
                                                    />

                                                    <button 
                                                        onClick={() => handleLocalEdit(u.id, 'credits_remaining', parseInt(edits.credits_remaining, 10) + 5)}
                                                        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold transition-all active:scale-95 shadow-sm"
                                                        disabled={edits.plan === 'unlimited'}
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={() => handleSaveChanges(u.id)}
                                                    disabled={submittingId === u.id || !hasChanged}
                                                    className={`p-2.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center mx-auto shadow-sm ${
                                                        hasChanged 
                                                            ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800' 
                                                            : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                                    }`}
                                                    title="Guardar Cambios"
                                                >
                                                    {submittingId === u.id ? (
                                                        <RefreshCw size={14} className="animate-spin" />
                                                    ) : (
                                                        <Save size={14} />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </PremiumCard>
        </div>
    );
};

export default AdminPanel;
