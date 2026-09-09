import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useToast } from '../components/Toast'
import { CategoryIcon } from '../components/CategoryIcon'
import { Modal } from '../components/Modal'
import { useConfirm } from '../components/ConfirmDialog'
import { CATEGORY_COLOR_CHOICES, CATEGORY_ICON_CHOICES } from '../data/categories'
import type { Category, TransactionType } from '../types'

export function Categories() {
  const { data, addCategory, updateCategory, deleteCategory } = useApp()
  const { notify } = useToast()
  const { dialog, confirm } = useConfirm()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [icon, setIcon] = useState(CATEGORY_ICON_CHOICES[0])
  const [color, setColor] = useState(CATEGORY_COLOR_CHOICES[0])
  const [error, setError] = useState('')

  const usageCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of data.transactions) {
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1)
    }
    return map
  }, [data.transactions])

  const expense = data.categories.filter((c) => c.type === 'expense')
  const income = data.categories.filter((c) => c.type === 'income')

  const openAdd = (t: TransactionType) => {
    setEditing(null)
    setName('')
    setType(t)
    setIcon(CATEGORY_ICON_CHOICES[0])
    setColor(CATEGORY_COLOR_CHOICES[Math.floor(Math.random() * CATEGORY_COLOR_CHOICES.length)])
    setError('')
    setModalOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setName(c.name)
    setType(c.type)
    setIcon(c.icon)
    setColor(c.color)
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Enter a category name.')
      return
    }
    if (editing) {
      updateCategory({ ...editing, name: name.trim(), type, icon, color })
      notify('Category updated')
    } else {
      addCategory({ name: name.trim(), type, icon, color })
      notify('Category added')
    }
    setModalOpen(false)
  }

  const handleDelete = (c: Category) => {
    const count = usageCount.get(c.id) ?? 0
    confirm({
      title: 'Delete category?',
      message:
        count > 0
          ? `${c.name} is used by ${count} transaction${count > 1 ? 's' : ''}, which will become "Uncategorized". Continue?`
          : `Remove the "${c.name}" category?`,
      onConfirm: () => {
        deleteCategory(c.id)
        notify('Category deleted', 'info')
      },
    })
  }

  const renderGroup = (title: string, list: Category[], t: TransactionType) => (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{list.length} categories</p>
        </div>
        <button className="btn-secondary" onClick={() => openAdd(t)}>
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {list.map((c) => {
          const count = usageCount.get(c.id) ?? 0
          return (
            <div
              key={c.id}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${c.color}20`, color: c.color }}
              >
                <CategoryIcon name={c.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-700 dark:text-slate-200">{c.name}</p>
                <p className="text-xs text-slate-400">
                  {count} transaction{count === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => openEdit(c)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                  aria-label="Edit category"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                  aria-label="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
        {list.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-slate-400">No categories yet.</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <Tags className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Categories</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organize your transactions with custom categories, icons, and colors.
          </p>
        </div>
      </div>

      {renderGroup('Expense Categories', expense, 'expense')}
      {renderGroup('Income Categories', income, 'income')}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit category' : 'New category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <CategoryIcon name={icon} className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <label className="label" htmlFor="cat-name">
                Name
              </label>
              <input
                id="cat-name"
                className="input"
                placeholder="Category name"
                value={name}
                autoFocus
                onChange={(e) => {
                  setError('')
                  setName(e.target.value)
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(['expense', 'income'] as TransactionType[]).map((tt) => (
              <button
                key={tt}
                type="button"
                onClick={() => setType(tt)}
                disabled={!!editing}
                className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition disabled:opacity-60 ${
                  type === tt ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500'
                }`}
              >
                {tt}
              </button>
            ))}
          </div>

          <div>
            <span className="label">Icon</span>
            <div className="grid max-h-40 grid-cols-6 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700 sm:grid-cols-8">
              {CATEGORY_ICON_CHOICES.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`flex h-9 items-center justify-center rounded-lg transition ${
                    icon === ic
                      ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <CategoryIcon name={ic} className="h-4.5 w-4.5" />
                </button>
              ))}
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
              {editing ? 'Save' : 'Add category'}
            </button>
          </div>
        </form>
      </Modal>

      {dialog}
    </div>
  )
}
