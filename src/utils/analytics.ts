import type { AppData, Budget, Category, Transaction } from '../types'
import { monthKey, recentMonthKeys, shiftMonthKey } from './format'

export interface CategoryBreakdown {
  category: Category | undefined
  categoryId: string
  total: number
  count: number
  percent: number
}

export interface BudgetStatus {
  budget: Budget
  category: Category | undefined
  spent: number
  remaining: number
  percent: number
  state: 'ok' | 'warning' | 'over'
}

export interface MonthlyPoint {
  key: string
  label: string
  income: number
  expense: number
  net: number
}

export function filterByMonth(transactions: Transaction[], mKey: string): Transaction[] {
  return transactions.filter((t) => monthKey(t.date) === mKey)
}

export function sumByType(transactions: Transaction[], type: Transaction['type']): number {
  return transactions.filter((t) => t.type === type).reduce((acc, t) => acc + t.amount, 0)
}

export function totalIncome(transactions: Transaction[]): number {
  return sumByType(transactions, 'income')
}

export function totalExpense(transactions: Transaction[]): number {
  return sumByType(transactions, 'expense')
}

export function categoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  type: Transaction['type'] = 'expense',
): CategoryBreakdown[] {
  const filtered = transactions.filter((t) => t.type === type)
  const total = filtered.reduce((acc, t) => acc + t.amount, 0)
  const map = new Map<string, { total: number; count: number }>()
  for (const t of filtered) {
    const cur = map.get(t.categoryId) ?? { total: 0, count: 0 }
    cur.total += t.amount
    cur.count += 1
    map.set(t.categoryId, cur)
  }
  const result: CategoryBreakdown[] = []
  for (const [categoryId, agg] of map.entries()) {
    result.push({
      categoryId,
      category: categories.find((c) => c.id === categoryId),
      total: agg.total,
      count: agg.count,
      percent: total > 0 ? (agg.total / total) * 100 : 0,
    })
  }
  return result.sort((a, b) => b.total - a.total)
}

export function budgetStatuses(
  data: AppData,
  mKey: string,
): BudgetStatus[] {
  const monthTxns = filterByMonth(data.transactions, mKey)
  return data.budgets
    .map((budget) => {
      const spent = monthTxns
        .filter((t) => t.type === 'expense' && t.categoryId === budget.categoryId)
        .reduce((acc, t) => acc + t.amount, 0)
      const remaining = budget.amount - spent
      const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
      const state: BudgetStatus['state'] = percent >= 100 ? 'over' : percent >= 80 ? 'warning' : 'ok'
      return {
        budget,
        category: data.categories.find((c) => c.id === budget.categoryId),
        spent,
        remaining,
        percent,
        state,
      }
    })
    .sort((a, b) => b.percent - a.percent)
}

export function monthlySeries(transactions: Transaction[], count: number): MonthlyPoint[] {
  const keys = recentMonthKeys(count)
  return keys.map((key) => {
    const monthTxns = filterByMonth(transactions, key)
    const income = totalIncome(monthTxns)
    const expense = totalExpense(monthTxns)
    return {
      key,
      label: key,
      income,
      expense,
      net: income - expense,
    }
  })
}

/** Daily cumulative expense for a given month, indexed by day-of-month. */
export function dailyCumulativeExpense(
  transactions: Transaction[],
  mKey: string,
): { day: number; amount: number; cumulative: number }[] {
  const [year, month] = mKey.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const byDay = new Array(daysInMonth + 1).fill(0)
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    if (monthKey(t.date) !== mKey) continue
    const day = Number(t.date.slice(8, 10))
    if (day >= 1 && day <= daysInMonth) byDay[day] += t.amount
  }
  const result: { day: number; amount: number; cumulative: number }[] = []
  let running = 0
  for (let d = 1; d <= daysInMonth; d++) {
    running += byDay[d]
    result.push({ day: d, amount: byDay[d], cumulative: running })
  }
  return result
}

export interface Insight {
  id: string
  tone: 'positive' | 'warning' | 'danger' | 'info'
  title: string
  detail: string
}

export function buildInsights(data: AppData, mKey: string): Insight[] {
  const insights: Insight[] = []
  const prevKey = shiftMonthKey(mKey, -1)
  const monthTxns = filterByMonth(data.transactions, mKey)
  const prevTxns = filterByMonth(data.transactions, prevKey)

  const expense = totalExpense(monthTxns)
  const income = totalIncome(monthTxns)
  const prevExpense = totalExpense(prevTxns)

  // Savings rate
  if (income > 0) {
    const rate = ((income - expense) / income) * 100
    if (rate >= 20) {
      insights.push({
        id: 'savings-good',
        tone: 'positive',
        title: `You're saving ${rate.toFixed(0)}% of your income`,
        detail: 'Great job! A savings rate above 20% builds long-term financial resilience.',
      })
    } else if (rate < 0) {
      insights.push({
        id: 'savings-negative',
        tone: 'danger',
        title: 'Spending exceeds income this month',
        detail: `You've spent ${Math.abs(rate).toFixed(0)}% more than you earned. Review large expenses below.`,
      })
    } else {
      insights.push({
        id: 'savings-low',
        tone: 'warning',
        title: `Savings rate is ${rate.toFixed(0)}%`,
        detail: 'Aim for at least 20%. Small cuts in top categories add up quickly.',
      })
    }
  }

  // Spend vs last month
  if (prevExpense > 0) {
    const change = ((expense - prevExpense) / prevExpense) * 100
    if (change > 10) {
      insights.push({
        id: 'spend-up',
        tone: 'warning',
        title: `Spending is up ${change.toFixed(0)}% vs last month`,
        detail: 'Check which categories grew the most and adjust if it was unplanned.',
      })
    } else if (change < -10) {
      insights.push({
        id: 'spend-down',
        tone: 'positive',
        title: `Spending is down ${Math.abs(change).toFixed(0)}% vs last month`,
        detail: 'Nice work trimming expenses compared to last month.',
      })
    }
  }

  // Budgets over limit
  const statuses = budgetStatuses(data, mKey)
  const over = statuses.filter((s) => s.state === 'over')
  const warning = statuses.filter((s) => s.state === 'warning')
  if (over.length > 0) {
    insights.push({
      id: 'budget-over',
      tone: 'danger',
      title: `${over.length} budget${over.length > 1 ? 's' : ''} exceeded`,
      detail: `Over limit: ${over.map((s) => s.category?.name ?? 'Unknown').join(', ')}.`,
    })
  } else if (warning.length > 0) {
    insights.push({
      id: 'budget-warning',
      tone: 'warning',
      title: `${warning.length} budget${warning.length > 1 ? 's' : ''} near the limit`,
      detail: `Watch: ${warning.map((s) => s.category?.name ?? 'Unknown').join(', ')}.`,
    })
  } else if (statuses.length > 0) {
    insights.push({
      id: 'budget-ok',
      tone: 'positive',
      title: 'All budgets are on track',
      detail: 'Every category is under its monthly limit so far.',
    })
  }

  // Top category
  const breakdown = categoryBreakdown(monthTxns, data.categories, 'expense')
  if (breakdown.length > 0) {
    const top = breakdown[0]
    insights.push({
      id: 'top-category',
      tone: 'info',
      title: `${top.category?.name ?? 'Uncategorized'} is your biggest expense`,
      detail: `It accounts for ${top.percent.toFixed(0)}% of this month's spending across ${top.count} transactions.`,
    })
  }

  return insights
}

export function averageDailySpend(transactions: Transaction[], mKey: string): number {
  const monthTxns = filterByMonth(transactions, mKey)
  const expense = totalExpense(monthTxns)
  const [year, month] = mKey.split('-').map(Number)
  const now = new Date()
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === month
  const days = isCurrent ? now.getDate() : new Date(year, month, 0).getDate()
  return days > 0 ? expense / days : 0
}
