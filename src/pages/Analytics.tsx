import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { endOfMonth, format, startOfMonth, startOfYear, subMonths } from 'date-fns'
import type { Category, Transaction } from '../types'
import { useApp } from '../store/AppContext'
import {
  computeTotals,
  dailySeries,
  monthlySeries,
  spendByCategory,
} from '../lib/analytics'
import { formatCurrency, formatPercent } from '../lib/format'
import { CategoryIcon } from '../components/CategoryIcon'
import { ChartTooltip } from '../components/ChartTooltip'
import { EmptyState } from '../components/EmptyState'

type Period = 'thisMonth' | 'lastMonth' | '3months' | 'year'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: '3months', label: '3 months' },
  { id: 'year', label: 'This year' },
]

export function Analytics() {
  const { data } = useApp()
  const { currency } = data.settings
  const [period, setPeriod] = useState<Period>('thisMonth')

  const range = useMemo(() => {
    const now = new Date()
    switch (period) {
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now), label: format(now, 'MMMM yyyy') }
      case 'lastMonth': {
        const lm = subMonths(now, 1)
        return { start: startOfMonth(lm), end: endOfMonth(lm), label: format(lm, 'MMMM yyyy') }
      }
      case '3months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now), label: 'Last 3 months' }
      case 'year':
        return { start: startOfYear(now), end: endOfMonth(now), label: format(now, 'yyyy') }
    }
  }, [period])

  const periodTxns = useMemo(
    () =>
      data.transactions.filter((t) => {
        const d = new Date(t.date)
        return d >= range.start && d <= range.end
      }),
    [data.transactions, range],
  )

  const totals = useMemo(() => computeTotals(periodTxns), [periodTxns])
  const catExpense = useMemo(
    () => spendByCategory(periodTxns, data.categories, 'expense'),
    [periodTxns, data.categories],
  )
  const catIncome = useMemo(
    () => spendByCategory(periodTxns, data.categories, 'income'),
    [periodTxns, data.categories],
  )

  const monthsCount = period === 'year' ? 12 : period === '3months' ? 3 : 6
  const monthly = useMemo(
    () => monthlySeries(data.transactions, monthsCount),
    [data.transactions, monthsCount],
  )
  const daily = useMemo(() => dailySeries(periodTxns, range), [periodTxns, range])
  const showDaily = period === 'thisMonth' || period === 'lastMonth'

  const topExpenses = useMemo(
    () => [...periodTxns].filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5),
    [periodTxns],
  )

  const accountBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of periodTxns) {
      if (t.type !== 'expense') continue
      map.set(t.account, (map.get(t.account) ?? 0) + t.amount)
    }
    return [...map.entries()].map(([account, amount]) => ({ account, amount })).sort((a, b) => b.amount - a.amount)
  }, [periodTxns])

  if (data.transactions.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-7 w-7" />}
        title="Nothing to analyze yet"
        description="Add some transactions and this page will show detailed charts and breakdowns of your spending."
      />
    )
  }

  const avgDaily =
    totals.expense /
    Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1)

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`chip ${
              period === p.id
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="ml-auto text-sm font-medium text-slate-400">{range.label}</span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Income" value={formatCurrency(totals.income, currency)} tone="emerald" />
        <Kpi label="Expenses" value={formatCurrency(totals.expense, currency)} tone="rose" />
        <Kpi label="Net savings" value={formatCurrency(totals.net, currency, { showSign: true })} tone={totals.net >= 0 ? 'emerald' : 'rose'} />
        <Kpi label="Avg / day" value={formatCurrency(avgDaily, currency)} tone="slate" />
      </div>

      {/* Monthly bars */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Income vs Expenses</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Monthly comparison</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 5, right: 8, left: -18, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} className="text-slate-400" />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                className="text-slate-400"
                tickFormatter={(v) => formatCurrency(v, currency, { compact: true })}
                width={64}
              />
              <Tooltip cursor={{ fill: 'rgba(148,163,184,0.1)' }} content={<ChartTooltip currency={currency} />} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category breakdown */}
        <div className="card p-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Spending by category</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{range.label}</p>
          {catExpense.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">No expenses in this period</div>
          ) : (
            <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={catExpense} dataKey="amount" nameKey="categoryId" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
                      {catExpense.map((c) => (
                        <Cell key={c.categoryId} fill={c.category?.color ?? '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip currency={currency} nameResolver={(id) => data.categories.find((c) => c.id === id)?.name} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-2.5">
                {catExpense.slice(0, 6).map((c) => (
                  <li key={c.categoryId}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.category?.color }} />
                      <span className="truncate text-slate-700 dark:text-slate-200">{c.category?.name}</span>
                      <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(c.amount, currency, { compact: true })}
                      </span>
                      <span className="w-10 shrink-0 text-right text-xs text-slate-400">{c.share.toFixed(0)}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Daily trend or income breakdown */}
        <div className="card p-5">
          {showDaily ? (
            <>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Daily spending</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{range.label}</p>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} className="text-slate-400" interval={4} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} className="text-slate-400" tickFormatter={(v) => formatCurrency(v, currency, { compact: true })} width={64} />
                    <Tooltip content={<ChartTooltip currency={currency} />} />
                    <Line type="monotone" dataKey="expense" name="Spent" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Income sources</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{range.label}</p>
              {catIncome.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-slate-400">No income in this period</div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {catIncome.map((c) => (
                    <li key={c.categoryId} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${c.category?.color}22`, color: c.category?.color }}>
                        <CategoryIcon icon={c.category?.icon ?? 'receipt'} className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{c.category?.name}</span>
                      <span className="ml-auto text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(c.amount, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top expenses */}
        <div className="card p-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Largest expenses</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{range.label}</p>
          {topExpenses.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">No expenses to show</div>
          ) : (
            <ul className="mt-3 space-y-1">
              {topExpenses.map((t) => (
                <TopExpenseRow key={t.id} txn={t} category={data.categories.find((c) => c.id === t.categoryId)} currency={currency} />
              ))}
            </ul>
          )}
        </div>

        {/* Account breakdown */}
        <div className="card p-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Spending by account</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{range.label}</p>
          {accountBreakdown.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">No expenses to show</div>
          ) : (
            <ul className="mt-4 space-y-4">
              {accountBreakdown.map((a) => {
                const share = totals.expense > 0 ? (a.amount / totals.expense) * 100 : 0
                return (
                  <li key={a.account}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{a.account}</span>
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(a.amount, currency)}
                        <span className="ml-1.5 text-xs font-normal text-slate-400">{formatPercent(share)}</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

const KPI_TONES = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  rose: 'text-rose-600 dark:text-rose-400',
  slate: 'text-slate-900 dark:text-white',
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: keyof typeof KPI_TONES }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-lg font-extrabold tracking-tight tabular-nums ${KPI_TONES[tone]}`}>{value}</p>
    </div>
  )
}

function TopExpenseRow({
  txn,
  category,
  currency,
}: {
  txn: Transaction
  category: Category | undefined
  currency: string
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${category?.color}22`, color: category?.color }}>
        <CategoryIcon icon={category?.icon ?? 'receipt'} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{txn.note || category?.name}</p>
        <p className="text-xs text-slate-400">{format(new Date(txn.date), 'MMM d')} · {txn.account}</p>
      </div>
      <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(txn.amount, currency)}</span>
    </li>
  )
}
