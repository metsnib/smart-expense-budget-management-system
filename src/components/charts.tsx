import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from 'recharts'
import type { CategoryBreakdown, MonthlyPoint } from '../utils/analytics'
import { shortMonthLabel } from '../utils/format'

interface TooltipFormat {
  format: (n: number) => string
}

export function SpendingDonut({
  data,
  format,
  total,
  centerLabel,
}: {
  data: CategoryBreakdown[]
  total: number
  centerLabel: string
} & TooltipFormat) {
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.category?.name ?? 'Uncategorized',
    value: d.total,
    color: d.category?.color ?? '#94a3b8',
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-slate-400">
        No spending data yet.
      </div>
    )
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            stroke="none"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [format(value), name]}
            contentStyle={tooltipStyle}
            itemStyle={{ color: 'inherit' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</span>
        <span className="text-xl font-bold text-slate-900 dark:text-white">{format(total)}</span>
        <span className="text-xs text-slate-400">{centerLabel}</span>
      </div>
    </div>
  )
}

const tooltipStyle: React.CSSProperties = {
  borderRadius: '0.75rem',
  border: '1px solid rgba(148,163,184,0.25)',
  background: 'rgba(15,23,42,0.92)',
  color: '#f8fafc',
  fontSize: '12px',
  padding: '8px 12px',
  boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)',
}

export function IncomeExpenseTrend({
  data,
  format,
}: {
  data: MonthlyPoint[]
} & TooltipFormat) {
  const chartData = data.map((d) => ({
    ...d,
    month: shortMonthLabel(d.key),
  }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} barGap={4} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.18)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          width={56}
          tickFormatter={(v: number) => format(v)}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
          formatter={(value: number, name: string) => [format(value), name === 'income' ? 'Income' : 'Expense']}
          contentStyle={tooltipStyle}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {value === 'income' ? 'Income' : 'Expense'}
            </span>
          )}
        />
        <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CumulativeSpendArea({
  data,
  format,
  budgetLine,
}: {
  data: { day: number; cumulative: number }[]
  budgetLine?: number
} & TooltipFormat) {
  const withBudget = data.map((d) => ({ ...d, budget: budgetLine }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={withBudget} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b6ff5" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#1b6ff5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.18)" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={axisTick} interval={4} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          width={56}
          tickFormatter={(v: number) => format(v)}
        />
        <Tooltip
          formatter={(value: number) => [format(value), 'Spent']}
          labelFormatter={(label) => `Day ${label}`}
          contentStyle={tooltipStyle}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#1b6ff5"
          strokeWidth={2.5}
          fill="url(#spendGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CategoryBars({
  data,
  format,
}: {
  data: CategoryBreakdown[]
} & TooltipFormat) {
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.category?.name ?? 'Uncategorized',
    value: d.total,
    color: d.category?.color ?? '#94a3b8',
  }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(chartData.length * 44, 120)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.18)" />
        <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v: number) => format(v)} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          width={96}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
          formatter={(value: number) => [format(value), 'Spent']}
          contentStyle={tooltipStyle}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

const axisTick = { fontSize: 11, fill: '#94a3b8' }
