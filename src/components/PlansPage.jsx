import React from 'react';
import { Zap, CheckCircle2, X, ArrowRight } from 'lucide-react';

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: '$0',
        period: 'siempre gratis',
        color: 'border-slate-200',
        badge: 'bg-slate-100 text-slate-600',
        btnClass: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        btnLabel: 'Plan Actual',
        disabled: true,
        features: [
            '10 generaciones IA / mes',
            '1 Aula de clase',
            'Hasta 15 alumnos por aula',
            'Corrección automática: ✓',
            'Exportar CSV: ✓',
        ],
        missing: ['Generaciones ilimitadas', 'Aulas ilimitadas'],
    },
    {
        id: 'pro',
        name: 'Pro Docente',
        price: '$9.99',
        period: '/ mes',
        color: 'border-brand-400 shadow-xl shadow-brand-500/10',
        badge: 'bg-brand-600 text-white',
        btnClass: 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/25',
        btnLabel: 'Suscribirme',
        popular: true,
        disabled: false,
        features: [
            '100 generaciones IA / mes',
            'Aulas ilimitadas',
            'Alumnos ilimitados por aula',
            'Corrección automática: ✓',
            'Exportar CSV: ✓',
            'Soporte prioritario',
        ],
        missing: [],
    },
    {
        id: 'institution',
        name: 'Institución',
        price: '$29.99',
        period: '/ mes',
        color: 'border-amber-300',
        badge: 'bg-amber-500 text-white',
        btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
        btnLabel: 'Contactar',
        disabled: false,
        features: [
            '500 generaciones IA / mes',
            'Aulas ilimitadas',
            'Múltiples docentes',
            'Corrección automática: ✓',
            'Exportar CSV: ✓',
            'Panel administrativo',
            'Soporte dedicado',
        ],
        missing: [],
    },
];

const PlansPage = ({ currentPlan = 'free', onClose }) => {
    return (
        <div className="min-h-full bg-gradient-to-b from-slate-50 to-white py-12 px-4">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-full mb-4">
                        <Zap size={13} className="fill-brand-600" /> Planes y Precios
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
                        Elegí tu plan
                    </h1>
                    <p className="text-slate-500 text-lg max-w-xl mx-auto">
                        Generá secuencias, evaluaciones y corregí trabajos con IA. Sin límites con los planes de pago.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {PLANS.map(plan => (
                        <div
                            key={plan.id}
                            className={`relative bg-white rounded-3xl border-2 p-8 flex flex-col ${plan.color} transition-all`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="bg-brand-600 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg">
                                        ⭐ Más Popular
                                    </span>
                                </div>
                            )}

                            <div className={`self-start text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4 ${plan.badge}`}>
                                {plan.name}
                            </div>

                            <div className="mb-6">
                                <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                                <span className="text-slate-400 font-medium ml-1">{plan.period}</span>
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 font-medium">
                                        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                        {f}
                                    </li>
                                ))}
                                {plan.missing.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-400 font-medium line-through">
                                        <X size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {currentPlan === plan.id ? (
                                <div className="w-full text-center py-3 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-xl border border-emerald-200">
                                    ✓ Plan Actual
                                </div>
                            ) : (
                                <a
                                    href={
                                        plan.id === 'pro'
                                            ? 'https://lemonsqueezy.com' // 🔧 Reemplazar con tu link de Lemon Squeezy
                                            : plan.id === 'institution'
                                            ? 'mailto:soporte@sdmaster.com' // 🔧 Reemplazar con tu email
                                            : '#'
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`w-full flex items-center justify-center gap-2 py-3 font-bold text-sm rounded-xl transition-all ${plan.btnClass}`}
                                >
                                    {plan.btnLabel}
                                    <ArrowRight size={16} />
                                </a>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer note */}
                <p className="text-center text-slate-400 text-sm mt-10 font-medium">
                    Pagos seguros procesados por <strong>Lemon Squeezy</strong> · Cancelá cuando quieras · Precios en USD
                </p>

                {onClose && (
                    <div className="text-center mt-6">
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
                        >
                            ← Volver al dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlansPage;
