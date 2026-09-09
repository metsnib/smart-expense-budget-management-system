import { useState } from 'react'
import { Plus, Pencil, Trash2, Target, PiggyBank, Minus, PartyPopper } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useCurrency } from '../hooks/useCurrency'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { ProgressBar, EmptyState } from '../components/ui'
import { useConfirm } from '../components/ConfirmDialog'
import { CATEGORY_COLOR_CHOICES } from '../data/categories'
import { clamp } from '../utils/format'
import type { SavingsGoal } from '../types'

export function Goals() {
  const { data, addGoal, updateGoal, deleteGoal, contributeGoal } = useApp()
  const money = useCurrency()
  const { notify } = useToast()
  const { dialog, confirm } = useConfirm()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [color, setColor] = useState(CATEGORY_COLOR_CHOICES[5])
  const [error, setError] = useState('')

  const [contribOpen, setContribOpen] = useState(false)
  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null)
  const [contribAmount, setContribAmount] = useState('')
  const [contribMode, setContribMode] = useState<'add' | 'withdraw'>('add')

  const openAdd = () => {
    setEditing(null)
    setName('')
    setTarget('')
    setSaved('')
    setColor(CATEGORY_COLOR_CHOICES[Math.floor(Math.random() * CATEGORY_COLOR_CHOICES.length)])
    setError('')
    setModalOpen(true)
  }

  const openEdit = (g: SavingsGoal) => {
    setEditing(g)
    setName(g.name)
    setTarget(String(g.target))
    setSaved(String(g.saved))
    setColor(g.color)
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = parseFloat(target)
    const s = parseFloat(saved || '0')
    if (!name.trim()) {
      setError('Give your goal a name.')
      return
    }
    if (!t || t <= 0) {
      setError('Target must be greater than 0.')
      return
    }
    if (editing) {
      updateGoal({ ...editing, name: name.trim(), target: t, saved: Math.max(0, s), color })
      notify('Goal updated')
    } else {
      addGoal({ name: name.trim(), target: t, saved: Math.max(0, s), color })
      notify('Goal created')
    }
    setModalOpen(false)
  }

  const openContribute = (g: SavingsGoal, mode: 'add' | 'withdraw') => {
    setContribGoal(g)
    setContribMode(mode)
    setContribAmount('')
    setContribOpen(true)
  }

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contribGoal) return
    const value = parseFloat(contribAmount)
    if (!value || value <= 0) return
    const signed = contribMode === 'add' ? value : -value
    contributeGoal(contribGoal.id, signed)
    notify(contribMode === 'add' ? `Added ${money(value)} to ${contribGoal.name}` : `Withdrew ${money(value)}`)
    setContribOpen(false)
  }

  const handleDelete = (g: SavingsGoal) => {
    confirm({
      title: 'Delete goal?',
      message: `Remove "${g.name}"? This can't be undone.`,
      onConfirm: () => {
        deleteGoal(g.id)
        notify('Goal deleted', 'info')
      },
    })
  }

  const totalSaved = data.goals.reduce((a, g) => a + g.saved, 0)
  const totalTarget = data.goals.reduce((a, g) => a + g.target, 0)

  return (
    <div className="space-y-5">
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
            <PiggyBank className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-400">Total saved across goals</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {money(totalSaved)}{' '}
              <span className="text-base font-medium text-slate-400">/ {money(totalTarget)}</span>
            </p>
          </div>
        </div>
        <button className="btn-primary self-start sm:self-auto" onClick={openAdd}>
          <Plus className="h-4 w-4" /> New goal
        </button>
      </div>

      {data.goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title="No savings goals yet"
          description="Set a target for things you're saving toward — an emergency fund, a trip, or a big purchase."
          action={
            <button className="btn-primary" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Create a goal
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.goals.map((g) => {
            const pct = g.target > 0 ? clamp((g.saved / g.target) * 100, 0, 100) : 0
            const done = g.saved >= g.target
            return (
              <div key={g.id} className="card group flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${g.color}20`, color: g.color }}
                  >
                    {done ? <PartyPopper className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => openEdit(g)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                      aria-label="Edit goal"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(g)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 font-semibold text-slate-800 dark:text-slate-100">{g.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {money(g.saved)} of {money(g.target)}
                </p>

                <div className="mt-3">
                  <ProgressBar value={pct} color={g.color} />
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500 dark:text-slate-400">{pct.toFixed(0)}%</span>
                    <span className={done ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                      {done ? 'Goal reached! 🎉' : `${money(g.target - g.saved)} to go`}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary flex-1 py-2" onClick={() => openContribute(g, 'add')}>
                    <Plus className="h-4 w-4" /> Add
                  </button>
                  <button
                    className="btn-ghost flex-1 border border-slate-200 py-2 dark:border-slate-700"
                    onClick={() => openContribute(g, 'withdraw')}
                    disabled={g.saved <= 0}
                  >
                    <Minus className="h-4 w-4" /> Withdraw
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit goal' : 'New goal'} maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="goal-name">
              Goal name
            </label>
            <input
              id="goal-name"
              className="input"
              placeholder="e.g. Emergency fund"
              value={name}
              autoFocus
              onChange={(e) => {
                setError('')
                setName(e.target.value)
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="goal-target">
                Target amount
              </label>
              <input
                id="goal-target"
                className="input"
                inputMode="decimal"
                placeholder="0.00"
                value={target}
                onChange={(e) => {
                  setError('')
                  setTarget(e.target.value.replace(/[^0-9.]/g, ''))
                }}
              />
            </div>
            <div>
              <label className="label" htmlFor="goal-saved">
                Already saved
              </label>
              <input
                id="goal-saved"
                className="input"
                inputMode="decimal"
                placeholder="0.00"
                value={saved}
                onChange={(e) => setSaved(e.target.value.replace(/[^0-9.]/g, ''))}
              />
            </div>
          </div>
          <div>
            <span className="label">Color</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLOR_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition ${
                    color === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing ? 'Save' : 'Create goal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Contribute modal */}
      <Modal
        open={contribOpen}
        onClose={() => setContribOpen(false)}
        title={contribMode === 'add' ? `Add to ${contribGoal?.name ?? ''}` : `Withdraw from ${contribGoal?.name ?? ''}`}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleContribute} className="space-y-4">
          <div>
            <label className="label" htmlFor="contrib">
              Amount
            </label>
            <input
              id="contrib"
              className="input text-lg font-semibold"
              inputMode="decimal"
              placeholder="0.00"
              value={contribAmount}
              autoFocus
              onChange={(e) => setContribAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            />
            {contribGoal && (
              <p className="mt-1.5 text-xs text-slate-400">
                Current balance: {money(contribGoal.saved)}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setContribOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={contribMode === 'add' ? 'btn-primary' : 'btn-danger'}>
              {contribMode === 'add' ? 'Add funds' : 'Withdraw'}
            </button>
          </div>
        </form>
      </Modal>

      {dialog}
    </div>
  )
}
