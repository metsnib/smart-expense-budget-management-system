import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon,
  accent = 'brand',
  change,
  hint,
}: {
  label: string
  value: string
  icon: ReactNode
  accent?: 'brand' | 'emerald' | 'rose' | 'violet' | 'amber'
  change?: { value: number; positiveIsGood?: boolean }
  hint?: string
}) {
  const accentMap: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  }

  let changeNode: ReactNode = null
  if (change && Number.isFinite(change.value)) {
    const positiveIsGood = change.positiveIsGood ?? true
    const up = change.value >= 0
    const good = up === positiveIsGood
    changeNode = (
      <span
        className={`chip ${
          good
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
        }`}
      >
        {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {Math.abs(change.value).toFixed(0)}%
      </span>
    )
  }

  return (
    <div className="card animate-fade-in p-5">
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentMap[accent]}`}>
          {icon}
        </span>
        {changeNode}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  )
}
