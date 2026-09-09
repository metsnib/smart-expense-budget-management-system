export type TransactionType = 'expense' | 'income'

export interface Category {
  id: string
  name: string
  icon: string // lucide icon key
  color: string // hex color
  type: TransactionType
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  note: string
  date: string // ISO date string (yyyy-MM-dd)
  createdAt: string // ISO timestamp
}

/** A recurring budget defined per category, evaluated per calendar month. */
export interface Budget {
  id: string
  categoryId: string
  amount: number // monthly limit
  createdAt: string
}

export interface SavingsGoal {
  id: string
  name: string
  target: number
  saved: number
  color: string
  createdAt: string
}

export interface Settings {
  currency: string
  locale: string
  theme: 'light' | 'dark' | 'system'
  monthlyIncomeTarget: number
}

export interface AppData {
  version: number
  transactions: Transaction[]
  budgets: Budget[]
  categories: Category[]
  goals: SavingsGoal[]
  settings: Settings
}
