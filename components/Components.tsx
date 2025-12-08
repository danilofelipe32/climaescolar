import React from 'react';
import { 
    LayoutDashboard, Calculator, FileText, Settings, Shield, School, 
    Heart, AlertTriangle, GraduationCap, Briefcase, User, Smile, 
    Frown, Meh, Quote, LucideIcon
} from 'lucide-react';
import { Suggestion } from '../types';

// --- Sidebar ---
interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    const items = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
        { id: 'stats', icon: Calculator, label: 'Stats' },
        { id: 'reports', icon: FileText, label: 'Docs' },
        { id: 'settings', icon: Settings, label: 'Config' }
    ];

    return (
        <div className="hidden md:flex flex-col w-24 bg-[#0f172a] border-r border-slate-800 h-screen items-center py-8 gap-8 fixed left-0 top-0 z-50 shadow-2xl">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-4">
                <School className="text-white" size={28} />
            </div>
            <div className="flex flex-col gap-8 w-full items-center">
                {items.map((item) => (
                    <button 
                        key={item.id} 
                        onClick={() => setActiveTab(item.id)} 
                        className={`p-3.5 rounded-2xl transition-all duration-300 relative group flex flex-col items-center gap-1 ${activeTab === item.id ? 'bg-slate-800 text-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] border border-slate-700' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-900'}`}
                    >
                        <item.icon size={26} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                        {activeTab === item.id && <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-8 bg-cyan-400 rounded-r-full shadow-[0_0_10px_#06b6d4]"></span>}
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- KPI Card ---
interface KpiCardProps {
    title: string;
    value: string;
    subValue: string;
    gradient: string;
    icon: LucideIcon;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, subValue, gradient, icon: Icon }) => (
    <div className="relative overflow-hidden rounded-3xl p-6 shadow-2xl border border-slate-800 group hover:-translate-y-1 transition-transform duration-500 bg-[#1e293b]">
        <div className="absolute inset-0 bg-gradient-to-br opacity-10" style={{ backgroundImage: gradient }}></div>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: gradient }}></div>
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-700 text-cyan-400"><Icon size={22} /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{title}</span>
                </div>
                <h3 className="text-4xl font-black text-white mb-1 tracking-tight drop-shadow-sm">{value}</h3>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{subValue}</p>
            </div>
        </div>
    </div>
);

// --- Suggestion Card ---
interface SuggestionCardProps {
    sug: Suggestion;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ sug }) => {
    const getRoleConfig = (role: string) => {
        const r = role.toLowerCase();
        if (r.includes('aluno')) return { icon: GraduationCap, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
        if (r.includes('professor')) return { icon: Briefcase, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
        return { icon: User, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
    };
    const getSentimentConfig = (sentiment: string) => {
        if (sentiment === 'Positivo') return { icon: Smile, color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-800' };
        if (sentiment === 'Negativo') return { icon: Frown, color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-800' };
        return { icon: Meh, color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700' };
    };
    
    const config = getRoleConfig(sug.role);
    const sentimentConfig = getSentimentConfig(sug.sentiment);
    const RoleIcon = config.icon;
    const SentimentIcon = sentimentConfig.icon;
    
    return (
        <div className={`p-5 rounded-2xl border ${config.border} bg-slate-900/40 hover:bg-slate-800/60 transition-all duration-300 group`}>
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.bg} ${config.color}`}><RoleIcon size={16} strokeWidth={2.5} /></div>
                    <span className={`text-xs font-bold uppercase tracking-widest ${config.color} opacity-90`}>{sug.role}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${sentimentConfig.border} ${sentimentConfig.bg}`}>
                    <SentimentIcon size={12} className={sentimentConfig.color} />
                    <span className={`text-[10px] font-bold uppercase ${sentimentConfig.color}`}>{sug.sentiment}</span>
                </div>
            </div>
            <div className="relative">
                <Quote size={24} className="absolute -top-1 -left-1 text-slate-700 opacity-20" />
                <p className="text-slate-300 text-sm leading-relaxed pl-6 relative z-10 font-medium">{sug.text}</p>
            </div>
        </div>
    );
};

// --- Tooltip ---
export const DarkTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-950/90 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-sm font-bold text-white">{entry.name}:</span>
                        <span className="text-sm font-mono text-cyan-400">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// --- Markdown Renderers ---
export const MarkdownRenderers = {
    h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold text-white mb-4 mt-6 border-b border-slate-700 pb-2" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4 mt-8 flex items-center gap-2" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-lg font-bold text-cyan-400 mb-3 mt-5 flex items-center gap-2" {...props} />,
    p: ({node, ...props}: any) => <p className="text-slate-300 mb-4 leading-relaxed text-sm text-justify" {...props} />,
    ul: ({node, ...props}: any) => <ul className="space-y-3 mb-6" {...props} />,
    li: ({node, ...props}: any) => (
        <li className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors mb-2">
            <div className="mt-1 w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0 border border-green-500/30">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_5px_currentColor]"></span>
            </div>
            <span className="text-slate-300 text-sm flex-1">{props.children}</span>
        </li>
    ),
    strong: ({node, ...props}: any) => <strong className="text-white font-bold" {...props} />,
    
    // Colored Block for Blockquotes
    blockquote: ({node, ...props}: any) => (
        <div className="border-l-4 border-red-500 bg-red-900/10 p-4 rounded-r-xl my-6 flex gap-4 items-start">
             <AlertTriangle className="text-red-500 shrink-0 mt-1" size={20} />
             <div className="text-slate-200 italic text-sm">{props.children}</div>
        </div>
    ),
    
    // Enhanced Tables
    table: ({node, ...props}: any) => (
        <div className="overflow-hidden rounded-xl border border-slate-700 shadow-xl my-6">
            <table className="w-full text-left text-sm bg-slate-900/50" {...props} />
        </div>
    ),
    thead: ({node, ...props}: any) => <thead className="bg-slate-950 text-slate-400 uppercase text-xs font-bold tracking-wider border-b border-slate-700" {...props} />,
    tbody: ({node, ...props}: any) => <tbody className="divide-y divide-slate-800" {...props} />,
    tr: ({node, ...props}: any) => <tr className="hover:bg-slate-800/50 transition-colors group" {...props} />,
    th: ({node, ...props}: any) => <th className="px-6 py-4 font-bold text-cyan-500/80" {...props} />,
    td: ({node, ...props}: any) => <td className="px-6 py-4 text-slate-300 align-top group-hover:text-white transition-colors leading-relaxed" {...props} />,
};