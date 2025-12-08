
import { GoogleGenAI } from "@google/genai";
import { Stats, SentimentStats, Suggestion } from '../types';

export const generateSchoolReport = async (
    stats: Stats, 
    suggestions: Suggestion[], 
    sentimentStats: SentimentStats
): Promise<string> => {
    
    // API Key must be obtained exclusively from process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        if (!text) throw new Error("No content generated.");
        return text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
};
