import { useEffect, useMemo, useState } from 'react'
import type { Transaction, TransactionType } from '../types'
import { useApp } from '../store/AppContext'
import { todayISO } from '../utils/format'
import { CategoryIcon } from './CategoryIcon'

interface Props {
  initial?: Transaction | null
  onSubmit: (payload: Omit<Transaction, 'id' | 'createdAt'>) => void
  onCancel: () => void
}

export function TransactionForm({ initial, onSubmit, onCancel }: Props) {
  const { data } = useApp()
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? '')
  const [note, setNote] = useState<string>(initial?.note ?? '')
  const [date, setDate] = useState<string>(initial?.date ?? todayISO())
  const [error, setError] = useState<string>('')

  const categories = useMemo(
    () => data.categories.filter((c) => c.type === type),
    [data.categories, type],
  )

  // Ensure a valid category is selected when type changes
  useEffect(() => {
    if (!categories.find((c) => c.id === categoryId)) {
      setCategoryId(categories[0]?.id ?? '')
    }
  }, [categories, categoryId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!value || value <= 0 || Number.isNaN(value)) {
      setError('Enter an amount greater than 0.')
      return
    }
    if (!categoryId) {
      setError('Pick a category.')
      return
    }
    onSubmit({
      type,
      amount: Math.round(value * 100) / 100,
      categoryId,
      note: note.trim(),
      date,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {(['expense', 'income'] as TransactionType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${
              type === t
                ? t === 'expense'
                  ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-900'
                  : 'bg-white text-emerald-600 shadow-sm dark:bg-slate-900'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="amount">
          Amount
        </label>
        <input
          id="amount"
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

      <div>
        <span className="label">Category</span>
        <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {categories.map((c) => {
            const active = c.id === categoryId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoryId(c.id)
                  setError('')
                }}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition ${
                  active
                    ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                }`}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${c.color}20`, color: c.color }}
                >
                  <CategoryIcon name={c.icon} className="h-4 w-4" />
                </span>
                <span className="line-clamp-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  {c.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            className="input"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="note">
            Note
          </label>
          <input
            id="note"
            className="input"
            placeholder="Optional description"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm font-medium text-rose-500">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {initial ? 'Save changes' : 'Add transaction'}
        </button>
      </div>
    </form>
  )
}
