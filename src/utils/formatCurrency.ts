/**
 * formatCurrency
 *
 * Formats a number for compact display:
 *   ≥ 1,000,000  → "{n}M"   (e.g. 1500000 → "1.5M")
 *   ≥ 1,000      → "{n}K"   (e.g. 1500    → "1.5K")
 *   otherwise    → "{n}"    (e.g. 999     → "999")
 *
 * Negative values are prefixed with "-" and the absolute value is formatted.
 *
 * @param value     The numeric value to format
 * @param _currency Optional currency code (reserved for future localisation)
 */
export function formatCurrency(value: number, _currency = 'USD'): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    const n = abs / 1_000_000;
    const formatted = n % 1 === 0 ? n.toString() : n.toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted}M`;
  }

  if (abs >= 1_000) {
    const n = abs / 1_000;
    const formatted = n % 1 === 0 ? n.toString() : n.toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted}K`;
  }

  return `${sign}${abs % 1 === 0 ? abs.toString() : abs.toFixed(2)}`;
}
