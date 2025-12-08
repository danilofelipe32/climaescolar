import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LabelList
} from 'recharts';
import { 
    Shield, School, MessageSquare, AlertTriangle, Upload, FileText, Heart, Activity, 
    CheckCircle, Sparkles, BrainCircuit, FileDown, Loader2, Calculator, Settings,
    Smile, Meh, Frown
} from 'lucide-react';

import { Sidebar, KpiCard, SuggestionCard, DarkTooltip, MarkdownRenderers } from './components/Components';
import { analyzeSentiment, calculateStats, interpretStdDev, parseCSV, processCSVData, scaleMap } from './utils';
import { generateSchoolReport } from './services/geminiService';
import { Stats, ChartData, Suggestion, AdvancedStat, SentimentStats, SurveyData } from './types';

// --- INITIAL MOCK DATA ---
const REPORT_STATS: Stats = { total: 3833, avgSafety: "3.8", avgFacilities: "2.1", avgMentalHealth: "1.2", avgSupport: "0.4", violencePerc: "21.6" };
const REPORT_RADAR = [
    { subject: 'Segurança', A: 3.8, fullMark: 5 }, { subject: 'Infraestrutura', A: 1.2, fullMark: 5 },
    { subject: 'Bem-Estar', A: 3.3, fullMark: 5 }, { subject: 'Apoio/Suporte', A: 0.4, fullMark: 5 },
    { subject: 'Saúde Mental', A: 1.2, fullMark: 5 }, { subject: 'Respeito', A: 3.2, fullMark: 5 }
];
const REPORT_SAFETY_BY_ROLE = [
    { name: 'Funcionário (a)', Segurança: 4.0 }, { name: 'Professor (a)', Segurança: 4.0 },
    { name: 'Aluno (M)', Segurança: 4.0 }, { name: 'Aluno (F)', Segurança: 3.8 }, { name: 'Outros', Segurança: 0.0 }
];
const REPORT_SUGGESTIONS: Suggestion[] = [
    { id: 1, role: "Professor (a)", text: "Uma portaria mais atenta e sensível, a sala do núcleo aberta diariamente.", sentiment: "Neutro" },
    { id: 2, role: "Professor (a)", text: "A criação de uma de escuta seria o mais urgente no momento.", sentiment: "Negativo" },
    { id: 3, role: "Aluno (a)", text: "Mais respeito na sala de aula, isso é o que está faltando.", sentiment: "Negativo" },
    { id: 4, role: "Funcionário (a)", text: "Manter o portão fechado e sempre com o porteiro no seu local.", sentiment: "Neutro" },
    { id: 5, role: "Aluno (a)", text: "Fechaduras novas, merenda melhor.", sentiment: "Negativo" }
];
const REPORT_ADVANCED_STATS: AdvancedStat[] = [
    { metric: "Segurança", mean: 3.8, median: 4.0, mode: 4, stdDev: 0.8, interpretation: "Consenso Positivo" },
    { metric: "Infraestrutura", mean: 2.1, median: 2.0, mode: 1, stdDev: 1.5, interpretation: "Polarização Negativa" },
    { metric: "Saúde Mental", mean: 1.2, median: 1.0, mode: 1, stdDev: 0.4, interpretation: "Consenso Crítico (Baixo)" },
    { metric: "Respeito", mean: 3.2, median: 3.0, mode: 3, stdDev: 1.1, interpretation: "Variabilidade Moderada" }
];
const REPORT_AI_ANALYSIS = `
## 📊 Diagnóstico Executivo

O clima escolar encontra-se em um estado de **vulnerabilidade crítica**.

## 🚩 Matriz de Risco

| Área Crítica | Score | Impacto Identificado |
| :--- | :---: | :--- |
| **Apoio Psicossocial** | **0.4** | Ausência total de escuta; risco alto de crises emocionais. |
| **Infraestrutura** | **1.2** | Ambiente degradado (limpeza, trancas) gera sensação de abandono. |

## 💡 Plano de Ação Imediato

* **Protocolo de Escuta Ativa:** Manter a sala do núcleo aberta diariamente.
* **Mutirão de Segurança:** Reparo imediato de fechaduras.
`;

const App: React.FC = () => {
    const [data, setData] = useState<SurveyData[]>([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [filter, setFilter] = useState('Todos');
    
    // AI State
    const [analysis, setAnalysis] = useState(REPORT_AI_ANALYSIS);
    const [loadingAI, setLoadingAI] = useState(false);
    const [errorAI, setErrorAI] = useState<string | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    
    // Dashboard Data State
    const [stats, setStats] = useState<Stats>(REPORT_STATS);
    const [chartData, setChartData] = useState<ChartData>({ radar: REPORT_RADAR, safety: REPORT_SAFETY_BY_ROLE });
    const [suggestions, setSuggestions] = useState<Suggestion[]>(REPORT_SUGGESTIONS);
    const [advancedStats, setAdvancedStats] = useState<AdvancedStat[]>(REPORT_ADVANCED_STATS);
    const [sentimentStats, setSentimentStats] = useState<SentimentStats>({ positive: 0, neutral: 0, negative: 0, counts: { 'Positivo': 0, 'Neutro': 0, 'Negativo': 0 } });

    // Initialize Sentiment Stats from mock data on mount
    useEffect(() => {
        if (data.length === 0 && suggestions.length > 0) {
            calculateSentimentStats(suggestions);
        }
    }, []);

    const calculateSentimentStats = (sugs: Suggestion[]) => {
        const counts: Record<string, number> = { Positivo: 0, Neutro: 0, Negativo: 0 };
        sugs.forEach(s => { if (counts[s.sentiment] !== undefined) counts[s.sentiment]++; });
        const totalSug = sugs.length;
        setSentimentStats({
            positive: totalSug ? Math.round((counts.Positivo / totalSug) * 100) : 0,
            neutral: totalSug ? Math.round((counts.Neutro / totalSug) * 100) : 0,
            negative: totalSug ? Math.round((counts.Negativo / totalSug) * 100) : 0,
            counts
        });
    };

    // Process uploaded data
    useEffect(() => {
        if (data.length === 0) return;
        
        const total = data.length;
        let totalSafetyScore = 0;
        let violenceCount = 0;
        let mentalHealthScore = 0;
        let facilitiesScore = 0;
        
        const safetyVals: number[] = []; 
        const infraVals: number[] = []; 
        const mentalVals: number[] = []; 
        const respectVals: number[] = [];
        
        const dimensions: Record<string, number> = { 'Segurança': 0, 'Infraestrutura': 0, 'Respeito': 0, 'Saúde Mental': 0, 'Apoio/Suporte': 0 };
        const grouping: Record<string, { role: string, total: number, score: number }> = {};

        data.forEach(item => {
            const safetyVal = scaleMap[item.safety] || 0;
            const mentalVal = scaleMap[item.mentalHealth] || 0;
            const facilVal = scaleMap[item.facilities] || 0;
            const respectVal = scaleMap[item.respectStudents] || 0;
            
            safetyVals.push(safetyVal); 
            infraVals.push(facilVal); 
            mentalVals.push(mentalVal); 
            respectVals.push(respectVal);
            
            totalSafetyScore += safetyVal; 
            if (item.violence === 'Sim') violenceCount++;
            mentalHealthScore += mentalVal; 
            facilitiesScore += facilVal;
            
            dimensions['Segurança'] += safetyVal; 
            dimensions['Infraestrutura'] += facilVal;
            dimensions['Respeito'] += respectVal; 
            dimensions['Saúde Mental'] += mentalVal;
            dimensions['Apoio/Suporte'] += mentalVal * 0.8; 
            
            const role = item.role || 'Outros';
            if (!grouping[role]) grouping[role] = { role, total: 0, score: 0 };
            grouping[role].total += 1; 
            grouping[role].score += safetyVal;
        });

        const newStats: Stats = { 
            total, 
            avgSafety: (totalSafetyScore / total).toFixed(1), 
            avgFacilities: (facilitiesScore / total).toFixed(1), 
            avgMentalHealth: (mentalHealthScore / total).toFixed(1), 
            avgSupport: "0.5", // Calculated/Mocked
            violencePerc: ((violenceCount / total) * 100).toFixed(1) 
        };
        setStats(newStats);

        const radar = Object.keys(dimensions).map(key => ({ subject: key, A: parseFloat((dimensions[key] / total).toFixed(1)), fullMark: 5 }));
        const safety = Object.values(grouping).map(g => ({ name: g.role, Segurança: parseFloat((g.score / g.total).toFixed(1)) })).sort((a, b) => b.Segurança - a.Segurança);
        setChartData({ radar, safety });
        
        const newSuggestions: Suggestion[] = data.filter(d => d.suggestion && d.suggestion.length > 3).map((d, i) => ({ 
            id: i, 
            role: d.role, 
            text: d.suggestion,
            sentiment: analyzeSentiment(d.suggestion) 
        }));
        setSuggestions(newSuggestions);
        calculateSentimentStats(newSuggestions);

        const sStats = calculateStats(safetyVals); 
        const iStats = calculateStats(infraVals);
        const mStats = calculateStats(mentalVals); 
        const rStats = calculateStats(respectVals);
        
        setAdvancedStats([
            { metric: "Segurança", ...sStats, interpretation: interpretStdDev(sStats.stdDev) }, 
            { metric: "Infraestrutura", ...iStats, interpretation: interpretStdDev(iStats.stdDev) }, 
            { metric: "Saúde Mental", ...mStats, interpretation: interpretStdDev(mStats.stdDev) }, 
            { metric: "Respeito", ...rStats, interpretation: interpretStdDev(rStats.stdDev) }
        ]);

        // Auto trigger AI if data loaded
        handleGenerateAnalysis(newStats, newSuggestions, newSuggestions.length > 0 ? {
            positive: 0, neutral: 0, negative: 0, counts: {} // Will be recalculated inside function if passed, but here we trigger effect
        } as any : sentimentStats);

    }, [data]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const rows = parseCSV(text);
            const parsedData = processCSVData(rows);
            setData(parsedData);
        };
        reader.readAsText(file);
    };

    const handleGenerateAnalysis = async (currentStats = stats, currentSuggestions = suggestions, currentSentiments = sentimentStats) => {
        setLoadingAI(true); 
        setErrorAI(null);
        try {
            const report = await generateSchoolReport(currentStats, currentSuggestions, currentSentiments);
            setAnalysis(report);
        } catch (err: any) {
            setErrorAI("Erro ao gerar análise. Verifique a configuração da API Key no Vercel (process.env.API_KEY).");
        } finally {
            setLoadingAI(false);
        }
    };

    const downloadPDF = () => {
        setGeneratingPdf(true);
        const doc = new jsPDF({ orientation: "portrait", unit: "cm", format: "a4" });
        const mLeft = 3.0, mTop = 3.0, mRight = 2.0; 
        let y = mTop;
        
        doc.setFont("times", "bold"); 
        doc.setFontSize(14); 
        doc.text("RELATÓRIO DE CLIMA ESCOLAR", 10.5, y, { align: "center" }); 
        y += 1.5;
        
        doc.setFontSize(12); 
        doc.setFont("times", "normal"); 
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 10.5, y, { align: "center" }); 
        y += 2.0;
        
        doc.setFont("times", "bold"); 
        doc.text("1. INTRODUÇÃO", mLeft, y); 
        y += 0.8;
        doc.setFont("times", "normal"); 
        doc.text(`Análise de ${stats.total} respondentes.`, mLeft, y); 
        y += 2.0;
        
        doc.setFont("times", "bold"); 
        doc.text("2. INDICADORES", mLeft, y); 
        y += 1.0;
        
        autoTable(doc, { 
            startY: y, 
            margin: { left: mLeft, right: mRight }, 
            head: [['Indicador', 'Valor']], 
            body: [['Segurança', `${stats.avgSafety}/5`], ['Infraestrutura', `${stats.avgFacilities}/5`], ['Violência', `${stats.violencePerc}%`]], 
            theme: 'grid', 
            styles: { font: 'times' } 
        });
        
        y = (doc as any).lastAutoTable.finalY + 1.5;
        
        if (suggestions.length > 0) { 
            doc.addPage(); 
            y = mTop; 
            doc.setFont("times", "bold"); 
            doc.text("3. SUGESTÕES", mLeft, y); 
            y += 1.0; 
            autoTable(doc, { 
                startY: y, 
                margin: { left: mLeft, right: mRight }, 
                head: [['Perfil', 'Sentimento', 'Sugestão']], 
                body: suggestions.map(s => [s.role, s.sentiment, s.text]), 
                theme: 'grid', 
                styles: { font: 'times', fontSize: 10 } 
            }); 
        }
        
        doc.save("Relatorio_Completo_ABNT.pdf");
        setGeneratingPdf(false);
    };

    const filteredSuggestions = suggestions.filter(s => filter === 'Todos' || s.sentiment === filter);
    const getFilterCount = (type: string) => {
        if (type === 'Todos') return suggestions.length;
        return suggestions.filter(s => s.sentiment === type).length;
    };

    // --- VIEW SUB-COMPONENTS ---
    
    const DashboardView = () => (
        <div className="animate-in space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KpiCard title="Segurança" value={`${stats.avgSafety}`} subValue="/ 5.0 Escala" gradient="linear-gradient(to right, #3b82f6, #06b6d4)" icon={Shield} />
                <KpiCard title="Infraestrutura" value={`${stats.avgFacilities}`} subValue="Ponto Crítico" gradient="linear-gradient(to right, #f97316, #ef4444)" icon={School} />
                <KpiCard title="Bem-Estar" value={`${stats.avgMentalHealth}`} subValue="Saúde Mental" gradient="linear-gradient(to right, #8b5cf6, #ec4899)" icon={Heart} />
                <KpiCard title="Violência" value={`${stats.violencePerc}%`} subValue="Taxa de Relatos" gradient="linear-gradient(to right, #ef4444, #b91c1c)" icon={AlertTriangle} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Activity size={20}/></div>Diagnóstico</h3>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData.radar}>
                                <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                <Radar name="Média" dataKey="A" stroke="#22d3ee" strokeWidth={3} fill="#06b6d4" fillOpacity={0.3} />
                                <RechartsTooltip content={<DarkTooltip />} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-3"><div className="p-2 bg-green-500/10 rounded-lg text-green-400"><CheckCircle size={20}/></div>Segurança por Perfil</h3>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.safety} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <defs>
                                    <linearGradient id="gradBar" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.6}/>
                                        <stop offset="100%" stopColor="#34d399" stopOpacity={1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                                <XAxis type="number" domain={[0, 5]} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" tick={{fill: '#f8fafc', fontWeight: 500}} width={100} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<DarkTooltip />} cursor={{fill: '#334155', opacity: 0.3}} />
                                <Bar dataKey="Segurança" fill="url(#gradBar)" radius={[0, 4, 4, 0]} barSize={32}>
                                    <LabelList dataKey="Segurança" position="right" fill="#fff" fontWeight="bold" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="col-span-12 lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden flex flex-col max-h-[600px]">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-6 relative z-10 shrink-0">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                            <BrainCircuit size={24} className="text-purple-400" /> 
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Analista IA</span>
                        </h3>
                        <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] text-slate-400 font-mono">
                            Base: {suggestions.length} comentários
                        </div>
                        {!loadingAI && (
                            <button onClick={() => handleGenerateAnalysis()} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-purple-900/50 active:scale-95 transition-all">
                                <Sparkles size={16} /> Re-Gerar
                            </button>
                        )}
                    </div>
                    
                    {loadingAI && <div className="flex flex-col items-center justify-center py-12 shrink-0"><Loader2 size={40} className="text-purple-500 animate-spin mb-4" /><span className="text-purple-300 animate-pulse">Processando inteligência...</span></div>}
                    {errorAI && <div className="p-4 bg-red-900/20 border border-red-800 text-red-400 rounded-xl text-sm mb-4">{errorAI}</div>}

                    {analysis && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 p-6 rounded-2xl border border-white/5 shadow-inner">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                components={MarkdownRenderers}
                            >
                                {analysis}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
                
                <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col max-h-[600px]">
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <h3 className="text-white font-bold flex items-center gap-3"><div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><MessageSquare size={20}/></div>Voz da Comunidade</h3>
                        
                        <div className="flex gap-2 bg-slate-900 p-1 rounded-xl">
                            {['Todos', 'Positivo', 'Neutro', 'Negativo'].map(type => (
                                <button 
                                    key={type}
                                    onClick={() => setFilter(type)}
                                    className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1 ${
                                        filter === type 
                                        ? type === 'Positivo' ? 'bg-green-500 text-white' 
                                        : type === 'Negativo' ? 'bg-red-500 text-white'
                                        : type === 'Neutro' ? 'bg-slate-500 text-white'
                                        : 'bg-white text-slate-900'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                >
                                    {type}
                                    <span className="opacity-70 text-[10px] ml-0.5">({getFilterCount(type)})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="w-full h-2 bg-slate-800 rounded-full mb-4 flex overflow-hidden shrink-0">
                        <div style={{ width: `${sentimentStats.positive}%` }} className="h-full bg-green-500"></div>
                        <div style={{ width: `${sentimentStats.neutral}%` }} className="h-full bg-slate-500"></div>
                        <div style={{ width: `${sentimentStats.negative}%` }} className="h-full bg-red-500"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="space-y-4">
                            {filteredSuggestions.map((sug) => (
                                <SuggestionCard key={sug.id} sug={sug} />
                            ))}
                            {filteredSuggestions.length === 0 && (
                                <div className="text-center py-10 text-slate-500 text-sm">
                                    Nenhum comentário encontrado neste filtro.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const AdvancedStatsView = () => (
        <div className="animate-in space-y-8">
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3"><Calculator size={32} className="text-purple-400" /> Estatística Descritiva Robusta</h2>
                <div className="grid grid-cols-1 gap-6">
                    {advancedStats.map((stat, idx) => (
                        <div key={idx} className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 hover:border-purple-500/30 transition-colors">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><div className="w-2 h-8 bg-purple-500 rounded-full"></div>{stat.metric}</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${stat.stdDev < 0.8 ? 'bg-green-900/30 text-green-400 border border-green-800' : stat.stdDev < 1.3 ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>{stat.interpretation}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Média</div><div className="text-2xl font-mono text-white">{stat.mean.toFixed(2)}</div></div>
                                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Mediana</div><div className="text-2xl font-mono text-white">{stat.median.toFixed(2)}</div></div>
                                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Moda</div><div className="text-2xl font-mono text-white">{stat.mode}</div></div>
                                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Desvio Padrão</div><div className="text-2xl font-mono text-purple-400">{stat.stdDev.toFixed(2)}</div></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const ReportsView = () => (
        <div className="animate-in space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 rounded-2xl bg-green-900/20 border border-green-800 flex items-center justify-between"><div><p className="text-green-400 text-xs font-bold uppercase tracking-widest">Positivos</p><h4 className="text-3xl font-black text-white mt-1">{sentimentStats.positive}%</h4><p className="text-slate-400 text-xs mt-1">{sentimentStats.counts.Positivo} comentários</p></div><div className="p-3 rounded-xl bg-green-500/20 text-green-400"><Smile size={24}/></div></div>
                <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-between"><div><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Neutros</p><h4 className="text-3xl font-black text-white mt-1">{sentimentStats.neutral}%</h4><p className="text-slate-500 text-xs mt-1">{sentimentStats.counts.Neutro} comentários</p></div><div className="p-3 rounded-xl bg-slate-700/50 text-slate-400"><Meh size={24}/></div></div>
                <div className="p-6 rounded-2xl bg-red-900/20 border border-red-800 flex items-center justify-between"><div><p className="text-red-400 text-xs font-bold uppercase tracking-widest">Negativos</p><h4 className="text-3xl font-black text-white mt-1">{sentimentStats.negative}%</h4><p className="text-slate-400 text-xs mt-1">{sentimentStats.counts.Negativo} comentários</p></div><div className="p-3 rounded-xl bg-red-500/20 text-red-400"><Frown size={24}/></div></div>
            </div>
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-xl">
                <div className="flex justify-between items-center mb-8"><div><h2 className="text-3xl font-bold text-white flex items-center gap-3"><FileText size={32} className="text-cyan-400" /> Relatório Detalhado</h2></div><div className="bg-slate-900 px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-mono text-sm shadow-inner">Total: <span className="text-white font-bold">{suggestions.length}</span></div></div>
                <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/50">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-950 text-slate-200 uppercase text-xs font-bold tracking-wider"><tr><th className="px-6 py-5 border-b border-slate-800">Role</th><th className="px-6 py-5 border-b border-slate-800">Sentimento</th><th className="px-6 py-5 border-b border-slate-800">Feedback</th></tr></thead>
                            <tbody className="divide-y divide-slate-800">
                                {suggestions.length > 0 ? (suggestions.map((sug) => (
                                    <tr key={sug.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-5 w-48 align-top"><span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${sug.role.includes('Aluno') ? 'bg-blue-950 text-blue-400 border-blue-900' : sug.role.includes('Professor') ? 'bg-green-950 text-green-400 border-green-900' : 'bg-orange-950 text-orange-400 border-orange-900'}`}>{sug.role}</span></td>
                                        <td className="px-6 py-5 w-32"><span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold border ${sug.sentiment === 'Positivo' ? 'bg-green-900/30 text-green-400 border-green-800' : sug.sentiment === 'Negativo' ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{sug.sentiment}</span></td>
                                        <td className="px-6 py-5 text-slate-300 leading-relaxed group-hover:text-white transition-colors">{sug.text}</td>
                                    </tr>
                                ))) : (<tr><td colSpan={3} className="px-6 py-12 text-center text-slate-600 italic">Nenhum dado disponível.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );

    const SettingsView = () => (
        <div className="animate-in max-w-3xl mx-auto mt-10">
            <div className="bg-[#1e293b] p-10 rounded-3xl border border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-4">
                    <div className="p-3 bg-slate-800 rounded-2xl"><Settings size={32} className="text-slate-400" /></div>
                    Configurações
                </h2>
                <div className="space-y-8">
                    <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-700/50">
                        <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-3">
                            <BrainCircuit size={24}/> Integração Gemini AI
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <p className="text-slate-400 text-sm">
                                    A chave da API está configurada através das Variáveis de Ambiente do servidor (<code>process.env.API_KEY</code>).
                                    Para alterar a chave, acesse as configurações de implantação no Vercel.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-green-500 text-sm font-bold">
                                <CheckCircle size={16} />
                                Integração Ativa
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500/30">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="flex-1 md:ml-24 p-8 overflow-y-auto h-screen custom-scrollbar">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                {activeTab === 'dashboard' && 'Visão Geral'}
                                {activeTab === 'stats' && 'Estatística Avançada'}
                                {activeTab === 'reports' && 'Relatórios Detalhados'}
                                {activeTab === 'settings' && 'Preferências'}
                            </h1>
                            <p className="text-slate-400 font-medium">Monitorização estratégica em tempo real.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="relative group">
                                <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3 rounded-xl border border-slate-700 font-bold transition-all shadow-lg hover:shadow-cyan-500/10">
                                    <Upload size={18} /> <span className="hidden sm:inline">Importar</span>
                                </button>
                            </div>
                            <button onClick={downloadPDF} disabled={generatingPdf} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3 rounded-xl border border-slate-700 font-bold transition-all shadow-lg hover:shadow-cyan-500/10 disabled:opacity-50">
                                {generatingPdf ? <Loader2 size={18} className="animate-spin"/> : <FileDown size={18} />} PDF
                            </button>
                        </div>
                    </div>
                    {activeTab === 'dashboard' && <DashboardView />}
                    {activeTab === 'stats' && <AdvancedStatsView />}
                    {activeTab === 'reports' && <ReportsView />}
                    {activeTab === 'settings' && <SettingsView />}
                </div>
            </div>
        </div>
    );
};

export default App;