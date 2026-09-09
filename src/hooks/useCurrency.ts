import { useApp } from '../store/AppContext'
import { formatCurrency } from '../utils/format'

/** Returns a currency formatter bound to the user's currency + locale settings. */
export function useCurrency() {
  const { data } = useApp()
  const { currency, locale } = data.settings
  return (amount: number, opts?: { compact?: boolean; hideCents?: boolean }) =>
    formatCurrency(amount, currency, locale, opts)
}
