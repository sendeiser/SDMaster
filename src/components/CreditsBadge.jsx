import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Zap, ChevronRight, Sparkles } from 'lucide-react';

const PLAN_LIMITS = { free: 10, pro: 100, institution: 500 };

const CreditsBadge = ({ session, onUpgradeClick }) => {
    const [credits, setCredits] = useState(null);
    const [plan, setPlan] = useState('free');

    useEffect(() => {
        if (!session) return;
        const fetchCredits = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('credits_remaining, plan')
                .eq('id', session.user.id)
                .single();
            if (data) {
                setCredits(data.credits_remaining ?? 10);
                setPlan(data.plan ?? 'free');
            }
        };
        fetchCredits();
    }, [session]);

    if (!session || credits === null) return null;

    const limit = PLAN_LIMITS[plan] || 10;
    const pct = Math.max(0, Math.min(100, (credits / limit) * 100));
    const isLow = credits <= 2;
    const isEmpty = credits <= 0;

    return (
        <div
            className={`mx-4 mb-6 rounded-3xl p-4 border relative overflow-hidden transition-all duration-300 group hover:shadow-xl hover:-translate-y-1 ${
                isEmpty ? 'bg-red-50/50 border-red-100' :
                isLow ? 'bg-amber-50/50 border-amber-100' :
                'bg-white border-slate-100 hover:border-brand-200'
            }`}
            onClick={plan === 'free' ? onUpgradeClick : undefined}
        >
            {/* Background Decorative Element */}
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl opacity-10 transition-colors ${
                isEmpty ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-brand-500'
            }`}></div>

            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl transition-colors ${
                        isEmpty ? 'bg-red-100 text-red-600' : 
                        isLow ? 'bg-amber-100 text-amber-600' : 
                        'bg-brand-50 text-brand-600'
                    }`}>
                        <Zap size={12} className="fill-current" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        {plan === 'free' ? 'Plan Inicial' : plan === 'pro' ? 'Docente Pro' : 'Institucional'}
                    </span>
                </div>
                <span className={`text-xs font-black tracking-tight ${
                    isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                }`}>
                    {credits}/{limit}
                </span>
            </div>

            {/* Progress Bar Container */}
            <div className="relative mb-3 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50/50">
                <div
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                        isEmpty ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-gradient-to-r from-brand-500 to-indigo-500'
                    }`}
                    style={{ width: `${pct}%` }}
                >
                    {/* Animated Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                </div>
            </div>

            {plan === 'free' ? (
                <div className="flex items-center justify-between group/upgrade cursor-pointer">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                       <Sparkles size={10} className={isEmpty ? 'text-red-400' : 'text-brand-400'} />
                       <span className={`text-[9px] font-bold truncate ${isEmpty ? 'text-red-500' : 'text-slate-500'}`}>
                           {isEmpty ? '¡Sin créditos IA!' : 'Obtener créditos extra'}
                       </span>
                    </div>
                    <ChevronRight size={12} className="text-slate-300 group-hover/upgrade:text-brand-600 group-hover/upgrade:translate-x-0.5 transition-all" />
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    Membresía Activa
                </div>
            )}
        </div>
    );
};

export default CreditsBadge;
