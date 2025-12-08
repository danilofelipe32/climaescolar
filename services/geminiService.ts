import { GoogleGenAI } from "@google/genai";
import { Stats, SentimentStats, Suggestion } from '../types';

export const generateSchoolReport = async (
    stats: Stats, 
    suggestions: Suggestion[], 
    sentimentStats: SentimentStats
): Promise<string> => {
    
    // NOTE: In Vercel, this must be set in the project settings environment variables
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        throw new Error("API Key not configured in environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
    Atue como um Consultor Especialista em Clima Escolar e Psicologia Educacional.
    
    DADOS QUANTITATIVOS:
    - Total Respondentes: ${stats.total}
    - Nota Segurança: ${stats.avgSafety}/5
    - Nota Infraestrutura: ${stats.avgFacilities}/5
    - Nota Saúde Mental: ${stats.avgMentalHealth}/5
    - Taxa de Violência: ${stats.violencePerc}%
    
    DADOS QUALITATIVOS (VOZ DA COMUNIDADE):
    - Total de Comentários: ${suggestions.length}
    - Análise de Sentimento: ${sentimentStats.positive}% Positivo, ${sentimentStats.neutral}% Neutro, ${sentimentStats.negative}% Negativo.
    - Amostra de Comentários (Anônimos): ${JSON.stringify(suggestions.slice(0, 15).map(s => s.text))}

    TAREFA:
    Gere um Diagnóstico Executivo curto e direto em MARKDOWN.
    Use tabelas Markdown padrão para os Pontos Críticos.
    Use listas com bullets para o Plano de Ação.
    
    ESTRUTURA DESEJADA:
    ## Título da Seção (Use emojis)
    Texto do diagnóstico...
    
    ## Pontos Críticos (Tabela)
    | Área | Score | Impacto |
    | :--- | :---: | :--- |
    | ... | ... | ... |
    
    ## Plano de Ação
    * **Ação 1:** Detalhe...
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