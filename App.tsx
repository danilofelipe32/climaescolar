
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LabelList,
    PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
    Shield, School, MessageSquare, AlertTriangle, Upload, FileText, Heart, Activity, 
    CheckCircle, Sparkles, BrainCircuit, FileDown, Loader2, Calculator, Settings,
    Smile, Meh, Frown, Filter, ChevronDown, Info, FileSpreadsheet, BarChart3, Eye, X,
    ArrowUpDown, ArrowUp, ArrowDown, Calendar, GitCompare, Layers, TrendingUp, TrendingDown, Minus,
    Target, Sliders, AlertCircle
} from 'lucide-react';

import { Sidebar, KpiCard, SuggestionCard, DarkTooltip, MarkdownRenderers } from './components/Components';
import { analyzeSentiment, calculateStats, interpretStdDev, parseCSV, processCSVData, scaleMap } from './utils';
import { generateSchoolReport, generateComparativeReport } from './services/geminiService';
import { Stats, ChartData, Suggestion, AdvancedStat, SentimentStats, SurveyData, Dataset } from './types';

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
    { id: 1, role: "Professor (a)", text: "Uma portaria mais atenta e sensível, a sala do núcleo aberta diariamente.", sentiment: "Neutro", timestamp: "2023-10-01" },
    { id: 2, role: "Professor (a)", text: "A criação de uma de escuta seria o mais urgente no momento.", sentiment: "Negativo", timestamp: "2023-10-02" },
    { id: 3, role: "Aluno (a)", text: "Mais respeito na sala de aula, isso é o que está faltando.", sentiment: "Negativo", timestamp: "2023-10-03" },
    { id: 4, role: "Funcionário (a)", text: "Manter o portão fechado e sempre com o porteiro no seu local.", sentiment: "Neutro", timestamp: "2023-10-05" },
    { id: 5, role: "Aluno (a)", text: "Fechaduras novas, merenda melhor.", sentiment: "Negativo", timestamp: "2023-10-06" }
];
const REPORT_ADVANCED_STATS: AdvancedStat[] = [
    { metric: "Segurança", mean: 3.8, median: 4.0, mode: 4, stdDev: 0.8, interpretation: "Consenso Positivo" },
    { metric: "Infraestrutura", mean: 2.1, median: 2.0, mode: 1, stdDev: 1.5, interpretation: "Polarização Negativa" },
    { metric: "Saúde Mental", mean: 1.2, median: 1.0, mode: 1, stdDev: 0.4, interpretation: "Consenso Crítico (Baixo)" },
    { metric: "Respeito", mean: 3.2, median: 3.0, mode: 3, stdDev: 1.1, interpretation: "Variabilidade Moderada" }
];

const REPORT_SENTIMENT_STATS: SentimentStats = { 
    positive: 0, neutral: 40, negative: 60, counts: { 'Positivo': 0, 'Neutro': 2, 'Negativo': 3 } 
};

// Note: Ensure strictly no indentation for the table part to avoid Markdown parsing issues
const REPORT_AI_ANALYSIS = `
## 📊 Resumo Executivo Contextualizado

> O diagnóstico atual revela um cenário de **paradoxo institucional**. Embora a percepção média de segurança seja moderadamente positiva (3.8/5), existe uma taxa de violência alarmante de **21.6%**. Isso sugere uma possível **normalização de comportamentos agressivos** ou uma "cegueira situacional", onde a comunidade se sente segura apenas por hábito, ignorando riscos latentes.
>
> Além disso, a correlação entre a infraestrutura precária (2.1/5) e a saúde mental crítica (1.2/5) é inegável. O ambiente físico degradado (fechaduras quebradas, falta de limpeza) atua como um **estressor ambiental constante**, enviando uma mensagem implícita de abandono que corrói a autoestima de alunos e professores, resultando em um pedido de socorro emocional evidente nos comentários.

## 🧠 Análise Psicossocial

A análise qualitativa dos comentários indica um clima emocional marcado pela **desamparo aprendido**. Professores e alunos expressam frustração não apenas com problemas pontuais, mas com a *falta de escuta sistemática*. A repetição de termos como "urgente", "medo" e "falta" denota um esgotamento da resiliência coletiva. Sem intervenção, o risco de **burnout docente** e **evasão escolar** por desmotivação é altíssimo.

## 🚩 Matriz de Vulnerabilidades Críticas

| Área Crítica | Evidência (Dados/Falas) | Consequência Pedagógica e Social |
| :--- | :--- | :--- |
| **Saúde Mental** | Score 1.2/5 e demanda por "escuta" | Bloqueio cognitivo para aprendizagem; aumento de conflitos interpessoais e crises de ansiedade em sala. |
| **Infraestrutura** | Score 2.1/5 (fechaduras, limpeza) | Sensação de insegurança física; degradação do patrimônio por falta de pertencimento ("teoria das janelas quebradas"). |
| **Gestão de Acesso** | Relatos de portaria falha | Exposição real a riscos externos; quebra da confiança institucional entre família e escola. |

## 💡 Plano de Intervenção Estratégica

* **Instituir Núcleo de Escuta Ativa:**
    * *Ação:* Operacionalizar a sala do núcleo diariamente com escala rotativa.
    * *Justificativa:* O acolhimento imediato reduz a tensão latente e previne a escalada de conflitos.
* **Programa "Escola Segura e Limpa":**
    * *Ação:* Mutirão emergencial para reparo de trancas e limpeza do entorno.
    * *Justificativa:* A melhoria visual imediata restaura o senso de dignidade e ordem, impactando positivamente o comportamento.
* **Protocolo Rigoroso de Acesso:**
    * *Ação:* Revisão total dos procedimentos de portaria e identificação obrigatória.
    * *Justificativa:* Eliminar a vulnerabilidade física é pré-requisito para que o processo pedagógico ocorra com tranquilidade.
`;

const INITIAL_DATASET: Dataset = {
    id: 'demo-2025',
    name: 'Demo Data 2025',
    uploadDate: new Date(),
    data: [], // Mock data doesn't have raw rows stored but we use stats
    stats: REPORT_STATS,
    chartData: { radar: REPORT_RADAR, safety: REPORT_SAFETY_BY_ROLE },
    suggestions: REPORT_SUGGESTIONS,
    advancedStats: REPORT_ADVANCED_STATS,
    sentimentStats: REPORT_SENTIMENT_STATS
};

const App: React.FC = () => {
    // Dataset Management
    const [datasets, setDatasets] = useState<Dataset[]>([INITIAL_DATASET]);
    const [activeDatasetId, setActiveDatasetId] = useState<string>('demo-2025');

    // UI State
    const [activeTab, setActiveTab] = useState('dashboard');
    const [filter, setFilter] = useState('Todos');
    const [reportRoleFilter, setReportRoleFilter] = useState('Todos');
    const [reportSentimentFilter, setReportSentimentFilter] = useState('Todos');
    
    // AI State
    const [analysis, setAnalysis] = useState(REPORT_AI_ANALYSIS);
    const [compAnalysis, setCompAnalysis] = useState<string | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [loadingCompAI, setLoadingCompAI] = useState(false);
    const [errorAI, setErrorAI] = useState<string | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Threshold State
    const [thresholds, setThresholds] = useState({
        safety: 3.5,
        facilities: 3.0,
        mentalHealth: 3.0,
        respect: 3.0,
        violence: 15.0
    });

    // Derived active data for current view
    const activeDataset = useMemo(() => 
        datasets.find(d => d.id === activeDatasetId) || datasets[0], 
    [datasets, activeDatasetId]);

    const { stats, chartData, suggestions, advancedStats, sentimentStats } = activeDataset;

    // --- Data Processing Helper ---
    const processRawDataToDataset = (name: string, rawText: string): Dataset => {
        const rows = parseCSV(rawText);
        const parsedData = processCSVData(rows);
        const total = parsedData.length;
        
        // --- Calculate Stats ---
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

        parsedData.forEach(item => {
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
            avgSupport: "0.5", 
            violencePerc: ((violenceCount / total) * 100).toFixed(1) 
        };

        const radar = Object.keys(dimensions).map(key => ({ subject: key, A: parseFloat((dimensions[key] / total).toFixed(1)), fullMark: 5 }));
        const safety = Object.values(grouping).map(g => ({ name: g.role, Segurança: parseFloat((g.score / g.total).toFixed(1)) })).sort((a, b) => b.Segurança - a.Segurança);
        
        const newSuggestions: Suggestion[] = parsedData.filter(d => d.suggestion && d.suggestion.length > 3).map((d, i) => ({ 
            id: i, 
            role: d.role, 
            text: d.suggestion,
            sentiment: analyzeSentiment(d.suggestion),
            timestamp: d.timestamp
        }));

        const sStats = calculateStats(safetyVals); 
        const iStats = calculateStats(infraVals);
        const mStats = calculateStats(mentalVals); 
        const rStats = calculateStats(respectVals);
        
        const newAdvancedStats = [
            { metric: "Segurança", ...sStats, interpretation: interpretStdDev(sStats.stdDev) }, 
            { metric: "Infraestrutura", ...iStats, interpretation: interpretStdDev(iStats.stdDev) }, 
            { metric: "Saúde Mental", ...mStats, interpretation: interpretStdDev(mStats.stdDev) }, 
            { metric: "Respeito", ...rStats, interpretation: interpretStdDev(rStats.stdDev) }
        ];

        // Sentiment Stats
        const counts: Record<string, number> = { Positivo: 0, Neutro: 0, Negativo: 0 };
        newSuggestions.forEach(s => { if (counts[s.sentiment] !== undefined) counts[s.sentiment]++; });
        const totalSug = newSuggestions.length;
        const newSentimentStats = {
            positive: totalSug ? Math.round((counts.Positivo / totalSug) * 100) : 0,
            neutral: totalSug ? Math.round((counts.Neutro / totalSug) * 100) : 0,
            negative: totalSug ? Math.round((counts.Negativo / totalSug) * 100) : 0,
            counts
        };

        return {
            id: Date.now().toString() + Math.random().toString(),
            name: name.replace('.csv', ''),
            uploadDate: new Date(),
            data: parsedData,
            stats: newStats,
            chartData: { radar, safety },
            suggestions: newSuggestions,
            advancedStats: newAdvancedStats,
            sentimentStats: newSentimentStats
        };
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const newDatasets: Dataset[] = [];
        
        // Process files sequentially to ensure state stability (or Promise.all)
        const fileReaders: Promise<Dataset>[] = Array.from(files).map((fileItem) => {
            const file = fileItem as File;
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target?.result as string;
                    const dataset = processRawDataToDataset(file.name, text);
                    resolve(dataset);
                };
                reader.readAsText(file);
            });
        });

        const results = await Promise.all(fileReaders);
        
        // Update datasets
        setDatasets(prev => [...prev, ...results]);
        
        // If it was the first real upload (replacing demo) or just switch to the latest
        if (results.length > 0) {
            setActiveDatasetId(results[results.length - 1].id);
            // Trigger AI for the new active dataset
            const ds = results[results.length - 1];
            handleGenerateAnalysis(ds.stats, ds.suggestions, ds.sentimentStats);
        }
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

    const handleGenerateComparativeAnalysis = async (sortedDatasets: Dataset[]) => {
        setLoadingCompAI(true);
        try {
            const report = await generateComparativeReport(sortedDatasets);
            setCompAnalysis(report);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCompAI(false);
        }
    }

    const downloadPDF = () => {
        setGeneratingPdf(true);
        const doc = new jsPDF({ orientation: "portrait", unit: "cm", format: "a4" });
        const mLeft = 3.0, mTop = 3.0, mRight = 2.0; 
        let y = mTop;
        
        doc.setFont("times", "bold"); 
        doc.setFontSize(14); 
        doc.text(`RELATÓRIO DE CLIMA ESCOLAR - ${activeDataset.name}`, 10.5, y, { align: "center" }); 
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
        
        doc.save(`Relatorio_${activeDataset.name}.pdf`);
        setGeneratingPdf(false);
    };

    const handleExportCSV = () => {
        const filtered = suggestions.filter(s => 
            (reportRoleFilter === 'Todos' || s.role === reportRoleFilter) &&
            (reportSentimentFilter === 'Todos' || s.sentiment === reportSentimentFilter)
        );
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + "ID,Role,Sentimento,Data,Feedback\n"
            + filtered.map(e => `${e.id},"${e.role}",${e.sentiment},${e.timestamp || ''},"${e.text.replace(/"/g, '""')}"`).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sugestoes_${activeDataset.name}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredSuggestions = suggestions.filter(s => filter === 'Todos' || s.sentiment === filter);
    const getFilterCount = (type: string) => {
        if (type === 'Todos') return suggestions.length;
        return suggestions.filter(s => s.sentiment === type).length;
    };

    // --- VIEW SUB-COMPONENTS ---
    
    const ComparisonView = () => {
        if (datasets.length < 2) {
            return (
                <div className="flex flex-col items-center justify-center h-[500px] bg-[#1e293b] rounded-3xl border border-slate-800 border-dashed animate-in">
                    <div className="p-5 bg-slate-900 rounded-full mb-4 shadow-lg"><Layers size={40} className="text-slate-500" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">Modo de Comparação</h3>
                    <p className="text-slate-400 max-w-md text-center">
                        Para habilitar a comparação profissional, importe pelo menos dois arquivos CSV diferentes (ex: "Pesquisa 2023" e "Pesquisa 2024").
                    </p>
                </div>
            );
        }

        const colors = ['#3b82f6', '#10b981', '#f97316', '#a855f7', '#ec4899', '#ef4444', '#06b6d4', '#84cc16'];
        
        // Robust Sort: Numeric sort if possible, otherwise string sort. 
        // Important for timeline accuracy.
        const sortedDatasets = useMemo(() => {
            return [...datasets].sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        }, [datasets]);

        // Prepare Trend Data (Line Charts)
        const trendData = sortedDatasets.map(ds => ({
            name: ds.name,
            Safety: parseFloat(ds.stats.avgSafety),
            Facilities: parseFloat(ds.stats.avgFacilities),
            MentalHealth: parseFloat(ds.stats.avgMentalHealth),
            Violence: parseFloat(ds.stats.violencePerc),
            PositiveSent: ds.sentimentStats.positive
        }));

        // Prepare Radar Comparison Data
        const subjects = datasets[0].chartData.radar.map(r => r.subject);
        const radarComparisonData = subjects.map(subj => {
            const point: any = { subject: subj, fullMark: 5 };
            datasets.forEach((ds) => {
                const metric = ds.chartData.radar.find(r => r.subject === subj);
                point[ds.name] = metric ? metric.A : 0;
            });
            return point;
        });

        // Delta Calculation Helper
        const getDelta = (curr: number, prev: number, inverse = false) => {
            if (isNaN(curr) || isNaN(prev) || prev === 0) return null;
            const diff = curr - prev;
            const percent = (diff / prev) * 100;
            // Good if: (not inverse AND increased) OR (inverse AND decreased)
            const isGood = inverse ? diff < 0 : diff > 0;
            const isNeutral = Math.abs(diff) < 0.05; // Tolerance
            return { diff, percent, isGood, isNeutral };
        };

        // Last two datasets for delta cards
        const currDS = sortedDatasets[sortedDatasets.length - 1];
        const prevDS = sortedDatasets[sortedDatasets.length - 2];

        // Overall Win/Loss Calculation
        const wins = [
            getDelta(parseFloat(currDS.stats.avgSafety), parseFloat(prevDS.stats.avgSafety)),
            getDelta(parseFloat(currDS.stats.avgFacilities), parseFloat(prevDS.stats.avgFacilities)),
            getDelta(parseFloat(currDS.stats.avgMentalHealth), parseFloat(prevDS.stats.avgMentalHealth)),
            getDelta(parseFloat(currDS.stats.violencePerc), parseFloat(prevDS.stats.violencePerc), true), // Inverse
        ].filter(d => d && d.isGood && !d.isNeutral).length;
        
        const losses = [
            getDelta(parseFloat(currDS.stats.avgSafety), parseFloat(prevDS.stats.avgSafety)),
            getDelta(parseFloat(currDS.stats.avgFacilities), parseFloat(prevDS.stats.avgFacilities)),
            getDelta(parseFloat(currDS.stats.avgMentalHealth), parseFloat(prevDS.stats.avgMentalHealth)),
            getDelta(parseFloat(currDS.stats.violencePerc), parseFloat(prevDS.stats.violencePerc), true), // Inverse
        ].filter(d => d && !d.isGood && !d.isNeutral).length;

        const DeltaCard = ({ title, curr, prev, unit = "", inverse = false, icon: Icon }: any) => {
            const delta = getDelta(parseFloat(curr), parseFloat(prev), inverse);
            return (
                <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <Icon size={14} className="text-slate-500 group-hover:text-cyan-400 transition-colors" /> {title}
                        </div>
                     </div>
                     <div className="text-3xl font-black text-white mb-2">{curr}<span className="text-sm font-normal text-slate-500 ml-1">{unit}</span></div>
                     
                     {delta ? (
                         <div className={`flex items-center gap-1 text-xs font-bold ${delta.isNeutral ? 'text-slate-500' : delta.isGood ? 'text-green-400' : 'text-red-400'}`}>
                             {delta.isNeutral ? <Minus size={14} /> : delta.diff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                             <span>{Math.abs(delta.percent).toFixed(1)}%</span>
                             <span className="text-slate-600 font-medium ml-1">vs anterior</span>
                         </div>
                     ) : (
                        <div className="text-xs text-slate-600 font-medium">- sem dados ant. -</div>
                     )}
                </div>
            );
        };

        // Heatmap Cell Helper
        const HeatmapCell = ({ val, allVals, inverse = false }: any) => {
             const num = parseFloat(val);
             const max = Math.max(...allVals);
             const min = Math.min(...allVals);
             const isEqual = max === min;

             // Logic: If inverse (e.g. violence), Lowest is Best.
             const isBest = inverse ? num === min : num === max;
             const isWorst = inverse ? num === max : num === min;

             if (isEqual) return <span className="text-slate-500 font-mono">{val}</span>;

             if (isBest) return (
                 <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 font-bold font-mono text-xs">
                     {val} <Sparkles size={10} strokeWidth={3} />
                 </div>
             );
             
             if (isWorst) return (
                 <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 font-bold font-mono text-xs">
                     {val} <AlertTriangle size={10} strokeWidth={3} />
                 </div>
             );

             return <span className="text-slate-400 font-mono">{val}</span>;
        };

        return (
            <div className="animate-in space-y-8 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl">
                     <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                             <GitCompare size={28} className="text-cyan-400" /> Comparativo Evolutivo
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Análise temporal: <strong className="text-white">{sortedDatasets[0].name}</strong> ➔ <strong className="text-white">{currDS.name}</strong>
                        </p>
                     </div>
                     
                     {!loadingCompAI ? (
                        <button 
                            onClick={() => handleGenerateComparativeAnalysis(sortedDatasets)}
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-purple-900/50 active:scale-95 transition-all"
                        >
                            <Sparkles size={16} /> Gerar Inteligência Comparativa
                        </button>
                     ) : (
                        <div className="flex items-center gap-2 text-purple-400 text-sm font-bold animate-pulse px-4">
                            <Loader2 size={18} className="animate-spin" /> Analisando Trajetória...
                        </div>
                     )}
                </div>

                {/* Scoreboard Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-950/20 border border-green-900/50 p-4 rounded-2xl flex items-center gap-4">
                        <div className="p-3 bg-green-900/40 rounded-full text-green-400"><TrendingUp size={20} /></div>
                        <div>
                            <div className="text-2xl font-black text-white">{wins}</div>
                            <div className="text-xs text-green-400 uppercase font-bold tracking-wider">Indicadores em Melhora</div>
                        </div>
                    </div>
                    <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-2xl flex items-center gap-4">
                        <div className="p-3 bg-red-900/40 rounded-full text-red-400"><AlertTriangle size={20} /></div>
                        <div>
                            <div className="text-2xl font-black text-white">{losses}</div>
                            <div className="text-xs text-red-400 uppercase font-bold tracking-wider">Pontos de Atenção/Piora</div>
                        </div>
                    </div>
                </div>

                {/* AI Analysis Section */}
                {compAnalysis && (
                     <div className="bg-gradient-to-br from-[#1e293b] to-slate-900 p-8 rounded-3xl border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                            <BrainCircuit className="text-purple-400" /> Diagnóstico de Tendência (IA)
                        </h3>
                        <div className="relative z-10 text-slate-300">
                             <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownRenderers}>
                                 {compAnalysis}
                             </ReactMarkdown>
                        </div>
                     </div>
                )}
                
                {/* Delta Cards - Comparing Last 2 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DeltaCard title="Segurança" curr={currDS.stats.avgSafety} prev={prevDS.stats.avgSafety} icon={Shield} />
                    <DeltaCard title="Infraestrutura" curr={currDS.stats.avgFacilities} prev={prevDS.stats.avgFacilities} icon={School} />
                    <DeltaCard title="Saúde Mental" curr={currDS.stats.avgMentalHealth} prev={prevDS.stats.avgMentalHealth} icon={Heart} />
                    <DeltaCard title="Violência" curr={currDS.stats.violencePerc} prev={prevDS.stats.violencePerc} unit="%" inverse={true} icon={AlertTriangle} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* Line Chart: Evolution */}
                     <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-lg">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-cyan-400" /> Evolução dos Indicadores</h3>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} domain={[0, 5]} />
                                    <RechartsTooltip content={<DarkTooltip />} />
                                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                                    <Line type="monotone" dataKey="Safety" name="Segurança" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 7}} />
                                    <Line type="monotone" dataKey="Facilities" name="Infraestrutura" stroke="#f97316" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
                                    <Line type="monotone" dataKey="MentalHealth" name="Saúde Mental" stroke="#ec4899" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                     </div>

                     {/* Area Chart: Violence & Sentiment */}
                     <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-lg">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2"><Activity size={20} className="text-red-400" /> Correlação Violência vs Sentimento</h3>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorViolence" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#ef4444'}} domain={[0, 100]} label={{ value: 'Violência %', angle: -90, position: 'insideLeft', fill: '#ef4444', dy: 40 }} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#10b981'}} domain={[0, 100]} label={{ value: 'Sentimento Positivo %', angle: 90, position: 'insideRight', fill: '#10b981', dy: 50 }} />
                                    <RechartsTooltip content={<DarkTooltip />} />
                                    <Area yAxisId="left" type="monotone" dataKey="Violence" name="Violência (%)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorViolence)" />
                                    <Area yAxisId="right" type="monotone" dataKey="PositiveSent" name="Positividade (%)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPos)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                     </div>
                </div>
                
                {/* Heatmap Data Table */}
                <div className="bg-[#1e293b] rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="text-white font-bold text-lg">Matriz de Dados (Heatmap)</h3>
                        <div className="text-xs text-slate-500 font-mono">Best (Verde) / Worst (Vermelho)</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                             <thead className="bg-slate-950 text-slate-200 uppercase text-xs font-bold tracking-wider">
                                 <tr>
                                     <th className="px-6 py-5">Indicador</th>
                                     {sortedDatasets.map((ds, idx) => (
                                         <th key={ds.id} className="px-6 py-5 text-center min-w-[120px]" style={{ color: colors[idx % colors.length] }}>
                                             {ds.name}
                                         </th>
                                     ))}
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                                 {[
                                     { label: 'Segurança (0-5)', key: 'avgSafety', inverse: false },
                                     { label: 'Infraestrutura (0-5)', key: 'avgFacilities', inverse: false },
                                     { label: 'Saúde Mental (0-5)', key: 'avgMentalHealth', inverse: false },
                                     { label: 'Violência (%)', key: 'violencePerc', inverse: true },
                                 ].map(row => (
                                    <tr key={row.key} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-5 font-bold text-white flex items-center gap-2">
                                            {row.label}
                                        </td>
                                        {sortedDatasets.map(ds => (
                                            <td key={ds.id} className="px-6 py-5 text-center">
                                                <HeatmapCell 
                                                    val={ds.stats[row.key as keyof Stats]} 
                                                    allVals={sortedDatasets.map(d => parseFloat(d.stats[row.key as keyof Stats] as string))} 
                                                    inverse={row.inverse} 
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                 ))}
                                 {/* Sentiment Row Special Case */}
                                 <tr className="hover:bg-slate-800/50 transition-colors">
                                     <td className="px-6 py-5 font-bold text-white">Sentimento Positivo (%)</td>
                                     {sortedDatasets.map(ds => (
                                        <td key={ds.id} className="px-6 py-5 text-center">
                                            <HeatmapCell 
                                                val={ds.sentimentStats.positive} 
                                                allVals={sortedDatasets.map(d => d.sentimentStats.positive)} 
                                                inverse={false}
                                            />
                                        </td>
                                     ))}
                                 </tr>
                             </tbody>
                        </table>
                    </div>
                </div>

                {/* Radar Overlay */}
                <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl">
                    <h3 className="text-white font-bold mb-4">Sobreposição de Clima (Radar)</h3>
                    <div className="h-[500px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarComparisonData}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                <RechartsTooltip content={<DarkTooltip />} />
                                <Legend />
                                {sortedDatasets.map((ds, idx) => (
                                    <Radar 
                                        key={ds.id} 
                                        name={ds.name} 
                                        dataKey={ds.name} 
                                        stroke={colors[idx % colors.length]} 
                                        strokeWidth={3} 
                                        fill={colors[idx % colors.length]} 
                                        fillOpacity={0.05} 
                                    />
                                ))}
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    const DashboardView = () => {
        // Logic for Radar Explanations
        const criticalAreas = chartData.radar.filter(r => Number(r.A) < 2.5).map(r => r.subject);
        const strongAreas = chartData.radar.filter(r => Number(r.A) >= 4.0).map(r => r.subject);
        const maxRadar = chartData.radar.reduce((prev, current) => (Number(prev.A) > Number(current.A)) ? prev : current, chartData.radar[0] || { subject: '-', A: 0 });
        
        let radarText = "";
        if (criticalAreas.length > 0) {
            radarText = `Atenção prioritária necessária em **${criticalAreas.join(', ')}**, com índices críticos (< 2.5). ${strongAreas.length > 0 ? `Em contrapartida, **${strongAreas.join(', ')}** sustentam os pontos positivos.` : ''}`;
        } else if (strongAreas.length > 0) {
            radarText = `O clima escolar demonstra solidez, impulsionado por altos índices em **${strongAreas.join(', ')}**. O foco deve ser a manutenção e expansão dessas práticas.`;
        } else {
            radarText = `Cenário de equilíbrio moderado. **${maxRadar.subject}** lidera, mas há margem para melhorias generalizadas em todos os indicadores.`;
        }
        
        // Logic for Safety Bar Explanations
        const sortedSafety = [...chartData.safety].sort((a,b) => b.Segurança - a.Segurança);
        const maxSafety = sortedSafety[0] || { name: '-', Segurança: 0 };
        const minSafety = sortedSafety[sortedSafety.length - 1] || { name: '-', Segurança: 0 };
        const safetyGap = (maxSafety.Segurança - minSafety.Segurança).toFixed(1);
        
        let safetyText = "";
        if (parseFloat(safetyGap) > 1.5) {
            safetyText = `Disparidade alarmante de **${safetyGap} pontos** entre grupos. Enquanto **${maxSafety.name}** percebe o ambiente seguro, **${minSafety.name}** sente-se vulnerável, indicando falhas graves na equidade da proteção.`;
        } else if (parseFloat(safetyGap) > 0.5) {
            safetyText = `Variação perceptível na sensação de segurança. **${minSafety.name}** relata índices inferiores a **${maxSafety.name}**, sugerindo a necessidade de ações de acolhimento específicas.`;
        } else {
            safetyText = `A percepção de segurança é **homogênea** (variação de apenas ${safetyGap}), indicando que as políticas de convivência e proteção impactam a todos os grupos de forma similar.`;
        }

        // Logic for Sentiment Explanations
        let predominantSentiment = 'Neutro';
        let predominantPercent = sentimentStats.neutral;
        let sentimentColor = 'text-slate-400';
        let sentimentContext = "";
        
        if (sentimentStats.positive > sentimentStats.neutral && sentimentStats.positive > sentimentStats.negative) {
             predominantSentiment = 'Positivo';
             predominantPercent = sentimentStats.positive;
             sentimentColor = 'text-green-400';
             sentimentContext = "O otimismo da comunidade valida as estratégias atuais, criando um ambiente propício ao engajamento.";
        } else if (sentimentStats.negative > sentimentStats.neutral && sentimentStats.negative > sentimentStats.positive) {
             predominantSentiment = 'Negativo';
             predominantPercent = sentimentStats.negative;
             sentimentColor = 'text-red-400';
             sentimentContext = "O alto volume de críticas sinaliza desconforto generalizado. É crucial investigar as causas raiz nos comentários.";
        } else {
             sentimentContext = "A polarização ou neutralidade indica um momento de incerteza. Ações de comunicação transparente podem ser decisivas.";
        }

        return (
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
                        <div className="mt-4 pt-4 border-t border-slate-800">
                             <p className="text-xs text-slate-400 leading-relaxed flex gap-2">
                                <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                                <span>
                                    <ReactMarkdown components={{strong: ({node, ...props}) => <strong className="text-blue-300 font-bold" {...props}/>}}>
                                        {radarText}
                                    </ReactMarkdown>
                                </span>
                             </p>
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
                        <div className="mt-4 pt-4 border-t border-slate-800">
                             <p className="text-xs text-slate-400 leading-relaxed flex gap-2">
                                <Info size={14} className="text-green-400 shrink-0 mt-0.5" />
                                <span>
                                    <ReactMarkdown components={{strong: ({node, ...props}) => <strong className="text-green-300 font-bold" {...props}/>}}>
                                        {safetyText}
                                    </ReactMarkdown>
                                </span>
                             </p>
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
                        
                        <div className="w-full h-2 bg-slate-800 rounded-full mb-3 flex overflow-hidden shrink-0">
                            <div style={{ width: `${sentimentStats.positive}%` }} className="h-full bg-green-500"></div>
                            <div style={{ width: `${sentimentStats.neutral}%` }} className="h-full bg-slate-500"></div>
                            <div style={{ width: `${sentimentStats.negative}%` }} className="h-full bg-red-500"></div>
                        </div>
                        
                        <div className="mb-4 flex items-start gap-2 text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                            <Info size={14} className={`shrink-0 mt-0.5 ${sentimentColor}`} />
                            <span>
                                Tendência majoritariamente <strong className={sentimentColor}>{predominantSentiment}</strong> ({predominantPercent}%). {sentimentContext}
                            </span>
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
    };

    const AdvancedStatsView = () => {
        const [showSettings, setShowSettings] = useState(false);
        
        // Helper to check threshold violation
        const getThresholdStatus = (metric: string, value: number) => {
            let limit = 0;
            let isMax = false; // true if exceeding limit is bad
            let target = 0;

            if (metric === 'Segurança') { limit = thresholds.safety; target = thresholds.safety; }
            else if (metric === 'Infraestrutura') { limit = thresholds.facilities; target = thresholds.facilities; }
            else if (metric === 'Saúde Mental') { limit = thresholds.mentalHealth; target = thresholds.mentalHealth; }
            else if (metric === 'Respeito') { limit = thresholds.respect; target = thresholds.respect; }
            else if (metric === 'Violência') { limit = thresholds.violence; isMax = true; target = thresholds.violence; }
            else return null;

            const isViolation = isMax ? value > limit : value < limit;
            return { isViolation, limit, isMax };
        };

        const StatCard: React.FC<{ stat: AdvancedStat }> = ({ stat }) => {
            const status = getThresholdStatus(stat.metric, stat.mean);
            const isCritical = status?.isViolation;
            
            return (
                <div className={`p-6 rounded-2xl border transition-all duration-300 ${isCritical ? 'bg-red-950/20 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-slate-900/50 border-slate-700 hover:border-purple-500/30'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-8 rounded-full ${isCritical ? 'bg-red-500' : 'bg-purple-500'}`}></div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{stat.metric}</h3>
                                {status && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {isCritical ? <AlertCircle size={12} className="text-red-400" /> : <CheckCircle size={12} className="text-green-400" />}
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isCritical ? 'text-red-400' : 'text-slate-500'}`}>
                                            Meta: {status.isMax ? '<' : '>'}{status.limit.toFixed(1)} {stat.metric === 'Violência' && '%'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${stat.stdDev < 0.8 ? 'bg-green-900/30 text-green-400 border border-green-800' : stat.stdDev < 1.3 ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>{stat.interpretation}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-1">Média</div>
                                <div className={`text-2xl font-mono ${isCritical ? 'text-red-400' : 'text-white'}`}>{stat.mean.toFixed(2)}</div>
                            </div>
                            {isCritical && <div className="absolute inset-0 bg-red-500/5"></div>}
                        </div>
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Mediana</div><div className="text-2xl font-mono text-white">{stat.median.toFixed(2)}</div></div>
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Moda</div><div className="text-2xl font-mono text-white">{stat.mode}</div></div>
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Desvio Padrão</div><div className="text-2xl font-mono text-purple-400">{stat.stdDev.toFixed(2)}</div></div>
                    </div>
                </div>
            );
        };

        // Custom Card for Violence (since it's not in the standard advancedStats array usually)
        const ViolenceCard = () => {
             const val = parseFloat(stats.violencePerc);
             const status = getThresholdStatus('Violência', val);
             const isCritical = status?.isViolation;
             
             return (
                <div className={`p-6 rounded-2xl border transition-all duration-300 ${isCritical ? 'bg-red-950/20 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-slate-900/50 border-slate-700 hover:border-purple-500/30'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-8 rounded-full ${isCritical ? 'bg-red-500' : 'bg-purple-500'}`}></div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Taxa de Violência</h3>
                                {status && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {isCritical ? <AlertCircle size={12} className="text-red-400" /> : <CheckCircle size={12} className="text-green-400" />}
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isCritical ? 'text-red-400' : 'text-slate-500'}`}>
                                            Meta: {'<'}{status.limit}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">Índice Global</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 relative overflow-hidden group">
                             <div className="text-slate-500 text-xs font-bold uppercase mb-1">Percentual Reportado</div>
                             <div className={`text-3xl font-mono ${isCritical ? 'text-red-400' : 'text-white'}`}>{stats.violencePerc}%</div>
                         </div>
                         <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center">
                             <p className="text-xs text-slate-500 leading-relaxed">
                                 Este índice representa a % de respondentes que marcaram "Sim" para a presença de violência na escola.
                             </p>
                         </div>
                    </div>
                </div>
             );
        };

        return (
            <div className="animate-in space-y-8">
                <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                         <h2 className="text-3xl font-bold text-white flex items-center gap-3"><Calculator size={32} className="text-purple-400" /> Estatística Descritiva</h2>
                         <button 
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${showSettings ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                         >
                             {showSettings ? <X size={16} /> : <Target size={16} />} Metas e Limites
                         </button>
                    </div>

                    {showSettings && (
                        <div className="mb-8 p-6 bg-slate-900/80 rounded-2xl border border-purple-500/30 animate-in fade-in slide-in-from-top-4">
                            <div className="flex items-center gap-2 mb-4 text-purple-400 font-bold text-sm uppercase tracking-wider">
                                <Sliders size={16} /> Configuração de Alertas (KPIs)
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {Object.entries(thresholds).map(([key, val]) => (
                                    <div key={key} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2">
                                            {key === 'safety' ? 'Mín. Segurança (0-5)' : 
                                             key === 'facilities' ? 'Mín. Infra (0-5)' : 
                                             key === 'mentalHealth' ? 'Mín. Saúde Mental (0-5)' : 
                                             key === 'respect' ? 'Mín. Respeito (0-5)' : 
                                             'Máx. Violência (%)'}
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            value={val}
                                            onChange={(e) => setThresholds({...thresholds, [key]: parseFloat(e.target.value) || 0})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-purple-500 focus:outline-none transition-colors"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        {advancedStats.map((stat, idx) => (
                            <StatCard key={idx} stat={stat} />
                        ))}
                        <ViolenceCard />
                    </div>
                </div>
            </div>
        );
    };

    const ReportsView = () => {
        const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
        const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);

        // Filter suggestions first
        const filteredReportSuggestions = suggestions.filter(s => 
            (reportRoleFilter === 'Todos' || s.role === reportRoleFilter) &&
            (reportSentimentFilter === 'Todos' || s.sentiment === reportSentimentFilter)
        );

        // Sort suggestions
        const sortedSuggestions = React.useMemo(() => {
            let sortableItems = [...filteredReportSuggestions];
            if (sortConfig !== null) {
                sortableItems.sort((a: any, b: any) => {
                    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }
            return sortableItems;
        }, [filteredReportSuggestions, sortConfig]);

        const requestSort = (key: string) => {
            let direction: 'asc' | 'desc' = 'asc';
            if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
                direction = 'desc';
            }
            setSortConfig({ key, direction });
        };

        const getSortIcon = (key: string) => {
            if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-50" />;
            return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-cyan-400" /> : <ArrowDown size={14} className="text-cyan-400" />;
        };

        // Pie Chart Data (Sentiment Distribution)
        const pieData = [
            { name: 'Positivo', value: filteredReportSuggestions.filter(s => s.sentiment === 'Positivo').length, color: '#4ade80' },
            { name: 'Neutro', value: filteredReportSuggestions.filter(s => s.sentiment === 'Neutro').length, color: '#94a3b8' },
            { name: 'Negativo', value: filteredReportSuggestions.filter(s => s.sentiment === 'Negativo').length, color: '#f87171' },
        ].filter(d => d.value > 0);

        // Bar Chart Data (Role Sentiment Distribution)
        const roleSentimentData = useMemo(() => {
            const rolesToProcess = reportRoleFilter === 'Todos' 
                ? [...new Set(suggestions.map(s => s.role))] 
                : [reportRoleFilter];
            
            return rolesToProcess.map(role => {
                const roleSug = suggestions.filter(s => s.role === role);
                return {
                    name: role,
                    Positivo: roleSug.filter(s => s.sentiment === 'Positivo').length,
                    Neutro: roleSug.filter(s => s.sentiment === 'Neutro').length,
                    Negativo: roleSug.filter(s => s.sentiment === 'Negativo').length,
                };
            });
        }, [suggestions, reportRoleFilter]);

        // Trend Chart Data (Sentiment over time)
        const trendData = React.useMemo(() => {
            const groups: Record<string, any> = {};
            sortedSuggestions.forEach(s => {
                const date = s.timestamp || 'Sem Data';
                if (!groups[date]) groups[date] = { date, Positivo: 0, Neutro: 0, Negativo: 0 };
                groups[date][s.sentiment]++;
            });
            return Object.values(groups).sort((a: any, b: any) => a.date.localeCompare(b.date));
        }, [sortedSuggestions]);

        // Critical Points Extraction
        const criticalPointsSection = React.useMemo(() => {
            if (!analysis) return null;
            // Regex to match "## ... Pontos Críticos" or similar headers, capturing everything AFTER the header until the next "##"
            const match = analysis.match(/##\s*[^\n]*(Pontos Críticos|Vulnerabilidades Críticas)([\s\S]*?)(?=\n##|$)/i);
            
            if (match && match[2]) {
                // Return only the content (match[2]) prefixed with newlines to ensure Markdown table renders correctly
                return "\n\n" + match[2].trim();
            }
            return null;
        }, [analysis]);

        return (
            <div className="animate-in space-y-6">
                
                {/* Filters and Controls */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    <div className="flex gap-4 flex-wrap">
                        {/* Role Filter */}
                        <div className="relative">
                            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <select 
                                value={reportRoleFilter}
                                onChange={(e) => setReportRoleFilter(e.target.value)}
                                className="pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer hover:bg-slate-750"
                            >
                                <option value="Todos">Todos os Perfis</option>
                                {[...new Set(suggestions.map(s => s.role))].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>

                        {/* Sentiment Filter */}
                         <div className="relative">
                            <Activity size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <select 
                                value={reportSentimentFilter}
                                onChange={(e) => setReportSentimentFilter(e.target.value)}
                                className="pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer hover:bg-slate-750"
                            >
                                <option value="Todos">Todos Sentimentos</option>
                                <option value="Positivo">Positivo</option>
                                <option value="Neutro">Neutro</option>
                                <option value="Negativo">Negativo</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-green-900/30 hover:bg-green-900/50 text-green-400 px-4 py-2 rounded-xl border border-green-800/50 font-bold text-sm transition-all"
                    >
                        <FileSpreadsheet size={16} /> Exportar CSV
                    </button>
                </div>

                {/* AI Critical Points Section */}
                {criticalPointsSection && (
                    <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-red-100">Alertas Críticos de Inteligência</h3>
                        </div>
                        <div className="relative z-10">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                components={MarkdownRenderers}
                            >
                                {criticalPointsSection}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* Visualizations Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Slot 1: Pie Chart OR Line Chart (Trend) */}
                    <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl lg:col-span-1">
                        {reportRoleFilter === 'Todos' ? (
                            <>
                                <h4 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><Activity size={18} className="text-purple-400" /> Distribuição Atual</h4>
                                <div className="h-[200px] w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                            </Pie>
                                            <RechartsTooltip content={<DarkTooltip />} />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        ) : (
                            <>
                                <h4 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><Calendar size={18} className="text-orange-400" /> Tendência Temporal ({reportRoleFilter})</h4>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                            <RechartsTooltip content={<DarkTooltip />} />
                                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                            <Line type="monotone" dataKey="Positivo" stroke="#4ade80" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="Neutro" stroke="#94a3b8" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="Negativo" stroke="#f87171" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Slot 2: Stacked Bar (Roles) */}
                    <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl lg:col-span-2">
                        <h4 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><BarChart3 size={18} className="text-blue-400" /> Sentimento por Perfil</h4>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={roleSentimentData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                    <RechartsTooltip content={<DarkTooltip />} cursor={{fill: '#334155', opacity: 0.3}} />
                                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                    <Bar dataKey="Positivo" stackId="a" fill="#4ade80" radius={[0,0,4,4]} barSize={40} />
                                    <Bar dataKey="Neutro" stackId="a" fill="#94a3b8" />
                                    <Bar dataKey="Negativo" stackId="a" fill="#f87171" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-xl">
                    <div className="flex justify-between items-center mb-8">
                        <div><h2 className="text-3xl font-bold text-white flex items-center gap-3"><FileText size={32} className="text-cyan-400" /> Relatório Detalhado</h2></div>
                        <div className="bg-slate-900 px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-mono text-sm shadow-inner">Total Filtrado: <span className="text-white font-bold">{sortedSuggestions.length}</span></div>
                    </div>
                    
                    {sortedSuggestions.length > 0 ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/50">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-slate-950 text-slate-200 uppercase text-xs font-bold tracking-wider">
                                        <tr>
                                            <th onClick={() => requestSort('role')} className="px-6 py-5 border-b border-slate-800 cursor-pointer hover:text-cyan-400 transition-colors group">
                                                <div className="flex items-center gap-2">Role {getSortIcon('role')}</div>
                                            </th>
                                            <th onClick={() => requestSort('timestamp')} className="px-6 py-5 border-b border-slate-800 cursor-pointer hover:text-cyan-400 transition-colors group">
                                                <div className="flex items-center gap-2">Data {getSortIcon('timestamp')}</div>
                                            </th>
                                            <th onClick={() => requestSort('sentiment')} className="px-6 py-5 border-b border-slate-800 cursor-pointer hover:text-cyan-400 transition-colors group">
                                                <div className="flex items-center gap-2">Sentimento {getSortIcon('sentiment')}</div>
                                            </th>
                                            <th onClick={() => requestSort('text')} className="px-6 py-5 border-b border-slate-800 cursor-pointer hover:text-cyan-400 transition-colors group">
                                                <div className="flex items-center gap-2">Feedback {getSortIcon('text')}</div>
                                            </th>
                                            <th className="px-6 py-5 border-b border-slate-800 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {sortedSuggestions.map((sug) => (
                                            <tr 
                                                key={sug.id} 
                                                className={`hover:bg-slate-800/50 transition-colors group ${sug.sentiment === 'Negativo' ? 'bg-red-950/5 hover:bg-red-900/10 border-l-2 border-red-500' : ''}`}
                                            >
                                                <td className="px-6 py-5 w-40 align-top">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${sug.role.includes('Aluno') ? 'bg-blue-950 text-blue-400 border-blue-900' : sug.role.includes('Professor') ? 'bg-green-950 text-green-400 border-green-900' : 'bg-orange-950 text-orange-400 border-orange-900'}`}>{sug.role}</span>
                                                </td>
                                                <td className="px-6 py-5 w-32 align-top font-mono text-xs text-slate-500">
                                                    {sug.timestamp || '-'}
                                                </td>
                                                <td className="px-6 py-5 w-32 align-top">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold border ${sug.sentiment === 'Positivo' ? 'bg-green-900/30 text-green-400 border-green-800' : sug.sentiment === 'Negativo' ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{sug.sentiment}</span>
                                                </td>
                                                <td className="px-6 py-5 text-slate-300 leading-relaxed group-hover:text-white transition-colors line-clamp-2 max-w-lg">
                                                    {sug.text.length > 100 ? sug.text.substring(0, 100) + '...' : sug.text}
                                                </td>
                                                <td className="px-6 py-5 text-right align-top">
                                                    <button 
                                                        onClick={() => setSelectedSuggestion(sug)}
                                                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-all border border-slate-700"
                                                        title="Ver Detalhes"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed animate-in">
                            <div className="p-4 bg-slate-800 rounded-full mb-4 text-slate-500 shadow-inner">
                                <Filter size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Nenhum resultado encontrado</h3>
                            <p className="text-slate-400 text-center max-w-md mb-6">
                                Não encontramos sugestões que correspondam aos filtros de 
                                <span className="text-cyan-400 font-bold mx-1">{reportRoleFilter}</span> e 
                                <span className="text-cyan-400 font-bold mx-1">{reportSentimentFilter}</span>. 
                            </p>
                            <button 
                                onClick={() => { setReportRoleFilter('Todos'); setReportSentimentFilter('Todos'); }}
                                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all border border-slate-700 hover:border-slate-600 shadow-lg"
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal for Details */}
                {selectedSuggestion && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedSuggestion(null)}></div>
                        <div className="relative w-full max-w-2xl bg-[#1e293b] rounded-3xl border border-slate-700 shadow-2xl p-8 animate-in">
                            <button 
                                onClick={() => setSelectedSuggestion(null)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center gap-3">
                                    <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold uppercase tracking-wider ${
                                        selectedSuggestion.role.includes('Aluno') ? 'bg-blue-950/50 text-blue-400 border-blue-900' : 
                                        selectedSuggestion.role.includes('Professor') ? 'bg-green-950/50 text-green-400 border-green-900' : 
                                        'bg-orange-950/50 text-orange-400 border-orange-900'
                                    }`}>
                                        {selectedSuggestion.role}
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-full border text-xs font-bold uppercase ${
                                        selectedSuggestion.sentiment === 'Positivo' ? 'bg-green-900/20 text-green-400 border-green-800' : 
                                        selectedSuggestion.sentiment === 'Negativo' ? 'bg-red-900/20 text-red-400 border-red-800' : 
                                        'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}>
                                        {selectedSuggestion.sentiment}
                                    </div>
                                    {selectedSuggestion.timestamp && (
                                        <div className="text-slate-500 font-mono text-sm ml-auto">
                                            {selectedSuggestion.timestamp}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 overflow-y-auto max-h-[60vh]">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]} 
                                        components={{
                                            ...MarkdownRenderers,
                                            p: ({node, ...props}: any) => <p className="text-slate-200 text-lg leading-relaxed" {...props} />
                                        }}
                                    >
                                        {selectedSuggestion.text}
                                    </ReactMarkdown>
                                </div>
                                
                                <div className="flex justify-end">
                                    <button 
                                        onClick={() => setSelectedSuggestion(null)}
                                        className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const SettingsView = () => (
         <div className="animate-in max-w-3xl mx-auto mt-10">
             <div className="bg-[#1e293b] p-10 rounded-3xl border border-slate-800 shadow-2xl">
                 <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-4"><div className="p-3 bg-slate-800 rounded-2xl"><Settings size={32} className="text-slate-400" /></div>Configurações</h2>
                 <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-700/50 text-center text-slate-400">
                    <p>As configurações da API Key agora são gerenciadas via variáveis de ambiente do sistema (Vercel).</p>
                    <p className="mt-2 text-sm text-slate-500">API_KEY configurada no backend.</p>
                 </div>
                 
                 <div className="mt-8 pt-8 border-t border-slate-800">
                     <h3 className="text-xl font-bold text-white mb-4">Gerenciamento de Dados</h3>
                     <ul className="space-y-3">
                        {datasets.map(ds => (
                            <li key={ds.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><FileText size={18} /></div>
                                    <div>
                                        <p className="text-white font-bold">{ds.name}</p>
                                        <p className="text-xs text-slate-500">{ds.uploadDate.toLocaleDateString()} • {ds.stats.total} registros</p>
                                    </div>
                                </div>
                                {ds.id === activeDatasetId && (
                                    <span className="px-2 py-1 bg-cyan-900/30 text-cyan-400 rounded-full text-xs font-bold border border-cyan-800">Ativo</span>
                                )}
                            </li>
                        ))}
                     </ul>
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
                                {activeTab === 'compare' && 'Comparação Profissional'}
                                {activeTab === 'stats' && 'Estatística Avançada'}
                                {activeTab === 'reports' && 'Relatórios Detalhados'}
                                {activeTab === 'settings' && 'Preferências'}
                            </h1>
                            <p className="text-slate-400 font-medium">Monitorização estratégica em tempo real.</p>
                        </div>
                        <div className="flex gap-3 items-center">
                            {/* Dataset Selector */}
                            <div className="relative">
                                <select 
                                    value={activeDatasetId} 
                                    onChange={(e) => setActiveDatasetId(e.target.value)}
                                    className="appearance-none bg-slate-800 border border-slate-700 text-white pl-4 pr-10 py-3 rounded-xl font-bold cursor-pointer hover:bg-slate-700 transition-colors shadow-lg"
                                >
                                    {datasets.map(ds => (
                                        <option key={ds.id} value={ds.id}>{ds.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            <div className="relative group">
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    multiple 
                                    onChange={handleFileUpload} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                />
                                <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]">
                                    <Upload size={18} /> <span className="hidden sm:inline">Carregar CSVs</span>
                                </button>
                            </div>
                            <button onClick={downloadPDF} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3 rounded-xl border border-slate-700 font-bold transition-all shadow-lg hover:shadow-cyan-500/10">
                                {generatingPdf ? <Loader2 size={18} className="animate-spin"/> : <FileDown size={18} />} PDF
                            </button>
                        </div>
                    </div>
                    {activeTab === 'dashboard' && <DashboardView />}
                    {activeTab === 'compare' && <ComparisonView />}
                    {activeTab === 'stats' && <AdvancedStatsView />}
                    {activeTab === 'reports' && <ReportsView />}
                    {activeTab === 'settings' && <SettingsView />}
                </div>
            </div>
        </div>
    );
};

export default App;
