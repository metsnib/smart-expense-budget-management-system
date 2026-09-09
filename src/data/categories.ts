import type { Category } from '../types'

/**
 * Icon keys map to lucide-react icons resolved in components/Icon.tsx.
 * Keep the names in sync with the ICON_MAP there.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  // Expenses
  { id: 'cat-groceries', name: 'Groceries', icon: 'shopping-cart', color: '#16a34a', type: 'expense' },
  { id: 'cat-dining', name: 'Dining Out', icon: 'utensils', color: '#f97316', type: 'expense' },
  { id: 'cat-transport', name: 'Transport', icon: 'car', color: '#0ea5e9', type: 'expense' },
  { id: 'cat-housing', name: 'Housing & Rent', icon: 'home', color: '#8b5cf6', type: 'expense' },
  { id: 'cat-utilities', name: 'Utilities', icon: 'plug', color: '#eab308', type: 'expense' },
  { id: 'cat-shopping', name: 'Shopping', icon: 'shopping-bag', color: '#ec4899', type: 'expense' },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'clapperboard', color: '#ef4444', type: 'expense' },
  { id: 'cat-health', name: 'Health', icon: 'heart-pulse', color: '#14b8a6', type: 'expense' },
  { id: 'cat-education', name: 'Education', icon: 'graduation-cap', color: '#6366f1', type: 'expense' },
  { id: 'cat-travel', name: 'Travel', icon: 'plane', color: '#06b6d4', type: 'expense' },
  { id: 'cat-subscriptions', name: 'Subscriptions', icon: 'repeat', color: '#a855f7', type: 'expense' },
  { id: 'cat-other-expense', name: 'Other', icon: 'ellipsis', color: '#64748b', type: 'expense' },

  // Income
  { id: 'cat-salary', name: 'Salary', icon: 'briefcase', color: '#22c55e', type: 'income' },
  { id: 'cat-freelance', name: 'Freelance', icon: 'laptop', color: '#3b82f6', type: 'income' },
  { id: 'cat-investments', name: 'Investments', icon: 'trending-up', color: '#10b981', type: 'income' },
  { id: 'cat-gift', name: 'Gifts', icon: 'gift', color: '#f43f5e', type: 'income' },
  { id: 'cat-other-income', name: 'Other Income', icon: 'wallet', color: '#0d9488', type: 'income' },
]

export const CATEGORY_COLOR_CHOICES = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b',
]

export const CATEGORY_ICON_CHOICES = [
  'shopping-cart', 'utensils', 'car', 'home', 'plug', 'shopping-bag',
  'clapperboard', 'heart-pulse', 'graduation-cap', 'plane', 'repeat',
  'briefcase', 'laptop', 'trending-up', 'gift', 'wallet', 'coffee',
  'dumbbell', 'gamepad-2', 'book', 'fuel', 'pizza', 'baby', 'dog',
  'phone', 'wifi', 'droplet', 'zap', 'piggy-bank', 'ellipsis',
]
