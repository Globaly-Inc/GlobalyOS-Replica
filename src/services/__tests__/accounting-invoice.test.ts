import { describe, it, expect } from 'vitest';

// ============================================================
// Tax Calculation Tests
// ============================================================

describe('Tax Calculations', () => {
  const calculateLineTax = (amount: number, taxRate: number, taxType: 'inclusive' | 'exclusive') => {
    if (taxType === 'inclusive') {
      return amount - (amount / (1 + taxRate / 100));
    }
    return amount * (taxRate / 100);
  };

  it('calculates exclusive tax correctly', () => {
    expect(calculateLineTax(100, 10, 'exclusive')).toBeCloseTo(10);
    expect(calculateLineTax(250, 15, 'exclusive')).toBeCloseTo(37.5);
    expect(calculateLineTax(0, 10, 'exclusive')).toBe(0);
  });

  it('calculates inclusive tax correctly', () => {
    expect(calculateLineTax(110, 10, 'inclusive')).toBeCloseTo(10);
    expect(calculateLineTax(115, 15, 'inclusive')).toBeCloseTo(15);
  });

  it('handles zero tax rate', () => {
    expect(calculateLineTax(100, 0, 'exclusive')).toBe(0);
    expect(calculateLineTax(100, 0, 'inclusive')).toBe(0);
  });
});

// ============================================================
// Invoice Totals Tests
// ============================================================

describe('Invoice Totals Calculation', () => {
  interface Line {
    quantity: number;
    unit_price: number;
    tax_amount: number;
    is_discount: boolean;
  }

  const calculateTotals = (lines: Line[]) => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    for (const line of lines) {
      const lineAmount = line.quantity * line.unit_price;
      if (line.is_discount) {
        discountTotal += Math.abs(lineAmount);
      } else {
        subtotal += lineAmount;
      }
      taxTotal += line.tax_amount;
    }

    return {
      subtotal,
      taxTotal,
      discountTotal,
      total: subtotal - discountTotal + taxTotal,
    };
  };

  it('calculates simple invoice totals', () => {
    const result = calculateTotals([
      { quantity: 1, unit_price: 100, tax_amount: 10, is_discount: false },
      { quantity: 2, unit_price: 50, tax_amount: 10, is_discount: false },
    ]);
    expect(result.subtotal).toBe(200);
    expect(result.taxTotal).toBe(20);
    expect(result.total).toBe(220);
  });

  it('handles discounts correctly', () => {
    const result = calculateTotals([
      { quantity: 1, unit_price: 1000, tax_amount: 100, is_discount: false },
      { quantity: 1, unit_price: -200, tax_amount: 0, is_discount: true },
    ]);
    expect(result.subtotal).toBe(1000);
    expect(result.discountTotal).toBe(200);
    expect(result.total).toBe(900);
  });

  it('handles empty lines', () => {
    const result = calculateTotals([]);
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });
});

// ============================================================
// Payment Application Tests
// ============================================================

describe('Payment Application', () => {
  const applyPayment = (totalPayment: number, fees: { id: string; due: number }[]) => {
    let remaining = totalPayment;
    const allocations: { id: string; applied: number }[] = [];

    for (const fee of fees) {
      const applied = Math.min(remaining, fee.due);
      allocations.push({ id: fee.id, applied });
      remaining -= applied;
      if (remaining <= 0) break;
    }

    return { allocations, remaining };
  };

  it('applies payment across multiple fees', () => {
    const result = applyPayment(150, [
      { id: 'fee1', due: 100 },
      { id: 'fee2', due: 100 },
    ]);
    expect(result.allocations[0].applied).toBe(100);
    expect(result.allocations[1].applied).toBe(50);
    expect(result.remaining).toBe(0);
  });

  it('handles overpayment', () => {
    const result = applyPayment(300, [
      { id: 'fee1', due: 100 },
      { id: 'fee2', due: 100 },
    ]);
    expect(result.remaining).toBe(100);
  });

  it('handles underpayment', () => {
    const result = applyPayment(50, [
      { id: 'fee1', due: 100 },
      { id: 'fee2', due: 100 },
    ]);
    expect(result.allocations[0].applied).toBe(50);
    expect(result.allocations.length).toBe(1);
    expect(result.remaining).toBe(0);
  });
});

// ============================================================
// Income Sharing Tests
// ============================================================

describe('Income Sharing Calculations', () => {
  const calculateSharing = (
    amount: number,
    taxMode: 'inclusive' | 'exclusive',
    taxRate: number
  ) => {
    let taxAmount: number;
    let totalAmount: number;

    if (taxMode === 'inclusive') {
      taxAmount = amount - (amount / (1 + taxRate / 100));
      totalAmount = amount;
    } else {
      taxAmount = amount * (taxRate / 100);
      totalAmount = amount + taxAmount;
    }

    return { sharingAmount: amount, taxAmount, totalAmount };
  };

  it('calculates exclusive sharing correctly', () => {
    const result = calculateSharing(1000, 'exclusive', 10);
    expect(result.sharingAmount).toBe(1000);
    expect(result.taxAmount).toBeCloseTo(100);
    expect(result.totalAmount).toBeCloseTo(1100);
  });

  it('calculates inclusive sharing correctly', () => {
    const result = calculateSharing(1100, 'inclusive', 10);
    expect(result.sharingAmount).toBe(1100);
    expect(result.taxAmount).toBeCloseTo(100);
    expect(result.totalAmount).toBeCloseTo(1100);
  });
});

// ============================================================
// Invoice Number Generation Tests
// ============================================================

describe('Invoice Number Generation', () => {
  const generateInvoiceNumber = (lastNumber: string | null) => {
    if (!lastNumber) return 'INV-0001';
    const num = parseInt(lastNumber.replace(/\D/g, '')) || 0;
    return `INV-${String(num + 1).padStart(4, '0')}`;
  };

  it('generates first invoice number', () => {
    expect(generateInvoiceNumber(null)).toBe('INV-0001');
  });

  it('increments from last number', () => {
    expect(generateInvoiceNumber('INV-0005')).toBe('INV-0006');
    expect(generateInvoiceNumber('INV-0099')).toBe('INV-0100');
    expect(generateInvoiceNumber('INV-9999')).toBe('INV-10000');
  });

  it('handles non-standard formats', () => {
    expect(generateInvoiceNumber('ABC-123')).toBe('INV-0124');
  });
});
