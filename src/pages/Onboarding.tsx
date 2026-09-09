import { useState } from 'react'
import { ArrowRight, Check, Sparkles, Target, TrendingUp, Wallet } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { CURRENCIES } from '../lib/currencies'

export function Onboarding() {
  const { dispatch, data } = useApp()
  const [currency, setCurrency] = useState(data.settings.currency)
  const [theme, setTheme] = useState<'light' | 'dark'>(data.settings.theme)

  const start = (withSample: boolean) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { currency, theme } })
    if (withSample) {
      dispatch({ type: 'LOAD_SAMPLE' })
    } else {
      dispatch({ type: 'COMPLETE_ONBOARDING' })
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
      {/* backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg animate-scale-in">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-lg shadow-brand-500/40">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-extrabold tracking-tight">FinWise</p>
            <p className="text-sm text-slate-400">Smart Expense & Budget Manager</p>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Take control of your money.
        </h1>
        <p className="mt-3 text-slate-300">
          Track every expense, set smart budgets, and get personalized insights — all stored privately
          on your device.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Feature icon={<TrendingUp className="h-5 w-5" />} label="Track spending" />
          <Feature icon={<Target className="h-5 w-5" />} label="Set budgets" />
          <Feature icon={<Sparkles className="h-5 w-5" />} label="Smart insights" />
        </div>

        <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-400"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Appearance</label>
            <div className="grid grid-cols-2 gap-2">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition ${
                    theme === t
                      ? 'border-brand-400 bg-brand-500/20 text-white'
                      : 'border-white/10 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {theme === t && <Check className="h-4 w-4" />}
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => start(true)}
            className="btn inline-flex flex-1 bg-brand-600 text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500"
          >
            Explore with sample data
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => start(false)}
            className="btn flex-1 border border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            Start fresh
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Your data stays on this device — nothing is sent to a server.
        </p>
      </div>
    </div>
  )
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <span className="text-brand-300">{icon}</span>
      <span className="text-sm font-medium text-slate-200">{label}</span>
    </div>
  )
}
