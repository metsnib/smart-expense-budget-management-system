import { addDays, format, startOfMonth, subMonths } from 'date-fns'
import type { AppData, Budget, Transaction } from '../types'
import { DEFAULT_CATEGORIES } from './categories'
import { DEFAULT_SETTINGS } from './storage'

function iso(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

let counter = 0
function id(prefix: string): string {
  counter += 1
  return `${prefix}-seed-${counter}`
}

interface Seed {
  categoryId: string
  type: 'income' | 'expense'
  min: number
  max: number
  account: string
  notes: string[]
  perMonth: [number, number] // min, max occurrences
}

const SEEDS: Seed[] = [
  { categoryId: 'cat-salary', type: 'income', min: 4200, max: 4200, account: 'Bank Account', notes: ['Monthly salary'], perMonth: [1, 1] },
  { categoryId: 'cat-freelance', type: 'income', min: 250, max: 900, account: 'Bank Account', notes: ['Side project', 'Design gig', 'Consulting'], perMonth: [0, 2] },
  { categoryId: 'cat-investment', type: 'income', min: 40, max: 180, account: 'Savings', notes: ['Dividends', 'Interest'], perMonth: [0, 1] },
  { categoryId: 'cat-housing', type: 'expense', min: 1350, max: 1350, account: 'Bank Account', notes: ['Rent'], perMonth: [1, 1] },
  { categoryId: 'cat-groceries', type: 'expense', min: 28, max: 95, account: 'Credit Card', notes: ['Supermarket', 'Weekly shop', 'Farmers market', 'Groceries'], perMonth: [4, 7] },
  { categoryId: 'cat-food', type: 'expense', min: 12, max: 65, account: 'Credit Card', notes: ['Lunch', 'Dinner out', 'Takeaway', 'Brunch', 'Coffee run'], perMonth: [5, 9] },
  { categoryId: 'cat-transport', type: 'expense', min: 15, max: 70, account: 'Credit Card', notes: ['Fuel', 'Metro pass', 'Rideshare', 'Parking'], perMonth: [3, 6] },
  { categoryId: 'cat-utilities', type: 'expense', min: 45, max: 160, account: 'Bank Account', notes: ['Electricity', 'Water', 'Internet', 'Gas'], perMonth: [2, 3] },
  { categoryId: 'cat-subscriptions', type: 'expense', min: 8, max: 20, account: 'Credit Card', notes: ['Streaming', 'Cloud storage', 'Music', 'News'], perMonth: [2, 4] },
  { categoryId: 'cat-entertainment', type: 'expense', min: 15, max: 85, account: 'Credit Card', notes: ['Movie night', 'Concert', 'Games', 'Events'], perMonth: [1, 3] },
  { categoryId: 'cat-shopping', type: 'expense', min: 25, max: 180, account: 'Credit Card', notes: ['Clothing', 'Electronics', 'Home goods', 'Gifts'], perMonth: [1, 3] },
  { categoryId: 'cat-health', type: 'expense', min: 20, max: 120, account: 'Bank Account', notes: ['Pharmacy', 'Gym', 'Doctor', 'Dentist'], perMonth: [0, 2] },
]

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function generateSampleTransactions(monthsBack = 5): Transaction[] {
  const txns: Transaction[] = []
  const now = new Date()

  for (let m = monthsBack; m >= 0; m--) {
    const monthStart = startOfMonth(subMonths(now, m))
    for (const seed of SEEDS) {
      const count = randInt(seed.perMonth[0], seed.perMonth[1])
      for (let i = 0; i < count; i++) {
        const dayOffset = m === 0 ? randInt(0, Math.min(now.getDate() - 1, 27)) : randInt(0, 27)
        const date = addDays(monthStart, dayOffset)
        if (date > now) continue
        txns.push({
          id: id('txn'),
          type: seed.type,
          amount: round2(rand(seed.min, seed.max)),
          categoryId: seed.categoryId,
          date: iso(date),
          note: pick(seed.notes),
          account: seed.account,
          createdAt: date.toISOString(),
        })
      }
    }
  }

  return txns.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function generateSampleBudgets(): Budget[] {
  return [
    { id: id('bud'), categoryId: 'cat-groceries', amount: 450 },
    { id: id('bud'), categoryId: 'cat-food', amount: 300 },
    { id: id('bud'), categoryId: 'cat-transport', amount: 200 },
    { id: id('bud'), categoryId: 'cat-utilities', amount: 250 },
    { id: id('bud'), categoryId: 'cat-entertainment', amount: 150 },
    { id: id('bud'), categoryId: 'cat-shopping', amount: 250 },
    { id: id('bud'), categoryId: 'cat-subscriptions', amount: 60 },
  ]
}

export function sampleData(): AppData {
  return {
    transactions: generateSampleTransactions(),
    categories: DEFAULT_CATEGORIES,
    budgets: generateSampleBudgets(),
    settings: { ...DEFAULT_SETTINGS },
    onboarded: true,
  }
}
