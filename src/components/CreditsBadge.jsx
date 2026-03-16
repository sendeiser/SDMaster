import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Zap, ChevronRight } from 'lucide-react';

const PLAN_LIMITS = { free: 10, pro: 100, institution: 500 };
const PLAN_COLORS = {
    free: 'text-slate-500 bg-slate-100',
    pro: 'text-brand-700 bg-brand-100',
    institution: 'text-amber-700 bg-amber-100',
};

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
            className={`mx-3 mb-3 rounded-2xl p-3 border cursor-pointer transition-all hover:shadow-md ${
                isEmpty ? 'bg-red-50 border-red-200' :
                isLow ? 'bg-amber-50 border-amber-200' :
                'bg-slate-50 border-slate-200 hover:border-brand-300'
            }`}
            onClick={plan === 'free' ? onUpgradeClick : undefined}
            title="Créditos de generación IA"
        >
            <div className="flex items-center justify-between mb-1.5">
                <div className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-widest ${PLAN_COLORS[plan]}`}>
                    <Zap size={11} className="fill-current" />
                    {plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Institución'}
                </div>
                <span className={`text-xs font-black ${isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-500'}`}>
                    {credits}/{limit}
                </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${
                        isEmpty ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-brand-500'
                    }`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            {plan === 'free' && (
                <div className={`mt-2 flex items-center justify-between text-[10px] font-bold ${isEmpty ? 'text-red-600' : 'text-slate-400'}`}>
                    <span>{isEmpty ? '¡Sin créditos!' : 'Créditos IA restantes'}</span>
                    <div className="flex items-center gap-0.5 text-brand-600">
                        <span>Mejorar</span>
                        <ChevronRight size={10} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditsBadge;
