import React, { useState } from 'react';
import { X, Check, ChevronDown, Plus, AlertCircle } from 'lucide-react';

/**
 * PremiumButton
 */
export const PremiumButton = ({ 
    children, 
    onClick, 
    icon, 
    variant = 'primary', 
    size = 'md', 
    disabled = false, 
    loading = false,
    className = "",
    type = "button"
}) => {
    const baseStyle = "flex items-center justify-center gap-2 font-black uppercase tracking-widest transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl";
    
    const sizes = {
        sm: "px-3 py-1.5 text-[10px]",
        md: "px-5 py-3 text-xs",
        lg: "px-8 py-4 text-sm"
    };

    const variants = {
        primary: "bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40",
        secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100 border border-transparent",
        danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100",
        dark: "bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
        >
            {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : icon}
            {children}
        </button>
    );
};

/**
 * PremiumCard
 */
export const PremiumCard = ({ children, title, icon, className = "", noPadding = false }) => (
    <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md ${className}`}>
        {(title || icon) && (
            <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
                {icon && <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-brand-600">{icon}</div>}
                {title && <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</h3>}
            </div>
        )}
        <div className={noPadding ? "" : "p-6"}>
            {children}
        </div>
    </div>
);

/**
 * PremiumInput
 */
export const PremiumInput = ({ label, icon, value, onChange, placeholder, type = "text", name, className = "" }) => (
    <div className={`space-y-1.5 group ${className}`}>
        {label && (
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-brand-600 transition-colors flex items-center gap-1">
                {icon}
                {label}
            </label>
        )}
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 bg-white/70 py-3 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all placeholder:text-slate-300 shadow-sm"
        />
    </div>
);

/**
 * TagInput
 */
export const TagInput = ({ label, tags, onAdd, onRemove, placeholder, icon }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            onAdd(inputValue.trim());
            setInputValue('');
        }
    };

    return (
        <div className="space-y-2 group">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-brand-600 transition-colors flex items-center gap-1">
                {icon}
                {label}
            </label>
            <div className="flex flex-wrap gap-2 p-2 min-h-[52px] bg-white/70 border border-slate-200 rounded-xl focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:border-brand-500 transition-all shadow-sm">
                {tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100 animate-fade-in group/tag">
                        {tag}
                        <button onClick={() => onRemove(tag)} className="p-0.5 hover:bg-brand-200 rounded-md transition-colors">
                            <X size={12} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? placeholder : ""}
                    className="flex-grow bg-transparent border-none outline-none px-2 text-sm font-semibold text-slate-800 min-w-[120px]"
                />
            </div>
        </div>
    );
};

/**
 * PremiumToast
 */
export const PremiumToast = ({ type = 'success', message, detail, onDismiss }) => {
    const colors = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        error: 'bg-rose-50 border-rose-200 text-rose-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        info: 'bg-sky-50 border-sky-200 text-sky-800'
    };

    return (
        <div className={`fixed top-5 right-5 z-[100] max-w-sm w-full p-4 rounded-2xl shadow-xl border animate-slide-up flex gap-3 items-start ${colors[type]}`}>
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-grow">
                <p className="font-bold text-xs">{message}</p>
                {detail && <p className="text-xs mt-0.5 opacity-80">{detail}</p>}
            </div>
            <button onClick={onDismiss} className="ml-auto text-xs opacity-50 hover:opacity-100 flex-shrink-0">
                <X size={14} />
            </button>
        </div>
    );
};

/**
 * PremiumTable
 */
export const PremiumTable = ({ headers, children, className = "" }) => (
    <div className={`w-full overflow-x-auto custom-scrollbar rounded-2xl border border-slate-100 bg-white shadow-sm ${className}`}>
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">
                <tr>
                    {headers.map((h, i) => (
                        <th key={i} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 ${h.className || ""}`}>
                            {h.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {children}
            </tbody>
        </table>
    </div>
);

/**
 * PremiumTabs
 * Supports both controlled (activeTab + onChange) and uncontrolled (defaultTab + render-prop) patterns.
 */
export const PremiumTabs = ({ 
    tabs, 
    activeTab: externalActiveTab, 
    onChange, 
    setActiveTab, // Support alternative prop name
    defaultTab,
    children,
    className = "" 
}) => {
    const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || (tabs && tabs.length > 0 ? tabs[0].id : null));
    
    // Determine which state to use
    const isControlled = externalActiveTab !== undefined && externalActiveTab !== null;
    const currentTab = isControlled ? externalActiveTab : internalActiveTab;
    
    const handleTabChange = (tabId) => {
        if (!isControlled) {
            setInternalActiveTab(tabId);
        }
        
        // Call any provided change handler
        if (typeof onChange === 'function') onChange(tabId);
        else if (typeof setActiveTab === 'function') setActiveTab(tabId);
    };

    return (
        <div className="space-y-4">
            <div className={`flex items-center gap-1 p-1 bg-slate-100/50 rounded-2xl border border-slate-100 w-fit ${className}`}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            currentTab === tab.id 
                            ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200/50' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                        }`}
                    >
                        {tab.icon && <span className={currentTab === tab.id ? "text-brand-500" : "opacity-50"}>{tab.icon}</span>}
                        {tab.label}
                    </button>
                ))}
            </div>
            
            {/* If children is a function (render-prop pattern) */}
            {typeof children === 'function' ? children(currentTab) : children}
        </div>
    );
};

/**
 * PremiumModal
 */
export const PremiumModal = ({ isOpen, onClose, title, children, footer, maxWidth = "max-w-md" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full ${maxWidth} bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]`}>
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar flex-grow">
                    {children}
                </div>
                {footer && (
                    <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
