import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Plus,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, subMonths } from 'date-fns'
import type { Page, Transaction } from '../types'
import { useApp } from '../store/AppContext'
import {
  budgetStatuses,
  computeTotals,
  monthlySeries,
  overallBalance,
  percentChange,
  spendByCategory,
  transactionsInMonth,
} from '../lib/analytics'
import { generateInsights } from '../lib/insights'
import { formatCurrency, formatPercent } from '../lib/format'
import { CategoryIcon } from '../components/CategoryIcon'
import { ProgressBar } from '../components/ProgressBar'
import { TransactionRow } from '../components/TransactionRow'
import { TransactionModal } from '../components/TransactionModal'
import { EmptyState } from '../components/EmptyState'
import { InsightCard } from '../components/InsightCard'
import { ChartTooltip } from '../components/ChartTooltip'

export function Dashboard({
  onNavigate,
  onAdd,
}: {
  onNavigate: (p: Page) => void
  onAdd: () => void
}) {
  const { data } = useApp()
  const { currency } = data.settings
  const [monthOffset, setMonthOffset] = useState(0)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const viewDate = useMemo(() => subMonths(new Date(), monthOffset), [monthOffset])
  const isCurrentMonth = monthOffset === 0

  const monthTxns = useMemo(() => transactionsInMonth(data.transactions, viewDate), [data.transactions, viewDate])
  const prevTxns = useMemo(
    () => transactionsInMonth(data.transactions, subMonths(viewDate, 1)),
    [data.transactions, viewDate],
  )
  const totals = useMemo(() => computeTotals(monthTxns), [monthTxns])
  const prevTotals = useMemo(() => computeTotals(prevTxns), [prevTxns])
  const balance = useMemo(() => overallBalance(data.transactions), [data.transactions])

  const series = useMemo(() => monthlySeries(data.transactions, 6, viewDate), [data.transactions, viewDate])
  const catSpend = useMemo(
    () => spendByCategory(monthTxns, data.categories, 'expense').slice(0, 6),
    [monthTxns, data.categories],
  )
  const budgets = useMemo(
    () => budgetStatuses(data.budgets, data.transactions, data.categories, viewDate).slice(0, 4),
    [data.budgets, data.transactions, data.categories, viewDate],
  )
  const insights = useMemo(
    () => generateInsights(data.transactions, data.categories, data.budgets, data.settings.savingsGoalRate).slice(0, 3),
    [data.transactions, data.categories, data.budgets, data.settings.savingsGoalRate],
  )
  const recent = useMemo(
    () => [...data.transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt))).slice(0, 6),
    [data.transactions],
  )

  const expenseChange = percentChange(totals.expense, prevTotals.expense)
  const incomeChange = percentChange(totals.income, prevTotals.income)

  if (data.transactions.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-7 w-7" />}
        title="No transactions yet"
        description="Start by logging your first income or expense. Your dashboard will come alive with insights, budgets and trends."
        action={
          <button onClick={onAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add your first transaction
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => setMonthOffset((m) => m + 1)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[130px] text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
            {format(viewDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
            disabled={isCurrentMonth}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {!isCurrentMonth && (
          <button onClick={() => setMonthOffset(0)} className="btn-ghost text-xs">
            Back to current
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total balance"
          value={formatCurrency(balance, currency)}
          icon={<Wallet className="h-5 w-5" />}
          accent="brand"
          sub="All accounts"
        />
        <StatCard
          label="Income"
          value={formatCurrency(totals.income, currency)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="emerald"
          change={incomeChange}
          changeGood="up"
        />
        <StatCard
          label="Expenses"
          value={formatCurrency(totals.expense, currency)}
          icon={<TrendingDown className="h-5 w-5" />}
          accent="rose"
          change={expenseChange}
          changeGood="down"
        />
        <StatCard
          label="Savings rate"
          value={formatPercent(totals.savingsRate)}
          icon={<PiggyBank className="h-5 w-5" />}
          accent="violet"
          sub={`Net ${formatCurrency(totals.net, currency, { showSign: true })}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cash flow chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Cash flow</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Income vs expenses, last 6 months</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Legend color="#10b981" label="Income" />
              <Legend color="#f43f5e" label="Expense" />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fill="url(#inc)" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category donut */}
        <div className="card p-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Top categories</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{format(viewDate, 'MMMM')} spending</p>
          {catSpend.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-slate-400">
              No expenses this month
            </div>
          ) : (
            <>
              <div className="relative mx-auto mt-2 h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={catSpend}
                      dataKey="amount"
                      nameKey="categoryId"
                      innerRadius={52}
                      outerRadius={70}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {catSpend.map((c) => (
                        <Cell key={c.categoryId} fill={c.category?.color ?? '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip currency={currency} nameResolver={(id) => data.categories.find((c) => c.id === id)?.name} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] text-slate-400">Spent</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatCurrency(totals.expense, currency, { compact: true })}
                  </span>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {catSpend.slice(0, 4).map((c) => (
                  <li key={c.categoryId} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.category?.color }} />
                    <span className="truncate text-slate-600 dark:text-slate-300">{c.category?.name}</span>
                    <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(c.amount, currency, { compact: true })}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Insights */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Smart insights</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((ins) => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Budgets */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Budget progress</h2>
            <button onClick={() => onNavigate('budgets')} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Manage
            </button>
          </div>
          {budgets.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">
              No budgets set.{' '}
              <button onClick={() => onNavigate('budgets')} className="font-semibold text-brand-600 hover:underline">
                Create one
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {budgets.map((b) => {
                const color =
                  b.status === 'over' ? '#ef4444' : b.status === 'warning' ? '#f59e0b' : b.category?.color ?? '#6366f1'
                return (
                  <li key={b.budget.id}>
                    <div className="mb-1.5 flex items-center gap-2 text-sm">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${b.category?.color}22`, color: b.category?.color }}
                      >
                        <CategoryIcon icon={b.category?.icon ?? 'receipt'} className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{b.category?.name}</span>
                      <span className="ml-auto tabular-nums text-slate-500 dark:text-slate-400">
                        {formatCurrency(b.spent, currency, { compact: true })} / {formatCurrency(b.limit, currency, { compact: true })}
                      </span>
                    </div>
                    <ProgressBar value={b.progress} color={color} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Recent transactions */}
        <div className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent activity</h2>
            <button onClick={() => onNavigate('transactions')} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {recent.map((t) => (
              <TransactionRow
                key={t.id}
                txn={t}
                category={data.categories.find((c) => c.id === t.categoryId)}
                currency={currency}
                onClick={() => setEditing(t)}
              />
            ))}
          </div>
        </div>
      </div>

      <TransactionModal open={!!editing} onClose={() => setEditing(null)} editing={editing} />
    </div>
  )
}

const ACCENTS = {
  brand: 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
}

function StatCard({
  label,
  value,
  icon,
  accent,
  sub,
  change,
  changeGood,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: keyof typeof ACCENTS
  sub?: string
  change?: number | null
  changeGood?: 'up' | 'down'
}) {
  const showChange = change !== undefined && change !== null && Number.isFinite(change)
  const positive = showChange && (changeGood === 'up' ? change! >= 0 : change! <= 0)
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${ACCENTS[accent]}`}>{icon}</span>
        {showChange && (
          <span
            className={`chip ${
              positive
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
            }`}
          >
            {change! >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change!).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
