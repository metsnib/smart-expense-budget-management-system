import type { AppData } from '../types'
import { DEFAULT_CATEGORIES } from './categories'

const STORAGE_KEY = 'finwise:data:v1'

export const DEFAULT_SETTINGS: AppData['settings'] = {
  currency: 'USD',
  locale: 'en-US',
  theme: 'dark',
  monthlyIncomeTarget: 5000,
  savingsGoalRate: 20,
}

export function emptyData(): AppData {
  return {
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    budgets: [],
    settings: { ...DEFAULT_SETTINGS },
    onboarded: false,
  }
}

export function loadData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AppData>
    // Merge with defaults to survive schema additions.
    return {
      transactions: parsed.transactions ?? [],
      categories: parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES,
      budgets: parsed.budgets ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      onboarded: parsed.onboarded ?? true,
    }
  } catch {
    return null
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage full or unavailable — ignore
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function makeId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
