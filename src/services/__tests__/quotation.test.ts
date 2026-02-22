import { describe, it, expect } from 'vitest';
import { calculateTax, calculateEqualInstallments } from '@/types/crm-quotation';

describe('calculateTax', () => {
  it('calculates exclusive tax correctly', () => {
    const result = calculateTax(1000, 10, 'exclusive');
    expect(result.baseAmount).toBe(1000);
    expect(result.taxAmount).toBe(100);
    expect(result.totalAmount).toBe(1100);
  });

  it('calculates inclusive tax correctly', () => {
    const result = calculateTax(1100, 10, 'inclusive');
    expect(result.baseAmount).toBe(1000);
    expect(result.taxAmount).toBe(100);
    expect(result.totalAmount).toBe(1100);
  });

  it('handles zero tax rate', () => {
    const result = calculateTax(500, 0, 'exclusive');
    expect(result.baseAmount).toBe(500);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(500);
  });

  it('handles GST at 15%', () => {
    const result = calculateTax(2000, 15, 'exclusive');
    expect(result.taxAmount).toBe(300);
    expect(result.totalAmount).toBe(2300);
  });
});

describe('calculateEqualInstallments', () => {
  it('splits evenly when divisible', () => {
    const result = calculateEqualInstallments(1000, 4);
    expect(result).toEqual([250, 250, 250, 250]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('handles remainder on first installment', () => {
    const result = calculateEqualInstallments(100, 3);
    expect(result.length).toBe(3);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
  });

  it('returns single amount for 0 installments', () => {
    const result = calculateEqualInstallments(500, 0);
    expect(result).toEqual([500]);
  });

  it('returns single amount for 1 installment', () => {
    const result = calculateEqualInstallments(750, 1);
    expect(result).toEqual([750]);
  });
});
