import { format, parseISO } from 'date-fns'
import type { Category, Transaction } from '../types'
import { CategoryIcon } from './CategoryIcon'
import { formatCurrency } from '../lib/format'

export function TransactionRow({
  txn,
  category,
  currency,
  onClick,
}: {
  txn: Transaction
  category: Category | undefined
  currency: string
  onClick?: () => void
}) {
  const color = category?.color ?? '#64748b'
  const isIncome = txn.type === 'income'
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        <CategoryIcon icon={category?.icon ?? 'receipt'} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {category?.name ?? 'Uncategorized'}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {txn.note ? txn.note : txn.account}
          <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
          {format(parseISO(txn.date), 'MMM d')}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-bold tabular-nums ${
            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
          }`}
        >
          {isIncome ? '+' : '−'}
          {formatCurrency(txn.amount, currency)}
        </p>
        <p className="text-[11px] text-slate-400">{txn.account}</p>
      </div>
    </button>
  )
}
