import React from 'react';
import { Zap, CheckCircle2, X, ArrowRight, Star, ShieldCheck, Mail } from 'lucide-react';
import { PremiumButton, PremiumCard } from './shared/PremiumUI';

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: 'Gratis',
        period: 'siempre',
        badge: 'Básico',
        description: 'Ideal para probar el poder de la IA en tus clases.',
        features: [
            '10 generaciones IA / mes',
            '1 Aula de clase activa',
            'Hasta 15 alumnos por aula',
            'Corrección automática estándar',
            'Exportación de notas (CSV)',
        ],
        missing: ['Generaciones ilimitadas', 'Aulas ilimitadas', 'Soporte prioritario'],
    },
    {
        id: 'pro',
        name: 'Pro Docente',
        price: '$9.99',
        period: '/ mes',
        badge: 'Más Popular',
        popular: true,
        description: 'Todo lo que un docente necesita para potenciar su productividad.',
        features: [
            '100 generaciones IA / mes',
            'Aulas ilimitadas',
            'Alumnos ilimitados',
            'Corrección automática IA avanzada',
            'Soporte prioritario 24/7',
            'Exportación avanzada',
        ],
        missing: [],
    },
    {
        id: 'institution',
        name: 'Institución',
        price: '$29.99',
        period: '/ mes',
        badge: 'Enterprise',
        description: 'Para escuelas que buscan digitalizar su pedagogía.',
        features: [
            '500 generaciones IA / mes',
            'Panel administrativo central',
            'Múltiples cuentas docentes',
            'Capacitación dedicada',
            'API de integración propia',
            'SLA de 99.9%',
        ],
        missing: [],
    },
];

const PlansPage = ({ currentPlan = 'free', onClose }) => {
    return (
        <div className="min-h-full bg-slate-50/30 py-12 px-4 animate-fade-in">
            <div className="max-w-6xl mx-auto space-y-16">

                {/* Header */}
                <div className="text-center space-y-6">
                    <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 font-black text-[10px] uppercase tracking-[0.2em] px-5 py-2.5 rounded-full border border-brand-100 shadow-sm">
                        <Zap size={14} className="fill-brand-600" /> Membresías
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                        Potenciá tu <span className="text-brand-600">Impacto Docente</span>
                    </h1>
                    <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                        Elegí la escala de tu transformación digital. Generá, evaluá y corregí con el poder de la IA más avanzada.
                    </p>
                </div>

                {/* Cards Container */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pb-10">
                    {PLANS.map(plan => (
                        <PremiumCard
                            key={plan.id}
                            noPadding
                            className={`flex flex-col relative group transition-all duration-500 hover:-translate-y-2 ${
                                plan.popular ? 'border-brand-200 shadow-2xl shadow-brand-500/10' : 'border-slate-100'
                            }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 inset-x-0 flex justify-center z-10">
                                    <span className="bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-full shadow-xl">
                                        ⭐ Recomendado
                                    </span>
                                </div>
                            )}

                            <div className="p-10 flex-1 flex flex-col">
                                <div className="mb-8 border-b border-slate-50 pb-8">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg mb-4 inline-block ${
                                        plan.id === 'pro' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {plan.badge}
                                    </span>
                                    <h3 className="text-2xl font-black text-slate-900 mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-slate-900 tracking-tight">{plan.price}</span>
                                        <span className="text-slate-400 font-bold text-sm tracking-tight">{plan.period}</span>
                                    </div>
                                    <p className="text-slate-400 text-xs font-medium mt-4 line-clamp-2">
                                        {plan.description}
                                    </p>
                                </div>

                                <ul className="space-y-4 mb-10">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-slate-700 font-bold group/feat">
                                            <div className="w-5 h-5 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5 group-hover/feat:scale-110 transition-transform">
                                                <CheckCircle2 size={12} />
                                            </div>
                                            {f}
                                        </li>
                                    ))}
                                    {plan.missing.map((f, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300 font-medium line-through">
                                            <div className="w-5 h-5 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                                <X size={12} />
                                            </div>
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-auto">
                                    {currentPlan === plan.id ? (
                                        <div className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest rounded-2xl border border-emerald-100">
                                            <ShieldCheck size={16} /> Tu Plan Actual
                                        </div>
                                    ) : (
                                        <PremiumButton
                                            variant={plan.id === 'pro' ? 'primary' : 'secondary'}
                                            className="w-full !py-4 !rounded-2xl !text-[11px] !font-black !uppercase !tracking-widest shadow-lg"
                                            onClick={() => window.open(plan.id === 'pro' ? 'https://lemonsqueezy.com' : 'mailto:ventas@sdmaster.com', '_blank')}
                                            icon={<ArrowRight size={16}/>}
                                            iconPosition="right"
                                        >
                                            {plan.id === 'institution' ? 'Contactar' : 'Comenzar Ahora'}
                                        </PremiumButton>
                                    )}
                                </div>
                            </div>
                        </PremiumCard>
                    ))}
                </div>

                {/* Trust Footer */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 pt-10 border-t border-slate-100">
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-3">
                        <ShieldCheck size={18} className="text-brand-500" /> Pagos Seguros con Lemon Squeezy
                    </p>
                    <div className="h-4 w-[1px] bg-slate-200 hidden md:block"></div>
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-3">
                        <Mail size={18} className="text-brand-500" /> Soporte Dedicado: hola@sdmaster.com
                    </p>
                </div>

                {onClose && (
                    <div className="text-center">
                        <button
                            onClick={onClose}
                            className="text-slate-300 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-all px-6 py-3 rounded-2xl hover:bg-slate-50"
                        >
                            ← Ir a mi Escritorio
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlansPage;
