import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Calendar, Layers } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useCurrency } from '../hooks/useCurrency'
import { CategoryIcon } from '../components/CategoryIcon'
import { EmptyState } from '../components/ui'
import { IncomeExpenseTrend, CategoryBars, CumulativeSpendArea, SpendingDonut } from '../components/charts'
import {
  filterByMonth,
  categoryBreakdown,
  monthlySeries,
  dailyCumulativeExpense,
  totalExpense,
  totalIncome,
} from '../utils/analytics'
import { monthLabel } from '../utils/format'

export function Analytics({ month }: { month: string }) {
  const { data } = useApp()
  const money = useCurrency()
  const [range, setRange] = useState<6 | 12>(6)
  const [txnType, setTxnType] = useState<'expense' | 'income'>('expense')

  const monthTxns = useMemo(() => filterByMonth(data.transactions, month), [data.transactions, month])
  const trend = useMemo(() => monthlySeries(data.transactions, range), [data.transactions, range])
  const breakdown = useMemo(
    () => categoryBreakdown(monthTxns, data.categories, txnType),
    [monthTxns, data.categories, txnType],
  )
  const cumulative = useMemo(() => dailyCumulativeExpense(data.transactions, month), [data.transactions, month])

  const monthExpense = totalExpense(monthTxns)
  const monthIncome = totalIncome(monthTxns)

  const trendTotals = useMemo(() => {
    const income = trend.reduce((a, t) => a + t.income, 0)
    const expense = trend.reduce((a, t) => a + t.expense, 0)
    const avgExpense = trend.length ? expense / trend.length : 0
    return { income, expense, avgExpense }
  }, [trend])

  const hasData = data.transactions.length > 0

  if (!hasData) {
    return (
      <EmptyState
        icon={<Layers className="h-6 w-6" />}
        title="No data to analyze yet"
        description="Once you add transactions, this page will visualize your spending patterns and trends."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Trend */}
      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Income vs Expenses</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Trend over the last {range} months</p>
          </div>
          <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            {([6, 12] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  range === r
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {r}M
              </button>
            ))}
          </div>
        </div>
        <IncomeExpenseTrend data={trend} format={(n) => money(n, { compact: true })} />
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div>
            <p className="flex items-center gap-1 text-xs font-medium text-slate-400">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Total income
            </p>
            <p className="mt-1 font-bold text-slate-900 dark:text-white">{money(trendTotals.income)}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs font-medium text-slate-400">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" /> Total expenses
            </p>
            <p className="mt-1 font-bold text-slate-900 dark:text-white">{money(trendTotals.expense)}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs font-medium text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-brand-500" /> Avg / month
            </p>
            <p className="mt-1 font-bold text-slate-900 dark:text-white">{money(trendTotals.avgExpense)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category breakdown */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">By Category</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{monthLabel(month)}</p>
            </div>
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTxnType(t)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize transition ${
                    txnType === t
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {breakdown.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No {txnType} data for this month.</p>
          ) : (
            <CategoryBars data={breakdown} format={(n) => money(n, { compact: true })} />
          )}
        </div>

        {/* Spending mix donut */}
        <div className="card p-5">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Distribution</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {txnType === 'expense' ? 'Expense' : 'Income'} share · {monthLabel(month)}
            </p>
          </div>
          <SpendingDonut
            data={breakdown}
            total={txnType === 'expense' ? monthExpense : monthIncome}
            centerLabel={txnType}
            format={(n) => money(n, { compact: true })}
          />
        </div>
      </div>

      {/* Cumulative spend */}
      <div className="card p-5">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Cumulative Spending</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            How expenses accumulated through {monthLabel(month)}
          </p>
        </div>
        <CumulativeSpendArea data={cumulative} format={(n) => money(n, { compact: true })} />
      </div>

      {/* Detailed table */}
      {breakdown.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Category Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 text-right font-medium">Transactions</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {breakdown.map((b) => (
                  <tr key={b.categoryId} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${b.category?.color ?? '#94a3b8'}20`, color: b.category?.color ?? '#94a3b8' }}
                        >
                          <CategoryIcon name={b.category?.icon} className="h-4 w-4" />
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {b.category?.name ?? 'Uncategorized'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">{b.count}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">
                      {money(b.total)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-2">
                        <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:inline-block">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${b.percent}%`, backgroundColor: b.category?.color ?? '#94a3b8' }}
                          />
                        </span>
                        <span className="w-10 text-right font-medium text-slate-600 dark:text-slate-300">
                          {b.percent.toFixed(0)}%
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
