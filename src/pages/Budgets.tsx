import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Category } from '../types'
import { useApp } from '../store/AppContext'
import { budgetStatuses } from '../lib/analytics'
import { formatCurrency, currencySymbol } from '../lib/format'
import { CategoryIcon } from '../components/CategoryIcon'
import { ProgressBar } from '../components/ProgressBar'
import { Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'

export function Budgets() {
  const { data, dispatch } = useApp()
  const { currency } = data.settings
  const now = new Date()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)

  const statuses = useMemo(
    () => budgetStatuses(data.budgets, data.transactions, data.categories, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.budgets, data.transactions, data.categories],
  )

  const totals = useMemo(() => {
    const limit = statuses.reduce((a, s) => a + s.limit, 0)
    const spent = statuses.reduce((a, s) => a + s.spent, 0)
    return { limit, spent, remaining: limit - spent, progress: limit > 0 ? (spent / limit) * 100 : 0 }
  }, [statuses])

  const expenseCategories = useMemo(
    () => data.categories.filter((c) => c.type === 'expense'),
    [data.categories],
  )

  const openNew = () => {
    setEditingCategory(null)
    setModalOpen(true)
  }
  const openEdit = (categoryId: string) => {
    setEditingCategory(categoryId)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 to-violet-600 p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Total budget · {format(now, 'MMMM')}</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight">
                {formatCurrency(totals.spent, currency)}
                <span className="text-lg font-semibold text-white/70"> / {formatCurrency(totals.limit, currency)}</span>
              </p>
            </div>
            <button onClick={openNew} className="btn bg-white/15 text-white hover:bg-white/25">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New budget</span>
            </button>
          </div>
          <div className="mt-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${Math.min(100, totals.progress)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs font-medium text-white/80">
              <span>{totals.progress.toFixed(0)}% used</span>
              <span>{formatCurrency(Math.max(0, totals.remaining), currency)} remaining</span>
            </div>
          </div>
        </div>
      </div>

      {statuses.length === 0 ? (
        <EmptyState
          icon={<Target className="h-7 w-7" />}
          title="No budgets yet"
          description="Set monthly spending limits per category to stay on track. We'll warn you as you approach each limit."
          action={
            <button onClick={openNew} className="btn-primary">
              <Plus className="h-4 w-4" />
              Create a budget
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {statuses.map((s) => {
            const barColor =
              s.status === 'over' ? '#ef4444' : s.status === 'warning' ? '#f59e0b' : s.category?.color ?? '#6366f1'
            return (
              <div key={s.budget.id} className="card group p-4">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${s.category?.color}22`, color: s.category?.color }}
                  >
                    <CategoryIcon icon={s.category?.icon ?? 'receipt'} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {s.category?.name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(s.limit, currency)} / month
                    </p>
                  </div>
                  <div className="flex opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => openEdit(s.budget.categoryId)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                      aria-label="Edit budget"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'DELETE_BUDGET', payload: s.budget.id })}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                      aria-label="Delete budget"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(s.spent, currency)}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        s.status === 'over'
                          ? 'text-rose-600 dark:text-rose-400'
                          : s.status === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {s.remaining >= 0
                        ? `${formatCurrency(s.remaining, currency)} left`
                        : `${formatCurrency(Math.abs(s.remaining), currency)} over`}
                    </span>
                  </div>
                  <ProgressBar value={s.progress} color={barColor} />
                  <p className="mt-1.5 text-xs text-slate-400">{s.progress.toFixed(0)}% of budget used</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BudgetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={expenseCategories}
        budgetedIds={new Set(data.budgets.map((b) => b.categoryId))}
        editingCategory={editingCategory}
        existingAmount={
          editingCategory ? data.budgets.find((b) => b.categoryId === editingCategory)?.amount ?? 0 : 0
        }
        onSave={(categoryId, amount) => {
          dispatch({ type: 'UPSERT_BUDGET', payload: { categoryId, amount } })
          setModalOpen(false)
        }}
        currency={currency}
      />
    </div>
  )
}

function BudgetModal({
  open,
  onClose,
  categories,
  budgetedIds,
  editingCategory,
  existingAmount,
  onSave,
  currency,
}: {
  open: boolean
  onClose: () => void
  categories: Category[]
  budgetedIds: Set<string>
  editingCategory: string | null
  existingAmount: number
  onSave: (categoryId: string, amount: number) => void
  currency: string
}) {
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const isEditing = !!editingCategory

  // Initialize when opened
  useEffect(() => {
    if (open) {
      if (editingCategory) {
        setCategoryId(editingCategory)
        setAmount(existingAmount ? String(existingAmount) : '')
      } else {
        const firstAvailable = categories.find((c) => !budgetedIds.has(c.id))
        setCategoryId(firstAvailable?.id ?? categories[0]?.id ?? '')
        setAmount('')
      }
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const available = categories.filter((c) => !budgetedIds.has(c.id) || c.id === editingCategory)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0 || Number.isNaN(parsed)) {
      setError('Enter a monthly limit greater than zero.')
      return
    }
    if (!categoryId) {
      setError('Choose a category.')
      return
    }
    onSave(categoryId, Math.round(parsed * 100) / 100)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit budget' : 'New budget'}
      description={isEditing ? 'Update the monthly limit.' : 'Set a monthly spending limit for a category.'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {available.map((c) => {
              const active = categoryId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={isEditing}
                  onClick={() => setCategoryId(c.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition disabled:opacity-100 ${
                    active
                      ? 'border-transparent'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                  style={active ? { boxShadow: `0 0 0 2px ${c.color}` } : undefined}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${c.color}22`, color: c.color }}
                  >
                    <CategoryIcon icon={c.icon} className="h-4 w-4" />
                  </span>
                  <span className="line-clamp-1 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    {c.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="limit">
            Monthly limit
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              {currencySymbol(currency)}
            </span>
            <input
              id="limit"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input pl-8 text-lg font-semibold"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {isEditing ? 'Save' : 'Create budget'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
