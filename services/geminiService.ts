
import { GoogleGenAI } from "@google/genai";
import { Stats, SentimentStats, Suggestion, Dataset } from '../types';

// Define a API Key usando a variável de ambiente ou o valor hardcoded de teste fornecido
const API_KEY = process.env.API_KEY || "AIzaSyC66emimXFo6BVctXpbYlheIueYSgP3ExE";

export const generateSchoolReport = async (
    stats: Stats, 
    suggestions: Suggestion[], 
    sentimentStats: SentimentStats
): Promise<string> => {
    
    // Validação
    if (!API_KEY) {
        throw new Error("A chave de API não foi encontrada. Verifique as configurações do Vercel ou o código.");
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const prompt = `
    Atue como um Consultor Sênior em Psicologia Escolar e Gestão Educacional.
    Você está analisando dados de uma pesquisa de clima escolar. Seu objetivo não é apenas resumir, mas DIAGNOSTICAR o ambiente com profundidade e contexto.

    DADOS QUANTITATIVOS:
    - Total Respondentes: ${stats.total}
    - Nota Segurança: ${stats.avgSafety}/5
    - Nota Infraestrutura: ${stats.avgFacilities}/5
    - Nota Saúde Mental: ${stats.avgMentalHealth}/5
    - Taxa de Violência: ${stats.violencePerc}%
    
    DADOS QUALITATIVOS (VOZ DA COMUNIDADE):
    - Volume: ${suggestions.length} comentários.
    - Sentimento: ${sentimentStats.positive}% Positivo vs ${sentimentStats.negative}% Negativo.
    - Amostra de Comentários Reais: ${JSON.stringify(suggestions.slice(0, 20).map(s => s.text))}

    TAREFA:
    Gere um Relatório Estratégico Detalhado em MARKDOWN. O texto deve ser explicativo, profissional e empático.
    
    ESTRUTURA OBRIGATÓRIA:

    1. **Resumo Executivo Contextualizado** (Use blockquote '>'):
       - Escreva 2 a 3 parágrafos robustos. Não faça listas aqui.
       - Analise a discrepância entre a nota de segurança (${stats.avgSafety}) e a taxa de violência (${stats.violencePerc}%). O que isso diz sobre a normalização da violência?
       - Conecte a infraestrutura (${stats.avgFacilities}) com a saúde mental (${stats.avgMentalHealth}). Como o ambiente físico está afetando o psicológico?

    2. **Análise Psicossocial Profunda**:
       - Interprete o "tom" dos comentários. Há medo? Resignação? Raiva? Esperança?
       - Explique as consequências de longo prazo se os indicadores de Saúde Mental (${stats.avgMentalHealth}) não forem tratados.

    3. **Matriz de Vulnerabilidades Críticas** (Tabela Markdown ESTRITA):
       - IMPORTANTE: Deixe SEMPRE uma linha em branco antes da tabela e NÃO use indentação.
       - Colunas: | Área Crítica | Evidência (Dados/Falas) | Consequência Pedagógica e Social |
       - Seja específico nas consequências (ex: "Evasão escolar", "Burnout docente", "Baixo rendimento").

    4. **Plano de Intervenção Estratégica**:
       - Liste 3 a 4 ações macro.
       - Para cada ação, inclua: O Que Fazer, Como Fazer e a *Justificativa Estratégica* (Por que isso vai funcionar?).

    TOM DE VOZ:
    Analítico, sério, porém acolhedor. Use terminologia adequada da área de educação e psicologia. Evite frases genéricas.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text;
        if (!text) throw new Error("A IA não retornou conteúdo (Resposta vazia).");
        return text;
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        // Repassa a mensagem original do erro para o frontend
        throw new Error(error.message || "Erro desconhecido na comunicação com a IA.");
    }
};

export const generateComparativeReport = async (datasets: Dataset[]): Promise<string> => {
    if (!API_KEY) {
        throw new Error("A chave de API não foi encontrada.");
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // 1. Sort datasets chronologically (assuming name contains date or increasing sequence)
    // Note: The UI usually passes already sorted datasets, but we ensure sorting here just in case.
    const sortedDatasets = [...datasets].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const periodStart = sortedDatasets[0].name;
    const periodEnd = sortedDatasets[sortedDatasets.length - 1].name;

    // 2. Prepare structured summary specifically for trend analysis
    const summaryData = sortedDatasets.map(d => ({
        period: d.name,
        metrics: {
            safety: parseFloat(d.stats.avgSafety),
            mental_health: parseFloat(d.stats.avgMentalHealth),
            infrastructure: parseFloat(d.stats.avgFacilities),
            violence_rate: parseFloat(d.stats.violencePerc),
            support: parseFloat(d.stats.avgSupport)
        },
        sentiment_balance: {
            positive: d.sentimentStats.positive,
            negative: d.sentimentStats.negative
        }
    }));

    const prompt = `
    Atue como um Especialista em Análise de Dados Longitudinais (Time-Series) para Educação.
    Analise o seguinte conjunto de dados sequencial do período: **${periodStart}** até **${periodEnd}**.

    DADOS HISTÓRICOS:
    ${JSON.stringify(summaryData, null, 2)}

    OBJETIVO:
    Gerar um relatório de inteligência focado na **TRAJETÓRIA** e **CORRELAÇÕES** das métricas ao longo deste intervalo selecionado.

    ESTRUTURA DA RESPOSTA (MARKDOWN):

    1. **Análise de Tendência Macro (Overview)**:
       - Qual é a "história" que esses dados contam? (Ex: "Houve uma recuperação robusta na segurança, porém a saúde mental entrou em declínio acentuado").
       - Identifique o tipo de curva: Crescimento Linear, Estagnação, Volatilidade ou Queda?

    2. **Correlações Estratégicas (Causa e Efeito)**:
       - Analise pares específicos:
         * **Segurança vs. Violência**: A percepção de segurança aumentou enquanto a violência real diminuiu? Ou há uma desconexão (segurança sobe, mas violência persiste)?
         * **Infraestrutura vs. Sentimento**: A melhoria/piora física da escola impactou o humor (sentimento positivo/negativo) da comunidade?

    3. **Destaques do Período (Winners & Losers)**:
       - Qual indicador teve a melhor evolução percentual?
       - Qual indicador é o "gargalo" persistente que não reagiu às intervenções (manteve-se baixo em todos os períodos)?

    4. **Projeção e Recomendação**:
       - Baseado na inclinação da reta (trendline) atual, se nada for feito, o que acontecerá no próximo ciclo?
       - Sugira 1 ação corretiva focada na tendência mais preocupante identificada.

    TOM DE VOZ:
    Executivo, direto e baseado em evidências numéricas. Use setas (↑ ↓ →) para ilustrar movimentos.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "Não foi possível gerar a análise comparativa.";
    } catch (error: any) {
        console.error("Comparative AI Error:", error);
        throw new Error(error.message || "Erro ao gerar comparativo.");
    }
};
