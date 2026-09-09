import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useCurrency } from '../hooks/useCurrency'
import { useToast } from '../components/Toast'
import { CategoryIcon } from '../components/CategoryIcon'
import { Modal } from '../components/Modal'
import { ProgressBar, EmptyState } from '../components/ui'
import { useConfirm } from '../components/ConfirmDialog'
import { budgetStatuses } from '../utils/analytics'
import { monthLabel } from '../utils/format'
import type { Budget } from '../types'

export function Budgets({ month }: { month: string }) {
  const { data, addBudget, updateBudget, deleteBudget } = useApp()
  const money = useCurrency()
  const { notify } = useToast()
  const { dialog, confirm } = useConfirm()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const statuses = useMemo(() => budgetStatuses(data, month), [data, month])

  const totals = useMemo(() => {
    const budgeted = statuses.reduce((a, s) => a + s.budget.amount, 0)
    const spent = statuses.reduce((a, s) => a + s.spent, 0)
    return { budgeted, spent, remaining: budgeted - spent }
  }, [statuses])

  const expenseCategories = data.categories.filter((c) => c.type === 'expense')
  const availableCategories = expenseCategories.filter(
    (c) => !data.budgets.some((b) => b.categoryId === c.id) || c.id === editing?.categoryId,
  )

  const openAdd = () => {
    setEditing(null)
    setCategoryId(availableCategories[0]?.id ?? '')
    setAmount('')
    setError('')
    setModalOpen(true)
  }

  const openEdit = (b: Budget) => {
    setEditing(b)
    setCategoryId(b.categoryId)
    setAmount(String(b.amount))
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!value || value <= 0) {
      setError('Enter a limit greater than 0.')
      return
    }
    if (!categoryId) {
      setError('Choose a category.')
      return
    }
    if (editing) {
      updateBudget(editing.id, Math.round(value * 100) / 100, categoryId)
      notify('Budget updated')
    } else {
      addBudget({ categoryId, amount: Math.round(value * 100) / 100 })
      notify('Budget created')
    }
    setModalOpen(false)
    setEditing(null)
  }

  const handleDelete = (b: Budget) => {
    const cat = data.categories.find((c) => c.id === b.categoryId)
    confirm({
      title: 'Delete budget?',
      message: `Remove the budget for ${cat?.name ?? 'this category'}? Your transactions won't be affected.`,
      onConfirm: () => {
        deleteBudget(b.id)
        notify('Budget deleted', 'info')
      },
    })
  }

  const overallPct = totals.budgeted > 0 ? (totals.spent / totals.budgeted) * 100 : 0

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-slate-800">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-400">Total Budgeted</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{money(totals.budgeted)}</p>
            <p className="mt-0.5 text-xs text-slate-400">{monthLabel(month)}</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-400">Spent</p>
            <p className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">{money(totals.spent)}</p>
            <p className="mt-0.5 text-xs text-slate-400">{overallPct.toFixed(0)}% of budget used</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-400">Remaining</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                totals.remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {money(totals.remaining)}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {totals.remaining >= 0 ? 'Available to spend' : 'Over budget'}
            </p>
          </div>
        </div>
        {totals.budgeted > 0 && (
          <div className="px-5 pb-5">
            <ProgressBar value={overallPct} color={overallPct >= 100 ? '#f43f5e' : overallPct >= 80 ? '#f59e0b' : '#1b6ff5'} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Category Budgets</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monthly spending limits per category</p>
        </div>
        <button className="btn-primary" onClick={openAdd} disabled={availableCategories.length === 0 && !editing}>
          <Plus className="h-4 w-4" /> New budget
        </button>
      </div>

      {statuses.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No budgets set"
          description="Create a budget for a category to track how much you spend against a monthly limit."
          action={
            <button className="btn-primary" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Create your first budget
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {statuses.map((s) => (
            <div key={s.budget.id} className="card group p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${s.category?.color}20`, color: s.category?.color }}
                  >
                    <CategoryIcon name={s.category?.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {s.category?.name ?? 'Uncategorized'}
                    </p>
                    <p className="text-xs text-slate-400">Limit {money(s.budget.amount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(s.budget)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                    aria-label="Edit budget"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.budget)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    aria-label="Delete budget"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{money(s.spent)}</span>
                  <span
                    className={`chip ${
                      s.state === 'over'
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                        : s.state === 'warning'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                    }`}
                  >
                    {s.state === 'over' ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {s.percent.toFixed(0)}%
                  </span>
                </div>
                <ProgressBar
                  value={s.percent}
                  color={s.state === 'over' ? '#f43f5e' : s.state === 'warning' ? '#f59e0b' : s.category?.color}
                />
                <p className="mt-2 text-xs text-slate-400">
                  {s.remaining >= 0
                    ? `${money(s.remaining)} left this month`
                    : `${money(Math.abs(s.remaining))} over budget`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit budget' : 'New budget'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="budget-cat">
              Category
            </label>
            <select
              id="budget-cat"
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={!!editing}
            >
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="budget-amount">
              Monthly limit
            </label>
            <input
              id="budget-amount"
              className="input text-lg font-semibold"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              autoFocus
              onChange={(e) => {
                setError('')
                setAmount(e.target.value.replace(/[^0-9.]/g, ''))
              }}
            />
          </div>
          {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing ? 'Save' : 'Create budget'}
            </button>
          </div>
        </form>
      </Modal>

      {dialog}
    </div>
  )
}
