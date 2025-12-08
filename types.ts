
export interface SurveyData {
  timestamp: string;
  role: string;
  safety: string;
  violence: string;
  respectStudents: string;
  mentalHealth: string;
  facilities: string;
  suggestion: string;
}

export interface Suggestion {
  id: number;
  role: string;
  text: string;
  sentiment: 'Positivo' | 'Neutro' | 'Negativo';
  timestamp: string;
}

export interface Stats {
  total: number;
  avgSafety: string;
  avgFacilities: string;
  avgMentalHealth: string;
  avgSupport: string;
  violencePerc: string;
}

export interface RadarData {
  subject: string;
  A: string | number;
  fullMark: number;
}

export interface SafetyByRole {
  name: string;
  Segurança: number;
}

export interface AdvancedStat {
  metric: string;
  mean: number;
  median: number;
  mode: number;
  stdDev: number;
  interpretation: string;
}

export interface SentimentStats {
  positive: number;
  neutral: number;
  negative: number;
  counts: Record<string, number>;
}

export interface ChartData {
  radar: RadarData[];
  safety: SafetyByRole[];
}

export interface Dataset {
  id: string;
  name: string;
  uploadDate: Date;
  data: SurveyData[];
  stats: Stats;
  chartData: ChartData;
  suggestions: Suggestion[];
  advancedStats: AdvancedStat[];
  sentimentStats: SentimentStats;
}
