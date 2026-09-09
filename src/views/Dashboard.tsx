import { useMemo } from 'react'
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Plus,
  Lightbulb,
  ArrowRight,
  CircleDollarSign,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useCurrency } from '../hooks/useCurrency'
import { StatCard } from '../components/StatCard'
import { SpendingDonut, IncomeExpenseTrend } from '../components/charts'
import { CategoryIcon } from '../components/CategoryIcon'
import { ProgressBar, EmptyState } from '../components/ui'
import { formatDate, monthLabel, shiftMonthKey } from '../utils/format'
import {
  filterByMonth,
  totalExpense,
  totalIncome,
  categoryBreakdown,
  monthlySeries,
  budgetStatuses,
  buildInsights,
  averageDailySpend,
} from '../utils/analytics'
import type { ViewId } from '../nav'

export function Dashboard({
  month,
  onAddTransaction,
  onNavigate,
}: {
  month: string
  onAddTransaction: () => void
  onNavigate: (v: ViewId) => void
}) {
  const { data, getCategory } = useApp()
  const money = useCurrency()

  const monthTxns = useMemo(() => filterByMonth(data.transactions, month), [data.transactions, month])
  const income = totalIncome(monthTxns)
  const expense = totalExpense(monthTxns)
  const net = income - expense
  const savingsRate = income > 0 ? (net / income) * 100 : 0

  const prevKey = shiftMonthKey(month, -1)
  const prevTxns = useMemo(() => filterByMonth(data.transactions, prevKey), [data.transactions, prevKey])
  const prevExpense = totalExpense(prevTxns)
  const prevIncome = totalIncome(prevTxns)
  const expenseChange = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : NaN
  const incomeChange = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : NaN

  const breakdown = useMemo(
    () => categoryBreakdown(monthTxns, data.categories, 'expense'),
    [monthTxns, data.categories],
  )
  const trend = useMemo(() => monthlySeries(data.transactions, 6), [data.transactions])
  const budgets = useMemo(() => budgetStatuses(data, month).slice(0, 4), [data, month])
  const insights = useMemo(() => buildInsights(data, month), [data, month])
  const recent = useMemo(() => monthTxns.slice(0, 6), [monthTxns])
  const avgDaily = averageDailySpend(data.transactions, month)

  const insightTone: Record<string, string> = {
    positive: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10',
    danger: 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10',
    info: 'border-brand-200 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10',
  }
  const insightDot: Record<string, string> = {
    positive: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-rose-500',
    info: 'text-brand-500',
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Income"
          value={money(income)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="emerald"
          change={Number.isFinite(incomeChange) ? { value: incomeChange, positiveIsGood: true } : undefined}
          hint={monthLabel(month)}
        />
        <StatCard
          label="Expenses"
          value={money(expense)}
          icon={<TrendingDown className="h-5 w-5" />}
          accent="rose"
          change={Number.isFinite(expenseChange) ? { value: expenseChange, positiveIsGood: false } : undefined}
          hint={`Avg ${money(avgDaily)}/day`}
        />
        <StatCard
          label="Net Balance"
          value={money(net)}
          icon={<Wallet className="h-5 w-5" />}
          accent={net >= 0 ? 'brand' : 'rose'}
          hint={net >= 0 ? 'Surplus this month' : 'Deficit this month'}
        />
        <StatCard
          label="Savings Rate"
          value={`${savingsRate.toFixed(0)}%`}
          icon={<PiggyBank className="h-5 w-5" />}
          accent="violet"
          hint={savingsRate >= 20 ? 'Healthy' : savingsRate >= 0 ? 'Could improve' : 'Overspending'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Cash Flow</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Income vs expenses, last 6 months</p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="btn-ghost hidden text-brand-600 dark:text-brand-400 sm:inline-flex"
            >
              Details <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <IncomeExpenseTrend data={trend} format={(n) => money(n, { compact: true })} />
        </div>

        {/* Spending donut */}
        <div className="card p-5">
          <div className="mb-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Spending Mix</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{monthLabel(month)}</p>
          </div>
          <SpendingDonut
            data={breakdown}
            total={expense}
            centerLabel="spent"
            format={(n) => money(n, { compact: true })}
          />
          <div className="mt-3 space-y-2">
            {breakdown.slice(0, 4).map((b) => (
              <div key={b.categoryId} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.category?.color }} />
                <span className="flex-1 truncate text-slate-600 dark:text-slate-300">
                  {b.category?.name ?? 'Uncategorized'}
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{b.percent.toFixed(0)}%</span>
              </div>
            ))}
            {breakdown.length === 0 && (
              <p className="text-center text-sm text-slate-400">No expenses recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Smart Insights</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {insights.map((ins) => (
              <div key={ins.id} className={`rounded-xl border p-4 ${insightTone[ins.tone]}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${insightDot[ins.tone]} bg-current`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{ins.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{ins.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Budgets snapshot */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Budget Progress</h2>
            <button
              onClick={() => onNavigate('budgets')}
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Manage
            </button>
          </div>
          {budgets.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-6 w-6" />}
              title="No budgets yet"
              description="Set monthly limits per category to track spending."
              action={
                <button className="btn-primary" onClick={() => onNavigate('budgets')}>
                  <Plus className="h-4 w-4" /> Add budget
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              {budgets.map((b) => (
                <div key={b.budget.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${b.category?.color}20`, color: b.category?.color }}
                      >
                        <CategoryIcon name={b.category?.icon} className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {b.category?.name ?? 'Uncategorized'}
                      </span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400">
                      {money(b.spent)} / {money(b.budget.amount)}
                    </span>
                  </div>
                  <ProgressBar
                    value={b.percent}
                    color={b.state === 'over' ? '#f43f5e' : b.state === 'warning' ? '#f59e0b' : b.category?.color}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              View all
            </button>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={<CircleDollarSign className="h-6 w-6" />}
              title="Nothing here yet"
              description="Add your first transaction to get started."
              action={
                <button className="btn-primary" onClick={onAddTransaction}>
                  <Plus className="h-4 w-4" /> Add transaction
                </button>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((t) => {
                const cat = getCategory(t.categoryId)
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${cat?.color ?? '#94a3b8'}20`, color: cat?.color ?? '#94a3b8' }}
                    >
                      <CategoryIcon name={cat?.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t.note || cat?.name || 'Transaction'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {cat?.name ?? 'Uncategorized'} · {formatDate(t.date, 'MMM d')}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '−'}
                      {money(t.amount)}
                    </span>
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
