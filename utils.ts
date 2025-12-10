import { SurveyData, AdvancedStat } from './types';

export const analyzeSentiment = (text: string): 'Positivo' | 'Neutro' | 'Negativo' => {
  if (!text || typeof text !== 'string') return 'Neutro';
  const lower = text.toLowerCase().trim();
  
  // Dicionário ponderado para análise de sentimento contextual (Escala -3 a +3)
  const sentimentMap: Record<string, number> = {
    // Positivos
    'bom': 1, 'boa': 1, 'bons': 1, 'boas': 1,
    'ótimo': 2, 'ótima': 2, 'ótimos': 2, 'ótimas': 2,
    'excelente': 3, 'excelentes': 3,
    'maravilhoso': 3, 'maravilhosa': 3,
    'parabéns': 2,
    'gosto': 1, 'amo': 3, 'adora': 2,
    'seguro': 2, 'segura': 2, 'segurança': 1,
    'feliz': 2, 'felicidade': 2,
    'melhorou': 2, 'melhor': 1,
    'agradável': 1,
    'apoio': 2, 'ajuda': 1, 'acolhimento': 2, 'acolhedor': 2,
    'respeito': 2, 'respeitoso': 2,
    'limpo': 1, 'limpeza': 1, 'organizado': 1,
    'eficiente': 2,
    'amigável': 1, 'amigo': 1,
    'funciona': 1,
    'legal': 1,
    'satisfeito': 2, 'satisfeita': 2,
    'confio': 2, 'confiança': 2,
    'top': 1, '10': 1,

    // Negativos
    'ruim': -1, 'ruins': -1,
    'péssimo': -3, 'péssima': -3,
    'horrível': -3, 'horriveis': -3,
    'difícil': -1, 'dificuldade': -1,
    'triste': -2, 'tristeza': -2,
    'falta': -2, 'faltam': -2,
    'ausência': -1, 'ausente': -1,
    'precária': -2, 'precário': -2,
    'medo': -3,
    'violência': -3, 'violento': -3, 'violenta': -3,
    'inseguro': -3, 'insegura': -3, 'insegurança': -3,
    'risco': -2, 'arriscado': -2,
    'droga': -3, 'drogas': -3,
    'briga': -2, 'brigas': -2,
    'ameaça': -3, 'ameaçado': -3,
    'bullying': -3,
    'desrespeito': -3, 'desrespeitoso': -3,
    'sujo': -2, 'sujeira': -2,
    'quebrado': -2, 'quebrada': -2,
    'bagunça': -1, 'bagunçado': -1,
    'barulho': -1, 'barulhento': -1,
    'ignorante': -2, 'estúpido': -2,
    'lento': -1, 'demorado': -1,
    'vergonha': -2,
    'pior': -2, 'piorou': -2,
    'odeio': -3, 'detesto': -3,
    'insuportável': -3,
    'negligência': -3, 'negligente': -3,
    'abandonado': -3, 'abandono': -3,
    'ignorado': -2,
    'fome': -2,
    'bater': -2, 'apanhar': -2,
    'roubo': -3, 'furto': -3
  };

  const negations = new Set(['não', 'nao', 'nem', 'nunca', 'jamais', 'sem', 'pouco', 'menos']);
  const boosters = new Set(['muito', 'muita', 'bastante', 'extremamente', 'demais', 'super', 'realmente', 'totalmente', 'tão']);
  
  // Tokeniza preservando a intenção, separando por pontuação e espaço
  const tokens = lower.split(/[\s,.;!?()"]+/);
  
  let score = 0;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    if (!word) continue;

    let wordScore = sentimentMap[word] || 0;

    // Análise de Contexto (Lookbehind)
    if (wordScore !== 0) {
      let multiplier = 1;
      
      // Checa a palavra imediatamente anterior
      if (i > 0) {
        const prev = tokens[i - 1];
        if (negations.has(prev)) multiplier *= -1; // Inverte polaridade ("não gosto")
        else if (boosters.has(prev)) multiplier *= 1.5; // Intensifica ("muito bom")
        
        // Checa duas palavras atrás para casos como "não é bom"
        if (i > 1) {
             const prev2 = tokens[i - 2];
             // Se a anterior for verbo de ligação, checa a negação antes dele
             const isLinkingVerb = ['é', 'e', 'foi', 'está', 'esta', 'tá', 'ta', 'são'].includes(prev);
             if (isLinkingVerb && negations.has(prev2)) {
                 multiplier *= -1;
             }
        }
      }

      score += wordScore * multiplier;
    }
  }

  // Heurísticas de Frase (Expressões Idiomáticas)
  if (lower.includes('deixa a desejar') || lower.includes('deixar a desejar')) score -= 2;
  if (lower.includes('precisa melhorar')) score -= 1;
  if (lower.includes('nada a reclamar') || lower.includes('nada a declarar')) score += 1;
  if (lower.includes('valeu a pena')) score += 2;

  // Limiares de Decisão
  if (score > 0.5) return 'Positivo';
  if (score < -0.5) return 'Negativo';
  return 'Neutro';
};

export const calculateStats = (values: number[]): Omit<AdvancedStat, 'metric' | 'interpretation'> => {
  if (!values || values.length === 0) return { mean: 0, median: 0, mode: 0, stdDev: 0 };
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  const frequency: Record<number, number> = {};
  let maxFreq = 0;
  let mode = values[0];
  values.forEach(v => {
      frequency[v] = (frequency[v] || 0) + 1;
      if (frequency[v] > maxFreq) { maxFreq = frequency[v]; mode = v; }
  });
  
  return { mean, median, mode, stdDev };
};

export const interpretStdDev = (stdDev: number): string => {
  if (stdDev < 0.8) return "Consenso (Opiniões similares)";
  if (stdDev < 1.3) return "Variação Moderada";
  return "Polarização (Desacordo intenso)";
};

export const parseCSV = (text: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuote = false;
  let currentCell = '';
  
  for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
          if (inQuote && nextChar === '"') { 
              currentCell += '"'; 
              i++; 
          } else { 
              inQuote = !inQuote; 
          }
      } else if (char === ',' && !inQuote) {
          row.push(currentCell.trim()); 
          currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuote) {
          if (currentCell || row.length > 0) { 
              row.push(currentCell.trim()); 
              result.push(row); 
              row = []; 
              currentCell = ''; 
          }
          if (char === '\r' && nextChar === '\n') i++;
      } else { 
          currentCell += char; 
      }
  }
  if (currentCell || row.length > 0) { 
      row.push(currentCell.trim()); 
      result.push(row); 
  }
  return result;
};

export const processCSVData = (rows: string[][]): SurveyData[] => {
    return rows.slice(1).map(row => {
        if (row.length < 5) return null;
        // Adjust indices based on your specific CSV structure
        const mentalHealthVal = row[21] || row[18]; 
        return { 
            timestamp: row[0], 
            role: row[2], 
            safety: row[4], 
            violence: row[5], 
            respectStudents: row[7], 
            mentalHealth: mentalHealthVal, 
            facilities: row[13], 
            suggestion: row[15] 
        };
    }).filter((item): item is SurveyData => item !== null);
};

export const scaleMap: Record<string, number> = { 
    'Sempre': 5, 'Frequentemente': 4, 'Às vezes': 3, 'Raramente': 2, 'Nunca': 1, 
    'Sim': 1, 'Não': 0, 'Não Sei': 0, 'Não sei!': 0 
};