import { useMemo, useState } from 'react'
import { Search, Plus, Pencil, Trash2, Filter, ArrowDownUp, Download } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useCurrency } from '../hooks/useCurrency'
import { useToast } from '../components/Toast'
import { CategoryIcon } from '../components/CategoryIcon'
import { Modal } from '../components/Modal'
import { TransactionForm } from '../components/TransactionForm'
import { EmptyState } from '../components/ui'
import { useConfirm } from '../components/ConfirmDialog'
import { formatDate } from '../utils/format'
import { exportTransactionsCsv } from '../utils/exporters'
import type { Transaction, TransactionType } from '../types'

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

export function Transactions({ month }: { month: string }) {
  const { data, addTransaction, updateTransaction, deleteTransaction, getCategory } = useApp()
  const money = useCurrency()
  const { notify } = useToast()
  const { dialog, confirm } = useConfirm()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [scope, setScope] = useState<'month' | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('date-desc')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const filtered = useMemo(() => {
    let list = [...data.transactions]
    if (scope === 'month') list = list.filter((t) => t.date.slice(0, 7) === month)
    if (typeFilter !== 'all') list = list.filter((t) => t.type === typeFilter)
    if (categoryFilter !== 'all') list = list.filter((t) => t.categoryId === categoryFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) => {
        const cat = getCategory(t.categoryId)
        return (
          t.note.toLowerCase().includes(q) ||
          (cat?.name.toLowerCase().includes(q) ?? false) ||
          String(t.amount).includes(q)
        )
      })
    }
    list.sort((a, b) => {
      switch (sort) {
        case 'date-asc':
          return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
        case 'amount-desc':
          return b.amount - a.amount
        case 'amount-asc':
          return a.amount - b.amount
        default:
          return a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1
      }
    })
    return list
  }, [data.transactions, scope, month, typeFilter, categoryFilter, search, sort, getCategory])

  const totals = useMemo(() => {
    const income = filtered.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
    const expense = filtered.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
    return { income, expense, net: income - expense }
  }, [filtered])

  // group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const arr = map.get(t.date) ?? []
      arr.push(t)
      map.set(t.date, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (t: Transaction) => {
    setEditing(t)
    setModalOpen(true)
  }

  const handleSubmit = (payload: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editing) {
      updateTransaction({ ...editing, ...payload })
      notify('Transaction updated')
    } else {
      addTransaction(payload)
      notify('Transaction added')
    }
    setModalOpen(false)
    setEditing(null)
  }

  const handleDelete = (t: Transaction) => {
    confirm({
      title: 'Delete transaction?',
      message: `This will permanently remove "${t.note || getCategory(t.categoryId)?.name || 'this transaction'}".`,
      onConfirm: () => {
        deleteTransaction(t.id)
        notify('Transaction deleted', 'info')
      },
    })
  }

  const handleExport = () => {
    exportTransactionsCsv(filtered, data.categories)
    notify('Exported CSV')
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by note, category, or amount…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              {(['all', 'month'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`px-3 py-2 text-sm font-medium capitalize transition ${
                    scope === s
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {s === 'all' ? 'All time' : 'This month'}
                </button>
              ))}
            </div>
            <button className="btn-secondary" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </button>
            <button className="btn-primary" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Filter className="h-3.5 w-3.5" /> Filters
          </span>
          <select
            className="input h-9 w-auto py-1 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          >
            <option value="all">All types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
          <select
            className="input h-9 w-auto py-1 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="relative inline-flex items-center">
            <ArrowDownUp className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
            <select
              className="input h-9 w-auto py-1 pl-8 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-400">Income</p>
          <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{money(totals.income)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-400">Expenses</p>
          <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">{money(totals.expense)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-400">Net</p>
          <p
            className={`mt-1 text-lg font-bold ${
              totals.net >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {money(totals.net)}
          </p>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="No transactions found"
          description="Try adjusting your filters or add a new transaction."
          action={
            <button className="btn-primary" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add transaction
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, items]) => {
            const dayTotal = items.reduce(
              (acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount),
              0,
            )
            return (
              <div key={date} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {formatDate(date, 'EEEE, MMM d')}
                  </span>
                  <span className={`text-sm font-medium ${dayTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {dayTotal >= 0 ? '+' : '−'}
                    {money(Math.abs(dayTotal))}
                  </span>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((t) => {
                    const cat = getCategory(t.categoryId)
                    return (
                      <li key={t.id} className="group flex items-center gap-3 px-4 py-3">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${cat?.color ?? '#94a3b8'}20`, color: cat?.color ?? '#94a3b8' }}
                        >
                          <CategoryIcon name={cat?.icon} className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                            {t.note || cat?.name || 'Transaction'}
                          </p>
                          <p className="text-xs text-slate-400">{cat?.name ?? 'Uncategorized'}</p>
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            t.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {t.type === 'income' ? '+' : '−'}
                          {money(t.amount)}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={() => openEdit(t)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Edit transaction' : 'Add transaction'}
      >
        <TransactionForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setModalOpen(false)
            setEditing(null)
          }}
        />
      </Modal>

      {dialog}
    </div>
  )
}
