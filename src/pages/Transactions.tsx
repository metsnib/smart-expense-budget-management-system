import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Filter, Plus, Receipt, Search, X } from 'lucide-react'
import type { Transaction, TransactionType } from '../types'
import { useApp } from '../store/AppContext'
import { formatCurrency } from '../lib/format'
import { TransactionRow } from '../components/TransactionRow'
import { TransactionModal } from '../components/TransactionModal'
import { EmptyState } from '../components/EmptyState'

type TypeFilter = 'all' | TransactionType

export function Transactions({ onAdd }: { onAdd: () => void }) {
  const { data } = useApp()
  const { currency } = data.settings
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.transactions
      .filter((t) => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false
        if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false
        if (q) {
          const cat = data.categories.find((c) => c.id === t.categoryId)
          const hay = `${t.note} ${cat?.name ?? ''} ${t.account}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt),
      )
  }, [data.transactions, data.categories, search, typeFilter, categoryFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const arr = map.get(t.date) ?? []
      arr.push(t)
      map.set(t.date, arr)
    }
    return [...map.entries()]
  }, [filtered])

  const filteredTotals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of filtered) {
      if (t.type === 'income') income += t.amount
      else expense += t.amount
    }
    return { income, expense }
  }, [filtered])

  const activeFilters = (typeFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0)

  if (data.transactions.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-7 w-7" />}
        title="No transactions yet"
        description="Add income and expenses to see them listed and grouped here."
        action={
          <button onClick={onAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add transaction
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Search + filter toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, categories…"
            className="input pl-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`btn-secondary relative ${showFilters ? 'ring-2 ring-brand-500/40' : ''}`}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilters > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="card animate-fade-in space-y-4 p-4">
          <div>
            <p className="label">Type</p>
            <div className="flex flex-wrap gap-2">
              {(['all', 'expense', 'income'] as TypeFilter[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`chip capitalize ${
                    typeFilter === t
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label">Category</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`chip ${
                  categoryFilter === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {data.categories
                .filter((c) => (typeFilter === 'all' ? true : c.type === typeFilter))
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryFilter(c.id)}
                    className="chip"
                    style={
                      categoryFilter === c.id
                        ? { backgroundColor: c.color, color: '#fff' }
                        : { backgroundColor: `${c.color}1f`, color: c.color }
                    }
                  >
                    {c.name}
                  </button>
                ))}
            </div>
          </div>
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setTypeFilter('all')
                setCategoryFilter('all')
              }}
              className="btn-ghost text-xs text-brand-600"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryPill label="Transactions" value={String(filtered.length)} tone="slate" />
        <SummaryPill label="Income" value={formatCurrency(filteredTotals.income, currency, { compact: true })} tone="emerald" />
        <SummaryPill label="Expenses" value={formatCurrency(filteredTotals.expense, currency, { compact: true })} tone="rose" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-7 w-7" />}
          title="No matches"
          description="Try adjusting your search or filters to find what you're looking for."
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, txns]) => {
            const dayTotal = txns.reduce(
              (acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount),
              0,
            )
            return (
              <div key={date}>
                <div className="mb-1 flex items-center justify-between px-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {format(parseISO(date), 'EEEE, MMM d')}
                  </p>
                  <p
                    className={`text-xs font-semibold tabular-nums ${
                      dayTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {formatCurrency(dayTotal, currency, { showSign: true })}
                  </p>
                </div>
                <div className="card divide-y divide-slate-100 p-2 dark:divide-slate-800/70">
                  {txns.map((t) => (
                    <TransactionRow
                      key={t.id}
                      txn={t}
                      category={data.categories.find((c) => c.id === t.categoryId)}
                      currency={currency}
                      onClick={() => setEditing(t)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TransactionModal open={!!editing} onClose={() => setEditing(null)} editing={editing} />
    </div>
  )
}

const PILL_TONES = {
  slate: 'text-slate-900 dark:text-white',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  rose: 'text-rose-600 dark:text-rose-400',
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: keyof typeof PILL_TONES
}) {
  return (
    <div className="card px-3 py-2.5 text-center">
      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`truncate text-base font-bold tabular-nums ${PILL_TONES[tone]}`}>{value}</p>
    </div>
  )
}
