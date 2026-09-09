import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Database,
  Download,
  Moon,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Sun,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react'
import type { AppData, Category, TransactionType } from '../types'
import { useApp } from '../store/AppContext'
import { CURRENCIES } from '../lib/currencies'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../lib/categories'
import { CategoryIcon } from '../components/CategoryIcon'
import { Modal } from '../components/Modal'

export function Settings() {
  const { data, dispatch } = useApp()
  const { settings } = data
  const fileRef = useRef<HTMLInputElement>(null)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [confirm, setConfirm] = useState<null | 'reset' | 'sample'>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2500)
  }

  const txnCountByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of data.transactions) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1)
    return map
  }, [data.transactions])

  const expenseCats = data.categories.filter((c) => c.type === 'expense')
  const incomeCats = data.categories.filter((c) => c.type === 'income')

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finwise-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Data exported')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData
        if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.categories)) {
          throw new Error('invalid')
        }
        dispatch({ type: 'IMPORT', payload: { ...parsed, onboarded: true } })
        showToast('Data imported successfully')
      } catch {
        showToast('Could not read that file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Preferences */}
      <Section icon={<Wallet className="h-5 w-5" />} title="Preferences" description="Currency, targets and appearance">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => dispatch({ type: 'UPDATE_SETTINGS', payload: { currency: e.target.value } })}
                className="input"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Appearance</label>
              <div className="grid grid-cols-2 gap-2">
                <ThemeButton
                  active={settings.theme === 'light'}
                  onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { theme: 'light' } })}
                  icon={<Sun className="h-4 w-4" />}
                  label="Light"
                />
                <ThemeButton
                  active={settings.theme === 'dark'}
                  onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { theme: 'dark' } })}
                  icon={<Moon className="h-4 w-4" />}
                  label="Dark"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Monthly income target</label>
              <input
                type="number"
                min="0"
                value={settings.monthlyIncomeTarget || ''}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE_SETTINGS', payload: { monthlyIncomeTarget: Number(e.target.value) || 0 } })
                }
                className="input"
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">
                Savings goal — <span className="font-semibold text-brand-600 dark:text-brand-400">{settings.savingsGoalRate}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={settings.savingsGoalRate}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE_SETTINGS', payload: { savingsGoalRate: Number(e.target.value) } })
                }
                className="mt-3 w-full accent-brand-600"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Categories */}
      <Section
        icon={<Palette className="h-5 w-5" />}
        title="Categories"
        description="Organize your income and expenses"
        action={
          <button
            onClick={() => {
              setEditingCat(null)
              setCatModalOpen(true)
            }}
            className="btn-secondary"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        }
      >
        <div className="space-y-5">
          <CategoryGroup
            title="Expenses"
            categories={expenseCats}
            counts={txnCountByCat}
            onEdit={(c) => {
              setEditingCat(c)
              setCatModalOpen(true)
            }}
            onDelete={(c) => dispatch({ type: 'DELETE_CATEGORY', payload: c.id })}
          />
          <CategoryGroup
            title="Income"
            categories={incomeCats}
            counts={txnCountByCat}
            onEdit={(c) => {
              setEditingCat(c)
              setCatModalOpen(true)
            }}
            onDelete={(c) => dispatch({ type: 'DELETE_CATEGORY', payload: c.id })}
          />
        </div>
      </Section>

      {/* Data management */}
      <Section icon={<Database className="h-5 w-5" />} title="Data" description="Backup, restore or reset your data">
        <div className="grid gap-3 sm:grid-cols-2">
          <DataButton icon={<Download className="h-4 w-4" />} label="Export backup" sub="Download a JSON file" onClick={handleExport} />
          <DataButton icon={<Upload className="h-4 w-4" />} label="Import backup" sub="Restore from JSON" onClick={() => fileRef.current?.click()} />
          <DataButton icon={<RefreshCw className="h-4 w-4" />} label="Load sample data" sub="Replace with a demo dataset" onClick={() => setConfirm('sample')} />
          <DataButton
            icon={<Trash2 className="h-4 w-4" />}
            label="Reset everything"
            sub="Delete all transactions & budgets"
            danger
            onClick={() => setConfirm('reset')}
          />
        </div>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
        <p className="mt-4 text-center text-xs text-slate-400">
          FinWise stores everything locally in your browser. Clearing site data will erase your records — export a backup to be safe.
        </p>
      </Section>

      {/* Category modal */}
      <CategoryModal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        editing={editingCat}
        onSave={(cat) => {
          if (editingCat) {
            dispatch({ type: 'UPDATE_CATEGORY', payload: { ...editingCat, ...cat } })
          } else {
            dispatch({ type: 'ADD_CATEGORY', payload: cat })
          }
          setCatModalOpen(false)
        }}
      />

      {/* Confirm modal */}
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'reset' ? 'Reset everything?' : 'Load sample data?'}
        description={
          confirm === 'reset'
            ? 'This permanently deletes all your transactions and budgets. This cannot be undone.'
            : 'This replaces your current data with a demo dataset so you can explore the app.'
        }
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirm(null)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              if (confirm === 'reset') {
                dispatch({ type: 'RESET' })
                showToast('All data cleared')
              } else {
                dispatch({ type: 'LOAD_SAMPLE' })
                showToast('Sample data loaded')
              }
              setConfirm(null)
            }}
            className={confirm === 'reset' ? 'btn-danger' : 'btn-primary'}
          >
            {confirm === 'reset' ? 'Yes, reset' : 'Load sample'}
          </button>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl animate-fade-in lg:bottom-8 dark:bg-white dark:text-slate-900">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
            {toast}
          </span>
        </div>
      )}
    </div>
  )
}

function Section({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="card p-5">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          {icon}
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  )
}

function ThemeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-500/15 dark:text-brand-300'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function DataButton({
  icon,
  label,
  sub,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  sub: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
        danger
          ? 'border-rose-200 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10'
          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          danger
            ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
        }`}
      >
        {icon}
      </span>
      <div>
        <p className={`text-sm font-semibold ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
          {label}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
      </div>
    </button>
  )
}

function CategoryGroup({
  title,
  categories,
  counts,
  onEdit,
  onDelete,
}: {
  title: string
  categories: Category[]
  counts: Map<string, number>
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {categories.map((c) => {
          const count = counts.get(c.id) ?? 0
          return (
            <div
              key={c.id}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${c.color}22`, color: c.color }}>
                <CategoryIcon icon={c.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
                <p className="text-xs text-slate-400">{count} transaction{count === 1 ? '' : 's'}</p>
              </div>
              <div className="flex opacity-0 transition group-hover:opacity-100">
                <button onClick={() => onEdit(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" aria-label="Edit category">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onDelete(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label="Delete category">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CategoryModal({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean
  onClose: () => void
  editing: Category | null
  onSave: (cat: Omit<Category, 'id'>) => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0])
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0])
  const [error, setError] = useState('')

  // Reset form each time it opens
  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setType(editing.type)
      setIcon(editing.icon)
      setColor(editing.color)
    } else {
      setName('')
      setType('expense')
      setIcon(CATEGORY_ICONS[0])
      setColor(CATEGORY_COLORS[0])
    }
    setError('')
  }, [open, editing])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Give the category a name.')
      return
    }
    onSave({ name: name.trim(), type, icon, color })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit category' : 'New category'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(['expense', 'income'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              disabled={!!editing}
              className={`rounded-lg py-2 text-sm font-semibold capitalize transition disabled:opacity-60 ${
                type === t ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white' : 'text-slate-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div>
          <label className="label">Name</label>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}22`, color }}>
              <CategoryIcon icon={icon} className="h-5 w-5" />
            </span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coffee" className="input" maxLength={24} autoFocus />
          </div>
        </div>

        <div>
          <label className="label">Color</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="flex h-7 w-7 items-center justify-center rounded-full transition"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }}
              >
                {color === c && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Icon</label>
          <div className="grid max-h-40 grid-cols-8 gap-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
            {CATEGORY_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`flex h-9 items-center justify-center rounded-lg transition ${
                  icon === ic ? 'text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                style={icon === ic ? { backgroundColor: color } : undefined}
              >
                <CategoryIcon icon={ic} className="h-4 w-4" />
              </button>
            ))}
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
            {editing ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
