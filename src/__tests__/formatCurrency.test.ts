/**
 * formatCurrency unit tests
 * Validates: Requirement 15.4
 */

import { formatCurrency } from '../utils/formatCurrency';

describe('formatCurrency — boundary values', () => {
  it('returns plain string for values below 1,000', () => {
    expect(formatCurrency(999)).toBe('999');
    expect(formatCurrency(0)).toBe('0');
    expect(formatCurrency(1)).toBe('1');
    expect(formatCurrency(500)).toBe('500');
  });

  it('formats exactly 1,000 as "1K"', () => {
    expect(formatCurrency(1000)).toBe('1K');
  });

  it('formats 1,500 as "1.5K"', () => {
    expect(formatCurrency(1500)).toBe('1.5K');
  });

  it('formats exactly 1,000,000 as "1M"', () => {
    expect(formatCurrency(1_000_000)).toBe('1M');
  });

  it('formats 1,500,000 as "1.5M"', () => {
    expect(formatCurrency(1_500_000)).toBe('1.5M');
  });

  it('formats 2,500 as "2.5K"', () => {
    expect(formatCurrency(2500)).toBe('2.5K');
  });
});

describe('formatCurrency — negative values', () => {
  it('prefixes negative values with "-"', () => {
    expect(formatCurrency(-2500)).toBe('-2.5K');
    expect(formatCurrency(-1_000_000)).toBe('-1M');
    expect(formatCurrency(-500)).toBe('-500');
  });
});

describe('formatCurrency — suffix invariant', () => {
  it('uses M suffix and not K for values >= 1,000,000', () => {
    const result = formatCurrency(2_000_000);
    expect(result).toContain('M');
    expect(result).not.toContain('K');
  });

  it('uses K suffix and not M for 1,000 <= value < 1,000,000', () => {
    const result = formatCurrency(50_000);
    expect(result).toContain('K');
    expect(result).not.toContain('M');
  });

  it('uses neither K nor M for values < 1,000', () => {
    const result = formatCurrency(999);
    expect(result).not.toContain('K');
    expect(result).not.toContain('M');
  });
});
