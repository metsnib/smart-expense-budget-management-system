import { format, parseISO } from 'date-fns'

export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US',
  opts?: { compact?: boolean; hideCents?: boolean },
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: opts?.compact ? 'compact' : 'standard',
      maximumFractionDigits: opts?.hideCents ? 0 : 2,
      minimumFractionDigits: opts?.hideCents ? 0 : undefined,
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

export function formatNumber(amount: number, locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale).format(amount)
  } catch {
    return String(amount)
  }
}

export function formatDate(iso: string, pattern = 'MMM d, yyyy'): string {
  try {
    return format(parseISO(iso), pattern)
  } catch {
    return iso
  }
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function monthKey(iso: string): string {
  // yyyy-MM
  return iso.slice(0, 7)
}

export function currentMonthKey(): string {
  return format(new Date(), 'yyyy-MM')
}

/** The yyyy-MM key `delta` months away from the given key (negative = past). */
export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return format(d, 'yyyy-MM')
}

export function monthLabel(key: string): string {
  try {
    return format(parseISO(`${key}-01`), 'MMMM yyyy')
  } catch {
    return key
  }
}

export function shortMonthLabel(key: string): string {
  try {
    return format(parseISO(`${key}-01`), 'MMM yy')
  } catch {
    return key
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** List of the last `count` month keys ending at the current month (inclusive). */
export function recentMonthKeys(count: number): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(format(d, 'yyyy-MM'))
  }
  return keys
}

export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CNY', label: 'Chinese Yuan (¥)' },
  { code: 'BRL', label: 'Brazilian Real (R$)' },
  { code: 'ZAR', label: 'South African Rand (R)' },
  { code: 'NGN', label: 'Nigerian Naira (₦)' },
  { code: 'SGD', label: 'Singapore Dollar (S$)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'AED', label: 'UAE Dirham (د.إ)' },
]
