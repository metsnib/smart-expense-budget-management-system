import { useMemo, useState } from 'react'
import {
  BarChart3,
  LayoutDashboard,
  Menu,
  Plus,
  Receipt,
  Settings as SettingsIcon,
  Target,
  Wallet,
} from 'lucide-react'
import type { Page } from './types'
import { useApp } from './store/AppContext'
import { TransactionModal } from './components/TransactionModal'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Budgets } from './pages/Budgets'
import { Analytics } from './pages/Analytics'
import { Settings } from './pages/Settings'

const NAV: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function App() {
  const { data } = useApp()
  const [page, setPage] = useState<Page>('dashboard')
  const [addOpen, setAddOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const currentLabel = useMemo(
    () => NAV.find((n) => n.id === page)?.label ?? 'Dashboard',
    [page],
  )

  if (!data.onboarded) {
    return <Onboarding />
  }

  const navigate = (p: Page) => {
    setPage(p)
    setMobileNavOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex dark:border-slate-800 dark:bg-slate-900">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavButton
              key={item.id}
              active={page === item.id}
              icon={<item.icon className="h-5 w-5" />}
              label={item.label}
              onClick={() => navigate(item.id)}
            />
          ))}
        </nav>
        <button onClick={() => setAddOpen(true)} className="btn-primary w-full">
          <Plus className="h-4 w-4" />
          Add transaction
        </button>
      </aside>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white px-4 py-6 animate-slide-up dark:border-slate-800 dark:bg-slate-900">
            <Brand />
            <nav className="mt-8 flex flex-1 flex-col gap-1">
              {NAV.map((item) => (
                <NavButton
                  key={item.id}
                  active={page === item.id}
                  icon={<item.icon className="h-5 w-5" />}
                  label={item.label}
                  onClick={() => navigate(item.id)}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-lg sm:px-6 dark:border-slate-800 dark:bg-slate-950/70">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="btn-ghost -ml-2 p-2 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{currentLabel}</h1>
          <button onClick={() => setAddOpen(true)} className="btn-primary ml-auto hidden sm:inline-flex">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10">
          <div key={page} className="animate-fade-in">
            {page === 'dashboard' && <Dashboard onNavigate={navigate} onAdd={() => setAddOpen(true)} />}
            {page === 'transactions' && <Transactions onAdd={() => setAddOpen(true)} />}
            {page === 'budgets' && <Budgets />}
            {page === 'analytics' && <Analytics />}
            {page === 'settings' && <Settings />}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden dark:border-slate-800 dark:bg-slate-950/85">
        {NAV.slice(0, 2).map((item) => (
          <BottomNavButton
            key={item.id}
            active={page === item.id}
            icon={<item.icon className="h-5 w-5" />}
            label={item.label}
            onClick={() => navigate(item.id)}
          />
        ))}
        <button
          onClick={() => setAddOpen(true)}
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition active:scale-95"
          aria-label="Add transaction"
        >
          <Plus className="h-6 w-6" />
        </button>
        {NAV.slice(2, 4).map((item) => (
          <BottomNavButton
            key={item.id}
            active={page === item.id}
            icon={<item.icon className="h-5 w-5" />}
            label={item.label}
            onClick={() => navigate(item.id)}
          />
        ))}
      </nav>

      <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-md shadow-brand-500/30">
        <Wallet className="h-5 w-5" />
      </div>
      <div>
        <p className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">FinWise</p>
        <p className="-mt-0.5 text-[11px] font-medium text-slate-400">Expense & Budget</p>
      </div>
    </div>
  )
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function BottomNavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
        active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
