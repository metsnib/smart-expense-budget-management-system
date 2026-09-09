import type { Insight, InsightTone } from '../lib/insights'
import { CategoryIcon } from './CategoryIcon'

const TONES: Record<InsightTone, { wrap: string; icon: string }> = {
  positive: {
    wrap: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10',
    icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  warning: {
    wrap: 'border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10',
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
  },
  danger: {
    wrap: 'border-rose-200 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-500/10',
    icon: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
  },
  info: {
    wrap: 'border-brand-200 bg-brand-50/70 dark:border-brand-500/20 dark:bg-brand-500/10',
    icon: 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300',
  },
}

export function InsightCard({ insight }: { insight: Insight }) {
  const tone = TONES[insight.tone]
  return (
    <div className={`flex gap-3 rounded-2xl border p-4 ${tone.wrap}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
        <CategoryIcon icon={insight.icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{insight.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {insight.detail}
        </p>
      </div>
    </div>
  )
}
