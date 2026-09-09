export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  date: string // ISO yyyy-mm-dd
  note: string
  account: string
  createdAt: string // ISO timestamp
}

export interface Category {
  id: string
  name: string
  type: TransactionType
  icon: string // lucide icon key
  color: string // hex
}

export interface Budget {
  id: string
  categoryId: string
  amount: number // monthly limit
}

export interface Settings {
  currency: string
  locale: string
  theme: 'light' | 'dark'
  monthlyIncomeTarget: number
  savingsGoalRate: number // percentage 0-100
}

export interface AppData {
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  settings: Settings
  onboarded: boolean
}

export type Page =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'analytics'
  | 'settings'
