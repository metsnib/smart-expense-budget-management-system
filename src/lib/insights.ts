import { subMonths } from 'date-fns'
import type { Budget, Category, Transaction } from '../types'
import {
  budgetStatuses,
  computeTotals,
  monthRange,
  percentChange,
  spendByCategory,
  transactionsInMonth,
} from './analytics'

export type InsightTone = 'positive' | 'warning' | 'danger' | 'info'

export interface Insight {
  id: string
  tone: InsightTone
  icon: string
  title: string
  detail: string
}

export function generateInsights(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  savingsGoalRate: number,
  now = new Date(),
): Insight[] {
  const insights: Insight[] = []
  const thisMonth = transactionsInMonth(transactions, now)
  const lastMonth = transactionsInMonth(transactions, subMonths(now, 1))
  const totals = computeTotals(thisMonth)
  const lastTotals = computeTotals(lastMonth)

  // Savings rate vs goal
  if (thisMonth.length > 0 && totals.income > 0) {
    if (totals.savingsRate >= savingsGoalRate) {
      insights.push({
        id: 'savings-good',
        tone: 'positive',
        icon: 'piggy-bank',
        title: `You're saving ${totals.savingsRate.toFixed(0)}% this month`,
        detail: `That's on track with your ${savingsGoalRate}% goal. Keep the momentum going.`,
      })
    } else if (totals.savingsRate >= 0) {
      insights.push({
        id: 'savings-low',
        tone: 'warning',
        icon: 'piggy-bank',
        title: `Savings rate is ${totals.savingsRate.toFixed(0)}%`,
        detail: `Below your ${savingsGoalRate}% goal. Trimming a couple of top categories can close the gap.`,
      })
    } else {
      insights.push({
        id: 'savings-negative',
        tone: 'danger',
        icon: 'trending-down',
        title: 'Spending more than you earn',
        detail: `You're ${Math.abs(totals.net).toFixed(0)} over your income this month. Time to review expenses.`,
      })
    }
  }

  // Spending trend vs last month
  if (lastTotals.expense > 0) {
    const change = percentChange(totals.expense, lastTotals.expense)
    if (change !== null && Math.abs(change) >= 8) {
      if (change > 0) {
        insights.push({
          id: 'spend-up',
          tone: 'warning',
          icon: 'arrow-up-right',
          title: `Spending is up ${change.toFixed(0)}% vs last month`,
          detail: 'Higher than your usual pace. Check which categories grew the most.',
        })
      } else {
        insights.push({
          id: 'spend-down',
          tone: 'positive',
          icon: 'arrow-down-right',
          title: `Spending is down ${Math.abs(change).toFixed(0)}% vs last month`,
          detail: 'Nice work reining in expenses compared to last month.',
        })
      }
    }
  }

  // Budgets over / near limit
  const statuses = budgetStatuses(budgets, transactions, categories, now)
  const over = statuses.filter((s) => s.status === 'over')
  const warning = statuses.filter((s) => s.status === 'warning')
  if (over.length > 0) {
    insights.push({
      id: 'budget-over',
      tone: 'danger',
      icon: 'alert-triangle',
      title: `${over.length} budget${over.length > 1 ? 's' : ''} exceeded`,
      detail: `${over
        .slice(0, 3)
        .map((s) => s.category?.name ?? 'Unknown')
        .join(', ')} went over the monthly limit.`,
    })
  }
  if (warning.length > 0) {
    insights.push({
      id: 'budget-warning',
      tone: 'warning',
      icon: 'gauge',
      title: `${warning.length} budget${warning.length > 1 ? 's' : ''} nearing the limit`,
      detail: `${warning
        .slice(0, 3)
        .map((s) => s.category?.name ?? 'Unknown')
        .join(', ')} above 80% used.`,
    })
  }

  // Top category
  const byCat = spendByCategory(thisMonth, categories, 'expense')
  if (byCat.length > 0 && byCat[0].amount > 0) {
    const top = byCat[0]
    insights.push({
      id: 'top-category',
      tone: 'info',
      icon: 'pie-chart',
      title: `${top.category?.name ?? 'A category'} is your biggest expense`,
      detail: `${top.share.toFixed(0)}% of spending this month across ${top.count} transaction${
        top.count > 1 ? 's' : ''
      }.`,
    })
  }

  // Suggested budgets for high-spend categories without a budget
  const budgetedIds = new Set(budgets.map((b) => b.categoryId))
  const unbudgetedTop = byCat.find((c) => !budgetedIds.has(c.categoryId) && c.amount > 0)
  if (unbudgetedTop) {
    insights.push({
      id: 'suggest-budget',
      tone: 'info',
      icon: 'target',
      title: `Set a budget for ${unbudgetedTop.category?.name ?? 'this category'}`,
      detail: `You've spent ${unbudgetedTop.amount.toFixed(0)} here with no budget yet. A limit keeps it in check.`,
    })
  }

  // Recurring subscriptions detection
  const range = monthRange(now)
  const subs = thisMonth.filter(
    (t) => t.type === 'expense' && t.categoryId === 'cat-subscriptions' && new Date(t.date) <= range.end,
  )
  if (subs.length >= 3) {
    const subTotal = subs.reduce((a, t) => a + t.amount, 0)
    insights.push({
      id: 'subs',
      tone: 'info',
      icon: 'repeat',
      title: `${subs.length} subscriptions this month`,
      detail: `They add up to ${subTotal.toFixed(0)}. Cancel anything you no longer use.`,
    })
  }

  if (insights.length === 0) {
    insights.push({
      id: 'empty',
      tone: 'info',
      icon: 'sparkles',
      title: 'Add transactions to unlock insights',
      detail: 'Once you log some income and expenses, personalized tips will appear here.',
    })
  }

  return insights
}
