import { useState } from 'react'
import { Menu, Plus, Sun, Moon, TrendingUp } from 'lucide-react'
import { NAV_ITEMS, type ViewId } from './nav'
import { useApp } from './store/AppContext'
import { ToastProvider, useToast } from './components/Toast'
import { Modal } from './components/Modal'
import { TransactionForm } from './components/TransactionForm'
import { MonthPicker } from './components/MonthPicker'
import { currentMonthKey } from './utils/format'
import { Dashboard } from './views/Dashboard'
import { Transactions } from './views/Transactions'
import { Budgets } from './views/Budgets'
import { Analytics } from './views/Analytics'
import { Goals } from './views/Goals'
import { Categories } from './views/Categories'
import { SettingsView } from './views/Settings'
import type { Transaction } from './types'

const VIEW_META: Record<ViewId, { title: string; subtitle: string; showMonth: boolean }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Your financial overview at a glance', showMonth: true },
  transactions: { title: 'Transactions', subtitle: 'Every income and expense you record', showMonth: true },
  budgets: { title: 'Budgets', subtitle: 'Set limits and track your spending', showMonth: true },
  analytics: { title: 'Analytics', subtitle: 'Understand your spending patterns', showMonth: true },
  goals: { title: 'Savings Goals', subtitle: 'Plan and track your financial goals', showMonth: false },
  categories: { title: 'Categories', subtitle: 'Manage your transaction categories', showMonth: false },
  settings: { title: 'Settings', subtitle: 'Preferences and data management', showMonth: false },
}

function Shell() {
  const { data, addTransaction, updateSettings } = useApp()
  const { notify } = useToast()
  const [view, setView] = useState<ViewId>('dashboard')
  const [month, setMonth] = useState<string>(currentMonthKey())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const meta = VIEW_META[view]

  const isDark = (() => {
    const theme = data.settings.theme
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  })()

  const toggleTheme = () => {
    updateSettings({ theme: isDark ? 'light' : 'dark' })
  }

  const handleAdd = (payload: Omit<Transaction, 'id' | 'createdAt'>) => {
    addTransaction(payload)
    notify('Transaction added')
    setAddOpen(false)
  }

  const go = (v: ViewId) => {
    setView(v)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <BrandHeader />
        <nav className="mt-6 flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => go(item.id)} />
          ))}
        </nav>
        <SidebarFooter transactionCount={data.transactions.length} />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] animate-scale-in flex-col border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900">
            <BrandHeader />
            <nav className="mt-6 flex-1 space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavButton key={item.id} item={item} active={view === item.id} onClick={() => go(item.id)} />
              ))}
            </nav>
            <SidebarFooter transactionCount={data.transactions.length} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">
                {meta.title}
              </h1>
              <p className="hidden truncate text-sm text-slate-500 dark:text-slate-400 sm:block">{meta.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {meta.showMonth && (
                <div className="hidden sm:block">
                  <MonthPicker value={month} onChange={setMonth} />
                </div>
              )}
              <button
                onClick={toggleTheme}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button className="btn-primary" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>
          </div>
          {meta.showMonth && (
            <div className="border-t border-slate-200 px-4 py-2 dark:border-slate-800 sm:hidden">
              <MonthPicker value={month} onChange={setMonth} />
            </div>
          )}
        </header>

        {/* Content */}
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div key={view} className="animate-fade-in">
            {view === 'dashboard' && (
              <Dashboard month={month} onAddTransaction={() => setAddOpen(true)} onNavigate={go} />
            )}
            {view === 'transactions' && <Transactions month={month} />}
            {view === 'budgets' && <Budgets month={month} />}
            {view === 'analytics' && <Analytics month={month} />}
            {view === 'goals' && <Goals />}
            {view === 'categories' && <Categories />}
            {view === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add transaction">
        <TransactionForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>
    </div>
  )
}

function BrandHeader() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
        <TrendingUp className="h-5 w-5" />
      </span>
      <div className="leading-tight">
        <p className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Fintrack</p>
        <p className="text-[11px] font-medium text-slate-400">Expense & Budget</p>
      </div>
    </div>
  )
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: (typeof NAV_ITEMS)[number]
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? 'text-brand-600 dark:text-brand-400' : ''}`} />
      {item.label}
    </button>
  )
}

function SidebarFooter({ transactionCount }: { transactionCount: number }) {
  return (
    <div className="mt-4 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white">
      <p className="text-sm font-semibold">Stay on budget 💪</p>
      <p className="mt-1 text-xs text-brand-100">
        You've logged {transactionCount} transaction{transactionCount === 1 ? '' : 's'}. Keep it up!
      </p>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  )
}
