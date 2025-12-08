import { SurveyData, AdvancedStat } from './types';

export const analyzeSentiment = (text: string): 'Positivo' | 'Neutro' | 'Negativo' => {
  if (!text) return 'Neutro';
  const lower = text.toLowerCase();
  const negatives = ['falta', 'urgente', 'medo', 'violência', 'insegurança', 'problema', 'ruim', 'péssim', 'difícil', 'ausência', 'precária', 'risco', 'droga', 'briga'];
  const positives = ['bom', 'ótimo', 'excelente', 'parabéns', 'gosto', 'seguro', 'feliz', 'melhorou', 'agradável', 'apoio', 'gosto muito'];
  
  let score = 0;
  negatives.forEach(w => { if (lower.includes(w)) score--; });
  positives.forEach(w => { if (lower.includes(w)) score++; });
  
  if (score > 0) return 'Positivo';
  if (score < 0) return 'Negativo';
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