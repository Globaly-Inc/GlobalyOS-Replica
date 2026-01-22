/**
 * TypeScript types for structured horoscope data
 */

export type HoroscopeAspectKey = 'career' | 'relationships' | 'wellbeing' | 'money';

export interface HoroscopeAspect {
  key: HoroscopeAspectKey;
  label: string;
  text: string;
  icon?: string;
}

export interface HoroscopeData {
  sign: string;
  symbol: string;
  dateRange: string;
  element: string;
  date: string;
  title?: string;
  aspects: HoroscopeAspect[];
  summaryParagraph: string;
  legacyContent?: string;
}

export interface HoroscopeApiResponse {
  horoscope: string;
  title?: string;
  summaryParagraph?: string;
  aspects?: HoroscopeAspect[];
  cached: boolean;
  error?: string;
}
