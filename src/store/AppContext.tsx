import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { AppData, Budget, Category, Settings, Transaction } from '../types'
import { emptyData, loadData, makeId, saveData } from '../lib/storage'
import { sampleData } from '../lib/sampleData'

type Action =
  | { type: 'HYDRATE'; payload: AppData }
  | { type: 'ADD_TXN'; payload: Omit<Transaction, 'id' | 'createdAt'> }
  | { type: 'UPDATE_TXN'; payload: Transaction }
  | { type: 'DELETE_TXN'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: Omit<Category, 'id'> }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'UPSERT_BUDGET'; payload: { categoryId: string; amount: number } }
  | { type: 'DELETE_BUDGET'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'LOAD_SAMPLE' }
  | { type: 'RESET' }
  | { type: 'IMPORT'; payload: AppData }
  | { type: 'COMPLETE_ONBOARDING' }

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload
    case 'ADD_TXN':
      return {
        ...state,
        transactions: [
          { ...action.payload, id: makeId('txn'), createdAt: new Date().toISOString() },
          ...state.transactions,
        ],
      }
    case 'UPDATE_TXN':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t,
        ),
      }
    case 'DELETE_TXN':
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
      }
    case 'ADD_CATEGORY':
      return {
        ...state,
        categories: [...state.categories, { ...action.payload, id: makeId('cat') }],
      }
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        ),
      }
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
        budgets: state.budgets.filter((b) => b.categoryId !== action.payload),
      }
    case 'UPSERT_BUDGET': {
      const existing = state.budgets.find((b) => b.categoryId === action.payload.categoryId)
      if (existing) {
        return {
          ...state,
          budgets: state.budgets.map((b) =>
            b.categoryId === action.payload.categoryId
              ? { ...b, amount: action.payload.amount }
              : b,
          ),
        }
      }
      const budget: Budget = {
        id: makeId('bud'),
        categoryId: action.payload.categoryId,
        amount: action.payload.amount,
      }
      return { ...state, budgets: [...state.budgets, budget] }
    }
    case 'DELETE_BUDGET':
      return {
        ...state,
        budgets: state.budgets.filter((b) => b.id !== action.payload),
      }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'LOAD_SAMPLE':
      return { ...sampleData(), settings: state.settings, onboarded: true }
    case 'RESET':
      return { ...emptyData(), settings: state.settings, onboarded: true }
    case 'IMPORT':
      return action.payload
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboarded: true }
    default:
      return state
  }
}

interface AppContextValue {
  data: AppData
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

function init(): AppData {
  const loaded = loadData()
  return loaded ?? emptyData()
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, init)

  useEffect(() => {
    saveData(data)
  }, [data])

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement
    if (data.settings.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [data.settings.theme])

  const value = useMemo(() => ({ data, dispatch }), [data])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
