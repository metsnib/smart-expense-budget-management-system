import { formatCurrency } from '../lib/format'

interface TooltipPayloadItem {
  name?: string
  dataKey?: string | number
  value?: number
  color?: string
  payload?: Record<string, unknown>
}

export function ChartTooltip({
  active,
  payload,
  label,
  currency,
  nameResolver,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string | number
  currency: string
  nameResolver?: (key: string) => string | undefined
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      {label !== undefined && (
        <p className="mb-1 font-semibold text-slate-900 dark:text-white">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((item, i) => {
          const rawName = nameResolver
            ? nameResolver(String(item.payload?.categoryId ?? item.name ?? item.dataKey))
            : String(item.name ?? item.dataKey)
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="capitalize text-slate-500 dark:text-slate-400">{rawName}</span>
              <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(Number(item.value ?? 0), currency)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
