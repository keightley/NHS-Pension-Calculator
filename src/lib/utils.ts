const DAYS_IN_YEAR = 365.25;

/** Calculate exact age in years between two dates */
export function yearsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return ms / (DAYS_IN_YEAR * 24 * 60 * 60 * 1000);
}

/** Get age as years and completed months */
export function ageInYearsAndMonths(dob: Date, atDate: Date): { years: number; months: number } {
  let years = atDate.getFullYear() - dob.getFullYear();
  let months = atDate.getMonth() - dob.getMonth();
  if (atDate.getDate() < dob.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  return { years, months };
}

/** Days between two dates */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/** Parse ISO date string to Date (local timezone) */
export function parseDate(isoStr: string): Date {
  if (!isoStr) return new Date();
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format date for display */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format currency (GBP) */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/** Get the start of the current scheme year (1 April) */
export function schemeYearStart(date: Date): Date {
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return new Date(year, 3, 1); // 1 April
}

/** Get scheme year number from a date */
export function schemeYear(date: Date): number {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Round to nearest penny then to nearest pound */
export function roundPound(value: number): number {
  return Math.round(value);
}

/** Convert real (today's money) to nominal (future money) */
export function realToNominal(realValue: number, cpiPercent: number, years: number): number {
  return realValue * Math.pow(1 + cpiPercent / 100, years);
}

/** Convert nominal to real */
export function nominalToReal(nominalValue: number, cpiPercent: number, years: number): number {
  return nominalValue / Math.pow(1 + cpiPercent / 100, years);
}

/** Generate a unique ID */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
