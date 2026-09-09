import {
  eachMonthOfInterval,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'
import type { Budget, Category, Transaction } from '../types'

export interface MonthRange {
  start: Date
  end: Date
  key: string // yyyy-MM
  label: string
}

export function monthRange(date: Date): MonthRange {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  return { start, end, key: format(date, 'yyyy-MM'), label: format(date, 'MMMM yyyy') }
}

export function inRange(txn: Transaction, range: { start: Date; end: Date }): boolean {
  const d = parseISO(txn.date)
  return isWithinInterval(d, { start: range.start, end: range.end })
}

export function transactionsInMonth(txns: Transaction[], date: Date): Transaction[] {
  const range = monthRange(date)
  return txns.filter((t) => inRange(t, range))
}

export function sumByType(txns: Transaction[], type: 'income' | 'expense'): number {
  return txns.filter((t) => t.type === type).reduce((acc, t) => acc + t.amount, 0)
}

export interface Totals {
  income: number
  expense: number
  net: number
  savingsRate: number
}

export function computeTotals(txns: Transaction[]): Totals {
  const income = sumByType(txns, 'income')
  const expense = sumByType(txns, 'expense')
  const net = income - expense
  const savingsRate = income > 0 ? (net / income) * 100 : 0
  return { income, expense, net, savingsRate }
}

export function overallBalance(txns: Transaction[]): number {
  return txns.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)
}

export interface CategorySpend {
  categoryId: string
  category: Category | undefined
  amount: number
  count: number
  share: number // percent of total
}

export function spendByCategory(
  txns: Transaction[],
  categories: Category[],
  type: 'income' | 'expense' = 'expense',
): CategorySpend[] {
  const map = new Map<string, { amount: number; count: number }>()
  for (const t of txns) {
    if (t.type !== type) continue
    const cur = map.get(t.categoryId) ?? { amount: 0, count: 0 }
    cur.amount += t.amount
    cur.count += 1
    map.set(t.categoryId, cur)
  }
  const total = [...map.values()].reduce((a, b) => a + b.amount, 0)
  const rows: CategorySpend[] = [...map.entries()].map(([categoryId, v]) => ({
    categoryId,
    category: categories.find((c) => c.id === categoryId),
    amount: v.amount,
    count: v.count,
    share: total > 0 ? (v.amount / total) * 100 : 0,
  }))
  return rows.sort((a, b) => b.amount - a.amount)
}

export interface MonthlyPoint {
  key: string
  label: string
  income: number
  expense: number
  net: number
}

export function monthlySeries(txns: Transaction[], months = 6, endDate = new Date()): MonthlyPoint[] {
  const start = startOfMonth(subMonths(endDate, months - 1))
  const monthsList = eachMonthOfInterval({ start, end: endDate })
  return monthsList.map((m) => {
    const range = monthRange(m)
    const monthTxns = txns.filter((t) => inRange(t, range))
    const income = sumByType(monthTxns, 'income')
    const expense = sumByType(monthTxns, 'expense')
    return {
      key: range.key,
      label: format(m, 'MMM'),
      income,
      expense,
      net: income - expense,
    }
  })
}

export interface BudgetStatus {
  budget: Budget
  category: Category | undefined
  spent: number
  limit: number
  remaining: number
  progress: number // percent, can exceed 100
  status: 'ok' | 'warning' | 'over'
}

export function budgetStatuses(
  budgets: Budget[],
  txns: Transaction[],
  categories: Category[],
  date: Date,
): BudgetStatus[] {
  const range = monthRange(date)
  const monthTxns = txns.filter((t) => t.type === 'expense' && inRange(t, range))
  return budgets
    .map((budget) => {
      const spent = monthTxns
        .filter((t) => t.categoryId === budget.categoryId)
        .reduce((a, t) => a + t.amount, 0)
      const limit = budget.amount
      const remaining = limit - spent
      const progress = limit > 0 ? (spent / limit) * 100 : 0
      const status: BudgetStatus['status'] = progress >= 100 ? 'over' : progress >= 80 ? 'warning' : 'ok'
      return {
        budget,
        category: categories.find((c) => c.id === budget.categoryId),
        spent,
        limit,
        remaining,
        progress,
        status,
      }
    })
    .sort((a, b) => b.progress - a.progress)
}

export interface DailyPoint {
  date: string
  label: string
  expense: number
  income: number
}

export function dailySeries(txns: Transaction[], range: { start: Date; end: Date }): DailyPoint[] {
  const days = new Map<string, { expense: number; income: number }>()
  const cursor = new Date(range.start)
  while (cursor <= range.end) {
    days.set(format(cursor, 'yyyy-MM-dd'), { expense: 0, income: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  for (const t of txns) {
    if (!days.has(t.date)) continue
    const d = days.get(t.date)!
    if (t.type === 'expense') d.expense += t.amount
    else d.income += t.amount
  }
  return [...days.entries()].map(([date, v]) => ({
    date,
    label: format(parseISO(date), 'd'),
    expense: v.expense,
    income: v.income,
  }))
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}
