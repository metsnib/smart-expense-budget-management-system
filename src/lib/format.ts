import { findCurrency } from './currencies'

export function formatCurrency(
  amount: number,
  currency: string,
  opts: { compact?: boolean; showSign?: boolean } = {},
): string {
  const cur = findCurrency(currency)
  const { compact = false, showSign = false } = opts
  const abs = Math.abs(amount)

  const formatter = new Intl.NumberFormat(cur.locale, {
    style: 'currency',
    currency: cur.code,
    notation: compact && abs >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: currency === 'JPY' ? 0 : abs >= 10000 && compact ? 1 : 2,
    minimumFractionDigits: compact && abs >= 10000 ? 0 : currency === 'JPY' ? 0 : 2,
  })

  let out: string
  try {
    out = formatter.format(abs)
  } catch {
    out = `${cur.symbol}${abs.toFixed(2)}`
  }

  if (showSign) {
    return `${amount < 0 ? '-' : '+'}${out}`
  }
  return amount < 0 ? `-${out}` : out
}

export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`
}

export function currencySymbol(currency: string): string {
  return findCurrency(currency).symbol
}
