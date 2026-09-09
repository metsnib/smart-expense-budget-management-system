import { useRef, useState } from 'react'
import {
  Palette,
  Coins,
  Database,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Info,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import { CURRENCIES } from '../utils/format'
import { exportBackupJson, parseBackupJson } from '../utils/exporters'
import type { Settings } from '../types'

export function SettingsView() {
  const { data, updateSettings, importData, resetDemo, clearAll } = useApp()
  const { notify } = useToast()
  const { dialog, confirm } = useConfirm()
  const fileInput = useRef<HTMLInputElement>(null)
  const [incomeTarget, setIncomeTarget] = useState(String(data.settings.monthlyIncomeTarget))

  const themes: { id: Settings['theme']; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ]

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseBackupJson(text)
      importData(parsed)
      notify('Backup imported successfully')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to import backup', 'error')
    }
  }

  const stats = {
    transactions: data.transactions.length,
    categories: data.categories.length,
    budgets: data.budgets.length,
    goals: data.goals.length,
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Preferences */}
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Coins className="h-5 w-5 text-brand-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Preferences</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="currency">
              Currency
            </label>
            <select
              id="currency"
              className="input"
              value={data.settings.currency}
              onChange={(e) => {
                updateSettings({ currency: e.target.value })
                notify('Currency updated')
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="income-target">
              Monthly income target
            </label>
            <input
              id="income-target"
              className="input"
              inputMode="decimal"
              value={incomeTarget}
              onChange={(e) => setIncomeTarget(e.target.value.replace(/[^0-9.]/g, ''))}
              onBlur={() => {
                const v = parseFloat(incomeTarget) || 0
                updateSettings({ monthlyIncomeTarget: v })
              }}
            />
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-violet-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Appearance</h2>
        </div>
        <span className="label">Theme</span>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => {
            const active = data.settings.theme === t.id
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => updateSettings({ theme: t.id })}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Data management */}
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-emerald-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Data</h2>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
              <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
              <p className="text-xs capitalize text-slate-400">{key}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button className="btn-secondary justify-start" onClick={() => exportBackupJson(data)}>
            <Download className="h-4 w-4" /> Export backup (JSON)
          </button>
          <button className="btn-secondary justify-start" onClick={() => fileInput.current?.click()}>
            <Upload className="h-4 w-4" /> Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
              e.target.value = ''
            }}
          />
          <button
            className="btn-secondary justify-start"
            onClick={() =>
              confirm({
                title: 'Load demo data?',
                message: 'This replaces your current data with a fresh set of sample transactions, budgets, and goals.',
                confirmLabel: 'Load demo',
                onConfirm: () => {
                  resetDemo()
                  notify('Demo data loaded')
                },
              })
            }
          >
            <RotateCcw className="h-4 w-4" /> Load demo data
          </button>
          <button
            className="btn justify-start border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
            onClick={() =>
              confirm({
                title: 'Clear all data?',
                message: 'This permanently deletes all your transactions, budgets, and goals. This cannot be undone.',
                confirmLabel: 'Delete everything',
                onConfirm: () => {
                  clearAll()
                  notify('All data cleared', 'info')
                },
              })
            }
          >
            <Trash2 className="h-4 w-4" /> Clear all data
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p>
            Your data is stored privately in this browser using local storage — nothing is uploaded to a server.
            Export a backup regularly to keep your records safe.
          </p>
        </div>
      </section>

      {dialog}
    </div>
  )
}
