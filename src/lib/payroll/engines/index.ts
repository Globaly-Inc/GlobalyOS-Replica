/**
 * Payroll Calculation Engine Factory
 * Returns the appropriate country-specific engine
 */

import type { PayrollCountry } from '@/types/payroll';
import type { ICountryPayrollEngine } from './types';
import { NepalPayrollEngine } from './nepal';
import { IndiaPayrollEngine } from './india';
import { AustraliaPayrollEngine } from './australia';

// Singleton instances for each country engine
const engines: Record<PayrollCountry, ICountryPayrollEngine> = {
  NP: new NepalPayrollEngine(),
  IN: new IndiaPayrollEngine(),
  AU: new AustraliaPayrollEngine(),
};

/**
 * Get the payroll calculation engine for a specific country
 */
export function getPayrollEngine(country: PayrollCountry): ICountryPayrollEngine {
  const engine = engines[country];
  if (!engine) {
    throw new Error(`No payroll engine available for country: ${country}`);
  }
  return engine;
}

/**
 * Check if a country is supported
 */
export function isCountrySupported(country: string): country is PayrollCountry {
  return country in engines;
}

/**
 * Get list of supported countries
 */
export function getSupportedCountries(): PayrollCountry[] {
  return Object.keys(engines) as PayrollCountry[];
}

// Re-export types and engines
export type { ICountryPayrollEngine, PayrollCalculationParams, EmployeePayrollData } from './types';
export { NepalPayrollEngine } from './nepal';
export { IndiaPayrollEngine } from './india';
export { AustraliaPayrollEngine } from './australia';
