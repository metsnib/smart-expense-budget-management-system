import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import type { Transaction, TransactionType } from '../types'
import { useApp } from '../store/AppContext'
import { Modal } from './Modal'
import { CategoryIcon } from './CategoryIcon'
import { currencySymbol } from '../lib/format'
import { DEFAULT_ACCOUNTS } from '../lib/categories'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Transaction | null
  defaultType?: TransactionType
}

export function TransactionModal({ open, onClose, editing, defaultType = 'expense' }: Props) {
  const { data, dispatch } = useApp()
  const [type, setType] = useState<TransactionType>(defaultType)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')
  const [account, setAccount] = useState(DEFAULT_ACCOUNTS[0])
  const [error, setError] = useState('')

  const categories = useMemo(
    () => data.categories.filter((c) => c.type === type),
    [data.categories, type],
  )

  const accounts = useMemo(() => {
    const set = new Set<string>(DEFAULT_ACCOUNTS)
    data.transactions.forEach((t) => t.account && set.add(t.account))
    return [...set]
  }, [data.transactions])

  useEffect(() => {
    if (!open) return
    if (editing) {
      setType(editing.type)
      setAmount(String(editing.amount))
      setCategoryId(editing.categoryId)
      setDate(editing.date)
      setNote(editing.note)
      setAccount(editing.account)
    } else {
      setType(defaultType)
      setAmount('')
      setCategoryId('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setNote('')
      setAccount(DEFAULT_ACCOUNTS[0])
    }
    setError('')
  }, [open, editing, defaultType])

  // Keep category valid when type flips
  useEffect(() => {
    if (categoryId && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0]?.id ?? '')
    }
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id)
    }
  }, [categories, categoryId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0 || Number.isNaN(parsed)) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!categoryId) {
      setError('Choose a category.')
      return
    }
    const payload = {
      type,
      amount: Math.round(parsed * 100) / 100,
      categoryId,
      date,
      note: note.trim(),
      account,
    }
    if (editing) {
      dispatch({
        type: 'UPDATE_TXN',
        payload: { ...editing, ...payload },
      })
    } else {
      dispatch({ type: 'ADD_TXN', payload })
    }
    onClose()
  }

  const handleDelete = () => {
    if (editing) {
      dispatch({ type: 'DELETE_TXN', payload: editing.id })
      onClose()
    }
  }

  const symbol = currencySymbol(data.settings.currency)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit transaction' : 'Add transaction'}
      description={editing ? 'Update the details below.' : 'Log a new income or expense.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(['expense', 'income'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-lg py-2 text-sm font-semibold capitalize transition ${
                type === t
                  ? t === 'expense'
                    ? 'bg-rose-500 text-white shadow'
                    : 'bg-emerald-500 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
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
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              {symbol}
            </span>
            <input
              id="amount"
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

        <div>
          <label className="label">Category</label>
          <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
            {categories.map((c) => {
              const active = categoryId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition ${
                    active
                      ? 'border-transparent ring-2 ring-offset-1 dark:ring-offset-slate-900'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                  style={active ? { boxShadow: `0 0 0 2px ${c.color}`, borderColor: c.color } : undefined}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${c.color}22`, color: c.color }}
                  >
                    <CategoryIcon icon={c.icon} className="h-5 w-5" />
                  </span>
                  <span className="line-clamp-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {c.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="date">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="account">
              Account
            </label>
            <select
              id="account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="input"
            >
              {accounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="note">
            Note <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Lunch with team"
            className="input"
            maxLength={80}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          {editing && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn-ghost text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
              aria-label="Delete transaction"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing ? 'Save changes' : 'Add transaction'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
