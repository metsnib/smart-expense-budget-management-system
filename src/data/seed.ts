import type { AppData, Transaction, Budget, SavingsGoal } from '../types'
import { DEFAULT_CATEGORIES } from './categories'
import { uid } from '../utils/format'
import { format } from 'date-fns'

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function ts(d: Date): string {
  return d.toISOString()
}

function rand(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const EXPENSE_NOTES: Record<string, string[]> = {
  'cat-groceries': ['Weekly groceries', 'Supermarket run', 'Farmers market', 'Costco haul'],
  'cat-dining': ['Lunch with team', 'Dinner out', 'Coffee & pastry', 'Weekend brunch'],
  'cat-transport': ['Fuel', 'Metro card', 'Ride share', 'Parking'],
  'cat-housing': ['Monthly rent', 'Home maintenance'],
  'cat-utilities': ['Electricity bill', 'Water bill', 'Internet', 'Gas bill'],
  'cat-shopping': ['New shoes', 'Household items', 'Clothing', 'Electronics'],
  'cat-entertainment': ['Movie night', 'Concert tickets', 'Streaming rental'],
  'cat-health': ['Pharmacy', 'Gym membership', 'Doctor visit'],
  'cat-education': ['Online course', 'Books', 'Workshop'],
  'cat-travel': ['Flight booking', 'Hotel stay', 'Airport taxi'],
  'cat-subscriptions': ['Netflix', 'Spotify', 'Cloud storage', 'News subscription'],
  'cat-other-expense': ['Misc expense', 'Gift for friend'],
}

/**
 * Generates ~5 months of realistic demo data so a first-time user immediately
 * sees a populated, working dashboard. Regenerated only when no saved data exists.
 */
export function createSeedData(): AppData {
  const transactions: Transaction[] = []
  const now = new Date()

  const expenseCats = DEFAULT_CATEGORIES.filter((c) => c.type === 'expense')

  for (let monthsAgo = 4; monthsAgo >= 0; monthsAgo--) {
    const base = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
    const isCurrentMonth = monthsAgo === 0
    const dayCap = isCurrentMonth ? now.getDate() : daysInMonth

    // Salary on the 1st
    const salaryDate = new Date(base.getFullYear(), base.getMonth(), 1)
    transactions.push({
      id: uid('txn'),
      type: 'income',
      amount: 5200,
      categoryId: 'cat-salary',
      note: 'Monthly salary',
      date: iso(salaryDate),
      createdAt: ts(salaryDate),
    })

    // Occasional freelance income
    if (Math.random() > 0.4) {
      const fd = new Date(base.getFullYear(), base.getMonth(), Math.min(rand(10, 20) | 0 || 12, dayCap))
      transactions.push({
        id: uid('txn'),
        type: 'income',
        amount: rand(300, 1200),
        categoryId: 'cat-freelance',
        note: 'Freelance project',
        date: iso(fd),
        createdAt: ts(fd),
      })
    }

    // Rent on the 3rd
    const rentDate = new Date(base.getFullYear(), base.getMonth(), Math.min(3, dayCap))
    transactions.push({
      id: uid('txn'),
      type: 'expense',
      amount: 1450,
      categoryId: 'cat-housing',
      note: 'Monthly rent',
      date: iso(rentDate),
      createdAt: ts(rentDate),
    })

    // Subscriptions
    const subDate = new Date(base.getFullYear(), base.getMonth(), Math.min(5, dayCap))
    transactions.push({
      id: uid('txn'),
      type: 'expense',
      amount: 42.97,
      categoryId: 'cat-subscriptions',
      note: 'Streaming & apps',
      date: iso(subDate),
      createdAt: ts(subDate),
    })

    // Random daily-ish spend
    const count = 18 + Math.floor(Math.random() * 10)
    for (let i = 0; i < count; i++) {
      const day = 1 + Math.floor(Math.random() * dayCap)
      const d = new Date(base.getFullYear(), base.getMonth(), day)
      const cat = pick(expenseCats.filter((c) => !['cat-housing'].includes(c.id)))
      const amount = (() => {
        switch (cat.id) {
          case 'cat-groceries':
            return rand(25, 120)
          case 'cat-dining':
            return rand(8, 65)
          case 'cat-transport':
            return rand(5, 60)
          case 'cat-utilities':
            return rand(30, 140)
          case 'cat-shopping':
            return rand(20, 220)
          case 'cat-travel':
            return rand(80, 600)
          case 'cat-health':
            return rand(15, 150)
          default:
            return rand(6, 80)
        }
      })()
      transactions.push({
        id: uid('txn'),
        type: 'expense',
        amount,
        categoryId: cat.id,
        note: pick(EXPENSE_NOTES[cat.id] ?? ['Expense']),
        date: iso(d),
        createdAt: ts(d),
      })
    }
  }

  transactions.sort((a, b) => (a.date < b.date ? 1 : -1))

  const budgets: Budget[] = [
    { id: uid('bdg'), categoryId: 'cat-groceries', amount: 600, createdAt: ts(now) },
    { id: uid('bdg'), categoryId: 'cat-dining', amount: 350, createdAt: ts(now) },
    { id: uid('bdg'), categoryId: 'cat-transport', amount: 250, createdAt: ts(now) },
    { id: uid('bdg'), categoryId: 'cat-shopping', amount: 400, createdAt: ts(now) },
    { id: uid('bdg'), categoryId: 'cat-entertainment', amount: 200, createdAt: ts(now) },
    { id: uid('bdg'), categoryId: 'cat-utilities', amount: 300, createdAt: ts(now) },
  ]

  const goals: SavingsGoal[] = [
    { id: uid('goal'), name: 'Emergency Fund', target: 10000, saved: 6200, color: '#22c55e', createdAt: ts(now) },
    { id: uid('goal'), name: 'Vacation to Japan', target: 4000, saved: 1450, color: '#06b6d4', createdAt: ts(now) },
    { id: uid('goal'), name: 'New Laptop', target: 2200, saved: 1800, color: '#8b5cf6', createdAt: ts(now) },
  ]

  return {
    version: 1,
    transactions,
    budgets,
    categories: DEFAULT_CATEGORIES,
    goals,
    settings: {
      currency: 'USD',
      locale: 'en-US',
      theme: 'system',
      monthlyIncomeTarget: 5500,
    },
  }
}

export function emptyData(): AppData {
  return {
    version: 1,
    transactions: [],
    budgets: [],
    categories: DEFAULT_CATEGORIES,
    goals: [],
    settings: {
      currency: 'USD',
      locale: 'en-US',
      theme: 'system',
      monthlyIncomeTarget: 5000,
    },
  }
}
