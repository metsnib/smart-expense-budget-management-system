import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type {
  AppData,
  Budget,
  Category,
  SavingsGoal,
  Settings,
  Transaction,
} from '../types'
import { createSeedData, emptyData } from '../data/seed'
import { uid } from '../utils/format'

const STORAGE_KEY = 'fintrack:data:v1'

type Action =
  | { type: 'ADD_TRANSACTION'; payload: Omit<Transaction, 'id' | 'createdAt'> }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: { id: string } }
  | { type: 'ADD_BUDGET'; payload: Omit<Budget, 'id' | 'createdAt'> }
  | { type: 'UPDATE_BUDGET'; payload: { id: string; amount: number; categoryId: string } }
  | { type: 'DELETE_BUDGET'; payload: { id: string } }
  | { type: 'ADD_CATEGORY'; payload: Omit<Category, 'id'> }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: { id: string } }
  | { type: 'ADD_GOAL'; payload: Omit<SavingsGoal, 'id' | 'createdAt'> }
  | { type: 'UPDATE_GOAL'; payload: SavingsGoal }
  | { type: 'DELETE_GOAL'; payload: { id: string } }
  | { type: 'CONTRIBUTE_GOAL'; payload: { id: string; amount: number } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'IMPORT_DATA'; payload: AppData }
  | { type: 'RESET_DEMO' }
  | { type: 'CLEAR_ALL' }

function loadInitial(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppData
      if (parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.categories)) {
        return {
          ...emptyData(),
          ...parsed,
          settings: { ...emptyData().settings, ...parsed.settings },
        }
      }
    }
  } catch {
    // ignore corrupt storage and fall through to seed
  }
  return createSeedData()
}

function sortTransactions(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) => {
    if (a.date === b.date) return a.createdAt < b.createdAt ? 1 : -1
    return a.date < b.date ? 1 : -1
  })
}

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'ADD_TRANSACTION': {
      const txn: Transaction = {
        ...action.payload,
        id: uid('txn'),
        createdAt: new Date().toISOString(),
      }
      return { ...state, transactions: sortTransactions([txn, ...state.transactions]) }
    }
    case 'UPDATE_TRANSACTION': {
      return {
        ...state,
        transactions: sortTransactions(
          state.transactions.map((t) => (t.id === action.payload.id ? action.payload : t)),
        ),
      }
    }
    case 'DELETE_TRANSACTION': {
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload.id),
      }
    }
    case 'ADD_BUDGET': {
      // one budget per category — replace if exists
      const existing = state.budgets.find((b) => b.categoryId === action.payload.categoryId)
      if (existing) {
        return {
          ...state,
          budgets: state.budgets.map((b) =>
            b.categoryId === action.payload.categoryId ? { ...b, amount: action.payload.amount } : b,
          ),
        }
      }
      const budget: Budget = {
        ...action.payload,
        id: uid('bdg'),
        createdAt: new Date().toISOString(),
      }
      return { ...state, budgets: [...state.budgets, budget] }
    }
    case 'UPDATE_BUDGET': {
      return {
        ...state,
        budgets: state.budgets.map((b) =>
          b.id === action.payload.id
            ? { ...b, amount: action.payload.amount, categoryId: action.payload.categoryId }
            : b,
        ),
      }
    }
    case 'DELETE_BUDGET': {
      return { ...state, budgets: state.budgets.filter((b) => b.id !== action.payload.id) }
    }
    case 'ADD_CATEGORY': {
      const cat: Category = { ...action.payload, id: uid('cat') }
      return { ...state, categories: [...state.categories, cat] }
    }
    case 'UPDATE_CATEGORY': {
      return {
        ...state,
        categories: state.categories.map((c) => (c.id === action.payload.id ? action.payload : c)),
      }
    }
    case 'DELETE_CATEGORY': {
      // keep transactions but they will fall back to "Uncategorized"
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload.id),
        budgets: state.budgets.filter((b) => b.categoryId !== action.payload.id),
      }
    }
    case 'ADD_GOAL': {
      const goal: SavingsGoal = {
        ...action.payload,
        id: uid('goal'),
        createdAt: new Date().toISOString(),
      }
      return { ...state, goals: [...state.goals, goal] }
    }
    case 'UPDATE_GOAL': {
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.payload.id ? action.payload : g)),
      }
    }
    case 'DELETE_GOAL': {
      return { ...state, goals: state.goals.filter((g) => g.id !== action.payload.id) }
    }
    case 'CONTRIBUTE_GOAL': {
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.id
            ? { ...g, saved: Math.max(0, g.saved + action.payload.amount) }
            : g,
        ),
      }
    }
    case 'UPDATE_SETTINGS': {
      return { ...state, settings: { ...state.settings, ...action.payload } }
    }
    case 'IMPORT_DATA': {
      return {
        ...emptyData(),
        ...action.payload,
        settings: { ...emptyData().settings, ...action.payload.settings },
        transactions: sortTransactions(action.payload.transactions ?? []),
      }
    }
    case 'RESET_DEMO': {
      return createSeedData()
    }
    case 'CLEAR_ALL': {
      return emptyData()
    }
    default:
      return state
  }
}

interface AppContextValue {
  data: AppData
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void
  updateTransaction: (t: Transaction) => void
  deleteTransaction: (id: string) => void
  addBudget: (b: Omit<Budget, 'id' | 'createdAt'>) => void
  updateBudget: (id: string, amount: number, categoryId: string) => void
  deleteBudget: (id: string) => void
  addCategory: (c: Omit<Category, 'id'>) => void
  updateCategory: (c: Category) => void
  deleteCategory: (id: string) => void
  addGoal: (g: Omit<SavingsGoal, 'id' | 'createdAt'>) => void
  updateGoal: (g: SavingsGoal) => void
  deleteGoal: (id: string) => void
  contributeGoal: (id: string, amount: number) => void
  updateSettings: (s: Partial<Settings>) => void
  importData: (d: AppData) => void
  resetDemo: () => void
  clearAll: () => void
  getCategory: (id: string) => Category | undefined
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // storage may be full or unavailable; ignore
    }
  }, [data])

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const theme = data.settings.theme
      const prefersDark =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      const dark = theme === 'dark' || (theme === 'system' && prefersDark)
      root.classList.toggle('dark', dark)
    }
    apply()
    if (data.settings.theme === 'system' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [data.settings.theme])

  const getCategory = useCallback(
    (id: string) => data.categories.find((c) => c.id === id),
    [data.categories],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      addTransaction: (t) => dispatch({ type: 'ADD_TRANSACTION', payload: t }),
      updateTransaction: (t) => dispatch({ type: 'UPDATE_TRANSACTION', payload: t }),
      deleteTransaction: (id) => dispatch({ type: 'DELETE_TRANSACTION', payload: { id } }),
      addBudget: (b) => dispatch({ type: 'ADD_BUDGET', payload: b }),
      updateBudget: (id, amount, categoryId) =>
        dispatch({ type: 'UPDATE_BUDGET', payload: { id, amount, categoryId } }),
      deleteBudget: (id) => dispatch({ type: 'DELETE_BUDGET', payload: { id } }),
      addCategory: (c) => dispatch({ type: 'ADD_CATEGORY', payload: c }),
      updateCategory: (c) => dispatch({ type: 'UPDATE_CATEGORY', payload: c }),
      deleteCategory: (id) => dispatch({ type: 'DELETE_CATEGORY', payload: { id } }),
      addGoal: (g) => dispatch({ type: 'ADD_GOAL', payload: g }),
      updateGoal: (g) => dispatch({ type: 'UPDATE_GOAL', payload: g }),
      deleteGoal: (id) => dispatch({ type: 'DELETE_GOAL', payload: { id } }),
      contributeGoal: (id, amount) => dispatch({ type: 'CONTRIBUTE_GOAL', payload: { id, amount } }),
      updateSettings: (s) => dispatch({ type: 'UPDATE_SETTINGS', payload: s }),
      importData: (d) => dispatch({ type: 'IMPORT_DATA', payload: d }),
      resetDemo: () => dispatch({ type: 'RESET_DEMO' }),
      clearAll: () => dispatch({ type: 'CLEAR_ALL' }),
      getCategory,
    }),
    [data, getCategory],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
